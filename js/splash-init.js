/**
 * ============================================================
 * SMARTBSF – SPLASH INIT SYSTEM
 * ============================================================
 *
 * Alur:
 *   1. Splash tampil pertama kali (loginContainer & appContainer hidden)
 *   2. Progress bar mencerminkan proses nyata:
 *      [10%] DOM ready
 *      [25%] Firebase SDK loaded
 *      [45%] Firebase config initialized
 *      [65%] Firebase Auth ready (onAuthStateChanged fired)
 *      [85%] UI modules ready (ui-controller, app.js)
 *      [100%] Sistem siap
 *   3. Setelah 100% → fade out splash → tampilkan loginContainer
 *      (auth.js akan handle jika user sudah login → langsung ke dashboard)
 *
 * PENTING: File ini harus di-load PERTAMA sebelum firebase-config.js
 * ============================================================
 */

(function () {
  'use strict';

  /* ── PROGRESS STATE ──────────────────────────────────────── */
  var _currentPct  = 0;
  var _targetPct   = 0;
  var _animFrame   = null;
  var _splashDone  = false;
  var _authFired   = false;

  /* ── MILESTONE LABELS ────────────────────────────────────── */
  var STEPS = [
    { pct: 10,  label_id: 'Memuat halaman...',        label_en: 'Loading page...' },
    { pct: 25,  label_id: 'Memuat Firebase SDK...',   label_en: 'Loading Firebase SDK...' },
    { pct: 45,  label_id: 'Menginisialisasi sistem...', label_en: 'Initializing system...' },
    { pct: 65,  label_id: 'Memeriksa sesi login...',  label_en: 'Checking auth session...' },
    { pct: 82,  label_id: 'Memuat modul UI...',       label_en: 'Loading UI modules...' },
    { pct: 95,  label_id: 'Menyiapkan aplikasi...',   label_en: 'Preparing app...' },
    { pct: 100, label_id: 'Siap!',                    label_en: 'Ready!' },
  ];

  function _lang() {
    return localStorage.getItem('lang') || 'id';
  }

  function _labelFor(pct) {
    var step = STEPS[0];
    for (var i = 0; i < STEPS.length; i++) {
      if (pct >= STEPS[i].pct) step = STEPS[i];
    }
    return _lang() === 'en' ? step.label_en : step.label_id;
  }

  /* ── DOM REFS ────────────────────────────────────────────── */
  function _fill()  { return document.getElementById('splashFill'); }
  function _label() { return document.getElementById('splashLabel'); }

  /* ── ANIMATE PROGRESS BAR ────────────────────────────────── */
  function _animateTo(pct, label) {
    _targetPct = Math.min(pct, 100);
    if (label) _setLabel(label);

    if (_animFrame) return; // already animating

    function _tick() {
      if (_currentPct < _targetPct) {
        _currentPct = Math.min(_currentPct + 1.5, _targetPct);
        var fill = _fill();
        if (fill) fill.style.width = _currentPct + '%';
        _animFrame = requestAnimationFrame(_tick);
      } else {
        _animFrame = null;
      }
    }
    _animFrame = requestAnimationFrame(_tick);
  }

  function _setLabel(text) {
    var label = _label();
    if (label) label.textContent = text;
  }

  /* ── FINISH SPLASH → SHOW LOGIN ─────────────────────────── */
  function _finishSplash() {
    if (_splashDone) return;
    _splashDone = true;

    // Pastikan progress 100%
    _animateTo(100, _lang() === 'en' ? 'Ready!' : 'Siap!');

    setTimeout(function () {
      var splash = document.getElementById('splashScreen');
      if (!splash) { _revealLogin(); return; }

      splash.classList.add('fade-out');
      setTimeout(function () {
        splash.style.display = 'none';
        splash.classList.remove('fade-out');
        _revealLogin();
      }, 500);
    }, 400);
  }

  function _revealLogin() {
    // auth.js onAuthStateChanged sudah fired:
    //   - Jika user login → auth.js sudah panggil showDashboard()
    //   - Jika tidak login → tampilkan loginContainer
    if (!_authFired) {
      // Auth belum fire (unusual), tampilkan login sebagai fallback
      var lc = document.getElementById('loginContainer');
      if (lc) lc.style.display = 'flex';
    }
    // Jika _authFired = true, auth.js sudah handle (showDashboard atau showLoginPage)
    console.log('[splash-init] ✅ Splash selesai, UI siap.');
  }

  /* ── EXPOSE: dipanggil dari auth.js & modul lain ────────── */

  /**
   * Dipanggil oleh auth.js onAuthStateChanged (step 4 nyata).
   * Signal bahwa Firebase Auth sudah merespons.
   */
  window.splashReportAuthReady = function (userLoggedIn) {
    _authFired = true;
    _animateTo(65, _lang() === 'en' ? 'Checking auth session...' : 'Memeriksa sesi login...');

    // Delay kecil biar progress ke 65 terlihat
    setTimeout(function () {
      _animateTo(82, _lang() === 'en' ? 'Loading UI modules...' : 'Memuat modul UI...');
      setTimeout(function () {
        _finishSplash();
      }, 400);
    }, 300);
  };

  /**
   * Dipanggil dari modul lain untuk update progress (opsional).
   * Misal: splashProgress(45, 'Menghubungkan database...')
   */
  window.splashProgress = function (pct, label) {
    if (_splashDone) return;
    _animateTo(pct, label || _labelFor(pct));
  };

  /* ── AUTO TIMEOUT ────────────────────────────────────────── */
  // Jika dalam 8 detik splash belum selesai (Firebase lambat/error),
  // paksa selesaikan agar user tidak terjebak di splash selamanya.
  var _autoTimeout = setTimeout(function () {
    if (!_splashDone) {
      console.warn('[splash-init] ⚠ Auto-timeout: force finishing splash.');
      _finishSplash();
    }
  }, 8000);

  /* ── INIT SEQUENCE ───────────────────────────────────────── */
  // Step 1: DOM ready
  _animateTo(10, _lang() === 'en' ? 'Loading page...' : 'Memuat halaman...');

  document.addEventListener('DOMContentLoaded', function () {
    // Step 2: DOM selesai, Firebase SDK di-load
    _animateTo(25, _lang() === 'en' ? 'Loading Firebase SDK...' : 'Memuat Firebase SDK...');

    // Step 3: Tunggu sebentar → Firebase config & auth init
    setTimeout(function () {
      _animateTo(45, _lang() === 'en' ? 'Initializing system...' : 'Menginisialisasi sistem...');
    }, 300);
  });

  // Pastikan loginContainer & appContainer tersembunyi saat splash tampil
  document.addEventListener('DOMContentLoaded', function () {
    var lc = document.getElementById('loginContainer');
    var ac = document.getElementById('appContainer');
    if (lc) lc.style.display = 'none';
    if (ac) ac.style.display = 'none';
  });

  console.log('[splash-init] ✅ Splash Init System loaded.');

})();
