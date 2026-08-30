import { TestBed } from '@angular/core/testing';
import { LocaleService } from './locale.service';

describe('LocaleService', () => {
  let locale: LocaleService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [LocaleService],
    });
    locale = TestBed.inject(LocaleService);
  });

  it('defaults to configured country when storage is empty', () => {
    expect(locale.countryCode()).toBeTruthy();
    expect(locale.language()).toBeTruthy();
  });

  it('selectCountry persists valid country code', () => {
    locale.selectCountry('US');
    expect(locale.countryCode()).toBe('US');
    expect(localStorage.getItem('catalog.locale.country')).toBe('US');
  });

  it('ignores invalid country selection', () => {
    const before = locale.countryCode();
    locale.selectCountry('XX' as never);
    expect(locale.countryCode()).toBe(before);
  });

  it('setFxRates merges API rates with fallback', () => {
    locale.selectCountry('US');
    locale.setFxRates({ eur: 0.9, try: 40 });
    expect(locale.toDisplayMoney(10)).toBe(10);
    locale.selectCountry('PT');
    expect(locale.toDisplayMoney(10)).toBe(9);
  });

  it('t interpolates params and falls back to key', () => {
    expect(locale.t('catalog.search')).toBeTruthy();
    expect(locale.t('missing.key.xyz')).toBe('missing.key.xyz');
    expect(locale.t('product.inStock', { count: 3 })).toContain('3');
  });

  it('lineTotal converts USD catalog price for active currency', () => {
    locale.selectCountry('US');
    locale.setFxRates({ USD: 1, EUR: 0.5 });
    locale.selectCountry('PT');
    expect(locale.lineTotal(10, 2)).toBe(10);
  });
});
