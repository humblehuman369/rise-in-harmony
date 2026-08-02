# Rise In Harmony — App Store Manual Submission Guide

**Version:** 1.1.0 (Build 50)  
**Bundle ID / Package:** `com.riseinharmony.app`  
**ASC App ID:** `6786561356`  
**Apple Team ID:** `A2Y6C3NNSY`  
**EAS Project ID:** `917f33c4-3b87-4f19-82ee-2c54125dae47`  
**Expo Owner:** `humblehuman369`

This document covers every step that cannot be automated by EAS: obtaining submission credentials, configuring RevenueCat, completing App Store Connect forms, and submitting to both stores. Work through the sections in order.

---

## Part 1 — Obtain the Apple App Store Connect API Key

The file `apps/mobile/AuthKey_LHBH9DWB4P.p8` is required by `eas submit` to authenticate with App Store Connect. It is gitignored and must be obtained from the Apple Developer portal.

### Step 1.1 — Log in to App Store Connect

Navigate to [https://appstoreconnect.apple.com](https://appstoreconnect.apple.com) and sign in with the Apple ID associated with Team `A2Y6C3NNSY`.

### Step 1.2 — Navigate to API Keys

From the App Store Connect home, go to **Users and Access** (top navigation) → **Integrations** tab → **App Store Connect API** in the left sidebar.

### Step 1.3 — Locate or generate the key

Look for a key with ID **`LHBH9DWB4P`** in the key list.

**If the key exists and has not been revoked:**
Apple only allows a `.p8` file to be downloaded once, at the time of creation. If the original download was lost, the key must be revoked and a new one generated (see Step 1.4).

**If the key has been revoked or does not exist:**
Proceed to Step 1.4.

### Step 1.4 — Generate a new API key (if needed)

1. Click the **+** (Generate API Key) button.
2. Set **Name** to `EAS Submit` (or any descriptive label).
3. Set **Access** to **App Manager** (minimum required for `eas submit`).
4. Click **Generate**.
5. **Immediately download the `.p8` file** — Apple shows the download link only once.
6. Note the new **Key ID** and **Issuer ID** displayed on the page.

### Step 1.5 — Update eas.json if a new key was generated

If you generated a new key with a different ID, open `apps/mobile/eas.json` and update the `submit.production.ios` section:

```json
"ios": {
  "ascAppId": "6786561356",
  "appleTeamId": "A2Y6C3NNSY",
  "ascApiKeyPath": "./AuthKey_<NEW_KEY_ID>.p8",
  "ascApiKeyId": "<NEW_KEY_ID>",
  "ascApiKeyIssuerId": "<NEW_ISSUER_ID>"
}
```

Commit and push this change before running `eas submit`.

### Step 1.6 — Place the file

Copy the downloaded `.p8` file into the `apps/mobile/` directory and rename it to match the key ID:

```bash
cp ~/Downloads/AuthKey_LHBH9DWB4P.p8 /path/to/rise-in-harmony/apps/mobile/AuthKey_LHBH9DWB4P.p8
```

Verify it is gitignored (it is already listed as `AuthKey_*.p8` in `apps/mobile/.gitignore`). **Never commit this file.**

---

## Part 2 — Obtain the Google Play Service Account Key

The file `apps/mobile/google-service-account.json` is required by `eas submit` to authenticate with the Google Play Developer API. It is gitignored and must be generated from the Google Play Console.

### Step 2.1 — Log in to Google Play Console

Navigate to [https://play.google.com/console](https://play.google.com/console) and sign in with the account that owns the Rise In Harmony app (`com.riseinharmony.app`).

### Step 2.2 — Link to Google Cloud (if not already linked)

1. In the left sidebar, go to **Setup → API access**.
2. If prompted, click **Link to a Google Cloud project** and either create a new project or link to an existing one. This is a one-time setup.
3. Click **Agree** to the terms if shown.

### Step 2.3 — Create a Service Account

1. On the **API access** page, scroll to the **Service accounts** section.
2. Click **Create new service account**.
3. A dialog will open with a link to the Google Cloud Console. Click **Create service account in Google Cloud Console**.
4. In the Google Cloud Console:
   - Set **Service account name** to `eas-submit` (or any label).
   - Set **Service account ID** to `eas-submit` (auto-filled).
   - Click **Create and Continue**.
   - For the **Role**, select **Service Accounts → Service Account User**. Click **Continue**, then **Done**.
5. Return to the Google Play Console API access page and click **Refresh service accounts**. The new account should appear.

### Step 2.4 — Grant Play Console permissions

1. Find the new service account in the list and click **Manage Play Console permissions**.
2. Grant the following permissions at the **App level** for `com.riseinharmony.app`:
   - **Releases** → Manage production releases (or at minimum: Manage testing track releases)
   - **Store Presence** → Manage store listing, pricing & distribution
3. Click **Apply** and then **Save changes**.

> **Minimum required for `eas submit` to the internal track:** Release to internal testing track.

### Step 2.5 — Generate the JSON key

1. Go back to the Google Cloud Console → **IAM & Admin → Service Accounts**.
2. Find the `eas-submit` service account. Click the three-dot menu → **Manage keys**.
3. Click **Add Key → Create new key**.
4. Select **JSON** format and click **Create**.
5. The `.json` file will download automatically.

### Step 2.6 — Place the file

```bash
cp ~/Downloads/<downloaded-file>.json /path/to/rise-in-harmony/apps/mobile/google-service-account.json
```

Verify it is gitignored (it is already listed as `google-service-account.json` in `apps/mobile/.gitignore`). **Never commit this file.**

---

## Part 3 — Configure EAS Secrets (One-time)

Before building, ensure all required environment variables are set as EAS secrets. Run the following from the `apps/mobile/` directory. Replace placeholder values with real keys from the respective dashboards.

```bash
cd apps/mobile

# API base URL (already set if previously configured — safe to re-run)
eas secret:create --scope project --name EXPO_PUBLIC_API_URL \
  --value "https://www.riseinharmony.com"

# RevenueCat iOS public API key
# Get from: RevenueCat Dashboard → Project → Apps → iOS App → Public API Key
eas secret:create --scope project --name EXPO_PUBLIC_RC_API_KEY_IOS \
  --value "appl_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# RevenueCat Android public API key
# Get from: RevenueCat Dashboard → Project → Apps → Android App → Public API Key
eas secret:create --scope project --name EXPO_PUBLIC_RC_API_KEY_ANDROID \
  --value "goog_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# PostHog analytics key
# Get from: PostHog → Project Settings → Project API Key
eas secret:create --scope project --name EXPO_PUBLIC_POSTHOG_KEY \
  --value "phc_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"

eas secret:create --scope project --name EXPO_PUBLIC_POSTHOG_HOST \
  --value "https://us.i.posthog.com"
```

To verify secrets are set: `eas secret:list`

---

## Part 4 — Configure RevenueCat

RevenueCat handles in-app purchase entitlements for the mobile app. This must be configured before the production build is submitted.

### Step 4.1 — Create the iOS App in RevenueCat

1. Log in to [https://app.revenuecat.com](https://app.revenuecat.com).
2. Navigate to your project → **Apps** → **+ New App**.
3. Select **App Store** as the platform.
4. Enter:
   - **App name:** Rise In Harmony
   - **Bundle ID:** `com.riseinharmony.app`
   - **App Store Connect API Key:** paste the contents of `AuthKey_LHBH9DWB4P.p8` (or the new key)
   - **Key ID:** `LHBH9DWB4P`
   - **Issuer ID:** `80f1a1d2-fbf9-47c1-95eb-618b72e89933`
5. Save. Note the **Public API Key** (starts with `appl_`) — this is `EXPO_PUBLIC_RC_API_KEY_IOS`.

### Step 4.2 — Create the Android App in RevenueCat

1. Navigate to **Apps** → **+ New App** → select **Google Play**.
2. Enter:
   - **App name:** Rise In Harmony
   - **Package name:** `com.riseinharmony.app`
   - **Google Credentials JSON:** paste the contents of `google-service-account.json`
3. Save. Note the **Public API Key** (starts with `goog_`) — this is `EXPO_PUBLIC_RC_API_KEY_ANDROID`.

### Step 4.3 — Import Products

Navigate to **Products** → **+ New Product** and create the following three products:

| Product Identifier | Store | Type | Price |
| :--- | :--- | :--- | :--- |
| `com.riseinharmony.premium.monthly` | App Store | Auto-renewable subscription | $7.99/month |
| `com.riseinharmony.premium.annual` | App Store | Auto-renewable subscription | $49.99/year |
| `com.riseinharmony.lifetime` | App Store | Non-consumable | $99.99 |
| `com.riseinharmony.premium.monthly` | Google Play | Subscription | $7.99/month |
| `com.riseinharmony.premium.annual` | Google Play | Subscription | $49.99/year |
| `com.riseinharmony.lifetime` | Google Play | One-time purchase | $99.99 |

> **Note on Lifetime pricing:** The web Stripe Founder tier is $149.99. The mobile IAP Lifetime is $99.99. These are intentionally separate products. Confirm the intended mobile price before creating the product in App Store Connect.

### Step 4.4 — Create the Entitlement

1. Navigate to **Entitlements** → **+ New Entitlement**.
2. Set **Identifier** to `premium`.
3. Attach all six products created above to this entitlement.

### Step 4.5 — Create the Default Offering

1. Navigate to **Offerings** → **+ New Offering**.
2. Set **Identifier** to `default`.
3. Add a **Package** for each product. Set the Annual package as the **default package** (shown first in the paywall).

### Step 4.6 — Register the Webhook

The server needs to receive RevenueCat events (renewals, cancellations, billing issues) to keep the database in sync.

1. Navigate to **Integrations** → **Webhooks** → **+ Add webhook**.
2. Set the **Webhook URL** to:
   ```
   https://www.riseinharmony.com/api/trpc/subscription.revenuecatWebhook
   ```
3. Set the **Authorization header** to `Bearer <your_secret>` where `<your_secret>` is a strong random string (e.g., 32 hex characters).
4. In Railway, set the environment variable `REVENUECAT_WEBHOOK_SECRET` to the same secret value (without the `Bearer ` prefix — the server prepends it automatically).
5. Click **Test webhook** from the RevenueCat dashboard and confirm the server returns `200 OK`.

---

## Part 5 — Build and Test

### Step 5.1 — Verify audio assets

```bash
cd /path/to/rise-in-harmony
node scripts/check-mobile-assets.mjs
```

Expected output: `[check-mobile-assets] OK — 18 required files present`

### Step 5.2 — Trigger the production build

```bash
cd apps/mobile
eas build --platform all --profile production
```

This will build both the iOS `.ipa` and the Android `.aab`. EAS will use the secrets set in Step 3. Monitor progress at [https://expo.dev](https://expo.dev) under the `humblehuman369` account.

### Step 5.3 — Test on physical devices

Before submitting, install and test the production build on at least one physical device per platform:

**iOS:** Download the `.ipa` from the EAS dashboard and install via TestFlight (upload the build to ASC first, then distribute internally) or via Apple Configurator.

**Android:** Download the `.apk` (or use the `.aab` via an internal track) and install on a physical Android device. Verify:
- Frequency playback works (try 528 Hz binaural)
- Alarm scheduling fires at the correct time
- Premium paywall loads packages from RevenueCat
- Restore Purchases works with a sandbox/test account
- Account deletion flow completes without error

---

## Part 6 — App Store Connect (iOS) — Manual Configuration

All of the following steps are performed in [App Store Connect](https://appstoreconnect.apple.com) under **My Apps → Rise In Harmony**.

### Step 6.1 — Create a Sandbox Tester

1. Go to **Users and Access → Sandbox → Testers**.
2. Click **+** to add a new tester.
3. Use a new email address that is not associated with a real Apple ID (e.g., `rih-sandbox-tester@yourdomain.com`).
4. Complete the email verification.
5. Note the tester email and password — you will enter these in the App Review Notes.

### Step 6.2 — Upload Screenshots

Navigate to **App Store → 1.1.0 Prepare for Submission → iPhone Screenshots**.

Upload the six captioned screenshots from `apps/mobile/store-listing/screenshots/captioned/`:

| Slot | File |
| :--- | :--- |
| iPhone 6.9" (required) | `rih_screenshot_01_alarm.png` through `rih_screenshot_06_home.png` |

The 6.5" and 6.1" slots are optional. If you want to populate them, use the files in `screenshots/iphone_65/` and `screenshots/iphone_61/` respectively.

### Step 6.3 — Upload the App Preview Video

Under **App Previews and Screenshots → iPhone 6.9"**, click **+** and upload:

```
apps/mobile/store-listing/app-preview/app-preview-20s-69inch.mp4
```

Specs: 1320×2868, H.264, 30fps, ~21 seconds.

### Step 6.4 — Paste Metadata

Copy the following values from `apps/mobile/store-listing/ios-metadata.json` into the corresponding fields in ASC:

| ASC Field | Value |
| :--- | :--- |
| Name | `Rise In Harmony` |
| Subtitle | `Healing Frequencies & Alarm` |
| Promotional Text | *(from `promotionalText` in ios-metadata.json)* |
| Description | *(from `description` in ios-metadata.json)* |
| Keywords | `solfeggio,432hz,528hz,binaural,isochronic,chakra,truehz,sleep,meditate,wake,relax,calm,stress,focus` |
| Support URL | `https://www.riseinharmony.com` |
| Marketing URL | `https://www.riseinharmony.com` |
| Privacy Policy URL | `https://www.riseinharmony.com/privacy` |

### Step 6.5 — Complete the App Privacy (Nutrition Label)

Navigate to **App Privacy** and answer the questionnaire as follows:

**Do you collect data?** → **Yes**

| Data Type | Linked to Identity? | Used for Tracking? | Purposes |
| :--- | :--- | :--- | :--- |
| Purchases → Purchase History | No | No | App Functionality |
| Identifiers → User ID | No | No | App Functionality, Analytics |
| Usage Data → Product Interaction | No | No | Analytics |

All other data types (Contact Info, Health & Fitness, Location, etc.) → **Not Collected**.

**Tracking:** No → the ATT prompt is not required.

### Step 6.6 — Complete the Age Rating Questionnaire

Navigate to **App Information → Age Rating** and complete the questionnaire. All categories should be set to **None** or **No**, resulting in a final rating of **4+**.

### Step 6.7 — Attach In-App Purchases to the Version

Navigate to **1.1.0 → In-App Purchases** and click **+** to attach:
- `com.riseinharmony.premium.monthly` (Premium Monthly)
- `com.riseinharmony.premium.annual` (Premium Annual)
- `com.riseinharmony.lifetime` (Premium Lifetime)

Ensure all three products have status **Ready to Submit** before proceeding.

### Step 6.8 — Select the Build

Navigate to **1.1.0 → Build** and click **+** to select the production build uploaded by EAS (Build 50). If the build is not yet processed, wait 10–30 minutes after the EAS build completes.

### Step 6.9 — Paste App Review Notes

Navigate to **1.1.0 → App Review Information** and paste the following into the **Notes** field:

```
Rise In Harmony is a wellness app that plays healing frequencies (Solfeggio and
binaural tones), TrueHz meditation sessions, a layered Sound Studio, and
scheduled healing alarms.

NO LOGIN REQUIRED for free features. 432Hz and 528Hz alarm tones are free for
all users.

TEST ACCOUNT: Use any App Store Sandbox tester for Premium / IAP.
Free path: open app → Alarm → create alarm with Deep Sleep Wake sequence (free)
→ Player or Meditate → play a free session.

NEW IN 1.1.0: Deep Sleep Wake sequence (δ→θ→α brainwave sweep), Sleep Profile
selector, 4-stage volume escalation, seekable meditation progress bar.

PERMISSIONS:
• Notifications — healing alarms at user-scheduled times (prompted when user
  creates an alarm).
• Microphone usage string — required by the audio engine dependency; the app
  does not record microphone audio.
• Background audio — continues frequency/meditation playback when screen locked.

IN-APP PURCHASES: Monthly ($7.99), Annual ($49.99), Lifetime ($99.99).
Entitlement: premium.

Please use headphones for binaural demos.
```

Also enter the sandbox tester email and password created in Step 6.1 in the **Sign-In Information** fields.

### Step 6.10 — Submit for Review

Click **Submit for Review**. Typical review time is 1–3 business days for a new version.

---

## Part 7 — Google Play Console (Android) — Manual Configuration

All of the following steps are performed in the [Google Play Console](https://play.google.com/console) under **Rise In Harmony → com.riseinharmony.app**.

### Step 7.1 — Upload the AAB via EAS

After the EAS build completes, run:

```bash
cd apps/mobile
eas submit --platform android --latest --profile production
```

This uploads the `.aab` to the **Internal testing** track (as configured in `eas.json`). Alternatively, download the `.aab` from the EAS dashboard and upload it manually via Play Console → **Internal testing → Create new release**.

### Step 7.2 — Complete the Store Listing

Navigate to **Store Presence → Main Store Listing** and fill in the following fields using the values from `apps/mobile/store-listing/google-play-metadata.json`:

| Field | Value |
| :--- | :--- |
| App name | `Rise In Harmony` |
| Short description | `Healing frequencies, TrueHz meditations & gentle alarm. Wake in harmony.` |
| Full description | *(copy from `google-play-metadata.json` → `fullDescription`)* |

### Step 7.3 — Upload Graphics

Navigate to **Store Presence → Main Store Listing → Graphics**:

| Asset | File | Location |
| :--- | :--- | :--- |
| Feature Graphic (1024×500) | `feature-graphic-1024x500.png` | `apps/mobile/store-listing/` |
| Phone Screenshots | `rih_screenshot_01_alarm.png` through `rih_screenshot_06_home.png` | `apps/mobile/store-listing/screenshots/captioned/` |
| App Icon (512×512) | Resize `assets/icon.png` to 512×512 | `apps/mobile/assets/icon.png` |

To generate the 512×512 icon:
```bash
python3 -c "
from PIL import Image
img = Image.open('apps/mobile/assets/icon.png').resize((512, 512), Image.LANCZOS)
img.save('apps/mobile/store-listing/play-store-icon-512x512.png')
print('Saved 512x512 icon')
"
```

### Step 7.4 — Complete the Data Safety Form

Navigate to **Policy → Data safety** and complete the questionnaire matching the App Privacy answers from Step 6.5:

- **Location data:** No
- **Personal info:** No (email is not collected by the app directly)
- **Financial info:** No (handled by Google Play billing, not the app)
- **App activity:** Yes — App interactions (anonymous, not linked to identity)
- **App info and performance:** No
- **Device or other IDs:** Yes — Device or other IDs (anonymous app user ID for RevenueCat/PostHog)

### Step 7.5 — Set Content Rating

Navigate to **Policy → App content → Content rating**. Complete the IARC questionnaire. The app should receive a rating of **Everyone** (PEGI 3 / Everyone).

### Step 7.6 — Set up In-App Products

Navigate to **Monetize → Products → In-app products** and create:

| Product ID | Type | Price | Name |
| :--- | :--- | :--- | :--- |
| `com.riseinharmony.premium.monthly` | Subscription | $7.99/month | Premium Monthly |
| `com.riseinharmony.premium.annual` | Subscription | $49.99/year | Premium Annual |
| `com.riseinharmony.lifetime` | One-time | $99.99 | Premium Lifetime |

Activate each product after creation.

### Step 7.7 — Promote from Internal to Production

Once internal testing is complete and the build is verified on physical Android devices:

1. Navigate to **Release → Production → Create new release**.
2. Select the AAB uploaded in Step 7.1.
3. Add release notes (copy from `ios-metadata.json` → `whatsNew`).
4. Click **Review release** and then **Start rollout to Production** (or choose a staged rollout percentage).

---

## Part 8 — Post-Launch Checklist

After both stores have approved the app, complete the following:

| Task | Details |
| :--- | :--- |
| Update `RESEND_FROM_EMAIL` in Railway | Change from `hello@riseinharmony.app` to `hello@riseinharmony.com` |
| Update `RIH_ADMIN_EMAILS` in Railway | Replace `you@example.com` with the real admin email |
| Register Stripe webhook | Point `https://www.riseinharmony.com/api/billing/webhook` at Stripe dashboard → Webhooks |
| Monitor RevenueCat webhook | Check RevenueCat dashboard for successful event deliveries within 24 hours of first purchase |
| Reply to first reviews | Respond to all App Store and Play Store reviews within 24 hours of launch |
| Schedule 1.1.1 polish update | Plan a small update within 2 weeks to address any launch-day issues |
