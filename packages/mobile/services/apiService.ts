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
import { env } from "../lib/env";

const API_URL = env.apiUrl;

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
  beginner:   PublicTable[];   // betAmount <= 25   (10-coin tables)
  standard:   PublicTable[];   // betAmount 26–75   (50-coin tables)
  highStakes: PublicTable[];   // betAmount 76–250  (100-coin tables)
  elite:      PublicTable[];   // betAmount > 250   (500-coin tables)
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
    beginner:   tables.filter(t => t.betAmount <= 25),
    standard:   tables.filter(t => t.betAmount > 25  && t.betAmount <= 75),
    highStakes: tables.filter(t => t.betAmount > 75  && t.betAmount <= 250),
    elite:      tables.filter(t => t.betAmount > 250),
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

export async function createSoloTable(): Promise<CreateTableResult> {
  return apiFetch<CreateTableResult>("/tables/create", {
    method: "POST",
    body: JSON.stringify({ betAmount: 0, jokerCount: 4, isSolo: true }),
  });
}

export async function joinTable(tableId: string): Promise<JoinTableResult> {
  return apiFetch<JoinTableResult>(`/tables/${tableId}/join`, { method: "POST" });
}

export async function getTableState(tableId: string): Promise<unknown> {
  return apiFetch(`/tables/${tableId}/state`);
}
