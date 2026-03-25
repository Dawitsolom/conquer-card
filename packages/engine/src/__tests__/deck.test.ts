import { createDeck, shuffleDeck, dealCards, reshuffleDeck } from '../deck';
import { Card, GameState } from '../types';

const CFG = { jokerCount: 4 as const, sequencesOnlyMode: false, betAmount: 50, turnTimeoutSeconds: 30 };
const BAL = { p1: 500, p2: 500, p3: 500, p4: 500 };

// ── createDeck ────────────────────────────────────────────────────────────────
describe('createDeck', () => {
  test('0 jokers = 104 cards', () => expect(createDeck(0)).toHaveLength(104));
  test('2 jokers = 106 cards', () => expect(createDeck(2)).toHaveLength(106));
  test('4 jokers = 108 cards', () => expect(createDeck(4)).toHaveLength(108));

  test('all card IDs are unique', () => {
    const deck = createDeck(4);
    expect(new Set(deck.map(c => c.id)).size).toBe(108);
  });

  test('7S_0 and 7S_1 both exist and are distinct', () => {
    const sevens = createDeck(0).filter(c => c.rank === '7' && c.suit === 'spades');
    expect(sevens).toHaveLength(2);
    expect(sevens[0].id).not.toBe(sevens[1].id);
    expect(sevens.map(c => c.deckIndex).sort()).toEqual([0, 1]);
  });

  test('26 spades per deck (13 ranks x 2 decks)', () => {
    expect(createDeck(0).filter(c => c.suit === 'spades')).toHaveLength(26);
  });

  test('jokers have suit joker and rank JOKER', () => {
    const jokers = createDeck(4).filter(c => c.rank === 'JOKER');
    expect(jokers).toHaveLength(4);
    jokers.forEach(j => expect(j.suit).toBe('joker'));
  });

  test('0 jokers means no JOKER cards', () => {
    expect(createDeck(0).filter(c => c.rank === 'JOKER')).toHaveLength(0);
  });
});

// ── shuffleDeck ───────────────────────────────────────────────────────────────
describe('shuffleDeck', () => {
  test('same length after shuffle', () =>
    expect(shuffleDeck(createDeck(0))).toHaveLength(104));

  test('does not mutate input', () => {
    const deck = createDeck(0);
    const orig = [...deck];
    shuffleDeck(deck);
    expect(deck).toEqual(orig);
  });

  test('contains the exact same cards', () => {
    const deck = createDeck(4);
    const sort = (a: Card[]) => [...a].sort((x, y) => x.id.localeCompare(y.id));
    expect(sort(shuffleDeck(deck))).toEqual(sort(deck));
  });
});

// ── dealCards ─────────────────────────────────────────────────────────────────
describe('dealCards - 2 players', () => {
  let s: GameState;
  beforeEach(() => {
    s = dealCards('t1', ['p1', 'p2'], ['Alice', 'Bob'], 0, CFG, BAL);
  });

  test('each player has 13 cards', () =>
    s.players.forEach(p => expect(p.hand).toHaveLength(13)));

  test('discard pile has exactly 1 card', () =>
    expect(s.discardPile).toHaveLength(1));

  test('faceUpCard is not null', () => {
    expect(s.faceUpCard).not.toBeNull();
  });

  test('faceUpCard not in any hand', () => {
    const fuc = s.faceUpCard;
    if (fuc == null) throw new Error('faceUpCard is null');
    s.players.forEach(p => expect(p.hand.map(c => c.id)).not.toContain(fuc.id));
  });

  test('faceUpCard not in discard pile', () => {
    const fuc = s.faceUpCard;
    if (fuc == null) throw new Error('faceUpCard is null');
    expect(s.discardPile.map(c => c.id)).not.toContain(fuc.id);
  });

  test('no duplicate cards anywhere', () => {
    const fuc = s.faceUpCard;
    if (fuc == null) throw new Error('faceUpCard is null');
    const all = [
      ...s.players.flatMap(p => p.hand),
      ...s.discardPile,
      ...s.drawPile,
      fuc,
    ].map(c => c.id);
    expect(new Set(all).size).toBe(all.length);
  });

  test('total cards = 108 (4 jokers)', () => {
    const total =
      s.players.reduce((n, p) => n + p.hand.length, 0) +
      s.discardPile.length +
      s.drawPile.length +
      1; // faceUpCard
    expect(total).toBe(108);
  });

  test('all players start with status=unopened', () =>
    s.players.forEach(p => expect(p.status).toBe('unopened')));

  test('all players start faceUpEligible=true', () =>
    s.players.forEach(p => expect(p.faceUpEligible).toBe(true)));

  test('first active player is dealer+1 = index 1', () =>
    expect(s.activePlayerIndex).toBe(1));

  test('phase is active', () =>
    expect(s.phase).toBe('active'));
});

describe('dealCards - 4 players dealer=2', () => {
  let s: GameState;
  beforeEach(() => {
    s = dealCards('t2', ['p1', 'p2', 'p3', 'p4'], ['A', 'B', 'C', 'D'], 2, CFG, BAL);
  });

  test('each player has 13 cards', () =>
    s.players.forEach(p => expect(p.hand).toHaveLength(13)));

  test('first active player = index 3', () =>
    expect(s.activePlayerIndex).toBe(3));

  test('dealerIndex stored correctly', () =>
    expect(s.dealerIndex).toBe(2));
});

// ── reshuffleDeck ─────────────────────────────────────────────────────────────
describe('reshuffleDeck - Rules 7.1', () => {
  test('top discard card stays on new discard pile', () => {
    const s = dealCards('t3', ['p1', 'p2'], ['A', 'B'], 0, CFG, BAL);
    const extra = s.drawPile.slice(0, 5);
    const big: GameState = {
      ...s,
      discardPile: [...extra, s.discardPile[0]],
      drawPile: s.drawPile.slice(5),
    };
    const top = big.discardPile[big.discardPile.length - 1];
    const r = reshuffleDeck(big);
    expect(r.discardPile).toHaveLength(1);
    expect(r.discardPile[0].id).toBe(top.id);
  });

  test('old discard cards become draw pile', () => {
    const s = dealCards('t4', ['p1', 'p2'], ['A', 'B'], 0, CFG, BAL);
    const extra = s.drawPile.slice(0, 10);
    const big: GameState = {
      ...s,
      discardPile: [...extra, s.discardPile[0]],
      drawPile: [],
    };
    expect(reshuffleDeck(big).drawPile).toHaveLength(10);
  });

  test('does not mutate original state', () => {
    const s = dealCards('t5', ['p1', 'p2'], ['A', 'B'], 0, CFG, BAL);
    const len = s.discardPile.length;
    reshuffleDeck(s);
    expect(s.discardPile).toHaveLength(len);
  });
});
