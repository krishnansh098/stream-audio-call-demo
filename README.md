# Stream Audio Call Demo

A small 1-to-1 audio calling app built with Expo and the Stream Video React Native SDK.
You pick a name, start a call, and share the 6-character code so someone else can join.
Audio only, capped at 2 participants per call.

## Stack

- Expo SDK 56 (dev client / EAS Build - not Expo Go, since it uses native WebRTC)
- @stream-io/video-react-native-sdk
- @stream-io/react-native-webrtc

## Setup

```bash
npm install
cp .env.example .env   # then put your Stream API key in it
```

You need a Stream Video app from https://dashboard.getstream.io. For this demo the
client generates a development token locally, which only works while "Disable Auth
Checks" is turned on for your app in the dashboard. Don't ship that to production -
generate tokens on your own backend with the API secret instead.

Set the key in two places:
- `.env` -> `EXPO_PUBLIC_STREAM_API_KEY` for local development
- `eas.json` env blocks for EAS builds

## Running

```bash
# Android build you can install on a device/emulator
eas build --profile preview --platform android
```

Once installed, open it on two devices: start a call on one, copy the code, enter it
on the other.

## Project layout

```
App.js              screens + Stream client wiring (login / home / call)
src/HomeScreen.js   start or join a call
src/CallScreen.js   in-call UI, mute, leave, share code
src/devToken.js     local dev-token generator (demo only)
src/utils.js        call-code + user-id helpers
```

## Notes

- The call is forced audio-only: the camera is disabled right after joining and
  `mic_default_on` is set in the call settings.
- `max_participants` is set to 2 on the server side, with a client-side guard before
  joining so a third person gets a "call is full" message.
