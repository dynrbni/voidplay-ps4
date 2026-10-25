#include "common.h"
#include <errno.h>
#include <fcntl.h>
#include <string.h>
#include <unistd.h>
#include <sys/stat.h>

int vp_capacity(uint64_t block_size, uint64_t blocks, int64_t available_blocks, uint64_t *total, uint64_t *available) {
    if (!block_size || !blocks || available_blocks < 0 || (uint64_t)available_blocks > blocks || blocks > UINT64_MAX / block_size) return -1;
    *total = blocks * block_size;
    *available = (uint64_t)available_blocks * block_size;
    return 0;
}

int vp_file_roundtrip(const char *directory, const char *filename, FILE *report) {
    if (!directory || directory[0] != '/' || !filename || strchr(filename, '/') || strstr(filename, "..")) { errno = EINVAL; return -1; }
    const int dir = open(directory, O_RDONLY | O_DIRECTORY | O_NOFOLLOW);
    if (dir < 0) { fprintf(report, "file_io=unavailable errno=%d (application directory must already exist)\n", errno); return -1; }
    const int fd = openat(dir, filename, O_RDWR | O_CREAT | O_EXCL | O_NOFOLLOW, 0600);
    if (fd < 0) { fprintf(report, "file_io=error errno=%d (no existing file overwritten)\n", errno); close(dir); return -1; }
    const char payload[] = "Voidplay authorized diagnostic file. No package installation.\n";
    char observed[sizeof payload] = {0};
    int success = write(fd, payload, sizeof payload) == (ssize_t)sizeof payload && fsync(fd) == 0 && lseek(fd, 0, SEEK_SET) == 0 && read(fd, observed, sizeof observed) == (ssize_t)sizeof observed && memcmp(payload, observed, sizeof payload) == 0;
    if (close(fd) != 0) success = 0;
    fprintf(report, "file_io=%s file=%s errno=%d (retained for owner inspection)\n", success ? "roundtrip_observed" : "error", filename, success ? 0 : errno);
    close(dir);
    return success ? 0 : -1;
}
