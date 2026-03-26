import Redis from "ioredis";
import { GameState } from "@conquer-card/engine";

// Java analogy: a singleton service class with static helper methods.
// The Redis client is the equivalent of a ConnectionPool — create it once, reuse everywhere.

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on("error", (err) => {
  console.error("[Redis] connection error:", err);
});

export default redis;

// ── TTL constants ─────────────────────────────────────────────────────────────

const GAME_STATE_TTL_SECONDS = 2 * 60 * 60; // 2 hours (Tech Spec §5.2)

// ── Key builders ──────────────────────────────────────────────────────────────

export const Keys = {
  gameState:    (tableId: string) => `game:state:${tableId}`,
  turnTimer:    (tableId: string) => `game:turn_timer:${tableId}`,
  roomCode:     (code: string)    => `table:room_code:${code}`,
  userSession:  (userId: string)  => `user:session:${userId}`,
  userCamera:   (userId: string)  => `user:camera:${userId}`,
};

// ── GameState helpers ─────────────────────────────────────────────────────────

/** Read the full GameState for a table. Returns null if not found or expired. */
export async function getGameState(tableId: string): Promise<GameState | null> {
  const raw = await redis.get(Keys.gameState(tableId));
  if (!raw) return null;
  return JSON.parse(raw) as GameState;
}

/** Persist the full GameState. Auto-increments stateVersion on every write. */
export async function setGameState(tableId: string, state: GameState): Promise<void> {
  const versioned: GameState = { ...state, stateVersion: (state.stateVersion ?? 0) + 1 };
  await redis.set(Keys.gameState(tableId), JSON.stringify(versioned), "EX", GAME_STATE_TTL_SECONDS);
}

// ── Compare-and-Set ───────────────────────────────────────────────────────────
//
// Lua script runs atomically inside Redis (single-threaded).
// It reads the stored state, checks that its stateVersion matches
// the caller's expectedVersion, and only then overwrites.
//
// Return codes:
//    1  → success (version matched, state written)
//    0  → conflict (another writer advanced the version first)
//   -1  → key not found (game ended or expired)
//   -2  → parse error (treat as conflict)
//
// Java analogy:
//   synchronized(lock) { if (db.version == expected) db.update(newState); }
const CAS_LUA = `
local current = redis.call('GET', KEYS[1])
if current == false then return -1 end
local ok, state = pcall(cjson.decode, current)
if not ok then return -2 end
local v = state['stateVersion']
if v == nil then v = 0 end
if v ~= tonumber(ARGV[1]) then return 0 end
redis.call('SET', KEYS[1], ARGV[2], 'EX', tonumber(ARGV[3]))
return 1
`;

export type CasResult = "ok" | "conflict" | "missing";

/**
 * Atomically write newState only if the current Redis value has stateVersion === expectedVersion.
 * Increments stateVersion in the written value.
 *
 * Returns:
 *   'ok'       — write committed
 *   'conflict' — another write raced ahead; caller should re-read and retry
 *   'missing'  — key does not exist (game ended or expired)
 */
export async function casGameState(
  tableId: string,
  newState: GameState,
  expectedVersion: number,
): Promise<CasResult> {
  const nextVersion = expectedVersion + 1;
  const versioned: GameState = { ...newState, stateVersion: nextVersion };
  const result = await redis.eval(
    CAS_LUA,
    1,
    Keys.gameState(tableId),
    String(expectedVersion),
    JSON.stringify(versioned),
    String(GAME_STATE_TTL_SECONDS),
  ) as number;

  if (result === 1)  return "ok";
  if (result === -1) return "missing";
  return "conflict"; // 0 (version mismatch) or -2 (parse error)
}

/** Remove the GameState when a table closes. */
export async function deleteGameState(tableId: string): Promise<void> {
  await redis.del(Keys.gameState(tableId));
}
