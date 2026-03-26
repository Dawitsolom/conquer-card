import { validateMeld, calculateMeldValue, meetsOpeningThreshold } from '../meld';
import { Card } from '../types';
const c = (rank: string, suit: string, di: 0|1 = 0): Card => 
  ({ id: rank+suit[0].toUpperCase()+'_'+di, rank, suit, deckIndex: di } as Card);
const j = (i: number): Card =>
  ({ id: 'JOKER_'+i, rank: 'JOKER', suit: 'joker', deckIndex: i<2?0:1 } as Card);
describe('calculateMeldValue', () => {
  test('K+Q+J = 30', () => expect(calculateMeldValue([c('K','spades'),c('Q','spades'),c('J','spades')])).toBe(30));
  test('7+7+7 = 21', () => expect(calculateMeldValue([c('7','spades'),c('7','hearts'),c('7','diamonds')])).toBe(21));
  test('A = 11',     () => expect(calculateMeldValue([c('A','spades')])).toBe(11));
  test('Joker = 0',  () => expect(calculateMeldValue([j(0)])).toBe(0));
  test('7s(21)+JQK(30)=51', () => {
    const t = [[c('7','spades'),c('7','hearts'),c('7','diamonds')],[c('J','spades'),c('Q','spades'),c('K','spades')]];
    expect(t.reduce((s,m)=>s+calculateMeldValue(m),0)).toBe(51);
  });
});
describe('meetsOpeningThreshold', () => {
  test('51 pts passes',  () => expect(meetsOpeningThreshold([[c('7','spades'),c('7','hearts'),c('7','diamonds')],[c('J','spades'),c('Q','spades'),c('K','spades')]])).toBe(true));
  test('40 pts fails',   () => expect(meetsOpeningThreshold([[c('K','spades'),c('K','hearts'),c('K','diamonds')],[c('2','spades'),c('3','hearts'),c('5','clubs')]])).toBe(false));
  test('exactly 41 passes', () => expect(meetsOpeningThreshold([[c('K','spades'),c('K','hearts'),c('K','diamonds')],[c('A','spades'),c('A','hearts'),c('9','clubs')]])).toBe(true));
  // 3-meld rule (Rule 2)
  const s3 = [c('5','spades'),c('6','spades'),c('7','spades')]; // ~15 pts
  const s4 = [c('2','spades'),c('3','spades'),c('4','spades')]; // ~9 pts
  const s5 = [c('2','hearts'),c('3','hearts'),c('4','hearts')]; // ~9 pts
  const s6 = [c('2','diamonds'),c('3','diamonds'),c('4','diamonds')]; // ~9 pts
  test('3 melds totalling 28 pts → ACCEPTED (3-meld rule)', () => expect(meetsOpeningThreshold([s3, s4, s5])).toBe(true));
  test('2 melds totalling 45 pts → ACCEPTED (41-pt rule)', () => expect(meetsOpeningThreshold([[c('K','spades'),c('K','hearts'),c('K','diamonds')],[c('A','spades'),c('A','hearts'),c('Q','clubs')]])).toBe(true));
  test('2 melds totalling 38 pts → REJECTED (neither rule met)', () => expect(meetsOpeningThreshold([[c('K','spades'),c('K','hearts'),c('K','diamonds')],[c('2','spades'),c('3','hearts'),c('4','clubs')]])).toBe(false));
  test('4 melds totalling 20 pts → ACCEPTED (4 melds >= 3)', () => expect(meetsOpeningThreshold([s3, s4, s5, s6])).toBe(true));
  test('1 meld totalling 50 pts → ACCEPTED (50 >= 41)', () => expect(meetsOpeningThreshold([[c('K','spades'),c('K','hearts'),c('K','diamonds'),c('A','clubs')]])).toBe(true));
  test('1 meld totalling 35 pts → REJECTED (1 meld < 3, 35 < 41)', () => expect(meetsOpeningThreshold([[c('K','spades'),c('K','hearts'),c('K','diamonds')]])).toBe(false));
});
describe('validateMeld - sets', () => {
  test('3 sevens diff suits = valid',   () => expect(validateMeld([c('7','spades'),c('7','hearts'),c('7','diamonds')],'set',false).valid).toBe(true));
  test('4 kings all suits = valid',     () => expect(validateMeld([c('K','spades'),c('K','hearts'),c('K','diamonds'),c('K','clubs')],'set',false).valid).toBe(true));
  test('set with joker = valid',        () => expect(validateMeld([c('7','spades'),c('7','hearts'),j(0)],'set',false).valid).toBe(true));
  test('same suit twice = invalid',     () => expect(validateMeld([c('7','spades',0),c('7','spades',1),c('7','hearts')],'set',false).valid).toBe(false));
  test('set of 5 = invalid',            () => expect(validateMeld([c('7','spades'),c('7','hearts'),c('7','diamonds'),c('7','clubs'),c('7','spades',1)],'set',false).valid).toBe(false));
  test('set of 2 = invalid',            () => expect(validateMeld([c('7','spades'),c('7','hearts')],'set',false).valid).toBe(false));
  test('set blocked seqs-only mode',    () => expect(validateMeld([c('7','spades'),c('7','hearts'),c('7','diamonds')],'set',true).valid).toBe(false));
  test('duplicate id = invalid',        () => { const s=c('7','spades',0); expect(validateMeld([s,s,c('7','hearts')],'set',false).valid).toBe(false); });
});
describe('validateMeld - sequences', () => {
  test('5-6-7 spades = valid 3-card',              () => expect(validateMeld([c('5','spades'),c('6','spades'),c('7','spades')],'sequence',false).valid).toBe(true));
  test('5-6-7-8 spades = valid 4-card',            () => expect(validateMeld([c('5','spades'),c('6','spades'),c('7','spades'),c('8','spades')],'sequence',false).valid).toBe(true));
  test('9-10-J-Q-K spades = valid 5-card',         () => expect(validateMeld([c('9','spades'),c('10','spades'),c('J','spades'),c('Q','spades'),c('K','spades')],'sequence',false).valid).toBe(true));
  test('6-card seq = invalid must split',           () => expect(validateMeld([c('5','spades'),c('6','spades'),c('7','spades'),c('8','spades'),c('9','spades'),c('10','spades')],'sequence',false).valid).toBe(false));
  test('5-JOKER-7 spades = valid (wild)',           () => expect(validateMeld([c('5','spades'),j(0),c('7','spades')],'sequence',false).valid).toBe(true));
  test('A-2-3 spades = valid Ace LOW',              () => expect(validateMeld([c('A','spades'),c('2','spades'),c('3','spades')],'sequence',false).valid).toBe(true));
  test('Q-K-A spades = valid Ace HIGH',             () => expect(validateMeld([c('Q','spades'),c('K','spades'),c('A','spades')],'sequence',false).valid).toBe(true));
  test('K-A-2 spades = INVALID wraparound',         () => expect(validateMeld([c('K','spades'),c('A','spades'),c('2','spades')],'sequence',false).valid).toBe(false));
  test('mixed suits = invalid',                     () => expect(validateMeld([c('5','spades'),c('6','hearts'),c('7','spades')],'sequence',false).valid).toBe(false));
  test('gap of 2 no joker = invalid',               () => expect(validateMeld([c('5','spades'),c('7','spades'),c('9','spades')],'sequence',false).valid).toBe(false));
  test('seq allowed in seqs-only mode',             () => expect(validateMeld([c('5','spades'),c('6','spades'),c('7','spades')],'sequence',true).valid).toBe(true));
  test('2-card seq = invalid',                      () => expect(validateMeld([c('5','spades'),c('6','spades')],'sequence',false).valid).toBe(false));
});
