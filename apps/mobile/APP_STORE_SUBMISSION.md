# Rise In Harmony — Apple App Store Submission Guide

This document contains all the metadata, copy, and step-by-step instructions needed to submit Rise In Harmony to the Apple App Store.

---

## Pre-Submission Checklist

Before submitting, confirm every item below is complete:

- [ ] Apple Developer Program membership active ($99/year at developer.apple.com)
- [ ] EAS project initialized (`eas init` run, project ID in `app.json`)
- [ ] Audio files added to `assets/sounds/` (see Audio Assets section)
- [ ] RevenueCat iOS products configured in App Store Connect
- [ ] Production EAS build created and tested on a physical device
- [ ] All 5 required screenshot sizes captured
- [ ] Privacy policy URL live at `https://www.riseinharmony.com/privacy`
- [ ] Terms of service URL live at `https://www.riseinharmony.com/terms`
- [ ] App Privacy ("nutrition label") completed in App Store Connect — PostHog collects user id/name/email + usage, which must be declared
- [ ] Listing describes ONLY features present in the submitted build (Guided Meditations and Sound Studio are NOT yet implemented — do not advertise them until they ship; Guideline 2.3.1)

> ⚠️ **Health-claim language:** In-app copy and this description reference effects such as "DNA repair", "tissue regeneration", and "pineal activation". These are unsubstantiated medical claims and are a common cause of rejection (Guidelines 1.4.1 / 2.3). Prefer experiential phrasing ("associated with", "many people use for") and keep the medical disclaimer prominent.

---

## App Store Connect Metadata

### App Name
```
Rise In Harmony
```

### Subtitle (30 chars max)
```
Healing Frequencies & Alarm
```

### Category
- **Primary:** Health & Fitness
- **Secondary:** Music

### Age Rating
4+ (no objectionable content)

### App Store Description (4000 chars max)

```
Rise In Harmony replaces your jarring alarm clock with healing frequencies that wake your body gently and align your energy for the day ahead.

HEALING FREQUENCIES
Explore the complete Solfeggio scale — 174Hz through 963Hz — plus binaural beats for Alpha, Theta, and Delta brainwave states. Each frequency is precisely tuned and scientifically referenced, with chakra associations, Sanskrit pronunciations, and personal affirmations.

HEALING ALARM
Set your wake time and choose a healing frequency. Rise In Harmony delivers a gentle wake-up notification with a soft healing tone instead of a jarring buzzer. Supports repeat schedules. (In-app playback also offers a 1–10 minute fade-in for wind-down and sleep sessions.)

7-CHAKRA JOURNEY
A guided sequence through all seven chakras — Root to Crown — with the corresponding Solfeggio frequency for each energy center. Includes Sanskrit names, pronunciations, and affirmations.

WELLNESS DASHBOARD
Track your healing sessions, current streak, and total minutes. See your chakra balance at a glance and understand how your morning ritual is building over time.

OFFLINE FIRST
All frequencies and meditations are available without an internet connection. Your morning ritual works even in airplane mode.

PREMIUM FEATURES
Unlock the full frequency library, all meditation sessions, unlimited alarms, and background audio with a Rise In Harmony Premium subscription.

---

Note: Rise In Harmony is a wellness and relaxation app. It is not a medical device and does not diagnose, treat, cure, or prevent any medical condition. Consult a healthcare professional for medical advice.
```

### Keywords (100 chars max, comma-separated)
```
healing frequencies,solfeggio,binaural beats,meditation,sleep,chakra,432hz,528hz,alarm,wellness
```

### Support URL
```
https://www.riseinharmony.com
```

### Marketing URL
```
https://www.riseinharmony.com
```

### Privacy Policy URL
```
https://www.riseinharmony.com/privacy
```

---

## Pricing & Availability

- **Base price:** Free
- **Availability:** All territories
- **In-App Purchases:** Configure in RevenueCat (see below)

---

## In-App Purchases (RevenueCat Setup)

Create the following products in App Store Connect → In-App Purchases, then mirror them in RevenueCat:

| Product ID | Type | Price | Description |
|---|---|---|---|
| `com.riseinharmony.premium.monthly` | Auto-Renewable Subscription | $7.99/month | Rise In Harmony Premium (Monthly) |
| `com.riseinharmony.premium.annual` | Auto-Renewable Subscription | $49.99/year | Rise In Harmony Premium (Annual) |
| `com.riseinharmony.lifetime` | Non-Consumable | $99.99 | Rise In Harmony Premium (Lifetime) |

**Subscription Group Name:** Rise In Harmony Premium

**RevenueCat Entitlement:** `premium`

**RevenueCat Offering ID:** `default`

After creating products in App Store Connect:
1. Go to RevenueCat Dashboard → Products → Import from App Store
2. Create an Offering called `default`
3. Add all three packages: Monthly, Annual, Lifetime
4. Set Annual as the default package

---

## Audio Assets Required

All healing frequencies (solfeggio tones, binaural beats, isochronic pulses) are
**synthesized live on-device** — no pre-rendered frequency recordings ship in the
binary (~28 MB smaller). Only the following files must be in
`apps/mobile/assets/sounds/` before building:

| Filename | Description | Source |
|---|---|---|
| `ambient-rain.mp3` | Gentle rain loop | Record or license |
| `ambient-ocean.mp3` | Ocean waves loop | Record or license |
| `ambient-forest.mp3` | Forest birdsong loop | Record or license |
| `ambient-wind.mp3` | Mountain wind loop | Record or license |
| `ambient-fire.mp3` | Crackling fire loop | Record or license |
| `gentle_528hz.wav` | Gentle 528Hz alarm tone (30 seconds) | Record or license |

**Recommended sources for royalty-free audio:**
- [Freesound.org](https://freesound.org) — CC0 licensed tones
- Generate using Audacity or Adobe Audition with a sine wave generator
- Commission from a sound designer on Fiverr or Upwork

**File specifications:**
- Format: MP3 (loops), WAV (alarm sound)
- Bit rate: 128kbps minimum, 320kbps recommended
- Sample rate: 44.1kHz
- Channels: Stereo (binaural beats require stereo; mono is acceptable for pure tones)

---

## Screenshots Required

App Store requires screenshots for the following device sizes:

### Required (mandatory)
| Device | Size | Notes |
|---|---|---|
| iPhone 6.9" (iPhone 16 Pro Max) | 1320 × 2868 px | Primary listing screenshots |
| iPhone 6.7" (iPhone 14 Plus) | 1284 × 2778 px | Required if supporting iOS 16 |
| iPad Pro 13" (M4) | 2064 × 2752 px | Required if supporting iPad |

### Recommended Screens to Capture (in order)
1. **Hero / Player** — Frequency player showing 528Hz with animated rings, playing state
2. **Frequency Library** — Grid of all frequencies with color-coded cards
3. **Healing Alarm** — Alarm creation screen with time picker and frequency selector
4. **Meditation** — Meditation library with ambient soundscape playing
5. **Dashboard** — Streak stats, weekly bar chart, and chakra balance map

### Screenshot Tips
- Use a real device or Simulator with the app running
- Capture in dark mode (the app's default theme)
- Add marketing text overlay in App Store Connect's screenshot editor or use Figma
- Suggested overlay text: "Wake up in harmony", "13 healing frequencies", "Set your healing alarm", "Guided meditations", "Track your journey"

---

## App Review Notes

Include these notes in the App Review Information section:

```
Rise In Harmony is a wellness app that plays healing frequencies (Solfeggio tones and binaural beats) and sets alarm notifications.

TEST ACCOUNT:
No account is required to use the free features. The app works without login.
To test premium features, use the Sandbox test account configured in App Store Connect.

AUDIO PERMISSIONS:
The app requests audio session permissions to play sounds in the background (when the screen is off). This is required for the healing alarm and sleep timer features.

NOTIFICATION PERMISSIONS:
The app requests notification permissions to deliver the healing alarm at the scheduled time. The user is prompted before any alarm is created.

IN-APP PURCHASES:
Three subscription tiers are available (Monthly, Annual, Lifetime). Use the Sandbox environment to test purchases. The paywall is accessible from any locked frequency or from the Library tab.

BACKGROUND AUDIO:
The app uses AVAudioSession with the .playback category to continue playing frequencies when the screen is locked. This is the same category used by Spotify, Apple Music, and other audio apps.
```

---

## Build & Submit Steps

### 1. Initialize EAS
```bash
cd apps/mobile
npx eas-cli init
# This creates a project on expo.dev and writes the projectId to app.json
```

### 2. Configure EAS Secrets
```bash
eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value "https://www.riseinharmony.com"
eas secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_IOS_KEY --value "appl_..."
eas secret:create --scope project --name EXPO_PUBLIC_POSTHOG_KEY --value "phc_..."
```

### 3. Create Production Build
```bash
eas build --platform ios --profile production
```
This uploads the build to Expo's build servers and produces an `.ipa` file.

### 4. Submit to App Store
```bash
eas submit --platform ios --latest
```
This submits the latest build to App Store Connect for review.

### 5. Complete App Store Connect Setup
- Fill in all metadata from this document
- Upload screenshots
- Set pricing and availability
- Configure in-app purchases
- Submit for review

### 6. App Review Timeline
Apple's review typically takes 1–3 business days for new apps. Expedited review is available for critical bug fixes.

---

## Post-Launch

After approval:
- Monitor crash reports via Expo's error tracking or Sentry
- Watch RevenueCat dashboard for subscription conversions
- Check PostHog for user behavior and drop-off points
- Respond to App Store reviews within 24 hours
- Plan first update within 2 weeks of launch to signal active maintenance to the App Store algorithm
