#!/usr/bin/env bash
# Stop: tur bitmeden önce tip kontrolü. Hata varsa turu bitirmeden Claude'u uyarır.
# 3 saniyeden uzun sürüyorsa settings.json'daki Stop bloğunu kaldır (bkz. docs/gorev/KURULUM.md #2).
set -uo pipefail

output=$(npx tsc --noEmit 2>&1)
status=$?

if [[ $status -ne 0 ]]; then
  echo "tsc --noEmit hata verdi, turu bitirmeden düzelt:" >&2
  echo "$output" >&2
  exit 2
fi

exit 0
