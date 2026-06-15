// Generates a short, easy-to-share call code, e.g. "XK4P2M"
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

export function generateCallCode(length = 6) {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return code;
}

// Stream call ids must be lowercase-safe; we keep codes uppercase for
// display and lowercase them for the actual call id.
export function codeToCallId(code) {
  return `audio-${code.trim().toLowerCase()}`;
}

// Pulls the display code back out of a code-based call id, or null for ring
// calls (which use a random id with no "audio-" prefix). Lets CallScreen show
// the code card for code calls and hide it for direct/ring calls.
export function codeFromCallId(callId) {
  if (typeof callId === 'string' && callId.startsWith('audio-')) {
    return callId.slice('audio-'.length).toUpperCase();
  }
  return null;
}

// Unique id for a ring call. Doesn't need to be guessable or shareable.
export function randomRingCallId() {
  const rand = Math.random().toString(36).slice(2, 10);
  return `ring-${Date.now().toString(36)}-${rand}`;
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

// 3-digit id used by the directory (100-999).
export function isValidUserId(id) {
  return /^\d{3}$/.test(String(id || '').trim());
}
