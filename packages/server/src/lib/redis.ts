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

/** Persist the full GameState for a table with a 2-hour TTL. */
export async function setGameState(tableId: string, state: GameState): Promise<void> {
  await redis.set(Keys.gameState(tableId), JSON.stringify(state), "EX", GAME_STATE_TTL_SECONDS);
}

/** Remove the GameState when a table closes. */
export async function deleteGameState(tableId: string): Promise<void> {
  await redis.del(Keys.gameState(tableId));
}
