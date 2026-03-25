import { validateAction, applyAction } from '../actions';
import { GameState, Player, Meld, Card } from '../types';

// ── test helpers ──────────────────────────────────────────────────────────────
const card = (rank: string, suit: string, di: 0|1 = 0): Card =>
  ({ id: rank+suit[0].toUpperCase()+'_'+di, rank, suit, deckIndex: di } as Card);
const joker = (i: number): Card =>
  ({ id: 'JOKER_'+i, rank: 'JOKER', suit: 'joker', deckIndex: 0 } as Card);

function makePlayer(id: string, hand: Card[], overrides: Partial<Player> = {}): Player {
  return { id, displayName: id, hand, melds: [], status: 'unopened',
           faceUpEligible: true, coinBalance: 500, isBot: false, cameraOn: false, ...overrides };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  const p1 = makePlayer('p1', [card('7','spades'), card('8','spades'), card('9','spades'),
    card('K','spades'), card('K','hearts'), card('K','diamonds'),
    card('A','spades'), card('A','hearts'), card('A','diamonds'),
    card('5','clubs'), card('6','clubs'), card('7','clubs'), card('8','clubs')]);
  const p2 = makePlayer('p2', [card('2','hearts'), card('3','hearts'), card('4','hearts'),
    card('J','spades'), card('J','hearts'), card('J','diamonds'),
    card('Q','spades'), card('Q','hearts'), card('Q','diamonds'),
    card('4','clubs'), card('5','diamonds'), card('6','diamonds'), card('7','diamonds')]);
  return {
    tableId: 't1', roundNumber: 1, phase: 'active',
    players: [p1, p2], activePlayerIndex: 0,
    drawPile: [card('2','spades'), card('3','spades'), card('4','spades')],
    discardPile: [card('10','hearts')],
    faceUpCard: card('K','clubs'),
    allMelds: [], betAmount: 50, dealerIndex: 1,
    jokerCount: 4, sequencesOnlyMode: false,
    turnStartedAt: Date.now(), turnTimeoutSeconds: 30,
    ...overrides,
  };
}

// ── validateAction ────────────────────────────────────────────────────────────
describe('validateAction - DRAW_FROM_DECK', () => {
  test('valid on active turn', () => {
    expect(validateAction(makeState(), { type: 'DRAW_FROM_DECK', playerId: 'p1' }).valid).toBe(true);
  });
  test('invalid if not your turn', () => {
    expect(validateAction(makeState(), { type: 'DRAW_FROM_DECK', playerId: 'p2' }).valid).toBe(false);
  });
  test('invalid if game not active', () => {
    expect(validateAction(makeState({ phase: 'round_over' }), { type: 'DRAW_FROM_DECK', playerId: 'p1' }).valid).toBe(false);
  });
});

describe('validateAction - PICK_UP_DISCARD', () => {
  test('valid for active player', () => {
    expect(validateAction(makeState(), { type: 'PICK_UP_DISCARD', playerId: 'p1' }).valid).toBe(true);
  });
  test('invalid with empty discard pile', () => {
    expect(validateAction(makeState({ discardPile: [] }), { type: 'PICK_UP_DISCARD', playerId: 'p1' }).valid).toBe(false);
  });
});

describe('validateAction - TAKE_FACE_UP_CARD', () => {
  test('valid when faceUpEligible=true and faceUpCard exists', () => {
    expect(validateAction(makeState(), { type: 'TAKE_FACE_UP_CARD', playerId: 'p1' }).valid).toBe(true);
  });
  test('invalid when no face-up card', () => {
    expect(validateAction(makeState({ faceUpCard: null }), { type: 'TAKE_FACE_UP_CARD', playerId: 'p1' }).valid).toBe(false);
  });
  test('invalid when player has already opened (faceUpEligible=false)', () => {
    const s = makeState();
    s.players[0] = { ...s.players[0], faceUpEligible: false };
    expect(validateAction(s, { type: 'TAKE_FACE_UP_CARD', playerId: 'p1' }).valid).toBe(false);
  });
});

describe('validateAction - LAY_MELD', () => {
  test('valid set from hand', () => {
    const s = makeState();
    s.players[0] = { ...s.players[0], status: 'opened' };
    const action = { type: 'LAY_MELD' as const, playerId: 'p1',
      cards: [card('K','spades'), card('K','hearts'), card('K','diamonds')], meldType: 'set' as const };
    expect(validateAction(s, action).valid).toBe(true);
  });
  test('invalid card not in hand', () => {
    const s = makeState();
    const action = { type: 'LAY_MELD' as const, playerId: 'p1',
      cards: [card('2','diamonds'), card('2','hearts'), card('2','clubs')], meldType: 'set' as const };
    expect(validateAction(s, action).valid).toBe(false);
  });
  test('invalid set blocked in seqs-only mode', () => {
    const s = makeState({ sequencesOnlyMode: true });
    s.players[0] = { ...s.players[0], status: 'opened' };
    const action = { type: 'LAY_MELD' as const, playerId: 'p1',
      cards: [card('K','spades'), card('K','hearts'), card('K','diamonds')], meldType: 'set' as const };
    expect(validateAction(s, action).valid).toBe(false);
  });
});

describe('validateAction - ADD_TO_MELD', () => {
  test('valid for opened player', () => {
    const meld: Meld = { id: 'm1', ownerId: 'p2', type: 'sequence',
      cards: [card('5','clubs'), card('6','clubs'), card('7','clubs')] };
    const s = makeState({ allMelds: [meld] });
    s.players[0] = { ...s.players[0], status: 'opened' };
    const action = { type: 'ADD_TO_MELD' as const, playerId: 'p1',
      meldId: 'm1', cards: [card('8','clubs')], position: 'end' as const };
    expect(validateAction(s, action).valid).toBe(true);
  });
  test('invalid for unopened player', () => {
    const meld: Meld = { id: 'm1', ownerId: 'p2', type: 'sequence',
      cards: [card('5','clubs'), card('6','clubs'), card('7','clubs')] };
    const s = makeState({ allMelds: [meld] });
    const action = { type: 'ADD_TO_MELD' as const, playerId: 'p1',
      meldId: 'm1', cards: [card('8','clubs')], position: 'end' as const };
    expect(validateAction(s, action).valid).toBe(false);
  });
});

describe('validateAction - STEAL_JOKER', () => {
  test('valid when player is finishing and meld has joker', () => {
    const meld: Meld = { id: 'm1', ownerId: 'p2', type: 'sequence',
      cards: [card('5','spades'), joker(0), card('7','spades')] };
    const s = makeState({ allMelds: [meld] });
    s.players[0] = { ...s.players[0], status: 'finishing',
      hand: [card('6','spades')] };
    const action = { type: 'STEAL_JOKER' as const, playerId: 'p1',
      meldId: 'm1', replacementCard: card('6','spades') };
    expect(validateAction(s, action).valid).toBe(true);
  });
  test('invalid when player is NOT finishing', () => {
    const meld: Meld = { id: 'm1', ownerId: 'p2', type: 'sequence',
      cards: [card('5','spades'), joker(0), card('7','spades')] };
    const s = makeState({ allMelds: [meld] });
    s.players[0] = { ...s.players[0], status: 'opened', hand: [card('6','spades'), card('9','spades')] };
    const action = { type: 'STEAL_JOKER' as const, playerId: 'p1',
      meldId: 'm1', replacementCard: card('6','spades') };
    expect(validateAction(s, action).valid).toBe(false);
  });
});

// ── applyAction ───────────────────────────────────────────────────────────────
describe('applyAction - DRAW_FROM_DECK', () => {
  test('card moves from drawPile to hand', () => {
    const s = makeState();
    const drawn = s.drawPile[0];
    const next = applyAction(s, { type: 'DRAW_FROM_DECK', playerId: 'p1' });
    expect(next.players[0].hand.map(c => c.id)).toContain(drawn.id);
    expect(next.drawPile.map(c => c.id)).not.toContain(drawn.id);
    expect(next.drawPile.length).toBe(s.drawPile.length - 1);
  });
  test('does not mutate original state', () => {
    const s = makeState();
    const origLen = s.drawPile.length;
    applyAction(s, { type: 'DRAW_FROM_DECK', playerId: 'p1' });
    expect(s.drawPile.length).toBe(origLen);
  });
});

describe('applyAction - PICK_UP_DISCARD', () => {
  test('top discard moves to hand', () => {
    const s = makeState();
    const top = s.discardPile[s.discardPile.length - 1];
    const next = applyAction(s, { type: 'PICK_UP_DISCARD', playerId: 'p1' });
    expect(next.players[0].hand.map(c => c.id)).toContain(top.id);
    expect(next.discardPile.length).toBe(s.discardPile.length - 1);
  });
});

describe('applyAction - LAY_MELD', () => {
  test('cards move from hand to allMelds', () => {
    const s = makeState();
    s.players[0] = { ...s.players[0], status: 'opened' };
    const meldCards = [card('K','spades'), card('K','hearts'), card('K','diamonds')];
    const next = applyAction(s, { type: 'LAY_MELD', playerId: 'p1', cards: meldCards, meldType: 'set' });
    expect(next.allMelds.length).toBe(1);
    const handIds = next.players[0].hand.map(c => c.id);
    meldCards.forEach(mc => expect(handIds).not.toContain(mc.id));
  });
  test('first meld sets faceUpEligible=false', () => {
    const s = makeState();
    const meldCards = [card('K','spades'), card('K','hearts'), card('K','diamonds')];
    const next = applyAction(s, { type: 'LAY_MELD', playerId: 'p1', cards: meldCards, meldType: 'set' });
    expect(next.players[0].faceUpEligible).toBe(false);
  });
});

describe('applyAction - DISCARD', () => {
  test('card moves to discard pile and turn advances', () => {
    const s = makeState();
    const discCard = s.players[0].hand[0];
    const next = applyAction(s, { type: 'DISCARD', playerId: 'p1', card: discCard });
    expect(next.discardPile[next.discardPile.length - 1].id).toBe(discCard.id);
    expect(next.activePlayerIndex).toBe(1);
  });
});

describe('applyAction - TOGGLE_CAMERA', () => {
  test('camera state updates', () => {
    const s = makeState();
    const next = applyAction(s, { type: 'TOGGLE_CAMERA', playerId: 'p1', cameraOn: true });
    expect(next.players[0].cameraOn).toBe(true);
  });
});
