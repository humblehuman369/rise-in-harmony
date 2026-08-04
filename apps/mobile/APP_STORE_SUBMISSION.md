# Rise In Harmony — Apple App Store Submission (v1.2.0)
**Version:** 1.2.0 · **Next buildNumber:** 55 (managed by EAS remote) · **Bundle ID:** `com.riseinharmony.app`  
**ASC App ID:** `6786561356` · **Team:** `A2Y6C3NNSY`  
**Expo project:** `917f33c4-3b87-4f19-82ee-2c54125dae47`

This document is the single source of truth for App Store Connect listing copy,
privacy answers, IAP setup, and the build/submit sequence.

### ASC status (updated 2026-08-03)
- Last uploaded build: **1.0.1 (54)** — Aug 3, 2026 (Silent Healing Hz + home redesign features)
- New version **1.2.0** — Silent Healing Hz feature, home redesign, sub-audible binaural pairings
- **Required before Submit:** new EAS production build from current `main` (buildNumber 55), then select that build in ASC and Submit for Review

---
## Pre-Submission Checklist
Mark each item before hitting **Submit for Review**:

### Binary & config
- [x] Bundle ID `com.riseinharmony.app` matches App Store Connect
- [x] `app.json` version `1.2.0` — **buildNumber is managed by EAS remote** (`appVersionSource: "remote"` in `eas.json`); the value in `app.json` is ignored by EAS
- [x] `ITSAppUsesNonExemptEncryption` = false (no export-compliance questionnaire)
- [x] iOS deployment target 16.0+; phone-only (`supportsTablet: false`)
- [x] Background audio mode enabled for continuous playback
- [x] Notification sounds bundled: `alarm_174.wav` … `alarm_963.wav` (10 tones)
- [x] Sound Studio loops present (real ~30 s MP3s, not silent stubs)
- [x] Asset gate passes: `node scripts/check-mobile-assets.mjs`
- [x] EAS project ID + owner configured
- [x] ASC submit keys wired in `eas.json` (`AuthKey_LHBH9DWB4P.p8`)
- [ ] **New production binary** built from current main (buildNumber 55)
- [ ] New binary selected in ASC version 1.2.0 (build 55)

### Legal & web
- [x] Privacy Policy live: https://www.riseinharmony.com/privacy
- [x] Terms of Service live: https://www.riseinharmony.com/terms
- [x] Support / Marketing URL: https://www.riseinharmony.com
- [x] Web production updated with TrueHz meditations + Silent Healing Hz

### Store ops (you complete in ASC / RevenueCat)
- [x] Screenshots uploaded (6× iPhone 6.9" + 6× iPad 13")
- [x] IAP products created + localizations (monthly / annual / lifetime READY_TO_SUBMIT)
- [x] Categories: Health & Fitness + Lifestyle
- [x] Copyright + content rights + usesIdfa=false
- [ ] RevenueCat products imported + `premium` entitlement + `default` offering
- [ ] Sandbox tester account created for review
- [ ] App Privacy nutrition label completed (answers below)
- [ ] Age rating questionnaire confirmed → **4+**
- [ ] Production EAS build tested on a physical iPhone
- [ ] Submit for review

> **Health-claim language:** Do not use unsubstantiated medical claims
> ("DNA repair", "cures", "treats disease"). Prefer experiential phrasing
> ("associated with", "many people use for"). Keep the medical disclaimer.

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
New: Silent Healing Hz — sub-audible frequencies felt, not heard. Delta to Alpha brainwave sweep alarm. Nine TrueHz meditations. Layer your soundscape.
```

### Category
- **Primary:** Health & Fitness  
- **Secondary:** Lifestyle  

### Age Rating
**4+** (no unrestricted web, no violence, no mature themes)

### Copyright
```
© 2026 Rise In Harmony
```

### Description (≤4000 characters)
```
Rise In Harmony replaces jarring alarms with precisely tuned healing frequencies — so your morning (and your practice) starts in calm.

TRUEHZ™ PRECISION TUNING
Every tone is generated live on your device with TrueHz™ methodology — mathematically exact, zero compression artifacts, true dual-channel binaural when you want it. When we say 528 Hz, you hear 528.00 Hz.

SILENT HEALING HZ
Sub-20Hz frequencies are felt, not heard — vibration and resonance working below the threshold of audible sound. Explore Schumann Resonance (7.83Hz), Delta waves (0.5–4Hz), and infrasound tones. An educational explainer is built in so you always know what you're experiencing.

ADVANCED HEALING ALARM
The world's first biologically-guided alarm. Choose your Sleep Profile (Light / Normal / Heavy / Very Heavy) and the alarm escalates through four stages — Whisper, Rise, Full, Persistent — matching your sleep depth. The Deep Sleep Wake sequence sweeps your brainwaves from δ Delta (3Hz) through θ Theta (6Hz) to α Alpha (10Hz), meeting your brain where it is and guiding it gently to wakefulness. 432Hz and 528Hz are free for all users.

HEALING FREQUENCY LIBRARY
Explore the Solfeggio scale (174–963 Hz), 432 Hz natural harmony, 444 Hz concert pitch, and brainwave companions (Alpha, Theta, Delta). Each tone includes context, chakra associations where relevant, and affirmations.

TRUEHZ MEDITATIONS
Nine studio-produced TrueHz sessions (10–60 minutes): Nature Meditation (174 Hz), Calm Sleep (528 Hz), Third Eye Activation (528 Hz), Reiki Healing Garden (285 Hz), Deep Serenity (444 Hz), Spiritual Meditation (444 Hz), Deep Into Nature (60 min), Inner Calling (60 min), and Peaceful Ocean (60 min). Drag the progress bar to seek to any moment in your session.

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

### Keywords (≤100 characters, comma-separated)
```
solfeggio,432hz,528hz,binaural,isochronic,chakra,truehz,sleep,meditate,wake,relax,calm,healing,frequency
```
*(104 characters — trim one if ASC rejects; remove "frequency" to reach 95 chars)*

**Recommended 99-char trim:**
```
solfeggio,432hz,528hz,binaural,isochronic,chakra,truehz,sleep,meditate,wake,relax,calm,healing
```

### URLs
| Field | Value |
|---|---|
| Support | https://www.riseinharmony.com |
| Marketing | https://www.riseinharmony.com |
| Privacy Policy | https://www.riseinharmony.com/privacy |

### What's New (1.2.0)
```
Version 1.2.0 — Silent Healing Hz & Home Redesign

• Silent Healing Hz: sub-20Hz frequencies felt through vibration, not heard — includes Schumann Resonance (7.83Hz), Delta waves (0.5–4Hz), and infrasound tones
• Sub-audible binaural pairings in meditation mode for deeper sessions without audible overlay
• Home screen redesign — cleaner first impression with educational frequency video
• Library now defaults to Solfeggio with dedicated Silent Healing Hz category and explainer
• Back to Library button in Sound Studio when opened from Library
• Stability and performance improvements
```

---
## In-App Purchases

| Product ID | Type | Price | Display name |
|---|---|---|---|
| `com.riseinharmony.premium.monthly` | Auto-renewable | $7.99/mo | Premium Monthly |
| `com.riseinharmony.premium.annual` | Auto-renewable | $49.99/yr | Premium Annual |
| `com.riseinharmony.lifetime` | Non-consumable | $99.99 | Premium Lifetime |

- **Subscription group:** Rise In Harmony Premium  
- **RevenueCat entitlement:** `premium`  
- **Offering ID:** `default` (Annual as default package recommended)  
- **Note on Lifetime pricing:** The mobile IAP Lifetime is $99.99. The web Stripe Founder tier is $149.99. These are intentionally separate products.
- **Review note:** App works without login; free features are usable offline. Use Sandbox for IAP testing.

---
## Screenshots

### Required sizes
| Device | Size | Folder |
|---|---|---|
| iPhone 6.9" (primary) | 1320 × 2868 | `store-listing/screenshots/captioned/rih_screenshot_0[1-6]_*.png` |
| iPhone 6.1" | 1179 × 2556 | `store-listing/screenshots/iphone_61/` |
| iPhone 6.5" | 1284 × 2778 | `store-listing/screenshots/iphone_65/` |
| iPad 13" | 2064 × 2752 | `store-listing/screenshots/captioned/rih_ipad_0[1-6]_*.png` |

*(iPad screenshots available — `rih_ipad_01_alarm.png` through `rih_ipad_06_home.png`)*

### App Preview
- **Ready-to-upload:** `store-listing/app-preview/app-preview-20s-69inch.mp4` (1320×2868, H.264, 30fps, ~21s)
- Upload under the **6.9" App Preview** slot in ASC

### Capture order
1. **Alarm** — 01-alarm (Deep Sleep Wake sequence)
2. **Precision Player** — 02-precision (TrueHz Hz display)
3. **Library** — 03-library (Solfeggio + Silent Healing Hz)
4. **Sound Studio** — 04-studio (layered mix)
5. **Meditation** — 05-meditation (TrueHz sessions)
6. **Home** — 06-home (landing / ritual)

---
## App Privacy Questionnaire (nutrition label)

**Do you or your third parties collect data?** → **Yes**

| Data type | Linked to identity? | Used for tracking? | Purposes |
|---|---|---|---|
| Purchases → Purchase History | No | No | App Functionality |
| Identifiers → User ID | No | No | App Functionality, Analytics |
| Usage Data → Product Interaction | No | No | Analytics |

- **Not collected:** contact info, health & fitness data, location, contacts, photos, search history, sensitive info, diagnostics  
- **Tracking:** No → no ATT prompt required  
- Partners: RevenueCat (purchases), PostHog (analytics) — both with anonymous / app-user IDs

---
## App Review Notes (paste into ASC)
```
Rise In Harmony is a wellness app that plays healing frequencies (Solfeggio and
binaural tones), TrueHz meditation sessions, a layered Sound Studio, and
scheduled healing alarms.

NO LOGIN REQUIRED for free features. 432Hz and 528Hz alarm tones are free for
all users.

TEST ACCOUNT: Use any App Store Sandbox tester for Premium / IAP.
Free path: open app → Alarm → create alarm with Deep Sleep Wake sequence (free)
→ Player or Meditate → play a free session.

NEW IN 1.2.0: Silent Healing Hz category (sub-20Hz frequencies felt through
vibration, not heard — Schumann 7.83Hz, Delta waves, infrasound tones with
built-in educational explainer), sub-audible binaural pairings in meditation
mode, home screen redesign, seekable meditation progress bar.

PERMISSIONS:
• Notifications — healing alarms at user-scheduled times (prompted when user
  creates an alarm).
• Microphone usage string — required by the audio engine dependency; the app
  does not record microphone audio.
• Background audio — continues frequency/meditation playback when screen locked.

IN-APP PURCHASES: Monthly ($7.99), Annual ($49.99), Lifetime ($99.99).
Entitlement: premium.
Please use headphones for binaural and Silent Healing Hz demos.
```

---
## Build & Submit

### 0. Asset gate
```bash
cd /path/to/rise-in-harmony
node scripts/check-mobile-assets.mjs
```

### 1. EAS secrets (once — if not already set)
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
`autoIncrement: true` + `appVersionSource: "remote"` in `eas.json` means **EAS manages the build counter on its servers** — the `buildNumber` field in `app.json` is ignored. Last build was **54**, so EAS will assign **55** automatically.

### 3. Submit to App Store Connect
```bash
eas submit --platform ios --latest --profile production
```

### 4. In App Store Connect
1. Create new version **1.2.0** in ASC (previous live/submitted version was 1.0.1 build 54)  
2. Paste metadata from this doc  
3. Upload screenshots (6.9" primary + iPad 13" optional)  
4. Upload App Preview video  
5. Complete App Privacy + age rating  
6. Attach IAPs to the version  
7. **Submit for Review**

Typical review: 1–3 business days.

---
## Post-Launch
- Watch ASC crashes + RevenueCat conversions + PostHog funnels  
- Reply to reviews within 24 hours  
- Plan 1.2.1 polish update within ~2 weeks  

---
## Feature set in this binary (for reviewers & marketing)

| Feature | Status |
|---|---|
| TrueHz frequency player | ✅ Shipped |
| Frequency library (Solfeggio + binaural + recorded Schumann) | ✅ Shipped |
| Silent Healing Hz (sub-20Hz with educational explainer) | ✅ NEW in 1.2.0 |
| Advanced healing alarm (Deep Sleep Wake, Sleep Profiles, 4-stage escalation) | ✅ Shipped |
| 9 TrueHz meditation sessions (10–60 min) | ✅ Shipped |
| Sub-audible binaural pairings in meditation mode | ✅ NEW in 1.2.0 |
| Sound Studio (freq + nature + music, save mixes) | ✅ Shipped |
| 7-Chakra Journey | ✅ Shipped |
| Precision Player (custom Hz, waveforms, mono/binaural/isochronic) | ✅ Shipped |
| Dashboard / streaks | ✅ Shipped |
| Home screen redesign | ✅ NEW in 1.2.0 |
| Premium via RevenueCat | ✅ Shipped (configure products in ASC) |
| Offline-capable core | ✅ Shipped |

