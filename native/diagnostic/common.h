#ifndef VOIDPLAY_DIAGNOSTIC_COMMON_H
#define VOIDPLAY_DIAGNOSTIC_COMMON_H
#include <stdint.h>
#include <stdio.h>
int vp_capacity(uint64_t block_size, uint64_t blocks, int64_t available_blocks, uint64_t *total, uint64_t *available);
int vp_file_roundtrip(const char *application_directory, const char *filename, FILE *report);
#endif
