# How We Built This Project — Step by Step

This is a build walkthrough for the **Stream Audio Call Demo**: a 1-to-1 audio
calling app (Expo + React Native + the Stream Video SDK) backed by a tiny Express
"directory" server that hands out IDs and mints tokens.

It explains **what we built, in what order, and why** — so you could rebuild it
from scratch or understand any single piece. If you just want to run it, see
[README.md](README.md), [SETUP.md](SETUP.md), and [TESTING.md](TESTING.md).

---

## The goal

Three ways for two people to end up in the same audio-only call:

1. **Call by ID** — everyone gets a unique 3-digit ID. Type someone's ID and it
   **rings their phone** (even backgrounded or killed, via push).
2. **Start a Call** — create a call, share a 6-character code.
3. **Join with Code** — type a code someone shared.

All three converge on the same in-call screen. Audio only, max 2 people.

```
phone  ──register / lookup / token──►  server (Express)  ──mints real tokens──►  Stream
  │                                                                               ▲
  └───────────────────────  Stream Video SDK (calls + ringing)  ──────────────────┘
```

---

## Step 1 — Scaffold the Expo app

We started from a blank Expo app. The key early decision: this app uses **native
modules** (WebRTC, Firebase, CallKit/Telecom), so it can **not** run in Expo Go.
It needs a **dev client / EAS Build**.

Dependencies that define the stack (`package.json`):

| Package | Why it's here |
|---|---|
| `expo` (SDK 56) + `expo-dev-client` | App framework, custom native runtime |
| `@stream-io/video-react-native-sdk` | The calling engine (calls, ringing, state) |
| `@stream-io/react-native-webrtc` + `@config-plugins/react-native-webrtc` | The actual audio transport + its native config |
| `@stream-io/react-native-callingx` | Native incoming-call UI (CallKit / Android Telecom) |
| `@react-native-firebase/app` + `/messaging` | FCM push so a call can ring a killed app |
| `@react-native-async-storage/async-storage` | Persist the logged-in user |
| `expo-clipboard` | Copy/share the call code |
| `react-native-gesture-handler`, `reanimated`, `svg` | Required by the Stream call UI components |

`app.json` and `eas.json` wire up the build (config plugins, the Firebase file,
the `EXPO_PUBLIC_*` env vars that get baked into the binary).

---

## Step 2 — Build the directory + token server

Before the app could authenticate to Stream, we needed something that owns the
**API secret** (which must never ship inside the app). That's [`server/`](server/),
a ~120-line Express app.

### 2a. The user store — [`server/store.js`](server/store.js)

A dependency-free JSON file store (`users.json`). Its whole job is to allocate a
stable **3-digit ID** per email and map it to a Stream user id:

- IDs run `100`–`999` (900 slots). `nextFreeId()` hands out the first free one.
- `register({name, email})` is **idempotent**: a known email always returns the
  same record, so reinstalling the app keeps your ID.
- The Stream user id is just `user-<id>` (e.g. ID `247` → `user-247`).

```js
function register({ name, email }) {
  const existing = findByEmail(email);
  if (existing) return existing;          // keep your ID
  const id = nextFreeId(load());          // first free 100–999
  const record = { id, name, email, streamUserId: `user-${id}`, createdAt: ... };
  save({ ...users, [id]: record });
  return record;
}
```

### 2b. The HTTP API — [`server/index.js`](server/index.js)

Three endpoints, plus `/health`:

| Route | Purpose |
|---|---|
| `POST /register` | `{name,email}` → `{id, streamUserId, token, name}` |
| `GET /users/:id` | Look up a 3-digit ID before ringing it |
| `POST /token` | Mint/refresh a token for a known `streamUserId` |

The critical part is **minting real Stream tokens** with the server-side SDK and
the secret:

```js
const stream = new StreamClient(API_KEY, API_SECRET);
function mintToken(streamUserId) {
  return stream.generateUserToken({ user_id: streamUserId, validity_in_seconds: 86400 });
}
```

Because these are real tokens, you can turn **off** "Disable Auth Checks" in the
Stream dashboard. On register we also `upsertUsers()` so the Stream-side user has
a friendly display name (best-effort — not fatal if it fails).

Secrets live only in `server/.env` (gitignored), never in the app.

---

## Step 3 — Talk to the server from the app

[`src/api.js`](src/api.js) is a thin `fetch` wrapper around those three routes.
Two design choices made it robust for on-device testing:

- **Configurable base URL.** It defaults to `EXPO_PUBLIC_API_URL` (baked at build
  time) but can be **overridden at runtime** and read lazily — so if your LAN IP
  or tunnel URL changes you don't need to rebuild.
- **Defensive networking.** A 12-second `AbortController` timeout and friendly
  error messages ("Can't reach the server…") so the UI never spins forever.

[`src/storage.js`](src/storage.js) persists two things in AsyncStorage: the
logged-in user (`{id, name, email, streamUserId}`) and the optional server-URL
override. This is what makes auto-login and the stable ID work across restarts.

---

## Step 4 — Auth flow: register once, stay logged in

[`src/LoginScreen.js`](src/LoginScreen.js) collects a name + email (with email
validation) and calls `onRegister`.

[`App.js`](App.js) is the brain of auth and the Stream client:

1. **On boot**, it loads any saved server-URL override, then the saved user. If a
   user exists, it builds a Stream client and skips straight past login.
2. **On register**, it POSTs to `/register`, saves the returned record, and builds
   the client.

The client is created with two deliberate choices:

```js
StreamVideoClient.getOrCreateInstance({   // getOrCreate, not `new` -> survives backgrounding
  apiKey: API_KEY,
  user: { id: user.streamUserId, name: user.name },
  tokenProvider: () => api.fetchToken(user.streamUserId),  // refreshes on reconnect
});
```

- `getOrCreateInstance` (not `new`) reuses one client so call state survives the
  app going to the background.
- `tokenProvider` means the SDK fetches a fresh token from our `/token` route
  whenever it (re)connects — tokens expire after a day, this keeps sessions alive.

---

## Step 5 — The three ways to start a call

All three live in [`App.js`](App.js) and share one
`AUDIO_SETTINGS_OVERRIDE` (`max_participants: 2`, mic on, speaker default):

### 5a. Call by ID (rings the other phone)
Look up the target via `/users/:id`, then create a **ringing** call to a random,
non-shareable id:

```js
const call = client.call('default', randomRingCallId());
await call.getOrCreate({
  ring: true,
  data: { members: [{user_id: me}, {user_id: target}], settings_override: AUDIO_SETTINGS_OVERRIDE },
});
```

`ring: true` is what makes Stream push a ringing event to the callee. The caller
auto-joins once the callee accepts.

### 5b. Start a Call (shareable code)
Generate a 6-char human-friendly code (no confusing `0/O/1/I` — see
[`src/utils.js`](src/utils.js)), turn it into a call id (`audio-<code>`), and join
with `create: true`.

### 5c. Join with Code
Convert the code to the same `audio-<code>` id, `call.get()` to verify it exists,
**guard the 2-person limit**, then join. Errors map to friendly alerts
("Call not found", "Call is full").

Why two id schemes? Ring calls use a random `ring-...` id (not guessable, not
shared); code calls use `audio-<code>` so the code can be recovered from the id
later (`codeFromCallId`) to show the code card in-call.

---

## Step 6 — One controller to rule all call UI

[`src/CallController.js`](src/CallController.js) is mounted inside `<StreamVideo>`
and derives **everything** from `useCalls()`. This is the trick that makes a call
show up correctly no matter how it started:

- `active` → a call we're JOINED/JOINING/RECONNECTING in → render `CallScreen`.
- `ringing` → split into **incoming** (`!isCreatedByMe`) vs **outgoing** → render
  Stream's `RingingCallContent`.
- otherwise → render `HomeScreen`.

It also handles two real-world edge cases:

- **Busy:** if a ring arrives while we're already in a call, auto-decline it with
  `reason: 'busy'` so the caller learns immediately.
- **Outcome alerts:** for an outgoing ring, it listens for `call.rejected` and
  shows "Call declined" / "User is busy" / "No answer".

---

## Step 7 — The shared in-call screen

[`src/CallScreen.js`](src/CallScreen.js) renders both flows identically:

- Reads participants and mic state via Stream's `useCallStateHooks`.
- **Enforces audio-only**: `call.camera.disable()` on mount (the ring flow
  auto-joins, so this is the reliable place to guarantee the camera never
  publishes).
- Shows the **code card** only for code calls (`codeFromCallId` returns a code);
  ring calls show "Connected" instead.
- Mute toggle, Leave, a speaking indicator (green ring), and copy/share for the
  code.

---

## Step 8 — Ringing a killed app (push)

This is the hardest part and why the native modules exist. Configured in
[`index.js`](index.js) — **outside React, at the entry point** — because an
incoming call can cold-start the app from a killed state:

```js
StreamVideoRN.setPushConfig({
  isExpo: true,
  shouldRejectCallWhenBusy: true,
  android: { pushProviderName: 'firebase-video', incomingChannel: {...} },
  ios:     { pushProviderName: 'apn-video', supportsVideo: false },
  createStreamVideoClient: async () => { /* rebuild client from stored user */ },
});
```

- The native layer (CallKit on iOS, Telecom + notifee on Android) draws the
  full-screen incoming call.
- On accept, it cold-starts the app and calls `createStreamVideoClient` so the SDK
  can join — which is why that callback rebuilds the client from the **stored**
  user (no React state exists yet).
- The whole block is wrapped in `try/catch` so a no-push build still launches and
  rings-while-open still works.

The provider names must match what you create in the Stream dashboard — the manual
Firebase + Stream push-provider setup is documented in [SETUP.md](SETUP.md).

---

## Step 9 — Build & test on real devices

Push ringing and WebRTC can't run in Expo Go or a simulator alone, so we build a
real binary:

```bash
eas build --profile preview --platform android
```

`EXPO_PUBLIC_API_URL` must be your machine's **LAN IP** (not `localhost`) and is
baked into the build — change it and you rebuild (or use the in-app Server
settings override). The 2-device test script is in [TESTING.md](TESTING.md).

---

## How a single call flows (end to end)

Putting it together — "Call by ID" from a killed callee:

1. Caller types `247` → app `GET /users/247` to confirm the user exists.
2. Caller creates a ringing call with both members → Stream sends a ring.
3. Stream pushes an FCM notification → the callee's killed app shows a native
   full-screen incoming call.
4. Callee taps Accept → app cold-starts → `createStreamVideoClient` rebuilds the
   client from stored user → SDK joins the call.
5. `useCalls()` in `CallController` flips to JOINED on both phones → both render
   `CallScreen` → cameras disabled, mics on → talking.
6. Either taps Leave → `call.leave()` → back to `HomeScreen`.

---

## File map (build order)

```
server/store.js        Step 2a — ID allocation + JSON user store
server/index.js        Step 2b — register / lookup / token endpoints (mints real tokens)
src/api.js             Step 3  — client for the server (runtime-configurable URL)
src/storage.js         Step 3  — AsyncStorage persistence (user + server URL)
src/utils.js           Step 5  — code/id helpers + validators
src/LoginScreen.js     Step 4  — name + email registration
App.js                 Steps 4–5 — boot/auth, Stream client, the 3 call entry points
src/HomeScreen.js      Step 5  — the 3 sections UI
src/CallController.js  Step 6  — app-wide ringing watcher + in-call routing
src/CallScreen.js      Step 7  — shared in-call UI
index.js               Step 8  — push config (runs before React)
```

---

## Key takeaways (the non-obvious bits)

- **The secret never ships.** All tokens are minted server-side; the app only ever
  sees short-lived tokens via `tokenProvider`.
- **One client instance** (`getOrCreateInstance`) and **all UI derived from
  `useCalls()`** is what makes background/cold-start and "ring over any screen"
  work without tangled state.
- **Push config must live outside React** because the app may not be running when
  a call arrives.
- **Two id schemes** (`ring-*` vs `audio-*`) cleanly separate private ring calls
  from shareable code calls while reusing one in-call screen.
