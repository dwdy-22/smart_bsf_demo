/* ============================================================
   FIREBASE SERVICE – UID-SCOPED DATABASE OPERATIONS
   All Firebase read/write operations use /users/{uid}/... paths.
   Depends on: firebase-config.js, auth.js (for currentUserId)
   ============================================================ */

/* ============================================================
   [FIX 3.4] HELPER: TANGGAL LOKAL (WIB), BUKAN UTC
   `new Date().toISOString()` selalu memakai UTC. Untuk pengguna WIB (UTC+7),
   antara pukul 00:00–06:59 WIB, `toISOString()` masih menunjuk ke tanggal
   KEMARIN (UTC), sehingga kunci "hari ini" salah pada jam-jam tersebut.
   Kalender Home (Index_INTEGRATED.html) dan ui-controller.js sudah memakai
   tanggal lokal (getFullYear/getMonth/getDate); helper ini menyamakan
   firebase-service.js dan supabase-service.js dengan aturan yang sama, agar
   tidak ada dua aturan tanggal berbeda dalam satu aplikasi.
   Didefinisikan idempoten (guard) supaya aman dimuat oleh lebih dari satu
   berkas tanpa peduli urutan <script>.
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

/* ============================================================
   HELPER: GET USER-SCOPED DATABASE REFERENCE  (STEP 4)
   Throws an error instead of falling back to root paths.
   This prevents any accidental cross-user data access.
   ============================================================ */
function getUserRef(path) {
  if (!currentUserId) {
    // Hard stop — never fall back to a global/root path
    throw new Error(
      `[firebase-service] getUserRef("${path}") called without a logged-in user. ` +
      "Ensure initializeAppForUser() is called only after onAuthStateChanged resolves."
    );
  }
  return db.ref(`users/${currentUserId}/${path}`);
}

/* ============================================================
   OFFLINE SYNC SYSTEM – USER-CONTEXT AWARE
   ============================================================ */

// Save data to localStorage queue (with user context tag)
function saveToLocalStorage(key, data) {
  try {
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    existing.push({
      ...data,
      _localTimestamp: Date.now(),
      _syncAttempts:   0,
      _userId:         currentUserId   // tag so we only sync our own records
    });
    localStorage.setItem(key, JSON.stringify(existing));
    console.log(`✓ Saved to localStorage: ${key}`, data);
    return true;
  } catch (error) {
    console.error("LocalStorage save error:", error);
    return false;
  }
}

// Get pending data from localStorage
function getPendingData(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch (error) {
    console.error("LocalStorage read error:", error);
    return [];
  }
}

// Clear pending data after successful sync
function clearPendingData(key) {
  try {
    localStorage.removeItem(key);
    console.log(`✓ Cleared localStorage: ${key}`);
    return true;
  } catch (error) {
    console.error("LocalStorage clear error:", error);
    return false;
  }
}

// Sync all offline data for the current user to Firebase
async function syncOfflineData() {
  if (!navigator.onLine) {
    console.log("⚠ Cannot sync: Device is offline");
    return { success: false, reason: "offline" };
  }

  if (!currentUserId) {
    console.log("⚠ Cannot sync: No user logged in");
    return { success: false, reason: "no_user" };
  }

  const pendingProduksi = getPendingData("produksiPending");
  const userPending     = pendingProduksi.filter(item => item._userId === currentUserId);

  if (userPending.length === 0) {
    console.log("✓ No pending production data to sync");
    return { success: true, synced: 0 };
  }

  console.log(`⏳ Syncing ${userPending.length} pending production records…`);

  let syncedCount    = 0;
  const failedRecords = [];

  for (let i = 0; i < userPending.length; i++) {
    const data = userPending[i];
    const { _localTimestamp, _syncAttempts, _userId, ...cleanData } = data;

    try {
      await getUserRef("produksiHarian").push(cleanData);
      syncedCount++;
      console.log(`✓ Synced record ${i + 1}/${userPending.length}`);
      // [FIX 3.1] Data yang disimpan offline lalu disinkron ke Firebase di sini
      // sebelumnya tidak pernah diteruskan ke Supabase (supabase-integration-patch.js
      // berisi petunjuk untuk ini tapi berkasnya tidak pernah dimuat). Sekarang
      // diteruskan langsung, konsisten dengan save() dan simpanProduksi().
      if (typeof sbSaveProduksi === "function" && cleanData && cleanData.tanggal !== undefined) {
        sbSaveProduksi(cleanData.tanggal, cleanData.kg, "sync_offline");
      }
    } catch (error) {
      console.error(`✗ Failed to sync record ${i + 1}:`, error);
      failedRecords.push({ ...data, _syncAttempts: (_syncAttempts || 0) + 1 });
    }
  }

  const otherUsersPending = pendingProduksi.filter(item => item._userId !== currentUserId);

  if (failedRecords.length === 0) {
    if (otherUsersPending.length > 0) {
      localStorage.setItem("produksiPending", JSON.stringify(otherUsersPending));
    } else {
      clearPendingData("produksiPending");
    }

    showToast(
      currentLang === "en"
        ? `✓ ${syncedCount} records synced successfully!`
        : `✓ ${syncedCount} data berhasil disinkronkan!`
    );
    return { success: true, synced: syncedCount };

  } else {
    localStorage.setItem(
      "produksiPending",
      JSON.stringify([...otherUsersPending, ...failedRecords])
    );

    showToast(
      currentLang === "en"
        ? `⚠ ${syncedCount}/${userPending.length} records synced`
        : `⚠ ${syncedCount}/${userPending.length} data tersinkron`
    );
    return { success: false, synced: syncedCount, failed: failedRecords.length };
  }
}

// Save with automatic retry and offline fallback
async function saveWithRetry(ref, data, maxRetries = 3) {
  if (!navigator.onLine) {
    saveToLocalStorage("produksiPending", data);
    showToast(
      currentLang === "en"
        ? "📴 Offline. Data saved locally."
        : "📴 Offline. Data disimpan lokal."
    );
    return { success: false, savedLocally: true };
  }

  let attempt  = 0;
  let lastError = null;

  while (attempt < maxRetries) {
    try {
      await ref.push(data);
      showToast(
        currentLang === "en"
          ? "✓ Data saved successfully!"
          : "✓ Data berhasil disimpan!"
      );
      return { success: true, attempt: attempt + 1 };
    } catch (error) {
      attempt++;
      lastError = error;
      console.error(`Save attempt ${attempt}/${maxRetries} failed:`, error);
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;   // 2s, 4s, 8s back-off
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.error("All save attempts failed. Saving to localStorage.", lastError);
  saveToLocalStorage("produksiPending", data);
  showToast(
    currentLang === "en"
      ? "⚠ Failed to save online. Saved locally for later sync."
      : "⚠ Gagal simpan online. Disimpan lokal untuk sinkron nanti."
  );
  return { success: false, savedLocally: true, error: lastError };
}

// Network status monitoring
window.addEventListener("online", () => {
  console.log("✓ Network connection restored");
  showToast(
    currentLang === "en"
      ? "🌐 Back online. Syncing data…"
      : "🌐 Online kembali. Sinkronisasi data…"
  );
  // Step 1: Sync offline queue ke Firebase
  setTimeout(() => syncOfflineData(), 1500);

  // Step 2: Setelah Firebase sync selesai, sync Firebase → Supabase
  setTimeout(async () => {
    try {
      // Sync produksi harian Firebase → Supabase
      if (typeof sbSyncProduksiFromFirebase === "function" && currentUserId) {
        const prodSnap = await getUserRef("produksiHarian").once("value");
        const prodData = prodSnap.val();
        if (prodData) {
          await sbSyncProduksiFromFirebase(prodData);
          console.log("[firebase-service] ✅ Produksi synced ke Supabase setelah online");
        }
      }
      // Sync pendapatan harian Firebase → Supabase
      if (typeof sbSyncPendapatanFromFirebase === "function" && currentUserId) {
        const pendSnap = await getUserRef("pendapatanHarian").once("value");
        const pendData = pendSnap.val();
        if (pendData) {
          await sbSyncPendapatanFromFirebase(pendData);
          console.log("[firebase-service] ✅ Pendapatan synced ke Supabase setelah online");
        }
      }
    } catch(e) {
      console.warn("[firebase-service] Supabase sync on online event failed:", e);
    }
  }, 4000); // delay 4s agar syncOfflineData ke Firebase selesai duluan
});

window.addEventListener("offline", () => {
  console.log("⚠ Network connection lost");
  showToast(
    currentLang === "en"
      ? "📴 You're offline. Data will be saved locally."
      : "📴 Anda offline. Data akan disimpan lokal."
  );
});


/* ============================================================
   TASK 5 – REALTIME LISTENER: pendapatanHarian
   Reads /users/{uid}/pendapatanHarian dan update UI otomatis.
   ============================================================ */
/* ============================================================
   GRAFIK PROFIT 7 HARI (Ringkasan Minggu Ini)
   applyWeekProfitToCharts: dipakai listener real-time & pembacaan sekali.
   primeWeekProfitChart   : baca sekali saat grafik baru dibuat, supaya
                            langsung menampilkan data asli (bukan dummy).
   ============================================================ */
function applyWeekProfitToCharts(data) {
  data = data || {};
  const dates = Object.keys(data).sort();
  const last7 = dates.slice(-7);
  const labels  = last7.map(d => d.slice(5));
  const profits = last7.map(d => (data[d] && data[d].profit) || 0);

  if (typeof barChart !== "undefined" && barChart) {
    barChart.data.labels = labels;
    barChart.data.datasets[0].data = profits;
    barChart.update();
  }
  if (typeof lineChart !== "undefined" && lineChart) {
    const bepFC2 = parseFloat(localStorage.getItem("bepFC")) || 0;
    lineChart.data.labels = labels;
    lineChart.data.datasets[0].data = profits;
    if (lineChart.data.datasets[1]) {
      lineChart.data.datasets[1].data = last7.map(() => bepFC2);
      lineChart.data.datasets[1].hidden = !(bepFC2 > 0);
    }
    // Garis rata-rata profit (annotation) — diabaikan otomatis bila plugin tidak termuat
    const avg = profits.length ? profits.reduce((a, b) => a + b, 0) / profits.length : 0;
    const ann = lineChart.options.plugins && lineChart.options.plugins.annotation
      && lineChart.options.plugins.annotation.annotations
      && lineChart.options.plugins.annotation.annotations.avgLine;
    if (ann) {
      ann.yMin = avg;
      ann.yMax = avg;
      ann.display = profits.length > 0;
      if (ann.label) {
        ann.label.content = (typeof GlobalState !== "undefined" && GlobalState.language === "en")
          ? "Average" : "Rata-rata";
      }
    }
    lineChart.update();
  }
}

function primeWeekProfitChart() {
  if (typeof currentUserId === "undefined" || !currentUserId) return;
  try {
    getUserRef("pendapatanHarian").once("value")
      .then(snap => applyWeekProfitToCharts(snap.val() || {}))
      .catch(e => console.warn("primeWeekProfitChart error:", e));
  } catch (e) { console.warn("primeWeekProfitChart error:", e); }
}

function loadPendapatanHarian() {
  if (!currentUserId) return;
  const ref = getUserRef("pendapatanHarian");
  // [FIX #2] registerListener dipanggil SEBELUM ref.on() agar listener
  // langsung terdaftar dan bisa di-detach saat logout (cegah duplikat callback).
  if (typeof registerListener === "function") registerListener(ref, "value");
  ref.on("value", (snap) => {
    const data = snap.val() || {};
    // Hitung stats dari semua tanggal
    const dates   = Object.keys(data).sort();
    const profits  = dates.map(d => data[d].profit  || 0);
    const revenues = dates.map(d => data[d].revenue || 0);
    const modals   = dates.map(d => data[d].modal   || 0);

    const totalProfit  = profits.reduce((a, b) => a + b, 0);
    const totalRevenue = revenues.reduce((a, b) => a + b, 0);
    const totalModal   = modals.reduce((a, b) => a + b, 0);
    const avgProfit    = profits.length ? Math.round(totalProfit / profits.length) : 0;

    // ── Hari ini ── [FIX 3.4] pakai tanggal lokal (WIB), bukan UTC
    const today      = getLocalDateISO();
    const todayData  = data[today] || {};
    const todayProfit  = todayData.profit  || 0;
    const todayModal   = todayData.modal   || 0;
    const todayRevenue = todayData.revenue || 0;

    // ── Kemarin (untuk trend) ── [FIX 3.4] pakai tanggal lokal (WIB), bukan UTC
    const yest     = getLocalDateISO(-1);
    const yestProfit = (data[yest] || {}).profit || 0;
    const trendPct = yestProfit > 0
      ? Math.round(((todayProfit - yestProfit) / yestProfit) * 100)
      : null;

    // ── Update hero banner ──
    const elMain = document.getElementById("pdHeroProfit");
    if (elMain) elMain.textContent = formatRupiah(todayProfit);

    const elDesc = document.getElementById("pdHeroModal");
    if (elDesc) elDesc.textContent = "Setelah dipotong modal " + formatRupiah(todayModal);

    const elTrend = document.getElementById("pdHeroTrend");
    if (elTrend) {
      if (trendPct !== null) {
        const sign = trendPct >= 0 ? "+" : "";
        elTrend.textContent = sign + trendPct + "% dibanding kemarin";
      } else {
        elTrend.textContent = "Data hari pertama";
      }
    }

    // ── Update target progress row ──
    const elProfitNow = document.getElementById("pdProfitNow");
    if (elProfitNow) elProfitNow.textContent = formatRupiah(todayProfit);

    const elModalPct = document.getElementById("pdModalPct");
    if (elModalPct) {
      const bepFC = parseFloat(localStorage.getItem("bepFC")) || 0;
      const pct   = bepFC > 0 ? Math.min(Math.round((todayRevenue / bepFC) * 100), 100) : 0;
      elModalPct.textContent = pct + "%";
      const elModalRow = document.getElementById("pdModalRow");
      if (elModalRow) elModalRow.textContent = pct >= 100 ? "Lunas" : pct + "% tercapai";
    }

    const elTargetProfit = document.getElementById("pdTargetProfit");
    if (elTargetProfit) {
      const tp = parseFloat(localStorage.getItem("bepField_targetProfit")) || 0;
      elTargetProfit.textContent = formatRupiah(tp);
      const achieved = tp > 0 ? Math.min(Math.round((totalProfit / tp) * 100), 100) : 0;
      const elTgtRow = document.getElementById("pdTargetRow");
      if (elTgtRow) elTgtRow.textContent = achieved + "% tercapai";
    }

    // ── Update ringkasan mingguan (7 hari terakhir) ──
    const last7 = dates.slice(-7);
    const week = last7.reduce((acc, d) => ({
      revenue: acc.revenue + (data[d].revenue || 0),
      modal:   acc.modal   + (data[d].modal   || 0),
      profit:  acc.profit  + (data[d].profit  || 0),
    }), { revenue: 0, modal: 0, profit: 0 });
    const weekAvg = last7.length ? Math.round(week.profit / last7.length) : 0;

    const el = (id) => document.getElementById(id);
    if (el("pdWeekRevenue")) el("pdWeekRevenue").textContent = formatRupiah(week.revenue);
    if (el("pdWeekModal"))   el("pdWeekModal").textContent   = formatRupiah(week.modal);
    if (el("pdWeekProfit"))  el("pdWeekProfit").textContent  = formatRupiah(week.profit);
    if (el("pdWeekAvg"))     el("pdWeekAvg").textContent     = formatRupiah(weekAvg);

    // ── Update chart jika tersedia ──
    applyWeekProfitToCharts(data);
  });
}

/* ============================================================
   TASK 3 – SAVE BEP TO FIREBASE
   Dipanggil setelah setiap perhitungan BEP.
   ============================================================ */
// ── THROTTLE GUARD: prevent infinite loop ──────────────────────────────────
let _saveBEPLastCall = 0;
let _saveBEPDebounceTimer = null;
const _SAVE_BEP_THROTTLE_MS = 15000; // max sekali per 15 detik

function saveBEPToFirebase(bepObj) {
  if (!currentUserId) return;
  const now = Date.now();
  if (now - _saveBEPLastCall < _SAVE_BEP_THROTTLE_MS) {
    // [FIX SEDANG #6] Throttle aktif: jangan diam saja. Jadwalkan simpan ulang
    // di akhir window throttle agar perubahan terakhir user tidak hilang.
    clearTimeout(_saveBEPDebounceTimer);
    _saveBEPDebounceTimer = setTimeout(function() {
      saveBEPToFirebase(bepObj);
    }, _SAVE_BEP_THROTTLE_MS - (now - _saveBEPLastCall) + 200);
    // Beri tahu user bahwa data akan tersimpan otomatis (bukan hilang)
    if (typeof showToast === "function") {
      showToast("⏳ Data BEP akan tersimpan otomatis dalam beberapa detik…");
    }
    console.log("[saveBEPToFirebase] throttled — dijadwal ulang.");
    return;
  }
  _saveBEPLastCall = now;
  const payload = {
    hargaJual:    bepObj.harga_jual    || 0,
    fixedCost:    bepObj.biaya_tetap   || 0,
    variableCost: bepObj.biaya_variabel|| 0,
    produksi:     bepObj.produksi      || 0,
    targetProfit: bepObj.target_profit || 0,
    keberhasilan: bepObj.keberhasilan  || 100,
    hariKerja:    bepObj.hari_kerja    || 20,
    produk:       bepObj.produk        || "maggot_segar",
    equipment:    bepObj.equipment     || {},
    fc_groups:    bepObj.fc_groups     || {},
    vc_groups:    bepObj.vc_groups     || {},
    updatedAt:    Date.now()
  };
  getUserRef("bep").set(payload).catch(e => console.warn("saveBEPToFirebase error:", e));
  
  // Sync BEP ke Supabase
  if (typeof sbSaveBEP === "function") sbSaveBEP(payload);

  // Setelah BEP tersimpan, hitung dan simpan profit hari ini
  autoSavePendapatanHarian(payload);
}

/* ============================================================
   TASK 4 – AUTO SAVE PENDAPATAN HARIAN
   profit = (produksi * hargaJual) - (fixedCost + variableCost * produksi)
   ============================================================ */
function autoSavePendapatanHarian(bepPayload) {
  if (!currentUserId) return;

  // Ambil produksi hari ini dari produksiData global
  // [FIX 3.4] pakai tanggal lokal (WIB), bukan UTC — sebelumnya antara 00:00–06:59 WIB
  // kunci ini menunjuk ke tanggal kemarin, sehingga tercatat sebagai hari yang salah.
  const today = getLocalDateISO();

  // [FIX 8.2] Sebelumnya, bila belum ada produksi tercatat untuk hari ini,
  // Q jatuh ke bepPayload.produksi — yaitu produksi BULANAN dari getBEPData()
  // (lihat computeQ() di app.js, hasilnya per bulan). Akibatnya catatan
  // "pendapatanHarian/<hari ini>" bisa berisi profit satu bulan penuh, bukan
  // satu hari. Sekarang: hanya hitung & simpan profit harian bila memang ada
  // produksi tercatat pada tanggal ini. Bila belum ada, jangan menulis
  // record yang menyesatkan — cukup lewati sampai ada data produksi hari itu.
  if (typeof produksiData === "undefined" || produksiData[today] === undefined) {
    return;
  }
  const produksiHariIni = produksiData[today];

  const P        = bepPayload.hargaJual    || 0;
  const FCBulan  = bepPayload.fixedCost    || 0; // biaya tetap PER BULAN (lihat computeFCGroups())
  const VC       = bepPayload.variableCost || 0; // biaya variabel PER KG (sudah harian secara alami)
  const Q        = produksiHariIni;

  // [FIX 8.2] FC dari getBEPData() adalah biaya tetap per bulan, sedangkan
  // catatan ini adalah profit satu hari. Sebelumnya seluruh FC bulanan
  // dibebankan ke produksi satu hari (modal = FC + VC×Q), sehingga profit
  // harian nyaris selalu sangat negatif. Sekarang FC dibagi rata dengan
  // jumlah hari kerja per bulan (field "Hari Kerja/Bulan" di halaman BEP,
  // default 20 hari bila belum diisi pengguna) untuk mendapat porsi FC harian.
  const hariKerja = (bepPayload.hariKerja && bepPayload.hariKerja > 0) ? bepPayload.hariKerja : 20;
  const fcHarian  = FCBulan / hariKerja;

  const revenue = P * Q;
  const modal   = fcHarian + (VC * Q);
  const profit  = revenue - modal;

  if (Q <= 0 || P <= 0) return; // [FIX #4] OR bukan AND: jangan simpan jika salah satu (produksi atau harga) nol

  getUserRef("pendapatanHarian/" + today).set({
    profit:   Math.round(profit),
    revenue:  Math.round(revenue),
    modal:    Math.round(modal),
    // [FIX 8.2] disimpan agar terlihat berapa porsi FC bulanan yang
    // dibebankan ke hari ini (transparansi, memudahkan audit angka).
    fixedCostHarian: Math.round(fcHarian),
    produksi: Q,
    tanggal:  today,
    updatedAt: Date.now()
  }).catch(e => console.warn("autoSavePendapatanHarian error:", e));
  
  // Sync pendapatan ke Supabase juga (throttled via saveBEP guard)
  if (typeof sbSavePendapatan === "function") {
    sbSavePendapatan(today, { revenue, modal, profit, produksi: Q });
  }
}

/* ============================================================
   TASK 6 & 7 – PROFILE IMAGE & WALLPAPER (URL-BASED, NO STORAGE)
   ============================================================ */
function saveProfileImageUrl(url) {
  if (!currentUserId) return;
  // Normalize imgur URL before validation and saving
  const clean = _normalizeImgurUrl((url || "").trim());
  if (clean && !isValidImageUrl(clean)) {
    if (typeof showToast === "function") {
      // Improved error message untuk Imgur gallery/album
      if (clean.includes('/gallery/') || clean.includes('/a/') || clean.includes('/r/')) {
        showToast("⚠️ Gunakan URL direct image (i.imgur.com/xxx.jpg), bukan gallery");
      } else {
        showToast("⚠️ URL gambar tidak valid");
      }
    }
    return;
  }
  getUserRef("profileImageUrl").set(clean || null).then(() => {
    applyProfileImage(clean);
    if (typeof showToast === "function")
      showToast(clean ? "✅ Foto profil diperbarui" : "✅ Foto dikembalikan ke default");
  }).catch(e => console.warn("saveProfileImageUrl error:", e));
}

function saveWallpaperUrl(url) {
  if (!currentUserId) return;
  // Normalize imgur URL (e.g. imgur.com/HASH → i.imgur.com/HASH.jpg)
  const raw   = (url || "").trim();
  const clean = (raw.startsWith("linear-gradient") || raw.startsWith("radial-gradient"))
    ? raw                       // CSS gradient — jangan dinormalisasi
    : _normalizeImgurUrl(raw);  // URL gambar — normalisasi imgur
  getUserRef("wallpaperUrl").set(clean || null).then(() => {
    applyWallpaper(clean);
    if (typeof showToast === "function")
      showToast(clean ? "✅ Wallpaper diperbarui" : "✅ Wallpaper dikembalikan ke default");
  }).catch(e => console.warn("saveWallpaperUrl error:", e));
}

function isValidImageUrl(url) {
  if (!url) return false;
  const v = url.trim();
  // Terima: CSS gradient, data URI, http/https URL
  if (v.startsWith("linear-gradient") || v.startsWith("radial-gradient")) return true;
  if (v.startsWith("data:image")) return true;
  
  // IMGUR FIX: Reject gallery/album URLs (hanya terima direct image URLs)
  if (v.includes('imgur.com/gallery/') || 
      v.includes('imgur.com/a/') ||
      v.includes('imgur.com/r/')) {
    return false;  // ❌ Gallery/album URL tidak didukung
  }
  
  // IMGUR FIX: Hanya terima i.imgur.com untuk direct image hosting
  if (v.includes('imgur.com') && !v.includes('i.imgur.com')) {
    // Allow imgur.com/HASH format (akan dinormalisasi ke i.imgur.com)
    // Tapi reject imgur.com/gallery/ atau path panjang lainnya
    try {
      const testUrl = new URL(v);
      if (testUrl.hostname === 'imgur.com') {
        const pathParts = testUrl.pathname.split('/').filter(Boolean);
        // Allow only: imgur.com/HASH atau imgur.com/HASH.ext
        if (pathParts.length !== 1) return false;
      }
    } catch { return false; }
  }
  
  try {
    const u = new URL(v);
    return ["http:", "https:"].includes(u.protocol);
  } catch { return false; }
}

function _normalizeImgurUrl(url) {
  // Imgur hotlink fix: ensure URL uses i.imgur.com direct format
  if (!url) return url;
  try {
    const u = new URL(url);
    if (u.hostname === 'imgur.com') {
      const parts = u.pathname.split('/').filter(Boolean);
      if (parts.length === 1) {
        const id = parts[0].split('.')[0];
        return 'https://i.imgur.com/' + id + '.jpg';
      }
    }
    return url;
  } catch(e) { return url; }
}

function applyProfileImage(url) {
  const DEFAULT_SVG = '<svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="22" cy="22" r="22" fill="#064E3B"/><circle cx="22" cy="17" r="8" fill="#22C55E"/><ellipse cx="22" cy="36" rx="13" ry="9" fill="#22C55E"/></svg>';

  // Normalize imgur URLs (fix hotlink format) before applying
  const raw = _normalizeImgurUrl((url || "").trim());
  const isValid = raw && (
    raw.startsWith("https://") ||
    raw.startsWith("http://") ||
    (raw.startsWith("data:image") && raw.length < 2800000)
  );

  // referrerpolicy="no-referrer" is CRITICAL for Imgur & other hotlink-protected hosts.
  // Without it, the browser sends the app domain as Referer -> 403 Forbidden on Imgur.
  // 
  // CORS FIX: crossorigin="anonymous" DIHAPUS karena memicu CORS preflight check
  // yang akan GAGAL untuk Imgur (Access-Control-Allow-Origin hanya imgur.com).
  // Tanpa crossorigin, browser load image sebagai simple request (no CORS check).
  const IMG_ATTRS = 'referrerpolicy="no-referrer"';

  // [FIX SEDANG #4] HTML-escape URL sebelum dimasukkan ke innerHTML
  // mencegah XSS jika data Firebase berisi karakter berbahaya (" < > &)
  function _htmlEscapeUrl(s) {
    return (s || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  const safeRaw = _htmlEscapeUrl(raw);

  // logoInner (profil-page circle avatar)
  const logoInner = document.getElementById("logoInner");
  if (logoInner) {
    if (isValid) {
      const escapedSVG = DEFAULT_SVG.replace(/"/g, "'");
      const img = document.createElement("img");
      img.src = raw; // src via DOM property — tidak perlu escape, browser handles it
      img.setAttribute("referrerpolicy", "no-referrer");
      img.style.cssText = "width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;";
      img.onerror = function() {
        logoInner.innerHTML = DEFAULT_SVG;
        // [FIX RENDAH #3] Notifikasi ke user saat foto gagal load
        if (typeof showToast === "function") showToast("⚠️ Foto profil gagal dimuat. Coba URL lain.");
      };
      logoInner.innerHTML = "";
      logoInner.appendChild(img);
    } else {
      logoInner.innerHTML = DEFAULT_SVG;
    }
  }

  // nav-ava (home-page mini avatar top-right)
  const navAva = document.querySelector("#home-page .nav-ava");
  if (navAva) {
    if (isValid) {
      const navImg = document.createElement("img");
      navImg.src = raw;
      navImg.setAttribute("referrerpolicy", "no-referrer");
      navImg.style.cssText = "width:24px;height:24px;border-radius:50%;object-fit:cover;";
      navImg.onerror = function() { navImg.style.display = "none"; };
      navAva.innerHTML = "";
      navAva.appendChild(navImg);
    } else {
      navAva.innerHTML = '<svg width="24" height="24" viewBox="0 0 44 44" fill="none"><circle cx="22" cy="22" r="22" fill="#064E3B"/><circle cx="22" cy="17" r="8" fill="#22C55E"/><ellipse cx="22" cy="36" rx="13" ry="9" fill="#22C55E"/></svg>';
    }
  }

  // Sync ke profile object
  if (typeof profile !== "undefined") {
    profile.fotoDataURL = isValid ? raw : null;
  }

  // Legacy img elements — tambahkan referrerpolicy agar Imgur tidak 403
  // CORS FIX: crossorigin DIHAPUS untuk avoid CORS error
  ["fotoHome", "profilePreview"].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) {
      el.src = isValid ? raw : "";
      if (isValid) {
        el.setAttribute('referrerpolicy', 'no-referrer');
        // crossorigin='anonymous' DIHAPUS — tidak diperlukan & memicu CORS error
      }
    }
  });

  // Persist ke localStorage — URL cloud (normalized), hapus base64 lama
  try {
    if (isValid && raw.startsWith("http")) {
      localStorage.setItem("foto", raw);
    } else if (!isValid) {
      localStorage.removeItem("foto");
    }
  } catch(e) {}
}
function applyWallpaper(url) {
  const wallEl = document.getElementById("wallpaperEl");
  if (!wallEl) return;

  // Normalize imgur URLs before applying as wallpaper
  const val = _normalizeImgurUrl((url || "").trim());

  if (!val) {
    // Default: kosong -> pakai CSS variable, pastikan animasi aktif kembali
    wallEl.classList.remove("has-image");
    const oldImg2 = wallEl.querySelector('img.wallpaper-img-overlay');
    if (oldImg2) oldImg2.remove();
    wallEl.style.backgroundImage = "";
    wallEl.style.background      = "var(--bar-grad)";
  } else if (val.startsWith("linear-gradient") || val.startsWith("radial-gradient")) {
    // CSS gradient dari swatch color picker — animasi aktif, bukan gambar
    wallEl.classList.remove("has-image");
    const oldImg3 = wallEl.querySelector('img.wallpaper-img-overlay');
    if (oldImg3) oldImg3.remove();
    wallEl.style.background      = val;
    wallEl.style.backgroundImage = val;
  } else {
    // URL gambar — gunakan <img> overlay dengan referrerpolicy agar Imgur tidak 403.
    wallEl.style.backgroundImage = "";

    // BACKGROUND FIX: Set transparent + tambah class has-image agar
    // animasi wallpaperHue dan pseudo-element ::before/::after dimatikan via CSS
    wallEl.style.background = "transparent";
    wallEl.classList.add("has-image");

    // Hapus img overlay lama jika ada
    const oldImg = wallEl.querySelector('img.wallpaper-img-overlay');
    if (oldImg) oldImg.remove();

    // Buat img overlay baru dengan referrerpolicy
    const img = document.createElement('img');
    img.className   = 'wallpaper-img-overlay';
    img.src         = val;
    img.setAttribute('referrerpolicy', 'no-referrer');
    img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:inherit;pointer-events:none;';
    img.onerror = function() {
      // Fallback ke gradient HANYA jika gambar gagal load — hapus has-image dulu
      img.remove();
      wallEl.classList.remove("has-image");
      wallEl.style.background = "var(--bar-grad)";
      if (typeof showToast === "function") {
        showToast("⚠️ Wallpaper gagal dimuat. Mungkin Imgur sedang dibatasi — coba lagi nanti.");
      }
      console.warn('[applyWallpaper] Gagal load gambar wallpaper:', val);
    };

    // wallEl harus position:relative agar overlay berfungsi
    if (getComputedStyle(wallEl).position === 'static') {
      wallEl.style.position = 'relative';
    }
    wallEl.style.overflow = 'hidden';
    wallEl.insertBefore(img, wallEl.firstChild);
  }
}

/* ============================================================
   TASK 8 – PREFERENCES SYNC
   Simpan theme, language, satuan ke /users/{uid}/preferences
   ============================================================ */
function savePreferencesToFirebase(prefs) {
  if (!currentUserId) return;
  const payload = {
    language:        prefs.language        || localStorage.getItem("lang")            || "id",
    satuan:          prefs.satuan          || localStorage.getItem("unit")            || "metric",
    notifEnabled:    prefs.notifEnabled    !== undefined ? prefs.notifEnabled    : (localStorage.getItem("notifEnabled")    !== "0"),
    saveDataEnabled: prefs.saveDataEnabled !== undefined ? prefs.saveDataEnabled : (localStorage.getItem("saveDataEnabled") !== "0"),
    updatedAt:       Date.now()
  };
  getUserRef("preferences").set(payload)
    .catch(e => console.warn("savePreferencesToFirebase error:", e));

  // Sync preferences ke Supabase juga (tema/bahasa/satuan di user_profiles)
  if (typeof sbSaveProfile === "function") {
    sbSaveProfile({
      bahasa: payload.language,
      satuan: payload.satuan,
    });
  }
}

function loadPreferencesFromFirebase(uid) {
  if (!uid) return;
  getUserRef("preferences").once("value", (snap) => {
    const p = snap.val();
    if (!p) return;
    // Language
    if (p.language) {
      localStorage.setItem("lang", p.language);
      if (typeof GlobalState !== "undefined" && typeof GlobalState.setLanguage === "function") {
        GlobalState.setLanguage(p.language);
      } else if (typeof applyI18n === "function") {
        applyI18n();
      }
    }
    // Satuan
    if (p.satuan) {
      const unitVal = p.satuan === "imperial" ? "imperial" : "metric";
      localStorage.setItem("unit", unitVal);
      if (typeof GlobalState !== "undefined" && typeof GlobalState.setUnit === "function") {
        GlobalState.setUnit(unitVal);
      }
    }
    // Notifikasi toggle
    if (p.notifEnabled !== undefined) {
      localStorage.setItem("notifEnabled", p.notifEnabled ? "1" : "0");
      const toggleNotifEl = document.getElementById("toggleNotif");
      if (toggleNotifEl) {
        toggleNotifEl.classList.toggle("on",  p.notifEnabled);
        toggleNotifEl.classList.toggle("off", !p.notifEnabled);
      }
    }
    // Simpan data toggle
    if (p.saveDataEnabled !== undefined) {
      localStorage.setItem("saveDataEnabled", p.saveDataEnabled ? "1" : "0");
      const toggleLocalEl  = document.getElementById("toggleLocal");
      const toggleStatusEl = document.getElementById("toggleLocalStatus");
      if (toggleLocalEl) {
        toggleLocalEl.classList.toggle("on",  p.saveDataEnabled);
        toggleLocalEl.classList.toggle("off", !p.saveDataEnabled);
      }
      if (toggleStatusEl) {
        toggleStatusEl.textContent = p.saveDataEnabled
          ? (currentLang === "en" ? "Active"   : "Aktif")
          : (currentLang === "en" ? "Inactive" : "Nonaktif");
      }
    }
    console.log("✓ Preferences loaded from Firebase:", p);
  });
}

/* ============================================================
   LOAD IMAGE URLS FROM FIREBASE ON LOGIN
   ============================================================ */
function loadProfileImages(uid) {
  if (!uid) return;

  // [FIX TINGGI #1] Gunakan Promise.all agar renderProfile() hanya dipanggil
  // SETELAH kedua query Firebase (foto + wallpaper) selesai — cegah visual flash.
  let _fotoLoaded = false;
  let _wpLoaded   = false;

  function _checkBothLoaded() {
    if (_fotoLoaded && _wpLoaded) {
      // Kedua data sudah tiba — panggil hook profil-page jika tersedia
      if (typeof window._onProfileImagesLoaded === "function") {
        window._onProfileImagesLoaded();
      }
    }
  }

  getUserRef("profileImageUrl").once("value", snap => {
    const firebaseUrl = snap.val();
    if (firebaseUrl) {
      applyProfileImage(firebaseUrl);
    } else {
      const localFoto = localStorage.getItem("foto");
      if (localFoto) {
        if (localFoto.startsWith("data:") && localFoto.length > 2800000) {
          try { localStorage.removeItem("foto"); } catch(e) {}
          applyProfileImage("");
        } else {
          applyProfileImage(localFoto);
        }
      } else {
        applyProfileImage("");
      }
    }
    _fotoLoaded = true;
    _checkBothLoaded();
  });

  getUserRef("wallpaperUrl").once("value", snap => {
    const firebaseWp = snap.val();
    if (firebaseWp) {
      applyWallpaper(firebaseWp);
      // [FIX #5] Sync ke objek profile agar modal wallpaper tampilkan swatch yang benar
      if (typeof profile !== "undefined") {
        const isGradient = firebaseWp.startsWith("linear-gradient") || firebaseWp.startsWith("radial-gradient");
        if (isGradient) {
          profile.wallpaperImage = null;
          if (typeof wallpapers !== "undefined") {
            const idx = wallpapers.indexOf(firebaseWp);
            profile.wallpaperIdx = idx >= 0 ? idx : 0;
          }
        } else {
          profile.wallpaperImage = firebaseWp;
          profile.wallpaperIdx   = -1;
        }
      }
    } else {
      const localWp = localStorage.getItem("wallpaperUrl");
      applyWallpaper(localWp || "");
    }
    _wpLoaded = true;
    _checkBothLoaded();
  });
}

/* ============================================================
   LOAD BEP FROM FIREBASE ON LOGIN
   ============================================================ */
function loadBEPFromFirebase() {
  if (!currentUserId) return;
  getUserRef("bep").once("value", (snap) => {
    const d = snap.val();
    if (!d) return;
    // Sync ke localStorage agar getBEPData() tetap bekerja
    const bepObj = {
      harga_jual:     d.hargaJual    || 0,
      biaya_tetap:    d.fixedCost    || 0,
      biaya_variabel: d.variableCost || 0,
      produksi:       d.produksi     || 0,
      target_profit:  d.targetProfit || 0,
      keberhasilan:   d.keberhasilan || 100,
      produk:         d.produk       || "maggot_segar",
      equipment:      d.equipment    || {},
      fc_groups:      d.fc_groups    || {},
      vc_groups:      d.vc_groups    || {}
    };
    try { localStorage.setItem("bep_data", JSON.stringify(bepObj)); } catch(e) {}
    if (d.hargaJual)    localStorage.setItem("bepP",  d.hargaJual);
    if (d.fixedCost)    localStorage.setItem("bepFC", d.fixedCost);
    if (d.variableCost) localStorage.setItem("bepVC", d.variableCost);

    if (typeof loadBEPInputs === "function") loadBEPInputs();
    console.log("✓ BEP loaded from Firebase");
  });
}

// On load — check for any unsent offline data
window.addEventListener("load", () => {
  setTimeout(() => {
    const pending     = getPendingData("produksiPending");
    const userPending = pending.filter(item => item._userId === currentUserId);

    if (userPending.length > 0) {
      console.log(`Found ${userPending.length} pending records for current user`);
      if (navigator.onLine && currentUserId) {
        console.log("Online — attempting to sync…");
        setTimeout(() => syncOfflineData(), 2000);
      } else {
        showToast(
          currentLang === "en"
            ? `📴 ${userPending.length} records waiting to sync`
            : `📴 ${userPending.length} data menunggu sinkronisasi`
        );
      }
    }
  }, 3000);  // Wait for auth state to resolve first
});

// Pending badge indicator (refreshes every 5 s)
function showPendingDataBadge() {
  // [FIX #8] Jangan proses jika user belum login — currentUserId masih null
  if (!currentUserId) return;
  const pending     = getPendingData("produksiPending");
  const userPending = pending.filter(item => item._userId === currentUserId);
  const badge       = document.getElementById("pendingDataBadge");
  if (badge) {
    if (userPending.length > 0) {
      badge.innerText      = userPending.length;
      badge.style.display  = "flex";
    } else {
      badge.style.display = "none";
    }
  }
}
setInterval(showPendingDataBadge, 5000);

/* ============================================================
   REALTIME IoT LISTENER – /users/{uid}/iot  (STEP 5 / STEP 7)
   Only started after currentUserId is set (called from auth.js).
   ============================================================ */
let lastArus = 0, lastProduksi = 0;

function initializeIoTListener() {
  if (!currentUserId) {
    console.warn("⚠ initializeIoTListener() called before user is set — skipping.");
    return;
  }

  // STEP 5: uses getUserRef — maps to /users/{uid}/iot
  const _iotRef = getUserRef("iot");
  _iotRef.on("value", (snap) => {
    const d = snap.val();
    if (!d) return;

    const p    = d.produksi || 0;
    const daya = d.daya     || 0;
    const arus = d.arus     || 0;

    lastArus     = arus;
    lastProduksi = p;

    const isImperial  = currentUnit === "imperial";
    const KG_TO_LB    = 2.20462;
    const displayP    = isImperial ? Math.round(p * KG_TO_LB * 100) / 100 : p;

    const prod2 = document.getElementById("prod2");
    if (prod2) {
      prod2.setAttribute("data-kg-raw", p);
      prod2.innerText = isImperial ? displayP + " lb" : p + " kg";
    }

    const prod3 = document.getElementById("prod3");
    if (prod3) {
      prod3.setAttribute("data-kg-raw", p);
      prod3.innerText = isImperial ? displayP + " lb" : p + " kg";
    }

    const kecepatan    = p / 2;
    const displaySpeed = isImperial
      ? Math.round(kecepatan * KG_TO_LB * 100) / 100
      : parseFloat(kecepatan.toFixed(1));

    const speed2 = document.getElementById("speed2");
    if (speed2) {
      speed2.setAttribute("data-raw", kecepatan.toFixed(1));
      speed2.innerText = formatAngka(displaySpeed);
    }

    const arusFill = document.getElementById("arusFill");
    const dayaFill = document.getElementById("dayaFill");
    if (arusFill) arusFill.style.width = Math.min(arus * 10, 100) + "%";
    if (dayaFill) dayaFill.style.width = Math.min(daya / 5, 100) + "%";

    const kwh      = parseSanitized(localStorage.getItem("kwh") || "1500") || 1500;
    const biayaVal = (Number(daya) / 1000) * kwh || 0;
    const biaya    = document.getElementById("biaya");
    if (biaya) biaya.innerText = "Rp " + formatTitik(Math.round(biayaVal));

    // Use real harga jual from BEP data (localStorage), not hardcoded
    const hargaJual = parseFloat(localStorage.getItem("bepP")) || parseFloat(localStorage.getItem("hargaJual_maggot_segar")) || 0;
    const profit    = (Number(p) * hargaJual) - biayaVal;

    const profitEl = document.getElementById("profit");
    if (profitEl) {
      const bepPSaved = parseFloat(localStorage.getItem("bepP")) || 0;
      if (bepPSaved <= 0) {
        profitEl.innerText   = formatRupiah(isNaN(profit) ? 0 : Math.floor(profit));
        profitEl.style.color = "white";
      }
    }

    const bepEl = document.getElementById("bepStatus");
    if (bepEl) {
      const bepPSaved  = parseFloat(localStorage.getItem("bepP")) || 0;
      if (bepPSaved <= 0) {
        const modalAwal = parseSanitized(localStorage.getItem("modal") || "100000") || 100000;
        if (!isNaN(profit) && profit >= modalAwal) {
          bepEl.innerText   = currentLang === "en" ? "Capital Recovered (BEP Achieved)" : "Modal Kembali (BEP Tercapai)";
          bepEl.className   = "bep-box bep-yes";
        } else {
          bepEl.innerText   = currentLang === "en" ? "Capital Not Yet Recovered" : "Modal Belum Kembali";
          bepEl.className   = "bep-box bep-no";
        }
      }
    }

    // [FIX RENDAH #1] Ganti 'history' → 'chartHistory' agar tidak konflik dengan window.history (Web Navigation API)
    if (!isNaN(profit) && typeof chartHistory !== "undefined") {
      chartHistory.shift();
      chartHistory.push(profit);
    }
    if (typeof barChart !== "undefined" && typeof lineChart !== "undefined" && barChart && lineChart) {
      barChart.data.datasets[0].data = chartHistory;
      barChart.update();
      lineChart.data.datasets[0].data = chartHistory;
      lineChart.data.datasets[1].data = new Array(chartHistory.length).fill(
        parseSanitized(localStorage.getItem("modal") || "100000") || 100000
      );
      lineChart.update();
    }

    updateMotorStatus(arus);

    const arusText = document.getElementById("arusText");
    const dayaText = document.getElementById("dayaText");
    if (arusText) arusText.innerText = formatTitik(arus.toFixed(2)) + " A";
    if (dayaText) dayaText.innerText = formatTitik(daya.toFixed(0)) + " W";

    renderProduksiProgress(p);

    // Legacy totalKg (guarded)
    const tkEl = document.getElementById("totalKg");
    if (tkEl && typeof produksiData !== "undefined") {
      const total = Object.values(produksiData).reduce((a, b) => a + b, 0);
      tkEl.setAttribute("data-kg-raw", total);
      tkEl.innerText = isImperial ? Math.round(total * KG_TO_LB) : Math.round(total);
    }
    // New home-page stat card #sv1
    const sv1El = document.getElementById("sv1");
    if (sv1El && typeof produksiData !== "undefined") {
      const total = Object.values(produksiData).reduce((a, b) => a + b, 0);
      const displayed = Number(isImperial ? Math.round(total * KG_TO_LB) : Math.round(total)) || 0;
      sv1El.innerHTML = displayed + '<span class="stat-unit">' + (isImperial ? "lb" : "kg") + "</span>";
    }
  });
  // Register so it is cleaned up on logout
  if (typeof registerListener === "function") registerListener(_iotRef, "value");
}

/* ============================================================
   MOTOR STATUS INDICATOR
   ============================================================ */
function updateMotorStatus(arus) {
  const indDiam   = document.getElementById("indDiam");
  const indNormal = document.getElementById("indNormal");
  const indBahaya = document.getElementById("indBahaya");
  const statusArus = document.getElementById("statusArus");

  [indDiam, indNormal, indBahaya].forEach(el => { if (el) el.className = "motor-status-item"; });

  if (arus > 1) {
    if (indBahaya)  indBahaya.classList.add("active-bahaya");
    if (statusArus) statusArus.innerText = "Motor Bahaya";
  } else if (arus > 0) {
    if (indNormal)  indNormal.classList.add("active-normal");
    if (statusArus) statusArus.innerText = "Motor Normal";
  } else {
    if (indDiam)    indDiam.classList.add("active-diam");
    if (statusArus) statusArus.innerText = "Motor Diam";
  }
}

/* ============================================================
   PRODUKSI PROGRESS BAR
   ============================================================ */
function renderProduksiProgress(p) {
  p = p !== undefined
    ? p
    : parseInt(
        document.getElementById("prod2")?.getAttribute("data-kg-raw") ||
        document.getElementById("prod2")?.innerText || "0"
      );

  const target     = parseInt(localStorage.getItem("targetProduksi")) || 200;
  const pct        = Math.min(p / target * 100, 100);
  const isImperial = typeof currentUnit !== "undefined" && currentUnit === "imperial";

  // Legacy elements (guarded)
  const fill  = document.getElementById("prodProgressFill");
  const pctEl = document.getElementById("prodProgressPct");
  const tl    = document.getElementById("prodTargetLabel");
  if (fill)  fill.style.width = pct + "%";
  if (pctEl) pctEl.innerText  = Math.round(pct) + "%";
  if (tl)    tl.innerText     = isImperial
    ? formatTitik(Math.round(target * 2.20462)) + " lb"
    : formatTitik(target) + " kg";

  // New home-page progress bar (#phFill, #phPct, #phLeft)
  const phFill = document.getElementById("phFill");
  if (phFill)  phFill.style.width = pct + "%";
  const phPct  = document.getElementById("phPct");
  if (phPct)   phPct.textContent  = Math.round(pct) + "%";
  const phLeft = document.getElementById("phLeft");
  if (phLeft)  phLeft.textContent = (isImperial ? Math.round(p * 2.20462) : Math.round(p)) + (isImperial ? " lb" : " kg") + " terkumpul";

  // New produksi-page scorecard (#scbNum, #thickFill)
  const scbNum = document.getElementById("scbNum");
  if (scbNum)  scbNum.innerHTML = (Number(isImperial ? Math.round(p * 2.20462) : p) || 0) + '<span class="scb-unit"> ' + (isImperial ? "lb" : "kg") + "</span>";
  const thickFill = document.getElementById("thickFill");
  if (thickFill) thickFill.style.width = pct + "%";
  const scbPct = document.getElementById("scbPctCircle");
  if (scbPct)  { scbPct.textContent = Math.round(pct) + "%"; }
}

/* ============================================================
   SLIDER LISTENER – /users/{uid}/control/vibrator  (STEP 5)
   ============================================================ */
function initializeSliderListener() {
  if (!currentUserId) {
    console.warn("⚠ initializeSliderListener() called before user is set — skipping.");
    return;
  }

  // STEP 5: uses getUserRef — maps to /users/{uid}/control/vibrator
  const _sliderRef = getUserRef("control/vibrator");
  _sliderRef.on("value", (snap) => {
    const val = snap.val();
    if (val == null) return;
    const sl = document.getElementById("slider");
    if (sl) sl.value = val;
  });
  // Register so it is cleaned up on logout
  if (typeof registerListener === "function") registerListener(_sliderRef, "value");
}

/* ============================================================
   SIMPAN PRODUKSI – /users/{uid}/produksiHarian  (STEP 5)
   ============================================================ */
async function simpanProduksi() {
  // Legacy function — #inputKg and #tanggal are from old pages.
  // New home-page uses save() in inline script with #ceIn instead.
  const inputKg  = document.getElementById("inputKg");
  const tanggal  = document.getElementById("tanggal");
  // New home-page elements as fallback
  const ceIn     = document.getElementById("ceIn");
  const activeKgEl  = inputKg || ceIn;
  const activeTglEl = tanggal;

  if (!activeKgEl) {
    console.warn("simpanProduksi: no input element found — use save() for new UI");
    return;
  }

  const inputVal = parseFloat(activeKgEl.value);
  const tgl      = activeTglEl ? activeTglEl.value : (typeof hp_selKey !== "undefined" ? hp_selKey : "");
  const isImperial = currentUnit === "imperial";

  if (!inputVal || !tgl) {
    showToast(
      currentLang === "en"
        ? "Please select a date and enter amount"
        : "Pilih tanggal dan isi jumlah dulu"
    );
    return;
  }

  const kgToStore  = isImperial ? inputVal / 2.20462 : inputVal;
  const dataToSave = { kg: kgToStore, timestamp: Date.now(), tanggal: tgl };

  // getUserRef("produksiHarian") → /users/{uid}/produksiHarian
  const result = await saveWithRetry(getUserRef("produksiHarian"), dataToSave);

  if (result.success || result.savedLocally) {
    // [FIX 3.6] #inputKg tidak ada di HTML baru; memakainya langsung akan
    // melempar TypeError bila fungsi ini dipanggil lewat #ceIn (UI baru).
    // Pakai activeKgEl (elemen yang benar-benar dipakai) agar aman untuk keduanya.
    activeKgEl.value = "";
    const arrow   = document.getElementById("calArrow");
    if (arrow) {
      if (result.success) {
        arrow.innerHTML   = '<img src="tabler-icon/circle-check.svg" class="icon-svg" alt="" /> ' + (currentLang === "en" ? "Data saved!" : "Data disimpan!");
        arrow.className   = "cal-arrow-indicator green-arrow";
      } else if (result.savedLocally) {
        arrow.innerHTML   = '<img src="tabler-icon/antenna.svg" class="icon-svg" alt="" /> ' + (currentLang === "en" ? "Saved locally" : "Disimpan lokal");
        arrow.className   = "cal-arrow-indicator orange-arrow";
      }
    }
    // Sync produksi ke Supabase
    if (typeof sbSaveProduksi === "function") {
    sbSaveProduksi(tgl, kgToStore, "manual");
}
    showPendingDataBadge();
  }
}

/* [Tahap 8] downloadPDF() (versi lama, membaca #tanggal yang tidak ada) dan cekExpired()
   (tidak pernah dipanggil) dihapus. Unduh laporan memakai dlPDF() di Index_INTEGRATED.html. */

/* ============================================================
   AUTO DELETE > 5 DAYS – /users/{uid}/produksiHarian  (STEP 5)
   ============================================================ */
function autoDelete() {
  if (!currentUserId) return;

  const now = Date.now();
  getUserRef("produksiHarian").once("value", (snap) => {
    const data = snap.val();
    if (!data) return;
    Object.keys(data).forEach(key => {
      if ((now - data[key].timestamp) > 5 * 24 * 60 * 60 * 1000) {
        getUserRef("produksiHarian/" + key).remove();
      }
    });
  });
}

/* ============================================================
   SUPABASE KEEP-ALIVE
   Ping Supabase setiap 6 hari agar free project tidak pause.
   Free projects pause setelah 7 hari tidak ada activity.
   ============================================================ */
(function initSupabaseKeepAlive() {
  const SIX_DAYS_MS = 6 * 24 * 60 * 60 * 1000;
  const STORAGE_KEY = "supabase_last_ping";

  async function pingSupabase() {
    if (typeof sbGetProduksiBulanan !== "function") return;
    try {
      await sbGetProduksiBulanan(1); // simple query — just keeps project awake
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
      console.log("[keep-alive] ✅ Supabase pinged successfully");
    } catch(e) {
      console.warn("[keep-alive] Supabase ping failed:", e);
    }
  }

  function scheduleKeepAlive() {
    const lastPing = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
    const now      = Date.now();
    const elapsed  = now - lastPing;

    if (elapsed >= SIX_DAYS_MS) {
      // Ping sekarang (sudah lewat 6 hari), lalu jadwalkan ulang tiap 6 hari
      setTimeout(() => {
        pingSupabase();
        // [FIX #3] setInterval hanya dibuat SATU kali di sini, bukan ganda
        setInterval(pingSupabase, SIX_DAYS_MS);
      }, 5000); // delay 5s agar Supabase client sudah init
    } else {
      // Jadwalkan ping saat interval tercapai
      const remaining = SIX_DAYS_MS - elapsed;
      setTimeout(() => {
        pingSupabase();
        // Setelah ping pertama, ulangi tiap 6 hari
        setInterval(pingSupabase, SIX_DAYS_MS);
      }, remaining);
    }
    // [FIX #3] Hapus: setInterval(pingSupabase, SIX_DAYS_MS) yang unconditional
    // — menyebabkan 2 interval berjalan bersamaan dan akumulasi tiap page refresh
  }

  // Jalankan setelah app init (tunggu auth ready)
  window.addEventListener("load", () => setTimeout(scheduleKeepAlive, 8000));
})();
