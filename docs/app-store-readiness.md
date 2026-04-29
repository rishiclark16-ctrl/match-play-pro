# MATCH Golf — App Store Submission Readiness Audit

**Audit date:** 2026-04-27
**Auditor:** C3 (App Store Metadata Auditor)
**Build under audit:**
- Bundle ID: `dev.matchgolf.app`
- `MARKETING_VERSION` (CFBundleShortVersionString): `2.2`
- `CFBundleVersion`: `3`
- Min iOS: `15.0`
- `TARGETED_DEVICE_FAMILY`: `1,2` (iPhone **and** iPad — Universal)
- `aps-environment`: `production` (push enabled)
- Apple Sign-In entitlement: present
- Associated domains: `applinks:matchgolf.dev`, `webcredentials:matchgolf.dev`

**Submission readiness score: 6.5 / 10**

The app has a solid technical foundation (full icon set, proper privacy nutrition manifest, sane permission strings), but several **HIGH-severity gaps** will block or trigger rejection from App Review:

1. The launch screen storyboard is the empty Capacitor stub (white screen, no logo).
2. Universal app (iPad supported) without 11"/12.9" iPad Pro screenshots that match Apple's *current* required dimensions.
3. The Splash imageset duplicates the same 2732 file across @1x/@2x/@3x slots — Xcode will warn at build time and the splash will not render correctly on smaller devices.
4. `LSRequiresIPhoneOS` + iPad-only orientation key is contradictory; `UIRequiredDeviceCapabilities` lists deprecated `armv7`.
5. PostHog is integrated (per `MEMORY.md`) but the **PrivacyInfo.xcprivacy** does not declare any analytics-related collected data type, and PostHog is not listed in the App Store Connect data-collection questionnaire prep.

The single highest-risk rejection vector is the **default Capacitor launch storyboard** (Section 3 below) — Apple Review consistently rejects apps whose launch screen is the blank white default per Guideline 2.3.7 ("Accurate Metadata") and 4.0 ("Design").

---

## 1. Permissions Audit (`ios/App/App/Info.plist`)

| Key | Current Value | Recommended Value | Severity |
|-----|---------------|-------------------|----------|
| `NSCameraUsageDescription` | "MATCH Golf needs camera access to scan QR codes for joining rounds" | OK — clear, names the app, single specific purpose | **OK** |
| `NSMicrophoneUsageDescription` | "MATCH Golf uses your microphone for voice-activated score entry" | OK — clear, names the app, single specific purpose | **OK** |
| `NSContactsUsageDescription` | "MATCH Golf checks your contacts' email addresses and phone numbers against our server to find friends who already use the app. Contact data is not stored on our servers." | OK — explicitly addresses the Apple-questioned "what happens to the data" concern | **OK** |
| `NSPhotoLibraryUsageDescription` | "MATCH Golf needs photo access to set your profile picture" | OK — focused, single use case | **OK** |
| `NSSpeechRecognitionUsageDescription` | "MATCH Golf uses speech recognition for voice-activated score entry" | OK — names the app, names the feature | **OK** |
| `NSPhotoLibraryAddUsageDescription` | **MISSING** | Add: "MATCH Golf saves your shareable round-result image to your photo library so you can post it later." (only required if `RoundComplete.tsx` writes to Photos via the share sheet "Save Image" flow) | **LOW** — only required if save-to-photos is offered |
| `NSUserTrackingUsageDescription` | **MISSING** | Not required (app does not use IDFA / cross-app tracking; `NSPrivacyTracking=false` in PrivacyInfo). Confirm RevenueCat SDK does not opt into ATT. | **OK (verify)** |
| `NSFaceIDUsageDescription` | **MISSING** | Not required (Apple Sign-In handles biometrics natively via the system flow). | **OK** |
| `ITSAppUsesNonExemptEncryption` | **MISSING** | Add `<key>ITSAppUsesNonExemptEncryption</key><false/>` (the app uses only Apple-provided HTTPS/TLS through the WebView and standard Supabase/RevenueCat SDKs; this exempts you from filing yearly export-compliance docs). | **HIGH** — without this you must answer the Export Compliance question on every TestFlight upload, and the build will be **stuck in "Waiting for Review"** on App Store Connect until you do. |
| `LSApplicationQueriesSchemes` | **MISSING** | Add if the app calls `mailto:`, `sms:`, `tel:`, or Venmo/PayPal deep-links (it does — see `RoundComplete.tsx` share flow + `paypal_email`/`venmo_username` in `profiles`). Required schemes: `mailto`, `sms`, `tel`, `venmo`, `paypal`. Without these, `canOpenURL:` returns false on iOS 9+. | **MED** |

### Other Info.plist hygiene flags

| Issue | Detail | Severity |
|-------|--------|----------|
| `UIRequiredDeviceCapabilities = ["armv7"]` | `armv7` is deprecated since iOS 11 (all supported devices are arm64). Should be `["arm64"]` or removed entirely. App Store may surface a warning. | **MED** |
| `LSRequiresIPhoneOS = true` *combined with* iPad-specific orientation array | `LSRequiresIPhoneOS` is honored for iPad too — fine for a Universal app. But if you intend to ship iPad as a first-class experience, also set `UIRequiresFullScreen=false` and verify multitasking works. | **LOW** |
| `RevenueCatAPIKey` Info.plist key | OK to keep (it's read from Xcode build settings, not source). Verify the production scheme actually substitutes the prod key, not a sandbox one. | **OK (verify)** |
| Bundle display name `"MATCH Golf"` | OK. Make sure App Store Connect "App Name" matches (must be ≤30 chars). | **OK** |

---

## 2. App Icon Audit (`Assets.xcassets/AppIcon.appiconset/`)

All 13 required PNGs are present. The `Contents.json` references all standard slots correctly.

| Required Size | Idiom | Scale | Filename | Present? |
|---------------|-------|-------|----------|----------|
| 1024×1024 | ios-marketing | 1x | `AppIcon-1024.png` | YES |
| 60×60 (180×180) | iphone | 3x | `AppIcon-180.png` | YES |
| 60×60 (120×120) | iphone | 2x | `AppIcon-120.png` | YES |
| 40×40 (120×120) | iphone | 3x | `AppIcon-120.png` (shared) | YES |
| 40×40 (80×80) | iphone | 2x | `AppIcon-80.png` | YES |
| 29×29 (87×87) | iphone | 3x | `AppIcon-87.png` | YES |
| 29×29 (58×58) | iphone | 2x | `AppIcon-58.png` | YES |
| 20×20 (60×60) | iphone | 3x | `AppIcon-60.png` | YES |
| 20×20 (40×40) | iphone | 2x | `AppIcon-40.png` | YES |
| 83.5×83.5 (167×167) | ipad | 2x | `AppIcon-167.png` | YES |
| 76×76 (152×152) | ipad | 2x | `AppIcon-152.png` | YES |
| 76×76 (76×76) | ipad | 1x | `AppIcon-76.png` | YES |
| 40×40 (80×80) | ipad | 2x | `AppIcon-80.png` (shared) | YES |
| 40×40 (40×40) | ipad | 1x | `AppIcon-40.png` (shared) | YES |
| 29×29 (58×58) | ipad | 2x | `AppIcon-58.png` (shared) | YES |
| 29×29 (29×29) | ipad | 1x | `AppIcon-29.png` | YES |
| 20×20 (40×40) | ipad | 2x | `AppIcon-40.png` (shared) | YES |
| 20×20 (20×20) | ipad | 1x | `AppIcon-20.png` | YES |

| Issue | Severity |
|-------|----------|
| 1024×1024 marketing icon present at `AppIcon-1024.png`, dimensions verified (file confirms 1024×1024). | **OK** |
| **No alpha channel check performed.** App Store Connect rejects 1024×1024 marketing icons with a transparent alpha channel ("non-transparent PNG required"). Manually verify the file is a flat PNG before upload. | **HIGH (verify)** |
| **No iOS 18 dark / tinted icon variants.** As of iOS 18, App Store Connect accepts (but does not require) Dark and Tinted icon variants in the asset catalog. Without them, the system auto-tints, which often looks poor on neon-yellow logos. Add a `dark` and `tinted` slot to `Contents.json` and ship `AppIcon-1024-dark.png` / `AppIcon-1024-tinted.png`. | **LOW (polish)** |

---

## 3. Launch Screen Audit (`Base.lproj/LaunchScreen.storyboard` + `Assets.xcassets/Splash.imageset/`)

### LaunchScreen.storyboard
- **Status: DEFAULT CAPACITOR STUB.** The storyboard contains a single white `UIView` with **no image, no label, no logo**. Capacitor configures this to instantly transition to the WebView, but App Review reviewers see a blank white flash.
- App Review Guideline 4.0 (Design) and the "Launch Screen" Human Interface Guidelines call out that the launch screen should resemble the first screen of the app to avoid the perception of a slow load / broken app.

| Issue | Severity |
|-------|----------|
| Launch storyboard is the empty Capacitor template (white view, no MATCH branding) | **HIGH** — common rejection vector for Capacitor/Cordova/Ionic apps. Add a centered logo `UIImageView` referencing the AppIcon or a dedicated launch asset. |
| `<device id="retina4_7">` (iPhone 8 / SE) targeted in the storyboard | Cosmetic — autolayout still works, but should target `retina6_1` or be device-agnostic. | **LOW** |

### Splash.imageset
- Contains 5 PNGs but only 3 are referenced by `Contents.json` (`splash-2732x2732.png`, `splash-2732x2732-1.png`, `splash-2732x2732-2.png`).
- All three referenced files are **the same 2732×2732 image** (`splash-screen-2732.png` and `splash-screen.png` are duplicates of the same content).
- This means @1x is loading a 2732×2732 image where Xcode expects ~512×512. Xcode will emit `Ambiguous image scale factor` warnings and the splash will be downsampled at runtime (CPU/memory waste; on iPhone SE this is a 30 MB decode).

| Issue | Severity |
|-------|----------|
| `Splash.imageset/Contents.json` maps the same 2732×2732 file to all three @1x/@2x/@3x slots | **MED** — Xcode warning + runtime downsampling cost. Either (a) provide actual @1x/@2x/@3x sized assets (912/1822/2732), or (b) remove the universal entry and use a single `iPad`-specific entry plus separate iPhone entry, or (c) since `launchShowDuration: 0` is set in `capacitor.config.ts`, simply replace the splash imageset with a 1×1 transparent PNG and rely on the storyboard. |

---

## 4. Marketing Screenshots

App Store Connect requires screenshots for **at least one** size per device family the app targets. Minimum required device families since Q1 2024:

| Device Family | Required Resolution(s) | Min Screenshots |
|---------------|------------------------|-----------------|
| iPhone 6.7" / 6.9" Display (iPhone 16 Pro Max, 15 Pro Max, 14 Pro Max) | **1290 × 2796** OR **1320 × 2868** | 3 minimum, 10 max |
| iPhone 6.5" Display (iPhone 11 Pro Max — legacy) | 1242 × 2688 OR 1284 × 2778 | optional fallback if 6.7" provided |
| iPad 12.9" / 13" Display (iPad Pro 6th gen / M4) | **2048 × 2732** OR **2064 × 2752** | 3 minimum (because TARGETED_DEVICE_FAMILY = 1,2) |

### Inventory: `screenshots/app-store/` (iPhone)

12 PNGs at **1284 × 2778** (iPhone 6.5" / 13 Pro Max generation):
1. `01-home-rounds.png`
2. `02-scorecard-scoring.png`
3. `03-live-money-tracker.png`
4. `03-player-cards.png`
5. `04-game-sections.png`
6. `05-leaderboard.png`
7. `06-round-complete.png`
8. `07-ai-game-builder.png`
9. `08-new-round.png`
10. `08-social.png`
11. `09-stats.png`
12. `10-profile.png`

### Inventory: `screenshots/app-store-ipad/` (iPad)

10 PNGs at **2048 × 2732** (iPad Pro 12.9"):
1-10 (same naming, minus `03-live-money-tracker.png` and `08-new-round.png`)

### Gaps

| Required | Provided | Severity |
|----------|----------|----------|
| iPhone 6.7" / 6.9" (1290×2796) — **mandatory since 2024** | Closest is 1284×2778. Apple **will accept** 1284×2778 for the 6.5"/6.7" combined slot in App Store Connect today, but the new 6.9" slot for iPhone 16 Pro Max prefers 1320×2868. | **MED** — works for now, will become **HIGH** once Apple deprecates the 6.5" slot (expected late 2026). Plan to re-render at 1290×2796 minimum. |
| iPad 12.9" (2048×2732) | YES — 10 shots | **OK** |
| iPad 13" / M4 (2064×2752) | None — but Apple still accepts 2048×2732 for the 13" slot. | **OK** |
| Apple Watch screenshots | N/A — app does not target watchOS | **OK** |
| Mac (Catalyst) screenshots | N/A — app does not target Mac Catalyst | **OK** |
| Localized screenshots | None (English only) | **LOW** — only required if you list additional storefront languages. App is currently English-only (`CFBundleDevelopmentRegion=en`). |
| App Preview videos (15-30s mp4) | None | **LOW (polish)** — significantly improves conversion rate but not required. |

---

## 5. PWA Manifest (`vite.config.ts` — `VitePWA` block)

| Item | Status | Severity |
|------|--------|----------|
| `name` = "MATCH" | OK | OK |
| `short_name` = "MATCH" | OK | OK |
| `description` mentions Skins, Nassau, Match Play | OK | OK |
| `theme_color` / `background_color` = `#0A2F23` (brand dark green) | OK | OK |
| Icons array: `/favicon-512.png` (512×512, purpose any+maskable) | File present at `public/favicon-512.png` | **OK** |
| **No 192×192 icon in manifest icons array** despite `public/favicon-192.png` existing | Lighthouse PWA audit will warn ("manifest does not have icon ≥ 192px"). Add it. | **LOW** |
| **No `apple-touch-icon` link tag in `index.html`** | Should add `<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">` for users who add the PWA to iOS home screen. | **LOW** |

This entire section is irrelevant for App Review (PWA manifest is a web-only concern), but it affects user perception when sharing `matchgolf.dev` links.

---

## 6. Privacy Nutrition Labels

The repo includes `ios/App/App/PrivacyInfo.xcprivacy` declaring **7 collected data types** (all Linked, all NotTracking, all AppFunctionality):

1. `NSPrivacyCollectedDataTypeEmailAddress`
2. `NSPrivacyCollectedDataTypeName`
3. `NSPrivacyCollectedDataTypeUserID`
4. `NSPrivacyCollectedDataTypeGameplayContent`
5. `NSPrivacyCollectedDataTypePhoneNumber`
6. `NSPrivacyCollectedDataTypePhotosOrVideos`
7. `NSPrivacyCollectedDataTypeCrashData` (NotLinked — this is for Sentry)

Plus 3 accessed APIs declared (UserDefaults, FileTimestamp, DiskSpace) with reason codes.

### Cross-reference with `src/integrations/supabase/types.ts` `profiles` table

The `profiles` table contains: `email`, `paypal_email`, `phone`, `handicap`, `handicap_mode`, `guest_handicap`, `avatar_url`, `venmo_username`, `push_token`. Plus auto-derived `display_name` etc.

| Data the app actually collects | Mapped to xcprivacy entry | Mapped to App Store Connect category | Severity |
|--------------------------------|---------------------------|--------------------------------------|----------|
| Email (auth) | `EmailAddress` ✓ | Contact Info → Email | **OK** |
| Display name | `Name` ✓ | Contact Info → Name | **OK** |
| Profile photo | `PhotosOrVideos` ✓ | User Content → Photos or Videos | **OK** |
| Phone number (profile field) | `PhoneNumber` ✓ | Contact Info → Phone Number | **OK** |
| Supabase user UUID | `UserID` ✓ | Identifiers → User ID | **OK** |
| Golf scores, rounds, friends | `GameplayContent` ✓ | User Content → Gameplay Content | **OK** |
| Sentry crash logs | `CrashData` ✓ (NotLinked) | Diagnostics → Crash Data | **OK** |
| **PostHog product analytics** (per `MEMORY.md` — project ID 383605, integrated 2026-04-15) | **NOT DECLARED** | Should be: Usage Data → Product Interaction (Linked, NotTracking) + possibly Performance Data | **HIGH** — material misrepresentation in the privacy manifest is a Section 5.1.1 violation. |
| **PostHog session-replay (if enabled)** | **NOT DECLARED** | Diagnostics → Other Diagnostic Data + Usage Data → Other Usage Data | **HIGH (only if session-replay is on)** — verify in PostHog project settings. |
| Venmo username, PayPal email (for settlement export) | **Maybe should be `OtherFinancialInfo`** (these are *handles*, not transaction info) | Most conservative declaration: Contact Info → Other Contact Info, NotLinked, NotTracking, AppFunctionality | **MED** |
| Handicap index, handicap mode | Could fall under `NSPrivacyCollectedDataTypeOtherUserContent` or `Sensitive Info` (athletic data?) — Apple does not list "athletic ability" specifically | Conservative: User Content → Other User Content | **LOW** |
| Push token | Should declare `NSPrivacyCollectedDataTypeDeviceID` (Linked, NotTracking, AppFunctionality) — APNs device tokens are device identifiers | **NOT DECLARED** | **MED** |
| RevenueCat purchase history | RevenueCat's own SDK ships its own `PrivacyInfo.xcprivacy` (see Pods bundle) — verify it's bundled. | Purchases → Purchase History (auto-declared by SDK if you list it in App Store Connect) | **MED — must be declared in App Store Connect questionnaire** |

### App Store Connect Privacy Questionnaire — Recommended Answers

```
Data Used to Track You: NONE
NSPrivacyTracking = false (already set)

Data Linked to You:
  Contact Info → Email Address — App Functionality
  Contact Info → Name — App Functionality
  Contact Info → Phone Number — App Functionality
  Contact Info → Other Contact Info (Venmo, PayPal handles) — App Functionality
  User Content → Photos or Videos — App Functionality
  User Content → Gameplay Content — App Functionality
  User Content → Other User Content (handicap) — App Functionality
  Identifiers → User ID — App Functionality
  Identifiers → Device ID (push token) — App Functionality
  Purchases → Purchase History — App Functionality (RevenueCat)
  Usage Data → Product Interaction — Analytics (PostHog)  ← MUST ADD
  Diagnostics → Crash Data — App Functionality (Sentry)
  Diagnostics → Performance Data — App Functionality (Sentry, PostHog)

Data Not Linked to You:
  (Sentry crash data is technically linked since user.id is set;
   move to "Linked" + Diagnostics or strip user id from Sentry init)
```

---

## 7. App Store Connect Pre-Submission Checklist

Copy-paste and verify each item before pressing "Submit for Review":

- [ ] **App Name** in App Store Connect ≤ 30 characters and matches `CFBundleDisplayName` ("MATCH Golf").
- [ ] **Subtitle** ≤ 30 characters; consider "Live golf scoring & bets".
- [ ] **Promotional text** (170 chars) — updates without resubmit; optional but recommended.
- [ ] **Description** drafted (4000 chars max) — covers Skins, Nassau, Match Play, Wolf, Vegas, Stableford, voice scoring, real-time multiplayer, settlements, handicaps.
- [ ] **Keywords** comma-separated, 100 chars total — e.g., `golf,scorecard,nassau,skins,handicap,scoring,bets,match play,wolf,stableford`.
- [ ] **Support URL** points to a *live* page (`https://matchgolf.dev/support` or wherever Support routes resolve in production — currently `/support` exists in-app).
- [ ] **Marketing URL** (optional) — leave blank per `MEMORY.md` feedback ("No matchgolf.website URL in marketing").
- [ ] **Privacy Policy URL** points to a publicly accessible page (NOT behind auth). Verify `https://matchgolf.dev/privacy-policy` returns the policy without login. (Recall: `/privacy-policy` is listed as a public route in `App.tsx` per `CLAUDE.md`.)
- [ ] **Age Rating** questionnaire completed. Recommend **17+** because (a) the app facilitates real-money betting tracking between users (Apple guideline 1.4.3 / 5.3.4 — "encouraging gambling"), even though no money changes hands in-app. Disclose: "Frequent/Intense Simulated Gambling" = NO, "Infrequent/Mild Simulated Gambling" = YES, "Contests" = YES.
- [ ] **Content Rights** — confirm you have rights to all imagery (your own logos, brand assets confirmed in `brand/`).
- [ ] **Export Compliance** — answer "Does your app use encryption?" YES (HTTPS via TLS), then "Does your app qualify for any of the exemptions provided in Category 5, Part 2 of the U.S. Export Administration Regulations?" YES (encryption is purely for authentication/HTTPS = exempt). Set `ITSAppUsesNonExemptEncryption=false` in Info.plist to avoid this prompt every TestFlight upload.
- [ ] **In-App Purchases** — Pro Monthly ($3.99) and Pro Annual ($24.99) exist in App Store Connect and are submitted *with the app version*, not separately.
- [ ] **Subscription Group** named (e.g., "MATCH Pro"); both products in the same group; localized title/description for each.
- [ ] **Subscription metadata** for paywall — required since iOS 16: each subscription needs a localized "Description" (≤ 100 chars) per locale.
- [ ] **App Privacy** answered (see Section 6 above) — and don't forget PostHog.
- [ ] **TestFlight build** uploaded and tested by at least one external tester for at least 24 hours.
- [ ] **Sign-in for review** — provide the reviewer test credentials (email + password) in the App Review notes. Apple cannot use Apple Sign-In with the reviewer Apple ID. **Critical.**
- [ ] **Demo round** — pre-create a round on the test account with several scored holes so the reviewer can see the scorecard, leaderboard, and settlement screens without having to play 18 holes.
- [ ] **App Review notes** — explain (a) the betting games are *score-tracking only*, no real money is exchanged through the app; (b) Venmo/PayPal handles are user-entered text fields, not payment integrations; (c) push notifications are for game invites and score updates.
- [ ] **Build certificate** — Distribution certificate not expired; provisioning profile includes Apple Sign-In capability and push entitlements.
- [ ] **Screenshots uploaded** for each required device size (Section 4) — verify no status bar dummy text, no debug overlays, no "Lorem Ipsum".
- [ ] **App Icon (1024×1024)** uploaded — flat PNG, **no alpha channel**, no rounded corners (Apple applies the mask automatically).

---

## 8. Severity Summary (Gap Ranking)

### HIGH (will trigger rejection or block submission)
1. **`ITSAppUsesNonExemptEncryption` missing** from Info.plist → TestFlight builds stuck pending export-compliance answer.
2. **Default Capacitor LaunchScreen.storyboard** (blank white view) → common rejection under Guideline 2.3.7 / 4.0.
3. **PrivacyInfo.xcprivacy missing PostHog data declarations** → material privacy-manifest misrepresentation (Guideline 5.1.1).
4. **1024×1024 marketing icon alpha-channel** must be verified flat before upload — auto-rejected by ASC if it has alpha.

### MED (will get questioned during review or cause warnings)
5. iPad screenshots present at legacy 2048×2732 only; no 13"-class assets at 2064×2752 (currently accepted, future risk).
6. iPhone screenshots are at 1284×2778 (6.5") not 1290×2796 (6.7"/6.9") — works today, plan to re-render.
7. `Splash.imageset` references same 2732 file for @1x/@2x/@3x → Xcode warnings + runtime downsampling.
8. `UIRequiredDeviceCapabilities = ["armv7"]` is deprecated.
9. `LSApplicationQueriesSchemes` missing for `mailto`, `sms`, `tel`, `venmo`, `paypal` → share/payout deep links may silently fail to detect installed apps.
10. RevenueCat purchase-history not yet enumerated in the App Store Connect privacy questionnaire prep.
11. Push token (APNs device ID) not declared in xcprivacy as `NSPrivacyCollectedDataTypeDeviceID`.
12. Venmo / PayPal handle fields not declared in xcprivacy.

### LOW (polish, will not block)
13. No iOS 18 dark/tinted app-icon variants.
14. No `apple-touch-icon` link tag in `index.html` (PWA install on iOS).
15. Manifest only references 512px icon, not the existing 192px asset.
16. `LaunchScreen.storyboard` device id targets retina4_7.
17. No App Preview video (mp4) — conversion rate optimization only.
18. No `NSPhotoLibraryAddUsageDescription` (only required if you ever call `PHPhotoLibrary.shared().performChanges` from JS or native bridge — **verify** the round-result share sheet does not include "Save Image" as an action; if it does, this becomes HIGH).
19. Sentry user-ID mapping makes crash data technically Linked, not NotLinked as currently declared.

---

## 9. Top 5 Must-Fix (in order)

1. **Add `ITSAppUsesNonExemptEncryption=false` to Info.plist.** One line, unblocks every TestFlight upload.
2. **Replace LaunchScreen.storyboard** with a real branded launch screen (centered logo on `#0A2F23` background per the PWA manifest). Asset already exists at `brand/logo-icon-512.png`.
3. **Update PrivacyInfo.xcprivacy** to declare PostHog product-interaction analytics (Linked, NotTracking, Analytics purpose), the APNs push token (DeviceID), and Venmo/PayPal handles (OtherUserContact). Verify Sentry user-ID linkage and either strip the user ID or reclassify CrashData as Linked.
4. **Verify the 1024×1024 marketing icon has no alpha channel** before upload to App Store Connect (`sips -g hasAlpha brand/app-brand-icons/AppIcon-1024.png`).
5. **Re-render iPhone screenshots at 1290×2796** for the 6.7"/6.9" slot in App Store Connect. Existing 1284×2778 set still works as a fallback today but plan ahead.

---

## 10. Out-of-Scope Items Surfaced for Future Work

- Localization — currently English-only. App Store Connect supports 40+ storefronts; each one shown today displays English copy.
- Mac Catalyst / iPad multitasking — `UISupportedInterfaceOrientations~ipad` includes all four orientations but the app is portrait-locked on iPhone, which may produce a janky split-view experience on iPad.
- Apple Watch companion — none planned.
- App Clips — possible "Join round via QR" use case worth exploring post-launch.
