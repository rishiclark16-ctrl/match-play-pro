#!/usr/bin/env bash
# Fails if the TypeScript error count rises above the recorded baseline.
# The app never ran tsc in CI, which let money bugs ship (Notion 09.2 M1/M2 were
# TS2345 errors). Lower TS_BASELINE as errors are fixed; never raise it.
set -euo pipefail
TS_BASELINE=197
count=$(bunx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "error TS" || true)
echo "TypeScript errors: ${count} (baseline ${TS_BASELINE})"
if [ "${count}" -gt "${TS_BASELINE}" ]; then
  echo "::error::TypeScript error count rose from ${TS_BASELINE} to ${count}. Run 'bunx tsc -p tsconfig.app.json --noEmit' and fix the new errors."
  exit 1
fi
