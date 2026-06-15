import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { isValidEmail } from './utils';
import ServerSettings from './ServerSettings';

export default function LoginScreen({ onRegister, busy, apiUrl, onSetApiUrl }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const nameOk = name.trim().length > 0;
  const emailOk = isValidEmail(email);
  const canSubmit = nameOk && emailOk && !busy;

  const submit = () => {
    if (!canSubmit) return;
    onRegister(name.trim(), email.trim());
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Audio Call Demo</Text>
      <Text style={styles.subtitle}>
        Register once to get your own 3-digit calling ID.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Your name"
        placeholderTextColor="#6b7280"
        value={name}
        onChangeText={setName}
        autoCorrect={false}
        maxLength={30}
        returnKeyType="next"
      />
      <TextInput
        style={styles.input}
        placeholder="Your email"
        placeholderTextColor="#6b7280"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        maxLength={60}
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      {email.length > 0 && !emailOk && (
        <Text style={styles.hint}>Please enter a valid email address.</Text>
      )}

      <TouchableOpacity
        style={[styles.button, !canSubmit && styles.disabled]}
        onPress={submit}
        disabled={!canSubmit}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Register</Text>
        )}
      </TouchableOpacity>

      <ServerSettings apiUrl={apiUrl} onSetApiUrl={onSetApiUrl} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { color: '#f9fafb', fontSize: 32, fontWeight: '800', textAlign: 'center' },
  subtitle: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 36,
  },
  input: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#f9fafb',
    fontSize: 17,
    marginBottom: 14,
  },
  hint: { color: '#f87171', fontSize: 13, marginBottom: 10, marginLeft: 4 },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  disabled: { opacity: 0.5 },
});
