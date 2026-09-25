/* ============================================================
   SUPABASE INTEGRATION PATCH – SmartBSF
   ============================================================
   File ini berisi TAMBAHAN kode yang perlu dimasukkan ke file
   yang sudah ada. JANGAN replace file asli — cukup tambahkan
   potongan kode ini di lokasi yang ditunjukkan.

   Semua Firebase file TIDAK DIUBAH. Patch ini bersifat additive.
   ============================================================ */


/* ════════════════════════════════════════════════════════════
   PATCH 1 — Index_INTEGRATED.html
   Lokasi: Tepat SEBELUM <script src="js/firebase-config.js">
   Tambahkan baris CDN Supabase ini:
   ════════════════════════════════════════════════════════════

<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>

   Kemudian tambahkan supabase-service.js di load order:
   Urutan script di HTML harus menjadi:

   <script src="js/firebase-config.js"></script>
   <script src="js/firebase-service.js"></script>
   <script src="js/auth.js"></script>
   <script src="js/ui-controller.js"></script>
   <script src="js/supabase-service.js"></script>   ← TAMBAHKAN DI SINI
   <script src="js/app.js"></script>
   <script src="js/navigation.js"></script>
   <script src="js/integration-bootstrap.js"></script>
*/


/* ════════════════════════════════════════════════════════════
   PATCH 2 — js/auth.js
   Lokasi: Di dalam fungsi showDashboard() atau initializeAppForUser()
   Tepat setelah baris yang set currentUserId.

   TAMBAHKAN (jangan ganti yang lama):
   ════════════════════════════════════════════════════════════ */
function _patch_auth_initSupabase(uid) {
  // Tambahkan ini setelah: currentUserId = uid;
  if (typeof initSupabaseForUser === "function") {
    initSupabaseForUser(uid);
  }
}


/* ════════════════════════════════════════════════════════════
   PATCH 3 — js/app.js
   Lokasi: Di akhir fungsi doSaveProfil(), setelah baris:
     showToast(currentLang==="en"?"Profile & BEP saved ✔":"Data profil & BEP tersimpan ✔");

   TAMBAHKAN:
   ════════════════════════════════════════════════════════════ */
function _patch_doSaveProfil_supabase() {
  // Tambahkan setelah showToast() di doSaveProfil():
  if (typeof sbSaveProfile === "function") {
    sbSaveProfile({
      nama:      document.getElementById("namaInput")?.value           || "",
      biopond:   document.getElementById("biopondInput")?.value        || "",
      produksi:  document.getElementById("produksiHarianInput")?.value || "",
      target:    document.getElementById("targetInput")?.value         || "",
      bahasa:    localStorage.getItem("lang")   || "id",
      satuan:    localStorage.getItem("unit")   || "metric",
    });
  }
}


/* ════════════════════════════════════════════════════════════
   PATCH 4 — js/firebase-service.js
   Lokasi: Di dalam saveBEPToFirebase(), setelah baris:
     getUserRef("bep").set(payload).catch(...)
   
   TAMBAHKAN setelah .catch():
   ════════════════════════════════════════════════════════════ */
function _patch_saveBEP_supabase(payload) {
  // Tambahkan setelah getUserRef("bep").set(payload).catch(...):
  if (typeof sbSaveBEP === "function") {
    sbSaveBEP(payload);
  }
}


/* ════════════════════════════════════════════════════════════
   PATCH 5 — js/firebase-service.js
   Lokasi: Di dalam autoSavePendapatanHarian(), setelah baris:
     getUserRef("pendapatanHarian/" + today).set({...}).catch(...)

   TAMBAHKAN setelah .catch():
   ════════════════════════════════════════════════════════════ */
function _patch_savePendapatan_supabase(today, Q, P, FC, VC) {
  // Tambahkan setelah getUserRef("pendapatanHarian/"+today).set({...}).catch(...):
  if (typeof sbSavePendapatan === "function") {
    const revenue = P * Q;
    const modal   = FC + (VC * Q);
    const profit  = revenue - modal;
    sbSavePendapatan(today, {
      revenue:    Math.round(revenue),
      modal:      Math.round(modal),
      profit:     Math.round(profit),
      produksi:   Q
    });
  }
}


/* ════════════════════════════════════════════════════════════
   PATCH 6 — js/firebase-service.js
   Lokasi: Di akhir fungsi simpanProduksi() atau save() di home-page,
   setelah data berhasil disimpan ke Firebase.

   TAMBAHKAN setelah result.success check:
   ════════════════════════════════════════════════════════════ */
function _patch_saveProduksi_supabase(tanggal, kgToStore) {
  // Tambahkan setelah if (result.success || result.savedLocally) {:
  if (typeof sbSaveProduksi === "function") {
    sbSaveProduksi(tanggal, kgToStore, "manual");
  }
}


/* ════════════════════════════════════════════════════════════
   PATCH 7 — js/firebase-service.js
   Lokasi: Di dalam syncOfflineData(), setelah sync ke Firebase
   berhasil (syncedCount++ area).

   TAMBAHKAN di dalam loop for setelah await getUserRef("produksiHarian").push(cleanData):
   ════════════════════════════════════════════════════════════ */
function _patch_syncOffline_supabase(cleanData) {
  // Tambahkan setelah syncedCount++; di dalam loop syncOfflineData():
  if (typeof sbSaveProduksi === "function" && cleanData.tanggal && cleanData.kg) {
    sbSaveProduksi(cleanData.tanggal, cleanData.kg, "sync_offline");
  }
}


/* ════════════════════════════════════════════════════════════
   PATCH 8 (OPSIONAL) — js/firebase-service.js
   Lokasi: Di window.addEventListener("online", ...) handler,
   setelah setTimeout(() => syncOfflineData(), 1500)

   Tambahkan sync Firebase→Supabase saat online kembali:
   ════════════════════════════════════════════════════════════ */
function _patch_online_syncToSupabase() {
  // Tambahkan setelah syncOfflineData() dipanggil:
  setTimeout(async () => {
    if (typeof produksiData !== "undefined" && produksiData && typeof sbSyncProduksiFromFirebase === "function") {
      await sbSyncProduksiFromFirebase(produksiData);
    }
  }, 3000); // delay 3s agar syncOfflineData selesai duluan
}


/* ════════════════════════════════════════════════════════════
   CARA PAKAI UPLOAD FOTO PROFIL (opsional, replace URL-based)
   Tambahkan di HTML atau app.js untuk trigger upload file:
   ════════════════════════════════════════════════════════════ */
async function _contoh_uploadFoto(file) {
  const result = await sbUploadFotoProfil(file);
  if (result.success) {
    // Simpan URL ke Firebase juga (agar konsisten)
    if (typeof saveProfileImageUrl === "function") {
      saveProfileImageUrl(result.publicUrl);
    }
    showToast("✅ Foto profil diupload ke Supabase Storage");
  } else {
    showToast("⚠ Gagal upload: " + (result.error || "Error tidak diketahui"));
  }
}


/* ════════════════════════════════════════════════════════════
   CONTOH: Upload laporan PDF ke Supabase Storage
   Mengganti / melengkapi fungsi downloadPDF() yang sudah ada.
   ════════════════════════════════════════════════════════════ */
async function downloadAndUploadPDF() {
  // 1. Generate PDF seperti biasa dengan jsPDF (kode downloadPDF() tetap)
  const { jsPDF }   = window.jspdf;
  const doc         = new jsPDF();
  const today       = new Date().toISOString().slice(0, 10);
  const bulan       = today.slice(0, 7);

  doc.text("Laporan Produksi Maggot - SmartBSF", 20, 20);
  doc.text("Dihasilkan: " + today, 20, 30);

  // Tambahkan data produksi...
  const totalKgRaw = typeof produksiData !== "undefined"
    ? Object.values(produksiData).reduce((a, b) => a + b, 0) : 0;
  doc.text(`Total Produksi: ${Math.round(totalKgRaw)} kg`, 20, 40);

  // 2. Simpan lokal (tetap ada)
  const filename = `laporan_${bulan}.pdf`;
  doc.save(filename);

  // 3. Upload ke Supabase Storage (tambahan baru)
  const pdfBlob = doc.output("blob");
  const result  = await sbUploadLaporan(pdfBlob, filename, "produksi", bulan);

  if (result.success) {
    showToast("✅ Laporan tersimpan di cloud Supabase");
    console.log("[supabase] PDF URL:", result.publicUrl);
  }
}
