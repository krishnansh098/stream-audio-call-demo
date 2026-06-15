# SETUP — Firebase + Stream dashboard (manual steps)

The code is done. These are the steps **only you can do** in external dashboards.
You need them for **background / killed-state ringing** (push notifications). The
app already builds and rings while it's open/foregrounded without any of this —
push is what makes a killed phone ring.

Order: **A) Stream auth →  B) Firebase →  C) Stream push →  D) build env.**

---

## A. Stream — secret + turn off dev auth

1. Go to https://dashboard.getstream.io → your Video app → **Overview**.
2. Copy the **Secret** (the long one next to the API key `qrp6sc4qxppt`).
3. In `server/`, copy `.env.example` → `.env` and paste:
   ```
   STREAM_API_KEY=qrp6sc4qxppt
   STREAM_API_SECRET=<the secret you just copied>
   ```
4. Because the server now mints **real** tokens, you can turn **OFF**
   *"Disable Auth Checks"* in the dashboard (App settings). Optional but recommended.

---

## B. Firebase — create the project & get `google-services.json`

1. https://console.firebase.google.com → **Add project** (e.g. `stream-call-demo`).
   Analytics is optional; skip it if you like.
2. On the project dashboard click the **Android** icon (“Add app”).
   - **Android package name:** `com.demo.streamcall` ← must match exactly.
   - Nickname / debug SHA-1: leave blank. Click **Register app**.
3. Click **Download google-services.json**.
4. Put that file at the **project root**, next to `app.json`:
   ```
   stream-call-demo/google-services.json
   ```
   (It's gitignored. For EAS, see step D.)
5. Skip the remaining "add SDK / gradle" pages in the wizard — the Expo config
   plugin (`@react-native-firebase/app`, already in `app.json`) wires the native
   side for you. Click **Continue to console**.

### Get the credential Stream needs (for step C)
6. Firebase console → **⚙ (gear) → Project settings → Service accounts** tab.
7. **Firebase Admin SDK → Generate new private key → Generate key.**
   A JSON file downloads (e.g. `stream-call-demo-firebase-adminsdk-xxxx.json`).
   This is the **service-account JSON** (HTTP v1 credential). Keep it private.

---

## C. Stream — register the Firebase push provider

1. https://dashboard.getstream.io → your app → **Push notifications** (under Video & Audio / Moderation depending on dashboard version).
2. **Add configuration → Firebase.**
3. **Name:** type exactly
   ```
   firebase-video
   ```
   ⚠️ This string must match `ANDROID_PUSH_PROVIDER` in [index.js](index.js) (it's
   `firebase-video`). If you name it differently here, change it there too.
4. **Credentials:** open the service-account JSON from step B.7, copy its entire
   contents, and paste into the **Credentials** / **Server key (JSON)** box.
5. Enable the toggle and **Save**.

That's it — Android push is configured.

---

## D. Build env — make `google-services.json` available to EAS

EAS Build respects `.gitignore`, so the gitignored `google-services.json` won't
be uploaded automatically. Pick **one**:

- **Easiest (private repos):** remove the `google-services.json` line from
  `.gitignore` and commit the file. Then `eas build` just works.
- **Recommended (this repo is public):** upload it as an EAS file secret:
  ```bash
  eas env:create --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --visibility secret --environment preview
  ```
  then in `app.json` set `"android": { "googleServicesFile": "$GOOGLE_SERVICES_JSON" }`.
  (Keep the local file at the root for local prebuilds.)

Then build:
```bash
eas build --profile preview --platform android
```

---

## iOS (NOT needed for Android testing — requires a paid Apple Developer account)

The code/config already supports iOS, but to actually ring an iPhone you must:

1. Apple Developer → create an **APNs Auth Key (.p8)** (Keys → enable Apple Push
   Notifications service). Note the **Key ID** and your **Team ID**.
2. Add an **iOS app** in Firebase (bundle id `com.demo.streamcall`), download
   `GoogleService-Info.plist`, place at project root.
3. Stream dashboard → Push notifications → **Add configuration → APN** →
   **Name:** `apn-video` (matches `IOS_PUSH_PROVIDER` in `index.js`) → upload the
   `.p8`, Key ID, Team ID, bundle id, choose **VoIP**.
4. Build with a real Apple account (`eas build --platform ios`) and test on a
   **physical device** (push doesn't work in the simulator).

Until this is done, iOS simply won't ring via push; everything else still works.

---

## Quick sanity check after setup

- `google-services.json` is at the repo root and its `package_name` is `com.demo.streamcall`.
- Stream push provider **Name** = `firebase-video` (matches `index.js`).
- `server/.env` has a real `STREAM_API_SECRET`.
- `EXPO_PUBLIC_API_URL` (in `.env` / `eas.json`) points at your server's LAN IP.
