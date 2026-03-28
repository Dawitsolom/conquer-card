// =============================================================================
// authService.ts — Firebase auth + server JWT exchange
//
// Flow (Java analogy: like a two-step SAML login):
//   1. Firebase authenticates the user — returns a short-lived ID token
//   2. Our server verifies the Firebase token and issues its own JWT
//      which is used for all REST + Socket.io calls
//
// Guest flow: POST /auth/guest — server creates an anonymous user and
// returns a JWT directly (no Firebase involved).
// =============================================================================

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInAnonymously,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "../lib/firebase";
import { env } from "../lib/env";

/** Throws a clear error when a Firebase-only flow is attempted without credentials. */
function requireFirebase(): NonNullable<typeof auth> {
  if (!isFirebaseConfigured || !auth) {
    throw new Error("Email/password login requires Firebase credentials. Use guest mode or add EXPO_PUBLIC_FIREBASE_* variables to .env.");
  }
  return auth;
}

const API_URL = env.apiUrl;

// ── Internal helper ───────────────────────────────────────────────────────────

async function exchangeForJwt(firebaseIdToken: string): Promise<string> {
  const res = await fetch(`${API_URL}/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: firebaseIdToken }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`auth/verify failed (${res.status}): ${text}`);
  }
  const data = await res.json() as { token: string };
  return data.token;
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Sign in with email + password.  Returns the app JWT. */
export async function signInWithEmail(
  email: string,
  password: string,
): Promise<{ uid: string; displayName: string; jwt: string }> {
  const cred = await signInWithEmailAndPassword(requireFirebase(), email, password);
  const idToken = await cred.user.getIdToken();
  const jwt = await exchangeForJwt(idToken);
  return {
    uid: cred.user.uid,
    displayName: cred.user.displayName ?? email.split("@")[0] ?? "Player",
    jwt,
  };
}

/** Register a new account.  Returns the app JWT. */
export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string,
): Promise<{ uid: string; displayName: string; jwt: string }> {
  const cred = await createUserWithEmailAndPassword(requireFirebase(), email, password);
  await updateProfile(cred.user, { displayName });
  const idToken = await cred.user.getIdToken();
  const jwt = await exchangeForJwt(idToken);
  return { uid: cred.user.uid, displayName, jwt };
}

/** Sign in as guest.
 *  - With Firebase: anonymous auth → server /auth/verify
 *  - Without Firebase: direct POST /auth/guest (server creates the account)
 */
export async function signInAsGuest(): Promise<{
  uid: string;
  displayName: string;
  jwt: string;
}> {
  if (!isFirebaseConfigured || !auth) {
    // Direct server-side guest creation — no client Firebase needed.
    const res = await fetch(`${API_URL}/auth/guest`, { method: "POST" });
    if (!res.ok) throw new Error(`Guest login failed (${res.status})`);
    const data = await res.json() as {
      token: string;
      user: { id: string; displayName: string; isGuest: boolean; coinBalance: number };
    };
    return { uid: data.user.id, displayName: data.user.displayName, jwt: data.token };
  }

  const cred = await signInAnonymously(auth);
  const idToken = await cred.user.getIdToken();
  const jwt = await exchangeForJwt(idToken);
  return { uid: cred.user.uid, displayName: "Guest", jwt };
}

/** Sign out from Firebase and clear local state. */
export async function signOut(): Promise<void> {
  if (isFirebaseConfigured && auth) {
    await firebaseSignOut(auth);
  }
}
