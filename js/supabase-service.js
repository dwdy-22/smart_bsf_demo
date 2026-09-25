/* ============================================================
   SUPABASE SERVICE – SmartBSF Cloud Kedua
   ============================================================
   Fungsi   : Riwayat produksi, BEP history, pendapatan log,
              Storage foto & PDF, laporan bulanan.
   Depends  : firebase-config.js & auth.js sudah load duluan
              (butuh currentUserId dari Firebase Auth)
   PENTING  : File ini TIDAK menggantikan Firebase.
              Firebase tetap jalan normal untuk IoT realtime,
              Auth, dan Hosting.
   Load order di HTML (setelah firebase scripts):
     <script src="js/supabase-service.js"></script>
   ============================================================ */

/* ============================================================
   [FIX 3.4] HELPER TANGGAL LOKAL (WIB) — sama seperti di firebase-service.js.
   Didefinisikan ulang di sini (dengan guard) supaya file ini tetap benar
   walau suatu saat dimuat sendiri atau urutan <script> berubah.
   ============================================================ */
if (typeof window.getLocalDateISO !== "function") {
  window.getLocalDateISO = function(offsetDays = 0) {
    const d = new Date();
    if (offsetDays) d.setDate(d.getDate() + offsetDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
}
if (typeof window.getLocalMonthISO !== "function") {
  window.getLocalMonthISO = function(offsetMonths = 0) {
    const d = new Date();
    if (offsetMonths) d.setMonth(d.getMonth() + offsetMonths);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  };
}

/* ── KONFIGURASI ─────────────────────────────────────────────
   Ganti dua nilai ini dengan Project URL & anon key dari
   Supabase Dashboard → Settings → API
   ─────────────────────────────────────────────────────────── */
const SUPABASE_URL  = "https://iilvwkbxbsygeajovraa.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpbHZ3a2J4YnN5Z2Vham92cmFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5ODE1OTgsImV4cCI6MjA5MTU1NzU5OH0.tAbt4kkO0ct3Fy-gWaUQW7W25fnS1FbniKuJPhBo1Og";

/* ── INIT CLIENT ─────────────────────────────────────────────
   Supabase JS SDK v2 di-load via CDN di HTML.
   Tambahkan baris ini di Index_INTEGRATED.html tepat sebelum
   <script src="js/supabase-service.js"></script>:

   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
   ─────────────────────────────────────────────────────────── */
let _supabaseClient = null;

function getSupabaseClient() {
  if (_supabaseClient) return _supabaseClient;
  if (typeof supabase === "undefined" || !supabase.createClient) {
    console.error("[supabase-service] ❌ SDK belum load! Data tidak akan tersimpan ke cloud kedua.");
    console.error("[supabase-service] Pastikan CDN script Supabase sudah ada di HTML sebelum file ini.");
    
    // Tampilkan peringatan ke user (hanya sekali)
    if (typeof window._supabaseWarningShown === "undefined") {
      window._supabaseWarningShown = true;
      if (typeof showToast === "function") {
        showToast("⚠️ Cloud backup offline - data hanya tersimpan di Firebase", 5000);
      }
    }
    return null;
  }
  
  try {
    _supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
    console.log("[supabase-service] ✅ Client initialized successfully");
    return _supabaseClient;
  } catch (e) {
    console.error("[supabase-service] ❌ Failed to create client:", e);
    if (typeof showToast === "function") {
      showToast("⚠️ Gagal koneksi ke cloud backup", 3000);
    }
    return null;
  }
}

/* ── SET FIREBASE UID KE SUPABASE SESSION ────────────────────
   RLS di Supabase menggunakan app.firebase_uid dari session.
   Dipanggil setelah onAuthStateChanged Firebase berhasil.
   ─────────────────────────────────────────────────────────── */
async function setSupabaseUserContext(firebaseUid) {
  const sb = getSupabaseClient();
  if (!sb || !firebaseUid) return;
  try {
    // Set custom config untuk RLS policy
    await sb.rpc("set_config", {
      setting_name:  "app.firebase_uid",
      setting_value: firebaseUid,
      is_local:      true
    });
    console.log("[supabase-service] User context set:", firebaseUid);
  } catch (e) {
    // Fallback: set via header custom (beberapa versi Supabase tidak punya set_config RPC)
    // Dalam praktik SmartBSF, uid dikirim langsung sebagai kolom di setiap query
    console.log("[supabase-service] RPC set_config tidak tersedia, menggunakan uid langsung di query.");
  }
}

/* ── HELPER: pastikan uid ada ────────────────────────────────  */
function _requireUid() {
  if (typeof currentUserId === "undefined" || !currentUserId) {
    console.error("[supabase-service] ❌ currentUserId belum tersedia. User belum login atau auth.js belum load.");
    console.error("[supabase-service] Stack trace:", new Error().stack);
    return null;
  }
  return currentUserId;
}

/* ── HELPER: format error ─────────────────────────────────── */
function _sbErr(fn, err) {
  console.error(`[supabase-service] ${fn}:`, err?.message || err);
}

/* ============================================================
   MODUL 1 – USER PROFILE
   Sync profil usaha ke Supabase (upsert = insert atau update)
   Dipanggil setelah doSaveProfil() di app.js berhasil.
   ============================================================ */

/**
 * Simpan / update profil usaha ke Supabase.
 * @param {Object} data - field profil yang ingin disimpan
 */
async function sbSaveProfile(data = {}) {
  const uid = _requireUid();
  if (!uid) return { success: false };
  const sb  = getSupabaseClient();
  if (!sb)  return { success: false };

  const payload = {
    firebase_uid:    uid,
    nama_usaha:      data.nama       || null,
    jumlah_biopond:  data.biopond    ? parseInt(data.biopond)   : null,
    produksi_siklus: data.produksi   ? parseFloat(data.produksi): null,
    target_produksi: data.target     ? parseFloat(data.target)  : null,
    bahasa:          data.bahasa     || localStorage.getItem("lang") || "id",
    satuan:          data.satuan     || localStorage.getItem("unit") || "metric",
    foto_url:        data.fotoUrl    || null,
    wallpaper_url:   data.wallpaperUrl || null,
    updated_at:      new Date().toISOString()
  };

  // Hapus key bernilai null agar tidak overwrite field yang belum ada
  Object.keys(payload).forEach(k => payload[k] === null && delete payload[k]);
  payload.firebase_uid = uid; // uid wajib ada

  const { error } = await sb
    .from("user_profiles")
    .upsert(payload, { onConflict: "firebase_uid" });

  if (error) { _sbErr("sbSaveProfile", error); _sbEnqueueRetry("profile", data); return { success: false, error }; }
  return { success: true };
}

/**
 * Load profil dari Supabase (fallback jika localStorage kosong).
 */
async function sbLoadProfile() {
  const uid = _requireUid();
  if (!uid) return null;
  const sb  = getSupabaseClient();
  if (!sb)  return null;

  try {
    const { data, error } = await sb
      .from("user_profiles")
      .select("*")
      .eq("firebase_uid", uid)
      .maybeSingle();

    // maybeSingle() returns null (not error) jika row tidak ada
    // Abaikan semua error (406, 404, dll) — cukup return null
    if (error) {
      // Jangan log sebagai error — ini normal untuk user baru
      console.log("[supabase-service] sbLoadProfile: row belum ada (normal untuk user baru)");
      return null;
    }
    return data; // null jika belum ada row, object jika sudah ada
  } catch (e) {
    // Network error atau SDK error — silent fail
    console.log("[supabase-service] sbLoadProfile: skip (", e?.message || e, ")");
    return null;
  }
}

/* ============================================================
   MODUL 2 – PRODUKSI HARIAN
   Simpan dan tarik riwayat produksi (tidak auto-delete seperti Firebase)
   ============================================================ */

/**
 * Simpan atau update data produksi harian.
 * @param {string} tanggal - format 'YYYY-MM-DD'
 * @param {number} kg      - berat dalam kg
 * @param {string} sumber  - 'manual' | 'sensor' | 'sync_offline'
 */
async function sbSaveProduksi(tanggal, kg, sumber = "manual", catatan = "") {
  const uid = _requireUid();
  if (!uid || !tanggal || isNaN(kg)) return { success: false };
  const sb  = getSupabaseClient();
  if (!sb)  return { success: false };

  const { error } = await sb
    .from("produksi_harian")
    .upsert({
      firebase_uid:  uid,
      tanggal,
      kg:            parseFloat(kg),
      timestamp_ms:  Date.now(),
      sumber,
      catatan:       catatan || null,
      created_at:    new Date().toISOString()
    }, { onConflict: "firebase_uid,tanggal" });

  if (error) { _sbErr("sbSaveProduksi", error); _sbEnqueueRetry("produksi", { tanggal, kg, sumber }); return { success: false, error }; }
  return { success: true };
}

/**
 * Ambil riwayat produksi dalam range tanggal.
 * @param {string} dari  - 'YYYY-MM-DD' awal range (opsional, default 30 hari lalu)
 * @param {string} sampai - 'YYYY-MM-DD' akhir range (opsional, default hari ini)
 * @returns {Array} array of { tanggal, kg, sumber }
 */
async function sbGetProduksi(dari = null, sampai = null) {
  const uid = _requireUid();
  if (!uid) return [];
  const sb  = getSupabaseClient();
  if (!sb)  return [];

  // [FIX 3.4] tanggal lokal (WIB), bukan UTC
  const today = getLocalDateISO();
  const from30 = getLocalDateISO(-30);

  let query = sb
    .from("produksi_harian")
    .select("tanggal, kg, sumber, catatan, created_at")
    .eq("firebase_uid", uid)
    .gte("tanggal", dari || from30)
    .lte("tanggal", sampai || today)
    .order("tanggal", { ascending: false });

  const { data, error } = await query;
  if (error) { _sbErr("sbGetProduksi", error); return []; }
  return data || [];
}

/**
 * Ambil ringkasan produksi per bulan (pakai view v_produksi_bulanan).
 * @param {number} nBulan - berapa bulan terakhir (default 6)
 */
async function sbGetProduksiBulanan(nBulan = 6) {
  const uid = _requireUid();
  if (!uid) return [];
  const sb  = getSupabaseClient();
  if (!sb)  return [];

  // Hitung bulan awal (format YYYY-MM)
  // [FIX 3.4] tanggal lokal (WIB), bukan UTC
  const bulanAwal = getLocalMonthISO(-nBulan + 1);

  const { data, error } = await sb
    .from("v_produksi_bulanan")
    .select("*")
    .eq("firebase_uid", uid)
    .gte("bulan", bulanAwal)
    .order("bulan", { ascending: false });

  if (error) { _sbErr("sbGetProduksiBulanan", error); return []; }
  return data || [];
}

/* ============================================================
   MODUL 3 – BEP HISTORY
   Simpan snapshot BEP tiap bulan. Berbeda dengan Firebase yang
   hanya simpan 1 BEP terbaru, Supabase menyimpan semua histori.
   ============================================================ */

/**
 * Simpan snapshot BEP bulan ini.
 * Dipanggil setelah saveBEPToFirebase() berhasil.
 * @param {Object} bepObj - objek BEP dari onBEPGroupInput() / saveBEPToFirebase()
 */
async function sbSaveBEP(bepObj = {}) {
  const uid = _requireUid();
  if (!uid) return { success: false };
  const sb  = getSupabaseClient();
  if (!sb)  return { success: false };

  const bulan = getLocalMonthISO(); // YYYY-MM, [FIX 3.4] lokal (WIB) bukan UTC

  const FC = bepObj.fixedCost    || bepObj.biaya_tetap    || 0;
  const VC = bepObj.variableCost || bepObj.biaya_variabel || 0;
  const P  = bepObj.hargaJual    || bepObj.harga_jual     || 0;
  const Q  = bepObj.produksi     || 0;
  const CM = P - VC; // Contribution Margin

  const bepUnit   = CM > 0 ? Math.ceil(FC / CM) : null;
  const bepRupiah = CM > 0 ? Math.round(FC / (CM / P)) : null;
  const profit    = Q > 0 ? Math.round((P * Q) - (FC + VC * Q)) : null;

  const payload = {
    firebase_uid:     uid,
    bulan,
    produk:           bepObj.produk          || "maggot_segar",
    harga_jual:       P,
    produksi:         Q,
    keberhasilan:     bepObj.keberhasilan     || 100,
    fc_investasi:     bepObj.fc_groups?.fc1  || 0,
    fc_infrastruktur: bepObj.fc_groups?.fc2  || 0,
    fc_listrik:       bepObj.fc_groups?.fc3  || 0,
    fc_lainnya:       bepObj.fc_groups?.fc4  || 0,
    fc_total:         FC,
    vc_pakan:         bepObj.vc_groups?.vc1  || 0,
    vc_operasional:   bepObj.vc_groups?.vc2  || 0,
    vc_tenaga_kerja:  bepObj.vc_groups?.vc3  || 0,
    vc_lainnya:       bepObj.vc_groups?.vc4  || 0,
    vc_total:         VC,
    bep_unit:         bepUnit,
    bep_rupiah:       bepRupiah,
    profit_aktual:    profit,
    target_profit:    bepObj.targetProfit    || bepObj.target_profit || 0,
    updated_at:       new Date().toISOString()
  };

  const { error } = await sb
    .from("bep_history")
    .upsert(payload, { onConflict: "firebase_uid,bulan,produk" });

  if (error) { _sbErr("sbSaveBEP", error); _sbEnqueueRetry("bep", bepObj); return { success: false, error }; }
  return { success: true };
}

/**
 * Ambil riwayat BEP beberapa bulan terakhir.
 * @param {number} nBulan - berapa bulan (default 12)
 * @param {string} produk - filter produk (opsional)
 */
async function sbGetBEPHistory(nBulan = 12, produk = null) {
  const uid = _requireUid();
  if (!uid) return [];
  const sb  = getSupabaseClient();
  if (!sb)  return [];

  // [FIX 3.4] tanggal lokal (WIB), bukan UTC
  const bulanAwal = getLocalMonthISO(-nBulan + 1);

  let query = sb
    .from("bep_history")
    .select("*")
    .eq("firebase_uid", uid)
    .gte("bulan", bulanAwal)
    .order("bulan", { ascending: false });

  if (produk) query = query.eq("produk", produk);

  const { data, error } = await query;
  if (error) { _sbErr("sbGetBEPHistory", error); return []; }
  return data || [];
}

/* ============================================================
   MODUL 4 – PENDAPATAN HARIAN
   Simpan revenue/modal/profit harian ke Supabase.
   Dipanggil setelah autoSavePendapatanHarian() di firebase-service.js
   ============================================================ */

/**
 * Simpan atau update pendapatan harian.
 * @param {string} tanggal - 'YYYY-MM-DD'
 * @param {Object} data    - { revenue, modal, profit, produksi_kg }
 */
async function sbSavePendapatan(tanggal, data = {}) {
  const uid = _requireUid();
  if (!uid || !tanggal) return { success: false };
  const sb  = getSupabaseClient();
  if (!sb)  return { success: false };

  const { error } = await sb
    .from("pendapatan_harian")
    .upsert({
      firebase_uid: uid,
      tanggal,
      revenue:      Math.round(data.revenue  || 0),
      modal:        Math.round(data.modal    || 0),
      profit:       Math.round(data.profit   || 0),
      produksi_kg:  parseFloat(data.produksi || 0),
      updated_at:   new Date().toISOString()
    }, { onConflict: "firebase_uid,tanggal" });

  if (error) { _sbErr("sbSavePendapatan", error); _sbEnqueueRetry("pendapatan", { tanggal, ...data }); return { success: false, error }; }
  return { success: true };
}

/**
 * Ambil ringkasan pendapatan per bulan.
 * @param {number} nBulan - berapa bulan terakhir
 */
async function sbGetPendapatanBulanan(nBulan = 6) {
  const uid = _requireUid();
  if (!uid) return [];
  const sb  = getSupabaseClient();
  if (!sb)  return [];

  // [FIX 3.4] tanggal lokal (WIB), bukan UTC
  const bulanAwal = getLocalMonthISO(-nBulan + 1);

  const { data, error } = await sb
    .from("v_pendapatan_bulanan")
    .select("*")
    .eq("firebase_uid", uid)
    .gte("bulan", bulanAwal)
    .order("bulan", { ascending: false });

  if (error) { _sbErr("sbGetPendapatanBulanan", error); return []; }
  return data || [];
}

/* ============================================================
   MODUL 5 – STORAGE: FOTO PROFIL & LAPORAN PDF
   ============================================================ */

/**
 * Upload foto profil ke Supabase Storage bucket 'foto-profil'.
 * @param {File} file - objek File dari input[type=file]
 * @returns {Object} { success, publicUrl, error }
 */
async function sbUploadFotoProfil(file) {
  const uid = _requireUid();
  if (!uid || !file) return { success: false };
  const sb  = getSupabaseClient();
  if (!sb)  return { success: false };

  // Validasi tipe & ukuran (max 2MB)
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    return { success: false, error: "Format gambar harus JPG, PNG, atau WebP" };
  }
  if (file.size > 2 * 1024 * 1024) {
    return { success: false, error: "Ukuran foto maksimal 2MB" };
  }

  const ext  = file.name.split(".").pop().toLowerCase();
  const path = `${uid}/avatar.${ext}`;

  const { error: upErr } = await sb.storage
    .from("foto-profil")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (upErr) { _sbErr("sbUploadFotoProfil", upErr); return { success: false, error: upErr }; }

  const { data: urlData } = sb.storage
    .from("foto-profil")
    .getPublicUrl(path);

  const publicUrl = urlData?.publicUrl || null;

  // Simpan URL ke tabel user_profiles
  await sbSaveProfile({ fotoUrl: publicUrl });

  return { success: true, publicUrl };
}

/**
 * Upload wallpaper ke Supabase Storage bucket 'foto-profil'.
 * @param {File} file - objek File dari input[type=file]
 * @returns {Object} { success, publicUrl, error }
 */
async function sbUploadWallpaper(file) {
  const uid = _requireUid();
  if (!uid || !file) return { success: false };
  const sb  = getSupabaseClient();
  if (!sb)  return { success: false };

  // Validasi tipe & ukuran (max 5MB)
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    return { success: false, error: "Format gambar harus JPG, PNG, atau WebP" };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: "Ukuran wallpaper maksimal 5MB" };
  }

  const ext  = file.name.split(".").pop().toLowerCase();
  const path = `${uid}/wallpaper.${ext}`;

  const { error: upErr } = await sb.storage
    .from("foto-profil")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (upErr) { _sbErr("sbUploadWallpaper", upErr); return { success: false, error: upErr }; }

  const { data: urlData } = sb.storage
    .from("foto-profil")
    .getPublicUrl(path);

  const publicUrl = urlData?.publicUrl || null;

  // Simpan URL ke tabel user_profiles
  await sbSaveProfile({ wallpaperUrl: publicUrl });

  return { success: true, publicUrl };
}

/**
 * Upload file PDF laporan ke Supabase Storage bucket 'laporan'.
 * @param {Blob|File} pdfBlob - blob PDF dari jsPDF
 * @param {string}   filename - nama file, contoh: 'laporan_2025-04.pdf'
 * @param {string}   tipe     - 'produksi' | 'bep' | 'pendapatan'
 * @param {string}   bulan    - 'YYYY-MM'
 * @returns {Object} { success, publicUrl, error }
 */
async function sbUploadLaporan(pdfBlob, filename, tipe = "produksi", bulan = null) {
  const uid = _requireUid();
  if (!uid || !pdfBlob || !filename) return { success: false };
  const sb  = getSupabaseClient();
  if (!sb)  return { success: false };

  const path = `${uid}/${filename}`;

  const { error: upErr } = await sb.storage
    .from("laporan")
    .upload(path, pdfBlob, { upsert: true, contentType: "application/pdf" });

  if (upErr) { _sbErr("sbUploadLaporan", upErr); return { success: false, error: upErr }; }

  const { data: urlData } = sb.storage
    .from("laporan")
    .getPublicUrl(path);

  const publicUrl = urlData?.publicUrl || null;

  // Catat metadata di tabel laporan_exports
  await getSupabaseClient()
    .from("laporan_exports")
    .insert({
      firebase_uid:  uid,
      filename,
      storage_path:  path,
      tipe,
      bulan:         bulan || getLocalMonthISO(), // [FIX 3.4] lokal (WIB) bukan UTC
      ukuran_bytes:  pdfBlob.size || null
    });

  return { success: true, publicUrl };
}

/**
 * Ambil daftar laporan yang sudah di-upload user ini.
 */
async function sbGetDaftarLaporan() {
  const uid = _requireUid();
  if (!uid) return [];
  const sb  = getSupabaseClient();
  if (!sb)  return [];

  const { data, error } = await sb
    .from("laporan_exports")
    .select("*")
    .eq("firebase_uid", uid)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) { _sbErr("sbGetDaftarLaporan", error); return []; }
  return data || [];
}

/* ============================================================
   MODUL 6 – SYNC FIREBASE → SUPABASE
   Sinkronisasi data Firebase ke Supabase secara periodik.
   Dipanggil saat app online atau saat user buka dashboard.
   ============================================================ */

/**
 * Sync data produksiHarian dari Firebase ke Supabase.
 * Cocok dipanggil saat online kembali (window 'online' event)
 * atau saat loadProduksiData() selesai.
 *
 * [FIX 3.1 / format sinkronisasi] Data asli di Firebase (users/{uid}/produksiHarian)
 * ditulis lewat push(), sehingga kuncinya adalah push-ID Firebase (mis. "-Oabc..."),
 * BUKAN kunci tanggal "YYYY-MM-DD". Setiap value-nya adalah record
 * { tanggal, kg, timestamp }. Fungsi ini sebelumnya mengasumsikan objek berkunci
 * tanggal langsung, sehingga regex validasi selalu gagal dan 0 record pernah
 * terkirim (terbukti lewat simulasi Node, lihat laporan 3.1).
 *
 * Fungsi ini sekarang menerima kedua bentuk:
 *  - record push-ID: { "-Oabc...": { tanggal, kg, ... }, ... }  (bentuk asli di Firebase)
 *  - map tanggal lama: { "2026-01-01": 12.5, ... }               (untuk kompatibilitas)
 * dan menjumlahkan kg per tanggal bila ada beberapa entri untuk hari yang sama
 * (perilaku ini sama dengan cara UI menghitung total per hari, lihat
 * loadUserProduction() di auth.js dan loadCalendarData() di ui-controller.js).
 *
 * @param {Object} produksiData - snapshot mentah dari users/{uid}/produksiHarian
 */
async function sbSyncProduksiFromFirebase(produksiData = {}) {
  if (!produksiData || typeof produksiData !== "object") return;
  const rawEntries = Object.entries(produksiData);
  if (!rawEntries.length) return;

  // Normalisasi: kumpulkan total kg per tanggal, apa pun bentuk key/value-nya.
  const perTanggal = {};
  for (const [key, val] of rawEntries) {
    let tanggal;
    let kg;
    if (val && typeof val === "object") {
      // Bentuk asli: record push-ID → { tanggal, kg, timestamp }
      tanggal = val.tanggal;
      kg = val.kg;
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
      // Bentuk lama/kompat: key sudah berupa tanggal, value adalah angka kg
      tanggal = key;
      kg = val;
    } else {
      continue; // bentuk tak dikenal, lewati
    }

    if (!tanggal || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) continue;
    const kgNum = parseFloat(kg);
    if (isNaN(kgNum)) continue;

    perTanggal[tanggal] = (perTanggal[tanggal] || 0) + kgNum;
  }

  const entries = Object.entries(perTanggal);
  if (!entries.length) return;

  console.log(`[supabase-service] Syncing ${entries.length} produksi records ke Supabase...`);

  for (const [tanggal, kgNum] of entries) {
    await sbSaveProduksi(tanggal, kgNum, "sync_firebase");
  }

  console.log("[supabase-service] Sync produksi selesai.");
}

/**
 * Sync data pendapatanHarian dari Firebase ke Supabase.
 * @param {Object} pendapatanData - objek { 'YYYY-MM-DD': { profit, revenue, modal, produksi } }
 */
async function sbSyncPendapatanFromFirebase(pendapatanData = {}) {
  if (!pendapatanData || typeof pendapatanData !== "object") return;
  const entries = Object.entries(pendapatanData);
  if (!entries.length) return;

  console.log(`[supabase-service] Syncing ${entries.length} pendapatan records ke Supabase...`);

  for (const [tanggal, dayData] of entries) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) continue;
    await sbSavePendapatan(tanggal, dayData);
  }

  console.log("[supabase-service] Sync pendapatan selesai.");
}

/* ============================================================
   INIT – Dipanggil dari auth.js setelah Firebase login berhasil
   Tambahkan pemanggilan ini di showDashboard() atau initializeAppForUser()
   di auth.js Anda:
     if (typeof initSupabaseForUser === 'function') initSupabaseForUser(uid);
   ============================================================ */
async function initSupabaseForUser(uid) {
  if (!uid) {
    console.error("[supabase-service] ❌ initSupabaseForUser called without UID!");
    return;
  }

  // ── Cleanup localStorage corrupt values dari versi lama ──
  try {
    // Hapus foto base64 besar (>10KB) — ganti dengan URL cloud
    const oldFoto = localStorage.getItem("foto");
  if (oldFoto && oldFoto.startsWith("data:") && oldFoto.length > 2800000) {
      localStorage.removeItem("foto");
      console.log("[supabase-service] 🧹 Removed large base64 foto from localStorage");
    }
    // Hapus wallpaperUrl yang berisi gradient (akan diload ulang dari Firebase)
    // Ini sudah ditangani di applyWallpaper, tapi bersihkan agar tidak konflik
    const oldWp = localStorage.getItem("wallpaperUrl");
    if (oldWp && (oldWp.includes("linear-gradient") || oldWp.includes("radial-gradient"))) {
      // Gradient valid — biarkan, sudah fix di applyWallpaper
    }
  } catch(e) {}

  console.log("[supabase-service] 🔄 Initializing for user:", uid);

  try {
    await setSupabaseUserContext(uid);

    // Load profil dari Supabase sebagai fallback jika localStorage kosong
    if (!localStorage.getItem("nama")) {
      const profile = await sbLoadProfile();
      if (profile) {
        // Row sudah ada → sync ke localStorage
        if (profile.nama_usaha)      localStorage.setItem("nama",              profile.nama_usaha);
        if (profile.jumlah_biopond)  localStorage.setItem("biopond",           String(profile.jumlah_biopond));
        if (profile.produksi_siklus) localStorage.setItem("produksiPerSiklus", String(profile.produksi_siklus));
        if (profile.target_produksi) localStorage.setItem("targetProduksi",    String(profile.target_produksi));
        if (profile.bahasa)          localStorage.setItem("lang",              profile.bahasa);
        if (profile.satuan)          localStorage.setItem("unit",              profile.satuan);
        console.log("[supabase-service] ✅ Profil di-load dari Supabase:", profile.nama_usaha);
      } else {
        // Row belum ada (user baru) → buat row kosong agar tidak 406 lagi
        console.log("[supabase-service] 🆕 User baru — membuat row profil di Supabase...");
        await sbSaveProfile({
          bahasa: localStorage.getItem("lang")  || "id",
          satuan: localStorage.getItem("unit")  || "metric",
        });
        console.log("[supabase-service] ✅ Row profil baru berhasil dibuat.");
      }
    } else {
      // localStorage sudah ada nama → tetap cek apakah row Supabase sudah ada
      const existingProfile = await sbLoadProfile();
      if (!existingProfile) {
        // Row belum ada padahal localStorage ada → sync sekarang
        await sbSaveProfile({
          nama:    localStorage.getItem("nama")    || "",
          biopond: localStorage.getItem("biopond") || "",
          produksi: localStorage.getItem("produksiPerSiklus") || "",
          target:  localStorage.getItem("targetProduksi") || "",
          bahasa:  localStorage.getItem("lang")   || "id",
          satuan:  localStorage.getItem("unit")   || "metric",
        });
        console.log("[supabase-service] ✅ Row profil di-sync dari localStorage.");
      }
    }
    
    console.log("[supabase-service] ✅ Initialization complete. Cloud backup ready.");
  } catch (error) {
    console.error("[supabase-service] ❌ Initialization failed:", error);
  }
}

/* ── Expose ke global scope ──────────────────────────────── */
window.sbSaveProfile          = sbSaveProfile;
window.sbLoadProfile          = sbLoadProfile;
window.sbSaveProduksi         = sbSaveProduksi;
window.sbGetProduksi          = sbGetProduksi;
window.sbGetProduksiBulanan   = sbGetProduksiBulanan;
window.sbSaveBEP              = sbSaveBEP;
window.sbGetBEPHistory        = sbGetBEPHistory;
window.sbSavePendapatan       = sbSavePendapatan;
window.sbGetPendapatanBulanan = sbGetPendapatanBulanan;
window.sbUploadFotoProfil     = sbUploadFotoProfil;
window.sbUploadWallpaper      = sbUploadWallpaper;
window.sbUploadLaporan        = sbUploadLaporan;
window.sbGetDaftarLaporan     = sbGetDaftarLaporan;
window.sbSyncProduksiFromFirebase  = sbSyncProduksiFromFirebase;
window.sbSyncPendapatanFromFirebase = sbSyncPendapatanFromFirebase;
window.initSupabaseForUser    = initSupabaseForUser;

/* ============================================================
   RETRY QUEUE – Gagal write ke Supabase → antri, coba ulang tiap 5 menit
   ============================================================ */
const _sbRetryQueue = [];
const _SB_RETRY_KEY = "supabase_retry_queue";

// Load antrian dari localStorage saat startup
(function _loadRetryQueue() {
  try {
    const saved = JSON.parse(localStorage.getItem(_SB_RETRY_KEY) || "[]");
    saved.forEach(item => _sbRetryQueue.push(item));
    if (_sbRetryQueue.length) {
      console.log(`[supabase-service] 🔄 ${_sbRetryQueue.length} pending retries loaded from localStorage`);
    }
  } catch(e) {}
})();

function _sbEnqueueRetry(type, data) {
  _sbRetryQueue.push({ type, data, ts: Date.now(), attempts: 0 });
  try { localStorage.setItem(_SB_RETRY_KEY, JSON.stringify(_sbRetryQueue)); } catch(e) {}
}

async function _sbFlushRetryQueue() {
  if (!_sbRetryQueue.length) return;
  const toRetry = [..._sbRetryQueue];
  _sbRetryQueue.length = 0;

  for (const item of toRetry) {
    try {
      if      (item.type === "produksi")   await sbSaveProduksi(item.data.tanggal, item.data.kg, item.data.sumber || "retry");
      else if (item.type === "pendapatan") await sbSavePendapatan(item.data.tanggal, item.data);
      else if (item.type === "bep")        await sbSaveBEP(item.data);
      else if (item.type === "profile")    await sbSaveProfile(item.data);
      console.log(`[supabase-service] ✅ Retry berhasil: ${item.type} (${item.data.tanggal || ""})`);
    } catch(e) {
      item.attempts = (item.attempts || 0) + 1;
      if (item.attempts < 10) {
        _sbRetryQueue.push(item); // kembalikan ke antrian jika belum 10x
      } else {
        console.warn(`[supabase-service] ❌ Retry menyerah setelah 10x: ${item.type}`);
      }
    }
  }
  try { localStorage.setItem(_SB_RETRY_KEY, JSON.stringify(_sbRetryQueue)); } catch(e) {}
}

// Jalankan retry tiap 5 menit saat online
setInterval(() => {
  if (navigator.onLine && _sbRetryQueue.length > 0) _sbFlushRetryQueue();
}, 5 * 60 * 1000);

// Juga flush saat kembali online
window.addEventListener("online", () => {
  if (_sbRetryQueue.length > 0) {
    setTimeout(_sbFlushRetryQueue, 6000); // setelah Firebase sync selesai
  }
});

// Expose retry helpers
window._sbEnqueueRetry   = _sbEnqueueRetry;
window._sbFlushRetryQueue = _sbFlushRetryQueue;

console.log("[supabase-service] Loaded. Menunggu Firebase Auth...");
