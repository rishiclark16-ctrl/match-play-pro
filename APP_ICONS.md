# MATCH Golf - App Icon Assets Guide

Your master app icon is located at: `src/assets/app-icon-1024.png`

## Generating All Sizes

Use one of these tools to automatically generate all required sizes from the 1024x1024 master:

### Option 1: AppIcon.co (Recommended - Free)
1. Go to [appicon.co](https://appicon.co)
2. Upload `src/assets/app-icon-1024.png`
3. Select both iPhone and Android
4. Download the generated ZIP file
5. Copy assets to the appropriate folders below

### Option 2: Android Studio Image Asset Studio
1. Open `npx cap open android`
2. Right-click `res` folder → New → Image Asset
3. Select "Launcher Icons (Adaptive and Legacy)"
4. Upload the master icon
5. Android Studio generates all sizes automatically

### Option 3: Xcode Asset Catalog
1. Open `npx cap open ios`
2. Navigate to App → Assets → AppIcon
3. Drag the 1024x1024 icon to the "App Store iOS" slot
4. Use "Editor → Fill with One Size" or manually add each size

---

## iOS Required Sizes

Copy to: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

| Filename | Size | Scale | Purpose |
|----------|------|-------|---------|
| `AppIcon-20@2x.png` | 40×40 | 2x | Notification (iPhone) |
| `AppIcon-20@3x.png` | 60×60 | 3x | Notification (iPhone) |
| `AppIcon-29@2x.png` | 58×58 | 2x | Settings (iPhone) |
| `AppIcon-29@3x.png` | 87×87 | 3x | Settings (iPhone) |
| `AppIcon-40@2x.png` | 80×80 | 2x | Spotlight (iPhone) |
| `AppIcon-40@3x.png` | 120×120 | 3x | Spotlight (iPhone) |
| `AppIcon-60@2x.png` | 120×120 | 2x | App (iPhone) |
| `AppIcon-60@3x.png` | 180×180 | 3x | App (iPhone) |
| `AppIcon-1024.png` | 1024×1024 | 1x | App Store |

### iPad (if supporting iPad)
| Filename | Size | Scale | Purpose |
|----------|------|-------|---------|
| `AppIcon-20.png` | 20×20 | 1x | Notification |
| `AppIcon-20@2x.png` | 40×40 | 2x | Notification |
| `AppIcon-29.png` | 29×29 | 1x | Settings |
| `AppIcon-29@2x.png` | 58×58 | 2x | Settings |
| `AppIcon-40.png` | 40×40 | 1x | Spotlight |
| `AppIcon-40@2x.png` | 80×80 | 2x | Spotlight |
| `AppIcon-76.png` | 76×76 | 1x | App |
| `AppIcon-76@2x.png` | 152×152 | 2x | App |
| `AppIcon-83.5@2x.png` | 167×167 | 2x | App (iPad Pro) |

---

## Android Required Sizes

Copy to: `android/app/src/main/res/`

### Standard Icons (mipmap folders)
| Folder | Size | Density |
|--------|------|---------|
| `mipmap-mdpi/ic_launcher.png` | 48×48 | 160dpi |
| `mipmap-hdpi/ic_launcher.png` | 72×72 | 240dpi |
| `mipmap-xhdpi/ic_launcher.png` | 96×96 | 320dpi |
| `mipmap-xxhdpi/ic_launcher.png` | 144×144 | 480dpi |
| `mipmap-xxxhdpi/ic_launcher.png` | 192×192 | 640dpi |

### Round Icons (Android 7.1+)
| Folder | Size |
|--------|------|
| `mipmap-mdpi/ic_launcher_round.png` | 48×48 |
| `mipmap-hdpi/ic_launcher_round.png` | 72×72 |
| `mipmap-xhdpi/ic_launcher_round.png` | 96×96 |
| `mipmap-xxhdpi/ic_launcher_round.png` | 144×144 |
| `mipmap-xxxhdpi/ic_launcher_round.png` | 192×192 |

### Play Store Icon
| File | Size | Purpose |
|------|------|---------|
| `playstore-icon.png` | 512×512 | Google Play Store listing |

---

## Web Favicons

Already included in your project. Copy to `public/` folder:

| File | Size | Purpose |
|------|------|---------|
| `favicon.ico` | 32×32 | Browser tab icon |
| `apple-touch-icon.png` | 180×180 | iOS home screen (PWA) |
| `favicon-192.png` | 192×192 | Android Chrome |
| `favicon-512.png` | 512×512 | PWA manifest |

---

## Quick Setup Commands

After generating icons with one of the tools above:

```bash
# iOS - After adding icons to Xcode
npx cap sync ios

# Android - After adding icons to res folders
npx cap sync android
```

---

## Color Reference

- **Background**: `#0A2F23` (Racing Green)
- **Icon Elements**: White (`#FFFFFF`)
- **Design**: Stylized "M" with golf flag and ball
