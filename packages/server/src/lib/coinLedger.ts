import { prisma } from "./prisma";
import { WinType, PayoutResult } from "@conquer-card/engine";

// =============================================================================
// coinLedger.ts  —  All atomic coin operations
//
// Tech Spec §8 rules enforced here:
//   1. Balance NEVER goes below 0
//   2. All transfers are atomic PostgreSQL transactions
//   3. Every credit/debit has a CoinTransaction audit record
//   4. Round bets are reserved upfront and settled on round end
//
// Java analogy: a transactional service class — like a Spring @Service
// where every method is @Transactional and throws if invariants are violated.
//
// Why a separate file?
//   gameEvents.ts handles socket events; shop.ts handles IAP.
//   Both need coin operations. Centralising them here means:
//     - One place to audit the coin rules
//     - One place to enforce the "never goes negative" invariant
//     - Easy to unit-test in isolation
// =============================================================================

// ── Types ─────────────────────────────────────────────────────────────────────

export class InsufficientCoinsError extends Error {
  constructor(userId: string, required: number, available: number) {
    super(`User ${userId} needs ${required} coins but only has ${available}`);
    this.name = "InsufficientCoinsError";
  }
}

// ── reserveBets ───────────────────────────────────────────────────────────────
// NOTE (v1.0): reserveBets is defined but not yet called. Settlement happens
// at round end via settleRound(). Pre-reservation (locking coins upfront) is
// planned for v1.1. DO NOT call both reserveBets + settleRound together without
// updating settleRound to skip re-debiting losers — that would double-debit them.

/**
 * Reserve coins from every player at round start.
 * Deducts `betAmount` from each player's balance upfront.
 * Throws InsufficientCoinsError if ANY player is short — the whole
 * transaction rolls back, so either everyone is reserved or nobody is.
 *
 * Java analogy: like holding a pre-authorisation on a credit card.
 *
 * @param roundId    Prisma Round.id — used for CoinTransaction audit records
 * @param playerIds  all players at the table
 * @param betAmount  coins to reserve per player
 */
export async function reserveBets(
  roundId: string,
  playerIds: string[],
  betAmount: number,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const userId of playerIds) {
      const user = await tx.user.findUnique({
        where:  { id: userId },
        select: { coinBalance: true },
      });
      if (!user) throw new Error(`User ${userId} not found`);
      if (user.coinBalance < betAmount) {
        throw new InsufficientCoinsError(userId, betAmount, user.coinBalance);
      }

      await tx.user.update({
        where: { id: userId },
        data:  { coinBalance: { decrement: betAmount } },
      });
      // Debit recorded as BET_LOSS; will be offset by ROUND_WIN on settlement
      await tx.coinTransaction.create({
        data: { userId, amount: -betAmount, type: "BET_LOSS", roundId },
      });
    }
  });
}

// ── settleRound ───────────────────────────────────────────────────────────────

/**
 * Settle all coin payouts when a round ends.
 * Credits the winner, debits each loser, closes the Round row,
 * updates stats counters (totalRoundsPlayed, totalRoundsWon, doubleWins).
 *
 * This supersedes the inline settleRound in gameEvents.ts — call this
 * instead for a single source of truth.
 *
 * @param tableId    used to locate the open Round
 * @param playerIds  all player IDs in this round
 * @param winnerId   the winning player
 * @param winType    'normal' | 'joker' | 'perfect_hand'
 * @param payouts    map of playerId → coin delta (from engine's calculatePayout)
 */
export async function settleRound(
  tableId: string,
  playerIds: string[],
  winnerId: string,
  winType: WinType,
  payouts: PayoutResult,
): Promise<void> {
  const winTypeDb = winType === "normal"       ? "NORMAL"
                  : winType === "joker"        ? "JOKER"
                  : "PERFECT_HAND";

  const isDouble = winType !== "normal";

  await prisma.$transaction(async (tx) => {
    // Find and close the open Round row
    const round = await tx.round.findFirst({
      where:   { tableId, endedAt: null },
      orderBy: { roundNumber: "desc" },
    });
    if (!round) throw new Error(`No open round found for table ${tableId}`);

    await tx.round.update({
      where: { id: round.id },
      data:  { winnerUserId: winnerId, winType: winTypeDb as any, endedAt: new Date() },
    });

    // Credit/debit each player
    for (const userId of playerIds) {
      const delta    = payouts[userId] ?? 0;
      const isWinner = userId === winnerId;
      const txType   = isWinner
        ? (isDouble ? "DOUBLE_WIN" : "ROUND_WIN")
        : "BET_LOSS";

      // Guard: balance must never go negative (Tech Spec §8)
      if (delta < 0) {
        const current = await tx.user.findUnique({
          where:  { id: userId },
          select: { coinBalance: true },
        });
        if (current && current.coinBalance + delta < 0) {
          // Cap the debit so balance hits 0, not below
          // (edge case: player was nearly broke before the round)
          const cappedDelta = -current.coinBalance;
          await tx.user.update({
            where: { id: userId },
            data:  { coinBalance: 0, totalRoundsPlayed: { increment: 1 } },
          });
          await tx.coinTransaction.create({
            data: { userId, amount: cappedDelta, type: txType, roundId: round.id },
          });
          await tx.gamePlayer.updateMany({
            where: { roundId: round.id, userId },
            data:  { coinsWon: cappedDelta },
          });
          continue;
        }
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          coinBalance:       { increment: delta },
          totalRoundsPlayed: { increment: 1 },
          ...(isWinner ? { totalRoundsWon: { increment: 1 } } : {}),
          ...(isWinner && isDouble ? { doubleWins: { increment: 1 } } : {}),
        },
      });
      await tx.coinTransaction.create({
        data: { userId, amount: delta, type: txType, roundId: round.id },
      });
      await tx.gamePlayer.updateMany({
        where: { roundId: round.id, userId },
        data:  { coinsWon: delta },
      });
    }
  });
}

// ── creditCoins ───────────────────────────────────────────────────────────────

/**
 * General-purpose credit for bonuses (daily bonus, camera reward, welcome bonus).
 * Always a positive delta.
 */
export async function creditCoins(
  userId: string,
  amount: number,
  type: "DAILY_BONUS" | "CAMERA_REWARD" | "WELCOME_BONUS" | "IAP",
  roundId?: string,
): Promise<number> {
  if (amount <= 0) throw new Error("creditCoins: amount must be positive");

  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data:  { coinBalance: { increment: amount } },
      select: { coinBalance: true },
    });
    await tx.coinTransaction.create({
      data: { userId, amount, type, roundId },
    });
    return user;
  });

  return updated.coinBalance;
}

// ── getBalance ────────────────────────────────────────────────────────────────

/** Read the current coin balance for a user. Fast path — no transaction needed. */
export async function getBalance(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { coinBalance: true },
  });
  return user?.coinBalance ?? 0;
}
