import { TestBed } from '@angular/core/testing';
import { THEME_CLASS } from './theme.models';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let theme: ThemeService;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove(
      THEME_CLASS.default,
      THEME_CLASS.alternative,
    );
    TestBed.configureTestingModule({
      providers: [ThemeService],
    });
    theme = TestBed.inject(ThemeService);
  });

  it('applies default theme on construction', () => {
    expect(document.documentElement.classList.contains(THEME_CLASS.default)).toBe(true);
    expect(theme.themeId()).toBe('default');
  });

  it('select persists theme and updates document class', () => {
    theme.select('alternative');
    expect(theme.themeId()).toBe('alternative');
    expect(localStorage.getItem('catalog.theme')).toBe('alternative');
    expect(document.documentElement.classList.contains(THEME_CLASS.alternative)).toBe(true);
    expect(document.documentElement.classList.contains(THEME_CLASS.default)).toBe(false);
  });

  it('ignores invalid theme ids', () => {
    theme.select('default');
    theme.select('invalid' as never);
    expect(theme.themeId()).toBe('default');
  });
});
