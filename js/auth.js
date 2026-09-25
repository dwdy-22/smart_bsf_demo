/* ============================================================
   AUTH.JS – FIREBASE AUTHENTICATION
   Handles login, register, Google login, logout, and session
   management with safe listener lifecycle control.
   Depends on: firebase-config.js
   ============================================================ */

/* ============================================================
   GLOBAL AUTH STATE
   ============================================================ */
let currentUser   = null;
let currentUserId = null;

/* ============================================================
   LISTENER TRACKING SYSTEM  (STEP 4 – FIX)
   All active realtime listeners are registered here.
   On logout every listener is detached, preventing memory leaks
   and duplicate subscriptions on re-login.
   ============================================================ */
let _activeListeners = [];   // stores { ref, event } objects
let _autoDeleteInterval = null; // [FIX RENDAH #2] interval handle untuk autoDelete periodik

/**
 * Register a realtime listener so it can be cleaned up later.
 * Usage:
 *   const ref = getUserRef("iot");
 *   ref.on("value", callback);
 *   registerListener(ref, "value");
 */
function registerListener(ref, event) {
  _activeListeners.push({ ref, event });
}

/** Detach every tracked listener and reset the list. */
function cleanupAllListeners() {
  _activeListeners.forEach(({ ref, event }) => {
    try { ref.off(event); } catch (e) { /* already detached */ }
  });
  _activeListeners = [];
  // [FIX RENDAH #2] Hentikan juga interval autoDelete periodik saat logout
  if (typeof _autoDeleteInterval !== "undefined" && _autoDeleteInterval) {
    clearInterval(_autoDeleteInterval);
    _autoDeleteInterval = null;
  }
  console.log("✓ All realtime listeners cleaned up");
}

/* ============================================================
   INITIALIZE FIREBASE AUTH & PROVIDERS
   ============================================================ */
const auth           = firebase.auth();
const googleProvider = new firebase.auth.GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

/* ============================================================
   DEFAULT USER DATA STRUCTURE
   Applied on first registration — never overwrites existing data.
   ============================================================ */
const DEFAULT_USER_STRUCTURE = {
  iot: {
    arus: 0,
    daya: 0,
    produksi: 0
  },
  control: {
    vibrator: 0,
    wifi: 0
  },
  setting: {
    nama: "User Baru",
    target: 0,
    produksi: 0
  }
};

/* ============================================================
   AUTH STATE LISTENER (CRITICAL – SESSION MANAGEMENT)
   Single source of truth for all auth transitions.
   ============================================================ */
auth.onAuthStateChanged(async (user) => {
  // ── Signal splash: Firebase Auth telah merespons ─────────
  if (typeof splashReportAuthReady === 'function') {
    splashReportAuthReady(!!user);
  }

  if (user) {
    // ── 1. Store auth state globally FIRST ──────────────────
    currentUser   = user;
    currentUserId = user.uid;
    console.log("✓ User logged in:", user.email, "UID:", user.uid);

    // ── 2. Ensure user's root node exists in the database ───
    await ensureUserDataExists(user.uid);

    // ── 3. Show dashboard, hide login ───────────────────────
    showDashboard();

    // ── 4. Load profile & start listeners ───────────────────
    initializeAppForUser(user.uid);

    // ── 5. Login (SUPABASE) ───────────────────
    if (typeof initSupabaseForUser === "function") {
    initSupabaseForUser(user.uid);
    }
  
    // ── 6. Pre-populate email display on profil-page ────────
    setTimeout(function() {
      const emailEl = document.getElementById('emailVal');
      if (emailEl && user.email) emailEl.textContent = user.email;
    }, 300);

  } else {
    // ── Logged out: stop all listeners FIRST ────────────────
    cleanupAllListeners();

    currentUser   = null;
    currentUserId = null;
    console.log("⚠ No user logged in");

    showLoginPage();
  }
});

/* ============================================================
   ENSURE USER DATA EXISTS (SAFE INITIALIZATION)
   Checks /users/{uid} and writes defaults only if absent.
   ============================================================ */
async function ensureUserDataExists(uid) {
  try {
    const snap = await db.ref(`users/${uid}`).once("value");

    if (!snap.exists()) {
      await db.ref(`users/${uid}`).set({
        ...DEFAULT_USER_STRUCTURE,
        profile: {
          email:          currentUser.email,
          createdAt:      Date.now(),
          nama:           "",
          biopond:        "",
          produksiHarian: ""
        }
      });
      console.log("✓ Default user data structure created for:", uid);
    } else {
      console.log("✓ User data already exists for:", uid);
    }
  } catch (error) {
    console.error("✗ Error ensuring user data:", error);
  }
}

/* ============================================================
   GOOGLE SIGN-IN  (NEW – STEP 1)
   Uses signInWithPopup. onAuthStateChanged handles all
   post-login initialization — no logic is duplicated here.
   ============================================================ */
async function loginWithGoogle() {
  const btn = document.getElementById("googleLoginBtn");
  if (btn) {
    btn.disabled  = true;
    btn.innerText = currentLang === "en" ? "Signing in..." : "Memuat...";
  }

  try {
    try {
      await auth.signInWithPopup(googleProvider);
    } catch (popupErr) {
      // Popup diblokir / tidak didukung (mis. iOS Safari, WebView in-app): jatuh ke alur redirect.
      // Hasil redirect ditangani onAuthStateChanged + handleGoogleRedirectResult() saat halaman dimuat ulang.
      const redirectCodes = [
        "auth/popup-blocked",
        "auth/operation-not-supported-in-this-environment",
        "auth/web-storage-unsupported"
      ];
      if (popupErr && redirectCodes.indexOf(popupErr.code) !== -1 &&
          typeof auth.signInWithRedirect === "function") {
        console.warn("Popup tidak tersedia (" + popupErr.code + "), memakai signInWithRedirect.");
        await auth.signInWithRedirect(googleProvider);
        return; // halaman akan berpindah; jangan lanjut
      }
      throw popupErr;
    }
    // onAuthStateChanged fires automatically after this — nothing else needed.
    hideAuthError();

  } catch (error) {
    console.error("Google login error:", error);

    let errorMessage = "";
    switch (error.code) {
      case "auth/popup-closed-by-user":
        errorMessage = currentLang === "en"
          ? "Sign-in popup was closed. Please try again."
          : "Popup login ditutup. Silakan coba lagi.";
        break;
      case "auth/popup-blocked":
        errorMessage = currentLang === "en"
          ? "Popup blocked by browser. Please allow popups for this site."
          : "Popup diblokir browser. Izinkan popup untuk situs ini.";
        break;
      case "auth/account-exists-with-different-credential":
        errorMessage = currentLang === "en"
          ? "An account with this email exists with a different sign-in method."
          : "Email ini sudah terdaftar dengan metode login lain.";
        break;
      default:
        errorMessage = currentLang === "en"
          ? "Google Sign-In failed. Please try again."
          : "Login Google gagal. Silakan coba lagi.";
    }

    showAuthError(errorMessage);

  } finally {
    if (btn) {
      btn.disabled  = false;
      btn.innerText = currentLang === "en" ? "Continue with Google" : "Masuk dengan Google";
    }
  }
}

/* Menangkap hasil/kesalahan alur signInWithRedirect saat halaman dimuat ulang.
   Keberhasilan login tetap ditangani onAuthStateChanged; di sini hanya melaporkan error. */
function handleGoogleRedirectResult() {
  if (typeof auth.getRedirectResult !== "function") return;
  auth.getRedirectResult().catch((error) => {
    console.error("Google redirect error:", error);
    if (!error || !error.code) return;
    let msg = "";
    if (error.code === "auth/account-exists-with-different-credential") {
      msg = currentLang === "en"
        ? "An account with this email exists with a different sign-in method."
        : "Email ini sudah terdaftar dengan metode login lain.";
    } else if (error.code === "auth/network-request-failed") {
      msg = currentLang === "en"
        ? "Network error. Please check your connection and try again."
        : "Gangguan jaringan. Periksa koneksi lalu coba lagi.";
    } else {
      msg = currentLang === "en"
        ? "Google Sign-In failed. Please try again."
        : "Login Google gagal. Silakan coba lagi.";
    }
    if (typeof showAuthError === "function") showAuthError(msg);
  });
}
handleGoogleRedirectResult();

/* ============================================================
   EMAIL / PASSWORD LOGIN
   ============================================================ */
async function loginUser() {
  const email    = document.getElementById("loginEmail")?.value.trim();
  const password = document.getElementById("loginPassword")?.value;

  if (!email || !password) {
    showAuthError(
      currentLang === "en" ? "Please fill in all fields" : "Isi semua kolom"
    );
    return;
  }

  const loginBtn     = document.getElementById("loginBtn");
  const originalText = loginBtn?.innerText;
  if (loginBtn) {
    loginBtn.disabled  = true;
    loginBtn.innerText = currentLang === "en" ? "Logging in..." : "Masuk...";
  }

  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    console.log("✓ Login successful:", userCredential.user.email);

    document.getElementById("loginEmail").value    = "";
    document.getElementById("loginPassword").value = "";
    hideAuthError();

    showToast(
      currentLang === "en" ? "✓ Login successful!" : "✓ Login berhasil!"
    );

  } catch (error) {
    console.error("Login error:", error);

    let errorMessage = "";
    switch (error.code) {
      case "auth/user-not-found":
        errorMessage = currentLang === "en"
          ? "Account not found. Please register first."
          : "Akun tidak ditemukan. Silakan daftar terlebih dahulu.";
        break;
      case "auth/wrong-password":
        errorMessage = currentLang === "en"
          ? "Wrong password. Please try again."
          : "Password salah. Silakan coba lagi.";
        break;
      case "auth/invalid-email":
        errorMessage = currentLang === "en"
          ? "Invalid email format"
          : "Format email tidak valid";
        break;
      case "auth/too-many-requests":
        errorMessage = currentLang === "en"
          ? "Too many failed attempts. Please try again later."
          : "Terlalu banyak percobaan gagal. Coba lagi nanti.";
        break;
      default:
        errorMessage = currentLang === "en"
          ? "Login failed. Please check your credentials."
          : "Login gagal. Periksa email dan password Anda.";
    }

    showAuthError(errorMessage);

  } finally {
    if (loginBtn) {
      loginBtn.disabled  = false;
      loginBtn.innerText = originalText;
    }
  }
}

/* ============================================================
   REGISTER (SIGN UP)
   ============================================================ */
async function registerUser() {
  const email           = document.getElementById("registerEmail")?.value.trim();
  const password        = document.getElementById("registerPassword")?.value;
  const confirmPassword = document.getElementById("registerConfirmPassword")?.value;

  if (!email || !password || !confirmPassword) {
    showAuthError(
      currentLang === "en" ? "Please fill in all fields" : "Isi semua kolom"
    );
    return;
  }

  if (password !== confirmPassword) {
    showAuthError(
      currentLang === "en" ? "Passwords do not match" : "Password tidak sama"
    );
    return;
  }

  if (password.length < 6) {
    showAuthError(
      currentLang === "en"
        ? "Password must be at least 6 characters"
        : "Password minimal 6 karakter"
    );
    return;
  }

  const registerBtn  = document.getElementById("registerBtn");
  const originalText = registerBtn?.innerText;
  if (registerBtn) {
    registerBtn.disabled  = true;
    registerBtn.innerText = currentLang === "en" ? "Creating account..." : "Membuat akun...";
  }

  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    console.log("✓ Registration successful:", userCredential.user.email);

    const uid = userCredential.user.uid;
    await initializeUserProfile(uid, email);

    document.getElementById("registerEmail").value           = "";
    document.getElementById("registerPassword").value        = "";
    document.getElementById("registerConfirmPassword").value = "";
    hideAuthError();

    showToast(
      currentLang === "en"
        ? "✓ Account created successfully!"
        : "✓ Akun berhasil dibuat!"
    );

    showLoginForm();

  } catch (error) {
    console.error("Registration error:", error);

    let errorMessage = "";
    switch (error.code) {
      case "auth/email-already-in-use":
        errorMessage = currentLang === "en"
          ? "This email is already registered. Please login instead."
          : "Email sudah terdaftar. Silakan login.";
        break;
      case "auth/invalid-email":
        errorMessage = currentLang === "en"
          ? "Invalid email format"
          : "Format email tidak valid";
        break;
      case "auth/weak-password":
        errorMessage = currentLang === "en"
          ? "Password is too weak. Use at least 6 characters."
          : "Password terlalu lemah. Gunakan minimal 6 karakter.";
        break;
      default:
        errorMessage = currentLang === "en"
          ? "Registration failed. Please try again."
          : "Pendaftaran gagal. Silakan coba lagi.";
    }

    showAuthError(errorMessage);

  } finally {
    if (registerBtn) {
      registerBtn.disabled  = false;
      registerBtn.innerText = originalText;
    }
  }
}

/* ============================================================
   LOGOUT – cleans up listeners before signing out
   ============================================================ */
/* ============================================================
   BERSIHKAN DATA PROFIL/BEP LOKAL SAAT LOGOUT (8.1)
   Sebelumnya logoutUser() tidak membersihkan localStorage sama
   sekali. loadUserProfile() hanya menimpa kunci yang nilainya
   tidak kosong, sehingga akun baru di perangkat yang sama bisa
   mewarisi nama dan angka BEP akun sebelumnya. Daftar kunci di
   bawah sinkron dengan yang dibersihkan doResetProfil() (app.js),
   ditambah "foto" dan "wallpaperUrl" yang disebut laporan tapi
   belum dibersihkan doResetProfil(). "lang" dan "unit" SENGAJA
   tidak dihapus karena itu preferensi perangkat, bukan data akun.
   ============================================================ */
function clearUserLocalData() {
  const exactKeys = [
    "nama", "biopond", "produksiPerSiklus", "targetProduksi", "targetMingguan",
    "bep_data", "bepP", "bepFC", "bepVC",
    "foto", "wallpaperUrl"
  ];
  exactKeys.forEach(k => localStorage.removeItem(k));

  // Sapu semua kunci berprefix bepField_ dan hargaJual_ (jumlahnya bisa
  // bertambah seiring field BEP/produk baru), bukan daftar id tetap.
  Object.keys(localStorage).forEach(k => {
    if (k.startsWith("bepField_") || k.startsWith("hargaJual_")) {
      localStorage.removeItem(k);
    }
  });
}

async function logoutUser() {
  try {
    // Proactively clean listeners (onAuthStateChanged also does this,
    // but doing it here ensures no race conditions).
    cleanupAllListeners();

    await auth.signOut();
    clearUserLocalData();
    console.log("✓ Logout successful");

    showToast(
      currentLang === "en" ? "✓ Logged out successfully" : "✓ Berhasil keluar"
    );

  } catch (error) {
    console.error("Logout error:", error);
    showToast(
      currentLang === "en" ? "⚠ Logout failed" : "⚠ Logout gagal"
    );
  }
}

/* ============================================================
   INITIALIZE USER PROFILE (ADDITIONAL PROFILE FIELDS)
   Called after registration for extra profile fields.
   The base structure is written by ensureUserDataExists.
   ============================================================ */
async function initializeUserProfile(uid, email) {
  try {
    await db.ref(`users/${uid}/profile`).update({
      email:          email,
      createdAt:      Date.now(),
      nama:           "",
      biopond:        "",
      produksiHarian: ""
    });
    console.log("✓ User profile initialized for:", uid);
  } catch (error) {
    console.error("✗ Error initializing user profile:", error);
  }
}

/* ============================================================
   INITIALIZE APP FOR LOGGED-IN USER
   Only called AFTER currentUserId is set and DB node exists.
   Listeners started here are registered for cleanup on logout.
   ============================================================ */
function initializeAppForUser(uid) {
  if (!uid) return;
  console.log("Initializing app for user:", uid);

  loadUserProfile(uid);
  loadUserProduction(uid);

  if (typeof initializeIoTListener    === "function") initializeIoTListener();
  if (typeof initializeSliderListener === "function") initializeSliderListener();
  if (typeof initializeSettingListener === "function") initializeSettingListener();
  if (typeof loadCalendarData         === "function") loadCalendarData();
  if (typeof autoDelete               === "function") autoDelete();
  // [FIX RENDAH #2] Jadwalkan autoDelete setiap 24 jam agar data >5 hari
  // dihapus meski user tidak logout/login ulang (bukan hanya sekali saat login)
  if (typeof _autoDeleteInterval !== "undefined") clearInterval(_autoDeleteInterval);
  _autoDeleteInterval = setInterval(function() {
    if (typeof autoDelete === "function") autoDelete();
  }, 24 * 60 * 60 * 1000);
  if (typeof initializeSplash         === "function") initializeSplash();
  if (typeof loadPendapatanHarian     === "function") loadPendapatanHarian();
  if (typeof loadBEPFromFirebase      === "function") loadBEPFromFirebase();
  if (typeof loadProfileImages        === "function") loadProfileImages(uid);
  if (typeof loadPreferencesFromFirebase === "function") loadPreferencesFromFirebase(uid);
}

/* ============================================================
   LOAD USER PROFILE FROM FIREBASE
   ============================================================ */
function loadUserProfile(uid) {
  if (!uid) return;
  db.ref(`users/${uid}/profile`).once("value", (snap) => {
    const profile = snap.val();
    if (profile) {
      if (profile.nama)           localStorage.setItem("nama",           profile.nama);
      if (profile.biopond)        localStorage.setItem("biopond",        profile.biopond);
      if (profile.produksiHarian) localStorage.setItem("produksiHarian", profile.produksiHarian);
      if (profile.targetProduksi) localStorage.setItem("targetProduksi", profile.targetProduksi);
      if (profile.targetMingguan) localStorage.setItem("targetMingguan", profile.targetMingguan);

      if (typeof loadProfilInputs === "function") loadProfilInputs();
      console.log("✓ User profile loaded");
    }
  });
}

/* ============================================================
   LOAD USER PRODUCTION DATA (REALTIME)
   Listener is registered so it is cleaned up on logout.
   ============================================================ */
function loadUserProduction(uid) {
  if (!uid) return;
  const ref = db.ref(`users/${uid}/produksiHarian`);

  const callback = (snap) => {
    // Data kosong tetap diproses supaya kalender/indikator ikut dikosongkan.
    const data = snap.val() || {};
    if (typeof produksiData !== "undefined") {
      produksiData = {};
      Object.values(data).forEach(item => {
        if (item && item.tanggal && item.kg) {
          produksiData[item.tanggal] = (produksiData[item.tanggal] || 0) + item.kg;
        }
      });

      if (typeof renderCalendar === "function") renderCalendar();

      const totalKg = Object.values(produksiData).reduce((a, b) => a + b, 0);
      if (typeof updateCircle === "function") updateCircle(totalKg);

      // Also refresh new home-page UI with latest data
      if (typeof window.refreshNewHomePage === "function") window.refreshNewHomePage();

      console.log("✓ Production data loaded");
    }
  };

  ref.on("value", callback);
  registerListener(ref, "value");
}

/* ============================================================
   UI CONTROL FUNCTIONS
   ============================================================ */
function showDashboard() {
  const loginContainer = document.getElementById("loginContainer");
  const appContainer   = document.getElementById("appContainer");
  if (loginContainer) loginContainer.style.display = "none";
  if (appContainer)   appContainer.style.display   = "block";

  // Navigate to new UI home page after container is visible.
  // Use a small delay to allow app.js / ui-controller.js to fully init first.
  setTimeout(function () {
    if (typeof showPage === "function") {
      showPage("home-page");
    }
  }, 100);
}

function showLoginPage() {
  const loginContainer = document.getElementById("loginContainer");
  const appContainer   = document.getElementById("appContainer");
  // Jika splash masih jalan, loginContainer akan direveal oleh splash-init.js
  // Jika splash sudah selesai (splashDone), langsung tampilkan
  if (loginContainer) loginContainer.style.display = "flex";
  if (appContainer)   appContainer.style.display   = "none";
  showLoginForm();
}

function showLoginForm() {
  const loginForm    = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  if (loginForm)    loginForm.style.display    = "block";
  if (registerForm) registerForm.style.display = "none";
  hideAuthError();
}

function showRegisterForm() {
  const loginForm    = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  if (loginForm)    loginForm.style.display    = "none";
  if (registerForm) registerForm.style.display = "block";
  hideAuthError();
}

/* ============================================================
   LUPA PASSWORD (Firebase Auth: sendPasswordResetEmail)
   Pesan sukses sengaja generik: tidak membocorkan apakah email terdaftar.
   ============================================================ */
let _forgotBusy = false;
async function forgotPassword() {
  if (_forgotBusy) return;
  const en      = currentLang === "en";
  const emailEl = document.getElementById("loginEmail");
  const email   = (emailEl?.value || "").trim();
  hideAuthError();

  if (!email) {
    showAuthError(en
      ? "Enter your email above first, then tap \"Forgot password?\"."
      : "Isi email Anda di atas dulu, lalu ketuk \"Lupa password?\".");
    if (emailEl) emailEl.focus();
    return;
  }

  _forgotBusy = true;
  const okMsg = en
    ? "If that email is registered, a password reset link has been sent. Also check your spam folder."
    : "Jika email terdaftar, tautan reset password sudah dikirim. Cek juga folder spam.";
  try {
    await auth.sendPasswordResetEmail(email);
    showToast(okMsg);
  } catch (error) {
    switch (error && error.code) {
      case "auth/user-not-found":            // tampil sama seperti sukses (anti-enumerasi)
        showToast(okMsg); break;
      case "auth/invalid-email":
        showAuthError(en ? "Invalid email format." : "Format email tidak valid."); break;
      case "auth/too-many-requests":
        showAuthError(en ? "Too many attempts. Please try again later." : "Terlalu banyak percobaan. Coba lagi nanti."); break;
      case "auth/network-request-failed":
        showAuthError(en ? "Network error. Check your connection." : "Gangguan jaringan. Periksa koneksi Anda."); break;
      default:
        showAuthError(en ? "Could not send the reset link. Please try again." : "Tautan reset belum bisa dikirim. Coba lagi.");
    }
  } finally {
    _forgotBusy = false;
  }
}

/* ============================================================
   ERROR MESSAGE DISPLAY
   ============================================================ */
function showAuthError(message) {
  const errorElement = document.getElementById("authError");
  if (errorElement) {
    errorElement.innerText     = message;
    errorElement.style.display = "block";
  }
}

function hideAuthError() {
  const errorElement = document.getElementById("authError");
  if (errorElement) {
    errorElement.style.display = "none";
    errorElement.innerText     = "";
  }
}

/* ============================================================
   ENTER KEY SUPPORT FOR FORMS
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  const addEnterKey = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("keypress", (e) => { if (e.key === "Enter") fn(); });
  };

  addEnterKey("loginEmail",              loginUser);
  addEnterKey("loginPassword",           loginUser);
  addEnterKey("registerEmail",           registerUser);
  addEnterKey("registerPassword",        registerUser);
  addEnterKey("registerConfirmPassword", registerUser);
});
