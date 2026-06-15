import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import {
  StreamVideoClient,
  StreamVideoRN,
} from '@stream-io/video-react-native-sdk';

import App from './App';
import { loadUser } from './src/storage';
import { fetchToken } from './src/api';

const API_KEY = process.env.EXPO_PUBLIC_STREAM_API_KEY;

// Provider names MUST match the push configuration you create in the Stream
// dashboard (see SETUP.md). Change these only if you name them differently there.
const ANDROID_PUSH_PROVIDER = 'firebase-video';
const IOS_PUSH_PROVIDER = 'apn-video';

// Push config MUST be set at the entry point (outside React), because the app
// can be cold-started from a killed state by an incoming-call push. The native
// CallKit (iOS) / Telecom + notifee (Android) layer renders the full-screen
// incoming call; on accept it cold-starts the app and asks us for a client via
// createStreamVideoClient so it can join the call.
try {
  StreamVideoRN.setPushConfig({
    isExpo: true,
    // Auto-decline an incoming ring while already in a call.
    shouldRejectCallWhenBusy: true,
    android: {
      pushProviderName: ANDROID_PUSH_PROVIDER,
      incomingChannel: {
        id: 'stream_incoming_call',
        name: 'Incoming calls',
        sound: 'default',
        vibration: true,
      },
      titleTransformer: (memberName, incoming) =>
        incoming ? `${memberName} is calling you` : `Calling ${memberName}`,
    },
    ios: {
      pushProviderName: IOS_PUSH_PROVIDER,
      supportsVideo: false,
    },
    // Builds (or reuses) the client when a push needs to act on a call in the
    // background. Returns undefined if nobody is logged in -> the push is ignored.
    createStreamVideoClient: async () => {
      const user = await loadUser();
      if (!user || !API_KEY) return undefined;
      return StreamVideoClient.getOrCreateInstance({
        apiKey: API_KEY,
        user: { id: user.streamUserId, name: user.name },
        tokenProvider: () => fetchToken(user.streamUserId),
      });
    },
  });
} catch (e) {
  // Never let push setup crash app launch (e.g. native module missing in a
  // no-push build). Ringing-while-open still works without push.
  console.warn('Push config not set:', e?.message ?? e);
}

registerRootComponent(App);
