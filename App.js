import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  StreamVideo,
  StreamVideoClient,
} from '@stream-io/video-react-native-sdk';

import LoginScreen from './src/LoginScreen';
import CallController from './src/CallController';
import * as api from './src/api';
import { loadUser, saveUser, loadApiUrl, saveApiUrl } from './src/storage';
import {
  codeToCallId,
  generateCallCode,
  randomRingCallId,
} from './src/utils';

const API_KEY = process.env.EXPO_PUBLIC_STREAM_API_KEY;
const MAX_PARTICIPANTS = 2;

// Audio-only, 2-person settings applied to every call we create.
const AUDIO_SETTINGS_OVERRIDE = {
  limits: { max_participants: MAX_PARTICIPANTS },
  audio: { mic_default_on: true, default_device: 'speaker' },
};

function createClient(user) {
  // getOrCreateInstance (not `new`) so call state survives backgrounding, and a
  // server-minted token via tokenProvider so it refreshes on reconnect.
  return StreamVideoClient.getOrCreateInstance({
    apiKey: API_KEY,
    user: { id: user.streamUserId, name: user.name },
    tokenProvider: () => api.fetchToken(user.streamUserId),
  });
}

export default function App() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState(null);
  const [client, setClient] = useState(null);
  const [busy, setBusy] = useState(false);
  const [apiUrl, setApiUrlState] = useState(api.getApiBaseUrl());
  const clientRef = useRef(null);

  // Auto-login from storage so the same 3-digit ID persists across restarts.
  useEffect(() => {
    (async () => {
      try {
        // Apply a saved server-URL override before anything talks to the server.
        const savedUrl = await loadApiUrl();
        if (savedUrl) {
          api.setApiBaseUrl(savedUrl);
          setApiUrlState(api.getApiBaseUrl());
        }
        const saved = await loadUser();
        if (saved && API_KEY) {
          const c = createClient(saved);
          clientRef.current = c;
          setClient(c);
          setUser(saved);
        }
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  // Update the directory server URL at runtime (no rebuild needed). The client's
  // tokenProvider reads the URL lazily, so existing sessions pick this up too.
  const handleSetApiUrl = useCallback(async (url) => {
    const clean = (url || '').trim();
    api.setApiBaseUrl(clean);
    await saveApiUrl(clean);
    setApiUrlState(api.getApiBaseUrl());
  }, []);

  const handleRegister = useCallback(async (name, email) => {
    if (!API_KEY) {
      Alert.alert(
        'Missing API key',
        'Set EXPO_PUBLIC_STREAM_API_KEY in .env (local) and eas.json (EAS builds).'
      );
      return;
    }
    setBusy(true);
    try {
      const res = await api.register({ name, email });
      const registered = {
        id: res.id,
        name: res.name,
        email: email.trim(),
        streamUserId: res.streamUserId,
      };
      await saveUser(registered);
      const c = createClient(registered);
      clientRef.current = c;
      setClient(c);
      setUser(registered);
    } catch (e) {
      Alert.alert('Registration failed', e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  // 1. Direct call by 3-digit ID -> rings the target phone.
  const callById = useCallback(
    async (targetId) => {
      if (!clientRef.current || !user) return;
      if (targetId === String(user.id)) {
        Alert.alert("That's your own ID", 'Enter someone else’s ID to call them.');
        return;
      }
      setBusy(true);
      try {
        const target = await api.lookupUser(targetId);
        if (!target?.exists) {
          Alert.alert('User not found', `No user with ID ${targetId}.`);
          return;
        }
        const call = clientRef.current.call('default', randomRingCallId());
        await call.getOrCreate({
          ring: true,
          data: {
            members: [
              { user_id: user.streamUserId },
              { user_id: target.streamUserId },
            ],
            settings_override: AUDIO_SETTINGS_OVERRIDE,
          },
        });
        // Caller auto-joins once the callee accepts; CallController shows the
        // outgoing ringing UI in the meantime.
      } catch (e) {
        Alert.alert('Could not place call', e.message ?? String(e));
      } finally {
        setBusy(false);
      }
    },
    [user]
  );

  // 2. Start a Call -> existing shareable 6-char code flow.
  const startCall = useCallback(async () => {
    if (!clientRef.current) return;
    setBusy(true);
    try {
      const code = generateCallCode();
      const call = clientRef.current.call('default', codeToCallId(code));
      await call.join({
        create: true,
        data: { settings_override: AUDIO_SETTINGS_OVERRIDE },
      });
      await call.camera.disable().catch(() => {});
    } catch (e) {
      Alert.alert('Could not start call', e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  // 3. Join with Code -> existing flow.
  const joinCall = useCallback(async (code) => {
    if (!clientRef.current) return;
    const trimmed = code.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const call = clientRef.current.call('default', codeToCallId(trimmed));
      await call.get(); // throws if the call doesn't exist

      const sessionParticipants =
        call.state.session?.participants?.length ?? 0;
      if (sessionParticipants >= MAX_PARTICIPANTS) {
        Alert.alert('Call is full', 'This 1-to-1 call already has 2 participants.');
        return;
      }

      await call.join();
      await call.camera.disable().catch(() => {});
    } catch (e) {
      const msg = e.message ?? String(e);
      if (/does not exist|Can't find call|not found/i.test(msg)) {
        Alert.alert('Call not found', 'Check the code and try again.');
      } else if (/full|max.?participants|capacity/i.test(msg)) {
        Alert.alert('Call is full', 'This 1-to-1 call already has 2 participants.');
      } else {
        Alert.alert('Could not join call', msg);
      }
    } finally {
      setBusy(false);
    }
  }, []);

  let content;
  if (booting) {
    content = (
      <View style={styles.center}>
        <ActivityIndicator color="#2563eb" size="large" />
      </View>
    );
  } else if (!client || !user) {
    content = (
      <LoginScreen
        onRegister={handleRegister}
        busy={busy}
        apiUrl={apiUrl}
        onSetApiUrl={handleSetApiUrl}
      />
    );
  } else {
    content = (
      <StreamVideo client={client}>
        <CallController
          user={user}
          onCallById={callById}
          onStartCall={startCall}
          onJoinCall={joinCall}
          busy={busy}
          apiUrl={apiUrl}
          onSetApiUrl={handleSetApiUrl}
        />
      </StreamVideo>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaView style={styles.root}>
        <StatusBar style="light" />
        {content}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#111827' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
