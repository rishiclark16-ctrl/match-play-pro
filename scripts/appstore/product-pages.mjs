#!/usr/bin/env node
// Syncs appstore/product-pages.json to App Store Connect Custom Product Pages.
//
//   node scripts/appstore/product-pages.mjs status          list pages, state and links
//   node scripts/appstore/product-pages.mjs sync [--dry-run] create/update pages + screenshots
//   node scripts/appstore/product-pages.mjs sync --submit    ...then send changed pages to App Review
//
// Pages are matched by name. A page whose current version is already live or in
// review gets a new draft version; it is never edited in place.
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Asc } from './asc.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const BUNDLE_ID = 'dev.matchgolf.app';
const SHOTS_DIR = join(ROOT, 'ios/App/fastlane/screenshots/en-US');
// File-name tag → App Store display type.
const DEVICES = { iPhone69: 'APP_IPHONE_67', iPadPro13: 'APP_IPAD_PRO_3GEN_129' };
const EDITABLE = new Set(['PREPARE_FOR_SUBMISSION', 'REJECTED', 'DEVELOPER_REJECTED']);

export function loadConfig(path = join(ROOT, 'appstore/product-pages.json')) {
  const cfg = JSON.parse(readFileSync(path, 'utf8'));
  const files = readdirSync(SHOTS_DIR).filter((f) => f.endsWith('.png'));
  const problems = [];
  const names = new Set();
  for (const p of cfg.pages) {
    if (!p.name || p.name.length > 30) problems.push(`"${p.name}": name must be 1-30 characters`);
    if (names.has(p.name)) problems.push(`"${p.name}": duplicate name`);
    names.add(p.name);
    if ((p.promotionalText || '').length > 170) problems.push(`"${p.name}": promotional text over 170 characters`);
    if (!Array.isArray(p.screenshots) || p.screenshots.length < 1 || p.screenshots.length > 10) {
      problems.push(`"${p.name}": needs 1-10 screenshots`);
    }
    p.files = {};
    for (const [tag, type] of Object.entries(DEVICES)) {
      p.files[type] = (p.screenshots || []).map((n) => {
        const f = files.find((x) => x.includes(`_${tag}_`) && x.startsWith(String(n).padStart(2, '0') + '_'));
        if (!f) problems.push(`"${p.name}": no ${tag} screenshot number ${n}`);
        return f && join(SHOTS_DIR, f);
      });
    }
  }
  if (cfg.pages.length > 70) problems.push('App Store Connect allows at most 70 custom product pages');
  if (problems.length) throw new Error('product-pages.json:\n  ' + problems.join('\n  '));
  return cfg;
}

async function listPages(asc, appId) {
  const pages = await asc.all(`/v1/apps/${appId}/appCustomProductPages?limit=200`);
  for (const p of pages) {
    p.versions = await asc.all(`/v1/appCustomProductPages/${p.id}/appCustomProductPageVersions?limit=50`);
  }
  return pages;
}

const latest = (versions) =>
  [...versions].sort((a, b) => Number(b.attributes.version || 0) - Number(a.attributes.version || 0))[0];

async function createPage(asc, appId, cfg, page) {
  const res = await asc.post('/v1/appCustomProductPages', {
    data: {
      type: 'appCustomProductPages',
      attributes: { name: page.name },
      relationships: {
        app: { data: { type: 'apps', id: appId } },
        appCustomProductPageVersions: { data: [{ type: 'appCustomProductPageVersions', id: '${version}' }] },
      },
    },
    included: [
      {
        type: 'appCustomProductPageVersions',
        id: '${version}',
        relationships: {
          appCustomProductPageLocalizations: {
            data: [{ type: 'appCustomProductPageLocalizations', id: '${localization}' }],
          },
        },
      },
      {
        type: 'appCustomProductPageLocalizations',
        id: '${localization}',
        attributes: { locale: cfg.locale, promotionalText: page.promotionalText },
      },
    ],
  });
  return res.data;
}

async function editableVersion(asc, remote) {
  const v = latest(remote.versions);
  if (v && EDITABLE.has(v.attributes.state)) return v;
  const res = await asc.post('/v1/appCustomProductPageVersions', {
    data: {
      type: 'appCustomProductPageVersions',
      relationships: { appCustomProductPage: { data: { type: 'appCustomProductPages', id: remote.id } } },
    },
  });
  return res.data;
}

async function localization(asc, cfg, versionId, promotionalText) {
  const locs = await asc.all(`/v1/appCustomProductPageVersions/${versionId}/appCustomProductPageLocalizations`);
  let loc = locs.find((l) => l.attributes.locale === cfg.locale);
  if (!loc) {
    loc = (
      await asc.post('/v1/appCustomProductPageLocalizations', {
        data: {
          type: 'appCustomProductPageLocalizations',
          attributes: { locale: cfg.locale, promotionalText },
          relationships: {
            appCustomProductPageVersion: { data: { type: 'appCustomProductPageVersions', id: versionId } },
          },
        },
      })
    ).data;
  } else if (loc.attributes.promotionalText !== promotionalText) {
    await asc.patch(`/v1/appCustomProductPageLocalizations/${loc.id}`, {
      data: { type: 'appCustomProductPageLocalizations', id: loc.id, attributes: { promotionalText } },
    });
  }
  return loc;
}

async function syncScreenshots(asc, locId, page) {
  const sets = await asc.all(`/v1/appCustomProductPageLocalizations/${locId}/appScreenshotSets`);
  for (const [type, files] of Object.entries(page.files)) {
    let set = sets.find((s) => s.attributes.screenshotDisplayType === type);
    if (set) {
      const old = await asc.all(`/v1/appScreenshotSets/${set.id}/appScreenshots`);
      for (const s of old) await asc.del(`/v1/appScreenshots/${s.id}`);
    } else {
      set = (
        await asc.post('/v1/appScreenshotSets', {
          data: {
            type: 'appScreenshotSets',
            attributes: { screenshotDisplayType: type },
            relationships: {
              appCustomProductPageLocalization: { data: { type: 'appCustomProductPageLocalizations', id: locId } },
            },
          },
        })
      ).data;
    }
    for (const f of files) await asc.uploadScreenshot(set.id, f);
    console.log(`    ${type}: ${files.length} screenshots`);
  }
}

async function submit(asc, appId, versionIds) {
  if (!versionIds.length) return;
  const sub = (
    await asc.post('/v1/reviewSubmissions', {
      data: {
        type: 'reviewSubmissions',
        attributes: { platform: 'IOS' },
        relationships: { app: { data: { type: 'apps', id: appId } } },
      },
    })
  ).data;
  for (const id of versionIds) {
    await asc.post('/v1/reviewSubmissionItems', {
      data: {
        type: 'reviewSubmissionItems',
        relationships: {
          reviewSubmission: { data: { type: 'reviewSubmissions', id: sub.id } },
          appCustomProductPageVersion: { data: { type: 'appCustomProductPageVersions', id } },
        },
      },
    });
  }
  await asc.patch(`/v1/reviewSubmissions/${sub.id}`, {
    data: { type: 'reviewSubmissions', id: sub.id, attributes: { submitted: true } },
  });
  console.log(`Sent ${versionIds.length} page(s) to App Review.`);
}

async function status(asc, appId) {
  const pages = await listPages(asc, appId);
  if (!pages.length) return console.log('No custom product pages yet.');
  for (const p of pages) {
    const v = latest(p.versions);
    console.log(`- ${p.attributes.name}: ${v?.attributes.state ?? 'no version'}${p.attributes.visible ? ' (visible)' : ''}`);
    if (p.attributes.url) console.log(`    ${p.attributes.url}`);
  }
}

async function sync(asc, appId, cfg, { dryRun, doSubmit }) {
  const remote = dryRun ? [] : await listPages(asc, appId);
  const toSubmit = [];
  for (const page of cfg.pages) {
    let r = remote.find((p) => p.attributes.name === page.name);
    console.log(`${r ? 'Update' : 'Create'} "${page.name}" — screenshots ${page.screenshots.join(', ')}`);
    if (dryRun) continue;
    if (!r) {
      r = await createPage(asc, appId, cfg, page);
      r.versions = await asc.all(`/v1/appCustomProductPages/${r.id}/appCustomProductPageVersions`);
    }
    const version = await editableVersion(asc, r);
    const loc = await localization(asc, cfg, version.id, page.promotionalText);
    await syncScreenshots(asc, loc.id, page);
    toSubmit.push(version.id);
  }
  const extra = remote.filter((p) => !cfg.pages.some((c) => c.name === p.attributes.name));
  for (const p of extra) console.log(`Note: "${p.attributes.name}" is in App Store Connect but not in the config (left alone).`);
  if (doSubmit && !dryRun) await submit(asc, appId, toSubmit);
}

async function main() {
  const [cmd = 'status', ...flags] = process.argv.slice(2);
  const dryRun = flags.includes('--dry-run');
  const cfg = loadConfig();
  if (cmd === 'check' || (cmd === 'sync' && dryRun)) {
    console.log(`Config OK: ${cfg.pages.length} pages.`);
    if (cmd === 'check') return;
  }
  const asc = dryRun ? null : new Asc();
  const appId = dryRun ? null : await asc.appId(BUNDLE_ID);
  if (cmd === 'status') return status(asc, appId);
  if (cmd === 'sync') {
    await sync(asc, appId, cfg, { dryRun, doSubmit: flags.includes('--submit') });
    if (!dryRun) await status(asc, appId);
    return;
  }
  throw new Error(`Unknown command ${cmd}. Use status, check or sync.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
