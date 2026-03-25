import { calculatePayout } from '../scoring';
const P = ['p1','p2','p3','p4'];
describe('calculatePayout - Rules 8.2', () => {
  test('normal win 4p 10-coin: winner +30, each loser -10', () => {
    const r = calculatePayout(10,'normal','p1',P);
    expect(r['p1']).toBe(30); expect(r['p2']).toBe(-10);
    expect(r['p3']).toBe(-10); expect(r['p4']).toBe(-10);
  });
  test('joker win 4p 10-coin: winner +60, each loser -20', () => {
    const r = calculatePayout(10,'joker','p1',P);
    expect(r['p1']).toBe(60); expect(r['p2']).toBe(-20);
  });
  test('perfect_hand win 4p 10-coin: same as joker (2x)', () => {
    const r = calculatePayout(10,'perfect_hand','p1',P);
    expect(r['p1']).toBe(60); expect(r['p2']).toBe(-20);
  });
  test('payouts do not stack - perfect_hand same as joker (2x max)', () => {
    const joker = calculatePayout(50,'joker','p1',P);
    const ph    = calculatePayout(50,'perfect_hand','p1',P);
    expect(joker['p1']).toBe(ph['p1']);
  });
  test('normal win 2p 50-coin: winner +50, loser -50', () => {
    const r = calculatePayout(50,'normal','p1',['p1','p2']);
    expect(r['p1']).toBe(50); expect(r['p2']).toBe(-50);
  });
  test('normal win 5p 100-coin: winner +400', () => {
    const r = calculatePayout(100,'normal','p1',['p1','p2','p3','p4','p5']);
    expect(r['p1']).toBe(400);
    ['p2','p3','p4','p5'].forEach(id => expect(r[id]).toBe(-100));
  });
  test('zero-sum: all deltas sum to 0', () => {
    const r = calculatePayout(50,'joker','p2',P);
    const sum = Object.values(r).reduce((a,b) => a+b, 0);
    expect(sum).toBe(0);
  });
  test('winner id in result is correct', () => {
    const r = calculatePayout(10,'normal','p3',P);
    expect(r['p3']).toBeGreaterThan(0);
    expect(r['p1']).toBeLessThan(0);
  });
});
