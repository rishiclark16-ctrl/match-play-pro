#!/usr/bin/env node
// Typecheck ratchet: runs the real typecheck (tsconfig.app.json, which — unlike the
// root tsconfig with "files": [] — actually sees the source) and compares the error
// count to .typecheck-baseline. The count may go DOWN or stay equal; it must never rise.
//
// Usage: node scripts/typecheck-ratchet.mjs   (or: bun scripts/typecheck-ratchet.mjs)
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const BASELINE_FILE = '.typecheck-baseline';
const TYPECHECK_CMD = 'npx tsc --noEmit -p tsconfig.app.json';

let baseline;
try {
  baseline = parseInt(readFileSync(BASELINE_FILE, 'utf8').trim(), 10);
} catch {
  console.error(`Could not read ${BASELINE_FILE}. Create it with the current "error TS" count.`);
  process.exit(2);
}
if (Number.isNaN(baseline)) {
  console.error(`${BASELINE_FILE} does not contain a number.`);
  process.exit(2);
}

let output = '';
try {
  // Passes only when there are zero errors; any errors make tsc exit non-zero.
  output = execSync(TYPECHECK_CMD, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
} catch (err) {
  output = `${err.stdout || ''}${err.stderr || ''}`;
}

const count = output.split('\n').filter((line) => /error TS/.test(line)).length;
console.log(`TypeScript errors: ${count} (baseline ${baseline})`);

if (count > baseline) {
  console.error(
    `\n❌ Typecheck regressed: ${count} errors > baseline ${baseline}.\n` +
      `   Fix the new type errors. Do not raise the baseline to make this pass.`,
  );
  process.exit(1);
}

if (count < baseline) {
  console.log(
    `\n✅ Improved: ${count} < ${baseline}. ` +
      `Baseline can be lowered to ${count} — update ${BASELINE_FILE}.`,
  );
  process.exit(0);
}

console.log(`\n✅ Holding at baseline (${baseline}).`);
process.exit(0);
