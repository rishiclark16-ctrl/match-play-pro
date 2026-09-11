# MATCH Golf - iOS & Native Platform Guide

---

## 1. PLATFORM OVERVIEW

| Property | Value |
|----------|-------|
| **App Name** | MATCH |
| **Bundle ID** | dev.matchgolf.app |
| **Minimum iOS** | 15.0 |
| **Framework** | Capacitor 6 (WebView-based hybrid) |
| **Web Build Dir** | `dist/` |
| **Xcode Project** | `ios/App/App.xcworkspace` (always open this, NOT .xcodeproj) |
| **CocoaPods** | Used for native dependency management |

---

## 2. iOS PROJECT STRUCTURE

```
ios/
├── App/
│   ├── App.xcworkspace          # ← ALWAYS open this
│   ├── App.xcodeproj/           # Xcode project (don't open directly)
│   ├── App/
│   │   ├── Info.plist           # App configuration
│   │   ├── RevenueCatManager.swift   # RevenueCat SDK singleton
│   │   ├── RevenueCatPlugin.swift    # Capacitor plugin bridge
│   │   └── Assets.xcassets/
│   │       ├── AppIcon.appiconset/   # App icon (plush flag)
│   │       └── Splash.imageset/      # Splash screen images
│   ├── Podfile                  # CocoaPods dependencies
│   └── Podfile.lock
└── fastlane/                    # Fastlane deployment config (if set up)
```

---

## 3. NATIVE PLUGINS

### 3.1 Capacitor Core Plugins

| Plugin | Purpose | Configuration |
|--------|---------|---------------|
| `@capacitor/app` | App lifecycle (foreground, background, URL open) | -- |
| `@capacitor/haptics` | Haptic feedback (light, medium, heavy) | -- |
| `@capacitor/splash-screen` | Native splash screen | 0ms duration (custom animated splash used instead) |
| `@capacitor/status-bar` | Status bar styling | Overlay mode, light style, white background |
| `@capacitor/push-notifications` | Push notification registration & handling | Badge, sound, alert presentation |

### 3.2 Community Plugins

| Plugin | Purpose | Notes |
|--------|---------|-------|
| `@capacitor-community/apple-sign-in` | Native Apple Sign-In | Patched for iPad presentation (`patches/`) |
| `@capacitor-community/contacts` | Native contacts access | Used for friend discovery |
| `@capacitor-community/keep-awake` | Prevent screen sleep | Active during scoring |

### 3.3 Custom Native Plugins

#### RevenueCatPlugin (Swift)

**File:** `ios/App/App/RevenueCatPlugin.swift`

Bridges the RevenueCat iOS SDK to JavaScript via Capacitor's plugin system.

| Method | JS Call | Purpose |
|--------|---------|---------|
| `configure` | `RevenueCat.configure({ userId })` | Initialize SDK |
| `login` | `RevenueCat.login({ userId })` | Authenticate user |
| `logout` | `RevenueCat.logout()` | Clear user |
| `getCustomerInfo` | `RevenueCat.getCustomerInfo()` | Get subscription status |
| `getOfferings` | `RevenueCat.getOfferings()` | Get available plans/prices |
| `purchasePackage` | `RevenueCat.purchasePackage({ packageId })` | Initiate purchase |
| `restorePurchases` | `RevenueCat.restorePurchases()` | Restore past purchases |
| `checkProStatus` | `RevenueCat.checkProStatus()` | Quick Pro check |
| `openManagementUrl` | `RevenueCat.openManagementUrl()` | Open App Store subscription settings |

#### RevenueCatManager (Swift)

**File:** `ios/App/App/RevenueCatManager.swift`

Singleton that manages the RevenueCat SDK lifecycle.

---

## 4. NATIVE PERMISSIONS

| Permission | Info.plist Key | Usage | Required |
|-----------|---------------|-------|----------|
| Camera | `NSCameraUsageDescription` | QR code scanning | Yes (friends feature) |
| Contacts | `NSContactsUsageDescription` | Friend discovery | Optional |
| Microphone | `NSMicrophoneUsageDescription` | Voice scoring | Yes (voice feature) |
| Speech Recognition | `NSSpeechRecognitionUsageDescription` | Voice-to-text | Yes (voice feature) |
| Push Notifications | Entitlement | Round invites, updates | Optional |

---

## 5. COCOAPODS DEPENDENCIES

```ruby
# Podfile
platform :ios, '15.0'

pod 'Capacitor'
pod 'CapacitorCommunityAppleSignIn'
pod 'CapacitorCommunityContacts'
pod 'CapacitorCommunityKeepAwake'
pod 'CapacitorApp'
pod 'CapacitorHaptics'
pod 'CapacitorSplashScreen'
pod 'CapacitorStatusBar'
pod 'CapacitorPushNotifications'
pod 'RevenueCat', '~> 5.0'
```

---

## 6. CAPACITOR CONFIGURATION

From `capacitor.config.ts`:

```typescript
{
  appId: 'dev.matchgolf.app',
  appName: 'MATCH',
  webDir: 'dist',
  plugins: {
    StatusBar: {
      overlaysWebView: true,
      style: 'LIGHT',
      backgroundColor: '#FFFFFF'
    },
    SplashScreen: {
      launchShowDuration: 0,       // Disabled (custom animated splash used)
      launchAutoHide: true,
      launchFadeOutDuration: 0,
      backgroundColor: '#FFFFFF'
    },
    KeepAwake: {},
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  },
  ios: {
    contentInset: 'never',          // Edge-to-edge content
    backgroundColor: '#FFFFFF'
  }
}
```

---

## 7. APPLE SIGN-IN INTEGRATION

### Flow
1. User taps "Sign in with Apple" button
2. `@capacitor-community/apple-sign-in` presents native Apple Sign-In sheet
3. User authenticates with Face ID / Touch ID / password
4. Plugin returns ID token + user info
5. App calls `supabase.auth.signInWithIdToken({ provider: 'apple', token: idToken })`
6. Supabase creates or matches auth user
7. Profile record created/linked

### iPad Fix
- Patch applied: `patches/@capacitor-community+apple-sign-in+6.0.0.patch`
- Fixes: iPad presentation style (Apple requires fullScreen on iPad)
- Applied automatically via `patch-package` on `bun install`

---

## 8. IN-APP PURCHASES (RevenueCat)

### Products

| Product | ID | Price | Period |
|---------|-----|-------|--------|
| Monthly | `$rc_monthly` | $3.99 | 1 month |
| Annual | `$rc_annual` | $24.99 | 1 year |

### Entitlement
- **ID:** `Pro`
- **Grants:** All Pro features (unlimited friends, all games, full stats, etc.)

### API Key
- **Key:** `appl_xWFDfdKOsXHuszaTSfFxLzPiJGt`
- **Location:** Xcode build settings (`REVENUECAT_API_KEY`)
- **NOT** in source code or .env files

### Webhook
- RevenueCat sends subscription events to Supabase edge function `subscription-webhook`
- Authenticated via `REVENUECAT_WEBHOOK_AUTH` secret (set via Supabase CLI)
- Handles: renewal, cancellation, billing issue, expiration

### Purchase Flow
```
JS: purchasePackage('$rc_annual')
    ↓
Swift: RevenueCatPlugin.purchasePackage()
    ↓
RevenueCat SDK → App Store → Purchase Sheet
    ↓
Success → CustomerInfo returned
    ↓
JS: syncSubscriptionToSupabase(customerInfo)
    ↓
Edge Function: sync-subscription → updates subscriptions table
```

---

## 9. BUILD & DEPLOYMENT

### Development Build
```bash
bun install                    # Install JS dependencies
bun run build                  # Build web assets → /dist
npx cap sync ios               # Sync to Xcode project
npx cap open ios               # Open in Xcode
# Build & run from Xcode (Cmd+R)
```

### Production Build
```bash
bun run build                  # Production build with optimizations
npx cap sync ios               # Sync to Xcode
# In Xcode: Product → Archive → Distribute to App Store
```

### First-Time Setup
```bash
# After installing Xcode:
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer

# Install CocoaPods (if not already):
brew install cocoapods

# Install pods:
cd ios/App && pod install && cd ../..
```

---

## 10. APP STORE ASSETS

### App Icon
- Plush 3D golf flag design
- Chartreuse/neon yellow-green body
- 1024x1024 master asset
- Auto-generated sizes via Xcode asset catalog

### Splash Screen
- White background
- Custom animated splash screen in React (not native)
- Native splash duration set to 0ms

### Screenshots
- Generated for all required iPhone sizes
- Key screens: Home, Scorecard, Game Results, Settlement, Voice Scoring

---

## 11. ANDROID SUPPORT

While iOS is the primary platform, Android support is included:

| Property | Value |
|----------|-------|
| Platform | `@capacitor/android` 6.2.1 |
| Background color | `#FFFFFF` |
| Status | Secondary priority, basic support |

Android-specific features (Apple Sign-In) are disabled on Android.
