/**
 * UI/UX audits run on every screen at every device size.
 *
 * Each finding has a stable key (kind + element description), so the suite can
 * ratchet: findings recorded in tests/qa/baseline/ are known debt; anything new
 * fails the run. Fixing debt and re-running with UPDATE_QA_BASELINE=1 shrinks it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import type { Page, TestInfo } from '@playwright/test';

export type FindingKind = 'console' | 'overflow' | 'tap-target' | 'a11y';
export interface Finding { kind: FindingKind; key: string; detail: string }

/** Starts collecting console errors and uncaught exceptions. Call before navigating. */
export function watchConsole(page: Page): Finding[] {
  const found: Finding[] = [];
  const ignore = /posthog|sentry|net::ERR_FAILED|Failed to load resource|favicon|ResizeObserver loop|Download the React DevTools/i;
  page.on('pageerror', e => {
    const msg = e.message.split('\n')[0].slice(0, 160);
    found.push({ kind: 'console', key: `pageerror: ${msg}`, detail: e.stack?.slice(0, 400) ?? msg });
  });
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const msg = m.text().split('\n')[0].slice(0, 160);
    if (ignore.test(msg)) return;
    found.push({ kind: 'console', key: `console.error: ${msg}`, detail: m.text().slice(0, 400) });
  });
  return found;
}

/** Elements that stick out past the viewport (cause sideways scroll or clipped UI). */
async function overflow(page: Page): Promise<Finding[]> {
  const items = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const out: { key: string; detail: string }[] = [];
    const describe = (el: Element) => {
      const name = (el.getAttribute('aria-label') || (el as HTMLElement).innerText || '').trim().replace(/\s+/g, ' ').slice(0, 40);
      return `${el.tagName.toLowerCase()}${name ? ` "${name}"` : ''}`;
    };
    const clipped = (el: Element) => {
      for (let p = el.parentElement; p; p = p.parentElement) {
        const ox = getComputedStyle(p).overflowX;
        if (ox === 'auto' || ox === 'scroll' || ox === 'hidden' || ox === 'clip') return true;
      }
      return false;
    };
    const seen = new Set<Element>();
    for (const el of Array.from(document.body.querySelectorAll('*'))) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none' || style.position === 'fixed' && r.top > window.innerHeight) continue;
      if ((r.right > vw + 1 || r.left < -1) && !clipped(el)) {
        // Report the outermost offender only.
        let p = el.parentElement, parentOffends = false;
        while (p) { if (seen.has(p)) { parentOffends = true; break; } p = p.parentElement; }
        seen.add(el);
        if (!parentOffends) out.push({ key: `overflow: ${describe(el)}`, detail: `left ${Math.round(r.left)} right ${Math.round(r.right)} > ${vw}` });
      }
    }
    if (document.scrollingElement && document.scrollingElement.scrollWidth > vw + 1) {
      out.push({ key: 'overflow: page scrolls sideways', detail: `scrollWidth ${document.scrollingElement.scrollWidth} > ${vw}` });
    }
    return out;
  });
  return items.map(i => ({ kind: 'overflow' as const, ...i }));
}

/** Interactive elements smaller than Apple's 44x44pt minimum. */
async function tapTargets(page: Page): Promise<Finding[]> {
  const items = await page.evaluate(() => {
    const out: { key: string; detail: string }[] = [];
    const sel = 'button, a[href], [role="button"], [role="tab"], [role="switch"], [role="checkbox"], input:not([type="hidden"]), select, textarea';
    for (const el of Array.from(document.querySelectorAll(sel))) {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (!r.width || !r.height || style.visibility === 'hidden' || style.display === 'none' || (el as HTMLButtonElement).disabled) continue;
      if (r.bottom < 0 || r.top > window.innerHeight * 3) continue;
      if (r.width >= 44 && r.height >= 44) continue;
      // A small control inside a large tappable row is fine.
      const big = el.parentElement?.closest(sel);
      if (big) { const b = big.getBoundingClientRect(); if (b.width >= 44 && b.height >= 44) continue; }
      const name = (el.getAttribute('aria-label') || (el as HTMLElement).innerText || el.getAttribute('placeholder') || '').trim().replace(/\s+/g, ' ').slice(0, 40);
      out.push({ key: `tap-target: ${el.tagName.toLowerCase()} "${name}"`, detail: `${Math.round(r.width)}x${Math.round(r.height)}` });
    }
    return out;
  });
  return items.map(i => ({ kind: 'tap-target' as const, ...i }));
}

/** Serious and critical WCAG 2 A/AA violations, colour contrast included (the app is used in full sun). */
async function accessibility(page: Page): Promise<Finding[]> {
  const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  return res.violations
    .filter(v => v.impact === 'serious' || v.impact === 'critical')
    .flatMap(v => v.nodes.slice(0, 8).map(n => {
      const text = (n.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || n.target.join(' ')).slice(0, 40);
      return { kind: 'a11y' as const, key: `a11y ${v.id}: ${text}`, detail: n.failureSummary?.slice(0, 300) ?? v.help };
    }));
}

export async function audit(page: Page, consoleFindings: Finding[]): Promise<Finding[]> {
  const all = [...consoleFindings, ...(await overflow(page)), ...(await tapTargets(page)), ...(await accessibility(page))];
  const byKey = new Map<string, Finding>();
  for (const f of all) if (!byKey.has(f.key)) byKey.set(f.key, f);
  return [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Compares findings with the recorded baseline for this screen and device.
 * Returns the findings that are new. UPDATE_QA_BASELINE=1 records the current set instead.
 */
export function ratchet(findings: Finding[], screen: string, testInfo: TestInfo): { added: Finding[]; fixed: string[] } {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const file = path.join(here, 'baseline', testInfo.project.name, `${screen}.json`);
  const keys = findings.map(f => f.key);
  if (process.env.UPDATE_QA_BASELINE) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(keys, null, 2) + '\n');
    return { added: [], fixed: [] };
  }
  const known: string[] = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
  return {
    added: findings.filter(f => !known.includes(f.key)),
    fixed: known.filter(k => !keys.includes(k)),
  };
}
