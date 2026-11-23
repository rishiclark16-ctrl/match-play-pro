# TestFlight and App Store releases from GitHub Actions (no Mac)

`.github/workflows/testflight.yml` builds, signs and uploads MATCH Golf on a GitHub macOS
runner. On request, it also submits that build for App Store review. You never need a Mac,
and you never log in with an Apple ID. Setup takes about 10 minutes, all of it in a web browser.

When it runs:
- **Every push to `main`** uploads a TestFlight build.
- **On demand** from Actions → **TestFlight** → **Run workflow**, on any branch. Claude Code can
  trigger this too: ask "send a TestFlight build" or "submit v3.0 for review".

Until the secrets below exist, the workflow skips itself with a warning instead of failing.

## What a run does

The workflow runs these steps in order:
1. Installs the JS dependencies.
2. Runs the unit tests. A failing test stops the upload.
3. `bun run build`.
4. `npx cap sync ios`.
5. `pod install`.
6. `fastlane ci_beta`.

`fastlane ci_beta` (`ios/App/fastlane/Fastfile`) then:
1. Signs in to App Store Connect with an **API key**, so there is no password or 2FA prompt.
2. Sets the build number to the latest TestFlight build for this version + 1, so CI never commits a version bump.
   The version itself (currently **3.0**) comes from `MARKETING_VERSION` in the Xcode project.
3. Archives and exports with **cloud-managed signing**. Xcode uses automatic signing, authorised by the API key.
   Apple holds the distribution certificate, so there is no `.p12` to export from a Keychain.
4. Uploads to TestFlight. The IPA and dSYMs are kept as a workflow artifact for 14 days.
5. **If "Submit for review" was ticked**, it waits for Apple to process the build, then does four things:
   - creates or updates the App Store version
   - sets "What's New" to your release notes
   - answers export compliance (`ITSAppUsesNonExemptEncryption = NO` is already in `Info.plist`)
   - submits for review

   When Apple approves the build, it is released automatically, unless you un-tick "Release automatically".

## One-time setup (browser only)

### 1. Create an App Store Connect API key
1. Open https://appstoreconnect.apple.com and go to **Users and Access** → **Integrations** → **App Store Connect API** → **Team Keys**.
   If it asks, click **Request Access** first (Account Holder only, instant).
2. Click **+**. Name it `GitHub Actions` and set Access to **Admin**.
   Admin is required: it is the role that lets Xcode use cloud-managed certificates and create profiles.
3. Click **Download** next to the new key. You get a `.p8` file, and you can only download it once.
4. Note the **Key ID** (in the table) and the **Issuer ID** (the UUID above the table).

### 2. Add three GitHub repository secrets
Go to GitHub → `rishiclark16-ctrl/match-play-pro` → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Secret | Value |
|---|---|
| `ASC_KEY_ID` | Key ID from step 1 |
| `ASC_ISSUER_ID` | Issuer ID from step 1 |
| `ASC_KEY_P8` | Open the `.p8` in any text editor (Notepad, TextEdit, the Files app) and paste **all** of it, including the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines |

`VITE_SUPABASE_PUBLISHABLE_KEY` is already set (regular CI uses it).
Optional, for Sentry source maps: `VITE_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`.

Then delete the downloaded `.p8`. GitHub keeps the only copy you need.

### 3. First run
Go to Actions → **TestFlight** → **Run workflow** → **Run workflow**. About 25 minutes later the build appears in
App Store Connect → TestFlight. Apple then processes it for a further 5–15 minutes.

## Releasing to the App Store
Go to Actions → **TestFlight** → **Run workflow**, then fill in:
- **Submit for review**: ticked
- **What's New**: the text shown on the App Store update page (required)
- **Release automatically**: ticked to go live as soon as Apple approves; un-ticked to press "Release" yourself in App Store Connect

The run takes about 40 minutes, because it waits for Apple's processing before submitting. Review usually takes 1–2 days.

Things App Store Connect must already have for the version (they carry over from the previous release):
screenshots, description, keywords, privacy answers and age rating. CI never overwrites those.
It only sets "What's New".

## Notes
- macOS runner minutes are billed at 10× Linux on private repos. A TestFlight run is about 25 minutes; a review submission is about 40.
- **Bump the version for each App Store release**: change `MARKETING_VERSION` in `ios/App/App.xcodeproj/project.pbxproj`, or ask Claude.
  Apple rejects a second submission of a version that is already live.
- Each cloud-signed archive can create an "Apple Development" certificate on the runner.
  If a run ever fails with "maximum number of certificates", revoke old ones at
  https://developer.apple.com/account/resources/certificates. Distribution is unaffected: that certificate is cloud-managed.
- Fallback: if you ever prefer your own certificate, add `IOS_DIST_CERT_P12_BASE64` and `IOS_DIST_CERT_PASSWORD`.
  The lane then signs manually with that `.p12` instead.
- `ASC_KEY_P8_BASE64` (base64 of the `.p8`) is still accepted in place of `ASC_KEY_P8`.
