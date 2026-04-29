# Sentry Release Tracking — Audit (Agent C1, 2026-04-27)

This document is a verification-only audit of MATCH Golf's Sentry release flow.
**No production code was modified.** It identifies the gaps required for stack
traces in Sentry to be symbolicated against committed source and proposes a
gated CI change that orchestration can apply if it accepts the recommendation.

---

## 1. How a release is supposed to flow

```
+----------------------+     vite build (mode=production)
| developer / CI shell |  ---------------------------------------+
+----------------------+                                          |
                                                                  v
       +------------------- vite.config.ts (sentryVitePlugin) ----+
       |     gate: mode === "production"
       |     gate: process.env.SENTRY_AUTH_TOKEN  (truthy)
       |     reads:  SENTRY_ORG, SENTRY_PROJECT, SENTRY_AUTH_TOKEN
       |     release.name = process.env.SENTRY_RELEASE
       |                  || `match-golf@<YYYY-MM-DD>-<epoch_ms>`
       |
       |  define { 'import.meta.env.VITE_SENTRY_RELEASE': RELEASE_VERSION }
       |  build.sourcemap = true (production only)
       v
+--------------------+      sourcemap upload (HTTPS)      +-------------+
| dist/assets/*.js   |     ------------------------>     | sentry.io   |
| dist/assets/*.map  |        (then *.map deleted         | release =   |
+--------------------+         locally per filesToDelete) | RELEASE_VER |
       |                                                   +-------------+
       v
+--------------------+
| Capacitor sync     |  npx cap sync ios → copies dist/ → ios/App/App/public/
+--------------------+
       |
       v
+--------------------+      runtime: Sentry.init({ release: RELEASE_VERSION })
| iOS / web app      |      ----------------------------------------------->
+--------------------+      errors are tagged with the same release string
       |                    Sentry server matches uploaded sourcemaps by
       |                    that release name → symbolicated stack frames.
       v
   Sentry UI: Issues → grouped by release fingerprint
```

**Key contract:** the `release` string baked into the JS bundle at build time
(`import.meta.env.VITE_SENTRY_RELEASE`) MUST equal the release name used to
upload source maps. `vite.config.ts` ensures this by computing
`RELEASE_VERSION` once at the top of the file and using it in both the
`sentryVitePlugin({ release: { name } })` call and the
`define['import.meta.env.VITE_SENTRY_RELEASE']` substitution.

---

## 2. Environment variables

| Var | Build-time / runtime | Where it must be set | Required for | Notes |
|---|---|---|---|---|
| `VITE_SENTRY_DSN` | runtime (baked into bundle) | dev `.env`, `.env.production`, CI prod build job, iOS build environment | Sentry to fire at all (`initSentry()` no-ops without it) | `VITE_*` prefix → exposed to client. OK because DSN is a public ingest URL. |
| `SENTRY_AUTH_TOKEN` | build-time only | CI prod build job, local prod build shell | Source map upload | NEVER prefix with `VITE_` (it's a secret). Must be a Sentry auth token with `project:releases` and `org:read` scopes. |
| `SENTRY_ORG` | build-time only | CI prod build job, local prod build shell | Source map upload | The Sentry org slug. |
| `SENTRY_PROJECT` | build-time only | CI prod build job, local prod build shell | Source map upload | The Sentry project slug. |
| `SENTRY_RELEASE` | build-time only (optional) | optional override | Pin the release name to a git SHA / tag | If unset, vite.config.ts auto-generates `match-golf@<date>-<ms>`. Highly recommended to set this to the git SHA in CI for reproducible release names. |

**Environments and what each must set:**

| Environment | `VITE_SENTRY_DSN` | `SENTRY_AUTH_TOKEN` | `SENTRY_ORG` | `SENTRY_PROJECT` | `SENTRY_RELEASE` |
|---|:-:|:-:|:-:|:-:|:-:|
| Local dev (`bun run dev`) | optional (off by default) | no | no | no | no |
| Local prod build (`bun run build:production`) | yes | yes | yes | yes | recommended |
| GitHub Actions (CI verify job) | no (build:dev, no Sentry init) | no | no | no | no |
| GitHub Actions (proposed Sentry release job) | yes (repo secret) | yes (repo secret) | yes (repo secret) | yes (repo secret) | yes (`${{ github.sha }}`) |
| iOS Xcode archive build | yes (in shell env when running `bun run build:production`) | yes | yes | yes | recommended |

---

## 3. Where Sentry is wired into the app

| File | Role |
|---|---|
| `src/lib/sentry.ts` | `initSentry()` (no-op if `VITE_SENTRY_DSN` empty), `setSentryUser`, `setSentrySubscription`, `setSentryRoute`, `captureException`, `captureMessage`, `addBreadcrumb`, `withSpan`. Releases-tag is `release: SENTRY_RELEASE` and a duplicate `app_version` tag in `initialScope`. |
| `src/main.tsx` | Calls `initSentry()` before React mounts. Global `error` and `unhandledrejection` listeners route through `logger.error` (which calls `captureException`). |
| `src/components/ErrorBoundary.tsx` | App-wide React error boundary → `captureException(error, { componentStack })` + breadcrumb. |
| `src/components/RouteErrorBoundary.tsx` | Per-route boundary, resets on `useLocation().pathname` change → `captureException(error, { componentStack, route })` + breadcrumb. |
| `src/hooks/useAuth.tsx` | `setSentryUser({ id, email })` on login; `setSentryUser(null)` on logout. |
| `src/hooks/useSentryContext.ts` | Tags `route` (with dynamic-segment normalization) and `subscription` on route/sub change. |
| `src/lib/logger.ts` | Wraps console; `logger.error` → `captureException`; `logger.info|warn|user|http` → `addBreadcrumb`. |
| `src/hooks/useSupabaseRound.ts`, `useCreateSupabaseRound.ts`, `usePropBets.ts` | Direct `captureException` calls in catch blocks for round/score/bet failures. |

`vendor-sentry` is in its own manualChunk in `vite.config.ts` (262 kB, lazy-loadable as a separate file).

**Integrations enabled in `Sentry.init()`:**
- Default integrations minus anything with `Feedback` in its name (the auto-injected feedback widget is stripped intentionally).
- `browserTracingIntegration({ enableInp: true })`.
- `replayIntegration({ maskAllText: true, blockAllMedia: true })`.
- `tracesSampleRate`: 0.2 in prod, 1.0 in dev.
- `replaysSessionSampleRate`: 0.01 in prod, 0 in dev.
- `replaysOnErrorSampleRate`: 0.5 in prod, 0 in dev.
- `beforeSend` drops "Edge Function returned a non-2xx status code" exceptions and scrubs emails out of the message field. Stack frames and breadcrumbs are NOT scrubbed by this hook — anything pushed to breadcrumbs by `logger.user(action, data)` could leak PII through the `data` payload. Worth a follow-up but out of scope for this audit.

---

## 4. Gap list

| # | Severity | Where | Problem | Recommended fix |
|---|---|---|---|---|
| 1 | HIGH | `.github/workflows/ci.yml:50` | CI only runs `bun run build:dev`, so `mode === "production"` is never true and `sentryVitePlugin` short-circuits before checking `SENTRY_AUTH_TOKEN`. CI never produces or uploads a release. | Add an additional job (or a guarded step) that runs `bun run build:production` when `secrets.SENTRY_AUTH_TOKEN` is present. See proposed YAML diff in §5. |
| 2 | HIGH | iOS Xcode `App.xcodeproj/project.pbxproj` | The Xcode target has no shell-script build phase that runs `bun run build:production` or `npx cap sync ios`. The web bundle in `ios/App/App/public/` is whatever the developer last copied via a manual sync. If the developer ran `bun run build:dev` (or just `bun run build` with no Sentry envs in their shell), the iOS archive ships with no Sentry release name and no uploaded sourcemaps. | Document in `docs/NATIVE_BUILD.md` (§7 "Build for Release") that the operator MUST run `SENTRY_AUTH_TOKEN=… SENTRY_ORG=… SENTRY_PROJECT=… SENTRY_RELEASE=$(git rev-parse HEAD) bun run build:production && npx cap sync ios` before `Product → Archive`. Long-term: add a fastlane lane or a pre-Archive Run Script Phase that fails the build if `dist/` is older than the most recent commit. |
| 3 | HIGH | `docs/NATIVE_BUILD.md:60` and `:248` | Build instructions tell the operator to run `npm run build` and `npx cap sync`. The default `build` script (`vite build`) does default to `mode === "production"`, so the Sentry plugin gate passes — but only if `SENTRY_AUTH_TOKEN` was exported in the shell. The doc never mentions the four Sentry env vars, so it's almost certain they aren't being set on the local Mac that ships the App Store build. | Add a "Sentry release setup" subsection listing the four env vars + the optional `SENTRY_RELEASE=$(git rev-parse HEAD)` override. |
| 4 | MED | `.github/workflows/ci.yml:19-22` | CI sets `VITE_SUPABASE_*` but not `VITE_SENTRY_DSN`. Even if a future production-build CI job is added, the bundle will initialize without a DSN and skip Sentry entirely. | Add `VITE_SENTRY_DSN: ${{ secrets.VITE_SENTRY_DSN }}` to the env block of the proposed Sentry release job. |
| 5 | MED | `vite.config.ts:8` | The auto-generated release name `match-golf@<YYYY-MM-DD>-<epoch_ms>` changes every time you run a build, so two consecutive `bun run build:production` invocations produce two distinct Sentry releases for the same source tree. This makes deploys that span two machines non-deterministic. | Always set `SENTRY_RELEASE=$(git rev-parse HEAD)` (or a tagged version like `match-golf@$(git describe --tags)`) before the build. The fallback is fine for local debugging but should not ship. |
| 6 | MED | `vite.config.ts:124` | `build.sourcemap = mode === "production"` produces sourcemaps unconditionally in prod even when no auth token is present. With `filesToDeleteAfterUpload` only firing inside the plugin (which itself is gated on the token), an aborted-token prod build leaves `*.map` files in `dist/` that then get bundled into `ios/App/App/public/` by `npx cap sync ios`. End users would download the source maps along with the JS. | Either (a) gate `build.sourcemap` on `process.env.SENTRY_AUTH_TOKEN` so maps are only generated when they will also be uploaded-and-deleted, or (b) add a post-build step `find dist -name '*.map' -delete` before `npx cap sync ios`. (Out of scope for this audit; flagged for orchestrator.) |
| 7 | LOW | `src/lib/sentry.ts:22` | If `VITE_SENTRY_RELEASE` is empty (DSN set but release not), `Sentry.init({ release: undefined })` is valid but issues will be tagged with no release, defeating sourcemap matching. | Already guarded by HIGH-3; once the operator sets the four envs, vite.config.ts always provides a release. No code change needed if §3 is addressed. |
| 8 | LOW | `src/lib/sentry.ts:79` | `initialScope.tags.app_version` duplicates the `release` field. Useful for filtering but not load-bearing. | Keep — no action. |
| 9 | LOW | `src/lib/logger.ts:37,49,90,101` | `addBreadcrumb` forwards arbitrary `data` payloads. PII in breadcrumbs is not scrubbed by `beforeSend` (which only touches `event.message`). | Follow-up: tighten `beforeSend` to also walk `event.breadcrumbs[].data` and redact email/phone patterns. Out of scope for release-tracking audit. |

---

## 5. Proposed CI change (YAML diff — DO NOT APPLY in this PR)

This adds a second job that only runs when the repo has `SENTRY_AUTH_TOKEN`
configured as a secret. It uses GitHub Actions' `secrets` indirection so the
job is silently skipped on forks or repos that haven't opted in.

```diff
--- a/.github/workflows/ci.yml
+++ b/.github/workflows/ci.yml
@@ -47,3 +47,40 @@ jobs:
       - name: Build (development mode, no Sentry upload)
         run: bun run build:dev
+
+  sentry-release:
+    name: Production build + Sentry release
+    runs-on: ubuntu-latest
+    needs: verify
+    timeout-minutes: 15
+    # Only run on pushes to main, and only if SENTRY_AUTH_TOKEN is configured.
+    # `if` evaluates secrets indirectly via the env block to avoid GitHub's
+    # "secrets cannot be referenced in if conditions" restriction.
+    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
+
+    env:
+      VITE_SUPABASE_PROJECT_ID: puqgbsxabcyxrbwwoznn
+      VITE_SUPABASE_URL: https://puqgbsxabcyxrbwwoznn.supabase.co
+      VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}
+      VITE_SENTRY_DSN: ${{ secrets.VITE_SENTRY_DSN }}
+      SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
+      SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
+      SENTRY_PROJECT: ${{ secrets.SENTRY_PROJECT }}
+      SENTRY_RELEASE: match-golf@${{ github.sha }}
+
+    steps:
+      - name: Checkout
+        uses: actions/checkout@v4
+
+      - name: Skip if Sentry secrets are missing
+        id: gate
+        run: |
+          if [ -z "$SENTRY_AUTH_TOKEN" ] || [ -z "$SENTRY_ORG" ] || [ -z "$SENTRY_PROJECT" ] || [ -z "$VITE_SENTRY_DSN" ]; then
+            echo "Sentry secrets not configured — skipping production build."
+            echo "skip=true" >> "$GITHUB_OUTPUT"
+          else
+            echo "skip=false" >> "$GITHUB_OUTPUT"
+          fi
+
+      - name: Setup Bun
+        if: steps.gate.outputs.skip == 'false'
+        uses: oven-sh/setup-bun@v2
+        with:
+          bun-version: 1.3.9
+
+      - name: Install dependencies
+        if: steps.gate.outputs.skip == 'false'
+        run: bun install --frozen-lockfile
+
+      - name: Production build with Sentry sourcemap upload
+        if: steps.gate.outputs.skip == 'false'
+        run: bun run build:production
```

**Why this shape:** The `if:` on the job restricts to main-branch pushes (no PR
runs on forks, no double-spend on every PR). The "Skip if Sentry secrets are
missing" step degrades to a no-op job when secrets aren't configured, so the
workflow is safe to land before the secrets exist. Each subsequent step then
gates on `steps.gate.outputs.skip == 'false'` so an unconfigured repo's job
still passes (cosmetically green, materially a skip).

**Required repo secrets** before enabling this job:

- `VITE_SENTRY_DSN`
- `SENTRY_AUTH_TOKEN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`

(`VITE_SUPABASE_PUBLISHABLE_KEY` already exists per CLAUDE.md.)

---

## 6. Test plan — verifying a release actually arrived in Sentry

### 6a. Local smoke test (no CI required)

1. In a clean shell:
   ```bash
   export VITE_SENTRY_DSN='<the prod DSN from Sentry → Project → Client Keys>'
   export SENTRY_AUTH_TOKEN='<a personal token with project:releases scope>'
   export SENTRY_ORG='<org slug>'
   export SENTRY_PROJECT='<project slug>'
   export SENTRY_RELEASE="match-golf@$(git rev-parse HEAD)"
   bun run build:production
   ```
2. Confirm in the build log that you see `[sentry-vite-plugin] Successfully uploaded source maps to Sentry` (or the equivalent — the plugin prints the release name and the count of uploaded artifacts).
3. Open Sentry → **Releases** → confirm a row exists with the exact `SENTRY_RELEASE` value, file count > 0.

### 6b. Trigger a known error in the deployed app

1. Add a temporary route or button (do NOT commit) that throws on click:
   ```tsx
   <button onClick={() => { throw new Error('SENTRY_RELEASE_VERIFICATION_PROBE'); }}>
     Throw test error
   </button>
   ```
2. `bun run build:production && npx cap sync ios && npx cap run ios` (or deploy the web build).
3. Click the button in the running app.
4. In Sentry → **Issues**, locate the new issue:
   - Title: `Error: SENTRY_RELEASE_VERIFICATION_PROBE`.
   - **Release** tag in the right sidebar matches `match-golf@<sha>`.
   - **Stack trace** shows symbolicated frames pointing into `src/...` (NOT minified `assets/index-XXXXX.js:1`). If you see minified frames, source map upload failed or the release name in the bundle does not match the upload.
   - **Tags** include `platform: ios` (or `web`), `route: <path>`, `subscription: free|pro`, `app_version: match-golf@<sha>`.
   - **Breadcrumbs** include the route-error or error-boundary breadcrumb.
5. Remove the test button, rebuild, redeploy.

### 6c. Negative test (regression guard)

Run the same flow with `SENTRY_AUTH_TOKEN` unset. Expectations:
- `bun run build:production` succeeds with no `[sentry-vite-plugin]` upload log lines.
- The deployed app still reports errors to Sentry (DSN is independent of upload), BUT the stack trace shows minified frames and the **Release** tag is the auto-generated `match-golf@<date>-<ms>` string. This is the failure mode HIGH-1, HIGH-2, and HIGH-3 above are guarding against.

---

## 7. Summary

- The Sentry SDK wiring inside the app is correct: `initSentry()` is called in `main.tsx`, both error boundaries report, route + user + subscription tags are attached, and `vite.config.ts` correctly threads `RELEASE_VERSION` into both the bundle (`define`) and the upload plugin (`release.name`).
- The release flow only works end-to-end when ALL FOUR build-time env vars are set in the shell that runs the production build. None of the operational entry points (CI, Xcode archive) currently guarantee that.
- The single highest-leverage fix is the proposed `sentry-release` CI job in §5, gated on a repo secret. That gives the team an automated, reproducible path to symbolicated production stack traces and stops relying on the developer's local shell environment.

---

*Audit prepared by C1 (Sentry Release Verifier). No source files were modified. The only artifact is this document.*
