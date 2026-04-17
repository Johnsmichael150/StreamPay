// Feature: stream-pay-africa
// Unit tests for FX rate service
// Requirements: 7.2, 7.3, 7.4

import { isStale } from './fxService';
import type { FXRates } from '@streampay/shared';

const SIXTY_MIN_MS = 60 * 60 * 1000;

function makeRates(fetchedAt: number): FXRates {
  return { NGN: 1600, KES: 130, GHS: 12, fetchedAt };
}

describe('isStale', () => {
  it('returns false when rates are fresh (< 60 min old)', () => {
    const now = Date.now();
    const rates = makeRates(now - SIXTY_MIN_MS + 1000); // 59 min old
    expect(isStale(rates, now)).toBe(false);
  });

  it('returns true when rates are exactly 60 minutes old', () => {
    const now = Date.now();
    const rates = makeRates(now - SIXTY_MIN_MS);
    expect(isStale(rates, now)).toBe(true);
  });

  it('returns true when rates are older than 60 minutes', () => {
    const now = Date.now();
    const rates = makeRates(now - SIXTY_MIN_MS - 1000); // 61 min old
    expect(isStale(rates, now)).toBe(true);
  });

  it('returns true for very old rates (> 2 hours)', () => {
    const now = Date.now();
    const rates = makeRates(now - 3 * 60 * 60 * 1000); // 3 hours old
    expect(isStale(rates, now)).toBe(true);
  });
});
