# Rise In Harmony — Apple App Store Submission (Final Ready)

**Version:** 1.0.1 · **Next buildNumber:** 49 · **Bundle ID:** `com.riseinharmony.app`  
**ASC App ID:** `6786561356` · **Team:** `A2Y6C3NNSY`  
**Expo project:** `917f33c4-3b87-4f19-82ee-2c54125dae47`

This document is the single source of truth for App Store Connect listing copy,
privacy answers, IAP setup, and the build/submit sequence.

### ASC status (updated 2026-07-25)
- Version **1.0.1** in **PREPARE_FOR_SUBMISSION**
- Listing, screenshots (6× iPhone 6.7"), IAPs, categories, copyright, review notes: set via API
- Build currently attached: **#48** (uploaded 2026-07-12) — **older than TrueHz final assets**
- **Required before Submit:** new EAS production build from current `main` (buildNumber ≥ 49), then select that build in ASC and Submit for Review

---

## Pre-Submission Checklist

Mark each item before hitting **Submit for Review**:

### Binary & config
- [x] Bundle ID `com.riseinharmony.app` matches App Store Connect
- [x] `app.json` version `1.0.1`, iOS `buildNumber` `49` (next upload)
- [x] `ITSAppUsesNonExemptEncryption` = false (no export-compliance questionnaire)
- [x] iOS deployment target 16.0+; phone-only (`supportsTablet: false`)
- [x] Background audio mode enabled for continuous playback
- [x] Notification sounds bundled: `alarm_174.wav` … `alarm_963.wav` (10 tones)
- [x] Sound Studio loops present (real ~30 s MP3s, not silent stubs)
- [x] Asset gate passes: `node scripts/check-mobile-assets.mjs`
- [x] EAS project ID + owner configured
- [x] ASC submit keys wired in `eas.json` (`AuthKey_LHBH9DWB4P.p8`)
- [ ] **New production binary** built from current main (includes TrueHz catalog + final audio)
- [ ] New binary selected on ASC version 1.0.1 (replace build 48)

### Legal & web
- [x] Privacy Policy live: https://www.riseinharmony.com/privacy
- [x] Terms of Service live: https://www.riseinharmony.com/terms
- [x] Support / Marketing URL: https://www.riseinharmony.com
- [x] Web production updated with TrueHz meditations (www.riseinharmony.com)

### Store ops (you complete in ASC / RevenueCat)
- [x] Screenshots uploaded (6 on APP_IPHONE_67)
- [x] IAP products created + localizations (monthly / annual / lifetime READY_TO_SUBMIT)
- [x] Categories: Health & Fitness + Lifestyle
- [x] Copyright + content rights + usesIdfa=false
- [ ] RevenueCat products imported + `premium` entitlement + `default` offering
- [ ] Sandbox tester account created for review
- [ ] App Privacy nutrition label completed (answers below)
- [ ] Age rating questionnaire confirmed → **4+** (declaration present via API)
- [ ] Production EAS build tested on a physical iPhone
- [ ] Submit for review

> **Health-claim language:** Do not use unsubstantiated medical claims
> (“DNA repair”, “cures”, “treats disease”). Prefer experiential phrasing
> (“associated with”, “many people use for”). Keep the medical disclaimer.

---

## App Store Connect Metadata (copy/paste)

### App Name
```
Rise In Harmony
```

### Subtitle (≤30 characters)
```
Healing Frequencies & Alarm
```

### Promotional Text (≤170 characters)
```
Wake gently with TrueHz™ healing frequencies, Solfeggio tones, binaural beats, guided TrueHz meditations, and a soft healing alarm.
```

### Category
- **Primary:** Health & Fitness  
- **Secondary:** Lifestyle  

### Age Rating
**4+** (no unrestricted web, no violence, no mature themes)

### Description (≤4000 characters)

```
Rise In Harmony replaces jarring alarms with precisely tuned healing frequencies — so your morning (and your practice) starts in calm.

TRUEHZ™ PRECISION TUNING
Every tone is generated live on your device with TrueHz™ methodology — mathematically exact, zero compression artifacts, true dual-channel binaural when you want it. When we say 528 Hz, you hear 528.00 Hz.

HEALING FREQUENCY LIBRARY
Explore the Solfeggio scale (174–963 Hz), 432 Hz natural harmony, 444 Hz concert pitch, and brainwave companions (Alpha, Theta, Delta). Each tone includes context, chakra associations where relevant, and affirmations.

HEALING ALARM
Schedule a gentle wake time with a solfeggio notification tone instead of a buzzer. Repeat days, frequency pickers, and soft in-app fade options for wind-down.

TRUEHZ MEDITATIONS
Six studio-produced TrueHz sessions (10–30 minutes): Nature Meditation (174 Hz), Calm Sleep (528 Hz), Third Eye Activation (528 Hz), Reiki Healing Garden (285 Hz), Deep Serenity (444 Hz), and Spiritual Meditation (444 Hz).

SOUND STUDIO
Layer a healing frequency with ambient nature beds and musical textures (rain, ocean, forest, wind, fire + ambient / drone / crystal). Save your mixes.

7-CHAKRA JOURNEY
A guided Root-to-Crown sequence with matching Solfeggio tones, Sanskrit names, and affirmations.

PRECISION PLAYER
Dial custom Hz, choose waveforms, and explore mono, binaural, or isochronic modes for deep focus or rest.

WELLNESS DASHBOARD
Track sessions, streaks, and minutes. See how your practice builds over time.

OFFLINE-CAPABLE CORE
Frequencies and core audio engines work without a constant connection — your ritual still works in airplane mode.

PREMIUM
Unlock the full frequency library, all TrueHz meditations, unlimited alarms, and advanced studio features with Rise In Harmony Premium.

---

Rise In Harmony is a wellness and relaxation app. It is not a medical device and does not diagnose, treat, cure, or prevent any medical condition. Consult a healthcare professional for medical advice.
```

### Keywords (≤100 characters, comma-separated, no spaces after commas preferred)
```
healing frequencies,solfeggio,binaural,meditation,sleep,chakra,432hz,528hz,alarm,wellness
```
*(99 characters)*

### URLs
| Field | Value |
|---|---|
| Support | https://www.riseinharmony.com |
| Marketing | https://www.riseinharmony.com |
| Privacy Policy | https://www.riseinharmony.com/privacy |

### What's New (1.0.1)
```
• Six TrueHz HQ meditation sessions (174 / 285 / 444 / 528 Hz masters)
• Final production audio bundle for Sound Studio and healing alarms
• App Store readiness: privacy strings, version 1.0.1, notification tones
• Stability and polish for launch
```

---

## Pricing & Availability

- **Price:** Free  
- **Availability:** All territories (or your preferred set)  
- **In-App Purchases:** See below  

---

## In-App Purchases (App Store Connect + RevenueCat)

Create in **App Store Connect → Subscriptions / IAPs**, then import in RevenueCat:

| Product ID | Type | Price (US) | Display name |
|---|---|---|---|
| `com.riseinharmony.premium.monthly` | Auto-renewable | $7.99/mo | Premium Monthly |
| `com.riseinharmony.premium.annual` | Auto-renewable | $49.99/yr | Premium Annual |
| `com.riseinharmony.lifetime` | Non-consumable | $99.99 | Premium Lifetime |

- **Subscription group:** Rise In Harmony Premium  
- **RevenueCat entitlement:** `premium`  
- **Offering ID:** `default` (Annual as default package recommended)  
- **Review note:** App works without login; free features are usable offline. Use Sandbox for IAP testing.

---

## Screenshots

### Required sizes
| Device | Size |
|---|---|
| iPhone 6.9" (primary) | 1320 × 2868 |
| iPhone 6.7" (optional but recommended) | 1284 × 2778 |

*(iPad screenshots not required — `supportsTablet: false`.)*

### Capture order (suggested)
1. **Player** — 528 Hz playing with visualizer  
2. **Library** — frequency grid  
3. **Alarm** — schedule + frequency pick  
4. **Meditate** — six TrueHz sessions  
5. **Sound Studio** — layered mix  
6. **Dashboard** — streak / minutes  

Use **dark mode**. Avoid medical claims in overlay captions.

Suggested captions:
- “Wake up in harmony”
- “TrueHz™ precision frequencies”
- “Gentle healing alarm”
- “Six TrueHz meditations”
- “Layer your soundscape”
- “Track your practice”

---

## App Privacy Questionnaire (nutrition label)

**Do you or your third parties collect data?** → **Yes**

| Data type | Linked to identity? | Used for tracking? | Purposes |
|---|---|---|---|
| Purchases → Purchase History | No | No | App Functionality |
| Identifiers → User ID | No | No | App Functionality, Analytics |
| Usage Data → Product Interaction | No | No | Analytics |

- **Not collected:** contact info, health & fitness data, location, contacts, photos, search history, sensitive info, diagnostics (unless you later add crash tools — update this).  
- **Tracking:** No → no ATT prompt required.  
- Partners: RevenueCat (purchases), PostHog (analytics) — both with anonymous / app-user IDs as configured.

---

## App Review Notes (paste into ASC)

```
Rise In Harmony is a wellness app that plays healing frequencies (Solfeggio and
binaural tones), TrueHz meditation sessions, a layered Sound Studio, and
scheduled healing alarms.

NO LOGIN REQUIRED for free features. Optional account/sign-in may appear for
cloud sync; core audio works without it.

TEST ACCOUNT:
Use any App Store Sandbox tester for Premium / IAP.
Free path: open app → Player or Meditate → play a free session.

PERMISSIONS:
• Notifications — healing alarms at user-scheduled times (prompted when user
  creates an alarm).
• Microphone usage string — required by the audio engine dependency; the app
  does not record microphone audio.
• Background audio — continues frequency / meditation playback when the screen
  is locked (standard .playback audio session).

IN-APP PURCHASES:
Monthly, Annual, Lifetime unlock premium frequencies, all TrueHz meditations,
unlimited alarms, and advanced studio features. Entitlement id: premium.

Please use headphones for binaural demos.
```

---

## Build & Submit

### 0. Asset gate
```bash
cd /path/to/rise-in-harmony
node scripts/check-mobile-assets.mjs
```

### 1. EAS secrets (once)
```bash
cd apps/mobile
eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value "https://www.riseinharmony.com"
eas secret:create --scope project --name EXPO_PUBLIC_RC_API_KEY_IOS --value "appl_..."
eas secret:create --scope project --name EXPO_PUBLIC_RC_API_KEY_ANDROID --value "goog_..."
eas secret:create --scope project --name EXPO_PUBLIC_POSTHOG_KEY --value "phc_..."
eas secret:create --scope project --name EXPO_PUBLIC_POSTHOG_HOST --value "https://us.i.posthog.com"
```

### 2. Production iOS build
```bash
cd apps/mobile
eas build --platform ios --profile production
```

### 3. Submit to App Store Connect
```bash
eas submit --platform ios --latest --profile production
```

### 4. In App Store Connect
1. Select build 2 (1.0.1)  
2. Paste metadata from this doc  
3. Upload screenshots  
4. Complete App Privacy + age rating  
5. Attach IAPs to the version  
6. **Submit for Review**

Typical review: 1–3 business days for a new app version.

---

## Post-Launch

- Watch ASC crashes + RevenueCat conversions + PostHog funnels  
- Reply to reviews within 24 hours  
- Prefer a small 1.0.2 polish update within ~2 weeks  

---

## Feature set in this binary (for reviewers & marketing)

| Feature | Status |
|---|---|
| TrueHz frequency player | Shipped |
| Frequency library (Solfeggio + more) | Shipped |
| Healing alarm + solfeggio notification tones | Shipped |
| 6 TrueHz meditation sessions | Shipped |
| Sound Studio (freq + nature + music) | Shipped |
| 7-Chakra Journey | Shipped |
| Precision Player | Shipped |
| Dashboard / streaks | Shipped |
| Premium via RevenueCat | Shipped (configure products in ASC) |
| TrueHz Convert (web) | Web-only — not advertised as an iOS feature |
