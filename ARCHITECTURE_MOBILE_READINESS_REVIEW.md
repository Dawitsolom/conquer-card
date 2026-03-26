# Conquer Card Architecture & Mobile Readiness Review

Date: 2026-03-26  
Analyzed branch/commit: `work` @ `2f853b02`  
Note: a `dev` branch is not present in this clone (`git branch -a` shows only `work`), so this review is based on the currently checked-out code.

## 1) Critical issues (must fix before mobile)

1. **Mobile client protocol is incompatible with server protocol and state shape.**
   - Mobile emits `join_room`, `start_game`, `play_card` and listens for `room_state`, `game_started`, `game_state`. Server uses `table:join`, `player:ready`, `game:action`, and emits `game:state_update`, `game:round_start`, `game:round_over`, etc.
   - Mobile UI reads fields that do not exist on engine `GameState` (`currentPlayerIndex`, `round`, `maxRounds`, `phase === "finished"`, `player.name`, `player.score`).
   - Result: end-to-end game loop cannot work as implemented.

2. **Turn-phase enforcement is incomplete in engine actions (rule bypass risk).**
   - `validateAction` has no authoritative per-turn phase (`must draw first`, `single draw per turn`, `must discard to end turn`) and comments explicitly acknowledge missing state tracking.
   - `DRAW_FROM_DECK` and `PICK_UP_DISCARD` can be validated repeatedly on the same turn as long as it is still your turn.
   - This is exploitable by malicious clients and hard to recover from once mobile latency/retries are added.

3. **Opening-threshold rule (41+) is not enforced where code says it should be.**
   - `LAY_MELD` validation checks meld shape and ownership but does not enforce 41+ on first open.
   - `applyAction` contains a comment claiming threshold enforcement but intentionally does not enforce it.
   - Bot logic does enforce threshold heuristically, so human and bot behavior diverge.

4. **Perfect-hand rules are internally inconsistent / currently unreachable in legal play.**
   - Win logic expects 2-card pair melds for perfect hand.
   - Core meld validator forbids melds under 3 cards.
   - Tests build impossible 2-card `set` melds directly in state and pass, so correctness is based on synthetic states, not real action flows.

5. **IAP purchase endpoint can credit coins without real receipt validation.**
   - `/shop/purchase` documents strict server validation, but actual RevenueCat validation is TODO and coins are still credited.
   - This is a launch blocker for any monetized mobile release.

6. **Race-condition risk in action processing / state persistence.**
   - `game:action` is read-validate-apply-write on Redis JSON state with no compare-and-set/version lock.
   - Concurrent messages (retries, duplicate taps, multi-device reconnect edge cases) can overwrite each other.
   - Mobile traffic patterns will amplify this risk.

## 2) Medium issues

1. **Separation-of-concerns leakage: duplicated state-sanitization logic.**
   - `sanitizeForPlayer` is in `gameEvents.ts`, but `botAI.ts` duplicates similar sanitization and emit logic.
   - Divergence risk and higher maintenance cost.

2. **Player identity collection at round start can include duplicate users from multiple sockets.**
   - `player:ready` builds `playerIds` directly from room sockets, not deduplicated user IDs.
   - Users with multiple active sockets/tabs can distort seat count/dealer rotation.

3. **Disconnect forfeit flow can leave turn indexing undefined/invalid.**
   - Forfeit removes player from `players` array but does not normalize `activePlayerIndex` or end-round criteria when player count drops.
   - Potential stuck rounds and inconsistent turn timer behavior.

4. **No dedicated server test suite despite complex realtime + monetary behavior.**
   - Engine has Jest tests; server package has no `test` script and no test harness in package scripts.
   - Most critical runtime paths (socket lifecycle, reconciliation, settlement, reconnect) are untested.

5. **Round settlement reliability gaps around async fire-and-forget.**
   - `settleRound` call is not awaited in game flow.
   - Errors are logged, but game state is already published as round over, risking DB/ledger mismatch under failure.

## 3) Low-priority improvements

1. **Generated JS + d.ts artifacts are checked into `src/` across packages.**
   - Source and build output are co-located, increasing review noise and risk of stale artifacts.

2. **Stray anomalous file committed under engine package.**
   - `packages/engine/content = open('packages/engine/src/index.test.ts').read().json` appears accidental and duplicates package metadata.

3. **Hard-coded constants and duplicated domain maps (card points/rank order) across modules.**
   - Domain constants appear in engine and botAI separately; should be centralized in engine exports.

4. **Inconsistent naming conventions across layers (`room` vs `table`, `game_*` vs `game:*`).**
   - Adds friction for mobile integration and observability.

## 4) Recommended cleanup tasks

1. **Define a single, versioned realtime contract.**
   - Create shared event + payload types package and remove ad-hoc string event names from client/server.
   - Add compatibility tests that assert mobile hooks and server emit/on pairs match exactly.

2. **Refactor engine turn model into explicit finite-state machine.**
   - Add fields such as `turnPhase: "must_draw" | "post_draw" | "must_discard"` and enforce in `validateAction`.
   - Include guardrails for idempotent replay and duplicate message handling.

3. **Implement opening-threshold enforcement as a first-class invariant.**
   - Validate cumulative opening meld points atomically during first open and block invalid transitions.

4. **Resolve perfect-hand rules mismatch.**
   - Either support legal 2-card pair meld declaration for that mode, or redefine perfect-hand detection to legal meld constructs only.
   - Update action-level tests to prove reachable flows only.

5. **Introduce state versioning / CAS for Redis game state writes.**
   - Add `stateVersion` and reject stale writes, or move to Redis transactions/Lua for atomic transitions.

6. **Centralize state sanitization and broadcaster implementation.**
   - One reusable `presentGameStateForPlayer` + `broadcastGameState` module used by both game events and bot.

7. **Harden purchase validation before any production/mobile launch.**
   - Enforce RevenueCat verification, idempotency keys, anti-replay checks, and receipt audit trail.

8. **Add server integration tests (high priority test debt).**
   - Start with: join/ready flow, action validation boundaries, reconnect+forfeit, payout settlement success/failure, duplicate socket handling.

9. **Clean repository hygiene.**
   - Stop committing build artifacts in `src`, add ignore/build output policy, remove accidental files.

## 5) “Ready for Mobile?” verdict

**Verdict: NO — Not ready for mobile release yet.**

The current codebase has multiple launch-blocking issues: protocol mismatch between mobile and server, critical rules not fully enforced in engine transitions, and non-validated IAP crediting. Those three alone can break core gameplay, fairness, and monetization integrity under real mobile conditions. After the critical fixes above, re-run a focused readiness gate with integration/load tests and a security review.
