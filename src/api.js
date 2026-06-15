// Thin client for the directory service (the /server Express app).
// Base URL defaults to EXPO_PUBLIC_API_URL (baked at build time) but can be
// overridden at runtime from the app's settings - handy when the server URL
// changes (e.g. a new tunnel) so you don't need a rebuild.
const ENV_URL = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/+$/, '');
let overrideUrl = null;

export function setApiBaseUrl(url) {
  overrideUrl = url ? String(url).trim().replace(/\/+$/, '') : null;
}

export function getApiBaseUrl() {
  return overrideUrl || ENV_URL;
}

export function hasApiUrl() {
  return !!getApiBaseUrl();
}

class ApiError extends Error {
  constructor(message, { status, unreachable } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.unreachable = !!unreachable;
  }
}

async function request(path, options = {}) {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new ApiError(
      'Server URL is not set. Tap "Server settings" and enter it.',
      { unreachable: true }
    );
  }

  // Guard against a hung server so the UI never spins forever.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  let res;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      ...options,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
  } catch (e) {
    // Network failure, DNS, timeout, server down, etc.
    throw new ApiError(
      "Can't reach the server. Open \"Server settings\" and check the URL, and that the server is running.",
      { unreachable: true }
    );
  } finally {
    clearTimeout(timeout);
  }

  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const message = body?.error || `Request failed (${res.status}).`;
    throw new ApiError(message, { status: res.status });
  }
  return body;
}

// POST /register -> { id, name, streamUserId, token }
export function register({ name, email }) {
  return request('/register', {
    method: 'POST',
    body: JSON.stringify({ name, email }),
  });
}

// GET /users/:id -> { exists, id?, name?, streamUserId? }
export function lookupUser(id) {
  return request(`/users/${encodeURIComponent(id)}`);
}

// POST /token -> { token }
export async function fetchToken(streamUserId) {
  const { token } = await request('/token', {
    method: 'POST',
    body: JSON.stringify({ streamUserId }),
  });
  return token;
}

export { ApiError };
