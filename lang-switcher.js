/**
 * Sarchus Investments — lang-switcher.js
 * ========================================
 * Handles:
 *   1. Language selector widget (injected into every page's <nav>)
 *   2. Reading translations from SARCHUS_TRANSLATIONS (translations.js)
 *   3. Applying translations to elements with data-i18n attributes
 *   4. Persisting the user's choice in localStorage
 *   5. RTL layout for Arabic
 *
 * HOW TO USE IN EACH HTML PAGE
 * ─────────────────────────────
 *  a) Add  data-i18n="key"  to every text element you want translated, e.g.:
 *       <h1 data-i18n="index-hero-title">Invest in Bitcoin with Confidence</h1>
 *       <button data-i18n="index-hero-cta">Start Investing Today</button>
 *
 *  b) For placeholder / title attributes use  data-i18n-placeholder="key"
 *     and  data-i18n-title="key"  respectively.
 *
 *  c) Load both scripts (order matters) just before </body>:
 *       <script src="translations.js"></script>
 *       <script src="lang-switcher.js"></script>
 *
 *  The switcher widget is automatically injected into the <nav>.
 *  No other changes are required.
 */

(function () {
  'use strict';

  /* ── Config ──────────────────────────────────────────────── */
  const STORAGE_KEY   = 'sarchus_lang';
  const DEFAULT_LANG  = 'en';
  const RTL_LANGS     = ['ar'];

  const LANGUAGE_META = {
    en: { label: 'English',    flag: '🇬🇧' },
    ru: { label: 'Русский',    flag: '🇷🇺' },
    fr: { label: 'Français',   flag: '🇫🇷' },
    es: { label: 'Español',    flag: '🇪🇸' },
    zh: { label: '中文',        flag: '🇨🇳' },
    ar: { label: 'العربية',    flag: '🇸🇦' },
  };

  /* ── Helpers ─────────────────────────────────────────────── */
  function getSavedLang() {
    try { return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG; }
    catch (_) { return DEFAULT_LANG; }
  }

  function saveLang(lang) {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (_) {}
  }

  function getTranslations() {
    if (typeof window !== 'undefined' && window.SARCHUS_TRANSLATIONS) {
      return window.SARCHUS_TRANSLATIONS;
    }
    console.warn('[lang-switcher] translations.js not loaded yet.');
    return {};
  }

  function t(lang, key) {
    const translations = getTranslations();
    const dict = translations[lang] || translations[DEFAULT_LANG] || {};
    const fallback = (translations[DEFAULT_LANG] || {})[key];
    return dict[key] || fallback || key;
  }

  /* ── Core: apply translations to the DOM ────────────────── */
  function applyTranslations(lang) {
    const isRTL = RTL_LANGS.includes(lang);

    // Set document direction and lang attribute
    document.documentElement.lang = lang;
    document.documentElement.dir  = isRTL ? 'rtl' : 'ltr';

    // Translate text content
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      const key = el.getAttribute('data-i18n');
      const value = t(lang, key);
      if (value) {
        // If element has child nodes that are NOT just text (e.g. nested spans),
        // only update the first text node to avoid destroying structure.
        const firstChild = el.childNodes[0];
        if (el.children.length === 0) {
          el.textContent = value;
        } else if (firstChild && firstChild.nodeType === 3) {
          firstChild.textContent = value;
        } else {
          // Prepend a text node
          el.insertBefore(document.createTextNode(value), el.firstChild);
        }
      }
    });

    // Translate placeholder attributes
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      const key = el.getAttribute('data-i18n-placeholder');
      const value = t(lang, key);
      if (value) el.placeholder = value;
    });

    // Translate title (tooltip) attributes
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      const key = el.getAttribute('data-i18n-title');
      const value = t(lang, key);
      if (value) el.title = value;
    });

    // Update the page <title> tag if a key is provided
    const titleEl = document.querySelector('title[data-i18n]');
    if (titleEl) {
      const value = t(lang, titleEl.getAttribute('data-i18n'));
      if (value) document.title = value;
    }

    // Update the selector widget itself
    const selector = document.getElementById('sarchus-lang-select');
    if (selector) selector.value = lang;

    const flagEl = document.getElementById('sarchus-lang-flag');
    if (flagEl && LANGUAGE_META[lang]) {
      flagEl.textContent = LANGUAGE_META[lang].flag;
    }
  }

  /* ── Widget: build and inject ────────────────────────────── */
  function buildWidget(currentLang) {
    const wrapper = document.createElement('div');
    wrapper.id = 'sarchus-lang-wrapper';
    wrapper.style.cssText = [
      'display:inline-flex',
      'align-items:center',
      'gap:6px',
      'background:rgba(255,255,255,0.12)',
      'border:1px solid rgba(255,255,255,0.25)',
      'border-radius:8px',
      'padding:4px 10px',
      'cursor:pointer',
      'font-size:0.85rem',
      'font-weight:600',
      'color:#fff',
      'margin-left:12px',
      'flex-shrink:0',
      'position:relative',
      'z-index:9999',
    ].join(';');

    // Flag span
    const flagSpan = document.createElement('span');
    flagSpan.id = 'sarchus-lang-flag';
    flagSpan.textContent = (LANGUAGE_META[currentLang] || {}).flag || '🌐';
    flagSpan.style.cssText = 'font-size:1.1rem;line-height:1;pointer-events:none;';

    // Native <select> — easiest cross-browser, works on mobile
    const select = document.createElement('select');
    select.id = 'sarchus-lang-select';
    select.style.cssText = [
      'background:transparent',
      'border:none',
      'color:#fff',
      'font-size:0.85rem',
      'font-weight:600',
      'cursor:pointer',
      'outline:none',
      'appearance:none',
      '-webkit-appearance:none',
      'padding-right:4px',
      // keep options readable on dark backgrounds
    ].join(';');

    // Force option text to be dark so it's readable in the dropdown
    const styleTag = document.createElement('style');
    styleTag.textContent = [
      '#sarchus-lang-select option { color: #1a1a1a; background: #fff; }',
      '#sarchus-lang-wrapper:hover { background: rgba(255,255,255,0.22); }',
      // Mobile nav: keep widget visible
      '@media (max-width: 768px) {',
      '  #sarchus-lang-wrapper { margin-left:4px; padding:3px 7px; }',
      '  #sarchus-lang-flag { font-size:1rem; }',
      '  #sarchus-lang-select { font-size:0.8rem; }',
      '}',
    ].join('\n');
    document.head.appendChild(styleTag);

    Object.keys(LANGUAGE_META).forEach(function (code) {
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = LANGUAGE_META[code].flag + ' ' + LANGUAGE_META[code].label;
      if (code === currentLang) opt.selected = true;
      select.appendChild(opt);
    });

    select.addEventListener('change', function () {
      const lang = this.value;
      saveLang(lang);
      applyTranslations(lang);
    });

    wrapper.appendChild(flagSpan);
    wrapper.appendChild(select);
    return wrapper;
  }

  function injectWidget(lang) {
    // Look for nav container — handles both public and dashboard navs
    const navContainer = document.querySelector('nav .container') || document.querySelector('nav');
    if (!navContainer) return;

    // Don't inject twice
    if (document.getElementById('sarchus-lang-wrapper')) return;

    const widget = buildWidget(lang);

    // On desktop inject before the mobile toggle button (or at end of container)
    const mobileToggle = navContainer.querySelector('.mobile-menu-toggle');
    if (mobileToggle) {
      navContainer.insertBefore(widget, mobileToggle);
    } else {
      navContainer.appendChild(widget);
    }
  }

  /* ── Boot ────────────────────────────────────────────────── */
  function init() {
    const lang = getSavedLang();
    injectWidget(lang);
    applyTranslations(lang);
  }

  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose a global helper for dynamic content (e.g. dashboard.js rendering cards)
  window.sarchusI18n = {
    t: t,
    getCurrentLang: getSavedLang,
    apply: applyTranslations,
  };

})();
