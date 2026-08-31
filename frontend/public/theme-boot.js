(function () {
  // Keep normalizeThemeId + THEME_CLASS in sync with frontend/src/app/theme/theme.models.ts
  var STORAGE_KEY = 'catalog.theme';
  var DEFAULT_THEME = 'default';
  var THEME_CLASS = {
    default: 'mat-theme-default',
    alternative: 'mat-theme-alternative',
  };

  function normalizeThemeId(value) {
    if (value === 'default' || value === 'catalog') {
      return 'default';
    }
    if (value === 'alternative' || value === 'application') {
      return 'alternative';
    }
    return null;
  }

  try {
    var stored = localStorage.getItem(STORAGE_KEY);
    var theme = normalizeThemeId(stored) || DEFAULT_THEME;
    document.documentElement.classList.add(THEME_CLASS[theme] || THEME_CLASS.default);
  } catch (e) {
    document.documentElement.classList.add(THEME_CLASS.default);
  }
})();
