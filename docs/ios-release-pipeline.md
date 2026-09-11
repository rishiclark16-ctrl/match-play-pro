# iOS Release Pipeline Audit

**Audit date:** 2026-04-27
**Auditor:** Agent C2 (Fastlane / iOS CI Auditor)
**Goal:** Document realistic plan to wire Fastlane into CI for TestFlight builds.

---

## Inventory — what exists today

### `ios/App/fastlane/`

| File | Status | Purpose |
|------|--------|---------|
| `Fastfile` | Present, 197 lines | Lanes: `beta`, `release`, `build`, `bump_version`, `bump_build`, `screenshots`, `certs`, `test`, `version` |
| `Appfile` | Present but **incomplete** — `apple_id`, `itc_team_id`, `team_id` are all commented out | App Store Connect / Developer Portal identifiers |
| `Snapfile` | Present | Screenshot capture config (iPhone 15 Pro Max, iPhone 11 Pro Max, en-US) |
| `README.md` | Present | Auto-generated lane summary |
| `.gitignore` | Present | Ignores `report.xml`, `Preview.html`, `screenshots/**/*.png`, `test_output/`, `build/`, `*.ipa`, `*.dSYM.zip` |
| `Matchfile` | **MISSING** | Required for `match` to know git URL of the certificates repo |

### `ios/App/`
- `Gemfile` → only `gem "fastlane"`. **No `Gemfile.lock`** committed → CI will resolve a fresh fastlane version on every run (slow + non-reproducible).
- `Podfile` → standard Capacitor + RevenueCat 5.0 pods. Min iOS 15.0, `use_frameworks!`.
- `Podfile.lock` is committed.

### `ios/App/App.xcodeproj/project.pbxproj`
- `CODE_SIGN_STYLE = Automatic` for both Debug and Release configs.
- `DEVELOPMENT_TEAM = YPMSN56J9D` (hardcoded).
- `MARKETING_VERSION = 2.2`, `CURRENT_PROJECT_VERSION = 1`. (`Info.plist` overrides to `CFBundleVersion = 3` — minor inconsistency.)
- `PRODUCT_BUNDLE_IDENTIFIER = dev.matchgolf.app`.
- `REVENUECAT_API_KEY = appl_xWFDfdKOsXHuszaTSfFxLzPiJGt` is **hardcoded as a literal** in the build settings (and therefore checked into git). Out of scope for this audit but flagged — see Risks.

### `Info.plist`
- `RevenueCatAPIKey` reads from `$(REVENUECAT_API_KEY)` build setting. Good — substitution works as long as the build setting is set.

### `.github/workflows/ci.yml` (existing)
- Runs on `push: main` and PRs.
- Linux runner (`ubuntu-latest`).
- Steps: lint (`eslint src --max-warnings 50`) → `bun test src/hooks src/lib src/engine src/components` → `bun test src/pages` → `bun run build:dev`.
- **No iOS step. No Fastlane invocation. No tag-triggered workflow.**

### Lanes that exist in `Fastfile`

| Lane | What it does | Production-ready? |
|------|--------------|-------------------|
| `beta` | `increment_build_number` → `build_app` (export_method app-store) → `upload_to_testflight` | **Locally yes; in CI no** — Automatic signing requires logged-in Xcode session |
| `release` | Same as `beta` but uploads to App Store Connect (no auto-submit) | Same |
| `build` | `build_app` only (no upload) | Locally yes; in CI no (signing) |
| `certs` | `match(type: "appstore", readonly: true)` | **Cannot run** — no `Matchfile`, no certs repo, no MATCH_PASSWORD configured |
| `bump_version`, `bump_build`, `version`, `screenshots`, `test` | Ancillary | OK locally; not relevant for CI release path |

---

## Maturity gaps — what's missing to ship to TestFlight from CI

| # | Gap | Impact |
|---|-----|--------|
| 1 | **No App Store Connect API key** wired into the Fastfile. `upload_to_testflight` will fall back to interactive 2FA prompts, which fail headlessly in CI. | Blocker |
| 2 | **No `Matchfile`** and no certificates git repo. `lane :certs` is dead code. | Blocker |
| 3 | **Code signing is `Automatic`** in `project.pbxproj`. Automatic signing requires an Xcode-logged-in Apple ID and cannot install profiles fetched by `match`. Must switch to `Manual` for CI. | Blocker |
| 4 | **No `Gemfile.lock`** → fastlane version drifts every CI run; non-reproducible builds. | Medium |
| 5 | **`Appfile` is incomplete** — `apple_id`, `itc_team_id`, `team_id` commented out. Without these, ASC API key auth still works, but team-scoped commands (e.g., `pilot`) need the team id. | Medium |
| 6 | **No tag-triggered workflow.** `ci.yml` only runs Linux build:dev. There is no `.github/workflows/ios-release.yml`. | Blocker |
| 7 | **No Sentry source-map upload step** integrated with the iOS build. Web build can run it via `@sentry/vite-plugin` (already a dep), but it requires `SENTRY_AUTH_TOKEN` which is not in CI secrets. | Medium |
| 8 | **No keychain bootstrap.** macOS runners have an empty default keychain on each boot — `match` and `build_app` need a temporary keychain provisioned and unlocked. | Blocker |
| 9 | **`build:production` script exists** in `package.json` but is not used anywhere in CI. The web bundle that `cap sync ios` copies into the iOS app would be `build:dev` if naively wired. | Medium |
| 10 | **No `.dSYM` artifact upload** to Sentry/App Store Connect. Crashes from TestFlight builds will be unsymbolicated. | Low (today), Medium (post-launch) |
| 11 | **No build-number monotonicity strategy.** `increment_build_number` reads from local `project.pbxproj` and commits nothing, so two parallel CI runs would duplicate `CFBundleVersion`. App Store Connect rejects duplicates. | Medium |

---

## Recommended workflow — `.github/workflows/ios-release.yml` (DRAFT, do not commit yet)

```yaml
name: iOS Release (TestFlight)

# Tag-triggered only. Never on every commit — macos runners cost ~10x Linux.
on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:
    inputs:
      lane:
        description: 'Fastlane lane to run'
        required: true
        default: 'beta'
        type: choice
        options:
          - beta
          - release

concurrency:
  group: ios-release-${{ github.ref }}
  cancel-in-progress: false  # never cancel a release mid-upload

jobs:
  build-and-deliver:
    name: Build + TestFlight upload
    runs-on: macos-14
    timeout-minutes: 60

    env:
      VITE_SUPABASE_PROJECT_ID: puqgbsxabcyxrbwwoznn
      VITE_SUPABASE_URL: https://puqgbsxabcyxrbwwoznn.supabase.co
      VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}
      # Sentry source-map upload only fires when this is non-empty.
      SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
      SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
      SENTRY_PROJECT: ${{ secrets.SENTRY_PROJECT }}
      # App Store Connect API key (preferred over Apple ID + 2FA in CI)
      APP_STORE_CONNECT_KEY_ID: ${{ secrets.APP_STORE_CONNECT_KEY_ID }}
      APP_STORE_CONNECT_ISSUER_ID: ${{ secrets.APP_STORE_CONNECT_ISSUER_ID }}
      APP_STORE_CONNECT_KEY_CONTENT: ${{ secrets.APP_STORE_CONNECT_KEY_CONTENT }}  # base64 of .p8
      # Match (certificates git repo)
      MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
      MATCH_GIT_URL: ${{ secrets.MATCH_GIT_URL }}
      MATCH_GIT_BASIC_AUTHORIZATION: ${{ secrets.MATCH_GIT_BASIC_AUTHORIZATION }}
      # iOS team
      APPLE_TEAM_ID: YPMSN56J9D
      # RevenueCat (keep out of pbxproj long-term — see Risks)
      REVENUECAT_API_KEY: ${{ secrets.REVENUECAT_API_KEY }}
      LANE: ${{ github.event.inputs.lane || 'beta' }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # for tag and full git history (used by build_number strategies)

      - name: Select Xcode 15.4
        run: sudo xcode-select -s /Applications/Xcode_15.4.app/Contents/Developer

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: 1.3.9

      - name: Setup Ruby (for Fastlane)
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.2'
          bundler-cache: true
          working-directory: ios/App

      - name: Install JS dependencies
        run: bun install --frozen-lockfile

      # Use production env. Source-map upload is gated on SENTRY_AUTH_TOKEN being non-empty.
      - name: Build web bundle (production)
        run: bun run build:production

      - name: Capacitor sync iOS
        run: npx cap sync ios

      - name: Install CocoaPods
        working-directory: ios/App
        run: pod install --repo-update

      - name: Create temporary keychain
        run: |
          security create-keychain -p "${{ secrets.KEYCHAIN_PASSWORD }}" build.keychain
          security default-keychain -s build.keychain
          security unlock-keychain -p "${{ secrets.KEYCHAIN_PASSWORD }}" build.keychain
          security set-keychain-settings -lut 21600 build.keychain

      - name: Decode App Store Connect API key
        run: |
          mkdir -p ~/.appstoreconnect/private_keys
          echo "${{ secrets.APP_STORE_CONNECT_KEY_CONTENT }}" | base64 --decode \
            > ~/.appstoreconnect/private_keys/AuthKey_${{ secrets.APP_STORE_CONNECT_KEY_ID }}.p8

      - name: Run Fastlane lane
        working-directory: ios/App
        run: bundle exec fastlane "$LANE"
        env:
          # Build number = GitHub run number → guaranteed monotonic across all CI runs
          FASTLANE_BUILD_NUMBER: ${{ github.run_number }}
          KEYCHAIN_NAME: build.keychain
          KEYCHAIN_PASSWORD: ${{ secrets.KEYCHAIN_PASSWORD }}

      - name: Upload IPA artifact
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: MatchGolf-ipa
          path: ios/App/build/MatchGolf.ipa
          if-no-files-found: warn
          retention-days: 14

      - name: Upload .dSYM artifact (for Sentry symbolication)
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: MatchGolf-dSYM
          path: ios/App/build/*.dSYM.zip
          if-no-files-found: warn
          retention-days: 30
```

### Notes on the workflow above
- The `Fastfile` itself must be updated to consume `FASTLANE_BUILD_NUMBER`, `MATCH_*`, and `APP_STORE_CONNECT_*` env vars — those changes are out of scope for this audit (no `ios/` modifications) but listed under "Required Fastfile changes" below.
- The Sentry source-map upload runs as part of `bun run build:production` via `@sentry/vite-plugin` (already a dep). The plugin is a no-op when `SENTRY_AUTH_TOKEN` is empty, so PR/dev builds won't fail.
- `concurrency.cancel-in-progress: false` is intentional — App Store Connect uploads are idempotent-ish but interrupting a partial upload is messy.

---

## Required GitHub secrets

| Secret | Description | Source |
|--------|-------------|--------|
| `APP_STORE_CONNECT_KEY_ID` | 10-char key ID from App Store Connect → Users and Access → Keys | App Store Connect |
| `APP_STORE_CONNECT_ISSUER_ID` | Issuer UUID from same page | App Store Connect |
| `APP_STORE_CONNECT_KEY_CONTENT` | Base64-encoded contents of the `.p8` file (`base64 -i AuthKey_XXXX.p8 \| pbcopy`) | Local file |
| `MATCH_GIT_URL` | HTTPS URL of the private certificates repo (e.g. `https://github.com/match-golf/ios-certs.git`) | New private repo to create |
| `MATCH_GIT_BASIC_AUTHORIZATION` | `base64("username:personal_access_token")` granting read access to the certs repo | GitHub PAT |
| `MATCH_PASSWORD` | Symmetric encryption passphrase used by `match` to encrypt certs in the git repo | Generate fresh; store in 1Password |
| `KEYCHAIN_PASSWORD` | Random string for the temporary build keychain | Generate fresh per repo |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key (already used by existing `ci.yml`) | Existing |
| `SENTRY_AUTH_TOKEN` | Build-time Sentry auth token (org-scoped, project:write) — **optional**, source-map upload skipped if missing | Sentry org settings |
| `SENTRY_ORG` | Sentry org slug — optional | Sentry |
| `SENTRY_PROJECT` | Sentry project slug — optional | Sentry |
| `REVENUECAT_API_KEY` | Optional once `pbxproj` literal is removed; until then this is unused | RevenueCat dashboard |

---

## Required Fastfile changes (out of scope for this audit, listed for the implementer)

These must happen alongside the workflow above, otherwise the lanes won't pick up the new env vars. Ticketed for a follow-up agent / human, NOT this audit:

1. Add `app_store_connect_api_key(...)` action at the top of `lane :beta` and `lane :release`, sourcing key id, issuer, and key content from env vars. Pass the resulting hash to `upload_to_testflight` and `upload_to_app_store` via `api_key:`.
2. Update `lane :certs` (or a new `lane :setup_signing`) to call `match` with `keychain_name: ENV["KEYCHAIN_NAME"]`, `keychain_password: ENV["KEYCHAIN_PASSWORD"]`, `readonly: true`, and `api_key:` for ASC API auth.
3. Pass `FASTLANE_BUILD_NUMBER` to `increment_build_number(build_number: ENV["FASTLANE_BUILD_NUMBER"])` instead of the auto-increment.
4. Switch `build_app` to use the manual signing identity + provisioning profile name installed by `match` — set `export_options: { method: "app-store", provisioningProfiles: { "dev.matchgolf.app" => "match AppStore dev.matchgolf.app" } }`.
5. Create `Matchfile` with `git_url`, `storage_mode: "git"`, `type: "appstore"`, `app_identifier(["dev.matchgolf.app"])`, `team_id("YPMSN56J9D")`.
6. In `project.pbxproj` (Xcode side), flip `CODE_SIGN_STYLE` from `Automatic` to `Manual` and set `PROVISIONING_PROFILE_SPECIFIER = "match AppStore dev.matchgolf.app"` for the `Release` configuration only — leave `Debug` on automatic so local dev still works.
7. Commit a `Gemfile.lock` so fastlane version is pinned.
8. Uncomment `apple_id`, `itc_team_id`, `team_id` in `Appfile`.

---

## Risks

### Signing certificate rotation
- Apple distribution certs expire after 1 year. When they roll over, the certs git repo must be regenerated (`fastlane match nuke distribution` then `fastlane match appstore`). This invalidates all in-flight CI runs and any cached `Pods/` directories on local dev machines.
- **Mitigation:** Calendar reminder at the 11-month mark; document the rotation procedure in the `Matchfile`-companion README.

### macOS runner cost
- `macos-14` runners on GitHub-hosted plans cost ~10× Linux runners and have a 5-hour wall clock per job. Triggering on every push would exhaust the org's macOS minutes within a week.
- **Mitigation:** Tag-only trigger (`v*`) plus `workflow_dispatch` for manual runs. Already in the draft above.

### App Store Connect rate limits
- ASC API is rate-limited per-key (3,500 req/hr soft cap, ~150 builds/day per app). Not a concern at TestFlight cadence (~weekly), but if a build crashes mid-upload and is retried in a loop you can lock the key for 1 hr.
- **Mitigation:** `concurrency.cancel-in-progress: false`; manual rerun only after diagnosing the previous failure.

### RevenueCat key in `pbxproj`
- The current `appl_xWFD…JGt` literal is checked into git. If the repo ever goes public, the key is compromised. Even private, anyone with read access can extract it.
- **Mitigation (P1, after CI lands):** Move the key to a `.xcconfig` file in `.gitignore`, or read from the keychain at app start. Until then, accept the risk — the key is read-only and scoped to the public-facing storefront.

### Auto-increment race condition
- `increment_build_number` writes to `project.pbxproj` and creates a dirty git state inside the runner. If two CI jobs run simultaneously they can produce the same `CFBundleVersion`, causing the second TestFlight upload to fail with "build version already used."
- **Mitigation:** Use `${{ github.run_number }}` as the build number (suggested in the draft). Run number is monotonic across the entire repo, so collisions are impossible.

### `bun run build:production` vs `cap sync` timing
- If `cap sync ios` runs before the web bundle is built, Capacitor copies a stale `dist/` into `ios/App/App/public/`. The lane order matters.
- **Mitigation:** Workflow does `build:production` then `cap sync ios` then `pod install` then `fastlane`. This sequence is explicit in the YAML above.

---

## Concrete next action for the user

> **Create an App Store Connect API key** at https://appstoreconnect.apple.com → Users and Access → Keys → "+". Role: `App Manager` (or `Developer` for TestFlight-only). Download the `.p8` file (one-time download — store in 1Password). Then run locally:
>
> ```bash
> base64 -i AuthKey_XXXXXXXX.p8 | pbcopy
> ```
>
> and paste into a new GitHub repository secret named `APP_STORE_CONNECT_KEY_CONTENT`. Also add the Key ID and Issuer ID as `APP_STORE_CONNECT_KEY_ID` and `APP_STORE_CONNECT_ISSUER_ID`.
>
> Once that secret triplet is in place, the next step is creating a private `match` certificates repo and running `fastlane match init` locally to generate the encrypted certs.

---

## Maturity score

**3 / 10**

Reasoning: Fastlane lanes are scaffolded and the bundle id, team id, and codebase compile path are clean — that's worth a 3. Everything else (signing strategy, secrets pipeline, runner config, certs repo, ASC API key, monotonic build numbers, Matchfile) is missing. Closing all of it puts the repo at ~9/10; the last point is reserved for symbolication + crash-report automation, which is a Phase 2 concern.

## Top 3 blockers (in order)

1. **No App Store Connect API key wired in** — without this, `upload_to_testflight` will hang on 2FA in CI. (~2 hr to set up + secret config.)
2. **No Match-managed certificates repo + `Matchfile`** — `lane :certs` is dead code; signing identity has no headless source. (~3 hr to bootstrap the repo, run `match appstore`, store `MATCH_PASSWORD`.)
3. **Code signing must flip to Manual + add `ios-release.yml`** — Automatic signing cannot consume profiles installed by `match` headlessly; and there is no workflow file to invoke fastlane at all. (~2 hr to edit `pbxproj` Release config + author the workflow per the draft above.)

## Estimated effort

| Blocker | Hours |
|---------|-------|
| 1. ASC API key + GitHub secrets | 2 |
| 2. Match certificates repo bootstrap | 3 |
| 3. Manual signing in pbxproj + author `ios-release.yml` + Fastfile env-var consumption | 2 |
| **Total to one-tag-to-TestFlight** | **~7 hours** |

Add ~2 hours for first dry-run + debugging (keychain unlock issues, asset catalog warnings, missing entitlements). Realistic total: **~9 hours of focused work** to land a working `git tag v2.3.0 && git push --tags` → TestFlight pipeline.
