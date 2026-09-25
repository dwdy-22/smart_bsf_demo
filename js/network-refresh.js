/**
 * ============================================================
 * SMARTBSF – NETWORK MONITOR & SMART REFRESH
 * ============================================================
 *
 * Dua fitur utama:
 *
 *  1. NETWORK ERROR OVERLAY
 *     - Muncul otomatis saat offline atau Firebase/Supabase gagal
 *     - Menghilang otomatis saat koneksi pulih
 *     - Tombol "Coba Lagi" → jalankan smartRefresh()
 *
 *  2. SMART REFRESH (smartRefresh)
 *     - Full system restart tanpa reload halaman (SPA-friendly)
 *     - Cleanup semua Firebase listeners
 *     - Re-check auth state
 *     - Re-init Supabase
 *     - Jalankan splash screen sambil semua proses selesai
 *     - Dipanggil dari: tombol retry, login splash, atau manual
 *
 * ============================================================ */

(function () {
  'use strict';

  /* ── STATE ─────────────────────────────────────────────── */
  let _overlayVisible    = false;
  let _refreshInProgress = false;
  let _firebaseOkTimer   = null;

  /* ── STRINGS ───────────────────────────────────────────── */
  function _t(id, en, id_) {
    const lang = (typeof GlobalState !== 'undefined' && GlobalState.language) ||
                 localStorage.getItem('lang') || 'id';
    return lang === 'en' ? en : id_;
  }

  /* ── OVERLAY HELPERS ───────────────────────────────────── */
  function _getOverlay()    { return document.getElementById('networkErrorOverlay'); }
  function _getStatus()     { return document.getElementById('netErrStatus'); }
  function _getStatusText() { return document.getElementById('netErrStatusText'); }
  function _getTitle()      { return document.getElementById('netErrTitle'); }
  function _getDesc()       { return document.getElementById('netErrDesc'); }
  function _getBtn()        { return document.querySelector('.net-error-btn'); }

  function showNetworkOverlay(reason) {
    if (_overlayVisible) return;
    _overlayVisible = true;

    const overlay = _getOverlay();
    if (!overlay) return;

    const title = _getTitle();
    const desc  = _getDesc();

    if (reason === 'firebase') {
      if (title) title.textContent = _t('', 'Connection Error', 'Koneksi Gagal');
      if (desc)  desc.textContent  = _t('',
        'Unable to connect to the database. Check your internet connection.',
        'Gagal terhubung ke database. Periksa koneksi internet Anda.'
      );
    } else {
      if (title) title.textContent = _t('', 'No Internet Connection', 'Tidak Ada Koneksi');
      if (desc)  desc.textContent  = _t('',
        'Check your internet connection and try again.',
        'Periksa koneksi internet Anda dan coba lagi.'
      );
    }

    _updateStatusBadge(false);
    overlay.style.display = 'flex';
    console.warn('[network-refresh] Overlay shown. Reason:', reason);
  }

  function hideNetworkOverlay() {
    if (!_overlayVisible) return;
    _overlayVisible = false;

    const overlay = _getOverlay();
    if (!overlay) return;

    // Animasi fade-out
    overlay.style.transition = 'opacity .35s ease';
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.style.display   = 'none';
      overlay.style.opacity   = '';
      overlay.style.transition = '';
    }, 350);

    console.log('[network-refresh] Overlay hidden.');
  }

  function _updateStatusBadge(isOnline) {
    const status = _getStatus();
    const text   = _getStatusText();
    const dot    = status ? status.querySelector('.net-err-dot') : null;

    if (!status) return;

    if (isOnline) {
      status.classList.add('online');
      if (text) text.textContent = _t('', 'Online', 'Online');
    } else {
      status.classList.remove('online');
      if (text) text.textContent = _t('', 'Offline', 'Offline');
    }
  }

  /* ── NETWORK EVENT LISTENERS ───────────────────────────── */
  window.addEventListener('online', function () {
    console.log('[network-refresh] Browser online event.');
    _updateStatusBadge(true);

    // Tunggu sebentar, pastikan koneksi stabil, lalu auto-refresh
    clearTimeout(_firebaseOkTimer);
    _firebaseOkTimer = setTimeout(function () {
      if (_overlayVisible) {
        // Koneksi pulih → jalankan smart refresh otomatis
        smartRefresh();
      }
    }, 1500);
  });

  window.addEventListener('offline', function () {
    console.warn('[network-refresh] Browser offline event.');
    clearTimeout(_firebaseOkTimer);
    showNetworkOverlay('offline');
  });

  /* ── FIREBASE CONNECTIVITY CHECK ───────────────────────── */
  /**
   * Dipanggil dari firebase-service.js atau auth.js saat Firebase error.
   * Opsional — jika tidak dipanggil, overlay hanya muncul dari offline event.
   */
  window.reportFirebaseError = function () {
    if (!navigator.onLine) return; // sudah ditangani offline event
    showNetworkOverlay('firebase');
  };

  window.reportFirebaseOk = function () {
    if (_overlayVisible) hideNetworkOverlay();
  };

  /* ── SMART REFRESH ─────────────────────────────────────── */
  /**
   * smartRefresh() — Full system restart tanpa reload halaman.
   *
   * Urutan:
   *  1. Tampilkan splash screen
   *  2. Cleanup semua Firebase listeners
   *  3. Reset state variabel global
   *  4. Re-check Firebase auth state
   *  5. Re-init Supabase (jika sudah login)
   *  6. Selesai → hide splash & overlay
   */
  window.smartRefresh = function () {
    if (_refreshInProgress) {
      console.log('[network-refresh] Refresh already in progress, skip.');
      return;
    }
    _refreshInProgress = true;
    console.log('[network-refresh] 🔄 smartRefresh() started...');

    // Disable tombol retry saat proses berjalan
    const btn = _getBtn();
    if (btn) {
      btn.disabled    = true;
      btn.textContent = _t('', 'Reconnecting...', 'Menghubungkan...');
    }

    // ── Step 1: Tampilkan splash ─────────────────────────
    _showRefreshSplash();

    // ── Step 2: Cleanup listeners ────────────────────────
    try {
      if (typeof cleanupAllListeners === 'function') {
        cleanupAllListeners();
        console.log('[network-refresh] ✓ Listeners cleaned up.');
      }
    } catch (e) {
      console.warn('[network-refresh] cleanupAllListeners error:', e);
    }

    // ── Step 3: Reset throttle guards ───────────────────
    if (typeof window._saveBEPLastCall !== 'undefined') {
      window._saveBEPLastCall = 0;
    }

    // ── Step 4: Re-check Firebase auth & re-init app ────
    // Delay 1.5s agar splash sempat tampil dan jaringan stabil
    setTimeout(function () {
      _doRefreshSequence();
    }, 1500);
  };

  function _doRefreshSequence() {
    // Cek koneksi dulu
    if (!navigator.onLine) {
      console.warn('[network-refresh] Still offline after refresh attempt.');
      _updateStatusBadge(false);
      _endRefresh(false);
      return;
    }

    // Cek Firebase auth state
    try {
      const auth = firebase.auth();
      const unsubscribe = auth.onAuthStateChanged(function (user) {
        unsubscribe(); // hanya sekali

        if (user) {
          console.log('[network-refresh] ✓ Auth valid:', user.email);

          // Re-init Firebase listeners
          if (typeof initializeAppForUser === 'function') {
            try { initializeAppForUser(user.uid); } catch (e) { console.warn(e); }
          }

          // Re-init Supabase
          if (typeof initSupabaseForUser === 'function') {
            try { initSupabaseForUser(user.uid); } catch (e) { console.warn(e); }
          }

          // Semua OK
          _endRefresh(true);

        } else {
          console.warn('[network-refresh] No auth session — redirect to login.');
          _endRefresh(true);
          if (typeof showLoginPage === 'function') showLoginPage();
        }
      });
    } catch (e) {
      console.error('[network-refresh] Firebase auth error during refresh:', e);
      _endRefresh(false);
    }
  }

  function _endRefresh(success) {
    console.log('[network-refresh] Refresh', success ? '✅ success' : '⚠ failed');

    // Sembunyikan splash
    _hideRefreshSplash(function () {
      _refreshInProgress = false;

      if (success) {
        hideNetworkOverlay();
      } else {
        // Masih gagal — tampilkan overlay kembali dengan tombol aktif
        const btn = _getBtn();
        if (btn) {
          btn.disabled    = false;
          btn.innerHTML   = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg> ' +
            _t('', 'Try Again', 'Coba Lagi');
        }
      }
    });
  }

  /* ── REFRESH SPLASH OVERLAY ────────────────────────────── */
  // Menggunakan #splashScreen yang sudah ada di HTML
  function _showRefreshSplash() {
    const splash = document.getElementById('splashScreen');
    const fill   = document.getElementById('splashFill');
    const label  = document.getElementById('splashLabel');

    if (!splash) return;

    // Reset
    if (fill)  { fill.style.width = '0%'; fill.style.transition = 'none'; }
    splash.classList.remove('fade-out');
    splash.style.display   = 'flex';
    splash.style.opacity   = '1';
    splash.style.zIndex    = '100000'; // di atas overlay network

    const msgs = (
      (typeof GlobalState !== 'undefined' && GlobalState.language === 'en')
        ? ['Reconnecting...', 'Checking auth...', 'Reloading data...', 'Almost ready...']
        : ['Menghubungkan...', 'Memeriksa sesi...', 'Memuat ulang data...', 'Hampir siap...']
    );

    let pct = 0;
    const iv = setInterval(function () {
      pct += Math.random() * 20 + 10;
      if (pct > 95) pct = 95; // biarkan di 95 sampai refresh selesai

      if (fill)  {
        fill.style.transition = 'width .2s ease';
        fill.style.width = pct + '%';
      }
      const idx = Math.min(Math.floor((pct / 100) * msgs.length), msgs.length - 1);
      if (label) label.textContent = msgs[idx];

      if (pct >= 95) clearInterval(iv);
    }, 150);

    splash._refreshInterval = iv;
  }

  function _hideRefreshSplash(callback) {
    const splash = document.getElementById('splashScreen');
    const fill   = document.getElementById('splashFill');
    const label  = document.getElementById('splashLabel');

    if (!splash) { if (callback) callback(); return; }

    // Clear interval jika masih jalan
    if (splash._refreshInterval) {
      clearInterval(splash._refreshInterval);
      splash._refreshInterval = null;
    }

    // Selesaikan progress bar ke 100%
    if (fill) {
      fill.style.transition = 'width .3s ease';
      fill.style.width = '100%';
    }
    if (label) label.textContent = _t('', 'Done!', 'Siap!');

    setTimeout(function () {
      splash.classList.add('fade-out');
      setTimeout(function () {
        splash.style.display  = 'none';
        splash.style.zIndex   = '';
        splash.classList.remove('fade-out');
        splash.style.opacity  = '';
        if (fill) fill.style.width = '0%';
        if (callback) callback();
      }, 250);
    }, 300);
  }

  /* ── INIT: cek kondisi awal ────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    if (!navigator.onLine) {
      // Langsung tampilkan overlay kalau awalnya sudah offline
      setTimeout(function () { showNetworkOverlay('offline'); }, 800);
    }
  });

  console.log('[network-refresh] ✅ Network monitor & Smart Refresh loaded.');

})();
