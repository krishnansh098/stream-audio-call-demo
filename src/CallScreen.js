import React, { useState } from 'react';
import {
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useCall, useCallStateHooks } from '@stream-io/video-react-native-sdk';

function Avatar({ name, speaking }) {
  const initial = (name || '?').charAt(0).toUpperCase();
  return (
    <View style={[styles.avatar, speaking && styles.avatarSpeaking]}>
      <Text style={styles.avatarText}>{initial}</Text>
    </View>
  );
}

export default function CallScreen({ code, onLeft }) {
  const call = useCall();
  const { useParticipants, useMicrophoneState } = useCallStateHooks();
  const participants = useParticipants();
  const { isMute } = useMicrophoneState();
  const [copied, setCopied] = useState(false);

  const local = participants.find((p) => p.isLocalParticipant);
  const remote = participants.find((p) => !p.isLocalParticipant);

  const copyCode = async () => {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const shareCode = async () => {
    try {
      await Share.share({
        message: `Join my audio call! Open the app and enter code: ${code}`,
      });
    } catch (e) {
      // user cancelled share - ignore
    }
  };

  const toggleMute = async () => {
    try {
      await call?.microphone.toggle();
    } catch (e) {
      console.warn('Failed to toggle microphone', e);
    }
  };

  const leave = async () => {
    try {
      await call?.leave();
    } catch (e) {
      console.warn('Failed to leave call', e);
    } finally {
      onLeft();
    }
  };

  return (
    <View style={styles.container}>
      {/* Call code banner */}
      <View style={styles.codeCard}>
        <Text style={styles.codeLabel}>CALL CODE</Text>
        <Text style={styles.codeValue}>{code}</Text>
        <View style={styles.codeActions}>
          <TouchableOpacity style={styles.codeButton} onPress={copyCode}>
            <Text style={styles.codeButtonText}>
              {copied ? 'Copied!' : 'Copy'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.codeButton} onPress={shareCode}>
            <Text style={styles.codeButtonText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Participants */}
      <View style={styles.participants}>
        <View style={styles.participantBlock}>
          <Avatar
            name={local?.name || local?.userId}
            speaking={local?.isSpeaking}
          />
          <Text style={styles.participantName}>
            {local?.name || local?.userId || 'You'} (you)
          </Text>
          {isMute && <Text style={styles.mutedTag}>muted</Text>}
        </View>

        {remote ? (
          <View style={styles.participantBlock}>
            <Avatar
              name={remote.name || remote.userId}
              speaking={remote.isSpeaking}
            />
            <Text style={styles.participantName}>
              {remote.name || remote.userId}
            </Text>
          </View>
        ) : (
          <View style={styles.participantBlock}>
            <View style={[styles.avatar, styles.avatarEmpty]}>
              <Text style={styles.avatarText}>...</Text>
            </View>
            <Text style={styles.waitingText}>
              Waiting for the other person...{'\n'}Share the code above.
            </Text>
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, isMute && styles.controlButtonActive]}
          onPress={toggleMute}
        >
          <Text style={styles.controlText}>{isMute ? 'Unmute' : 'Mute'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.controlButton, styles.leaveButton]}
          onPress={leave}
        >
          <Text style={styles.controlText}>Leave</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'space-between' },
  codeCard: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginTop: 12,
  },
  codeLabel: { color: '#9ca3af', fontSize: 12, letterSpacing: 2 },
  codeValue: {
    color: '#f9fafb',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 8,
    marginVertical: 8,
  },
  codeActions: { flexDirection: 'row', gap: 12 },
  codeButton: {
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginHorizontal: 6,
  },
  codeButtonText: { color: '#f9fafb', fontWeight: '600' },
  participants: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  participantBlock: { alignItems: 'center', maxWidth: 150 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  avatarSpeaking: { borderColor: '#22c55e' },
  avatarEmpty: { backgroundColor: '#374151' },
  avatarText: { color: '#fff', fontSize: 40, fontWeight: '700' },
  participantName: {
    color: '#f9fafb',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  waitingText: {
    color: '#9ca3af',
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
  },
  mutedTag: { color: '#f87171', fontSize: 13, marginTop: 4 },
  controls: { flexDirection: 'row', justifyContent: 'center', marginBottom: 16 },
  controlButton: {
    backgroundColor: '#374151',
    borderRadius: 32,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginHorizontal: 10,
    minWidth: 110,
    alignItems: 'center',
  },
  controlButtonActive: { backgroundColor: '#6b7280' },
  leaveButton: { backgroundColor: '#dc2626' },
  controlText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
