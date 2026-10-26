// SPDX-License-Identifier: GPL-3.0-only
// OpenOrbis GPL bootstrap shim; musl stays statically linked in the application.
int __dummy__libc_func(void)
{
    return 0;
}
