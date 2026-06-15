// Directory + token service for the Stream audio call demo.
//
//   POST /register      { name, email }        -> { id, streamUserId, token, name }
//   GET  /users/:id                            -> { exists, id, name, streamUserId }
//   POST /token         { streamUserId }        -> { token }
//
// Tokens are REAL Stream tokens minted with the API secret, so you can turn off
// "Disable Auth Checks" in the Stream dashboard. The secret never leaves here.
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { StreamClient } = require('@stream-io/node-sdk');
const store = require('./store');

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.STREAM_API_KEY;
const API_SECRET = process.env.STREAM_API_SECRET;

if (!API_KEY || !API_SECRET) {
  console.error(
    '\nMissing STREAM_API_KEY / STREAM_API_SECRET.\n' +
      'Copy server/.env.example to server/.env and fill them in.\n'
  );
  process.exit(1);
}

const stream = new StreamClient(API_KEY, API_SECRET);

// Token lasts a day; the app refreshes via tokenProvider whenever it reconnects.
const TOKEN_TTL_SECONDS = 24 * 60 * 60;

function mintToken(streamUserId) {
  return stream.generateUserToken({
    user_id: streamUserId,
    validity_in_seconds: TOKEN_TTL_SECONDS,
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

// Register (or return the existing record for a known email) and hand back a token.
app.post('/register', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim();

    if (!name) return res.status(400).json({ error: 'Name is required.' });
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }

    const user = store.register({ name, email });

    // Best-effort: give the Stream-side user a friendly display name. Not fatal
    // to registration if it fails (e.g. transient Stream API hiccup) - the call
    // SDK will still create the user on connect.
    try {
      await stream.upsertUsers([{ id: user.streamUserId, name: user.name }]);
    } catch (upsertErr) {
      console.warn('upsertUsers failed (non-fatal):', upsertErr?.message ?? upsertErr);
    }

    const token = mintToken(user.streamUserId);
    res.json({
      id: user.id,
      name: user.name,
      streamUserId: user.streamUserId,
      token,
    });
  } catch (e) {
    if (e.code === 'DIRECTORY_FULL') {
      return res
        .status(409)
        .json({ error: 'All 900 IDs are in use. No free ID available.' });
    }
    console.error('register failed:', e);
    res.status(500).json({ error: 'Registration failed. Try again.' });
  }
});

// Look up a user by their 3-digit id (used before placing a ring call).
app.get('/users/:id', (req, res) => {
  const user = store.getById(req.params.id);
  if (!user) return res.json({ exists: false });
  res.json({
    exists: true,
    id: user.id,
    name: user.name,
    streamUserId: user.streamUserId,
  });
});

// Refresh/issue a token for an already-registered Stream user id.
app.post('/token', (req, res) => {
  try {
    const streamUserId = String(req.body?.streamUserId || '').trim();
    if (!streamUserId) {
      return res.status(400).json({ error: 'streamUserId is required.' });
    }
    res.json({ token: mintToken(streamUserId) });
  } catch (e) {
    console.error('token mint failed:', e);
    res.status(500).json({ error: 'Could not mint token.' });
  }
});

app.listen(PORT, () => {
  console.log(`Directory service listening on http://0.0.0.0:${PORT}`);
  console.log(
    'Set EXPO_PUBLIC_API_URL in the app to this machine\'s LAN IP, e.g. http://192.168.1.20:' +
      PORT
  );
});
