export const THEME_IDS = ['default', 'alternative'] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const DEFAULT_THEME_ID: ThemeId = 'default';

export const THEME_STORAGE_KEY = 'catalog.theme';

/** Material M3 theme classes on `html` (keep in sync with public/theme-boot.js). */
export const THEME_CLASS: Record<ThemeId, string> = {
  default: 'mat-theme-default',
  alternative: 'mat-theme-alternative',
};

export interface ThemeOption {
  id: ThemeId;
  labelKey: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  { id: 'default', labelKey: 'theme.default' },
  { id: 'alternative', labelKey: 'theme.alternative' },
];

/** Map legacy stored theme ids to the current set (keep in sync with public/theme-boot.js). */
export function normalizeThemeId(value: string | null): ThemeId | null {
  if (value === 'default' || value === 'catalog') {
    return 'default';
  }
  if (value === 'alternative' || value === 'application') {
    return 'alternative';
  }
  return null;
}

export function isThemeId(value: string | null): value is ThemeId {
  return THEME_IDS.some((id) => id === value);
}
