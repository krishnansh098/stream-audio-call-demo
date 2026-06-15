# 2-device test script

You need two Android phones (call them **A** and **B**), both with the EAS
**preview** APK installed, both on the **same Wi-Fi** as the machine running the
server. (Killed-state push works from anywhere once SETUP.md is done.)

## Prep

1. Server running on your computer:
   ```bash
   cd server
   npm install        # first time only
   npm start          # prints the LAN URL it expects
   ```
2. `EXPO_PUBLIC_API_URL` (in `.env` for local, in `eas.json` for the build)
   points at that LAN IP, e.g. `http://192.168.1.20:3000`. If you change it you
   must rebuild the APK (it's baked in at build time).

## 1. Register on both phones
- A: open app → enter name + email → **Register** → note the ID (e.g. **A=100**).
- B: same → note the ID (e.g. **B=101**).
- Kill and reopen each app → it should **skip login** and keep the same ID
  (persistence). 
- Try registering B's email again on a 3rd attempt → same ID returned (no dupe).
- Enter a bad email → blocked with a validation message.

## 2. Ring by ID — app OPEN (foreground)
- B keeps the app open on the home screen.
- A: **Call by ID** → type **101** → **Call**.
- ✅ A sees the outgoing/“calling” screen; B sees a full incoming-call screen
  with A's name + Accept/Decline + ringtone.
- B taps **Accept** → both land in the audio call (avatars, Mute, Leave).
- Talk to confirm two-way audio. Either taps **Leave** → both return home.

## 3. Ring by ID — app in BACKGROUND
- B presses Home (app backgrounded, still running).
- A calls **101** again.
- ✅ B gets the incoming call (heads-up / full-screen) → Accept → in call.

## 4. Ring by ID — app KILLED  (requires SETUP.md done)
- B swipes the app away (killed).
- A calls **101**.
- ✅ B's phone shows the native full-screen incoming call even though the app was
  killed → Accept cold-starts the app straight into the call.

## 5. Edge cases (ring by ID)
- **Decline:** A calls B, B taps **Decline** → A sees “Call declined”.
- **No answer:** A calls B, nobody touches B → after the ring timeout A sees
  “No answer”.
- **Cancel:** A calls B then taps hang up before B answers → B's incoming screen
  disappears.
- **Unknown ID:** A calls **999** (nobody) → “No user with ID 999.”
- **Own ID:** A calls **100** (itself) → blocked with “That's your own ID”.

## 6. Code flow still works (regression)
- A: **Start a Call** → lands in call, shows a 6-char **code**.
- B: **Join with Code** → type that code → **Join Call** → both in the same call.
- Confirm two-way audio, Mute, Leave.

## 7. Busy handling
- A and B are in a **code call** together (from step 6) — or A is in any call.
- From a 3rd phone C (or re-use after leaving), call A's ID while A is in the call.
- ✅ The caller immediately gets **“User is busy”**; A is not interrupted.

## Tips
- Server logs each `/register`, `/users/:id`, `/token` hit — watch them to debug.
- If a call never connects, check `EXPO_PUBLIC_API_URL` is the LAN IP (not
  localhost) and that both phones can reach it (same network, firewall open on
  the server port).
- If killed-state ringing doesn't fire, re-check SETUP.md steps C (provider
  **Name** must equal `firebase-video`) and D (google-services.json in the build).
