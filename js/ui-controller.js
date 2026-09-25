/* ============================================================
   UI CONTROLLER
   All DOM manipulation, rendering, and UI updates.
   No direct Firebase calls here — use firebase-service.js.
   ============================================================ */

/* ============================================================
   I18N (Bahasa)
   ============================================================ */
const STRINGS = {
  id:{
    app_title:"SmartBSF", app_sub:"Sistem Monitoring Maggot",
    progress_title:"Progress Produksi Manggot Anda",
    target_prefix:"Target:", btn_reset:"Atur Ulang",
    day_min:"Min", day_sen:"Sen", day_sel:"Sel", day_rab:"Rab",
    day_kam:"Kam", day_jum:"Jum", day_sab:"Sab",
    input_kg:"Jumlah (kg)", btn_simpan:"Simpan", btn_pdf:"Unduh Laporan PDF",
    menu_listrik:"Listrik", menu_produksi:"Produksi", menu_pendapatan:"Pendapatan", menu_kalkulator:"Kalkulator",
    listrik_sub:"Monitoring Motor Vibrator",
    status_diam:"Motor Diam", status_normal:"Motor Normal", status_bahaya:"Motor Bahaya",
    level_motor:"Level Motor", arus:"Arus", daya:"Daya", biaya_listrik:"Biaya Listrik",
    produksi_sub:"Performa Produksi Maggot", total_produksi:"Total Produksi",
    kecepatan:"Kecepatan", produksi_realtime:"Produksi Real-time",
    target_label_prod:"Target Produksi:", progress_target:"Progress Target",
    total_pendapatan:"Total Pendapatan",
    pendapatan_sub:"Pendapatan Usaha Anda",
    profil_usaha:"Profil Usaha", label_nama:"Nama Usaha", label_biopond:"Jumlah Biopond",
    label_prod_harian:"Produksi per Siklus", label_modal:"Modal Awal",
    label_kwh:"Harga 1 kWh", label_motor_watt:"Motor Vibrator", label_target:"Target Produksi",
    label_target_mingguan:"Target Manggot (Minggu)",
    settings_title:"Pengaturan",
    set_savedata:"Simpan Data", set_savedata_desc:"Penyimpanan lokal perangkat",
    set_notif:"Notifikasi", set_notif_desc:"Status motor & produksi",
    set_lang:"Bahasa / Language", set_lang_desc:"Indonesia / English",
    set_profil:"Pengaturan Profil", set_profil_desc:"Nama, target, modal, dan lainnya",
    set_unit:"Satuan (Unit)", set_unit_desc:"Metrik / Imperial",
    set_glosarium:"Glosarium Istilah", set_glosarium_desc:"Penjelasan istilah BEP & Revenue",
    glosarium_info_title:"Tentang Glosarium",
    glosarium_info_desc:"Daftar penjelasan istilah-istilah penting dalam sistem BEP dan analisis pendapatan usaha SmartBSF.",
    glosarium_list_title:"DAFTAR ISTILAH",
    btn_cancel:"Batal", btn_ok:"OK",
    savedata_local_title:"Penyimpanan Lokal",
    savedata_local_desc:"Data profil dan preferensi disimpan ke penyimpanan lokal perangkat untuk diakses saat offline.",
    savedata_local_label:"Simpan ke Perangkat",
    btn_edit_desc:"✏️ Edit Keterangan",
    notif_enable_label:"Aktifkan Notifikasi",
    notif_enable_desc:"Terima pemberitahuan status motor & produksi",
    notif_info_title:"ℹ Informasi Notifikasi",
    notif_info_body:"Notifikasi akan muncul secara otomatis saat ada perubahan status motor atau produksi. Kompatibel dengan Android dan web browser modern.",
    note_angka:"Gunakan tanda titik (.) sebagai pemisah ribuan. Contoh: 1.150.000. Untuk desimal gunakan koma (,).",
    btn_reset_profil:"Reset",
    modal_reset_profil_title:"Reset Profil?",
    modal_reset_profil_desc:"Semua data profil akan dikembalikan ke pengaturan awal.",
    btn_cancel_modal:"Tidak Jadi",
    btn_mengerti:"Mengerti",
    unit_confirm_title:"Konfirmasi Satuan",
    unit_confirm_desc:"Apakah yakin memilih satuan ini? Semua tampilan akan disesuaikan.",
    unit_sure:"Yakin", unit_not_sure:"Tidak Yakin",
    unit_choose:"Pilih Sistem Satuan",
    unit_desc:"Pilihan ini akan mempengaruhi seluruh tampilan satuan pada aplikasi.",
    unit_examples:"Contoh Satuan Metrik:",
    unit_examples_imp:"Contoh Satuan Imperial:",
    error_nama:"Nama Usaha harus ditulis menggunakan huruf, bukan angka.",
    error_biopond:"Jumlah Biopond harus berupa angka.",
    error_produksi:"Produksi per Siklus harus berupa angka.",
    error_modal:"Modal Awal harus berupa angka (gunakan titik sebagai pemisah ribuan).",
    error_kwh:"Harga 1 kWh harus berupa angka.",
    error_motor:"Motor Vibrator harus berupa angka.",
    error_target:"Target Produksi harus berupa angka.",
    error_target_mingguan:"Target Produksi Manggot (Mingguan) harus berupa angka.",
    btn_reset_calendar:"Reset Data Kalender",
    modal_reset_calendar_title:"Reset Data Kalender?",
    modal_reset_calendar_desc:"Semua data produksi (kg) pada kalender akan dihapus. Tindakan ini tidak dapat dibatalkan.",
    kalk_title:"Kalkulator Usaha",
    kalk_tab_basic:"Basic",
    kalk_tab_sci:"Scientific",
    kalk_tab_component:"Komponen Elektronik",
    kalk_tab_area:"Area",
    kalk_tab_biaya:"Biaya Listrik",
    kalk_mode_label:"Mode Hitung",
    kalk_mode_vi:"Arus Listrik (I)",
    kalk_mode_vp:"Daya Listrik (P)",
    kalk_mode_ip:"Tegangan Listrik (V)",
    kalk_mode_r:"Hambatan Listrik (R)",
    kalk_daya_label:"Daya (P) - Watt",
    kalk_teg_label:"Tegangan (V) - Volt",
    kalk_arus_label:"Arus (I) - Ampere",
    kalk_hitung:"Hitung",
    kalk_arus_key:"Arus (I)",
    kalk_hambatan_key:"Hambatan (R)",
    kalk_daya_key:"Daya (P)",
    kalk_teg_key:"Tegangan (V)",
    kalk_area_label:"Kalkulator Luas",
    kalk_area_3d:"Tampilan 3D",
    kalk_area_2d:"Tampilan 2D",
    kalk_area_shape:"Pilih Bentuk",
    kalk_area_rect:"Persegi Panjang",
    kalk_area_square:"Persegi",
    kalk_area_triangle:"Segitiga",
    kalk_area_circle:"Lingkaran",
    kalk_area_unit:"Satuan",
    kalk_area_width:"Lebar",
    kalk_area_height:"Tinggi",
    kalk_area_side:"Panjang Sisi",
    kalk_area_base:"Alas",
    kalk_area_radius:"Jari-jari",
    kalk_area_eg:"cth",
    kalk_hitung_area:"Hitung Luas",
    kalk_area_result:"Hasil Luas",
    kalk_perimeter_result:"Keliling",
    kalk_area_converted:"Konversi",
    kalk_biaya_daya:"Daya Perangkat (Watt)",
    kalk_biaya_jam:"Durasi Pemakaian (Jam/hari)",
    kalk_biaya_hari:"Jumlah Hari",
    kalk_biaya_tarif:"Tarif Listrik (Rp/kWh)",
    kalk_hitung_biaya:"Hitung Biaya",
    kalk_biaya_label:"Total Biaya Listrik",
    glosarium_title:"GLOSARIUM ISTILAH",
    glosarium_show:"Tampilkan",
    glosarium_hide:"Sembunyikan",
    glosarium_bep:"BEP (Break Even Point)",
    glosarium_bep_desc:"Titik impas dimana total pendapatan sama dengan total biaya. Pada titik ini, usaha tidak untung maupun rugi.",
    glosarium_fc:"FC (Fixed Cost / Biaya Tetap)",
    glosarium_fc_desc:"Biaya yang tidak berubah meskipun produksi naik atau turun, seperti sewa lahan, penyusutan alat, dan gaji tetap.",
    glosarium_vc:"VC (Variable Cost / Biaya Variabel)",
    glosarium_vc_desc:"Biaya yang berubah sesuai jumlah produksi, seperti pakan, listrik operasional, dan bahan baku per kilogram.",
    glosarium_margin:"Margin Kontribusi",
    glosarium_margin_desc:"Selisih antara harga jual per unit dengan biaya variabel per unit. Menunjukkan kontribusi setiap unit terhadap penutupan biaya tetap.",
    glosarium_revenue:"Revenue (Pendapatan)",
    glosarium_revenue_desc:"Total uang yang diterima dari penjualan produk, dihitung dari harga jual dikalikan jumlah produksi.",
    glosarium_profit:"Profit (Keuntungan)",
    glosarium_profit_desc:"Selisih antara total pendapatan dengan total biaya (FC + VC). Nilai positif berarti untung, negatif berarti rugi.",
    glosarium_q:"Q (Quantity / Kuantitas)",
    glosarium_q_desc:"Jumlah produksi aktual dalam satuan kilogram yang berhasil diproduksi dalam periode tertentu.",
    rev_product_type:"JENIS PENJUALAN USAHA ANDA",
    rev_bep_detail:"RINCIAN INDIKATOR BEP",
    rev_bep_chart:"GRAFIK BEP",
    rev_profit_history:"RIWAYAT PROFIT HARIAN USAHA ANDA",
    prod_per_siklus:"Produksi per Siklus",
    cycle_based:"Berbasis Siklus",
    unit_kg:"kg", unit_lb:"lb",
    rev_scenario:"ANALISIS SKENARIO USAHA ANDA",
    home_gauge_title:"Progress Produksi Manggot Anda",
    btn_masuk:"Masuk",
    auth_or:"atau",
    btn_google_login:"Masuk dengan Google",
    auth_no_account:"Belum punya akun?",
    auth_register_now:"Daftar sekarang",
    btn_register:"Daftar",
    auth_have_account:"Sudah punya akun?",
    auth_login_here:"Masuk di sini",
    splash_loading:"Memuat sistem...",
    equipment_label:"Alat",
    equipment_name_label:"Nama Alat",
    equipment_price_label:"Harga Alat (Rp)",
    equipment_age_label:"Umur Pakai (bulan)",
    equipment_name_placeholder:"Contoh: Timbangan Digital",
    equipment_price_placeholder:"Contoh: 500000",
    equipment_age_placeholder:"Contoh: 24",
    btn_hapus:"Hapus",
    equipment_empty_message:"Belum ada alat. Klik \"+ Tambah Alat\" untuk menambah.",
    /* --- i18n tahap 7: teks statis HTML --- */
    s_002:"Sistem Monitoring Maggot",
    s_009:"Masuk",
    s_010:"atau",
    s_011:"Daftar sekarang",
    s_012:"Konfirmasi Password",
    s_013:"Daftar",
    s_014:"Masuk di sini",
    s_016:"Mengerti",
    s_021:"Atur Ulang Produksi?",
    s_022:"Lingkaran progress ini akan direset ke posisi awal (0%). Namun, data produksi anda tidak akan dihapus.",
    s_019:"Tidak Jadi",
    s_020:"Yakin",
    s_023:"✏️ Ubah Profil Usaha?",
    s_024:"Yakin ingin mengubah profil usaha Anda?",
    s_025:"Tidak Yakin",
    s_046:"Sistem Monitoring Budidaya Maggot BSF",
    s_048:"Institusi",
    s_052:"Mitra",
    s_053:"Usaha Budidaya Maggot BSF, Bantul, DIY",
    s_054:"Versi",
    s_064:"Aktif:",
    s_065:"Nonaktif:",
    s_066:"⚠ Perlu diketahui:",
    s_068:"Progres Produksi Sedang Berjalan",
    s_070:"Pusat Bantuan",
    s_071:"Tim SmartBSF siap membantu",
    s_072:"Respons cepat via WhatsApp Business",
    s_073:"PILIH JENIS KENDALA",
    s_083:"Fitur Lanjutan",
    s_085:"ℹ Tentang Fitur BEP",
    s_087:"• BEP Rupiah",
    s_088:"• Skenario Usaha",
    s_089:"• Grafik BEP",
    s_090:"dimatikan",
    s_095:"tidak berubah",
    s_096:"Investasi Awal",
    s_097:"+ Tambah Alat",
    s_098:"Infrastruktur",
    s_099:"Biaya Infrastruktur (Rp/bulan)",
    s_100:"Gabungan biaya kandang, rak, box, dan fasilitas lainnya.",
    s_101:"Listrik Kandang",
    s_102:"Biaya Listrik Kandang (Rp/bulan)",
    s_103:"Total listrik yang digunakan untuk operasional kandang.",
    s_104:"Biaya Tetap Lainnya",
    s_105:"Biaya Tetap Lainnya (Rp/bulan)",
    s_106:"Gabungan biaya seperti sewa lahan, administrasi, dan biaya rutin lainnya.",
    s_107:"Total FC (Biaya Tetap/bulan)",
    s_108:"= FC1 (Investasi) + FC2 (Infrastruktur) + FC3 (Listrik Tetap) + FC4 (Lainnya)",
    s_109:"dapat berubah sesuai jumlah produksi",
    s_110:"Pakan",
    s_111:"Biaya Pakan (Rp/kg)",
    s_112:"Operasional Produksi",
    s_113:"Biaya Operasional (Rp/kg)",
    s_114:"Gabungan air, listrik produksi, dan maintenance.",
    s_115:"Tenaga Kerja",
    s_116:"Upah per Hari (Rp)",
    s_117:"Hari Kerja per Bulan",
    s_118:"Biaya Variabel Lainnya",
    s_119:"Biaya Variabel Lainnya (Rp/kg)",
    s_120:"Gabungan transportasi, kemasan, dan bahan tambahan.",
    s_121:"Total VC (Biaya Variabel/kg)",
    s_123:"= VC1 (Pakan) + VC2 (Operasional) + VC3 (TK/kg) + VC4 (Lainnya)",
    s_124:"Harga jual produk per kg",
    s_125:"Harga Jual (Rp/kg)",
    s_126:"Jumlah produksi usaha Anda",
    s_127:"Produksi per Bulan (kg)",
    s_128:"Tingkat Keberhasilan",
    s_129:"Tingkat Keberhasilan (%)",
    s_130:"Target Profit",
    s_131:"Target Profit (Rp/bulan)",
    s_132:"Hasil Perhitungan BEP Otomatis",
    s_133:"Metrik",
    s_149:"Koloni BSF kamu berjalan dengan baik hari ini. Yuk pantau progresnya.",
    s_151:"Sudah Panen",
    s_154:"Hari Berjalan",
    s_156:"Keberhasilan",
    s_158:"Target Panen Siklus Ini",
    s_159:"Progress Produksi",
    s_163:"Dicapai",
    s_164:"Sisa target",
    s_168:"Simpan",
    s_170:"Beranda",
    s_171:"Listrik",
    s_172:"Produksi",
    s_173:"Pendapatan",
    s_174:"Kalkulator",
    s_175:"Data Produksi",
    s_176:"Monitoring Real-time",
    s_177:"BERAT MAGGOT SEKARANG",
    s_178:"Total berat larva maggot saat ini",
    s_180:"Ringkasan Produksi",
    s_181:"Total Produksi",
    s_182:"Akumulasi hari ini",
    s_183:"Kecepatan",
    s_185:"Real-time saat ini",
    s_186:"Hari Aktif",
    s_187:"hari",
    s_189:"Tingkat sukses siklus",
    s_194:"Rata-rata",
    s_195:"Maks",
    s_196:"MOTOR VIBRATOR",
    s_197:"Status & Kontrol Motor",
    s_201:"0 — Diam",
    s_202:"3 — Maks",
    s_205:"Aliran listrik motor",
    s_206:"Daya",
    s_207:"Konsumsi watt motor",
    s_208:"Tegangan",
    s_209:"Voltase sumber listrik",
    s_210:"Biaya Listrik",
    s_211:"TARIF/kWh",
    s_213:"Per Jam",
    s_214:"Per Hari",
    s_215:"Est. Bulan",
    s_216:"Panduan Motor",
    s_218:"Sesuaikan dengan tarif PLN golongan Anda",
    s_223:"PENDAPATAN USAHA ANDA",
    s_224:"Siklus Aktif · PKM-PI UMY",
    s_225:"Profit Bersih Hari Ini",
    s_228:"Pendapatan Per Produk",
    s_229:"Total Pendapatan Kotor",
    s_230:"Progress Target Siklus",
    s_232:"Profit Sekarang",
    s_233:"Profit bersih hari ini",
    s_235:"Modal Kembali",
    s_236:"Sudah menutup biaya produksi",
    s_237:"Target Profit Siklus",
    s_238:"Tujuan akhir siklus ini",
    s_239:"Ringkasan Minggu Ini",
    s_240:"Rekap kinerja usaha 7 hari",
    s_241:"Semua penjualan 7 hari",
    s_242:"Total Modal Terpakai",
    s_243:"Biaya produksi 7 hari",
    s_244:"Total Profit Bersih",
    s_245:"Yang benar-benar kamu dapat",
    s_246:"Rata-rata Profit per Hari",
    s_247:"Perkiraan penghasilan harian",
    s_248:"Hari Profit Tertinggi",
    s_249:"Performa terbaik minggu ini",
    s_251:"BREAK EVEN POINT (BEP)",
    s_252:"Break Even Point (BEP) · Analisis Usaha",
    s_253:"Profit Bersih Siklus Ini",
    s_254:"Selisih pendapatan dikurangi total biaya produksi",
    s_256:"Ringkasan BEP",
    s_257:"Otomatis",
    s_259:"Minimum produksi impas (kg)",
    s_260:"kg / siklus",
    s_261:"BEP Rupiah",
    s_262:"Minimum pendapatan impas",
    s_263:"pendapatan min.",
    s_264:"Margin Kontribusi",
    s_265:"Kontribusi per kg ke biaya tetap",
    s_267:"Grafik BEP",
    s_268:"Pendapatan vs Biaya",
    s_269:"Total Biaya",
    s_270:"Biaya Tetap",
    s_271:"Detail Perhitungan",
    s_272:"Komponen biaya & produksi",
    s_273:"Biaya VC per Unit",
    s_275:"Margin Nilai",
    s_276:"Harga − VC per unit",
    s_278:"Persentase kontribusi margin",
    s_280:"Total Pendapatan",
    s_281:"Harga × Q produksi real",
    s_282:"Skenario Produksi",
    s_283:"3 Skenario",
    s_284:"Normal (Harga Stabil)",
    s_285:"BEP pada harga jual saat ini",
    s_286:"Harga 100%",
    s_287:"Buruk (Harga −20%)",
    s_288:"BEP jika harga turun 20%",
    s_289:"Harga 80%",
    s_290:"Bagus (Harga +20%)",
    s_291:"BEP jika harga naik 20%",
    s_292:"Harga 120%",
    s_293:"Produksi Real (SR)",
    s_294:"Setelah faktor keberhasilan",
    s_297:"Produksi untuk capai target profit",
    s_298:"Profil Usaha",
    s_299:"Ubah Nama Profil",
    s_300:"Ubah Foto Profil",
    s_301:"Ubah Wallpaper",
    s_303:"Pengusaha Pintar",
    s_307:"Fitur tambahan untuk usaha",
    s_308:"Glosarium Istilah",
    s_309:"Penjelasan istilah BEP & Revenue",
    s_310:"Notifikasi",
    s_311:"Status motor & produksi",
    s_312:"Pengaturan Profil",
    s_313:"Nama, target, modal, dan lainnya",
    s_314:"Hubungi support via WhatsApp",
    s_315:"Satuan (Unit)",
    s_316:"Metrik / Imperial",
    s_317:"Simpan Data",
    s_318:"Penyimpanan lokal perangkat",
    s_319:"Lisensi & informasi aplikasi",
    s_320:"Akun",
    s_321:"Tutup",
    s_322:"Masukkan nama baru untuk usaha Anda",
    s_323:"Nama Usaha",
    s_324:"Batal",
    s_325:"Pilih foto dari galeri atau masukkan URL gambar publik. Ketuk preview untuk fullscreen.",
    s_326:"Pilih Foto dari Galeri",
    s_327:"JPG, PNG, WebP - maksimal 2 MB",
    s_328:"Atau URL Foto",
    s_329:"Hapus foto profil",
    s_330:"Upload foto atau pilih tema warna (format 16:9)",
    s_331:"Upload Foto Wallpaper",
    s_332:"Format 16:9 disarankan · JPG, PNG",
    s_333:"Atau Pilih Tema Warna",
    s_334:"Terapkan",
    s_335:"🖼️ URL Wallpaper",
    s_336:"Masukkan URL gambar landscape dari Imgur, Unsplash, atau CDN publik.",
    s_337:"Hapus wallpaper (gunakan default)",
    /* --- tahap 8: login/lupa password/placeholder --- */
    auth_google:"Masuk dengan Google",
    auth_no_account:"Belum punya akun?",
    auth_have_account:"Sudah punya akun?",
    auth_forgot:"Lupa password?",
    ph_5:"Masukkan password",
    ph_6:"Minimal 6 karakter",
    ph_7:"Ketik ulang password",
    ph_8:"cth: 250",
    ph_9:"cth: 8",
    ph_10:"cth: 30",
    ph_11:"cth: 1444",
    ph_12:"Jumlah Biopond",
    ph_13:"Contoh: 200",
    ph_14:"Contoh: 50",
    ph_15:"Contoh: 150000",
    ph_16:"Contoh: 140000",
    ph_17:"Contoh: 250000",
    ph_18:"Contoh: 500",
    ph_19:"Contoh: 450",
    ph_20:"Contoh: 50000",
    ph_21:"Contoh: 20",
    ph_22:"Contoh: 350",
    ph_23:"Contoh: 5000",
    ph_24:"Contoh: 100",
    ph_25:"Contoh: 100",
    ph_26:"Contoh: 500000",
    ph_27:"cth: Usaha BSF Maju",
  },
  en:{
    app_title:"SmartBSF", app_sub:"Maggot Monitoring System",
    progress_title:"Your Maggot Production Progress",
    target_prefix:"Target:", btn_reset:"Reset",
    day_min:"Sun", day_sen:"Mon", day_sel:"Tue", day_rab:"Wed",
    day_kam:"Thu", day_jum:"Fri", day_sab:"Sat",
    input_kg:"Amount (kg)", btn_simpan:"Save", btn_pdf:"Download PDF Report",
    menu_listrik:"Electric", menu_produksi:"Production", menu_pendapatan:"Revenue", menu_kalkulator:"Calculator",
    listrik_sub:"Motor Vibrator Monitoring",
    status_diam:"Motor Idle", status_normal:"Motor Normal", status_bahaya:"Motor Danger",
    level_motor:"Motor Level", arus:"Current", daya:"Power", biaya_listrik:"Electricity Cost",
    produksi_sub:"Maggot Production Performance", total_produksi:"Total Production",
    kecepatan:"Speed", produksi_realtime:"Real-time Production",
    target_label_prod:"Production Target:", progress_target:"Target Progress",
    total_pendapatan:"Total Revenue",
    pendapatan_sub:"Your Business Revenue",
    profil_usaha:"Business Profile", label_nama:"Business Name", label_biopond:"Biopond Count",
    label_prod_harian:"Production per Cycle", label_modal:"Initial Capital",
    label_kwh:"Price per kWh", label_motor_watt:"Vibrator Motor", label_target:"Production Target",
    label_target_mingguan:"Weekly Maggot Target",
    settings_title:"Settings",
    set_savedata:"Save Data", set_savedata_desc:"Local device storage",
    set_notif:"Notifications", set_notif_desc:"Motor status & production",
    set_lang:"Language / Bahasa", set_lang_desc:"English / Indonesia",
    set_profil:"Profile Settings", set_profil_desc:"Name, target, capital, and more",
    set_unit:"Unit (Satuan)", set_unit_desc:"Metric / Imperial",
    set_glosarium:"Glossary of Terms", set_glosarium_desc:"Explanation of BEP & Revenue terms",
    glosarium_info_title:"About Glossary",
    glosarium_info_desc:"List of important terms in the BEP system and SmartBSF business revenue analysis.",
    glosarium_list_title:"TERMS LIST",
    btn_cancel:"Cancel", btn_ok:"OK",
    savedata_local_title:"Local Storage",
    savedata_local_desc:"Profile data and preferences are saved locally on the device for offline access.",
    savedata_local_label:"Save to Device",
    btn_edit_desc:"✏️ Edit Description",
    notif_enable_label:"Enable Notifications",
    notif_enable_desc:"Receive motor status & production alerts",
    notif_info_title:"ℹ Notification Info",
    notif_info_body:"Notifications appear automatically when motor status or production changes. Compatible with Android and modern web browsers.",
    note_angka:"Use a period (.) as thousand separator. Example: 1.150.000. For decimals use a comma (,).",
    btn_reset_profil:"Reset",
    modal_reset_profil_title:"Reset Profile?",
    modal_reset_profil_desc:"All profile data will be reset to default settings.",
    btn_cancel_modal:"Cancel",
    btn_mengerti:"Understood",
    unit_confirm_title:"Confirm Unit",
    unit_confirm_desc:"Are you sure you want to select this unit? All displays will be adjusted.",
    unit_sure:"Yes, sure", unit_not_sure:"Not sure",
    unit_choose:"Choose Unit System",
    unit_desc:"This choice will affect all unit displays throughout the app.",
    unit_examples:"Metric Unit Examples:",
    unit_examples_imp:"Imperial Unit Examples:",
    error_nama:"Business name must be written using letters, not numbers.",
    error_biopond:"Biopond count must be a number.",
    error_produksi:"Daily production must be a number.",
    error_modal:"Initial capital must be a number (use period as thousand separator).",
    error_kwh:"Price per kWh must be a number.",
    error_motor:"Motor vibrator must be a number.",
    error_target:"Production target must be a number.",
    error_target_mingguan:"Weekly maggot production target must be a number.",
    btn_reset_calendar:"Reset Calendar Data",
    modal_reset_calendar_title:"Reset Calendar Data?",
    modal_reset_calendar_desc:"All production (kg) data in the calendar will be deleted. This action cannot be undone.",
    kalk_title:"Business Calculator",
    kalk_tab_basic:"Basic",
    kalk_tab_sci:"Scientific",
    kalk_tab_component:"Electronic Components",
    kalk_tab_area:"Area",
    kalk_tab_biaya:"Electricity Cost",
    kalk_mode_label:"Calculation Mode",
    kalk_mode_vi:"Current (I)",
    kalk_mode_vp:"Power (P)",
    kalk_mode_ip:"Voltage (V)",
    kalk_mode_r:"Resistance (R)",
    kalk_daya_label:"Power (P) - Watt",
    kalk_teg_label:"Voltage (V) - Volt",
    kalk_arus_label:"Current (I) - Ampere",
    kalk_hitung:"Calculate",
    kalk_arus_key:"Current (I)",
    kalk_hambatan_key:"Resistance (R)",
    kalk_daya_key:"Power (P)",
    kalk_teg_key:"Voltage (V)",
    kalk_area_label:"Area Calculator",
    kalk_area_3d:"3D View",
    kalk_area_2d:"2D View",
    kalk_area_shape:"Select Shape",
    kalk_area_rect:"Rectangle",
    kalk_area_square:"Square",
    kalk_area_triangle:"Triangle",
    kalk_area_circle:"Circle",
    kalk_area_unit:"Unit",
    kalk_area_width:"Width",
    kalk_area_height:"Height",
    kalk_area_side:"Side Length",
    kalk_area_base:"Base",
    kalk_area_radius:"Radius",
    kalk_area_eg:"e.g",
    kalk_hitung_area:"Calculate Area",
    kalk_area_result:"Area Result",
    kalk_perimeter_result:"Perimeter",
    kalk_area_converted:"Converted",
    kalk_biaya_daya:"Device Power (Watt)",
    kalk_biaya_jam:"Usage Duration (Hours/day)",
    kalk_biaya_hari:"Number of Days",
    kalk_biaya_tarif:"Electricity Rate (Rp/kWh)",
    kalk_hitung_biaya:"Calculate Cost",
    kalk_biaya_label:"Total Electricity Cost",
    glosarium_title:"GLOSSARY OF TERMS",
    glosarium_show:"Show",
    glosarium_hide:"Hide",
    glosarium_bep:"BEP (Break Even Point)",
    glosarium_bep_desc:"The break-even point where total revenue equals total cost. At this point, the business neither profits nor loses.",
    glosarium_fc:"FC (Fixed Cost)",
    glosarium_fc_desc:"Costs that don't change regardless of production volume, such as land rent, equipment depreciation, and fixed salaries.",
    glosarium_vc:"VC (Variable Cost)",
    glosarium_vc_desc:"Costs that change according to production volume, such as feed, operational electricity, and raw materials per kilogram.",
    glosarium_margin:"Contribution Margin",
    glosarium_margin_desc:"The difference between selling price per unit and variable cost per unit. Shows each unit's contribution toward covering fixed costs.",
    glosarium_revenue:"Revenue",
    glosarium_revenue_desc:"Total money received from product sales, calculated as selling price multiplied by production quantity.",
    glosarium_profit:"Profit",
    glosarium_profit_desc:"The difference between total revenue and total costs (FC + VC). Positive value means profit, negative means loss.",
    glosarium_q:"Q (Quantity)",
    glosarium_q_desc:"Actual production quantity in kilograms successfully produced within a specific period.",
    rev_product_type:"YOUR BUSINESS PRODUCT TYPE",
    rev_bep_detail:"BEP INDICATOR DETAILS",
    rev_bep_chart:"BEP CHART",
    rev_profit_history:"YOUR BUSINESS DAILY PROFIT HISTORY",
    prod_per_siklus:"Production per Cycle",
    cycle_based:"Cycle Based",
    unit_kg:"kg", unit_lb:"lb",
    rev_scenario:"YOUR BUSINESS SCENARIO ANALYSIS",
    home_gauge_title:"Your Maggot Production Progress",
    btn_masuk:"Login",
    auth_or:"or",
    btn_google_login:"Continue with Google",
    auth_no_account:"Don't have an account?",
    auth_register_now:"Register now",
    btn_register:"Register",
    auth_have_account:"Already have an account?",
    auth_login_here:"Login here",
    splash_loading:"Loading system...",
    equipment_label:"Equipment",
    equipment_name_label:"Equipment Name",
    equipment_price_label:"Equipment Price (Rp)",
    equipment_age_label:"Lifespan (months)",
    equipment_name_placeholder:"Example: Digital Scale",
    equipment_price_placeholder:"Example: 500000",
    equipment_age_placeholder:"Example: 24",
    btn_hapus:"Delete",
    equipment_empty_message:"No equipment yet. Click \"+ Add Equipment\" to add one.",
    /* --- i18n tahap 7: teks statis HTML --- */
    s_002:"Maggot Monitoring System",
    s_009:"Sign In",
    s_010:"or",
    s_011:"Sign up now",
    s_012:"Confirm Password",
    s_013:"Sign Up",
    s_014:"Sign in here",
    s_016:"Got it",
    s_021:"Reset Production?",
    s_022:"This progress circle will be reset to its starting position (0%). Your production data will not be deleted.",
    s_019:"Never Mind",
    s_020:"Confirm",
    s_023:"✏️ Edit Business Profile?",
    s_024:"Are you sure you want to change your business profile?",
    s_025:"Not Sure",
    s_046:"BSF Maggot Farming Monitoring System",
    s_048:"Institution",
    s_052:"Partner",
    s_053:"BSF Maggot Farming Business, Bantul, DIY",
    s_054:"Version",
    s_064:"Active:",
    s_065:"Inactive:",
    s_066:"⚠ Please note:",
    s_068:"Ongoing Production Progress",
    s_070:"Help Center",
    s_071:"The SmartBSF team is ready to help",
    s_072:"Fast response via WhatsApp Business",
    s_073:"CHOOSE ISSUE TYPE",
    s_083:"Advanced Features",
    s_085:"ℹ About the BEP Feature",
    s_087:"• BEP in Rupiah",
    s_088:"• Business Scenarios",
    s_089:"• BEP Chart",
    s_090:"turned off",
    s_095:"unchanged",
    s_096:"Initial Investment",
    s_097:"+ Add Equipment",
    s_098:"Infrastructure",
    s_099:"Infrastructure Cost (Rp/month)",
    s_100:"Combined cost of housing, racks, boxes, and other facilities.",
    s_101:"Housing Electricity",
    s_102:"Housing Electricity Cost (Rp/month)",
    s_103:"Total electricity used for housing operations.",
    s_104:"Other Fixed Costs",
    s_105:"Other Fixed Costs (Rp/month)",
    s_106:"Combined costs such as land rent, administration, and other recurring expenses.",
    s_107:"Total FC (Fixed Costs/month)",
    s_108:"= FC1 (Investment) + FC2 (Infrastructure) + FC3 (Fixed Electricity) + FC4 (Other)",
    s_109:"may change with production volume",
    s_110:"Feed",
    s_111:"Feed Cost (Rp/kg)",
    s_112:"Production Operations",
    s_113:"Operating Cost (Rp/kg)",
    s_114:"Combined water, production electricity, and maintenance.",
    s_115:"Labor",
    s_116:"Wage per Day (Rp)",
    s_117:"Working Days per Month",
    s_118:"Other Variable Costs",
    s_119:"Other Variable Costs (Rp/kg)",
    s_120:"Combined transportation, packaging, and additional materials.",
    s_121:"Total VC (Variable Cost/kg)",
    s_123:"= VC1 (Feed) + VC2 (Operations) + VC3 (Labor/kg) + VC4 (Other)",
    s_124:"Product selling price per kg",
    s_125:"Selling Price (Rp/kg)",
    s_126:"Your business's production volume",
    s_127:"Production per Month (kg)",
    s_128:"Success Rate",
    s_129:"Success Rate (%)",
    s_130:"Profit Target",
    s_131:"Profit Target (Rp/month)",
    s_132:"Automatic BEP Calculation Results",
    s_133:"Metric",
    s_149:"Your BSF colony is doing well today. Let's check its progress.",
    s_151:"Harvested",
    s_154:"Days Running",
    s_156:"Success",
    s_158:"Harvest Target This Cycle",
    s_159:"Production Progress",
    s_163:"Achieved",
    s_164:"Remaining target",
    s_168:"Save",
    s_170:"Home",
    s_171:"Power",
    s_172:"Production",
    s_173:"Revenue",
    s_174:"Calculator",
    s_175:"Production Data",
    s_176:"Real-time Monitoring",
    s_177:"CURRENT MAGGOT WEIGHT",
    s_178:"Total weight of maggot larvae right now",
    s_180:"Production Summary",
    s_181:"Total Production",
    s_182:"Accumulated today",
    s_183:"Speed",
    s_185:"Real-time now",
    s_186:"Active Days",
    s_187:"days",
    s_189:"Cycle success rate",
    s_194:"Average",
    s_195:"Max",
    s_196:"VIBRATOR MOTOR",
    s_197:"Motor Status & Control",
    s_201:"0 — Idle",
    s_202:"3 — Max",
    s_205:"Motor electrical current",
    s_206:"Power",
    s_207:"Motor wattage consumption",
    s_208:"Voltage",
    s_209:"Power source voltage",
    s_210:"Electricity Cost",
    s_211:"RATE/kWh",
    s_213:"Per Hour",
    s_214:"Per Day",
    s_215:"Est. Month",
    s_216:"Motor Guide",
    s_218:"Adjust to your PLN tariff group",
    s_223:"YOUR BUSINESS REVENUE",
    s_224:"Active Cycle · PKM-PI UMY",
    s_225:"Net Profit Today",
    s_228:"Revenue Per Product",
    s_229:"Total Gross Revenue",
    s_230:"Cycle Target Progress",
    s_232:"Current Profit",
    s_233:"Net profit today",
    s_235:"Capital Recovered",
    s_236:"Production costs already covered",
    s_237:"Cycle Profit Target",
    s_238:"Final goal of this cycle",
    s_239:"This Week's Summary",
    s_240:"7-day business performance recap",
    s_241:"All sales over 7 days",
    s_242:"Total Capital Used",
    s_243:"7-day production costs",
    s_244:"Total Net Profit",
    s_245:"What you actually earn",
    s_246:"Average Profit per Day",
    s_247:"Estimated daily income",
    s_248:"Most Profitable Day",
    s_249:"Best performance this week",
    s_251:"BREAK EVEN POINT (BEP)",
    s_252:"Break Even Point (BEP) · Business Analysis",
    s_253:"Net Profit This Cycle",
    s_254:"Revenue minus total production costs",
    s_256:"BEP Summary",
    s_257:"Automatic",
    s_259:"Minimum break-even production (kg)",
    s_260:"kg / cycle",
    s_261:"BEP in Rupiah",
    s_262:"Minimum break-even revenue",
    s_263:"min. revenue",
    s_264:"Contribution Margin",
    s_265:"Contribution per kg toward fixed costs",
    s_267:"BEP Chart",
    s_268:"Revenue vs Cost",
    s_269:"Total Cost",
    s_270:"Fixed Cost",
    s_271:"Calculation Details",
    s_272:"Cost & production components",
    s_273:"VC Cost per Unit",
    s_275:"Value Margin",
    s_276:"Price − VC per unit",
    s_278:"Margin contribution percentage",
    s_280:"Total Revenue",
    s_281:"Price × actual production Q",
    s_282:"Production Scenarios",
    s_283:"3 Scenarios",
    s_284:"Normal (Stable Price)",
    s_285:"BEP at the current selling price",
    s_286:"Price 100%",
    s_287:"Poor (Price −20%)",
    s_288:"BEP if the price drops 20%",
    s_289:"Price 80%",
    s_290:"Good (Price +20%)",
    s_291:"BEP if the price rises 20%",
    s_292:"Price 120%",
    s_293:"Actual Production (SR)",
    s_294:"After the success factor",
    s_297:"Production needed to reach the profit target",
    s_298:"Business Profile",
    s_299:"Change Profile Name",
    s_300:"Change Profile Photo",
    s_301:"Change Wallpaper",
    s_303:"Smart Entrepreneur",
    s_307:"Extra features for your business",
    s_308:"Term Glossary",
    s_309:"Explanation of BEP & Revenue terms",
    s_310:"Notifications",
    s_311:"Motor & production status",
    s_312:"Profile Settings",
    s_313:"Name, target, capital, and more",
    s_314:"Contact support via WhatsApp",
    s_315:"Unit",
    s_316:"Metric / Imperial",
    s_317:"Save Data",
    s_318:"Local device storage",
    s_319:"License & app information",
    s_320:"Account",
    s_321:"Close",
    s_322:"Enter a new name for your business",
    s_323:"Business Name",
    s_324:"Cancel",
    s_325:"Choose a photo from your gallery or enter a public image URL. Tap the preview for fullscreen.",
    s_326:"Choose Photo from Gallery",
    s_327:"JPG, PNG, WebP - max 2 MB",
    s_328:"Or Photo URL",
    s_329:"Remove profile photo",
    s_330:"Upload a photo or choose a color theme (16:9 format)",
    s_331:"Upload Wallpaper Photo",
    s_332:"16:9 format recommended · JPG, PNG",
    s_333:"Or Choose a Color Theme",
    s_334:"Apply",
    s_335:"🖼️ Wallpaper URL",
    s_336:"Enter a landscape image URL from Imgur, Unsplash, or a public CDN.",
    s_337:"Remove wallpaper (use default)",
    /* --- tahap 8: login/lupa password/placeholder --- */
    auth_google:"Sign in with Google",
    auth_no_account:"Don't have an account?",
    auth_have_account:"Already have an account?",
    auth_forgot:"Forgot password?",
    ph_5:"Enter password",
    ph_6:"At least 6 characters",
    ph_7:"Retype password",
    ph_8:"e.g.: 250",
    ph_9:"e.g.: 8",
    ph_10:"e.g.: 30",
    ph_11:"e.g.: 1444",
    ph_12:"Number of biopond",
    ph_13:"Example: 200",
    ph_14:"Example: 50",
    ph_15:"Example: 150000",
    ph_16:"Example: 140000",
    ph_17:"Example: 250000",
    ph_18:"Example: 500",
    ph_19:"Example: 450",
    ph_20:"Example: 50000",
    ph_21:"Example: 20",
    ph_22:"Example: 350",
    ph_23:"Example: 5000",
    ph_24:"Example: 100",
    ph_25:"Example: 100",
    ph_26:"Example: 500000",
    ph_27:"e.g.: Maju BSF Business",
  }
};

/* ============================================================
   GLOBAL STATE - SINGLE SOURCE OF TRUTH
   ============================================================ */
const GlobalState = {
  _state: {
    language: localStorage.getItem("lang") || "id",
    unit: localStorage.getItem("unit") || "metric"
  },
  
  _observers: [],
  
  get language() { return this._state.language; },
  get unit() { return this._state.unit; },
  
  setLanguage(lang) {
    if (this._state.language !== lang) {
      this._state.language = lang;
      localStorage.setItem("lang", lang);
      this._notifyObservers("language", lang);
    }
  },
  
  setUnit(unit) {
    if (this._state.unit !== unit) {
      this._state.unit = unit;
      localStorage.setItem("unit", unit);
      this._notifyObservers("unit", unit);
    }
  },
  
  subscribe(callback) {
    this._observers.push(callback);
  },
  
  _notifyObservers(key, value) {
    this._observers.forEach(callback => callback(key, value));
  }
};

// Backward compatibility variables
let currentLang = GlobalState.language;
let currentUnit = GlobalState.unit;

// Auto-update UI when state changes
GlobalState.subscribe((key, value) => {
  if (key === "language") {
    currentLang = value;
    applyI18n();
  } else if (key === "unit") {
    currentUnit = value;
    applyUnitToAllPages();
  }
});

function updateArusMode(){
  const arusText = document.getElementById("arusText");
  if(!arusText) return;
  const unit = GlobalState.unit;
  const S = STRINGS[GlobalState.language] || STRINGS["id"] || {};
  const label = S["arus"] || "Arus";
  const arusLabel = document.querySelector("[data-i18n='arus']");
  if(arusLabel) arusLabel.innerText = label;
}

function applyI18n(){
  const S = STRINGS[GlobalState.language];
  document.querySelectorAll("[data-i18n]").forEach(el=>{
    const key = el.getAttribute("data-i18n");
    if(S[key] !== undefined) el.innerText = S[key];
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el=>{
    const key = el.getAttribute("data-i18n-placeholder");
    if(S[key] !== undefined) el.placeholder = S[key];
  });
  document.querySelectorAll("option[data-i18n]").forEach(el=>{
    const key = el.getAttribute("data-i18n");
    if(S[key] !== undefined) el.innerText = S[key];
  });
  updateArusMode();
  const calResetTitle = document.getElementById("calResetTitle");
  const calResetDesc = document.getElementById("calResetDesc");
  const calResetCancel = document.getElementById("calResetCancel");
  const calResetConfirm = document.getElementById("calResetConfirm");
  if(calResetTitle) calResetTitle.innerText = S["modal_reset_calendar_title"] || "Reset Data Kalender?";
  if(calResetDesc) calResetDesc.innerText = S["modal_reset_calendar_desc"] || "";
  if(calResetCancel) calResetCancel.innerText = S["btn_cancel_modal"] || "Tidak Jadi";
  if(calResetConfirm) calResetConfirm.innerText = S["unit_sure"] || "Yakin";
}

function selectLang(lang){
  GlobalState.setLanguage(lang);
  document.getElementById("langOptId").classList.toggle("selected", lang==="id");
  document.getElementById("langOptEn").classList.toggle("selected", lang==="en");
  // Task 8: sync language ke Firebase
  if (typeof savePreferencesToFirebase === "function" && typeof currentUserId !== "undefined" && currentUserId) {
    savePreferencesToFirebase({ language: lang });
  }
  showToast(lang==="id" ? "Bahasa diubah ke Indonesia" : "Language changed to English");
}







/* ============================================================
   PAGE NAVIGATION  (FIXED v2)
   ============================================================
   ROUTING MAP — old menu IDs are redirected to new UI pages.
   Settings sub-pages are still resolved by their exact IDs.
   ============================================================ */

// Pages that map to new-UI sections
const OLD_TO_NEW_MAP = {
  "home":       "home-page",
  "listrik":    "elektrikal-page",
  "produksi":   "produksi-page",
  "pendapatan": "pendapatan-page",
  "profil":     "profil-page"
};

function showPage(p){
  // Reroute old page IDs to new UI equivalents
  const resolvedId = OLD_TO_NEW_MAP[p] || p;

  // Hide all pages: remove active class + clear any leftover inline display styles
  document.querySelectorAll(".page").forEach(x=>{
    x.classList.remove("active");
    x.style.display   = "";   // Remove inline override — CSS .page handles display:none
    x.style.opacity   = "";   // Remove inline override — CSS .page handles opacity:0
    x.style.visibility = "";  // Remove inline override — CSS .page handles visibility:hidden
  });

  const el = document.getElementById(resolvedId);
  if(!el){
    console.warn("showPage: page not found:", resolvedId, "(requested:", p + ")");
    // Last-resort fallback: show home-page
    const home = document.getElementById("home-page");
    if(home){ home.classList.add("active"); }
    return;
  }

  // Add active class — CSS .page.active / section.page.active handles ALL visibility
  el.classList.add("active");

  // ── [PERBAIKAN SCROLL] Reset posisi scroll setiap kali pindah halaman ───────
  // Sebelumnya showPage() tidak pernah me-reset scroll: jika user scroll ke
  // bawah di satu halaman lalu pindah (mis. lewat bottom-nav), halaman baru
  // langsung terbuka di posisi scroll lama (di-clamp ke tinggi halaman baru)
  // alih-alih dari atas. Ini yang membuat scroll terasa "loncat"/tidak
  // konsisten — sama persis baik di DevTools maupun di HP asli, karena ini
  // murni bug JS, bukan soal rendering perangkat.
  // window.scrollTo dipakai karena scroll sesungguhnya terjadi di level
  // dokumen (lihat catatan overflow-y di css/style.css bagian .page.active),
  // tapi el.scrollTop juga di-reset untuk jaga-jaga bila suatu saat sebuah
  // .page benar-benar jadi scroll container sendiri (mis. modal fullscreen).
  if (typeof window.scrollTo === "function") {
    window.scrollTo(0, 0);
  }
  el.scrollTop = 0;
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  // ── Sync bottom-nav .on state ──────────────────────────────────────────────
  // Keeps bnav buttons in sync even when navigating via back-buttons or shortcuts
  // profil-page removed from bnav — accessed via nav-ava in home header instead
  const bnavMap = {
    "home-page": 0, "elektrikal-page": 1,
    "produksi-page": 2, "pendapatan-page": 3
  };
  const bnavContainer = document.querySelector(".bnav");
  if(bnavContainer && bnavMap[resolvedId] !== undefined){
    bnavContainer.querySelectorAll(".bn").forEach(b=>b.classList.remove("on"));
    const btns = bnavContainer.querySelectorAll(".bn");
    if(btns[bnavMap[resolvedId]]) btns[bnavMap[resolvedId]].classList.add("on");
  }

  // ── Page-specific hooks (old pages) ──
  if(resolvedId==="settings-notif")    refreshNotifPreview();
  if(resolvedId==="settings-profil")   loadProfilInputs();
  if(resolvedId==="settings-unit")     updateUnitUI();
  if(resolvedId==="settings-language"){
    const loi=document.getElementById("langOptId");
    const loe=document.getElementById("langOptEn");
    if(loi) loi.classList.toggle("selected", GlobalState.language==="id");
    if(loe) loe.classList.toggle("selected", GlobalState.language==="en");
  }
  if(resolvedId==="settings-helpcenter" && typeof hcRefreshPreview==="function"){
    hcRefreshPreview();
  }

  // ── Page-specific hooks (new UI pages) ──
  if(resolvedId==="home-page")       initNewHomePage();
  if(resolvedId==="produksi-page")   initNewProduksiPage();
  if(resolvedId==="elektrikal-page") initNewElektrikalPage();
  if(resolvedId==="pendapatan-page") initNewPendapatanPage();
  if(resolvedId==="profil-page")     initNewProfilPage();

  // Re-apply BEP visibility state on every navigation
  if(typeof updateBEPUI === "function") updateBEPUI();

  console.log("✓ showPage:", resolvedId);
}

// Expose as window property so integration-bootstrap and inline onclick can always reach it
window.showPage = showPage;



/* ============================================================
   MODAL HELPERS
   ============================================================ */
function openModal(id){ const el = document.getElementById(id); if(el) el.classList.add("show"); }
function closeModal(id){ const el = document.getElementById(id); if(el) el.classList.remove("show"); }



/* ============================================================
   TOAST
   ============================================================ */
/* i18n tahap 7: terjemahan toast (kalimat JS berbahasa Indonesia -> English saat bahasa=en) */
const TOAST_EN = {
 "Pilih tanggal dulu ya!": "Please pick a date first!",
 "Angka tidak valid": "Invalid number",
 "Login diperlukan untuk menyimpan data": "Login required to save data",
 "Library PDF belum siap, coba lagi.": "PDF library isn't ready yet, please try again.",
 "✅ Laporan berhasil diunduh!": "✅ Report downloaded successfully!",
 "Motor dinyalakan": "Motor turned on",
 "Motor dimatikan": "Motor turned off",
 "Tarif tidak valid": "Invalid rate",
 "✓ Tarif disimpan": "✓ Rate saved",
 "Belum ada foto profil untuk dipreview": "No profile photo to preview yet",
 "Format foto harus JPG, PNG, atau WebP": "Photo format must be JPG, PNG, or WebP",
 "Ukuran foto maksimal 2 MB": "Maximum photo size is 2 MB",
 "Pilih foto terlebih dahulu": "Please choose a photo first",
 "Foto tampil sementara, tapi penyimpanan lokal penuh": "Photo shown temporarily, but local storage is full",
 "Menyimpan foto profil...": "Saving profile photo...",
 "Foto profil tersimpan di perangkat ini": "Profile photo saved on this device",
 "Pilih foto atau masukkan URL foto": "Choose a photo or enter a photo URL",
 "URL gambar tidak valid": "Invalid image URL",
 "Gunakan URL gambar yang valid": "Use a valid image URL",
 "Foto profil dihapus": "Profile photo removed",
 "Nama tidak boleh kosong": "Name cannot be empty",
 "Nama profil diperbarui": "Profile name updated",
 "Wallpaper diperbarui": "Wallpaper updated",
 "⏳ Mengupload wallpaper ke cloud...": "⏳ Uploading wallpaper to the cloud...",
 "✅ Wallpaper tersimpan di cloud": "✅ Wallpaper saved to the cloud",
 "⚠ Wallpaper disimpan lokal saja": "⚠ Wallpaper saved locally only",
 "Sampai jumpa!": "See you!",
 "⏳ Data BEP akan tersimpan otomatis dalam beberapa detik…": "⏳ BEP data will be saved automatically in a few seconds…",
 "⚠️ Gunakan URL direct image (i.imgur.com/xxx.jpg), bukan gallery": "⚠️ Use a direct image URL (i.imgur.com/xxx.jpg), not a gallery link",
 "⚠️ URL gambar tidak valid": "⚠️ Invalid image URL",
 "✅ Foto profil diperbarui": "✅ Profile photo updated",
 "✅ Foto dikembalikan ke default": "✅ Photo reset to default",
 "✅ Wallpaper diperbarui": "✅ Wallpaper updated",
 "✅ Wallpaper dikembalikan ke default": "✅ Wallpaper reset to default",
 "⚠️ Foto profil gagal dimuat. Coba URL lain.": "⚠️ Failed to load profile photo. Try another URL.",
 "⚠️ Wallpaper gagal dimuat. Mungkin Imgur sedang dibatasi — coba lagi nanti.": "⚠️ Failed to load wallpaper. Imgur may be rate-limited — try again later.",
 "⚠ Tidak bisa reset — user tidak login": "⚠ Cannot reset — user is not logged in",
 "⚠️ Cloud backup offline - data hanya tersimpan di Firebase": "⚠️ Cloud backup offline - data is only saved in Firebase",
 "⚠️ Gagal koneksi ke cloud backup": "⚠️ Failed to connect to cloud backup"
};
const TOAST_EN_PREFIX = {"Gagal menyimpan: ": "Failed to save: ", "⚠ Gagal upload: ": "⚠ Upload failed: "};
const TOAST_EN_SUFFIX = {" berhasil disimpan!": " saved successfully!"};
function translateToastMsg(msg){
  if (typeof msg !== "string" || !GlobalState || GlobalState.language !== "en") return msg;
  if (Object.prototype.hasOwnProperty.call(TOAST_EN, msg)) return TOAST_EN[msg];
  for (const k in TOAST_EN_PREFIX) if (msg.startsWith(k)) return TOAST_EN_PREFIX[k] + msg.slice(k.length);
  for (const k in TOAST_EN_SUFFIX) if (msg.endsWith(k)) return msg.slice(0, msg.length - k.length) + TOAST_EN_SUFFIX[k];
  return msg;
}
const TOAST_ICON_MAP = {
 "✅":"tabler-icon/circle-check.svg",
 "✔":"tabler-icon/circle-check.svg",
 "✓":"tabler-icon/circle-check.svg",
 "⚠️":"tabler-icon/alert.svg",
 "⚠":"tabler-icon/alert.svg",
 "❌":"tabler-icon/alert-circle.svg",
 "✗":"tabler-icon/alert-circle.svg",
 "📴":"tabler-icon/antenna.svg",
 "🌐":"tabler-icon/antenna.svg"
};
let toastTimer = null;
function showToast(msg){
  const t = document.getElementById("toastMsg");
  const translated = translateToastMsg(msg);
  let iconSrc = null, rest = translated, iconAtEnd = false;
  if (typeof translated === "string") {
    for (const key in TOAST_ICON_MAP) {
      if (translated.startsWith(key)) { iconSrc = TOAST_ICON_MAP[key]; rest = translated.slice(key.length).trimStart(); break; }
    }
    if (!iconSrc) {
      for (const key in TOAST_ICON_MAP) {
        if (translated.endsWith(key)) { iconSrc = TOAST_ICON_MAP[key]; rest = translated.slice(0, translated.length - key.length).trimEnd(); iconAtEnd = true; break; }
      }
    }
  }
  t.innerHTML = "";
  if (iconSrc) {
    const img = document.createElement("img");
    img.src = iconSrc; img.className = "icon-svg"; img.alt = "";
    if (iconAtEnd) {
      t.appendChild(document.createTextNode(rest + " "));
      t.appendChild(img);
    } else {
      t.appendChild(img);
      t.appendChild(document.createTextNode(" " + rest));
    }
  } else {
    t.textContent = translated;
  }
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>{ t.classList.remove("show"); }, 2500);
}



/* ============================================================
   CHART
   ============================================================ */
let chartHistory=[10,20,30,40,50,60,70];
let barChart, lineChart;

/* Daftarkan plugin annotation (harus register eksplisit). Aman dipanggil berulang;
   bila skrip plugin gagal dimuat (offline/CDN down), grafik tetap jalan tanpa garis anotasi. */
function ensureChartAnnotation(){
  try {
    if(typeof Chart === "undefined" || typeof Chart.register !== "function") return false;
    const p = window["chartjs-plugin-annotation"];
    if(p){ Chart.register(p); return true; }
  } catch(e){ console.warn("ensureChartAnnotation error:", e); }
  return false;
}

function initChart(){
  if(typeof Chart === "undefined") return;
  const barEl = document.getElementById("bar");
  const lineEl = document.getElementById("line");
  // Longgar: cukup salah satu canvas yang ada; jangan buat ulang bila sudah ada.
  if(!barEl && !lineEl) return;
  ensureChartAnnotation();
  const textColor = "#333";
  const isEn = (typeof GlobalState !== "undefined" && GlobalState.language === "en");
  if(barEl && !barChart){
    barChart = new Chart(barEl,{
      type:"bar",
      data:{
        labels:["H-6","H-5","H-4","H-3","H-2","H-1","Hari Ini"],
        datasets:[{label:"Profit Harian",data:chartHistory,backgroundColor:"#00b14f",borderRadius:8}]
      },
      options:{plugins:{legend:{display:false}},scales:{x:{ticks:{color:textColor}},y:{ticks:{color:textColor}}}}
    });
  }
  if(lineEl && !lineChart){
    lineChart = new Chart(lineEl,{
      type:"line",
      data:{
        labels:[],
        datasets:[
          {label:"Profit",data:[],borderColor:"#00b14f",backgroundColor:"rgba(0,177,79,0.15)",fill:true,tension:0.4},
          {label:"Modal Awal",data:[],borderColor:"#e74c3c",borderDash:[6,6],tension:0.4,pointRadius:0,hidden:true}
        ]
      },
      options:{
        responsive:true,
        maintainAspectRatio:false,
        plugins:{
          legend:{labels:{color:textColor,boxWidth:12,font:{size:10}}},
          annotation:{annotations:{
            avgLine:{
              type:"line", display:false, yMin:0, yMax:0,
              borderColor:"rgba(240,196,40,0.95)", borderWidth:1.5, borderDash:[5,5],
              label:{enabled:true, content:isEn?"Average":"Rata-rata", position:"end",
                     backgroundColor:"#f0c428", color:"#333", font:{size:10}}
            }
          }}
        },
        scales:{x:{ticks:{color:textColor,font:{size:10}}},y:{ticks:{color:textColor,font:{size:10}}}}
      }
    });
    // Tampilkan data asli (bukan dummy) begitu grafik dibuat
    if(typeof primeWeekProfitChart === "function") primeWeekProfitChart();
  }
}



/* ============================================================
   NUMBER FORMATTING (dot thousands, comma decimals)
   ============================================================ */
/* Escape teks/atribut sebelum disisipkan ke innerHTML (cegah XSS & atribut terpotong oleh tanda kutip). */
if(typeof window.escapeHtml !== "function"){
  window.escapeHtml = function(v){
    return String(v == null ? "" : v)
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  };
}

function formatTitik(angka){
  if(isNaN(angka)) return "0";
  const parts = angka.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g,".");
  return parts.length > 1 ? parts.join(",") : parts[0];
}
function formatRupiah(angka){ return "Rp " + formatTitik(Math.round(angka)); }
function formatAngka(val){ return formatTitik(parseFloat(val)); }

function parseSanitized(str){ return parseFloat(String(str).replace(/\./g,"").replace(",",".")); }

/* fmtNum – dipakai di kalkulator (app.js) dan unit converter (ui-controller.js).
   Didefinisikan di sini agar sudah tersedia saat ui-controller.js dieksekusi,
   tanpa perlu menunggu app.js dimuat. app.js tetap mendefinisikan ulang (overwrite)
   dengan nilai yang sama — tidak ada konflik. */
function fmtNum(n){
  if(isNaN(n)||!isFinite(n)) return "Error";
  const s = parseFloat(n.toPrecision(12));
  return String(s).length>12 ? s.toExponential(6) : String(s);
}



/* ============================================================
   UNIT SYSTEM
   ============================================================ */
let pendingUnit = null;

function selectUnit(unit){
  pendingUnit = unit;
  const S = STRINGS[GlobalState.language];
  openModal("modalUnitConfirm");
}

function confirmUnitChange(){
  closeModal("modalUnitConfirm");
  GlobalState.setUnit(pendingUnit);
  updateUnitUI();
  const msg = pendingUnit === "metric"
    ? (GlobalState.language==="en" ? "Unit changed to Metric" : "Satuan diubah ke Metrik")
    : (GlobalState.language==="en" ? "Unit changed to Imperial" : "Satuan diubah ke Imperial");
  showToast(msg);
}

function updateUnitUI(){
  document.getElementById("unitOptMetric").classList.toggle("selected", GlobalState.unit==="metric");
  document.getElementById("unitOptImperial").classList.toggle("selected", GlobalState.unit==="imperial");
  document.getElementById("unitExamplesMetric").style.display = GlobalState.unit==="metric" ? "block" : "none";
  document.getElementById("unitExamplesImperial").style.display = GlobalState.unit==="imperial" ? "block" : "none";
}

function applyUnitToAllPages(){
  const isImperial = GlobalState.unit === "imperial";
  const KG_TO_LB = 2.20462;
  const LB_TO_KG = 1 / KG_TO_LB;
  const KGPH_TO_LBPH = 2.20462;
  const C_TO_F = (c) => (c * 9/5) + 32;
  const F_TO_C = (f) => (f - 32) * 5/9;

  const weightUnit = isImperial ? "lb" : "kg";
  const speedUnit  = isImperial ? "lb/hr" : "kg/jam";

  document.querySelectorAll(".produksi-stat-unit").forEach(el=>{
    if(el.innerText==="kg"||el.innerText==="lb") el.innerText = weightUnit;
    if(el.innerText==="kg/jam"||el.innerText==="lb/hr") el.innerText = speedUnit;
  });

  const tkEl = document.getElementById("totalKg");
  if(tkEl){
    const rawKg = parseFloat(tkEl.getAttribute("data-kg-raw") || tkEl.innerText) || 0;
    tkEl.setAttribute("data-kg-raw", rawKg);
    tkEl.innerText = isImperial ? Math.round(rawKg * KG_TO_LB) : Math.round(rawKg);
  }
  const circleSmall = document.querySelector(".circle-text small");
  if(circleSmall) circleSmall.innerText = weightUnit;

  const targetLabel = document.getElementById("targetLabel");
  if(targetLabel){
    const targetKg = parseInt(localStorage.getItem("targetProduksi"))||200;
    targetLabel.innerText = isImperial
      ? formatTitik(Math.round(targetKg * KG_TO_LB)) + " lb"
      : formatTitik(targetKg) + " kg";
  }

  const prod2 = document.getElementById("prod2");
  if(prod2){
    const rawKg2 = parseFloat(prod2.getAttribute("data-kg-raw") || prod2.innerText) || 0;
    prod2.setAttribute("data-kg-raw", rawKg2);
    prod2.innerText = isImperial ? fmtNum(rawKg2 * KG_TO_LB) : fmtNum(rawKg2);
  }

  const speed2 = document.getElementById("speed2");
  if(speed2){
    const rawSpeed = parseFloat(speed2.getAttribute("data-raw") || speed2.innerText) || 0;
    speed2.setAttribute("data-raw", rawSpeed);
    speed2.innerText = isImperial ? fmtNum(rawSpeed * KGPH_TO_LBPH) : fmtNum(rawSpeed);
  }

  const prod3 = document.getElementById("prod3");
  if(prod3){
    const rawVal = parseFloat(prod3.getAttribute("data-kg-raw") || prod3.innerText) || 0;
    prod3.setAttribute("data-kg-raw", rawVal);
    prod3.innerText = isImperial
      ? fmtNum(rawVal * KG_TO_LB) + " lb"
      : fmtNum(rawVal) + " kg";
  }

  const prodTargetLabel = document.getElementById("prodTargetLabel");
  if(prodTargetLabel){
    const targetKg = parseInt(localStorage.getItem("targetProduksi"))||200;
    prodTargetLabel.innerText = isImperial
      ? formatTitik(Math.round(targetKg * KG_TO_LB)) + " lb"
      : formatTitik(targetKg) + " kg";
  }

  const arrow = document.getElementById("calArrow");
  if(arrow && arrow.innerText && calSelectedDate && produksiData[calSelectedDate]!==undefined){
    const rawKgCal = produksiData[calSelectedDate];
    arrow.innerText = isImperial
      ? "▼ " + formatTitik(Math.round(rawKgCal * KG_TO_LB * 100) / 100) + " lb"
      : "▼ " + formatTitik(rawKgCal) + " kg";
  }

  const inputKg = document.getElementById("inputKg");
  if(inputKg){
    inputKg.placeholder = isImperial
      ? (GlobalState.language==="en" ? "Amount (lb)" : "Jumlah (lb)")
      : (GlobalState.language==="en" ? "Amount (kg)" : "Jumlah (kg)");
  }

  document.querySelectorAll(".profil-value small").forEach(el=>{
    if(el.innerText==="kg"||el.innerText==="lb") el.innerText = weightUnit;
  });
  const bepUnitEl = document.getElementById("bepUnitDisplay");
  if(bepUnitEl){
    const rawBepUnit = parseFloat(bepUnitEl.getAttribute("data-kg-raw") || bepUnitEl.innerText) || 0;
    bepUnitEl.setAttribute("data-kg-raw", rawBepUnit);
    bepUnitEl.innerText = isImperial
      ? fmtNum(rawBepUnit * KG_TO_LB)
      : fmtNum(rawBepUnit);
  }
  ["bepScenNormal","bepScenBad","bepScenGood"].forEach(id=>{
    const el = document.getElementById(id);
    if(el){
      const raw = parseFloat(el.getAttribute("data-kg-raw") || el.innerText) || 0;
      el.setAttribute("data-kg-raw", raw);
      el.innerText = isImperial ? fmtNum(raw * KG_TO_LB) + " lb" : fmtNum(raw) + " kg";
    }
  });
  const qLabel = document.querySelector('label[for="bepQProfilInput"]');
  if(qLabel) qLabel.innerText = isImperial ? "Production per Month (lb)" : "Produksi per Bulan (kg)";
  const prodHarianEl = document.getElementById("prodHarian");
  if(prodHarianEl){
    const rawPH = parseFloat(prodHarianEl.getAttribute("data-kg-raw") || prodHarianEl.innerText) || 0;
    prodHarianEl.setAttribute("data-kg-raw", rawPH);
    prodHarianEl.innerText = isImperial ? fmtNum(rawPH * KG_TO_LB) : fmtNum(rawPH);
  }
  const tpdEl2 = document.getElementById("targetProfilDisplay");
  if(tpdEl2){
    const tKg = parseInt(localStorage.getItem("targetProduksi"))||200;
    tpdEl2.innerText = isImperial
      ? formatTitik(Math.round(tKg * KG_TO_LB))
      : formatTitik(tKg);
  }
  const homeBEPProgressEl = document.getElementById("homeBEPProgress");
  if(homeBEPProgressEl){ /* percentage - no unit change */ }
  document.querySelectorAll("[data-unit-weight]").forEach(el => {
    const raw = parseFloat(el.getAttribute("data-kg-raw")) || 0;
    el.innerText = isImperial
      ? formatTitik(Math.round(raw * KG_TO_LB)) + " lb"
      : formatTitik(raw) + " kg";
  });

}



/* ============================================================
   CALENDAR
   ============================================================ */
let calYear, calMonth, calSelectedDate=null;
let produksiData={};

function initCalendar(){
  const now = new Date();
  calYear = now.getFullYear();
  calMonth = now.getMonth();
  renderCalendar();
}

function renderCalendar(){
  const monthNamesId=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  const monthNamesEn=["January","February","March","April","May","June","July","August","September","October","November","December"];
  const names = GlobalState.language==="en" ? monthNamesEn : monthNamesId;

  // Legacy calendar elements — guard; new home-page uses nhCalGrid via hp_renderCal()
  const calMonthLabelEl = document.getElementById("calMonthLabel");
  if(calMonthLabelEl) calMonthLabelEl.innerText = names[calMonth]+" "+calYear;

  const grid = document.getElementById("calGrid");
  if(!grid){
    // Trigger new home-page calendar refresh instead
    if(typeof window.hp_renderCal === "function") window.hp_renderCal();
    return;
  }
  grid.innerHTML = "";

  const firstDay = new Date(calYear,calMonth,1).getDay();
  const daysInMonth = new Date(calYear,calMonth+1,0).getDate();
  const today = new Date();

  for(let i=0;i<firstDay;i++){
    const cell=document.createElement("div");
    cell.className="cal-day other-month";
    grid.appendChild(cell);
  }
  for(let d=1;d<=daysInMonth;d++){
    const cell=document.createElement("div");
    cell.className="cal-day";
    cell.innerText=d;
    const dateStr=calYear+"-"+String(calMonth+1).padStart(2,"0")+"-"+String(d).padStart(2,"0");
    if(d===today.getDate()&&calMonth===today.getMonth()&&calYear===today.getFullYear()) cell.classList.add("today");
    if(calSelectedDate===dateStr) cell.classList.add("selected");
    if(produksiData[dateStr]!==undefined) cell.classList.add("has-data");
    cell.addEventListener("click",()=>selectCalDay(dateStr,cell));
    grid.appendChild(cell);
  }
}

function selectCalDay(dateStr,cellEl){
  calSelectedDate=dateStr;

  // Legacy elements (guarded)
  const tanggalEl = document.getElementById("tanggal");
  if(tanggalEl) tanggalEl.value = dateStr;

  renderCalendar();

  const arrow = document.getElementById("calArrow");
  const isImperial = GlobalState.unit==="imperial";
  if(produksiData[dateStr]!==undefined){
    const rawKg = produksiData[dateStr];
    const display = isImperial
      ? formatTitik(parseFloat((rawKg*2.20462).toFixed(2))) + " lb"
      : formatTitik(rawKg) + " kg";
    if(arrow){ arrow.innerText = "▼ " + display; arrow.className = "cal-arrow-indicator show"; }
    // Also update new home-page calendar info
    const selInfo = document.getElementById("selInfo");
    if(selInfo) selInfo.textContent = display;
    const cisInfo = document.getElementById("cisInfo");
    if(cisInfo) cisInfo.textContent = "Data: " + display;
    const ceIn = document.getElementById("ceIn");
    if(ceIn) ceIn.value = isImperial ? parseFloat((rawKg*2.20462).toFixed(2)) : rawKg;
  }else{
    if(arrow){ arrow.innerText=""; arrow.className="cal-arrow-indicator"; }
    // New home-page: clear input and show prompt
    const selInfo = document.getElementById("selInfo");
    if(selInfo) selInfo.textContent = "Belum ada data";
    const ceIn = document.getElementById("ceIn");
    if(ceIn) ceIn.value = "";
  }
}

function calPrev(){
  calMonth--;
  if(calMonth<0){ calMonth=11; calYear--; }
  renderCalendar();
}
function calNext(){
  calMonth++;
  if(calMonth>11){ calMonth=0; calYear++; }
  renderCalendar();
}

/* Aliases — HTML memanggil calPrevMonth/calNextMonth */
const calPrevMonth = calPrev;
const calNextMonth = calNext;

/* ============================================================
   INITIALIZE SPLASH – alias untuk auth.js yang memanggilnya
   Auth.js memanggil initializeSplash() via typeof guard.
   Fungsi sebenarnya adalah runSplash() di bawah.
   ============================================================ */
function initializeSplash() {
  runSplash();
}



/* ============================================================
   CIRCLE SVG PROGRESS
   ============================================================ */
function updateCircle(total){
  const target     = parseInt(localStorage.getItem("targetProduksi")) || 200;
  const pct        = Math.min(total / target, 1);
  const pctRounded = Math.round(pct * 100);
  const isImperial = GlobalState.unit === "imperial";
  const displayVal = isImperial ? Math.round(total * 2.20462) : Math.round(total);
  const unit       = isImperial ? "lb" : "kg";

  // ── Legacy circle (guarded) ──
  const offset = 440 - (440 * pct);
  const pc = document.getElementById("progressCircle");
  if(pc) pc.style.strokeDashoffset = offset;
  const tk = document.getElementById("totalKg");
  if(tk){ tk.setAttribute("data-kg-raw", total); tk.innerText = displayVal; }
  const circleSmall = document.querySelector(".circle-text small");
  if(circleSmall) circleSmall.innerText = unit;

  // ── New home-page progress bar ──
  const phFill = document.getElementById("phFill");
  if(phFill) phFill.style.width = (pct * 100) + "%";
  const phPct  = document.getElementById("phPct");
  if(phPct)  phPct.textContent  = pctRounded + "%";
  const phLeft = document.getElementById("phLeft");
  if(phLeft) phLeft.textContent = displayVal + " " + unit + " terkumpul";
  const msSisa = document.getElementById("msSisa");
  if(msSisa) msSisa.innerHTML   = Math.max(0, (isImperial ? Math.round(target * 2.20462) : target) - displayVal) + '<span class="ph-ms-unit">' + unit + "</span>";
  const msDi   = document.getElementById("msDi");
  if(msDi)   msDi.innerHTML     = displayVal + '<span class="ph-ms-unit">' + unit + "</span>";

  // ── New home-page stat card #sv1 ──
  const sv1El = document.getElementById("sv1");
  if(sv1El) sv1El.innerHTML = displayVal + '<span class="stat-unit">' + unit + "</span>";

  // ── New produksi-page scorecard ──
  const scbNum = document.getElementById("scbNum");
  if(scbNum) scbNum.innerHTML = displayVal + '<span class="scb-unit"> ' + unit + "</span>";
  const thickFill = document.getElementById("thickFill");
  if(thickFill) thickFill.style.width = (pct * 100) + "%";
  const scbPct = document.getElementById("scbPctCircle");
  if(scbPct)  scbPct.textContent = pctRounded + "%";
}



/* ============================================================
   LOADCALENDAR – UID-scoped
   ============================================================ */
function loadCalendarData(){
  if(!currentUserId) return;
  getUserRef("produksiHarian").on("value",(snap)=>{
    // Data kosong (reset kalender / autoDelete menghapus record terakhir) tetap harus
    // mengosongkan produksiData & UI — jangan langsung return.
    const d = snap.val() || {};
    produksiData={};
    Object.values(d).forEach(item=>{
      if(item && item.tanggal && item.kg){
        produksiData[item.tanggal] = (produksiData[item.tanggal]||0) + item.kg;
      }
    });
    renderCalendar();
    const totalKg = Object.values(produksiData).reduce((a,b)=>a+b,0);
    updateCircle(totalKg);
  });
}



/* ============================================================
   NOTIF
   ============================================================ */
let notifEnabled = localStorage.getItem("notifEnabled") !== "0";
function toggleNotif(){
  notifEnabled = !notifEnabled;
  localStorage.setItem("notifEnabled",notifEnabled);
  refreshNotifPreview();
  showToast(notifEnabled
    ? (GlobalState.language==="en"?"Notifications enabled":"Notifikasi aktif")
    : (GlobalState.language==="en"?"Notifications disabled":"Notifikasi nonaktif")
  );
}

function showNotif(title,body){
  if(notifEnabled&&"Notification" in window&&Notification.permission==="granted"){
    new Notification(title,{body,icon:"data:,"});
  }
}

function refreshNotifPreview(){
  const statusArus = document.getElementById("statusArus");
  const motorStatus = statusArus ? statusArus.innerText : (GlobalState.language==="en"?"Motor Idle":"Motor Diam");
  const total = document.getElementById("totalKg")?.innerText||"0";
  document.getElementById("notifStatusMotor").innerText = motorStatus;
  document.getElementById("notifTotalProd").innerText = total+" kg";
  const timeEl = document.getElementById("notifTime");
  if(timeEl) timeEl.innerText = GlobalState.language==="en"?"Just now":"Baru saja";

  const el = document.getElementById("toggleNotif");
  if(el){
    el.classList.toggle("on", notifEnabled);
    el.classList.toggle("off", !notifEnabled);
  }
}



/* ============================================================
   SPLASH SCREEN LOADING
   ============================================================ */
function runSplash(callback){
  const fill = document.getElementById("splashFill");
  const label = document.getElementById("splashLabel");
  const msgs = GlobalState.language==="en"
    ? ["Loading system...","Connecting...","Preparing data...","Ready!"]
    : ["Memuat sistem...","Menghubungkan...","Menyiapkan data...","Siap!"];
  let pct = 0;
  const interval = setInterval(()=>{
    pct += Math.random()*25+15;
    if(pct>100) pct=100;
    if(fill) fill.style.width = pct+"%";
    const idx = Math.floor((pct/100)*msgs.length);
    if(label) label.innerText = msgs[Math.min(idx,msgs.length-1)];
    if(pct>=100){
      clearInterval(interval);
      setTimeout(()=>{
        const splash = document.getElementById("splashScreen");
        if(splash){
          splash.classList.add("fade-out");
          setTimeout(()=>{ splash.style.display="none"; if(callback) callback(); },200);
        }
      },150);
    }
  },40);
}



/* ============================================================
   HOME BEP – update revenue & gauge strip
   ============================================================ */
function updateHomeRevenue(revenue){
  // STEP 4b: Bypass if BEP feature is disabled
  if (typeof featureConfig !== "undefined" && !featureConfig.bepEnabled) {
    const strip = document.getElementById("homeBEPStrip");
    if (strip) strip.classList.add("hidden");
    return;
  }
  const el = document.getElementById("homeBEPRevenue");
  const strip = document.getElementById("homeBEPStrip");
  if(el) el.innerText = "Rp " + formatTitik(Math.round(revenue||0));
  // Use class-based show (revenue > 0 only), not inline style
  if(strip) {
    if (revenue > 0) {
      strip.classList.remove("hidden");
    } else {
      strip.classList.add("hidden");
    }
  }
}
function updateHomeGauge(qReal, bepUnit){
  const pctEl  = document.getElementById("homeBEPProgress");
  const statEl = document.getElementById("homeBEPStatus");
  if(!pctEl) return;
  if(!bepUnit || !isFinite(bepUnit)){
    pctEl.innerText = "-";
    if(statEl) statEl.innerText = "-";
    return;
  }
  const pct = Math.min(Math.round((qReal / bepUnit) * 100), 200);
  pctEl.innerText = pct + "%";
  if(statEl){
    statEl.innerText = pct >= 100
      ? (GlobalState.language==="en" ? "✔ BEP Achieved" : "✔ BEP Tercapai")
      : (GlobalState.language==="en" ? "⚠ Below BEP"   : "⚠ Belum BEP");
    statEl.style.color = pct >= 100 ? "var(--green1)" : "#e74c3c";
  }
  pctEl.style.color = pct >= 100 ? "var(--green1)" : "#58a6ff";
}
function kalkBasic(v){
  const exEl = document.getElementById("basicExpr");
  const resEl = document.getElementById("basicResult");
  if(v==="AC"){ basicState.expr=""; basicState.result="0"; basicState.lastOp=false; basicState.justEvaled=false; }
  else if(v==="sign"){
    if(basicState.result!=="0"&&basicState.result!=="Error"){
      basicState.result = fmtNum(-parseFloat(basicState.result));
    }
  }
  else if(v==="%"){
    if(basicState.result!=="Error") basicState.result = fmtNum(parseFloat(basicState.result)/100);
  }
  else if(["+","-","*","/"].includes(v)){
    if(basicState.justEvaled){ basicState.expr = basicState.result + v; basicState.justEvaled=false; }
    else if(basicState.lastOp){ basicState.expr = basicState.expr.slice(0,-1)+v; }
    else { basicState.expr += (basicState.expr===""?basicState.result:"")+v; }
    basicState.lastOp=true;
  }
  else if(v==="="){
    if(basicState.expr==="") return;
    const full = basicState.expr + basicState.result;
    try{ basicState.result = fmtNum(Function('"use strict";return('+full.replace(/÷/g,"/").replace(/×/g,"*")+')')());
    }catch(e){ basicState.result="Error"; }
    basicState.expr = full+" =";
    basicState.lastOp=false; basicState.justEvaled=true;
  }
  else if(v==="."){
    if(basicState.justEvaled){ basicState.result="0."; basicState.justEvaled=false; return; }
    if(basicState.lastOp){ basicState.result="0."; basicState.lastOp=false; }
    else if(!basicState.result.includes(".")) basicState.result+=".";
  }
  else{
    if(basicState.justEvaled||basicState.lastOp){
      basicState.result = v; basicState.lastOp=false; basicState.justEvaled=false;
    } else {
      basicState.result = basicState.result==="0"?v:(basicState.result+v);
    }
  }
  if(exEl) exEl.innerText = basicState.expr;
  if(resEl) resEl.innerText = basicState.result;
}



/* ============================================================
   GLOSARIUM TOGGLE
   ============================================================ */
function toggleGlosarium(){
  const content = document.getElementById("glosariumContent");
  const btn = document.getElementById("toggleGlosarium");
  const S = STRINGS[GlobalState.language];
  
  if(content.style.display === "none"){
    content.style.display = "block";
    btn.innerHTML = `<span data-i18n="glosarium_hide">${S.glosarium_hide || "Sembunyikan"}</span>`;
  } else {
    content.style.display = "none";
    btn.innerHTML = `<span data-i18n="glosarium_show">${S.glosarium_show || "Tampilkan"}</span>`;
  }
}


/* ============================================================
   NEW UI PAGES — Navigation & Init Functions
   Integrated from UI/ folder standalone pages.
   ============================================================ */

/**
 * Navigate to a new UI page safely.
 * Wraps showPage() with validation.
 */
function goToNewPage(pageId){
  showPage(pageId);
}

/**
 * Navigate back from new UI pages to home
 */
function newPageBack(targetPage){
  showPage(targetPage || 'home-page');
}

/* Init stubs for new UI pages (called by showPage) */
function initNewHomePage(){
  try {
    // Sync production total from Firebase data
    if (typeof window.refreshNewHomePage === 'function') {
      window.refreshNewHomePage();
    }
    // Update greeting based on time
    const salamEl = document.getElementById('gcSalam');
    if(salamEl){
      const hour = new Date().getHours();
      let salam = 'SELAMAT PAGI';
      if(hour >= 12 && hour < 15) salam = 'SELAMAT SIANG';
      else if(hour >= 15 && hour < 19) salam = 'SELAMAT SORE';
      else if(hour >= 19) salam = 'SELAMAT MALAM';
      salamEl.textContent = salam;
    }
    // Update date
    const dateEl = document.getElementById('gcDate');
    if(dateEl){
      const now = new Date();
      const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
      dateEl.textContent = now.getDate() + ' ' + months[now.getMonth()] + ' ' + now.getFullYear();
    }
  } catch(e){ console.warn('initNewHomePage error:', e); }
}

function initNewProduksiPage(){
  try {
    // Mirror total production from global data
    const rawKg = (typeof produksiData !== 'undefined')
      ? Object.values(produksiData).reduce((a,b)=>a+b,0)
      : 0;

    const scbNum = document.getElementById('scbNum');
    if(scbNum) scbNum.innerHTML = (rawKg % 1 === 0 ? rawKg : rawKg.toFixed(1)) + '<span class="scb-unit"> kg</span>';

    const ccTotal = document.getElementById('ccTotal');
    if(ccTotal) ccTotal.innerHTML = (rawKg % 1 === 0 ? rawKg : rawKg.toFixed(1)) + '<span class="cc-unit">kg</span>';

    const target = parseInt(localStorage.getItem('targetProduksi')) || 200;
    const scbTgt = document.getElementById('scbTgt');
    if(scbTgt) scbTgt.textContent = target + ' kg';

    const pct = Math.min(Math.round((rawKg / target) * 100), 100);
    const scbPct = document.getElementById('scbPctCircle');
    if(scbPct) scbPct.textContent = pct + '%';

    const thickFill = document.getElementById('thickFill');
    if(thickFill) thickFill.style.width = pct + '%';

    const ssBadgePct = document.getElementById('ssBadgePct');
    if(ssBadgePct) ssBadgePct.textContent = pct + '%';
  } catch(e){ console.warn('initNewProduksiPage error:', e); }
}

function initNewElektrikalPage(){
  try {
    // Mirror IoT status from existing elements
    const statusArus = document.getElementById('statusArus');
    const motorStatusNew = document.querySelector('#elektrikal-page .motor-status-txt');
    if(statusArus && motorStatusNew) motorStatusNew.textContent = statusArus.innerText;

    const arus1 = document.getElementById('arus1');
    const arus2 = document.getElementById('arus2');
    if(arus1 && arus2) arus2.textContent = arus1.textContent;

    const daya1 = document.getElementById('daya1');
    const daya2 = document.getElementById('daya2');
    if(daya1 && daya2) daya2.textContent = daya1.textContent;
  } catch(e){ console.warn('initNewElektrikalPage error:', e); }
}

function initNewPendapatanPage(){
  try {
    // Mirror BEP data — trigger BEP recalc which updates all displays
    if(typeof loadBEPInputs === 'function') loadBEPInputs();
    if(typeof initProdukSelector === 'function') initProdukSelector();
  } catch(e){ console.warn('initNewPendapatanPage error:', e); }
  // Grafik profit 7 hari — dibuat terpisah agar tidak ikut terlewat bila blok di atas error
  try {
    if((typeof barChart === 'undefined' || !barChart) && (typeof lineChart === 'undefined' || !lineChart)){
      if(typeof initChart === 'function') initChart();
    }
    // Canvas bisa dibuat saat halaman tersembunyi -> paksa ukur ulang setelah tampil
    if(typeof lineChart !== 'undefined' && lineChart){
      setTimeout(()=>{ try{ lineChart.resize(); }catch(e){} }, 50);
    }
  } catch(e){ console.warn('initNewPendapatanPage chart error:', e); }
  try {
    // Refresh Firebase-driven product summary list
    if(typeof window.refreshPendapatanProducts === 'function') window.refreshPendapatanProducts();
  } catch(e){ console.warn('initNewPendapatanPage error:', e); }
}

function initNewProfilPage(){
  try {
    // ── Sync nama: localStorage (written by auth.js loadUserProfile) → profile obj → DOM
    const storedName = localStorage.getItem('nama') || '';

    // Update the inline profil-page `profile` object if it exists
    if(typeof profile !== 'undefined' && storedName) {
      profile.nama = storedName;
      if(typeof renderProfile === 'function') renderProfile();
    }

    // Fallback: update #profileName directly
    const profileNameEl = document.getElementById('profileName');
    if(profileNameEl && storedName) profileNameEl.textContent = storedName;

    // ── Sync email from Firebase Auth currentUser
    const emailEl = document.getElementById('emailVal');
    if(emailEl){
      const user = typeof firebase !== 'undefined' ? firebase.auth().currentUser : null;
      if(user && user.email) emailEl.textContent = user.email;
    }

    // ── Load profile images from Firebase (wallpaper / foto)
    if(typeof loadProfileImages === 'function'){
      const uid = typeof currentUserId !== 'undefined' ? currentUserId
                : (typeof firebase !== 'undefined' && firebase.auth().currentUser
                   ? firebase.auth().currentUser.uid : null);
      if(uid) loadProfileImages(uid);
    }
  } catch(e){ console.warn('initNewProfilPage error:', e); }
}



/* ============================================================
   ACCESSIBILITY — keyboard activation for role="button" divs
   [PERBAIKAN 7-8] Banyak kontrol interaktif memakai <div onclick>
   demi styling bebas. Sudah diberi role="button" + tabindex="0"
   di HTML; listener terdelegasi ini membuatnya bisa dipicu lewat
   keyboard (Enter / Space), sama seperti elemen <button> asli.
   Satu listener global — tidak perlu diulang di tiap elemen.
   ============================================================ */
document.addEventListener('keydown', function(e){
  if(e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
  const el = e.target;
  if(!el || el.getAttribute('role') !== 'button') return;
  if(!el.hasAttribute('tabindex')) return;
  // Jangan ganggu elemen form asli (input/textarea/select) yang kebetulan
  // berada di dalam elemen ber-role="button" dan juga menangani Space/Enter.
  const tag = (el.tagName || '').toLowerCase();
  if(tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'button' || tag === 'a') return;
  e.preventDefault();
  el.click();
});
