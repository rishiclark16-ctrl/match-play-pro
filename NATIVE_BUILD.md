# MATCH Golf - Native App Build Guide

Complete guide to building and publishing MATCH Golf to the Apple App Store and Google Play Store.

## Prerequisites

### For iOS
- **Mac computer** (required - Apple's requirement)
- **Xcode 15+** (free from Mac App Store)
- **Apple Developer Account** ($99/year) - [developer.apple.com](https://developer.apple.com)
- **iOS device or Simulator** for testing

### For Android
- **Android Studio** (free) - [developer.android.com/studio](https://developer.android.com/studio)
- **Google Play Developer Account** ($25 one-time) - [play.google.com/console](https://play.google.com/console)
- **Android device or Emulator** for testing

### General
- **Node.js 18+**
- **Git**

---

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/match-golf.git
cd match-golf
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create Environment File

Create a `.env` file in the project root:

```env
VITE_SUPABASE_PROJECT_ID="your-project-id"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
VITE_SUPABASE_URL="https://your-project.supabase.co"
```

### 4. Build the Web App

```bash
npm run build
```

### 5. Add Native Platforms

```bash
# Add iOS platform
npx cap add ios

# Add Android platform
npx cap add android

# Sync the built web app to native projects
npx cap sync
```

---

## iOS Build & Submission

### 1. Open in Xcode

```bash
npx cap open ios
```

### 2. Configure Signing

1. Select the **App** target in the project navigator
2. Go to **Signing & Capabilities** tab
3. Select your **Team** (your Apple Developer account)
4. Xcode will automatically create provisioning profiles

### 3. App Configuration

In Xcode, update the following in **Info.plist** or target settings:

| Setting | Value |
|---------|-------|
| Bundle Identifier | `dev.matchgolf.app` |
| Display Name | `MATCH Golf` |
| Version | `1.0.0` |
| Build | `1` |

### 4. Required Permissions

Add these to `ios/App/App/Info.plist` if using corresponding features:

```xml
<!-- Camera for QR scanning -->
<key>NSCameraUsageDescription</key>
<string>MATCH Golf uses the camera to scan friend QR codes</string>

<!-- Contacts for friend sync -->
<key>NSContactsUsageDescription</key>
<string>MATCH Golf can find friends from your contacts</string>

<!-- Microphone for voice commands -->
<key>NSMicrophoneUsageDescription</key>
<string>MATCH Golf uses voice commands for hands-free score entry</string>

<!-- Speech Recognition -->
<key>NSSpeechRecognitionUsageDescription</key>
<string>MATCH Golf uses speech recognition for voice score entry</string>
```

### 5. App Icons

Create icons in these sizes and add to `ios/App/App/Assets.xcassets/AppIcon.appiconset/`:

| Size | Purpose |
|------|---------|
| 20x20, 40x40, 60x60 | Notification icons |
| 29x29, 58x58, 87x87 | Settings icons |
| 40x40, 80x80, 120x120 | Spotlight icons |
| 60x60, 120x120, 180x180 | App icons |
| 1024x1024 | App Store icon |

**Tip:** Use a tool like [AppIcon.co](https://appicon.co) to generate all sizes from a single 1024x1024 image.

### 6. Launch Screen

Edit `ios/App/App/Base.lproj/LaunchScreen.storyboard` in Xcode to customize the splash screen.

### 7. Build for Release

1. Select **Product → Archive**
2. Wait for the build to complete
3. Click **Distribute App**
4. Select **App Store Connect**
5. Follow the prompts to upload

### 8. App Store Connect

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Create a new app with bundle ID `dev.matchgolf.app`
3. Fill in app details:
   - Screenshots (6.5" and 5.5" iPhone required)
   - Description, keywords, support URL
   - Age rating, privacy policy
4. Submit for review

---

## Android Build & Submission

### 1. Open in Android Studio

```bash
npx cap open android
```

### 2. App Configuration

Update `android/app/build.gradle`:

```gradle
android {
    namespace "dev.matchgolf.app"
    defaultConfig {
        applicationId "dev.matchgolf.app"
        versionCode 1
        versionName "1.0.0"
    }
}
```

### 3. Required Permissions

Already configured in `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_CONTACTS" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

### 4. App Icons

Add icons to these folders in `android/app/src/main/res/`:

| Folder | Size | DPI |
|--------|------|-----|
| `mipmap-mdpi` | 48x48 | 160 |
| `mipmap-hdpi` | 72x72 | 240 |
| `mipmap-xhdpi` | 96x96 | 320 |
| `mipmap-xxhdpi` | 144x144 | 480 |
| `mipmap-xxxhdpi` | 192x192 | 640 |

Also add `ic_launcher_round.png` for Android 7.1+ circular icons.

**Tip:** Use Android Studio's **Image Asset Studio** (right-click res → New → Image Asset).

### 5. Splash Screen

Add splash image to `android/app/src/main/res/drawable/splash.png`

### 6. Generate Signed APK/Bundle

1. In Android Studio: **Build → Generate Signed Bundle / APK**
2. Select **Android App Bundle** (recommended for Play Store)
3. Create or use existing keystore
4. Build the release bundle

**⚠️ IMPORTANT:** Keep your keystore file safe! You need the same keystore for all future updates.

### 7. Google Play Console

1. Go to [play.google.com/console](https://play.google.com/console)
2. Create a new application
3. Fill in store listing:
   - Title, description
   - Screenshots (phone and tablet)
   - Feature graphic (1024x500)
   - Privacy policy URL
4. Upload your `.aab` file
5. Complete content rating questionnaire
6. Submit for review

---

## Development Workflow

### After Making Code Changes

```bash
# Build the web app
npm run build

# Sync to native platforms
npx cap sync

# Run on device/simulator
npx cap run ios
# or
npx cap run android
```

### Live Reload During Development

For faster iteration, you can use live reload. Temporarily update `capacitor.config.ts`:

```typescript
server: {
  url: 'http://YOUR_LOCAL_IP:8080',
  cleartext: true
}
```

Then run:

```bash
npm run dev -- --host
npx cap run ios --livereload --external
```

**Remember to remove the server config before building for production!**

---

## Troubleshooting

### iOS Issues

**"No signing certificate"**
- Ensure you're logged into your Apple Developer account in Xcode
- Go to Xcode → Settings → Accounts → Download Manual Profiles

**Build fails with "Module not found"**
```bash
npx cap sync ios
cd ios && pod install && cd ..
```

### Android Issues

**"SDK location not found"**
- Create `android/local.properties` with:
  ```
  sdk.dir=/Users/YOUR_USERNAME/Library/Android/sdk
  ```

**Gradle build fails**
```bash
cd android && ./gradlew clean && cd ..
npx cap sync android
```

### General Issues

**White screen on app launch**
- Check that `npm run build` completed successfully
- Verify `dist/` folder exists with built files
- Run `npx cap sync` again

**Styles missing**
- Ensure Tailwind CSS is processing correctly
- Check browser console for CSS loading errors

---

## App Store Optimization Tips

### iOS
- Use all 100 characters for the title
- Fill all keyword fields (100 characters)
- Create compelling screenshots with captions
- Respond to reviews promptly

### Android
- Use the full 50-character title
- Write a detailed 4000-character description
- Create a 30-second promo video
- Encourage reviews from happy users

---

## Updating Your App

1. Increment version numbers:
   - iOS: Version and Build in Xcode
   - Android: `versionCode` and `versionName` in `build.gradle`
2. Build and sync: `npm run build && npx cap sync`
3. Create new archive/bundle
4. Submit for review with "What's New" notes

---

## Support

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Apple Developer Documentation](https://developer.apple.com/documentation)
- [Android Developer Documentation](https://developer.android.com/docs)
- [Lovable Native Mobile Guide](https://docs.lovable.dev/tips-tricks/native-mobile-apps)
