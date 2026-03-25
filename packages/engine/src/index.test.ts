import { getEngineStatus } from './index';

describe('Conquer Card Engine', () => {
  it('should return the correct engine status message', () => {
    const status = getEngineStatus();
    expect(status).toBe('Conquer Card engine is running');
  });

  it('should return a string type', () => {
    const status = getEngineStatus();
    expect(typeof status).toBe('string');
  });
});
