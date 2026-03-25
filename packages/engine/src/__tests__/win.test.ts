import { checkWinCondition, advanceTurn, handleTimeout } from '../win';
import { GameState, Player, Meld, Card } from '../types';

const card = (rank: string, suit: string, di: 0|1 = 0): Card =>
  ({ id: rank+suit[0].toUpperCase()+'_'+di, rank, suit, deckIndex: di } as Card);
const joker = (i: number): Card =>
  ({ id: 'JOKER_'+i, rank: 'JOKER', suit: 'joker', deckIndex: 0 } as Card);

function makePlayer(id: string, overrides: Partial<Player> = {}): Player {
  return { id, displayName: id, hand: [], melds: [], status: 'opened',
           faceUpEligible: false, coinBalance: 500, isBot: false, cameraOn: false, ...overrides };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  const p1 = makePlayer('p1');
  const p2 = makePlayer('p2');
  return {
    tableId: 't1', roundNumber: 1, phase: 'active',
    players: [p1, p2], activePlayerIndex: 0,
    drawPile: [card('2','spades'), card('3','spades'), card('4','spades'),
               card('5','spades'), card('6','spades')],
    discardPile: [card('10','hearts')],
    faceUpCard: null, allMelds: [], betAmount: 50, dealerIndex: 1,
    jokerCount: 4, sequencesOnlyMode: false,
    turnStartedAt: Date.now(), turnTimeoutSeconds: 30,
    ...overrides,
  };
}

// ── checkWinCondition ─────────────────────────────────────────────────────────
describe('checkWinCondition - Rules 8.1', () => {
  test('normal win: empty hand + normal discard', () => {
    const s = makeState();
    expect(checkWinCondition(s, 'p1', card('5','clubs'))).toBe('normal');
  });

  test('joker finish: empty hand + Joker discard = 2x (Rules 6.3)', () => {
    const s = makeState();
    expect(checkWinCondition(s, 'p1', joker(0))).toBe('joker');
  });

  test('no win if hand is not empty', () => {
    const s = makeState();
    s.players[0] = { ...s.players[0], hand: [card('5','clubs')] };
    expect(checkWinCondition(s, 'p1', card('6','clubs'))).toBeNull();
  });

  test('perfect hand: 5 identical pairs + meld of 3 (Rules 7.4)', () => {
    // Build 5 pair melds (same rank+suit, diff deckIndex) + 1 triple meld
    const pairs: Meld[] = [
      { id: 'm1', ownerId: 'p1', type: 'set', cards: [card('7','spades',0), card('7','spades',1)] },
      { id: 'm2', ownerId: 'p1', type: 'set', cards: [card('8','hearts',0), card('8','hearts',1)] },
      { id: 'm3', ownerId: 'p1', type: 'set', cards: [card('9','diamonds',0), card('9','diamonds',1)] },
      { id: 'm4', ownerId: 'p1', type: 'set', cards: [card('K','clubs',0), card('K','clubs',1)] },
      { id: 'm5', ownerId: 'p1', type: 'set', cards: [card('A','spades',0), card('A','spades',1)] },
    ];
    const triple: Meld = { id: 'm6', ownerId: 'p1', type: 'set',
      cards: [card('Q','spades'), card('Q','hearts'), card('Q','diamonds')] };
    const s = makeState({ allMelds: [...pairs, triple] });
    expect(checkWinCondition(s, 'p1', card('5','clubs'))).toBe('perfect_hand');
  });

  test('perfect hand with Joker discard = still perfect_hand (2x max, no stack - Rules 7.4)', () => {
    const pairs: Meld[] = [
      { id: 'm1', ownerId: 'p1', type: 'set', cards: [card('7','spades',0), card('7','spades',1)] },
      { id: 'm2', ownerId: 'p1', type: 'set', cards: [card('8','hearts',0), card('8','hearts',1)] },
      { id: 'm3', ownerId: 'p1', type: 'set', cards: [card('9','diamonds',0), card('9','diamonds',1)] },
      { id: 'm4', ownerId: 'p1', type: 'set', cards: [card('K','clubs',0), card('K','clubs',1)] },
      { id: 'm5', ownerId: 'p1', type: 'set', cards: [card('A','spades',0), card('A','spades',1)] },
    ];
    const triple: Meld = { id: 'm6', ownerId: 'p1', type: 'set',
      cards: [card('Q','spades'), card('Q','hearts'), card('Q','diamonds')] };
    const s = makeState({ allMelds: [...pairs, triple] });
    // perfect_hand takes priority over joker (both are 2x anyway)
    expect(checkWinCondition(s, 'p1', joker(0))).toBe('perfect_hand');
  });

  test('not perfect hand if pairs are not identical (different suits)', () => {
    const badPairs: Meld[] = [
      // This pair has different suits — not a valid identical pair
      { id: 'm1', ownerId: 'p1', type: 'set', cards: [card('7','spades',0), card('7','hearts',1)] },
      { id: 'm2', ownerId: 'p1', type: 'set', cards: [card('8','hearts',0), card('8','hearts',1)] },
      { id: 'm3', ownerId: 'p1', type: 'set', cards: [card('9','diamonds',0), card('9','diamonds',1)] },
      { id: 'm4', ownerId: 'p1', type: 'set', cards: [card('K','clubs',0), card('K','clubs',1)] },
      { id: 'm5', ownerId: 'p1', type: 'set', cards: [card('A','spades',0), card('A','spades',1)] },
    ];
    const triple: Meld = { id: 'm6', ownerId: 'p1', type: 'set',
      cards: [card('Q','spades'), card('Q','hearts'), card('Q','diamonds')] };
    const s = makeState({ allMelds: [...badPairs, triple] });
    // Falls back to normal (no perfect hand, no joker discard)
    expect(checkWinCondition(s, 'p1', card('5','clubs'))).toBe('normal');
  });
});

// ── advanceTurn ───────────────────────────────────────────────────────────────
describe('advanceTurn - Rules 3.4', () => {
  test('advances to next player', () => {
    const s = makeState();
    expect(advanceTurn(s).activePlayerIndex).toBe(1);
  });

  test('wraps around from last player back to first', () => {
    const s = makeState({ activePlayerIndex: 1 });
    expect(advanceTurn(s).activePlayerIndex).toBe(0);
  });

  test('skips disconnected players', () => {
    const p1 = makePlayer('p1');
    const p2 = makePlayer('p2', { status: 'disconnected' });
    const p3 = makePlayer('p3');
    const s = makeState({ players: [p1, p2, p3], activePlayerIndex: 0 });
    expect(advanceTurn(s).activePlayerIndex).toBe(2);
  });

  test('resets turnStartedAt', () => {
    const s = makeState({ turnStartedAt: 0 });
    expect(advanceTurn(s).turnStartedAt).toBeGreaterThan(0);
  });

  test('does not mutate original state', () => {
    const s = makeState();
    advanceTurn(s);
    expect(s.activePlayerIndex).toBe(0);
  });
});

// ── handleTimeout ─────────────────────────────────────────────────────────────
describe('handleTimeout - Rules 9.4', () => {
  test('auto-draws and auto-discards, turn advances', () => {
    const p1 = makePlayer('p1', { hand: [card('K','spades'), card('Q','hearts')] });
    const p2 = makePlayer('p2');
    const s = makeState({ players: [p1, p2] });
    const drawn = s.drawPile[0];
    const next = handleTimeout(s);
    // The drawn card should be in the discard pile (auto-discarded)
    expect(next.discardPile.map(c => c.id)).toContain(drawn.id);
    // Turn should have advanced to p2
    expect(next.activePlayerIndex).toBe(1);
    // Hand size stays the same (drew 1, discarded 1)
    expect(next.players[0].hand.length).toBe(p1.hand.length);
  });

  test('does not mutate original state', () => {
    const p1 = makePlayer('p1', { hand: [card('K','spades')] });
    const p2 = makePlayer('p2');
    const s = makeState({ players: [p1, p2] });
    const origPileLen = s.drawPile.length;
    handleTimeout(s);
    expect(s.drawPile.length).toBe(origPileLen);
  });
});
