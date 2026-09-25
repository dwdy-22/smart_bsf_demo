/* ============================================================
   AUTO-LOGIN — MODE PREVIEW (TANPA HALAMAN LOGIN)
   ------------------------------------------------------------
   Dipakai khusus untuk keperluan preview/demo (mis. ke
   Kementerian Pangan) supaya siapa pun yang membuka aplikasi
   ini LANGSUNG masuk ke dashboard yang sama, tanpa ada elemen
   login/daftar yang bisa di-skip atau diklik-klik.

   CARA PAKAI:
   1. Isi EMAIL & PASSWORD di bawah ini dengan akun Firebase
      yang SUDAH terdaftar (akun yang sama yang datanya sudah
      tertaut ke Supabase kamu).
   2. Pastikan file ini dimuat SETELAH firebase-config.js dan
      SEBELUM auth.js di Index_INTEGRATED.html.

   CATATAN PENTING:
   - Semua orang yang membuka aplikasi akan login sebagai akun
     yang SAMA (akun demo ini). Cocok untuk preview satu arah,
     BUKAN untuk multi-user dengan data terpisah.
   - Email & password di bawah ini akan terlihat oleh siapa pun
     yang membuka "view source" halaman. Untuk preview jangka
     pendek ini biasanya oke, tapi jangan pakai akun/password
     yang dipakai di tempat lain.
   - Jika email/password salah atau koneksi gagal, aplikasi akan
     terlihat kosong/diam saja (karena halaman login memang
     sengaja disembunyikan). Cek console browser (F12) untuk
     pesan error jika ini terjadi.
   ============================================================ */

(function () {
  'use strict';

  var AUTO_LOGIN_EMAIL    = "username";
  var AUTO_LOGIN_PASSWORD = "password";

  var _attempting = false;

  firebase.auth().onAuthStateChanged(function (user) {
    if (user || _attempting) return; // sudah login, atau sedang proses login

    _attempting = true;
    firebase.auth().signInWithEmailAndPassword(AUTO_LOGIN_EMAIL, AUTO_LOGIN_PASSWORD)
      .then(function () {
        console.log("[auto-login] ✓ Berhasil login otomatis (mode preview).");
      })
      .catch(function (err) {
        console.error("[auto-login] ❌ Auto-login GAGAL:", err.code, err.message);
        console.error("[auto-login] Periksa AUTO_LOGIN_EMAIL / AUTO_LOGIN_PASSWORD di js/auto-login.js");
      })
      .finally(function () {
        _attempting = false;
      });
  });

})();
