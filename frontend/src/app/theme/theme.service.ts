import { Injectable, signal } from '@angular/core';
import {
  DEFAULT_THEME_ID,
  THEME_OPTIONS,
  THEME_STORAGE_KEY,
  ThemeId,
  isThemeId,
  normalizeThemeId,
} from './theme.models';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly selected = signal<ThemeId>(this.readStoredTheme());

  readonly options = THEME_OPTIONS;
  readonly themeId = this.selected.asReadonly();

  constructor() {
    this.apply(this.selected());
  }

  select(theme: ThemeId): void {
    if (!isThemeId(theme)) {
      return;
    }
    this.selected.set(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    this.apply(theme);
  }

  private apply(theme: ThemeId): void {
    document.documentElement.setAttribute('data-theme', theme);
  }

  private readStoredTheme(): ThemeId {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      const theme = normalizeThemeId(stored);
      if (theme) {
        if (stored !== theme) {
          localStorage.setItem(THEME_STORAGE_KEY, theme);
        }
        return theme;
      }
    } catch {
      /* ignore storage errors */
    }
    return DEFAULT_THEME_ID;
  }
}
