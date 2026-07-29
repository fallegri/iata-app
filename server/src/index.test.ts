import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

describe('Server workspace setup', () => {
  it('should run vitest correctly', () => {
    expect(1 + 1).toBe(2);
  });

  it('should support fast-check property tests', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => {
        expect(a + b).toBe(b + a);
      }),
      { numRuns: 100 }
    );
  });
});
