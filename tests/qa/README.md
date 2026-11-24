# QA suite

Automated UI/UX checks that run on every pull request (`qa` job in `.github/workflows/ci.yml`).
Nothing touches production: the backend is mocked in the browser (`mockBackend.ts`) with a
fictional foursome, a live round, a finished round and the Sonoma GC course card.

## What it checks

**Every screen, at three sizes** (iPhone SE 375pt, iPhone Pro Max 440pt, iPad 1032pt) — `screens.spec.ts`:

| Check | Fails when |
|---|---|
| Renders | the error boundary shows, or the page is blank |
| Console | a new `console.error` or uncaught exception |
| Overflow | something sticks out past the screen edge or the page scrolls sideways |
| Tap targets | a button, link or input is smaller than Apple's 44×44pt |
| Accessibility | a new serious/critical WCAG 2 A/AA violation (axe-core), colour contrast included — the app is used in full sun |

A full-page screenshot of every screen is attached to the HTML report.

**Core journeys** (phone sizes) — `journeys.spec.ts`: say a round → review → Tee off (and the
round, players and team ids the app writes), the offline fallback, Pro games on a free account,
manual setup, the centre tab, entering a score, and the settle-up total for a team match.

## Known debt (the baseline)

`baseline/<device>/<screen>.json` lists the issues that already existed when the suite was added.
They don't fail the run; anything **new** does. When you fix some, the run notes "known issue(s)
gone" — record the smaller baseline so they can't come back:

```bash
UPDATE_QA_BASELINE=1 bun run test:qa
```

Never re-record to make a new issue pass. Fix it.

## Run locally

```bash
bun run test:qa                                   # starts vite on 127.0.0.1:4173
QA_CHROMIUM=/opt/pw-browsers/chromium bun run test:qa   # cloud containers (repo pins its own Playwright)
bunx playwright show-report qa-report             # screenshots + failures
```

In CI the report and screenshots are uploaded as the `qa-report-<run>` artifact.
