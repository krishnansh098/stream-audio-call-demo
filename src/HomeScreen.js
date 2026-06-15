import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import ServerSettings from './ServerSettings';

export default function HomeScreen({
  user,
  onCallById,
  onStartCall,
  onJoinCall,
  busy,
  apiUrl,
  onSetApiUrl,
}) {
  const [targetId, setTargetId] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const targetOk = /^\d{3}$/.test(targetId);
  const codeOk = joinCode.trim().length >= 4;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.hello}>Hi, {user?.name}</Text>

        {/* Your ID badge */}
        <View style={styles.idCard}>
          <Text style={styles.idLabel}>YOUR ID</Text>
          <Text style={styles.idValue}>{user?.id}</Text>
          <Text style={styles.idHint}>Share it so people can call you.</Text>
        </View>

        {/* 1. Call by ID (rings the other phone) */}
        <Text style={styles.sectionTitle}>Call by ID</Text>
        <Text style={styles.sectionSub}>
          Enter a 3-digit ID to ring that person directly.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 247"
          placeholderTextColor="#6b7280"
          value={targetId}
          onChangeText={(t) => setTargetId(t.replace(/\D/g, '').slice(0, 3))}
          keyboardType="number-pad"
          maxLength={3}
        />
        <TouchableOpacity
          style={[styles.primaryButton, (busy || !targetOk) && styles.disabled]}
          onPress={() => onCallById(targetId)}
          disabled={busy || !targetOk}
        >
          <Text style={styles.primaryButtonText}>Call</Text>
        </TouchableOpacity>

        <Divider />

        {/* 2. Start a Call (existing shareable-code flow) */}
        <Text style={styles.sectionTitle}>Start a Call</Text>
        <Text style={styles.sectionSub}>
          Create a call and share a 6-character code.
        </Text>
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

        <Divider />

        {/* 3. Join with Code (existing flow) */}
        <Text style={styles.sectionTitle}>Join with Code</Text>
        <Text style={styles.sectionSub}>Enter a code someone shared with you.</Text>
        <TextInput
          style={[styles.input, styles.codeInput]}
          placeholder="Enter call code"
          placeholderTextColor="#6b7280"
          value={joinCode}
          onChangeText={(t) => setJoinCode(t.toUpperCase())}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={8}
        />
        <TouchableOpacity
          style={[styles.secondaryButton, (busy || !codeOk) && styles.disabled]}
          onPress={() => onJoinCall(joinCode)}
          disabled={busy || !codeOk}
        >
          <Text style={styles.secondaryButtonText}>Join Call</Text>
        </TouchableOpacity>

        <ServerSettings apiUrl={apiUrl} onSetApiUrl={onSetApiUrl} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Divider() {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.divider} />
      <View style={styles.divider} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 24, paddingTop: 48, paddingBottom: 40 },
  hello: { color: '#f9fafb', fontSize: 26, fontWeight: '700', marginBottom: 16 },
  idCard: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 28,
  },
  idLabel: { color: '#9ca3af', fontSize: 12, letterSpacing: 2 },
  idValue: {
    color: '#60a5fa',
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: 6,
    marginVertical: 2,
  },
  idHint: { color: '#9ca3af', fontSize: 13 },
  sectionTitle: { color: '#f9fafb', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  sectionSub: { color: '#9ca3af', fontSize: 13, marginBottom: 12 },
  input: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#f9fafb',
    fontSize: 18,
    marginBottom: 12,
  },
  codeInput: { letterSpacing: 3, textAlign: 'center' },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  secondaryButton: {
    backgroundColor: '#374151',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#f9fafb', fontSize: 17, fontWeight: '600' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  divider: { flex: 1, height: 1, backgroundColor: '#374151' },
  disabled: { opacity: 0.5 },
});
