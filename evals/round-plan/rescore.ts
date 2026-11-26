/**
 * Re-scores saved reports with the current scorer, without calling the model again.
 *
 *   bun evals/round-plan/rescore.ts evals/round-plan/results/<report>.json [...]
 */
import { readFileSync } from 'node:fs';
import { CASES } from './cases';
import { scoreCase } from './score';
import type { RoundPlan } from '../../src/lib/roundPlan/types';

for (const file of process.argv.slice(2)) {
  const report = JSON.parse(readFileSync(file, 'utf8')) as { model: string; results: { id: string; plan: RoundPlan | null; failures: string[] }[] };
  let passed = 0;
  const lines: string[] = [];
  for (const r of report.results) {
    const c = CASES.find(x => x.id === r.id);
    if (!c) continue;
    const s = r.plan ? scoreCase(c, r.plan) : { pass: false, failures: r.failures };
    if (s.pass) passed++;
    else lines.push(`  ✗ ${r.id}: ${s.failures.join('; ')}`);
  }
  console.log(`${report.model}: ${passed}/${report.results.length}`);
  for (const l of lines) console.log(l);
}
