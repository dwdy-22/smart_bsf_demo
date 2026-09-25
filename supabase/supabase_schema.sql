-- ============================================================
--  SmartBSF – Supabase PostgreSQL Schema
--  Cloud kedua (paralel dengan Firebase)
--  Firebase tetap menangani: Auth, Realtime DB (IoT), Hosting
--  Supabase menangani  : riwayat produksi, BEP history,
--                        pendapatan log, storage file,
--                        export laporan
--
--  Semua tabel menggunakan firebase_uid (TEXT) sebagai
--  foreign key agar sinkron dengan Firebase Auth.
--  Row Level Security (RLS) aktif di setiap tabel.
-- ============================================================

-- ── Enable UUID extension ────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
--  TABLE 1: user_profiles
--  Menyimpan data profil usaha BSF per user.
--  Firebase path padanan: /users/{uid}/profile & /users/{uid}/setting
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id               UUID    DEFAULT uuid_generate_v4() PRIMARY KEY,
  firebase_uid     TEXT    NOT NULL UNIQUE,
  nama_usaha       TEXT,
  jumlah_biopond   INTEGER DEFAULT 0,
  produksi_siklus  NUMERIC(10,2) DEFAULT 0,  -- kg per siklus
  target_produksi  NUMERIC(10,2) DEFAULT 0,  -- kg per bulan
  bahasa           TEXT    DEFAULT 'id',      -- 'id' | 'en'
  satuan           TEXT    DEFAULT 'metric',  -- 'metric' | 'imperial'
  foto_url         TEXT,
  wallpaper_url    TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: user hanya bisa akses row miliknya sendiri
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_profiles: akses milik sendiri"
  ON user_profiles
  USING (firebase_uid = current_setting('app.firebase_uid', TRUE));

-- ============================================================
--  TABLE 2: produksi_harian
--  Riwayat log produksi maggot per hari/siklus.
--  Firebase path padanan: /users/{uid}/produksiHarian/{pushId}
--  Supabase menyimpan SEMUA riwayat (Firebase hanya 5 hari terakhir
--  karena auto-delete — ini alasan utama pakai Supabase untuk data ini)
-- ============================================================
CREATE TABLE IF NOT EXISTS produksi_harian (
  id           UUID    DEFAULT uuid_generate_v4() PRIMARY KEY,
  firebase_uid TEXT    NOT NULL,
  tanggal      DATE    NOT NULL,
  kg           NUMERIC(10,3) NOT NULL DEFAULT 0,  -- berat dalam kg (selalu kg, konversi di client)
  timestamp_ms BIGINT,                             -- epoch milisecond dari client
  sumber       TEXT    DEFAULT 'manual',           -- 'manual' | 'sensor' | 'sync_offline'
  synced_from  TEXT,                               -- 'firebase' jika dari sync Firebase→Supabase
  catatan      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (firebase_uid, tanggal)  -- satu record per user per tanggal
);

ALTER TABLE produksi_harian ENABLE ROW LEVEL SECURITY;
CREATE POLICY "produksi_harian: akses milik sendiri"
  ON produksi_harian
  USING (firebase_uid = current_setting('app.firebase_uid', TRUE));

-- Index untuk query range tanggal (sering dipakai di chart/laporan)
CREATE INDEX IF NOT EXISTS idx_produksi_uid_tanggal
  ON produksi_harian (firebase_uid, tanggal DESC);

-- ============================================================
--  TABLE 3: bep_history
--  Riwayat snapshot perhitungan BEP per bulan per produk.
--  Firebase path padanan: /users/{uid}/bep (hanya menyimpan 1 data terbaru)
--  Supabase menyimpan SEMUA histori BEP → bisa lihat tren bulanan
-- ============================================================
CREATE TABLE IF NOT EXISTS bep_history (
  id              UUID    DEFAULT uuid_generate_v4() PRIMARY KEY,
  firebase_uid    TEXT    NOT NULL,
  bulan           TEXT    NOT NULL,  -- format: 'YYYY-MM'
  produk          TEXT    NOT NULL DEFAULT 'maggot_segar',
                                    -- 'maggot_segar'|'maggot_kering'|'telur_bsf'|'prepupa'|'kasgot'

  -- Harga & produksi
  harga_jual      NUMERIC(12,2) DEFAULT 0,  -- Rp per kg/unit
  produksi        NUMERIC(10,2) DEFAULT 0,  -- kg per bulan (Q)
  keberhasilan    NUMERIC(5,2)  DEFAULT 100, -- % success rate

  -- Fixed Cost breakdown (4 group)
  fc_investasi    NUMERIC(12,2) DEFAULT 0,  -- FC1: investasi awal/bulan
  fc_infrastruktur NUMERIC(12,2) DEFAULT 0, -- FC2: kandang, rak, box
  fc_listrik      NUMERIC(12,2) DEFAULT 0,  -- FC3: listrik kandang
  fc_lainnya      NUMERIC(12,2) DEFAULT 0,  -- FC4: biaya tetap lainnya
  fc_total        NUMERIC(12,2) DEFAULT 0,  -- sum FC1-FC4

  -- Variable Cost breakdown (4 group)
  vc_pakan        NUMERIC(12,2) DEFAULT 0,  -- VC1: pakan/kg
  vc_operasional  NUMERIC(12,2) DEFAULT 0,  -- VC2: operasional/kg
  vc_tenaga_kerja NUMERIC(12,2) DEFAULT 0,  -- VC3: upah per kg
  vc_lainnya      NUMERIC(12,2) DEFAULT 0,  -- VC4: lainnya per kg
  vc_total        NUMERIC(12,2) DEFAULT 0,  -- sum VC1-VC4

  -- BEP result
  bep_unit        NUMERIC(10,2),  -- kg untuk break even
  bep_rupiah      NUMERIC(14,2),  -- Rp untuk break even
  profit_aktual   NUMERIC(14,2),  -- Rp profit realisasi
  target_profit   NUMERIC(14,2) DEFAULT 0,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (firebase_uid, bulan, produk)
);

ALTER TABLE bep_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bep_history: akses milik sendiri"
  ON bep_history
  USING (firebase_uid = current_setting('app.firebase_uid', TRUE));

CREATE INDEX IF NOT EXISTS idx_bep_uid_bulan
  ON bep_history (firebase_uid, bulan DESC);

-- ============================================================
--  TABLE 4: pendapatan_harian
--  Riwayat revenue, modal, profit per hari.
--  Firebase path padanan: /users/{uid}/pendapatanHarian/{tanggal}
--  Sama seperti produksi_harian — Firebase auto-delete, Supabase simpan semua
-- ============================================================
CREATE TABLE IF NOT EXISTS pendapatan_harian (
  id           UUID    DEFAULT uuid_generate_v4() PRIMARY KEY,
  firebase_uid TEXT    NOT NULL,
  tanggal      DATE    NOT NULL,
  revenue      NUMERIC(14,2) DEFAULT 0,  -- total penjualan hari itu
  modal        NUMERIC(14,2) DEFAULT 0,  -- FC + VC * Q
  profit       NUMERIC(14,2) DEFAULT 0,  -- revenue - modal
  produksi_kg  NUMERIC(10,3) DEFAULT 0,  -- kg terjual hari itu
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (firebase_uid, tanggal)
);

ALTER TABLE pendapatan_harian ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pendapatan_harian: akses milik sendiri"
  ON pendapatan_harian
  USING (firebase_uid = current_setting('app.firebase_uid', TRUE));

CREATE INDEX IF NOT EXISTS idx_pendapatan_uid_tanggal
  ON pendapatan_harian (firebase_uid, tanggal DESC);

-- ============================================================
--  TABLE 5: laporan_exports
--  Metadata file laporan PDF yang sudah di-generate & diupload
--  ke Supabase Storage bucket 'laporan'.
-- ============================================================
CREATE TABLE IF NOT EXISTS laporan_exports (
  id           UUID    DEFAULT uuid_generate_v4() PRIMARY KEY,
  firebase_uid TEXT    NOT NULL,
  filename     TEXT    NOT NULL,           -- contoh: laporan_2025-04.pdf
  storage_path TEXT    NOT NULL,           -- path di Supabase Storage
  tipe         TEXT    DEFAULT 'produksi', -- 'produksi' | 'bep' | 'pendapatan'
  bulan        TEXT,                       -- 'YYYY-MM' jika laporan bulanan
  ukuran_bytes INTEGER,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE laporan_exports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "laporan_exports: akses milik sendiri"
  ON laporan_exports
  USING (firebase_uid = current_setting('app.firebase_uid', TRUE));

-- ============================================================
--  STORAGE BUCKETS (jalankan via Supabase Dashboard atau API)
--  Tidak bisa dijalankan via SQL langsung, tapi dicatat di sini
--  sebagai referensi setup.
--
--  Bucket 1: 'foto-profil'
--    - Akses: private (per user)
--    - Max size: 2MB per file
--    - Allowed types: image/jpeg, image/png, image/webp
--    - Path: foto-profil/{firebase_uid}/avatar.jpg
--
--  Bucket 2: 'laporan'
--    - Akses: private (per user)
--    - Max size: 10MB per file
--    - Allowed types: application/pdf
--    - Path: laporan/{firebase_uid}/{filename}.pdf
-- ============================================================

-- ============================================================
--  HELPER FUNCTION: update timestamp otomatis
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger updated_at untuk semua tabel yang punya kolom updated_at
CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_bep_history_updated_at
  BEFORE UPDATE ON bep_history
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_pendapatan_harian_updated_at
  BEFORE UPDATE ON pendapatan_harian
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
--  VIEWS: summary berguna untuk dashboard
-- ============================================================

-- View: ringkasan produksi per bulan per user
CREATE OR REPLACE VIEW v_produksi_bulanan AS
SELECT
  firebase_uid,
  TO_CHAR(tanggal, 'YYYY-MM') AS bulan,
  COUNT(*)                    AS jumlah_hari_produksi,
  ROUND(SUM(kg)::NUMERIC, 2)  AS total_kg,
  ROUND(AVG(kg)::NUMERIC, 2)  AS rata_kg_per_hari,
  MAX(kg)                     AS maks_kg,
  MIN(tanggal)                AS tanggal_pertama,
  MAX(tanggal)                AS tanggal_terakhir
FROM produksi_harian
GROUP BY firebase_uid, TO_CHAR(tanggal, 'YYYY-MM');

-- View: ringkasan pendapatan per bulan per user
CREATE OR REPLACE VIEW v_pendapatan_bulanan AS
SELECT
  firebase_uid,
  TO_CHAR(tanggal, 'YYYY-MM')    AS bulan,
  COUNT(*)                        AS jumlah_hari,
  ROUND(SUM(revenue)::NUMERIC, 0) AS total_revenue,
  ROUND(SUM(modal)::NUMERIC, 0)   AS total_modal,
  ROUND(SUM(profit)::NUMERIC, 0)  AS total_profit,
  ROUND(AVG(profit)::NUMERIC, 0)  AS rata_profit_harian
FROM pendapatan_harian
GROUP BY firebase_uid, TO_CHAR(tanggal, 'YYYY-MM');
