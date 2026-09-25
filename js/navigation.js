/**
 * SmartBSF - Navigation Helpers (FIXED v3 — Structural Stabilization)
 *
 * ROLE: Alias helpers ONLY. showPage() lives exclusively in ui-controller.js.
 *
 * CHANGELOG v3:
 *  - All helpers now guard-check window.showPage before calling
 *  - Added missing goToSettings() and all settings sub-page helpers
 *  - Added goToSettingsFitur() for settings-fitur page
 *  - Maintained backward-compatible old IDs (resolved via OLD_TO_NEW_MAP)
 *  - Added rebindBottomNav() to ensure bottom-nav .on state matches current page
 */

// ── Guard: ensure showPage is available ─────────────────────────────────────
function _sp(id) {
  if (typeof window.showPage === 'function') {
    window.showPage(id);
  } else {
    console.error('navigation.js: showPage not available. Tried to navigate to:', id);
  }
}

// ── Main page navigation (new UI sections) ───────────────────────────────────
function goToHome()       { _sp('home-page'); }
function goToProduksi()   { _sp('produksi-page'); }
function goToElektrikal() { _sp('elektrikal-page'); }
function goToPendapatan() { _sp('pendapatan-page'); }
function goToProfil()     { _sp('profil-page'); }

// ── Settings main page ───────────────────────────────────────────────────────
function goToSettings()         { _sp('profil-page'); }

// ── Settings sub-pages ───────────────────────────────────────────────────────
function goToSettingsProfil()   { _sp('settings-profil'); }
function goToSettingsLanguage() { _sp('settings-language'); }
function goToSettingsUnit()     { _sp('settings-unit'); }
function goToSettingsNotif()    { _sp('settings-notif'); }
function goToSettingsSavedata() { _sp('settings-savedata'); }
function goToSettingsGlosarium(){ _sp('settings-glosarium'); }
function goToSettingsHelp()     { _sp('settings-helpcenter'); }
function goToSettingsFitur()    { _sp('settings-fitur'); }

// ── Bottom-nav active state sync ─────────────────────────────────────────────
/**
 * rebindBottomNav(pageId)
 * Marks the correct bottom-nav button as .on for the given page.
 * Call this after showPage() if the .on state ever desyncs.
 */
function rebindBottomNav(pageId) {
  var bnContainer = document.querySelector('.bnav');
  if (!bnContainer) return;
  bnContainer.querySelectorAll('.bn').forEach(function (btn) {
    btn.classList.remove('on');
  });
  // Map page to its bottom-nav button by data-page or onclick content
  var map = {
    'home-page':       0,
    'elektrikal-page': 1,
    'produksi-page':   2,
    'pendapatan-page': 3
  };
  var idx = map[pageId];
  if (idx !== undefined) {
    var btns = bnContainer.querySelectorAll('.bn');
    if (btns[idx]) btns[idx].classList.add('on');
  }
}

// ── showToast guard ──────────────────────────────────────────────────────────
// Ensures showToast is always callable from HTML onclick even before full load
if (typeof window.showToast === 'undefined') {
  window.showToast = function (msg) {
    var t = document.getElementById('toastMsg');
    if (t) {
      t.innerText = msg;
      t.classList.add('show');
      setTimeout(function () { t.classList.remove('show'); }, 2500);
    } else {
      console.log('Toast:', msg);
    }
  };
}

console.log('navigation.js v3 helpers loaded');
