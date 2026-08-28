(function () {
  var STORAGE_KEY = 'catalog.theme';
  var DEFAULT_THEME = 'default';

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
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', DEFAULT_THEME);
  }
})();
