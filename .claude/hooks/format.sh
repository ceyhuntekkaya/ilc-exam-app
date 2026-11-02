#!/usr/bin/env bash
# PostToolUse: değiştirilen .ts/.tsx dosyasına eslint --fix çalıştırır.
# Prettier kurulu değil (bkz. docs/gorev/KURULUM.md #3); eslint --fix yeterli.
set -euo pipefail

input=$(cat)
file_path=$(jq -r '.tool_input.file_path // empty' <<<"$input")

[[ "$file_path" == *.ts || "$file_path" == *.tsx ]] || exit 0

npx eslint --fix "$file_path" >&2 || true

exit 0
