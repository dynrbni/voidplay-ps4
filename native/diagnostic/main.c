#include <stdbool.h>
#include <stdatomic.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <errno.h>
#include <fcntl.h>
#include <unistd.h>
#include <time.h>
#include <sys/statfs.h>
#include <orbis/libkernel.h>
#include <orbis/Sysmodule.h>
#include <orbis/Pad.h>
#include <orbis/UserService.h>
#include <orbis/Http.h>
#include <orbis/Ssl.h>
#include <orbis/Net.h>
#include <orbis/CommonDialog.h>
#include <orbis/MsgDialog.h>
#include "config.h"
#include "common.h"

static void storage_probe(FILE *report) {
    struct statfs info = {0};
    const int fd = open(VP_STORAGE_TARGET, O_RDONLY | O_DIRECTORY);
    if (fd < 0) { fprintf(report, "storage=unavailable target=%s errno=%d\n", VP_STORAGE_TARGET, errno); return; }
    const int result = fstatfs(fd, &info);
    close(fd);
    uint64_t total = 0, available = 0;
    if (result != 0 || vp_capacity(info.f_bsize, info.f_blocks, info.f_bavail, &total, &available) != 0) {
        fprintf(report, "storage=unavailable target=%s rc=%d errno=%d (invalid or unsupported ABI/result)\n", VP_STORAGE_TARGET, result, errno); return;
    }
    fprintf(report, "storage=candidate_unverified target=%s mount=%.1023s total_bytes=%llu available_bytes=%llu block_size=%llu\n", VP_STORAGE_TARGET, info.f_mntonname, (unsigned long long)total, (unsigned long long)available, (unsigned long long)info.f_bsize);
    fprintf(report, "storage_warning=mount-scoped measurement, not proven internal console capacity; compare with system settings\n");
}

static void controller_probe(FILE *report) {
    int rc = sceSysmoduleLoadModuleInternal(ORBIS_SYSMODULE_INTERNAL_PAD);
    if (rc < 0) { fprintf(report, "controller=unavailable load_pad=%d\n", rc); return; }
    rc = sceSysmoduleLoadModuleInternal(ORBIS_SYSMODULE_INTERNAL_USER_SERVICE);
    if (rc < 0) { fprintf(report, "controller=unavailable load_user=%d\n", rc); return; }
    OrbisUserServiceInitializeParams params = { .priority = ORBIS_KERNEL_PRIO_FIFO_LOWEST };
    int user = -1;
    const int user_rc = sceUserServiceInitialize(&params);
    const int initial_rc = sceUserServiceGetInitialUser(&user);
    const int pad_rc = scePadInit();
    if (initial_rc < 0 || pad_rc < 0) { fprintf(report, "controller=unavailable user_init=%d initial_user=%d pad_init=%d\n", user_rc, initial_rc, pad_rc); return; }
    const int pad = scePadOpen(user, 0, 0, NULL);
    if (pad < 0) { fprintf(report, "controller=unavailable open=%d\n", pad); return; }
    unsigned observed = 0; int reads = 0;
    for (int frame = 0; frame < 300; frame++) {
        OrbisPadData data = {0};
        rc = scePadReadState(pad, &data);
        if (rc >= 0 && data.connected) { reads++; observed |= data.buttons; }
        sceKernelUsleep(50000);
    }
    fprintf(report, "controller=%s connected_reads=%d observed_buttons=0x%x last_rc=%d (15 second sample)\n", reads ? "input_sampled" : "unavailable", reads, observed, rc);
    scePadClose(pad);
}

struct request_deadline { int request; atomic_bool finished; atomic_bool timed_out; };
static void *abort_after_deadline(void *value) {
    struct request_deadline *deadline = value;
    for (int tick = 0; tick < 200 && !atomic_load(&deadline->finished); tick++) sceKernelUsleep(100000);
    if (!atomic_load(&deadline->finished)) { atomic_store(&deadline->timed_out, true); sceHttpAbortRequest(deadline->request); }
    return NULL;
}

static void https_probe(FILE *report) {
    if (!VP_CATALOG_URL[0]) { fprintf(report, "https=not_configured (set a public HTTPS catalog URL at build time)\n"); return; }
    int net = -1, ssl = -1, http = -1, tpl = -1, conn = -1, req = -1;
    int rc = 0, status = 0, redirect = 1;
    unsigned total = 0;
    struct request_deadline deadline = { .request = -1, .finished = false, .timed_out = false };
    OrbisPthread watchdog;
    bool watching = false;
    if ((rc = sceSysmoduleLoadModuleInternal(ORBIS_SYSMODULE_INTERNAL_NET)) < 0 ||
        (rc = sceSysmoduleLoadModuleInternal(ORBIS_SYSMODULE_INTERNAL_SSL)) < 0 ||
        (rc = sceSysmoduleLoadModuleInternal(ORBIS_SYSMODULE_INTERNAL_HTTP)) < 0) goto done;
    if ((rc = sceNetInit()) < 0) goto done;
    if ((net = sceNetPoolCreate("voidplay-diag", 64 * 1024, 0)) < 0 ||
        (ssl = sceSslInit(256 * 1024)) < 0 || (http = sceHttpInit(net, ssl, 256 * 1024)) < 0) goto done;
    tpl = sceHttpCreateTemplate(http, "Voidplay-Diagnostic/0.1", ORBIS_HTTP_VERSION_1_1, 0);
    if (tpl < 0) goto done;
    // Preserve the library's TLS verification. Never use the upstream sample's skipSslCallback.
    rc = sceHttpGetAutoRedirect(tpl, &redirect);
    if (rc < 0 || redirect != 0) { fprintf(report, "https=unsupported automatic_redirects=%d rc=%d (no request sent)\n", redirect, rc); goto cleanup; }
    conn = sceHttpCreateConnectionWithURL(tpl, VP_CATALOG_URL, 0);
    if (conn < 0) goto done;
    req = sceHttpCreateRequestWithURL(conn, ORBIS_METHOD_GET, VP_CATALOG_URL, 0);
    if (req < 0) goto done;
    deadline.request = req;
    rc = scePthreadCreate(&watchdog, NULL, abort_after_deadline, &deadline, "vp-http-deadline");
    if (rc != 0) goto done;
    watching = true;
    rc = sceHttpSendRequest(req, NULL, 0);
    if (rc < 0 || (rc = sceHttpGetStatusCode(req, &status)) < 0 || status != 200) goto done;
    unsigned char buffer[4096];
    for (;;) {
        rc = sceHttpReadData(req, buffer, sizeof buffer);
        if (rc <= 0) break;
        if ((unsigned)rc > sizeof buffer || total + (unsigned)rc > 1024 * 1024) { rc = -1; break; }
        total += (unsigned)rc;
    }
    fprintf(report, "https=%s status=%d bytes=%u rc=%d tls=library_defaults_unverified (no catalog trusted or installed)\n", rc == 0 && total > 0 ? "response_observed" : "error", status, total, rc);
    goto cleanup;
 done:
    fprintf(report, "https=error rc=%d net=%d ssl=%d http=%d template=%d connection=%d request=%d status=%d\n", rc, net, ssl, http, tpl, conn, req, status);
 cleanup:
    if (watching) { atomic_store(&deadline.finished, true); scePthreadJoin(watchdog, NULL); fprintf(report, "https_abort_deadline=%s\n", atomic_load(&deadline.timed_out) ? "triggered" : "not_reached"); }
    if (req >= 0) sceHttpDeleteRequest(req);
    if (conn >= 0) sceHttpDeleteConnection(conn);
    if (tpl >= 0) sceHttpDeleteTemplate(tpl);
    if (http >= 0) sceHttpTerm(http);
    if (ssl >= 0) sceSslTerm(ssl);
    if (net >= 0) sceNetPoolDestroy(net);
}

static void show_result(const char *text) {
    if (sceSysmoduleLoadModule(ORBIS_SYSMODULE_MESSAGE_DIALOG) < 0 || sceCommonDialogInitialize() < 0 || sceMsgDialogInitialize() < 0) return;
    OrbisMsgDialogParam param = {0};
    param.baseParam.size = sizeof param.baseParam;
    param.baseParam.magic = (uint32_t)(ORBIS_COMMON_DIALOG_MAGIC_NUMBER + (uint64_t)&param.baseParam);
    param.size = sizeof param;
    param.mode = ORBIS_MSG_DIALOG_MODE_USER_MSG;
    OrbisMsgDialogUserMessageParam message = {0};
    message.msg = text; message.buttonType = ORBIS_MSG_DIALOG_BUTTON_TYPE_OK;
    param.userMsgParam = &message;
    if (sceMsgDialogOpen(&param) >= 0) {
        for (int tick = 0; tick < 1200 && sceMsgDialogUpdateStatus() != ORBIS_COMMON_DIALOG_STATUS_FINISHED; tick++) sceKernelUsleep(50000);
        sceMsgDialogClose();
    }
    sceMsgDialogTerminate();
}

int main(void) {
    setvbuf(stdout, NULL, _IONBF, 0);
    char report_path[512], probe_name[80];
    const unsigned long long run = (unsigned long long)time(NULL);
    snprintf(report_path, sizeof report_path, "%s/report-%llu.txt", VP_APP_DIRECTORY, run);
    snprintf(probe_name, sizeof probe_name, "probe-%llu.txt", run);
    FILE *report = NULL;
    if (VP_APP_DIRECTORY[0]) {
        const int fd = open(report_path, O_WRONLY | O_CREAT | O_EXCL | O_NOFOLLOW, 0600);
        if (fd >= 0) { report = fdopen(fd, "w"); if (!report) close(fd); }
    }
    if (!report) report = stdout;
    fprintf(report, "Voidplay diagnostic v0.1\nlaunch=main_reached\nbuild_toolchain=OpenOrbis-v0.5.4\nfirmware_12_00=unverified\n"); fflush(report);
    storage_probe(report); fflush(report);
    if (VP_APP_DIRECTORY[0]) vp_file_roundtrip(VP_APP_DIRECTORY, probe_name, report);
    else fprintf(report, "file_io=not_configured (no directory authorized at build time)\n");
    fflush(report);
    show_result("Voidplay diagnostic launched. After pressing OK, press controller buttons for 15 seconds. Results are experimental, not firmware compatibility certification.");
    controller_probe(report); fflush(report);
    fprintf(report, "https_note=20 second abort watchdog; runtime abort behavior unverified; close the app if stalled\n"); fflush(report);
    https_probe(report); fflush(report);
    fprintf(report, "finished=yes\ninstallation=unsupported\ncleanup=not_performed\n");
    if (report != stdout) { fsync(fileno(report)); fclose(report); }
    char message[700]; snprintf(message, sizeof message, "Voidplay diagnostic completed.\nReport: %s\nRetrieve via FTP. Measurements remain unverified until reviewed against console settings.", report == stdout ? "stdout only (file unavailable)" : report_path);
    show_result(message);
    return 0;
}
