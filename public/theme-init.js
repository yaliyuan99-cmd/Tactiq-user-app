/*
 * Pre-paint preference bootstrap. Runs before React so the page never flashes
 * the wrong theme or text size. Reads the same storage key the app writes
 * (`tactiq.prefs`). Every branch is guarded: storage can be unavailable.
 */
(function () {
  try {
    var root = document.documentElement;
    var raw = window.localStorage.getItem('tactiq.prefs');
    var prefs = raw ? JSON.parse(raw) : null;
    var theme = (prefs && prefs.theme) || 'system';
    var dark =
      theme === 'dark' ||
      (theme === 'system' &&
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.classList.toggle('dark', !!dark);
    if (prefs && prefs.textSize && prefs.textSize !== 'default') {
      root.setAttribute('data-text-size', prefs.textSize);
    }
    if (prefs && prefs.contrast === 'high') {
      root.setAttribute('data-contrast', 'high');
    }
    if (prefs && prefs.reducedMotion === true) {
      root.classList.add('force-reduced-motion');
    }
  } catch (e) {
    /* No stored preferences, or storage unavailable: defaults apply. */
  }
})();
