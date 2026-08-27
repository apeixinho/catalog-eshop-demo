export const THEME_IDS = ['default', 'alternative'] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const DEFAULT_THEME_ID: ThemeId = 'default';

export const THEME_STORAGE_KEY = 'catalog.theme';

export interface ThemeOption {
  id: ThemeId;
  labelKey: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  { id: 'default', labelKey: 'theme.default' },
  { id: 'alternative', labelKey: 'theme.alternative' },
];

/** Map legacy stored theme ids to the current set. */
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
