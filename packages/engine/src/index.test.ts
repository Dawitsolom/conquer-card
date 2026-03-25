import { getEngineStatus } from './index';
import { createDeck, shuffleDeck, dealCards } from './deck';
import { createGameState, startGame, applyAction, getWinner } from './gameState';

describe('Engine', () => {
  it('status', () => expect(getEngineStatus()).toBe('Conquer Card engine is running'));
});
describe('Deck', () => {
  it('48 cards', () => expect(createDeck()).toHaveLength(48));
  it('4 suits', () => expect(new Set(createDeck().map(c=>c.suit))).toEqual(new Set(['coins','cups','swords','clubs'])));
  it('shuffles', () => expect(shuffleDeck(createDeck())).toHaveLength(48));
  it('deals', () => { const {hands,remaining}=dealCards(createDeck(),4,5); hands.forEach(h=>expect(h).toHaveLength(5)); expect(remaining).toHaveLength(28); });
});
describe('GameState', () => {
  const pl=[{id:'p1',name:'Dawit'},{id:'p2',name:'Abebe'}];
  it('waiting', () => expect(createGameState('r',pl).phase).toBe('waiting'));
  it('starts', () => { const s=startGame(createGameState('r',pl)); expect(s.phase).toBe('playing'); });
  it('play card', () => { const s=startGame(createGameState('r',pl)); const c=s.players[0].hand[0]; const n=applyAction(s,{type:'PLAY_CARD',playerId:'p1',cardId:c.id}); expect(n.players[0].score).toBe(1); });
  it('no winner', () => expect(getWinner(createGameState('r',pl))).toBeNull());
});