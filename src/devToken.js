// Stream "development token" generator (client-side, demo only).
// Works ONLY when "Disable Auth Checks" is enabled for your app
// in the Stream dashboard. NEVER use this in production - generate
// tokens on a server with your API secret instead.

const BASE64_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64Encode(str) {
  let out = '';
  let i = 0;
  while (i < str.length) {
    const c1 = str.charCodeAt(i++);
    const c2 = i < str.length ? str.charCodeAt(i++) : NaN;
    const c3 = i < str.length ? str.charCodeAt(i++) : NaN;
    const e1 = c1 >> 2;
    const e2 = ((c1 & 3) << 4) | (isNaN(c2) ? 0 : c2 >> 4);
    const e3 = isNaN(c2) ? 64 : ((c2 & 15) << 2) | (isNaN(c3) ? 0 : c3 >> 6);
    const e4 = isNaN(c3) ? 64 : c3 & 63;
    out +=
      BASE64_CHARS.charAt(e1) +
      BASE64_CHARS.charAt(e2) +
      (e3 === 64 ? '=' : BASE64_CHARS.charAt(e3)) +
      (e4 === 64 ? '=' : BASE64_CHARS.charAt(e4));
  }
  return out;
}

function base64UrlEncode(obj) {
  return base64Encode(JSON.stringify(obj))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function createDevToken(userId) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = { user_id: userId };
  return `${base64UrlEncode(header)}.${base64UrlEncode(payload)}.devtoken`;
}
