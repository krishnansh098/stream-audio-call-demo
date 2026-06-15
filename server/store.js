// Tiny JSON-file user store. Keeps things dependency-free for the demo -
// swap for a real DB if this ever grows up.
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'users.json');

const MIN_ID = 100;
const MAX_ID = 999;
const TOTAL_IDS = MAX_ID - MIN_ID + 1; // 900

function load() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return {}; // file missing or empty -> start fresh
  }
}

function save(users) {
  fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function streamUserIdFor(id) {
  return `user-${id}`;
}

function findByEmail(email) {
  const users = load();
  const target = normalizeEmail(email);
  return Object.values(users).find((u) => u.email === target) || null;
}

function getById(id) {
  const users = load();
  return users[String(id)] || null;
}

// Allocates the first free 3-digit id. Throws DIRECTORY_FULL when all 900 taken.
function nextFreeId(users) {
  for (let id = MIN_ID; id <= MAX_ID; id++) {
    if (!users[String(id)]) return id;
  }
  const err = new Error('All 900 IDs are taken.');
  err.code = 'DIRECTORY_FULL';
  throw err;
}

// Registers a new user, or returns the existing record if the email is already
// known (idempotent so re-installing the app keeps your ID). Throws on a real
// duplicate conflict only when name differs? No - same email always returns the
// same record; that is the desired "keep your ID" behaviour.
function register({ name, email }) {
  const cleanName = String(name || '').trim();
  const cleanEmail = normalizeEmail(email);

  const existing = findByEmail(cleanEmail);
  if (existing) return existing;

  const users = load();
  const id = nextFreeId(users);
  const record = {
    id,
    name: cleanName,
    email: cleanEmail,
    streamUserId: streamUserIdFor(id),
    createdAt: new Date().toISOString(),
  };
  users[String(id)] = record;
  save(users);
  return record;
}

module.exports = {
  register,
  getById,
  findByEmail,
  streamUserIdFor,
  TOTAL_IDS,
};
