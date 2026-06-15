# Stream Audio Call Demo

A 1-to-1 audio calling app built with Expo and the Stream Video React Native SDK.
Three ways to connect, all ending in the same audio-only call (max 2 people):

1. **Call by ID** — register to get a unique 3-digit ID, type someone's ID and it
   **rings their phone** (foreground, background, or killed via push notifications).
2. **Start a Call** — create a call and share a 6-character code.
3. **Join with Code** — enter a code someone shared.

## Stack

- Expo SDK 56 (dev client / EAS Build - **not** Expo Go, it uses native modules)
- `@stream-io/video-react-native-sdk` + `@stream-io/react-native-webrtc`
- `@stream-io/react-native-callingx` + `@react-native-firebase/*` for ringing push
- A small Express directory/token service in [`server/`](server/)

## How it fits together

```
phone  ──register/lookup/token──►  server (Express)  ──mints real tokens──►  Stream
  │                                                                            ▲
  └────────────────────────  Stream Video SDK (calls, ringing)  ──────────────┘
```

- The **server** assigns each email a stable 3-digit ID, maps it to a Stream user
  id `user-<id>`, and mints **real** Stream tokens with the API secret (so you can
  turn off "Disable Auth Checks"). The secret never ships in the app.
- The app persists `{id, name, email}` with AsyncStorage, so you stay logged in and
  keep the same ID across restarts.
- Ringing uses Stream's ring flow; an app-level `useCalls()` watcher shows the
  incoming/outgoing UI over any screen, and FCM push (callingx) handles the
  killed-state full-screen incoming call.

## Setup

```bash
# 1. App deps
npm install
cp .env.example .env        # set EXPO_PUBLIC_STREAM_API_KEY + EXPO_PUBLIC_API_URL

# 2. Server
cd server
npm install
cp .env.example .env        # set STREAM_API_KEY + STREAM_API_SECRET
npm start                   # listens on :3000, prints the LAN URL to use
```

`EXPO_PUBLIC_API_URL` must be your computer's **LAN IP** (e.g.
`http://192.168.1.20:3000`) for on-device testing — not `localhost`. It's baked
into the build, so rebuild if you change it.

For background / killed-state **push ringing**, follow [SETUP.md](SETUP.md) (Firebase
project + Stream push provider — the manual dashboard steps). The app builds and
rings while open without it.

## Build & run

```bash
eas build --profile preview --platform android
```

Then follow [TESTING.md](TESTING.md) for the 2-device test script.

## Project layout

```
App.js                 boot/auth, Stream client (tokenProvider), the 3 call entry points
index.js               push config (StreamVideoRN.setPushConfig) - runs before the app
src/LoginScreen.js     name + email registration
src/HomeScreen.js      the 3 sections: Call by ID / Start a Call / Join with Code
src/CallController.js  app-wide ringing watcher (incoming/outgoing/busy) + in-call routing
src/CallScreen.js      shared in-call UI (mute, leave, code card for code calls)
src/api.js             client for the directory service
src/storage.js         AsyncStorage persistence of the logged-in user
src/utils.js           call-code / call-id helpers, validators
server/                Express directory + token service
```

## Notes

- Audio-only: the camera is disabled on entering any call and `mic_default_on` is
  set; `max_participants` is 2 (server-side) with a client-side guard for code joins.
- Both ring calls and code calls render the same `CallScreen`.
- Busy: an incoming ring while you're already in a call is auto-declined and the
  caller sees "User is busy".
