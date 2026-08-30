import { describe, expect, it } from 'vitest';
import {
  FALLBACK_USD_TO_RATES,
  convertUnitFromUsd,
  lineTotalFromUsd,
} from './fx';

describe('fx', () => {
  it('convertUnitFromUsd applies rate with 2dp rounding', () => {
    expect(convertUnitFromUsd(10, 'EUR', FALLBACK_USD_TO_RATES)).toBe(8.7);
  });

  it('convertUnitFromUsd falls back to 1 for unknown currency', () => {
    expect(convertUnitFromUsd(12.345, 'XYZ', FALLBACK_USD_TO_RATES)).toBe(12.35);
  });

  it('lineTotalFromUsd multiplies converted unit by quantity', () => {
    expect(lineTotalFromUsd(10, 3, 'USD', FALLBACK_USD_TO_RATES)).toBe(30);
  });

  it('lineTotalFromUsd treats non-numeric unit as zero', () => {
    expect(lineTotalFromUsd(Number.NaN, 2, 'USD', FALLBACK_USD_TO_RATES)).toBe(0);
  });
});
