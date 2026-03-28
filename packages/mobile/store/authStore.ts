// =============================================================================
// authStore.ts — Zustand store for authentication state
//
// Stores the authenticated user's identity and the app JWT.
// The JWT is passed to every REST call (Authorization: Bearer <jwt>)
// and to the Socket.io handshake (auth: { token: jwt }).
//
// Java analogy: like a Spring SecurityContextHolder — a singleton that
// holds the current principal and is read anywhere in the app.
// =============================================================================

import { create } from "zustand";

interface AuthUser {
  uid: string;
  displayName: string;
  isGuest: boolean;
}

interface AuthStore {
  user:      AuthUser | null;
  jwt:       string | null;
  isLoading: boolean;

  setUser:   (user: AuthUser, jwt: string) => void;
  setGuest:  (uid: string, jwt: string)   => void;
  setLoading:(loading: boolean)           => void;
  logout:    ()                           => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user:      null,
  jwt:       null,
  isLoading: false,

  setUser: (user, jwt) => set({ user, jwt }),

  setGuest: (uid, jwt) =>
    set({ user: { uid, displayName: "Guest", isGuest: true }, jwt }),

  setLoading: (isLoading) => set({ isLoading }),

  logout: () => set({ user: null, jwt: null }),
}));
