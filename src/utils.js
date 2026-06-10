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

// Builds a valid Stream user id from a display name + random suffix.
export function nameToUserId(name) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 24);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base || 'user'}-${suffix}`;
}
