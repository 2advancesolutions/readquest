# ReadQuest Mobile — Build & Deploy Guide

## Prerequisites
```bash
npm install -g eas-cli
eas login   # use your Expo account
```

## 1. One-time EAS project setup
```bash
cd readquest/mobile
eas build:configure   # fills in eas.projectId in app.config.ts
```
Then update `app.config.ts` line 65 with the printed projectId.

## 2. Generate the app icon & splash
Place your 1024×1024 icon in `assets/icon.png`  
and your 1284×2778 splash in `assets/splash-icon.png`  
Then run:
```bash
npx expo install expo-splash-screen
```

## 3. Development builds (local simulator / device)

### iOS Simulator
```bash
eas build --profile development --platform ios
```

### Android APK (for device sideloading)
```bash
eas build --profile development --platform android
```

## 4. Internal preview distribution
Shares with testers via TestFlight (iOS) or direct APK link (Android):
```bash
eas build --profile preview --platform all
```

## 5. Production builds (App Store + Play Store)

### iOS → TestFlight → App Store
```bash
eas build --profile production --platform ios
eas submit --platform ios   # requires apple creds in eas.json
```

### Android → Internal → Production
```bash
eas build --profile production --platform android
eas submit --platform android   # requires google-services-key.json
```

## 6. OTA Updates (no store review required for JS-only changes)
```bash
eas update --channel production --message "Fix reading progress bug"
```

## Environment Variables
Set these in EAS secrets (never commit to git):
```
EXPO_PUBLIC_API_URL=https://api.readquest.app
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```
```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://xxxx.supabase.co"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJhbGci..."
```

## App Store Metadata (iOS)
- **App Name:** ReadQuest — Kids Reading
- **Subtitle:** Learn to Read & Write
- **Category:** Education
- **Age Rating:** 4+
- **Keywords:** kids reading, phonics, spelling, education, reading practice

## Play Store Metadata (Android)
- **App Name:** ReadQuest
- **Category:** Education
- **Content Rating:** Everyone

## Bundle IDs
- iOS: `com.readquest.app`
- Android: `com.readquest.app`
