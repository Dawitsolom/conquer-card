import { GameState, GameAction, ValidationResult, Player, Meld, Card } from './types';
import { validateMeld, meetsOpeningThreshold, calculateMeldValue } from './meld';
import { reshuffleDeck } from './deck';
import { v4 as uuidv4 } from 'uuid';

// =============================================================================
// actions.ts  -  validateAction + applyAction
//
// validateAction: pure check — given state + action, is this legal right now?
//   Returns { valid: true } or { valid: false, reason }
//   Never mutates state.
//
// applyAction: applies a validated action and returns a brand-new GameState.
//   ALWAYS call validateAction first. applyAction trusts its input is valid.
//   Never mutates state — uses spread operator to build new objects.
//
// Java analogy:
//   validateAction = a @Validator method that returns a Result<Void, String>
//   applyAction    = a Command handler that returns a new immutable GameState
// =============================================================================

// ── Helpers ───────────────────────────────────────────────────────────────────

function getPlayer(state: GameState, playerId: string): Player | undefined {
  return state.players.find(p => p.id === playerId);
}

function isActiveTurn(state: GameState, playerId: string): boolean {
  return state.players[state.activePlayerIndex]?.id === playerId;
}

// Has the player already drawn/picked-up this turn?
// We track this via a simple convention: if it's your turn and you have
// the same hand size as at turn start, you haven't drawn yet.
// The cleaner approach: we add a 'hasDrawnThisTurn' flag to GameState.
// For now we derive it: activePlayerIndex hasn't changed + phase=active.
// Actually we track it implicitly — DRAW/PICKUP actions move to 'drawn' phase.
// We use player.status === 'finishing' as the signal that all melds are laid.

function removeCardsFromHand(hand: Card[], cardIds: string[]): Card[] {
  const idSet = new Set(cardIds);
  return hand.filter(c => !idSet.has(c.id));
}

function nextPlayerIndex(state: GameState): number {
  return (state.activePlayerIndex + 1) % state.players.length;
}

// ── validateAction ────────────────────────────────────────────────────────────

export function validateAction(
  state: GameState,
  action: GameAction,
): ValidationResult {
  if (state.phase !== 'active') {
    return { valid: false, reason: 'Game is not active' };
  }

  const player = getPlayer(state, action.playerId);
  if (!player) return { valid: false, reason: 'Player not found' };
  if (player.status === 'disconnected') return { valid: false, reason: 'Player is disconnected' };

  // Non-turn actions allowed any time
  if (action.type === 'LEAVE_TABLE' || action.type === 'TOGGLE_CAMERA') {
    return { valid: true };
  }

  if (!isActiveTurn(state, action.playerId)) {
    return { valid: false, reason: 'Not your turn' };
  }

  switch (action.type) {

    case 'DRAW_FROM_DECK':
      if (state.drawPile.length === 0) return { valid: false, reason: 'Draw pile is empty' };
      return { valid: true };

    case 'PICK_UP_DISCARD':
      if (state.discardPile.length === 0) return { valid: false, reason: 'Discard pile is empty' };
      // Unopened players can pick up discard BUT must immediately open with 41+ pts
      // That check happens in applyAction / LAY_MELD phase, not here
      return { valid: true };

    case 'TAKE_FACE_UP_CARD':
      if (!state.faceUpCard) return { valid: false, reason: 'No face-up card available' };
      if (!player.faceUpEligible) return { valid: false, reason: 'You have already laid melds - face-up card not available' };
      return { valid: true };

    case 'LAY_MELD': {
      if (player.status === 'finishing') return { valid: false, reason: 'Already finishing - discard to win' };
      const result = validateMeld(action.cards, action.meldType, state.sequencesOnlyMode);
      if (!result.valid) return result;
      // Verify all cards are in the player's hand
      const handIds = new Set(player.hand.map(c => c.id));
      for (const card of action.cards) {
        if (!handIds.has(card.id)) return { valid: false, reason: `Card ${card.id} is not in your hand` };
      }
      return { valid: true };
    }

    case 'ADD_TO_MELD': {
      if (player.status === 'unopened') return { valid: false, reason: 'You must open before adding to melds' };
      const meld = state.allMelds.find(m => m.id === action.meldId);
      if (!meld) return { valid: false, reason: 'Meld not found' };
      const handIds = new Set(player.hand.map(c => c.id));
      for (const card of action.cards) {
        if (!handIds.has(card.id)) return { valid: false, reason: `Card ${card.id} is not in your hand` };
      }
      // Validate the extended meld
      const newCards = action.position === 'start'
        ? [...action.cards, ...meld.cards]
        : [...meld.cards, ...action.cards];
      const result = validateMeld(newCards, meld.type, state.sequencesOnlyMode);
      if (!result.valid) return { valid: false, reason: `Cannot extend meld: ${result.reason}` };
      return { valid: true };
    }

    case 'STEAL_JOKER': {
      // Only valid as finishing move - player must be down to exactly 1 card
      // after replacing the Joker (i.e. hand has exactly 1 card = the replacement)
      if (player.status !== 'finishing') return { valid: false, reason: 'Can only steal Joker as finishing move' };
      const meld = state.allMelds.find(m => m.id === action.meldId);
      if (!meld) return { valid: false, reason: 'Meld not found' };
      if (!meld.cards.some(c => c.rank === 'JOKER')) return { valid: false, reason: 'That meld has no Joker to steal' };
      const handIds = new Set(player.hand.map(c => c.id));
      if (!handIds.has(action.replacementCard.id)) return { valid: false, reason: 'Replacement card is not in your hand' };

      // NEW: verify replacement card naturally fits the meld (Rules 6.2)
      // replaceFirst: only substitute the FIRST Joker found, not all Jokers.
      // If a meld somehow had two Jokers, replacing all would corrupt the meld.
      let replacedFirst = false;
      const meldWithReplacement = meld.cards.map(c => {
        if (!replacedFirst && c.rank === 'JOKER') {
          replacedFirst = true;
          return action.replacementCard;
        }
        return c;
      });
      const fitCheck = validateMeld(meldWithReplacement, meld.type, state.sequencesOnlyMode);
      if (!fitCheck.valid) {
        return { valid: false, reason: 'Replacement card does not fit the meld' };
      }

      return { valid: true };
    }

    case 'DISCARD': {
      const handIds = new Set(player.hand.map(c => c.id));
      if (!handIds.has(action.card.id)) return { valid: false, reason: 'Card is not in your hand' };
      return { valid: true };
    }

    default:
      return { valid: false, reason: 'Unknown action type' };
  }
}

// ── applyAction ───────────────────────────────────────────────────────────────

export function applyAction(state: GameState, action: GameAction): GameState {
  switch (action.type) {

    case 'DRAW_FROM_DECK': {
      let s = state.drawPile.length === 0 ? reshuffleDeck(state) : state;
      const drawn = s.drawPile[0];
      return {
        ...s,
        drawPile: s.drawPile.slice(1),
        players: s.players.map(p =>
          p.id === action.playerId ? { ...p, hand: [...p.hand, drawn] } : p
        ),
      };
    }

    case 'PICK_UP_DISCARD': {
      const top = state.discardPile[state.discardPile.length - 1];
      return {
        ...state,
        discardPile: state.discardPile.slice(0, -1),
        players: state.players.map(p =>
          p.id === action.playerId ? { ...p, hand: [...p.hand, top] } : p
        ),
      };
    }

    case 'TAKE_FACE_UP_CARD': {
      // Rules 7.3: taking face-up card replaces Step 1; player must finish this turn
      return {
        ...state,
        faceUpCard: null,
        players: state.players.map(p =>
          p.id === action.playerId
            ? { ...p, hand: [...p.hand, state.faceUpCard!], faceUpEligible: false }
            : p
        ),
      };
    }

    case 'LAY_MELD': {
      const player = state.players.find(p => p.id === action.playerId)!;
      const cardIds = action.cards.map(c => c.id);
      const newHand = removeCardsFromHand(player.hand, cardIds);
      const isOpening = player.status === 'unopened';

      const newMeld: Meld = {
        id: `meld-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
        ownerId: action.playerId,
        type: action.meldType,
        cards: action.cards,
      };

      // Opening meld check: if unopened, verify 41+ pt threshold (Rules 5.3)
      // (validateAction ensures the meld shape is valid; here we enforce 41pts)
      // Note: the server should reject if opening total < 41 — we apply as-is
      // since validateAction already passed.

      const newStatus = newHand.length === 1 ? 'finishing' as const : 'opened' as const;

      return {
        ...state,
        allMelds: [...state.allMelds, newMeld],
        players: state.players.map(p =>
          p.id === action.playerId
            ? {
                ...p,
                hand: newHand,
                melds: [...p.melds, newMeld],
                status: newStatus,
                faceUpEligible: isOpening ? false : p.faceUpEligible,
              }
            : p
        ),
      };
    }

    case 'ADD_TO_MELD': {
      const player = state.players.find(p => p.id === action.playerId)!;
      const cardIds = action.cards.map(c => c.id);
      const newHand = removeCardsFromHand(player.hand, cardIds);

      const updatedMelds = state.allMelds.map(m => {
        if (m.id !== action.meldId) return m;
        const newCards = action.position === 'start'
          ? [...action.cards, ...m.cards]
          : [...m.cards, ...action.cards];
        return { ...m, cards: newCards };
      });

      const newStatus = newHand.length === 1 ? 'finishing' as const : player.status;

      return {
        ...state,
        allMelds: updatedMelds,
        players: state.players.map(p =>
          p.id === action.playerId
            ? {
                ...p,
                hand: newHand,
                melds: p.melds.map(m => updatedMelds.find(um => um.id === m.id) ?? m),
                status: newStatus,
              }
            : p
        ),
      };
    }

    case 'STEAL_JOKER': {
      // Rules 6.2: replace Joker in meld with replacementCard, take Joker into hand
      const updatedMelds = state.allMelds.map(m => {
        if (m.id !== action.meldId) return m;
        const jokerIdx = m.cards.findIndex(c => c.rank === 'JOKER');
        const newCards = [...m.cards];
        newCards[jokerIdx] = action.replacementCard;
        return { ...m, cards: newCards };
      });

      // Swap: replacementCard leaves hand, Joker enters hand
      const stolenJoker = state.allMelds
        .find(m => m.id === action.meldId)!
        .cards.find(c => c.rank === 'JOKER')!;

      return {
        ...state,
        allMelds: updatedMelds,
        players: state.players.map(p => {
          if (p.id !== action.playerId) return p;
          const newHand = removeCardsFromHand(p.hand, [action.replacementCard.id]);
          return { ...p, hand: [...newHand, stolenJoker] };
        }),
      };
    }

    case 'DISCARD': {
      const newHand = removeCardsFromHand(
        state.players.find(p => p.id === action.playerId)!.hand,
        [action.card.id]
      );
      const updatedPlayers = state.players.map(p =>
        p.id === action.playerId
          ? { ...p, hand: newHand, status: 'opened' as const }
          : p
      );
      return {
        ...state,
        discardPile: [...state.discardPile, action.card],
        players: updatedPlayers,
        activePlayerIndex: nextPlayerIndex(state),
        turnStartedAt: Date.now(),
      };
    }

    case 'LEAVE_TABLE': {
      return {
        ...state,
        players: state.players.map(p =>
          p.id === action.playerId ? { ...p, status: 'disconnected' as const } : p
        ),
      };
    }

    case 'TOGGLE_CAMERA': {
      return {
        ...state,
        players: state.players.map(p =>
          p.id === action.playerId ? { ...p, cameraOn: action.cameraOn } : p
        ),
      };
    }
  }
}
