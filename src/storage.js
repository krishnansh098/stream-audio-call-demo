// Persists the logged-in user so the same 3-digit ID survives app restarts.
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@stream_call_demo/user';
const API_URL_KEY = '@stream_call_demo/apiUrl';

// Runtime override for the directory server URL (so a changed tunnel URL
// doesn't need an app rebuild). Empty/unset falls back to EXPO_PUBLIC_API_URL.
export async function saveApiUrl(url) {
  try {
    if (url) await AsyncStorage.setItem(API_URL_KEY, url);
    else await AsyncStorage.removeItem(API_URL_KEY);
  } catch {
    // ignore
  }
}

export async function loadApiUrl() {
  try {
    return (await AsyncStorage.getItem(API_URL_KEY)) || null;
  } catch {
    return null;
  }
}

// Stored shape: { id, name, email, streamUserId }
export async function saveUser(user) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(user));
  } catch {
    // Non-fatal: the session still works, it just won't auto-login next launch.
  }
}

export async function loadUser() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const user = JSON.parse(raw);
    if (user && user.id && user.streamUserId) return user;
    return null;
  } catch {
    return null;
  }
}

export async function clearUser() {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

// index.js (push handler) needs the stream user id from outside React.
export async function loadStreamUserId() {
  const user = await loadUser();
  return user?.streamUserId ?? null;
}
