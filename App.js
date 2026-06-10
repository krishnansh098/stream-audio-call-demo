import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  StreamCall,
  StreamVideo,
  StreamVideoClient,
} from '@stream-io/video-react-native-sdk';

import HomeScreen from './src/HomeScreen';
import CallScreen from './src/CallScreen';
import { createDevToken } from './src/devToken';
import { codeToCallId, generateCallCode, nameToUserId } from './src/utils';

const API_KEY = process.env.EXPO_PUBLIC_STREAM_API_KEY;
const MAX_PARTICIPANTS = 2;

export default function App() {
  // screens: 'login' | 'home' | 'call'
  const [screen, setScreen] = useState('login');
  const [nameInput, setNameInput] = useState('');
  const [userName, setUserName] = useState('');
  const [client, setClient] = useState(null);
  const [call, setCall] = useState(null);
  const [callCode, setCallCode] = useState('');
  const [busy, setBusy] = useState(false);
  const clientRef = useRef(null);

  const connectUser = useCallback(async () => {
    const name = nameInput.trim();
    if (!name) return;
    if (!API_KEY || API_KEY === 'REPLACE_WITH_YOUR_STREAM_API_KEY') {
      Alert.alert(
        'Missing API key',
        'Set EXPO_PUBLIC_STREAM_API_KEY in .env (local dev) and eas.json (EAS builds). See README.'
      );
      return;
    }
    setBusy(true);
    try {
      const userId = nameToUserId(name);
      const videoClient = StreamVideoClient.getOrCreateInstance({
        apiKey: API_KEY,
        user: { id: userId, name },
        token: createDevToken(userId),
      });
      clientRef.current = videoClient;
      setClient(videoClient);
      setUserName(name);
      setScreen('home');
    } catch (e) {
      Alert.alert('Connection failed', e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }, [nameInput]);

  const startCall = useCallback(async () => {
    if (!clientRef.current) return;
    setBusy(true);
    try {
      const code = generateCallCode();
      const newCall = clientRef.current.call('default', codeToCallId(code));
      await newCall.join({
        create: true,
        data: {
          settings_override: {
            limits: { max_participants: MAX_PARTICIPANTS },
            audio: { mic_default_on: true, default_device: 'speaker' },
          },
        },
      });
      // Audio-only: make sure the camera stays off.
      await newCall.camera.disable().catch(() => {});
      setCall(newCall);
      setCallCode(code);
      setScreen('call');
    } catch (e) {
      Alert.alert('Could not start call', e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  const joinCall = useCallback(async (code) => {
    if (!clientRef.current) return;
    const trimmed = code.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const existingCall = clientRef.current.call('default', codeToCallId(trimmed));

      // Verify the call exists (throws if it doesn't).
      await existingCall.get();

      // Client-side guard for the 2-participant limit
      // (the server-side limits.max_participants is the hard guarantee).
      const sessionParticipants =
        existingCall.state.session?.participants?.length ?? 0;
      if (sessionParticipants >= MAX_PARTICIPANTS) {
        Alert.alert('Call is full', 'This 1-to-1 call already has 2 participants.');
        return;
      }

      await existingCall.join();
      await existingCall.camera.disable().catch(() => {});
      setCall(existingCall);
      setCallCode(trimmed.toUpperCase());
      setScreen('call');
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

  const handleLeft = useCallback(() => {
    setCall(null);
    setCallCode('');
    setScreen('home');
  }, []);

  let content;
  if (screen === 'login') {
    content = (
      <KeyboardAvoidingView
        style={styles.loginContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Text style={styles.title}>Audio Call Demo</Text>
        <Text style={styles.subtitle}>Powered by Stream - 1-to-1 audio calls</Text>
        <TextInput
          style={styles.input}
          placeholder="Your name"
          placeholderTextColor="#6b7280"
          value={nameInput}
          onChangeText={setNameInput}
          autoCorrect={false}
          maxLength={30}
        />
        <TouchableOpacity
          style={[styles.button, (!nameInput.trim() || busy) && styles.disabled]}
          onPress={connectUser}
          disabled={!nameInput.trim() || busy}
        >
          <Text style={styles.buttonText}>{busy ? 'Connecting...' : 'Continue'}</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    );
  } else if (screen === 'home') {
    content = (
      <HomeScreen
        userName={userName}
        onStartCall={startCall}
        onJoinCall={joinCall}
        busy={busy}
      />
    );
  } else if (screen === 'call' && client && call) {
    content = (
      <StreamCall call={call}>
        <CallScreen code={callCode} onLeft={handleLeft} />
      </StreamCall>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaView style={styles.root}>
        <StatusBar style="light" />
        {client ? <StreamVideo client={client}>{content}</StreamVideo> : content}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#111827' },
  loginContainer: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { color: '#f9fafb', fontSize: 32, fontWeight: '800', textAlign: 'center' },
  subtitle: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 40,
  },
  input: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#f9fafb',
    fontSize: 17,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  disabled: { opacity: 0.5 },
});
