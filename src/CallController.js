import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import {
  CallingState,
  RingingCallContent,
  StreamCall,
  useCalls,
} from '@stream-io/video-react-native-sdk';

import HomeScreen from './HomeScreen';
import CallScreen from './CallScreen';

// States where we're actually in the call -> show the in-call UI.
const IN_CALL = [
  CallingState.JOINED,
  CallingState.JOINING,
  CallingState.RECONNECTING,
];

// Top-level call surface, mounted inside <StreamVideo>. Everything is derived
// from useCalls() so a ringing call shows over whatever screen you're on, no
// matter how the call started (incoming push, by-ID ring, or the code flow).
export default function CallController(props) {
  const calls = useCalls();

  const active = calls.find((c) => IN_CALL.includes(c.state.callingState));
  const ringing = calls.find(
    (c) => c.state.callingState === CallingState.RINGING
  );
  const incoming = ringing && !ringing.isCreatedByMe ? ringing : null;
  const outgoing = ringing && ringing.isCreatedByMe ? ringing : null;

  // Busy: a ring arrives while we're already in a call -> auto-decline it so
  // the caller immediately learns we're unavailable.
  useEffect(() => {
    if (active && incoming) {
      incoming.leave({ reject: true, reason: 'busy' }).catch(() => {});
    }
  }, [active, incoming]);

  // Surface the outcome of an outgoing ring (declined / no answer / busy).
  useEffect(() => {
    if (!outgoing) return;
    const unsub = outgoing.on('call.rejected', (event) => {
      const reason = event?.reason;
      if (reason === 'decline') Alert.alert('Call declined');
      else if (reason === 'busy') Alert.alert('User is busy', 'They are already in a call.');
      else if (reason === 'timeout') Alert.alert('No answer', 'They did not pick up.');
    });
    return () => {
      try {
        unsub?.();
      } catch {
        // ignore
      }
    };
  }, [outgoing?.cid]);

  // In a call (including a ring we just accepted) -> shared audio UI.
  if (active) {
    return (
      <StreamCall call={active}>
        <CallScreen />
      </StreamCall>
    );
  }

  // A ringing call we're NOT busy-rejecting -> incoming/outgoing ringer UI.
  // (If we're busy, `active` above already returned and this never renders.)
  if (ringing) {
    return (
      <StreamCall call={ringing}>
        <RingingCallContent />
      </StreamCall>
    );
  }

  return <HomeScreen {...props} />;
}
