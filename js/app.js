/* ============================================================
   UNIT CONVERSION HELPER (metric base, display conversion)
   ============================================================ */
function kgDisplay(kg){
  if(typeof currentUnit !== "undefined" && currentUnit === "imperial"){
    return (Math.round(kg * 2.20462 * 100)/100) + " lb";
  }
  return (Math.round(kg * 100)/100) + " kg";
}
function kgVal(kg){
  if(typeof currentUnit !== "undefined" && currentUnit === "imperial"){
    return Math.round(kg * 2.20462 * 100)/100;
  }
  return Math.round(kg * 100)/100;
}
function kgUnit(){
  return (typeof currentUnit !== "undefined" && currentUnit === "imperial") ? "lb" : "kg";
}

/* ============================================================
   APP.JS – MAIN APPLICATION LOGIC
   Orchestrates all features. Depends on:
     - firebase-config.js
     - firebase-service.js
     - ui-controller.js
   ============================================================ */

/* ============================================================
   FEATURE CONFIGURATION – BEP Toggle
   ============================================================ */
const featureConfig = {
  bepEnabled: true  // Default: BEP feature is ON
};

/**
 * Load feature configuration from localStorage
 */
function loadFeatureConfig() {
  try {
    const saved = localStorage.getItem('feature_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      featureConfig.bepEnabled = parsed.bepEnabled !== undefined 
        ? parsed.bepEnabled 
        : true;
    }
  } catch (error) {
    console.warn('Failed to load feature config:', error);
    featureConfig.bepEnabled = true; // Default to ON on error
  }
}

/**
 * Save feature configuration to localStorage
 */
function saveFeatureConfig() {
  try {
    localStorage.setItem('feature_config', JSON.stringify(featureConfig));
  } catch (error) {
    console.error('Failed to save feature config:', error);
  }
}

/* ============================================================
   RESET (Atur Ulang)
   ============================================================ */
function confirmReset(){
  closeModal("modalReset");

  // ── Reset new-page scorecard (produksi-page) ──
  const scbNum = document.getElementById("scbNum");
  if(scbNum) scbNum.innerHTML = '0<span class="scb-unit"> kg</span>';
  const thickFill = document.getElementById("thickFill");
  if(thickFill) thickFill.style.width = "0%";
  const scbPct = document.getElementById("scbPctCircle");
  if(scbPct){ scbPct.textContent = "0%"; scbPct.style.color = "var(--g600)"; }

  // ── Reset home-page progress bar ──
  const phFill = document.getElementById("phFill");
  if(phFill) phFill.style.width = "0%";
  const phPct = document.getElementById("phPct");
  if(phPct) phPct.textContent = "0%";
  const phLeft = document.getElementById("phLeft");
  if(phLeft) phLeft.textContent = "0 kg terkumpul";

  // ── Legacy guards ──
  const pc = document.getElementById("progressCircle");
  if(pc) pc.style.strokeDashoffset = 440;
  const tk = document.getElementById("totalKg");
  if(tk) tk.innerText = "0";
  const fill = document.getElementById("prodProgressFill");
  if(fill) fill.style.width = "0%";
  const pct = document.getElementById("prodProgressPct");
  if(pct) pct.innerText = "0%";

  if(typeof updateCircle === "function") updateCircle(0);
  showToast(currentLang==="en" ? "Indicator successfully reset ✔" : "Indikator berhasil direset ✔");
}

function confirmResetCalendar(){
  closeModal("modalResetCalendar");
  const _ref = getUserRef("produksiHarian");
  if(!_ref){ showToast("⚠ Tidak bisa reset — user tidak login"); return; }
  _ref.remove().then(()=>{
    produksiData = {};
    calSelectedDate = null;

    // ── Reset new-page calendar inputs (home-page) ──
    const ceIn = document.getElementById("ceIn");
    if(ceIn) ceIn.value = "";

    // ── Refresh new-page calendar grid ──
    if(typeof window.hp_renderCal === "function") window.hp_renderCal();

    // ── Reset new-page produksi scorecard (produksi-page) ──
    const scbNum = document.getElementById("scbNum");
    if(scbNum) scbNum.innerHTML = '0<span class="scb-unit"> kg</span>';
    const thickFill = document.getElementById("thickFill");
    if(thickFill) thickFill.style.width = "0%";
    const tfLabel = document.getElementById("tfLabel");
    if(tfLabel) tfLabel.textContent = "";
    const scbPct = document.getElementById("scbPctCircle");
    if(scbPct){ scbPct.textContent = "0%"; scbPct.style.color = "var(--g600)"; }

    // ── Reset home-page progress bar ──
    const phFill = document.getElementById("phFill");
    if(phFill) phFill.style.width = "0%";
    const phPct = document.getElementById("phPct");
    if(phPct) phPct.textContent = "0%";
    const phLeft = document.getElementById("phLeft");
    if(phLeft) phLeft.textContent = "0 kg terkumpul";

    // ── Legacy element guards (may not exist) ──
    const pc = document.getElementById("progressCircle");
    if(pc) pc.style.strokeDashoffset = 440;
    const tk = document.getElementById("totalKg");
    if(tk){ tk.innerText = "0"; tk.removeAttribute("data-kg-raw"); }
    const fill = document.getElementById("prodProgressFill");
    if(fill) fill.style.width = "0%";
    const pctEl = document.getElementById("prodProgressPct");
    if(pctEl) pctEl.innerText = "0%";

    // ── Trigger full home-page refresh ──
    if(typeof window.refreshNewHomePage === "function") window.refreshNewHomePage();
    if(typeof updateCircle === "function") updateCircle(0);

    showToast(currentLang==="en" ? "Calendar data successfully reset ✔" : "Data kalender berhasil direset ✔");
  }).catch(()=>{
    showToast(currentLang==="en" ? "Reset failed, please try again." : "Reset gagal, coba lagi.");
  });
}



/* ============================================================
   INPUT VALIDATION (Perintah Tiga)
   ============================================================ */
function showErrorModal(titleKey, descKey){
  const S = STRINGS[currentLang];
  const titleText = S[titleKey] || "⚠ Input Tidak Valid";
  document.getElementById("errorModalTitle").innerHTML = titleText.startsWith("⚠")
    ? '<img src="tabler-icon/alert-circle.svg" class="icon-svg" alt="" /> ' + titleText.slice(1).trim()
    : titleText;
  document.getElementById("errorModalDesc").innerText = S[descKey] || "Silakan periksa kembali.";
  openModal("modalErrorInput");
  // Animate modal entry
  const box = document.querySelector(".error-modal-box");
  box.style.animation = "none";
  requestAnimationFrame(()=>{ box.style.animation = "slideUp 0.3s cubic-bezier(0.4,0,0.2,1)"; });
}

function validateProfilInputs(){
  const nama           = document.getElementById("namaInput").value.trim();
  const biopond        = document.getElementById("biopondInput").value.trim();
  const prodHarian     = document.getElementById("produksiHarianInput").value.trim();
  const target         = document.getElementById("targetInput").value.trim();
  // targetMingguan removed (cycle-based)

  // Nama: must not be purely numeric
  if(nama && /^\d+$/.test(nama)){
    document.getElementById("namaInput").classList.add("input-error");
    showErrorModal("error_nama","error_nama"); return false;
  }
  document.getElementById("namaInput").classList.remove("input-error");

  // Numeric fields
  const numericFields = [
    {val:biopond,        id:"biopondInput",        key:"error_biopond"},
    {val:prodHarian,     id:"produksiHarianInput", key:"error_produksi"},
    {val:target,         id:"targetInput",          key:"error_target"},
  ];
  for(const f of numericFields){
    if(f.val && isNaN(f.val.replace(",","."))){
      document.getElementById(f.id).classList.add("input-error");
      showErrorModal(f.key, f.key);
      return false;
    }
    document.getElementById(f.id).classList.remove("input-error");
  }
  return true;
}



/* ============================================================
   PROFIL SAVE / LOAD / RESET
   ============================================================ */
function loadProfilInputs(){
  document.getElementById("namaInput").value            = localStorage.getItem("nama")||"";
  document.getElementById("biopondInput").value         = localStorage.getItem("biopond")||"";
  document.getElementById("produksiHarianInput").value  = localStorage.getItem("produksiPerSiklus")||"";
  document.getElementById("targetInput").value          = localStorage.getItem("targetProduksi")||"";
  // Weekly target input removed (cycle-based)
  // document.getElementById("targetMingguanInput").value = localStorage.getItem("targetMingguan")||"";
  // Load BEP group inputs
  loadBEPProfilInputs();
}

function saveProfil(){
  if(!validateProfilInputs()) return;
  const isFirstTime = !localStorage.getItem("nama");
  if(!isFirstTime){
    openModal("modalEditProfil");
  } else {
    doSaveProfil();
  }
}

function doSaveProfil(){
  closeModal("modalEditProfil");
  const nama           = document.getElementById("namaInput").value;
  const biopond        = document.getElementById("biopondInput").value;
  const prodHarian     = document.getElementById("produksiHarianInput").value;
  const target         = document.getElementById("targetInput").value;
  // targetMingguan removed
  const targetMingguan = "";

  localStorage.setItem("nama", nama);
  localStorage.setItem("biopond", biopond);
  localStorage.setItem("produksiPerSiklus", prodHarian);
  if(target)         localStorage.setItem("targetProduksi", target);
  if(targetMingguan) localStorage.setItem("targetMingguan", targetMingguan);

  // Save all BEP group field values so they persist
  saveBEPFields();

  // Compute FC/VC totals from 4-group inputs and save
  onBEPGroupInput();

  // Save to Firebase setting node (UID-scoped)
  getUserRef("setting").set({
    nama, biopond, produksi:prodHarian,
    modal: "", listrik: "", watt: "", target
  });
  // Also sync profile node
  getUserRef("profile").update({ nama, biopond, produksiPerSiklus: prodHarian, targetProduksi: target });

  // Task 8: Sync preferences ke Firebase
  if (typeof savePreferencesToFirebase === "function") {
    savePreferencesToFirebase({
      language: localStorage.getItem("lang") || "id",
      satuan:   localStorage.getItem("unit")     || "metric"
    });
  }
  // Update UI — new profil-page uses #profileName
  const np = document.getElementById("namaProfil");        // legacy (may not exist)
  if(np) np.innerText = nama;
  const nph = document.getElementById("namaProfilHeader");  // legacy (may not exist)
  if(nph) nph.innerText = nama;
  const npNew = document.getElementById("profileName");     // new profil-page
  if(npNew) npNew.textContent = nama;
  // Also update the inline profile state object if present
  if(typeof profile !== "undefined") { profile.nama = nama; }
  const tpd = document.getElementById("targetProfilDisplay");
  if(tpd) tpd.innerText = formatTitik(parseInt(target)||200);
  const tmd = document.getElementById("targetMingguanDisplay");
  if(tmd) tmd.innerText = targetMingguan ? formatTitik(parseInt(targetMingguan)) : "-";

  const _tkEl = document.getElementById("totalKg");
  const currentTotal = _tkEl ? (parseInt(_tkEl.innerText) || 0) : 0;
  if (typeof updateCircle === "function") updateCircle(currentTotal);
  if (typeof renderProduksiProgress === "function") renderProduksiProgress(currentTotal);

  // Sync hidden BEP inputs and recalculate
  loadBEPInputs();

  // Update BEP visibility based on feature config
  updateBEPUI();

  showToast(currentLang==="en"?"Profile & BEP saved ✔":"Data profil & BEP tersimpan ✔");
    
  // Supabase Integrated
  if (typeof sbSaveProfile === "function") {
  sbSaveProfile({
    nama:         document.getElementById("namaInput")?.value           || "",
    biopond:      document.getElementById("biopondInput")?.value        || "",
    produksi:     document.getElementById("produksiHarianInput")?.value || "",
    target:       document.getElementById("targetInput")?.value         || "",
    bahasa:       localStorage.getItem("lang")         || "id",
    satuan:       localStorage.getItem("unit")         || "metric",
    fotoUrl:      localStorage.getItem("foto")         || null,
    wallpaperUrl: localStorage.getItem("wallpaperUrl") || null
  });
}
  showPage('profil-page');
}

function doResetProfil(){
  closeModal("modalResetProfil");
  ["nama","biopond","produksiPerSiklus","targetProduksi","targetMingguan"].forEach(k=>localStorage.removeItem(k));
  
  // Clear equipment list
  equipmentList = [];
  equipmentCounter = 0;
  localStorage.removeItem("bepField_equipmentList");
  renderEquipmentList();
  
  // Clear all BEP group fields from localStorage (new structure)
  ["biayaInfrastrukturInput","biayaListrikKandangInput","biayaTetapLainnyaInput",
   "vcPakanInput","vcOperasionalInput","vcUpahHarianInput","vcHariKerjaInput","vcVariabelLainnyaInput",
   "bepQProfilInput","bepSRProfilInput","bepTPProfilInput","bepHargaProfilInput"
  ].forEach(id=>localStorage.removeItem("bepField_"+id));
  
  ["bep_data","bepP","bepFC","bepVC"].forEach(k=>localStorage.removeItem(k));
  Object.keys(PRODUK_LIST).forEach(k=>localStorage.removeItem("hargaJual_"+k));

  loadProfilInputs();
  // Reset displayed values
  ["namaProfil","namaProfilHeader","biopond","prodHarian","targetProfilDisplay","targetMingguanDisplay"].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.innerText="-";
  });
  showToast(currentLang==="en"?"Profile reset ✔":"Profil telah direset ✔");
}

/* Firebase setting listener – UID-scoped, started after login */
function initializeSettingListener() {
  if (!currentUserId) return;
  const _settingRef = getUserRef("setting");
  _settingRef.on("value",(snap)=>{
    const d=snap.val();
    if(!d) return;
    const np=document.getElementById("namaProfil"); if(np) np.innerText=d.nama||"-";
    const nph=document.getElementById("namaProfilHeader"); if(nph) nph.innerText=d.nama||"Nama Usaha";
    // Sync to new profil-page #profileName
    const npNew=document.getElementById("profileName"); if(npNew) npNew.textContent=d.nama||"Usaha BSF";
    if(d.nama){ localStorage.setItem("nama",d.nama); if(typeof profile!=="undefined") profile.nama=d.nama; }
    const bpEl=document.getElementById("biopond"); if(bpEl) bpEl.innerText=d.biopond||0;
    const phEl=document.getElementById("prodHarian"); if(phEl) phEl.innerText=formatTitik(parseFloat(d.produksi||0));
    const maEl=document.getElementById("modalAwal"); if(maEl) maEl.innerText=formatTitik(parseSanitized(d.modal||0));
    const hlEl=document.getElementById("hargaListrik"); if(hlEl) hlEl.innerText=formatTitik(parseSanitized(d.listrik||0));
    const mwEl=document.getElementById("motorWatt"); if(mwEl) mwEl.innerText=formatTitik(parseSanitized(d.watt||0));
    const tpdEl=document.getElementById("targetProfilDisplay"); if(tpdEl) tpdEl.innerText=formatTitik(d.target||200);
    const tmdEl=document.getElementById("targetMingguanDisplay"); if(tmdEl) tmdEl.innerText=d.targetMingguan?formatTitik(d.targetMingguan):"-";
    if(d.target){
      localStorage.setItem("targetProduksi",d.target);
      const _isImp = GlobalState.unit === "imperial";
      const _tDisp = _isImp ? formatTitik(Math.round(d.target*2.20462))+" lb" : formatTitik(d.target)+" kg";
      const tl=document.getElementById("targetLabel"); if(tl) tl.innerText=_tDisp;
      const tpl=document.getElementById("prodTargetLabel"); if(tpl) tpl.innerText=_tDisp;
    }
    if(d.targetMingguan) localStorage.setItem("targetMingguan",d.targetMingguan);
  });
  // Register so it is cleaned up on logout
  if (typeof registerListener === "function") registerListener(_settingRef, "value");
}



/* ============================================================
   ON LOAD
   ============================================================ */
window.onload=function(){
  // Init theme & i18n immediately (tidak perlu tunggu splash)
  applyI18n();

  // restore foto awal
  const imgEarly=localStorage.getItem("foto");
  if(imgEarly){
    const pp=document.getElementById("profilePreview");
    if(pp) pp.src=imgEarly;
    const fh=document.getElementById("fotoHome");
    if(fh) fh.src=imgEarly;
  }

  // Splash dikontrol splash-init.js (alur: splash → login)
  // UI components diinit langsung tanpa runSplash wrapper
  (function initUIComponents(){

    // default power off
    const btn=document.getElementById("powerBtn");
    if(btn) btn.classList.add("power-off");

    // chart
    if(typeof Chart!=="undefined"){ setTimeout(()=>initChart(),200); }

    // calendar UI scaffold (safe – no Firebase calls)
    initCalendar();
    // NOTE: loadCalendarData() and autoDelete() are called in
    // initializeAppForUser() after login — NOT here — to prevent
    // running without a valid currentUserId.

    // restore target label
    const savedTarget=localStorage.getItem("targetProduksi")||"200";
    const tl=document.getElementById("targetLabel");
    if(tl){ const _tKg=parseInt(savedTarget); tl.innerText=GlobalState.unit==="imperial"?formatTitik(Math.round(_tKg*2.20462))+" lb":formatTitik(_tKg)+" kg"; }
    const tpd=document.getElementById("targetProfilDisplay");
    if(tpd) tpd.innerText=formatTitik(parseInt(savedTarget));
    const tpl=document.getElementById("prodTargetLabel");
    if(tpl){ const _tKg2=parseInt(savedTarget); tpl.innerText=GlobalState.unit==="imperial"?formatTitik(Math.round(_tKg2*2.20462))+" lb":formatTitik(_tKg2)+" kg"; }

    // restore weekly target
    const savedTargetMingguan=localStorage.getItem("targetMingguan");
    const tmd=document.getElementById("targetMingguanDisplay");
    if(tmd) tmd.innerText=savedTargetMingguan?formatTitik(parseInt(savedTargetMingguan)):"-";

    // theme option UI
    // lang option UI — use GlobalState as single source of truth
    const savedLang = GlobalState.language; // already loaded from localStorage in ui-controller.js
    currentLang = savedLang;               // keep backward-compat var in sync
    const loi=document.getElementById("langOptId");
    const loe=document.getElementById("langOptEn");
    if(loi) loi.classList.toggle("selected",savedLang==="id");
    if(loe) loe.classList.toggle("selected",savedLang==="en");

    // unit UI
    updateUnitUI();

    // notif toggle
    const toggleNotifEl=document.getElementById("toggleNotif");
    if(toggleNotifEl){
      toggleNotifEl.classList.toggle("on",notifEnabled);
      toggleNotifEl.classList.toggle("off",!notifEnabled);
    }

    // restore savedata desc
    const savedDesc=localStorage.getItem("savedataLocalDesc");
    if(savedDesc){ const el=document.getElementById("savedataLocalDescEl"); if(el) el.innerText=savedDesc; }

    // Load feature configuration from localStorage
    loadFeatureConfig();

    // ============================================================
    // AUTO-INIT BEP: Load & hitung BEP dari localStorage saat app
    // dibuka. Data dibaca dari bep_data (atau legacy keys bepP/bepFC/bepVC).
    // ============================================================
    (function autoBEPInit(){
      const bepData = (function(){
        try{ const r=localStorage.getItem("bep_data"); return r?JSON.parse(r):{}; }catch(e){ return {}; }
      })();

      const P_val  = bepData.harga_jual    || localStorage.getItem("bepP")  || "";
      const FC_val = bepData.biaya_tetap   || localStorage.getItem("bepFC") || "";
      const VC_val = bepData.biaya_variabel|| localStorage.getItem("bepVC") || "";
      const Q_val  = bepData.produksi      || "";
      const TP_val = bepData.target_profit || "";
      const SR_val = bepData.keberhasilan  || "100";

      // Tidak ada data → skip
      if(!P_val && !FC_val) return;

      // Isi hidden inputs di halaman Pendapatan
      const syncHidden = (id, val) => { const el=document.getElementById(id); if(el) el.value=val; };
      syncHidden("bepHargaInput",       P_val);
      syncHidden("bepFCInput",          FC_val);
      syncHidden("bepVCInput",          VC_val);
      syncHidden("bepQInput",           Q_val);
      syncHidden("bepTargetProfitInput",TP_val);
      syncHidden("bepSuccessRate",      SR_val);

      // Init produk selector
      initProdukSelector();

      // Hitung BEP
      if(typeof hitungBEP === "function") hitungBEP();
      if(typeof updateBEPSummaryCard === "function") updateBEPSummaryCard();
    })();

  // Apply BEP visibility state on app initialization
  updateBEPUI();

  })();
};



/* ============================================================
   KALKULATOR – OPEN / CLOSE / TAB
   ============================================================ */
function openKalkulator(){
  const m = document.getElementById("modalKalkulator");
  if(m){ 
    m.classList.add("open"); 
    updateComponentMode(); 
    updateAreaInputs();
  }
}
function closeKalkulator(){
  const m = document.getElementById("modalKalkulator");
  if(m) m.classList.remove("open");
}
// Close on backdrop click (guarded — scripts load before DOMContentLoaded in some cases)
(function(){
  function bindKalkulatorBackdrop(){
    var m = document.getElementById("modalKalkulator");
    if(m){ m.addEventListener("click", function(e){ if(e.target === this) closeKalkulator(); }); }
  }
  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", bindKalkulatorBackdrop);
  } else {
    bindKalkulatorBackdrop();
  }
})();
function switchKalkTab(tab, btn){
  document.querySelectorAll(".kalk-tab").forEach(t=>t.classList.remove("active"));
  document.querySelectorAll(".kalk-panel").forEach(p=>p.classList.remove("active"));
  if(btn) btn.classList.add("active");
  
  // Special handling for capitalization
  let panelId = "kalkPanel";
  if(tab === "basic") panelId += "Basic";
  else if(tab === "scientific") panelId += "Scientific";
  else if(tab === "component") panelId += "Component";
  else if(tab === "area") panelId += "Area";
  else if(tab === "biaya") panelId += "Biaya";
  else panelId += tab.charAt(0).toUpperCase() + tab.slice(1);
  
  const panel = document.getElementById(panelId);
  if(panel) panel.classList.add("active");
  
  // Initialize panels when switched
  if(tab === "component") updateComponentMode();
  if(tab === "area") updateAreaInputs();
}



/* ============================================================
   KALKULATOR – BASIC
   ============================================================ */
const basicState = { expr:"", result:"0", lastOp:false, justEvaled:false };



/* ============================================================
   BEP SYSTEM – FULL LOGIC
   ============================================================ */
let bepChart = null;

function hitungBEP(){
  // Bypass: do not render BEP indicators when feature is OFF
  if (!featureConfig.bepEnabled) return;

  // [FIX 8.2] Sebelumnya fungsi ini membaca #bepHargaInput, #bepFCInput,
  // #bepVCInput, #bepQInput, #bepSuccessRate, dan #bepTargetProfitInput —
  // elemen-elemen halaman lama yang tidak ada lagi di HTML saat ini
  // (dulu diisi lewat syncHidden() di onBEPGroupInput(), tapi syncHidden()
  // diam saja bila elemen targetnya tidak ada). Karena elemen pertama tidak
  // ditemukan, fungsi selalu `return` di baris awal dan seluruh kartu BEP,
  // status BEP, kartu profit, serta grafik BEP tidak pernah terisi.
  //
  // Perbaikannya: ambil nilai langsung dari getBEPData() (localStorage
  // "bep_data"), sumber data yang sama yang sudah diisi oleh
  // onBEPGroupInput() dari input-input di halaman Profil/BEP yang sekarang.
  const bepData = getBEPData();
  const P  = parseFloat(bepData.harga_jual) || 0;
  const FC = parseFloat(bepData.biaya_tetap) || 0;
  const VC = parseFloat(bepData.biaya_variabel) || 0;
  const Q  = parseFloat(bepData.produksi) || 0;
  // [FIX 8.2 - cacat laten] Tingkat keberhasilan 0 sebelumnya dianggap 100
  // karena `parseFloat(x) || 100` menganggap 0 sebagai falsy. Sekarang 0
  // hanya digantikan default 100 bila field-nya memang belum diisi (undefined/null).
  const _srRaw = bepData.keberhasilan;
  const successRate = ((_srRaw === undefined || _srRaw === null || _srRaw === "")
    ? 100
    : parseFloat(_srRaw) || 0) / 100;
  const targetProfit = parseFloat(bepData.target_profit) || 0;

  if(P <= 0 || FC <= 0) {
    // Clear displays if inputs empty
    ["bepUnitDisplay","bepRpDisplay","bepMarginDisplay","bepVCPerUnit",
     "bepMarginVal","bepMarginPct","bepTotalCost","bepRevenue",
     "bepQReal","bepQTarget","bepScenNormal","bepScenBad","bepScenGood"].forEach(id=>{
       const el=document.getElementById(id); if(el) el.innerText="-";
    });
    // Reset home gauge/revenue
    updateHomeRevenue(0);
    updateHomeGauge(0, 0);
    return;
  }

  // === Core BEP Formulas ===
  const margin     = P - VC;                              // Margin Kontribusi per unit
  const marginPct  = P > 0 ? (margin / P) * 100 : 0;   // Margin Kontribusi %
  const bepUnit    = margin > 0 ? FC / margin : Infinity;  // BEP Unit
  const bepRp      = marginPct > 0 ? FC / (marginPct/100) : Infinity; // BEP Rupiah

  // Produksi real (dengan faktor keberhasilan)
  const qReal = Q * successRate;

  // Total Cost = FC + (VC × Q_real)
  const totalCost = FC + (VC * qReal);

  // Revenue = P × Q_real
  const revenue = P * qReal;

  // Profit
  const profitBEP = revenue - totalCost;

  // Q untuk target profit
  // [FIX 8.2 - cacat laten] Bila margin <= 0 (VC ≥ P), jangan bagi dengan
  // angka nol/negatif — hasilnya tidak masuk akal (BEP tidak akan pernah tercapai).
  const qTargetProfit = (targetProfit > 0 && margin > 0)
    ? Math.ceil((FC + targetProfit) / margin)
    : null;

  // === Update BEP Summary Cards ===
  const bepUnitEl = document.getElementById("bepUnitDisplay");
  const bepRpEl   = document.getElementById("bepRpDisplay");
  const bepMgEl   = document.getElementById("bepMarginDisplay");
  if(bepUnitEl) bepUnitEl.innerText = isFinite(bepUnit) ? formatTitik(Math.ceil(bepUnit)) : "∞";
  if(bepRpEl)  bepRpEl.innerText  = isFinite(bepRp)   ? "Rp "+formatTitik(Math.round(bepRp)) : "∞";
  if(bepMgEl)  bepMgEl.innerText  = "Rp "+formatTitik(margin);

  // === Update BEP Detail Table ===
  const set = (id, val) => { const el=document.getElementById(id); if(el) el.innerText=val; };
  set("bepVCPerUnit",  "Rp " + formatTitik(VC));
  set("bepMarginVal",  "Rp " + formatTitik(margin));
  set("bepMarginPct",  marginPct.toFixed(2) + "%");
  set("bepTotalCost",  "Rp " + formatTitik(Math.round(totalCost)));
  set("bepRevenue",    "Rp " + formatTitik(Math.round(revenue)));
  // Use GlobalState.unit for display — data remains metric internally
  const _wUnit = GlobalState.unit === "imperial" ? "lb" : "kg";
  const _disp = (kg) => GlobalState.unit === "imperial"
    ? formatTitik(Math.round(kg * 2.20462 * 100) / 100)
    : formatTitik(parseFloat(kg.toFixed ? kg.toFixed(1) : kg));
  set("bepQReal",   _disp(qReal) + " " + _wUnit);
  set("bepQTarget", qTargetProfit ? _disp(qTargetProfit) + " " + _wUnit : "-");

  // === BEP Scenarios ===
  const bepNormal = isFinite(bepUnit) ? Math.ceil(bepUnit) : null;
  const marginBad = (P * 0.8) - VC;
  const bepBad = marginBad > 0 ? Math.ceil(FC / marginBad) : null;
  const marginGood = (P * 1.2) - VC;
  const bepGood = marginGood > 0 ? Math.ceil(FC / marginGood) : null;

  // Scenarios: display in correct unit
  set("bepScenNormal", bepNormal ? _disp(bepNormal)+" "+_wUnit : "-");
  set("bepScenBad",    bepBad    ? _disp(bepBad)   +" "+_wUnit : (currentLang==="en"?"Loss":"Rugi"));
  set("bepScenGood",   bepGood   ? _disp(bepGood)  +" "+_wUnit : "-");

  // === Update BEP Status Banner ===
  const bepEl = document.getElementById("bepStatus");
  if(bepEl && Q > 0){
    // [FIX 8.2 - cacat laten] Bila margin <= 0, BEP tidak akan pernah tercapai
    // (bepUnit = Infinity). Sebelumnya ini bisa tampil sebagai "Kurang Infinity kg".
    if(!isFinite(bepUnit)){
      bepEl.innerText = currentLang==="en"
        ? "BEP Not Achieved — selling price is at or below variable cost per unit"
        : "BEP Belum Tercapai — harga jual masih di bawah/sama dengan biaya variabel per unit";
      bepEl.className = "bep-box bep-no";
    } else if(qReal >= bepUnit){
      bepEl.innerText = currentLang==="en"
        ? `BEP Achieved ✔ (${formatTitik(Math.ceil(bepUnit))} kg BEP unit)`
        : `BEP Tercapai ✔ (BEP = ${formatTitik(Math.ceil(bepUnit))} kg)`;
      bepEl.className = "bep-box bep-yes";
    } else {
      const kekurangan = Math.ceil(bepUnit - qReal);
      bepEl.innerText = currentLang==="en"
        ? `BEP Not Achieved — Need ${formatTitik(kekurangan)} kg more`
        : `BEP Belum Tercapai — Kurang ${formatTitik(kekurangan)} kg`;
      bepEl.className = "bep-box bep-no";
    }
  }

  // === Update Profit Card ===
  const profitEl = document.getElementById("profit");
  if(profitEl){
    profitEl.innerText = formatRupiah(profitBEP);
    profitEl.style.color = "white";
  }

  // === Sync Profil BEP values ===
  const pHJ = document.getElementById("profilHargaJual");
  const pBU = document.getElementById("profilBEPUnit");
  const pBR = document.getElementById("profilBEPRp");
  const pFC = document.getElementById("profilFCValue");
  const pVC = document.getElementById("profilVCValue");
  if(pHJ) pHJ.innerText = formatTitik(P);
  if(pBU) pBU.innerText = isFinite(bepUnit) ? formatTitik(Math.ceil(bepUnit)) : "∞";
  if(pBR) pBR.innerText = isFinite(bepRp)   ? formatTitik(Math.round(bepRp))  : "∞";
  if(pFC) pFC.innerText = formatTitik(Math.round(FC));
  if(pVC) pVC.innerText = formatTitik(VC);

  // === Sync 4-group breakdown on Profil page ===
  // [FIX 8.2] reuse bepData yang sudah diambil di awal fungsi, tidak perlu
  // memanggil getBEPData() dua kali dan mendeklarasikan ulang.
  const fcG = bepData.fc_groups || {};
  const vcG = bepData.vc_groups || {};
  const setProfilGroup = (id, val) => {
    const el = document.getElementById(id);
    if(el) el.innerText = val > 0 ? formatTitik(Math.round(val)) : "-";
  };
  setProfilGroup("profilFC1", fcG.fc1 || 0);
  setProfilGroup("profilFC2", fcG.fc2 || 0);
  setProfilGroup("profilFC3", fcG.fc3 || 0);
  setProfilGroup("profilFC4", fcG.fc4 || 0);
  setProfilGroup("profilVC1", vcG.vc1 || 0);
  setProfilGroup("profilVC2", vcG.vc2 || 0);
  setProfilGroup("profilVC3", vcG.vc3 || 0);
  setProfilGroup("profilVC4", vcG.vc4 || 0);

  // === Update Home Revenue & Gauge ===
  updateHomeRevenue(revenue);
  updateHomeGauge(qReal, bepUnit);

  // Draw / Update BEP Linear Chart
  renderBEPChart(P, FC, VC, bepUnit);
}
function renderBEPChart(P, FC, VC, bepUnit){
  if (!featureConfig.bepEnabled) return;
  const canvasEl = document.getElementById("bepChart");
  if(!canvasEl) return;

  // Build Q range: 0 to max(bepUnit*2, 50)
  const maxQ = isFinite(bepUnit) ? Math.ceil(bepUnit * 2.2) : 200;
  const steps = 20;
  const stepSize = Math.ceil(maxQ / steps);
  const labels = [];
  const revenueData = [];
  const totalCostData = [];
  const fcData = [];

  for(let i = 0; i <= steps; i++){
    const q = i * stepSize;
    labels.push(q);
    revenueData.push(P * q);
    totalCostData.push(FC + (VC * q));
    fcData.push(FC);
  }

  const textColor = "#333";
  const gridColor = "rgba(0,0,0,0.06)";

  // Sumbu-X bertipe kategori: posisi anotasi = indeks label, bukan nilai Q.
  if(typeof ensureChartAnnotation === "function") ensureChartAnnotation();
  const bepIdx = bepUnit / stepSize;
  const bepAnnotation = (isFinite(bepUnit) && isFinite(bepIdx)) ? {
    annotations: {
      bepLine: {
        type: "line",
        xMin: bepIdx,
        xMax: bepIdx,
        borderColor: "rgba(0,177,79,0.6)",
        borderWidth: 1.5,
        borderDash: [5, 5],
        label: {
          enabled: true,
          content: "BEP",
          position: "start",
          backgroundColor: "#00b14f",
          color: "white",
          font: { size: 10 }
        }
      }
    }
  } : {};

  if(bepChart){
    bepChart.options.plugins.annotation = bepAnnotation;
    bepChart.data.labels = labels;
    bepChart.data.datasets[0].data = revenueData;
    bepChart.data.datasets[1].data = totalCostData;
    bepChart.data.datasets[2].data = fcData;
    bepChart.update();
    return;
  }

  bepChart = new Chart(canvasEl, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: (typeof GlobalState !== "undefined" && GlobalState.language === "en") ? "Revenue (P×Q)" : "Pendapatan (P×Q)",
          data: revenueData,
          borderColor: "#00b14f",
          backgroundColor: "rgba(0,177,79,0.08)",
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: "#00b14f",
          borderWidth: 2.5,
        },
        {
          label: (typeof GlobalState !== "undefined" && GlobalState.language === "en") ? "Total Cost (FC+VC×Q)" : "Total Biaya (FC+VC×Q)",
          data: totalCostData,
          borderColor: "#e74c3c",
          backgroundColor: "rgba(231,76,60,0.05)",
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: "#e74c3c",
          borderWidth: 2.5,
        },
        {
          label: (typeof GlobalState !== "undefined" && GlobalState.language === "en") ? "Fixed Cost (FC)" : "Biaya Tetap (FC)",
          data: fcData,
          borderColor: "#f0c428",
          backgroundColor: "transparent",
          fill: false,
          tension: 0,
          pointRadius: 0,
          borderWidth: 1.5,
          borderDash: [7, 4],
        }
      ]
    },
    options: {
      responsive: true,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ctx.dataset.label + ": Rp " + formatTitik(Math.round(ctx.raw)),
            title: (items) => "Q = " + items[0].label + " kg"
          }
        },
        annotation: bepAnnotation
      },
      scales: {
        x: {
          title: { display: true, text: "Produksi (kg)", color: textColor, font: { size: 10 } },
          ticks: { color: textColor, font: { size: 9 } },
          grid: { color: gridColor }
        },
        y: {
          title: { display: true, text: "Rp", color: textColor, font: { size: 10 } },
          ticks: {
            color: textColor,
            font: { size: 9 },
            callback: (v) => {
              if(v >= 1000000) return "Rp " + (v/1000000).toFixed(1) + "jt";
              if(v >= 1000)    return "Rp " + (v/1000).toFixed(0) + "rb";
              return "Rp " + v;
            }
          },
          grid: { color: gridColor }
        }
      }
    }
  });
}

function loadBEPInputs(){
  // Load from bep_data localStorage key (primary), fallback to legacy keys
  const bepData = getBEPData();

  // ── Try new-UI BEP elements first (settings-profil page) ──
  const hargaProfilEl = document.getElementById("bepHargaProfilInput");
  const qProfilEl     = document.getElementById("bepQProfilInput");
  const tpProfilEl    = document.getElementById("bepTPProfilInput");
  const srProfilEl    = document.getElementById("bepSRProfilInput");

  if(hargaProfilEl) hargaProfilEl.value = localStorage.getItem("hargaJual_"+currentProduk) || bepData.harga_jual || "";
  if(qProfilEl)     qProfilEl.value     = bepData.produksi || localStorage.getItem("targetProduksi") || "";
  if(tpProfilEl)    tpProfilEl.value    = bepData.target_profit || "";
  if(srProfilEl)    srProfilEl.value    = bepData.keberhasilan  || "100";

  // ── Also try legacy BEP elements (may not exist in new UI) ──
  const hargaEl = document.getElementById("bepHargaInput");
  const fcEl    = document.getElementById("bepFCInput");
  const vcEl    = document.getElementById("bepVCInput");
  const qEl     = document.getElementById("bepQInput");
  const tpEl    = document.getElementById("bepTargetProfitInput");
  const srEl    = document.getElementById("bepSuccessRate");

  if(hargaEl) hargaEl.value = bepData.harga_jual   || localStorage.getItem("bepP")  || "";
  if(fcEl)    fcEl.value    = bepData.biaya_tetap   || localStorage.getItem("bepFC") || "";
  if(vcEl)    vcEl.value    = bepData.biaya_variabel|| localStorage.getItem("bepVC") || "";
  if(qEl){
    let qVal = bepData.produksi || "";
    if(!qVal){
      const prod2 = document.getElementById("prod2");
      if(prod2 && prod2.getAttribute("data-kg-raw")) qVal = prod2.getAttribute("data-kg-raw");
    }
    qEl.value = qVal;
  }
  if(tpEl) tpEl.value = bepData.target_profit || "";
  if(srEl) srEl.value = bepData.keberhasilan  || "100";

  if(fcEl && !fcEl.value){
    const modalSaved = parseSanitized(localStorage.getItem("modal") || "0");
    if(modalSaved > 0) fcEl.value = modalSaved;
  }

  // hitungBEP is now null-safe: delegates to onBEPGroupInput if old elements absent
  hitungBEP();
  if(typeof updateBEPSummaryCard === "function") updateBEPSummaryCard();
  // Also trigger new group-based BEP calc
  if(typeof onBEPGroupInput === "function") onBEPGroupInput();
}



/* ============================================================
   BEP DATA – localStorage bep_data helper
   ============================================================ */
function getBEPData(){
  try{
    const raw = localStorage.getItem("bep_data");
    return raw ? JSON.parse(raw) : {};
  }catch(e){ return {}; }
}
function setBEPData(obj){
  try{ localStorage.setItem("bep_data", JSON.stringify(obj)); }catch(e){}
  // Sync ke Firebase setiap kali BEP berubah (Task 3)
  if (typeof saveBEPToFirebase === "function" && typeof currentUserId !== "undefined" && currentUserId) {
    saveBEPToFirebase(obj);
  }
}

/* Update the summary card shown on the pendapatan page */
function updateBEPSummaryCard(){
  const bepData = getBEPData();
  const P  = parseFloat(bepData.harga_jual   || localStorage.getItem("bepP")  || 0);
  const FC = parseSanitized(bepData.biaya_tetap   || localStorage.getItem("bepFC") || "0");
  const VC = parseFloat(bepData.biaya_variabel|| localStorage.getItem("bepVC") || 0);
  const Q  = parseFloat(bepData.produksi      || 0);
  const TP = parseSanitized(bepData.target_profit || "0");
  const SR = parseFloat(bepData.keberhasilan  || 100);

  const set = (id, val) => { const el=document.getElementById(id); if(el) el.innerText=val; };
  set("bepSumP",  P  ? "Rp "+formatTitik(P)  : "-");
  set("bepSumFC", FC ? "Rp "+formatTitik(FC) : "-");
  set("bepSumVC", VC ? "Rp "+formatTitik(VC)+"/kg" : "-");
  const _sUnit = (typeof GlobalState !== "undefined" && GlobalState.unit === "imperial") ? "lb" : "kg";
  const _sQ = (typeof GlobalState !== "undefined" && GlobalState.unit === "imperial") ? Math.round(Q * 2.20462 * 100)/100 : Q;
  set("bepSumQ",  Q  ? formatTitik(_sQ)+" "+_sUnit  : "-");
  set("bepSumTP", TP ? "Rp "+formatTitik(TP) : "-");
  set("bepSumSR", SR+"%");
}



/* ============================================================
   INFO MODAL – show/close
   ============================================================ */
function showInfoModal(title, body){
  document.getElementById("infoModalTitle").innerText = title;
  document.getElementById("infoModalBody").innerText  = body;
  document.getElementById("infoModal").classList.add("show");
}
function closeInfoModal(){
  document.getElementById("infoModal").classList.remove("show");
}



/* ============================================================
   PRODUK SELECTOR — Pendapatan page
   ============================================================ */
const PRODUK_LIST = {
  maggot_segar:  { label:"Maggot Segar (Rp/kg)",    icon:"🐛" },
  maggot_kering: { label:"Maggot Kering (Rp/kg)",   icon:"🌿" },
  tepung_maggot: { label:"Tepung Maggot (Rp/kg)",   icon:"🌾" },
  telur_bsf:     { label:"Telur BSF (Rp/butir)",    icon:"🥚" },
  prepupa:       { label:"Prepupa (Rp/kg)",          icon:"🦋" },
  kasgot:        { label:"Kasgot (Rp/kg)",           icon:"🌱" },
};
let currentProduk = localStorage.getItem("currentProduk") || "maggot_segar";

function selectProduk(key){
  currentProduk = key;
  localStorage.setItem("currentProduk", key);
  // Update pill UI
  document.querySelectorAll(".produk-pill").forEach(el=>el.classList.remove("selected"));
  const pEl = document.getElementById("pill_"+key);
  if(pEl) pEl.classList.add("selected");
  // Update label
  const lEl = document.getElementById("selectedProdukLabel");
  if(lEl) lEl.innerText = "Harga Jual — " + PRODUK_LIST[key].label;
  // Restore saved price for this product
  const savedPrice = localStorage.getItem("hargaJual_"+key) || "";
  const hEl = document.getElementById("bepHargaProfilInput");
  if(hEl) hEl.value = savedPrice;
  onBEPGroupInput();
}

function initProdukSelector(){
  const key = currentProduk;
  document.querySelectorAll(".produk-pill").forEach(el=>el.classList.remove("selected"));
  const pEl = document.getElementById("pill_"+key);
  if(pEl) pEl.classList.add("selected");
  const lEl = document.getElementById("selectedProdukLabel");
  if(lEl) lEl.innerText = "Harga Jual — " + (PRODUK_LIST[key]?.label || key);
  const savedPrice = localStorage.getItem("hargaJual_"+key) || "";
  const hEl = document.getElementById("bepHargaProfilInput");
  if(hEl) hEl.value = savedPrice;
}



/* ============================================================
   BEP GROUP INPUT — 4 FC + 4 VC → auto-compute FC total, VC total
   ============================================================ */

// Equipment list management for FC1
let equipmentList = [];
let equipmentCounter = 0;

function addEquipment(){
  equipmentCounter++;
  const eq = { id: equipmentCounter, nama: "", harga: 0, umur: 24 };
  equipmentList.push(eq);
  renderEquipmentList();
  onBEPGroupInput();
}

function removeEquipment(id){
  equipmentList = equipmentList.filter(e => e.id !== id);
  renderEquipmentList();
  onBEPGroupInput();
}

function updateEquipment(id, field, value){
  const eq = equipmentList.find(e => e.id === id);
  if(eq){
    if(field === "harga" || field === "umur") eq[field] = parseFloat(value) || 0;
    else eq[field] = value;
    onBEPGroupInput();
  }
}

function renderEquipmentList(){
  const container = document.getElementById("fc1EquipmentList");
  if(!container) return;
  // Use GlobalState.language for i18n (single source of truth)
  const S = STRINGS[GlobalState.language] || STRINGS["id"];
  
  if(equipmentList.length === 0){
    container.innerHTML = `<div style="padding:10px;text-align:center;color:var(--text-sub);font-size:12px;">${S.equipment_empty_message || 'Belum ada alat. Klik "+ Tambah Alat" untuk menambah.'}</div>`;
    return;
  }
  
  let html = '';
  equipmentList.forEach((eq, idx) => {
    html += `
      <div style="border:1px solid var(--input-border);border-radius:10px;padding:12px;margin-bottom:8px;background:var(--input-bg);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <span style="font-size:12px;font-weight:700;color:var(--text);">${S.equipment_label || 'Alat'} ${idx+1}</span>
          <button type="button" onclick="removeEquipment(${eq.id})" style="background:#e74c3c;color:white;border:none;border-radius:6px;padding:4px 10px;font-size:11px;cursor:pointer;font-weight:600;">${S.btn_hapus || 'Hapus'}</button>
        </div>
        <label class="input-label">${S.equipment_name_label || 'Nama Alat'}</label>
        <input class="input" type="text" value="${escapeHtml(eq.nama)}" placeholder="${S.equipment_name_placeholder || 'Contoh: Timbangan Digital'}" oninput="updateEquipment(${eq.id}, 'nama', this.value)" style="margin-bottom:6px;">
        <label class="input-label">${S.equipment_price_label || 'Harga Alat (Rp)'}</label>
        <input class="input" type="number" value="${Number(eq.harga)||''}" placeholder="${S.equipment_price_placeholder || 'Contoh: 500000'}" min="0" oninput="updateEquipment(${eq.id}, 'harga', this.value)" style="margin-bottom:6px;">
        <label class="input-label">${S.equipment_age_label || 'Umur Pakai (bulan)'}</label>
        <input class="input" type="number" value="${Number(eq.umur)||''}" placeholder="${S.equipment_age_placeholder || 'Contoh: 24'}" min="1" oninput="updateEquipment(${eq.id}, 'umur', this.value)">
      </div>
    `;
  });
  container.innerHTML = html;
}

function computeFCGroups(){
  // FC1: Investasi — penyusutan per bulan dari multiple equipment
  let fc1 = 0;
  equipmentList.forEach(eq => {
    if(eq.harga > 0 && eq.umur > 0){
      fc1 += eq.harga / eq.umur;
    }
  });

  // FC2: Infrastruktur (single input)
  const infrastruktur = parseFloat(document.getElementById("biayaInfrastrukturInput")?.value) || 0;
  const fc2 = infrastruktur;

  // FC3: Listrik Kandang (single input)
  const listrikKandang = parseFloat(document.getElementById("biayaListrikKandangInput")?.value) || 0;
  const fc3 = listrikKandang;

  // FC4: Biaya Tetap Lainnya (single input)
  const tetapLainnya = parseFloat(document.getElementById("biayaTetapLainnyaInput")?.value) || 0;
  const fc4 = tetapLainnya;

  const fcTotal = fc1 + fc2 + fc3 + fc4;

  // Update previews
  const showPrev = (id, val, label) => {
    const el = document.getElementById(id);
    if(el){ el.style.display = val > 0 ? "block" : "none"; if(val>0) el.innerText = label+": Rp "+formatTitik(Math.round(val))+"/bulan"; }
  };
  showPrev("fc1Preview", fc1, "FC Investasi (penyusutan)");
  showPrev("fc2Preview", fc2, "FC Infrastruktur");
  showPrev("fc3Preview", fc3, "FC Listrik Kandang");
  showPrev("fc4Preview", fc4, "FC Biaya Tetap Lainnya");

  const totalDiv = document.getElementById("fcTotalPreview");
  const totalVal = document.getElementById("fcTotalValue");
  if(totalDiv){ totalDiv.style.display = fcTotal > 0 ? "block" : "none"; }
  if(totalVal){ totalVal.innerText = "Rp "+formatTitik(Math.round(fcTotal)); }

  return { fc1, fc2, fc3, fc4, total: fcTotal };
}

function computeVCGroups(qTotal){
  // VC1: Pakan (single input)
  const pakan = parseFloat(document.getElementById("vcPakanInput")?.value) || 0;
  const vc1 = pakan;

  // VC2: Operasional (single combined input)
  const operasional = parseFloat(document.getElementById("vcOperasionalInput")?.value) || 0;
  const vc2 = operasional;

  // VC3: Tenaga Kerja → convert to per-kg
  const upahHarian  = parseFloat(document.getElementById("vcUpahHarianInput")?.value) || 0;
  const hariKerja   = parseFloat(document.getElementById("vcHariKerjaInput")?.value) || 20;
  const totalTKBulan = upahHarian * hariKerja;
  const vc3PerKg = qTotal > 0 ? totalTKBulan / qTotal : 0;

  // VC4: Biaya Variabel Lainnya (single combined input)
  const variabelLainnya = parseFloat(document.getElementById("vcVariabelLainnyaInput")?.value) || 0;
  const vc4 = variabelLainnya;

  const vcTotal = vc1 + vc2 + vc3PerKg + vc4;

  // Update previews
  const showPrev = (id, val, label) => {
    const el = document.getElementById(id);
    if(el){ el.style.display = val > 0 ? "block" : "none"; if(val>0) el.innerText = label+": Rp "+formatTitik(Math.round(val))+"/kg"; }
  };
  showPrev("vc1Preview", vc1, "VC Pakan");
  showPrev("vc2Preview", vc2, "VC Operasional");
  const vc3El = document.getElementById("vc3Preview");
  if(vc3El){
    vc3El.style.display = vc3PerKg > 0 ? "block" : "none";
    if(vc3PerKg > 0) vc3El.innerText = "VC TK: Rp "+formatTitik(Math.round(vc3PerKg))+"/kg (dari total TK Rp "+formatTitik(Math.round(totalTKBulan))+"/bulan)";
  }
  showPrev("vc4Preview", vc4, "VC Lainnya");

  const totalDiv = document.getElementById("vcTotalPreview");
  const totalVal = document.getElementById("vcTotalValue");
  if(totalDiv){ totalDiv.style.display = vcTotal > 0 ? "block" : "none"; }
  if(totalVal){ totalVal.innerText = "Rp "+formatTitik(Math.round(vcTotal))+"/kg"; }

  return { vc1, vc2, vc3PerKg, vc4, total: vcTotal };
}

function computeQ(){
  // Priority: explicit produksi aktual → produksi per siklus × hari kerja → target produksi
  const explicitQ = parseFloat(document.getElementById("bepQProfilInput")?.value) || 0;
  if(explicitQ > 0) return explicitQ;

  const prodHarian = parseFloat(document.getElementById("produksiHarianInput")?.value) || parseSanitized(localStorage.getItem("produksiPerSiklus")||"0") || 0;
  const hariKerja  = parseFloat(document.getElementById("vcHariKerjaInput")?.value) || 20;
  if(prodHarian > 0) return prodHarian * hariKerja;

  const target = parseFloat(document.getElementById("targetInput")?.value) || parseSanitized(localStorage.getItem("targetProduksi")||"0") || 0;
  return target;
}

function onBEPGroupInput(){
  const qTotal = computeQ();
  const fc = computeFCGroups();
  const vc = computeVCGroups(qTotal);

  // Update Q auto info
  const qAutoEl = document.getElementById("qAutoInfo");
  if(qAutoEl){
    const _isImpQ = GlobalState.unit === "imperial";
    const _wU = _isImpQ ? "lb" : "kg";
    const _cvQ = (kg) => _isImpQ ? Math.round(kg * 2.20462 * 100)/100 : kg;
    const explicitQ = parseFloat(document.getElementById("bepQProfilInput")?.value) || 0;
    if(explicitQ > 0){
      const _isEn = GlobalState.language === "en";
      qAutoEl.innerText = (_isEn
        ? "✔ Using actual production input: "
        : "✔ Menggunakan produksi aktual yang diinput: "
      ) + formatTitik(_cvQ(explicitQ)) + " " + _wU + "/bulan";
    } else {
      const prodHarian = parseFloat(document.getElementById("produksiHarianInput")?.value) || 0;
      const hariKerja  = parseFloat(document.getElementById("vcHariKerjaInput")?.value) || 20;
      if(prodHarian > 0){
        const _isEn = GlobalState.language === "en";
        const _sep = _isEn ? " days" : " hari";
        qAutoEl.innerText = "Auto: "+_cvQ(prodHarian)+" "+_wU+"/hari × "+hariKerja+_sep+" = "+formatTitik(_cvQ(prodHarian*hariKerja))+" "+_wU+"/bulan";
      } else {
        const target = parseFloat(document.getElementById("targetInput")?.value) || 0;
        const _isEn = GlobalState.language === "en";
        qAutoEl.innerText = target > 0
          ? (_isEn ? "Fallback to Production Target: " : "Fallback ke Target Produksi: ")+formatTitik(_cvQ(target))+" "+_wU+"/bulan"
          : (_isEn ? "⚠ Fill Production per Cycle or Production Target" : "⚠ Isi Produksi per Siklus atau Target Produksi");
      }
    }
  }

  // Get price from hargaJual input
  const P  = parseFloat(document.getElementById("bepHargaProfilInput")?.value) || 0;
  const FC = fc.total;
  const VC = vc.total;
  const Q  = qTotal;
  const TP_raw = document.getElementById("bepTPProfilInput")?.value || "";
  const TP = parseSanitized(TP_raw) || 0;
  const SR = parseFloat(document.getElementById("bepSRProfilInput")?.value) || 100;
  // [FIX 8.2] Simpan juga hari kerja/bulan, dipakai autoSavePendapatanHarian()
  // untuk membagi FC bulanan menjadi porsi harian (lihat catatan di sana).
  const hariKerjaVal = parseFloat(document.getElementById("vcHariKerjaInput")?.value) || 20;

  // Save price per product
  if(P > 0) localStorage.setItem("hargaJual_"+currentProduk, P);

  // Save computed values to bep_data
  const bepObj = {
    harga_jual:    P,
    biaya_variabel:VC,
    biaya_tetap:   FC,
    produksi:      Q,
    target_profit: TP,
    keberhasilan:  SR,
    hari_kerja:    hariKerjaVal,
    // Also save per-group breakdown
    fc_groups: { fc1:fc.fc1, fc2:fc.fc2, fc3:fc.fc3, fc4:fc.fc4 },
    vc_groups: { vc1:vc.vc1, vc2:vc.vc2, vc3:vc.vc3PerKg, vc4:vc.vc4 },
    produk: currentProduk
  };
  setBEPData(bepObj);
  localStorage.setItem("bepP",  P);
  localStorage.setItem("bepFC", FC);
  localStorage.setItem("bepVC", VC);

  // Sync hidden inputs on pendapatan page
  const syncHidden = (id, val) => { const el = document.getElementById(id); if(el) el.value = val; };
  syncHidden("bepHargaInput",       P);
  syncHidden("bepFCInput",          FC);
  syncHidden("bepVCInput",          VC);
  syncHidden("bepQInput",           Q);
  syncHidden("bepTargetProfitInput", TP);
  syncHidden("bepSuccessRate",       SR);

  // Show quick BEP result
  const CM = P - VC;
  const qrEl  = document.getElementById("bepQuickResult");
  const qrtEl = document.getElementById("bepQuickText");
  if(qrEl && qrtEl){
    if(P > 0 && FC > 0 && CM > 0){
      const bepUnit = Math.ceil(FC / CM);
      const bepRp   = Math.round(FC / (CM / P));
      const profit  = (P * Q) - (FC + VC * Q);
      qrEl.style.display = "block";
      qrtEl.innerText =
        (()=>{ const _isImp=GlobalState.unit==="imperial"; const _wu=_isImp?"lb":"kg"; const _cv=(kg)=>_isImp?Math.round(kg*2.20462*100)/100:kg; const _isEn=GlobalState.language==="en";
          return `BEP Unit    : ${formatTitik(_cv(bepUnit))} ${_wu}\n`+
          `BEP Rupiah  : Rp ${formatTitik(bepRp)}\n`+
          `Margin/unit : Rp ${formatTitik(Math.round(CM))}\n`+
          `Total FC    : Rp ${formatTitik(Math.round(FC))}/bulan\n`+
          `Total VC    : Rp ${formatTitik(Math.round(VC))}/${_wu}\n`+
          (Q > 0 ? `Produksi (Q): ${formatTitik(_cv(Math.round(Q)))} ${_wu}/bulan\n`+
          `Profit Aktual: ${formatRupiah(profit)}\n`+
          `Status      : ${Q >= bepUnit ? (_isEn?"✔ BEP Achieved":"✔ BEP Tercapai"):(_isEn?"⚠ Below BEP":"⚠ Belum BEP")}` : ""); })()
    } else {
      qrEl.style.display = "none";
    }
  }

  // Trigger hitungBEP
  hitungBEP();
  updateBEPSummaryCard();
}

/* Load BEP profil inputs when opening settings-profil */
function loadBEPProfilInputs(){
  const bepData = getBEPData();
  const setVal = (id, val) => { const el=document.getElementById(id); if(el) el.value=val||""; };

  // Load group inputs from bep_data.fc_groups / vc_groups
  // FC groups
  if(bepData.fc_groups){
    // We can't reverse-engineer individual fields from totals perfectly, skip
    // Instead, load the raw field values if saved separately
  }
  // Load individual field values that were saved
  const loadSaved = (id, key) => {
    const v = localStorage.getItem("bepField_"+key);
    const el = document.getElementById(id);
    if(el && v) el.value = v;
  };

  // Load equipment list
  try{
    const savedEquipment = localStorage.getItem("bepField_equipmentList");
    if(savedEquipment){
      equipmentList = JSON.parse(savedEquipment);
      equipmentCounter = equipmentList.length > 0 ? Math.max(...equipmentList.map(e => e.id)) : 0;
      renderEquipmentList();
    }
  }catch(e){ console.error("Error loading equipment list:", e); }
  
  // Load simplified fields (new structure)
  ["biayaInfrastrukturInput","biayaListrikKandangInput","biayaTetapLainnyaInput",
   "vcPakanInput","vcOperasionalInput","vcUpahHarianInput","vcHariKerjaInput","vcVariabelLainnyaInput"].forEach(id=>{
    loadSaved(id, id);
  });

  // Load Q / SR / TP
  setVal("bepQProfilInput",  bepData.produksi      || "");
  setVal("bepTPProfilInput", bepData.target_profit  || "");
  const srEl = document.getElementById("bepSRProfilInput");
  if(srEl) srEl.value = bepData.keberhasilan || "100";

  // Load harga jual for current product
  if(document.getElementById("bepHargaProfilInput")){
    document.getElementById("bepHargaProfilInput").value = localStorage.getItem("hargaJual_"+currentProduk) || bepData.harga_jual || "";
  }

  // Trigger compute
  onBEPGroupInput();
}

// Save all BEP field values to localStorage on each input
function saveBEPFields(){
  // Save equipment list
  localStorage.setItem("bepField_equipmentList", JSON.stringify(equipmentList));
  
  // Save simplified fields (new structure)
  ["biayaInfrastrukturInput","biayaListrikKandangInput","biayaTetapLainnyaInput",
   "vcPakanInput","vcOperasionalInput","vcUpahHarianInput","vcHariKerjaInput","vcVariabelLainnyaInput"].forEach(id=>{
    const el = document.getElementById(id);
    if(el && el.value) localStorage.setItem("bepField_"+id, el.value);
  });
}

/* Keep old function name as alias for backward compat */
function onBEPProfilInput(){ onBEPGroupInput(); }


/* ============================================================
   BEP FEATURE TOGGLE FUNCTION
   ============================================================ */

/**
 * Toggle BEP feature ON/OFF
 * Updates UI visibility across the app
 */
function toggleBEPFeature() {
  featureConfig.bepEnabled = !featureConfig.bepEnabled;
  saveFeatureConfig();
  updateBEPUI();  // Single call — handles redirect + all UI
  const message = featureConfig.bepEnabled
    ? (currentLang === "en" ? "BEP Feature Enabled ✓" : "Fitur BEP Diaktifkan ✓")
    : (currentLang === "en" ? "BEP Feature Disabled" : "Fitur BEP Dinonaktifkan");
  showToast(message);
}

/**
 * updateBEPUI — SINGLE SOURCE OF TRUTH for BEP visibility
 * Controls ALL .bep-section elements via the hidden class.
 * Called on: page load, toggle change, every showPage()
 */
function updateBEPUI() {
  const enabled = featureConfig.bepEnabled;

  // ── Global: toggle hidden on ALL bep-section elements ──
  document.querySelectorAll(".bep-section").forEach(el => {
    el.classList.toggle("hidden", !enabled);
  });

  // ── Toggle button visual state ──
  const toggleEl = document.getElementById("toggleBEPFeature");
  if (toggleEl) {
    toggleEl.classList.toggle("on", enabled);
    toggleEl.classList.toggle("off", !enabled);
  }

  // ── Fitur Lanjutan sub-page status elements ──
  const statusFitur = document.getElementById("bepFeatureStatusFitur");
  if (statusFitur) {
    statusFitur.innerText = enabled
      ? (currentLang === "en" ? "Break Even Point (Active)" : "Break Even Point (Aktif)")
      : (currentLang === "en" ? "Break Even Point (Disabled)" : "Break Even Point (Nonaktif)");
  }
  // Revenue page (pendapatan) remains accessible even when BEP is OFF
  // Only BEP elements are hidden — Revenue cards/charts stay visible

  console.log("BEP UI updated:", enabled ? "ENABLED" : "DISABLED");
}

// Toggle info tooltip card on Fitur Lanjutan page
function toggleBEPInfoTooltip() {
  const card = document.getElementById("bepInfoTooltipCard");
  if (card) {
    card.style.display = card.style.display === "none" ? "block" : "none";
  }
}

// Alias kept for backward compatibility (old call sites in toggleBEPFeature)
function updateBEPVisibility() { updateBEPUI(); }



/* ============================================================
   KALKULATOR BASIC – Parentheses support
   ============================================================ */
/* We track a separate expression buffer for paren-mode */
const basicParenState = { parenExpr: "", inParen: false };

function kalkBasicParen(ch){
  const exEl  = document.getElementById("basicExpr");
  const resEl = document.getElementById("basicResult");
  // If just evaluated, start fresh
  if(basicState.justEvaled){
    basicState.expr = "";
    basicState.result = "0";
    basicState.justEvaled = false;
    basicState.lastOp = false;
  }
  // Append paren to expr. If expr is empty and ch is '(', start new subexpr.
  // If there's a current result and we're opening paren after an operator or at start, include result.
  if(ch === "("){
    if(basicState.expr === "" && basicState.result !== "0"){
      // e.g. user typed 5, then (, so 5( is implicit multiply — add * for clarity
      basicState.expr += basicState.result + "*(";
    } else if(basicState.lastOp){
      basicState.expr += "(";
      basicState.lastOp = false;
    } else if(basicState.expr === ""){
      basicState.expr = "(";
    } else {
      basicState.expr += "(";
    }
    basicState.result = "0";
  } else {
    // closing paren
    basicState.expr += basicState.result + ")";
    basicState.result = "0";
    basicState.lastOp = false;
  }
  if(exEl) exEl.innerText = basicState.expr;
  if(resEl) resEl.innerText = basicState.result;
}



/* ============================================================
   KALKULATOR SCIENTIFIC – Parentheses support
   ============================================================ */
function kalkSciParen(ch){
  const exEl  = document.getElementById("sciExpr");
  const resEl = document.getElementById("sciResult");
  const s = sciState;
  // If just evaluated, start fresh
  if(s.justEvaled){
    s.expr = "";
    s.result = "0";
    s.justEvaled = false;
    s.lastOp = false;
  }
  // Append paren to expr
  if(ch === "("){
    if(s.expr === "" && s.result !== "0"){
      s.expr += s.result + "*(";
    } else if(s.lastOp){
      s.expr += "(";
      s.lastOp = false;
    } else if(s.expr === ""){
      s.expr = "(";
    } else {
      s.expr += "(";
    }
    s.result = "0";
  } else {
    // closing paren
    s.expr += s.result + ")";
    s.result = "0";
    s.lastOp = false;
  }
  if(exEl) exEl.innerText = s.expr;
  if(resEl) resEl.innerText = s.result;
}


function fmtNum(n){
  if(isNaN(n)||!isFinite(n)) return "Error";
  const s = parseFloat(n.toPrecision(12));
  return String(s).length>12 ? s.toExponential(6) : String(s);
}



/* ============================================================
   KALKULATOR – SCIENTIFIC
   ============================================================ */
const sciState = { expr:"", result:"0", lastOp:false, justEvaled:false, pendingFn:null };
function kalkSciBasic(v){ // same as basic but uses sciState & sciResult
  const exEl = document.getElementById("sciExpr");
  const resEl = document.getElementById("sciResult");
  const s = sciState;
  if(v==="AC"){ s.expr=""; s.result="0"; s.lastOp=false; s.justEvaled=false; }
  else if(v==="sign"){ if(s.result!=="0"&&s.result!=="Error") s.result=fmtNum(-parseFloat(s.result)); }
  else if(v==="%"){ if(s.result!=="Error") s.result=fmtNum(parseFloat(s.result)/100); }
  else if(["+","-","*","/"].includes(v)){
    if(s.justEvaled){ s.expr=s.result+v; s.justEvaled=false; }
    else if(s.lastOp){ s.expr=s.expr.slice(0,-1)+v; }
    else { s.expr+=(s.expr===""?s.result:"")+v; }
    s.lastOp=true;
  }
  else if(v==="="){
    if(s.expr==="") return;
    const full=s.expr+s.result;
    try{ s.result=fmtNum(Function('"use strict";return('+full+')')());
    }catch(e){ s.result="Error"; }
    s.expr=full+" ="; s.lastOp=false; s.justEvaled=true;
  }
  else if(v==="."){
    if(s.justEvaled){ s.result="0."; s.justEvaled=false; return; }
    if(s.lastOp){ s.result="0."; s.lastOp=false; }
    else if(!s.result.includes(".")) s.result+=".";
  }
  else{
    if(s.justEvaled||s.lastOp){ s.result=v; s.lastOp=false; s.justEvaled=false; }
    else { s.result=s.result==="0"?v:(s.result+v); }
  }
  if(exEl) exEl.innerText=s.expr;
  if(resEl) resEl.innerText=s.result;
}
function kalkSci(fn){
  const s = sciState;
  const x = parseFloat(s.result);
  const resEl = document.getElementById("sciResult");
  const exEl = document.getElementById("sciExpr");
  let res;
  const deg = x * Math.PI / 180;
  switch(fn){
    case "sin":  res=fmtNum(Math.sin(deg)); exEl.innerText=`sin(${x}°)`; break;
    case "cos":  res=fmtNum(Math.cos(deg)); exEl.innerText=`cos(${x}°)`; break;
    case "tan":  res=fmtNum(Math.tan(deg)); exEl.innerText=`tan(${x}°)`; break;
    case "log":  res=x>0?fmtNum(Math.log10(x)):"Error"; exEl.innerText=`log(${x})`; break;
    case "ln":   res=x>0?fmtNum(Math.log(x)):"Error"; exEl.innerText=`ln(${x})`; break;
    case "sqrt": res=x>=0?fmtNum(Math.sqrt(x)):"Error"; exEl.innerText=`√(${x})`; break;
    case "sq":   res=fmtNum(x*x); exEl.innerText=`(${x})²`; break;
    case "pi":   res=fmtNum(Math.PI); exEl.innerText="π"; break;
    case "e":    res=fmtNum(Math.E); exEl.innerText="e"; break;
    case "inv":  res=x!==0?fmtNum(1/x):"Error"; exEl.innerText=`1/${x}`; break;
    case "pow":  s.expr=s.result+"**"; s.lastOp=true; s.result="0"; if(resEl) resEl.innerText="0"; return;
    case "abs":  res=fmtNum(Math.abs(x)); exEl.innerText=`|${x}|`; break;
    default: return;
  }
  s.result=res; s.justEvaled=true; s.lastOp=false;
  if(resEl) resEl.innerText=res;
}



/* ============================================================
   KALKULATOR – ARUS
   ============================================================ */
function updateComponentMode(){
  const mode = document.getElementById("componentMode")?.value;
  const area = document.getElementById("componentInputArea");
  if(!area) return;
  const S = STRINGS[currentLang];
  const dayaL = S.kalk_daya_label || "Power (P) - Watt";
  const tegL  = S.kalk_teg_label  || "Voltage (V) - Volt";
  const arusL = S.kalk_arus_label || "Current (I) - Ampere";
  const inputs = {
    VI: `<div class="kalk-form-label">${dayaL}</div><input class="kalk-input" type="number" id="componentIn1" placeholder="e.g: 250" min="0">
         <div class="kalk-form-label">${tegL}</div><input class="kalk-input" type="number" id="componentIn2" placeholder="e.g: 220" min="0">`,
    VP: `<div class="kalk-form-label">${tegL}</div><input class="kalk-input" type="number" id="componentIn1" placeholder="e.g: 220" min="0">
         <div class="kalk-form-label">${arusL}</div><input class="kalk-input" type="number" id="componentIn2" placeholder="e.g: 2.5" min="0">`,
    IP: `<div class="kalk-form-label">${dayaL}</div><input class="kalk-input" type="number" id="componentIn1" placeholder="e.g: 250" min="0">
         <div class="kalk-form-label">${arusL}</div><input class="kalk-input" type="number" id="componentIn2" placeholder="e.g: 2.5" min="0">`,
    R:  `<div class="kalk-form-label">${tegL}</div><input class="kalk-input" type="number" id="componentIn1" placeholder="e.g: 220" min="0">
         <div class="kalk-form-label">${arusL}</div><input class="kalk-input" type="number" id="componentIn2" placeholder="e.g: 2.5" min="0">`,
  };
  area.innerHTML = inputs[mode]||"";
  document.getElementById("componentResultBox").classList.remove("show");
}
function hitungComponent(){
  const mode = document.getElementById("componentMode")?.value;
  const v1 = parseFloat(document.getElementById("componentIn1")?.value);
  const v2 = parseFloat(document.getElementById("componentIn2")?.value);
  const S = STRINGS[currentLang];
  const errMsg = currentLang==="en" ? "Please fill in all values correctly!" : "Isi semua nilai dengan benar!";
  if(isNaN(v1)||isNaN(v2)||v2===0){ showToast(errMsg); return; }
  let I,P,V;
  switch(mode){
    case "VI": I=v1/v2; P=v1; V=v2; break;
    case "VP": P=v1*v2; I=v2; V=v1; break;
    case "IP": V=v1/v2; P=v1; I=v2; break;
    case "R":  I=v1/v2; V=v1; P=v1*I; break;
  }
  const box = document.getElementById("componentResultBox");
  const hambKey = S.kalk_hambatan_key || "Resistance (R)";
  const arusKey = S.kalk_arus_key || "Current (I)";
  document.getElementById("componentResultKey").innerText = mode==="R" ? hambKey : arusKey;
  document.getElementById("componentResultVal").innerText = mode==="R"?`${fmtNum(V/I)} Ω`:`${fmtNum(I)} A`;
  document.getElementById("componentDayaVal").innerText = `${fmtNum(P)} W`;
  document.getElementById("componentTegVal").innerText = `${fmtNum(V)} V`;
  box.classList.add("show");
}



/* ============================================================
   KALKULATOR – AREA
   ============================================================ */
let areaViewMode = "2D"; // "2D" or "3D"

function toggleAreaView(){
  const rect2D = document.getElementById("rect2D");
  const box3D = document.getElementById("box3D");
  const btn = document.getElementById("areaViewToggle");
  
  if(areaViewMode === "2D"){
    areaViewMode = "3D";
    if(rect2D) rect2D.style.display = "none";
    if(box3D) box3D.style.display = "block";
    if(btn) btn.innerHTML = '<span data-i18n="kalk_area_2d">2D View</span>';
  } else {
    areaViewMode = "2D";
    if(rect2D) rect2D.style.display = "block";
    if(box3D) box3D.style.display = "none";
    if(btn) btn.innerHTML = '<span data-i18n="kalk_area_3d">3D View</span>';
  }
}

function updateAreaInputs(){
  const shape = document.getElementById("areaShape")?.value;
  const area = document.getElementById("areaInputArea");
  const S = STRINGS[currentLang];
  if(!area) return;
  
  const unitSystem = getCurrentUnitSystem();
  const lengthUnit = unitSystem === "metric" ? "m" : "ft";
  
  const inputs = {
    rectangle: `<div class="kalk-form-label">${S.kalk_area_width || "Width"} (${lengthUnit})</div>
                <input class="kalk-input" type="number" id="areaInput1" placeholder="${S.kalk_area_eg || "e.g"}: 10" min="0" step="0.01">
                <div class="kalk-form-label">${S.kalk_area_height || "Height"} (${lengthUnit})</div>
                <input class="kalk-input" type="number" id="areaInput2" placeholder="${S.kalk_area_eg || "e.g"}: 8" min="0" step="0.01">`,
    square: `<div class="kalk-form-label">${S.kalk_area_side || "Side Length"} (${lengthUnit})</div>
             <input class="kalk-input" type="number" id="areaInput1" placeholder="${S.kalk_area_eg || "e.g"}: 10" min="0" step="0.01">`,
    triangle: `<div class="kalk-form-label">${S.kalk_area_base || "Base"} (${lengthUnit})</div>
               <input class="kalk-input" type="number" id="areaInput1" placeholder="${S.kalk_area_eg || "e.g"}: 10" min="0" step="0.01">
               <div class="kalk-form-label">${S.kalk_area_height || "Height"} (${lengthUnit})</div>
               <input class="kalk-input" type="number" id="areaInput2" placeholder="${S.kalk_area_eg || "e.g"}: 8" min="0" step="0.01">`,
    circle: `<div class="kalk-form-label">${S.kalk_area_radius || "Radius"} (${lengthUnit})</div>
             <input class="kalk-input" type="number" id="areaInput1" placeholder="${S.kalk_area_eg || "e.g"}: 5" min="0" step="0.01">`
  };
  
  area.innerHTML = inputs[shape] || "";
  document.getElementById("areaResultBox").classList.remove("show");
  updateAreaVisualization();
}

function updateAreaPlaceholders(){
  updateAreaInputs();
}

function getCurrentUnitSystem(){
  const unit = document.getElementById("areaUnit")?.value || "m2";
  const metricUnits = ["m2", "cm2", "km2", "ha"];
  return metricUnits.includes(unit) ? "metric" : "imperial";
}

function updateAreaVisualization(){
  const shape = document.getElementById("areaShape")?.value || "rectangle";
  const input1 = parseFloat(document.getElementById("areaInput1")?.value) || 10;
  const input2 = parseFloat(document.getElementById("areaInput2")?.value) || 8;
  
  // Update dimension text on visualization
  const unitSystem = getCurrentUnitSystem();
  const unit = unitSystem === "metric" ? "m" : "ft";
  
  if(shape === "rectangle"){
    // Update 2D view texts
    const widthText2D = document.getElementById("widthText2D");
    const heightText2D = document.getElementById("heightText2D");
    if(widthText2D) widthText2D.textContent = `${input1} ${unit}`;
    if(heightText2D) heightText2D.textContent = `${input2} ${unit}`;
    
    // Update 3D view texts
    const widthText3D = document.getElementById("widthText3D");
    const heightText3D = document.getElementById("heightText3D");
    if(widthText3D) widthText3D.textContent = `${input1} ${unit}`;
    if(heightText3D) heightText3D.textContent = `${input2} ${unit}`;
  }
}

function hitungArea(){
  const shape = document.getElementById("areaShape")?.value;
  const input1 = parseFloat(document.getElementById("areaInput1")?.value);
  const input2 = parseFloat(document.getElementById("areaInput2")?.value);
  const unitSelect = document.getElementById("areaUnit")?.value || "m2";
  const S = STRINGS[currentLang];
  
  const errMsg = currentLang==="en" ? "Please fill in all values correctly!" : "Isi semua nilai dengan benar!";
  
  if(isNaN(input1) || input1 <= 0){
    showToast(errMsg);
    return;
  }
  
  if((shape === "rectangle" || shape === "triangle") && (isNaN(input2) || input2 <= 0)){
    showToast(errMsg);
    return;
  }
  
  let area = 0;
  let perimeter = 0;
  
  // Calculate area based on shape
  switch(shape){
    case "rectangle":
      area = input1 * input2;
      perimeter = 2 * (input1 + input2);
      break;
    case "square":
      area = input1 * input1;
      perimeter = 4 * input1;
      break;
    case "triangle":
      area = 0.5 * input1 * input2;
      perimeter = input1 + input2 + Math.sqrt(input1*input1 + input2*input2);
      break;
    case "circle":
      area = Math.PI * input1 * input1;
      perimeter = 2 * Math.PI * input1;
      break;
  }
  
  // Convert area based on unit
  const conversions = getAreaConversions(area, unitSelect);
  
  // Update visualization with values
  updateAreaVisualization();
  
  // Display results
  const box = document.getElementById("areaResultBox");
  const resultVal = document.getElementById("areaResultVal");
  const perimeterVal = document.getElementById("perimeterResultVal");
  const convertedVal = document.getElementById("areaConvertedVal");
  const perimeterRow = document.getElementById("areaPerimeterRow");
  
  // Format with 2 decimal max
  const areaFormatted = Math.round(area * 100) / 100;
  const perimeterFormatted = Math.round(perimeter * 100) / 100;
  
  if(resultVal) resultVal.innerText = `${areaFormatted} ${unitSelect}`;
  if(perimeterVal) perimeterVal.innerText = `${perimeterFormatted} ${getLinearUnit(unitSelect)}`;
  if(perimeterRow) perimeterRow.style.display = "flex";
  
  // Show conversions
  if(convertedVal){
    const convText = conversions.map(c => `${c.value} ${c.unit}`).join(" ≈ ");
    convertedVal.innerText = convText;
  }
  
  box.classList.add("show");
}

function getLinearUnit(areaUnit){
  const map = {
    "m2": "m", "cm2": "cm", "km2": "km", "ha": "m",
    "ft2": "ft", "in2": "in", "yd2": "yd", "ac": "ft", "mi2": "mi"
  };
  return map[areaUnit] || "m";
}

function formatAreaNumber(num){
  // Format number to max 2 decimal places, no scientific notation
  if(num >= 1000000){
    // For very large numbers, use readable format
    return (Math.round(num / 10000) / 100) + "M";
  } else if(num >= 1000){
    // For thousands, use K
    return (Math.round(num / 10) / 100) + "K";
  } else if(num >= 1){
    // For normal numbers, 2 decimal max
    return Math.round(num * 100) / 100;
  } else {
    // For small numbers, 2 decimal max
    return Math.round(num * 100) / 100;
  }
}

function getAreaConversions(area, fromUnit){
  // Convert to base unit (m2) first
  const toM2 = {
    "m2": 1, "cm2": 0.0001, "km2": 1000000, "ha": 10000,
    "ft2": 0.092903, "in2": 0.00064516, "yd2": 0.836127, 
    "ac": 4046.86, "mi2": 2589988.11
  };
  
  const areaInM2 = area * toM2[fromUnit];
  
  // Provide 2 useful conversions
  const conversions = [];
  
  if(fromUnit.startsWith("m") || fromUnit === "ha" || fromUnit === "km2" || fromUnit === "cm2"){
    // Metric: show ft2 and acres
    const ft2Val = areaInM2 / toM2["ft2"];
    conversions.push({ value: formatAreaNumber(ft2Val), unit: "ft²" });
    if(areaInM2 > 100){
      const acVal = areaInM2 / toM2["ac"];
      conversions.push({ value: formatAreaNumber(acVal), unit: "acres" });
    }
  } else {
    // Imperial: show m2 and hectares
    conversions.push({ value: formatAreaNumber(areaInM2), unit: "m²" });
    if(areaInM2 > 1000){
      const haVal = areaInM2 / toM2["ha"];
      conversions.push({ value: formatAreaNumber(haVal), unit: "ha" });
    }
  }
  
  return conversions;
}



/* ============================================================
   KALKULATOR – BIAYA LISTRIK
   ============================================================ */
function hitungBiayaListrik(){
  const daya = parseFloat(document.getElementById("biayaDaya")?.value);
  const jam  = parseFloat(document.getElementById("biayaJam")?.value);
  const hari = parseFloat(document.getElementById("biayaHari")?.value)||30;
  const tarif= parseFloat(document.getElementById("biayaTarif")?.value)||1444;
  if(isNaN(daya)||isNaN(jam)||daya<=0||jam<=0){
    const errMsg = currentLang==="en" ? "Please fill in Power and Hours correctly!" : "Isi Daya dan Jam dengan benar!";
    showToast(errMsg); return;
  }
  const kWh = (daya * jam * hari) / 1000;
  const biaya = kWh * tarif;
  const box = document.getElementById("biayaResultBox");
  document.getElementById("biayaTotal").innerText = "Rp "+formatTitik(Math.round(biaya));
  const subLabel = currentLang==="en"
    ? `${fmtNum(kWh)} kWh for ${hari} days`
    : `${fmtNum(kWh)} kWh selama ${hari} hari`;
  document.getElementById("biayaSub").innerText = subLabel;
  box.classList.add("show");
}




/* ============================================================
   PUSAT BANTUAN – Help Center / WhatsApp Business Support
   ============================================================ */

// Configurable support phone number (WhatsApp Business)
const HC_WA_PHONE = "62881080665844"; // → GANTI dengan nomor WA Business tim SmartBSF

// Currently selected issue
let hcSelectedIssue = "Sensor / IoT tidak merespons";

/**
 * Handle issue button selection
 */
function hcSelectIssue(btnEl, issue) {
  hcSelectedIssue = issue;

  // Update visual selection
  const grid = document.getElementById("hcIssueGrid");
  if (grid) {
    grid.querySelectorAll(".helpcenter-issue-btn").forEach(b => b.classList.remove("selected"));
  }
  btnEl.classList.add("selected");

  // Refresh preview
  hcRefreshPreview();
}

/**
 * Collect system data from DOM / localStorage for message generation
 */
function hcGetSystemData() {
  // Production total (from live DOM element)
  const tkEl = document.getElementById("totalKg");
  const production = tkEl ? (tkEl.innerText || "0") : "0";

  // Target production (from localStorage)
  const targetRaw = localStorage.getItem("targetProduksi") || "200";
  const target = targetRaw + " kg";

  // User name / farm name
  const namaUsaha = localStorage.getItem("nama") || "Mitra SmartBSF";

  // BEP status
  const bepOn = (typeof featureConfig !== "undefined") ? featureConfig.bepEnabled : true;
  const bepStatus = bepOn ? "BEP Aktif" : "BEP Nonaktif";

  // Language
  const lang = (typeof GlobalState !== "undefined") ? GlobalState.language : "id";

  return { production, target, namaUsaha, bepStatus, lang };
}

/**
 * Generate the WhatsApp message text
 */
function hcBuildMessage(issue) {
  const d = hcGetSystemData();

  const msg = [
    "Halo, saya mitra SmartBSF mengalami kendala:",
    "",
    "- Nama Usaha        : " + d.namaUsaha,
    "- Jenis masalah     : " + issue,
    "",
    "Mohon bantuannya admin. Terima kasih."
  ].join("\n");

  return msg;
}

/**
 * Build full WhatsApp deep-link URL
 */
function hcBuildWALink(issue) {
  const msg = hcBuildMessage(issue);
  const encoded = encodeURIComponent(msg);
  return "https://wa.me/" + HC_WA_PHONE + "?text=" + encoded;
}

/**
 * Refresh the message preview card
 */
function hcRefreshPreview() {
  const previewEl = document.getElementById("hcPreviewText");
  if (!previewEl) return;
  previewEl.textContent = hcBuildMessage(hcSelectedIssue);
}

/**
 * Open WhatsApp with generated message
 */
function hcOpenWhatsApp() {
  const url = hcBuildWALink(hcSelectedIssue);
  window.open(url, "_blank");
}

/* ============================================================
   SETTINGS – SAVEDATA TOGGLE
   Manages the localStorage on/off toggle in settings-savedata.
   ============================================================ */
function toggleSave(type) {
  const toggleEl = document.getElementById('toggleLocal');
  const statusEl = document.getElementById('toggleLocalStatus');
  if (!toggleEl) return;

  const isOn = toggleEl.classList.contains('on');
  if (isOn) {
    toggleEl.classList.remove('on');
    if (statusEl) statusEl.textContent = (typeof currentLang !== 'undefined' && currentLang === 'en') ? 'Inactive' : 'Nonaktif';
    if (statusEl) statusEl.style.color = 'var(--text-sub)';
  } else {
    toggleEl.classList.add('on');
    if (statusEl) statusEl.textContent = (typeof currentLang !== 'undefined' && currentLang === 'en') ? 'Active' : 'Aktif';
    if (statusEl) statusEl.style.color = '#00b14f';
  }

  // Simpan ke localStorage
  const newState = !isOn;
  try { localStorage.setItem('saveDataEnabled', newState ? '1' : '0'); } catch(e) {}

  // Sync ke Firebase preferences
  if (typeof savePreferencesToFirebase === 'function') {
    savePreferencesToFirebase({
      language:        localStorage.getItem('lang')  || 'id',
      satuan:          localStorage.getItem('unit')  || 'metric',
      saveDataEnabled: newState
    });
  }
}

/* ============================================================
   SETTINGS – NOTIFIKASI TOGGLE
   ============================================================ */
function toggleNotifSwitch() {
  const toggleEl = document.getElementById('toggleNotif');
  if (!toggleEl) return;

  const isOn = toggleEl.classList.contains('on');
  if (isOn) {
    toggleEl.classList.remove('on');
  } else {
    toggleEl.classList.add('on');
  }

  // Simpan ke localStorage
  const newState = !isOn;
  try { localStorage.setItem('notifEnabled', newState ? '1' : '0'); } catch(e) {}

  // Sync ke Firebase preferences
  if (typeof savePreferencesToFirebase === 'function') {
    savePreferencesToFirebase({
      language: localStorage.getItem('lang')     || 'id',
      satuan:   localStorage.getItem('unit')     || 'metric',
      notifEnabled: newState
    });
  }

  const S = (typeof STRINGS !== 'undefined' && typeof currentLang !== 'undefined') ? STRINGS[currentLang] : null;
  if (typeof showToast === 'function') {
    showToast(!isOn
      ? (S ? S.notif_enabled  || 'Notifikasi aktif'    : 'Notifikasi aktif')
      : (S ? S.notif_disabled || 'Notifikasi nonaktif' : 'Notifikasi nonaktif')
    );
  }
}

/* ============================================================
   SETTINGS – SAVEDATA EDITABLE DESCRIPTION
   ============================================================ */
function toggleEditSavedataDesc() {
  const el  = document.getElementById('savedataLocalDescEl');
  const btn = document.getElementById('btnEditSavedataDesc');
  if (!el || !btn) return;

  const isEditing = el.getAttribute('contenteditable') === 'true';
  if (isEditing) {
    el.setAttribute('contenteditable', 'false');
    btn.innerHTML = '<img src="tabler-icon/pencil.svg" class="icon-svg" alt="" /> Edit Keterangan';
    // Persist custom description locally
    try { localStorage.setItem('savedataLocalDesc', el.textContent.trim()); } catch(e) {}
  } else {
    el.setAttribute('contenteditable', 'true');
    btn.innerHTML = '<img src="tabler-icon/circle-check.svg" class="icon-svg" alt="" /> Simpan Keterangan';
    el.focus();
    // Move cursor to end
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    if (sel) { sel.removeAllRanges(); sel.addRange(range); }
  }
}
