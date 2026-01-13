# MATCH Golf - Deep Linking Guide

This guide covers setting up deep links for MATCH Golf on iOS and Android.

## Supported Deep Links

### Custom URL Scheme (`matchgolf://`)
Works when app is installed on device:

| URL | Action |
|-----|--------|
| `matchgolf://` | Opens app to home |
| `matchgolf://round/ABC123` | Opens round with ID |
| `matchgolf://join/ABC123` | Joins round with code |
| `matchgolf://profile` | Opens profile |
| `matchgolf://friends` | Opens friends list |
| `matchgolf://groups` | Opens groups |
| `matchgolf://stats` | Opens statistics |
| `matchgolf://new-round` | Starts new round |

### Universal Links (`https://matchgolf.app/`)
Works on web and opens app if installed:

| URL | Action |
|-----|--------|
| `https://matchgolf.app/round/ABC123` | Opens/joins round |
| `https://matchgolf.app/join?code=ABC123` | Joins round with code |

---

## iOS Setup

### 1. Configure URL Scheme

In Xcode, select your app target and go to **Info** tab:

1. Expand **URL Types**
2. Click **+** to add a new URL type
3. Set **Identifier**: `dev.matchgolf.app`
4. Set **URL Schemes**: `matchgolf`
5. Set **Role**: Editor

Or add to `ios/App/App/Info.plist`:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>dev.matchgolf.app</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>matchgolf</string>
    </array>
  </dict>
</array>
```

### 2. Configure Universal Links (Associated Domains)

1. In Xcode, select app target → **Signing & Capabilities**
2. Click **+ Capability** → Add **Associated Domains**
3. Add: `applinks:matchgolf.app`
4. Add: `webcredentials:matchgolf.app`

Or add to your entitlements file:

```xml
<key>com.apple.developer.associated-domains</key>
<array>
  <string>applinks:matchgolf.app</string>
  <string>webcredentials:matchgolf.app</string>
</array>
```

### 3. Host Apple App Site Association

The file `public/.well-known/apple-app-site-association` must be hosted at:
`https://matchgolf.app/.well-known/apple-app-site-association`

**Important**: Update `TEAM_ID` with your actual Apple Developer Team ID.

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.dev.matchgolf.app",
        "paths": ["/round/*", "/join/*", "/join"]
      }
    ]
  }
}
```

---

## Android Setup

### 1. Configure URL Scheme

Add to `android/app/src/main/AndroidManifest.xml` inside the `<activity>` tag:

```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="matchgolf" />
</intent-filter>
```

### 2. Configure App Links (Universal Links equivalent)

Add another intent filter for HTTPS links:

```xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data 
    android:scheme="https"
    android:host="matchgolf.app"
    android:pathPattern="/round/.*" />
  <data 
    android:scheme="https"
    android:host="matchgolf.app"
    android:pathPattern="/join/.*" />
</intent-filter>
```

### 3. Host Asset Links File

The file `public/.well-known/assetlinks.json` must be hosted at:
`https://matchgolf.app/.well-known/assetlinks.json`

**Important**: Replace `SHA256_FINGERPRINT_HERE` with your app's signing certificate fingerprint.

To get your fingerprint:
```bash
keytool -list -v -keystore your-keystore.jks -alias your-alias
```

---

## Testing Deep Links

### iOS Simulator
```bash
xcrun simctl openurl booted "matchgolf://round/ABC123"
```

### Android Emulator
```bash
adb shell am start -a android.intent.action.VIEW -d "matchgolf://round/ABC123"
```

### Physical Device
- Create a note/message with the link and tap it
- Use Safari/Chrome to type the custom URL scheme

---

## Using Deep Links in Code

### Generate Share Links

```typescript
import { generateDeepLink } from '@/hooks/useDeepLinks';

// For sharing round join links
const shareLink = generateDeepLink('join', roundJoinCode);
// Returns: https://matchgolf.app/join/ABC123

// For app-only links (when you know app is installed)
const appLink = generateDeepLink('round', roundId, { preferUniversal: false });
// Returns: matchgolf://round/uuid-here
```

---

## Troubleshooting

### iOS Universal Links Not Working
1. Verify AASA file is served with `Content-Type: application/json`
2. Check Apple's CDN has cached your file: `https://app-site-association.cdn-apple.com/a/v1/matchgolf.app`
3. Ensure Associated Domains capability is enabled
4. Try deleting and reinstalling the app

### Android App Links Not Working
1. Verify assetlinks.json is accessible at correct URL
2. Check SHA256 fingerprint matches your signing key
3. Use `adb shell am start` to test intent filters
4. Check logcat for verification errors

### Deep Link Not Navigating
1. Check browser console for `[DeepLink]` logs
2. Ensure the route exists in your app
3. Verify user is authenticated (most routes require auth)
