// =============================================================================
// redis.cas.test.ts  —  Unit tests for compare-and-set game state writes
//
// These tests verify that casGameState() correctly prevents stale writes and
// that setGameState() maintains the stateVersion counter.
//
// Redis is mocked so tests run without a live Redis instance.
// =============================================================================

// The jest.mock factory runs when ioredis is first required.
// We attach the mock instance to the constructor so tests can access it
// without relying on fragile .mock.results[] ordering.
jest.mock("ioredis", () => {
  const instance = {
    on:   jest.fn(),
    get:  jest.fn(),
    set:  jest.fn().mockResolvedValue("OK"),
    eval: jest.fn(),
    del:  jest.fn(),
  };
  const Ctor = jest.fn(() => instance);
  (Ctor as unknown as { __instance: typeof instance }).__instance = instance;
  return Ctor;
});

import Redis from "ioredis";
import { getGameState, setGameState, casGameState } from "../lib/redis";
import type { GameState } from "@conquer-card/engine";

// Helper to access the single mock Redis instance
function redisMock() {
  return (Redis as unknown as { __instance: {
    get: jest.Mock;
    set: jest.Mock;
    eval: jest.Mock;
  } }).__instance;
}

// Minimal GameState fixture — only fields needed to round-trip through JSON
const BASE_STATE: GameState = {
  tableId:           "table-1",
  roundNumber:       1,
  phase:             "active",
  turnPhase:         "draw",
  players:           [],
  activePlayerIndex: 0,
  drawPile:          [],
  discardPile:       [],
  faceUpCard:        null,
  allMelds:          [],
  betAmount:         50,
  dealerIndex:       0,
  jokerCount:        4,
  sequencesOnlyMode: false,
  turnStartedAt:     0,
  turnTimeoutSeconds: 30,
  stateVersion:      1,
};

beforeEach(() => {
  jest.clearAllMocks();
  // Default set() always resolves OK
  redisMock().set.mockResolvedValue("OK");
});

// ── casGameState ──────────────────────────────────────────────────────────────

describe("casGameState", () => {
  test("returns { result: 'ok', state } when Lua script confirms version match (result=1)", async () => {
    redisMock().eval.mockResolvedValue(1);
    const outcome = await casGameState("table-1", BASE_STATE, 1);
    expect(outcome.result).toBe("ok");
    expect("state" in outcome && outcome.state).toBeDefined();
  });

  test("returns { result: 'conflict' } when version has advanced (result=0)", async () => {
    redisMock().eval.mockResolvedValue(0);
    const outcome = await casGameState("table-1", BASE_STATE, 1);
    expect(outcome.result).toBe("conflict");
  });

  test("returns { result: 'missing' } when Redis key does not exist (result=-1)", async () => {
    redisMock().eval.mockResolvedValue(-1);
    const outcome = await casGameState("table-1", BASE_STATE, 1);
    expect(outcome.result).toBe("missing");
  });

  test("returns { result: 'conflict' } on Lua parse error (result=-2)", async () => {
    redisMock().eval.mockResolvedValue(-2);
    const outcome = await casGameState("table-1", BASE_STATE, 1);
    expect(outcome.result).toBe("conflict");
  });

  test("committed state has stateVersion incremented by 1", async () => {
    redisMock().eval.mockResolvedValue(1);
    const outcome = await casGameState("table-1", { ...BASE_STATE, stateVersion: 5 }, 5);
    expect(outcome.result).toBe("ok");
    if (outcome.result === "ok") expect(outcome.state.stateVersion).toBe(6);
  });

  test("written JSON in Redis also has stateVersion incremented by 1", async () => {
    redisMock().eval.mockResolvedValue(1);
    await casGameState("table-1", { ...BASE_STATE, stateVersion: 5 }, 5);

    // eval(script, numkeys, key, expectedVersion, writtenJson, ttl) → index 4
    const [, , , , writtenJson] = redisMock().eval.mock.calls[0] as [unknown, unknown, unknown, unknown, string];
    const written = JSON.parse(writtenJson) as GameState;
    expect(written.stateVersion).toBe(6);
  });

  test("passes expectedVersion as ARGV[1] to the Lua script", async () => {
    redisMock().eval.mockResolvedValue(1);
    await casGameState("table-1", BASE_STATE, 3);

    // eval(script, numkeys, key, expectedVersion, ...) → expectedVersion at index 3
    const [, , , expectedVersionArg] = redisMock().eval.mock.calls[0] as [unknown, unknown, unknown, string];
    expect(expectedVersionArg).toBe("3");
  });

  // ── Concurrent write simulation ─────────────────────────────────────────────
  //
  // Scenario: players A and B both read state at version 1 simultaneously.
  // Player A's write arrives first → version advances to 2.
  // Player B's write arrives next with expectedVersion=1 → version mismatch → conflict.
  //
  // This is the exact race casGameState is designed to prevent.

  test("simulates concurrent write: first write wins, second gets conflict", async () => {
    redisMock().eval
      .mockResolvedValueOnce(1)   // Player A's write: version matches → ok
      .mockResolvedValueOnce(0);  // Player B's write: version already advanced → conflict

    const outcomeA = await casGameState("table-1", BASE_STATE, 1);
    const outcomeB = await casGameState("table-1", BASE_STATE, 1); // same stale version

    expect(outcomeA.result).toBe("ok");
    expect(outcomeB.result).toBe("conflict");
  });

  test("simulates retry: conflict on attempt 1, ok on attempt 2 (fresh read)", async () => {
    redisMock().eval
      .mockResolvedValueOnce(0)   // attempt 1: conflict
      .mockResolvedValueOnce(1);  // attempt 2: version now matches after re-read

    const attempt1 = await casGameState("table-1", BASE_STATE, 1);
    // Simulate caller re-reading state and retrying with updated version
    const attempt2 = await casGameState("table-1", { ...BASE_STATE, stateVersion: 2 }, 2);

    expect(attempt1.result).toBe("conflict");
    expect(attempt2.result).toBe("ok");
  });
});

// ── setGameState ──────────────────────────────────────────────────────────────

describe("setGameState", () => {
  test("auto-increments stateVersion on write", async () => {
    await setGameState("table-1", { ...BASE_STATE, stateVersion: 7 });

    const [, writtenJson] = redisMock().set.mock.calls[0] as [unknown, string];
    const written = JSON.parse(writtenJson) as GameState;
    expect(written.stateVersion).toBe(8);
  });

  test("initialises stateVersion to 1 when state has no version yet", async () => {
    const stateNoVersion: GameState = { ...BASE_STATE };
    delete stateNoVersion.stateVersion;

    await setGameState("table-1", stateNoVersion);

    const [, writtenJson] = redisMock().set.mock.calls[0] as [unknown, string];
    const written = JSON.parse(writtenJson) as GameState;
    expect(written.stateVersion).toBe(1);
  });

  test("uses 2-hour TTL (7200 seconds)", async () => {
    await setGameState("table-1", BASE_STATE);
    const [, , , ttl] = redisMock().set.mock.calls[0] as [unknown, unknown, unknown, number];
    expect(ttl).toBe(7200);
  });
});

// ── getGameState ──────────────────────────────────────────────────────────────

describe("getGameState", () => {
  test("returns parsed state including stateVersion", async () => {
    const stored = { ...BASE_STATE, stateVersion: 9 };
    redisMock().get.mockResolvedValue(JSON.stringify(stored));

    const result = await getGameState("table-1");
    expect(result?.stateVersion).toBe(9);
  });

  test("returns null when key does not exist", async () => {
    redisMock().get.mockResolvedValue(null);
    const result = await getGameState("table-1");
    expect(result).toBeNull();
  });
});
