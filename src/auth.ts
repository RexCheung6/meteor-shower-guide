const AUTH_KEY = "mss.auth";
const SESSION_KEY = "mss.session";
const ITERATIONS = 210000;
const SESSION_DAYS = 7;

interface StoredAccount {
  username: string;
  salt: string;
  hash: string;
  iterations: number;
}

interface StoredSession {
  token: string;
  createdAt: number;
  expiresAt: number;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(password).buffer as ArrayBuffer, "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: salt.buffer as ArrayBuffer, iterations, hash: "SHA-256" }, keyMaterial, 256);
  return new Uint8Array(bits);
}

function secureEquals(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function createSession(): void {
  const now = Date.now();
  const session: StoredSession = {
    token: crypto.randomUUID(),
    createdAt: now,
    expiresAt: now + SESSION_DAYS * 86400000
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function hasAccount(): boolean {
  try {
    return !!localStorage.getItem(AUTH_KEY);
  } catch {
    return false;
  }
}

export async function register(username: string, password: string): Promise<void> {
  if (hasAccount()) throw new Error("account-exists");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await deriveKey(password, salt, ITERATIONS);
  const account: StoredAccount = {
    username,
    salt: bytesToBase64(salt),
    hash: bytesToBase64(hash),
    iterations: ITERATIONS
  };
  localStorage.setItem(AUTH_KEY, JSON.stringify(account));
  createSession();
}

export async function login(username: string, password: string): Promise<void> {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) throw new Error("no-account");
  const account = JSON.parse(raw) as StoredAccount;
  if (account.username !== username) throw new Error("invalid-credentials");
  const expected = base64ToBytes(account.hash);
  const actual = await deriveKey(password, base64ToBytes(account.salt), account.iterations);
  if (!secureEquals(expected, actual)) throw new Error("invalid-credentials");
  createSession();
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function isLoggedIn(): boolean {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const session = JSON.parse(raw) as StoredSession;
    return !!session.token && session.expiresAt > Date.now();
  } catch {
    return false;
  }
}
