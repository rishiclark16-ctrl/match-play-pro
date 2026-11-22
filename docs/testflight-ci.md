# TestFlight from GitHub Actions

`.github/workflows/testflight.yml` builds, signs and uploads MATCH Golf to TestFlight
on a GitHub macOS runner. It runs on every push to `main`, and from the Actions tab
("TestFlight" → "Run workflow") on any branch. Until the secrets below exist it
skips itself with a warning instead of failing.

What it does: install JS deps → unit tests (an upload only happens if they pass) →
`bun run build` → `npx cap sync ios` → `pod install` → `fastlane ci_beta`.

`fastlane ci_beta` (`ios/App/fastlane/Fastfile`):
1. Creates a temporary keychain and imports your Apple Distribution certificate.
2. Signs in to App Store Connect with an **API key**. No Apple ID password and no 2FA prompt.
3. Downloads (or creates) the App Store provisioning profile for `dev.matchgolf.app`.
4. Sets the build number to the latest TestFlight build for this version + 1, so no version-bump commits are needed.
   The version (2.5) still comes from `MARKETING_VERSION` in the Xcode project, so bump that for a new App Store version.
5. Archives, exports the `.ipa` and uploads it. The IPA and dSYMs are kept as a workflow artifact for 14 days.

The committed project keeps **Automatic** signing, so Xcode on your Mac is unchanged.
CI switches to manual signing only inside the runner.

## One-time setup (about 15 minutes, needs your Mac once)

### 1. App Store Connect API key
1. https://appstoreconnect.apple.com → **Users and Access** → **Integrations** → **App Store Connect API** → **Team Keys** → **+**.
2. Name: `GitHub Actions`, Access: **App Manager**. Download the `.p8` file (you can only download it once).
3. Note the **Key ID** (in the table) and the **Issuer ID** (above the table).
4. Base64-encode the key on your Mac:
   ```bash
   base64 -i AuthKey_XXXXXXXXXX.p8 | pbcopy
   ```

### 2. Apple Distribution certificate (.p12)
1. On your Mac open **Keychain Access** → **My Certificates**. Find **Apple Distribution: … (YPMSN56J9D)**.
   If it isn't there: Xcode → Settings → Accounts → your team → **Manage Certificates** → **+** → **Apple Distribution**.
2. Right-click it → **Export…** → save as `dist.p12` with a password you choose.
3. Base64-encode it:
   ```bash
   base64 -i dist.p12 | pbcopy
   ```

### 3. Add GitHub repository secrets
GitHub → `rishiclark16-ctrl/match-play-pro` → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Secret | Value |
|---|---|
| `ASC_KEY_ID` | Key ID from step 1 |
| `ASC_ISSUER_ID` | Issuer ID from step 1 |
| `ASC_KEY_P8_BASE64` | base64 of the `.p8` |
| `IOS_DIST_CERT_P12_BASE64` | base64 of `dist.p12` |
| `IOS_DIST_CERT_PASSWORD` | the password you set when exporting |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | already required by CI (the Supabase anon key) |

Optional, for Sentry source maps: `VITE_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`.

Then delete the local `.p8`, `.p12` and the clipboard contents.

### 4. First run
Actions → **TestFlight** → **Run workflow**. About 20–30 minutes later the build shows in
App Store Connect → TestFlight (Apple then processes it for a further 5–15 minutes).

## Notes
- Each upload uses GitHub macOS minutes (billed at 10× Linux on private repos; ~25 min per run).
- The certificate expires yearly. When it does, export the new one and replace `IOS_DIST_CERT_P12_BASE64`/`IOS_DIST_CERT_PASSWORD`.
- Submitting a TestFlight build for App Store review is still a manual click in App Store Connect (or `fastlane release` locally).
