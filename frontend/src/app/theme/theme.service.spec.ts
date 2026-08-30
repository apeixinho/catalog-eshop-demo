import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let theme: ThemeService;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    TestBed.configureTestingModule({
      providers: [ThemeService],
    });
    theme = TestBed.inject(ThemeService);
  });

  it('applies default theme on construction', () => {
    expect(document.documentElement.getAttribute('data-theme')).toBe('default');
    expect(theme.themeId()).toBe('default');
  });

  it('select persists theme and updates document attribute', () => {
    theme.select('alternative');
    expect(theme.themeId()).toBe('alternative');
    expect(localStorage.getItem('catalog.theme')).toBe('alternative');
    expect(document.documentElement.getAttribute('data-theme')).toBe('alternative');
  });

  it('ignores invalid theme ids', () => {
    theme.select('default');
    theme.select('invalid' as never);
    expect(theme.themeId()).toBe('default');
  });
});
