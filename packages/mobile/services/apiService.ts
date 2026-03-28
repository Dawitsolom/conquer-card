// =============================================================================
// apiService.ts — REST API calls to the server
//
// Every call attaches the app JWT from authStore as a Bearer token.
// All functions throw on HTTP errors so callers can catch and display them.
//
// Java analogy: like a Spring RestTemplate wrapper — a thin typed client
// around fetch that handles auth headers and error unwrapping.
// =============================================================================

import { useAuthStore } from "../store/authStore";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

// ── Internal helper ───────────────────────────────────────────────────────────

function getJwt(): string {
  const jwt = useAuthStore.getState().jwt;
  if (!jwt) throw new Error("Not authenticated");
  return jwt;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getJwt()}`,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ── Types matching server responses ──────────────────────────────────────────

export interface PublicTable {
  id:          string;
  betAmount:   number;
  playerCount: number;
  maxPlayers:  number;
  jokerCount:  0 | 2 | 4;
}

export interface TablesByTier {
  low:    PublicTable[];   // betAmount <= 50
  medium: PublicTable[];   // betAmount 51–200
  high:   PublicTable[];   // betAmount > 200
}

export interface UserProfile {
  id:           string;
  displayName:  string;
  coinBalance:  number;
  totalRoundsPlayed: number;
  totalRoundsWon:    number;
}

export interface CreateTableResult {
  tableId:  string;
  roomCode: string;
}

export interface JoinTableResult {
  tableId: string;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function getPublicTables(): Promise<TablesByTier> {
  const tables = await apiFetch<PublicTable[]>("/tables/public");
  return {
    low:    tables.filter(t => t.betAmount <= 50),
    medium: tables.filter(t => t.betAmount > 50 && t.betAmount <= 200),
    high:   tables.filter(t => t.betAmount > 200),
  };
}

export async function getProfile(userId: string): Promise<UserProfile> {
  return apiFetch<UserProfile>(`/profile/${userId}`);
}

export async function createTable(betAmount: number, jokerCount: 0 | 2 | 4 = 4): Promise<CreateTableResult> {
  return apiFetch<CreateTableResult>("/tables/create", {
    method: "POST",
    body: JSON.stringify({ betAmount, jokerCount, isPrivate: false }),
  });
}

export async function joinTable(tableId: string): Promise<JoinTableResult> {
  return apiFetch<JoinTableResult>(`/tables/${tableId}/join`, { method: "POST" });
}

export async function getTableState(tableId: string): Promise<unknown> {
  return apiFetch(`/tables/${tableId}/state`);
}
