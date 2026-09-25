/**
 * ════════════════════════════════════════════════════════════════════════════
 * SMARTBSF INTEGRATION BOOTSTRAP  (FIXED v2)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * ROOT CAUSES FIXED:
 *  #1 - activateNewUI() was hiding appContainer (all new pages live inside it)
 *  #2 - Duplicate onAuthStateChanged listener removed (auth.js is sole authority)
 *  #3 - showPage() no longer auto-appends "-page" (broke settings sub-pages)
 *
 * ════════════════════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  console.log('🚀 SmartBSF Bootstrap v2 - Starting...');

  // ── PHASE 1: GLOBAL DEFAULTS ─────────────────────────────────────────────
  window.currentLang  = window.currentLang  || 'id';
  window.currentUnit  = window.currentUnit  || 'metric';

  window.STRINGS = window.STRINGS || {
    id: { appName: 'SmartBSF', loading: 'Memuat...', error: 'Terjadi kesalahan' },
    en: { appName: 'SmartBSF', loading: 'Loading...', error: 'An error occurred' }
  };

  console.log('✓ Phase 1: Global variables initialized');

  // ── PHASE 2: UTILITY FALLBACKS ───────────────────────────────────────────
  if (typeof window.formatTitik === 'undefined') {
    window.formatTitik = function (num) {
      if (num === null || num === undefined || num === '') return '0';
      var parsed = parseFloat(String(num).replace(/[^\d.-]/g, ''));
      if (isNaN(parsed)) return '0';
      return parsed.toLocaleString('id-ID');
    };
  }

  console.log('✓ Phase 2: Utility fallbacks ready');

  // ── PHASE 3: NAVIGATION (exact IDs, no suffix manipulation) ─────────────
  // NOTE: ui-controller.js is loaded BEFORE bootstrap (see script order).
  // Only define showPage() if ui-controller hasn't already defined it.
  // This prevents the bootstrap fallback from overwriting the full version.

  if (typeof window.showPage !== 'function') {
    window.showPage = function (pageId) {
      var allPages = document.querySelectorAll('.page');
      allPages.forEach(function (page) {
        page.classList.remove('active');
        page.style.display    = '';
        page.style.opacity    = '';
        page.style.visibility = '';
      });

      var target = document.getElementById(pageId);
      if (target) {
        target.classList.add('active');
        console.log('✓ showPage (bootstrap fallback):', pageId);
      } else {
        console.warn('⚠ Page not found:', pageId);
        var home = document.getElementById('home-page');
        if (home) { home.classList.add('active'); }
      }
    };
  }

  // goTo* aliases live in navigation.js (loaded after bootstrap).
  // No duplicates needed here.

  /**
   * bnav(el, pageId) — Bottom nav handler for new UI pages.
   * Switches .on class among siblings AND navigates.
   */
  window.bnav = function (el, pageId) {
    var container = el.closest('.bnav');
    if (container) {
      container.querySelectorAll('.bn').forEach(function (b) { b.classList.remove('on'); });
    }
    el.classList.add('on');

    if (pageId === 'kalkulator') {
      if (typeof window.openKalkulator === 'function') {
        window.openKalkulator();
      }
    } else {
      window.showPage(pageId);
    }
  };

  // Legacy placeholder — HTML updated to use bnav() instead
  window.bnt = function (element) {
    console.warn('bnt() is deprecated — using bnav() instead');
    if (element) {
      var page = element.getAttribute('data-page');
      if (page) { window.showPage(page); }
    }
  };

  console.log('✓ Phase 3: Navigation ready');

  // ── PHASE 4: POST-AUTH UI ACTIVATION ────────────────────────────────────
  //
  //  ⚠ CRITICAL FIX:
  //    Old code: appContainer.style.display = 'none'  ← THIS CAUSED BLANK SCREEN
  //    New code: Do NOT touch appContainer. auth.js showDashboard() already
  //              shows it. We only navigate to home-page.

  window.activateNewUI = function () {
    console.log('🎯 activateNewUI() called');
    // auth.js showDashboard() already made appContainer visible.
    // Just navigate to the starting page.
    window.showPage('home-page');
    console.log('✅ home-page activated');
  };

  console.log('✓ Phase 4: activateNewUI() ready (fixed)');

  // ── PHASE 5: DOM INIT ────────────────────────────────────────────────────
  // No auth listener here — auth.js is the single source of truth.

  function initBootstrap() {
    console.log('🎬 Bootstrap DOM init...');

    // Hide all pages via class only — CSS .page rule handles display:none.
    // Do NOT use inline style here — it would override .page.active CSS rule.
    var allPages = document.querySelectorAll('.page');
    allPages.forEach(function (page) {
      page.classList.remove('active');
      page.style.display    = ''; // clear any leftover inline overrides
      page.style.opacity    = '';
      page.style.visibility = '';
    });

    console.log('✓ Bootstrap init done (' + allPages.length + ' pages hidden, waiting for auth)');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBootstrap);
  } else {
    initBootstrap();
  }

  console.log('✅ SmartBSF Bootstrap v2 Loaded');

})();
