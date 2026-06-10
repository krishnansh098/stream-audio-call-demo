import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function HomeScreen({ userName, onStartCall, onJoinCall, busy }) {
  const [joinCode, setJoinCode] = useState('');

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.hello}>Hi, {userName}</Text>
      <Text style={styles.subtitle}>Start a 1-to-1 audio call or join one with a code.</Text>

      <TouchableOpacity
        style={[styles.primaryButton, busy && styles.disabled]}
        onPress={onStartCall}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>Start a Call</Text>
        )}
      </TouchableOpacity>

      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.divider} />
      </View>

      <TextInput
        style={styles.input}
        placeholder="Enter call code (e.g. XK4P2M)"
        placeholderTextColor="#6b7280"
        value={joinCode}
        onChangeText={(t) => setJoinCode(t.toUpperCase())}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={8}
      />
      <TouchableOpacity
        style={[
          styles.secondaryButton,
          (busy || joinCode.trim().length < 4) && styles.disabled,
        ]}
        onPress={() => onJoinCall(joinCode)}
        disabled={busy || joinCode.trim().length < 4}
      >
        <Text style={styles.secondaryButtonText}>Join Call</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  hello: { color: '#f9fafb', fontSize: 28, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: '#9ca3af', fontSize: 15, marginBottom: 32 },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 28 },
  divider: { flex: 1, height: 1, backgroundColor: '#374151' },
  dividerText: { color: '#6b7280', marginHorizontal: 12, fontSize: 13 },
  input: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#f9fafb',
    fontSize: 18,
    letterSpacing: 3,
    textAlign: 'center',
    marginBottom: 12,
  },
  secondaryButton: {
    backgroundColor: '#374151',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#f9fafb', fontSize: 17, fontWeight: '600' },
  disabled: { opacity: 0.5 },
});
