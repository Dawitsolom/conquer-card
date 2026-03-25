import { WinType, PayoutResult } from './types';

// =============================================================================
// scoring.ts  -  calculatePayout
//
// Rules 8.2: Payout structure
//   Normal win:      winner collects betAmount from each other player
//   Joker finish:    winner collects 2 * betAmount from each other player
//   Perfect Hand:    winner collects 2 * betAmount from each other player
//   Payouts do NOT stack - 2x is the maximum regardless of combination
//
// Java analogy: a static utility class with one public method.
//   public static Map<String, Integer> calculatePayout(
//       int betAmount, WinType winType, String winnerId, List<String> allPlayerIds)
// =============================================================================

/**
 * calculatePayout  -  Rules 8.2
 *
 * Returns a PayoutResult: a map of playerId -> coin delta.
 * Winner gets a positive number, every loser gets a negative number.
 *
 * Examples from the rules (4 players, 10-coin bet):
 *   Normal win:  winner +30  (3 losers x 10),  each loser -10
 *   Joker win:   winner +60  (3 losers x 20),  each loser -20
 *
 * @param betAmount   the agreed coins wagered per player per round
 * @param winType     'normal' | 'joker' | 'perfect_hand'
 * @param winnerId    playerId of the winner
 * @param allPlayerIds  all playerIds at the table including the winner
 */
export function calculatePayout(
  betAmount: number,
  winType: WinType,
  winnerId: string,
  allPlayerIds: string[],
): PayoutResult {
  // Rules 8.2: 2x for joker finish or perfect hand; payouts do NOT stack
  const multiplier = winType === 'normal' ? 1 : 2;
  const amountPerLoser = betAmount * multiplier;

  const losers = allPlayerIds.filter(id => id !== winnerId);
  const winnerGains = losers.length * amountPerLoser;

  const result: PayoutResult = {};

  // Winner collects from every other player
  result[winnerId] = winnerGains;

  // Each loser pays the bet amount (flat - Rules 8.3: no card-count penalties)
  for (const loserId of losers) {
    result[loserId] = -amountPerLoser;
  }

  return result;
}
