-- ============================================================
--  SmartBSF – Supabase PostgreSQL Schema (FIXED VERSION)
--  Cloud kedua (paralel dengan Firebase)
--  
--  PERUBAHAN dari versi original:
--  - Tambah DROP POLICY IF EXISTS sebelum CREATE POLICY
--  - Tambah DROP INDEX IF EXISTS sebelum CREATE INDEX
--  - Aman untuk dijalankan berulang kali tanpa error
-- ============================================================

-- ── Enable UUID extension ────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
--  TABLE 1: user_profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id               UUID    DEFAULT uuid_generate_v4() PRIMARY KEY,
  firebase_uid     TEXT    NOT NULL UNIQUE,
  nama_usaha       TEXT,
  jumlah_biopond   INTEGER DEFAULT 0,
  produksi_siklus  NUMERIC(10,2) DEFAULT 0,
  target_produksi  NUMERIC(10,2) DEFAULT 0,
  bahasa           TEXT    DEFAULT 'id',
  satuan           TEXT    DEFAULT 'metric',
  foto_url         TEXT,
  wallpaper_url    TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Hapus policy lama jika ada, baru buat baru
DROP POLICY IF EXISTS "user_profiles: akses milik sendiri" ON user_profiles;
CREATE POLICY "user_profiles: akses milik sendiri"
  ON user_profiles
  USING (firebase_uid = current_setting('app.firebase_uid', TRUE));

-- ============================================================
--  TABLE 2: produksi_harian
-- ============================================================
CREATE TABLE IF NOT EXISTS produksi_harian (
  id           UUID    DEFAULT uuid_generate_v4() PRIMARY KEY,
  firebase_uid TEXT    NOT NULL,
  tanggal      DATE    NOT NULL,
  kg           NUMERIC(10,3) NOT NULL DEFAULT 0,
  timestamp_ms BIGINT,
  sumber       TEXT    DEFAULT 'manual',
  synced_from  TEXT,
  catatan      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (firebase_uid, tanggal)
);

ALTER TABLE produksi_harian ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "produksi_harian: akses milik sendiri" ON produksi_harian;
CREATE POLICY "produksi_harian: akses milik sendiri"
  ON produksi_harian
  USING (firebase_uid = current_setting('app.firebase_uid', TRUE));

DROP INDEX IF EXISTS idx_produksi_uid_tanggal;
CREATE INDEX idx_produksi_uid_tanggal
  ON produksi_harian (firebase_uid, tanggal DESC);

-- ============================================================
--  TABLE 3: bep_history
-- ============================================================
CREATE TABLE IF NOT EXISTS bep_history (
  id              UUID    DEFAULT uuid_generate_v4() PRIMARY KEY,
  firebase_uid    TEXT    NOT NULL,
  bulan           TEXT    NOT NULL,
  produk          TEXT    NOT NULL DEFAULT 'maggot_segar',

  harga_jual      NUMERIC(12,2) DEFAULT 0,
  produksi        NUMERIC(10,2) DEFAULT 0,
  keberhasilan    NUMERIC(5,2)  DEFAULT 100,

  fc_investasi    NUMERIC(12,2) DEFAULT 0,
  fc_infrastruktur NUMERIC(12,2) DEFAULT 0,
  fc_listrik      NUMERIC(12,2) DEFAULT 0,
  fc_lainnya      NUMERIC(12,2) DEFAULT 0,
  fc_total        NUMERIC(12,2) DEFAULT 0,

  vc_pakan        NUMERIC(12,2) DEFAULT 0,
  vc_operasional  NUMERIC(12,2) DEFAULT 0,
  vc_tenaga_kerja NUMERIC(12,2) DEFAULT 0,
  vc_lainnya      NUMERIC(12,2) DEFAULT 0,
  vc_total        NUMERIC(12,2) DEFAULT 0,

  bep_unit        NUMERIC(10,2),
  bep_rupiah      NUMERIC(14,2),
  profit_aktual   NUMERIC(14,2),
  target_profit   NUMERIC(14,2) DEFAULT 0,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (firebase_uid, bulan, produk)
);

ALTER TABLE bep_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bep_history: akses milik sendiri" ON bep_history;
CREATE POLICY "bep_history: akses milik sendiri"
  ON bep_history
  USING (firebase_uid = current_setting('app.firebase_uid', TRUE));

DROP INDEX IF EXISTS idx_bep_uid_bulan;
CREATE INDEX idx_bep_uid_bulan
  ON bep_history (firebase_uid, bulan DESC);

-- ============================================================
--  TABLE 4: pendapatan_harian
-- ============================================================
CREATE TABLE IF NOT EXISTS pendapatan_harian (
  id           UUID    DEFAULT uuid_generate_v4() PRIMARY KEY,
  firebase_uid TEXT    NOT NULL,
  tanggal      DATE    NOT NULL,
  revenue      NUMERIC(14,2) DEFAULT 0,
  modal        NUMERIC(14,2) DEFAULT 0,
  profit       NUMERIC(14,2) DEFAULT 0,
  produksi_kg  NUMERIC(10,3) DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (firebase_uid, tanggal)
);

ALTER TABLE pendapatan_harian ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pendapatan_harian: akses milik sendiri" ON pendapatan_harian;
CREATE POLICY "pendapatan_harian: akses milik sendiri"
  ON pendapatan_harian
  USING (firebase_uid = current_setting('app.firebase_uid', TRUE));

DROP INDEX IF EXISTS idx_pendapatan_uid_tanggal;
CREATE INDEX idx_pendapatan_uid_tanggal
  ON pendapatan_harian (firebase_uid, tanggal DESC);

-- ============================================================
--  TABLE 5: laporan_exports
-- ============================================================
CREATE TABLE IF NOT EXISTS laporan_exports (
  id           UUID    DEFAULT uuid_generate_v4() PRIMARY KEY,
  firebase_uid TEXT    NOT NULL,
  filename     TEXT    NOT NULL,
  storage_path TEXT    NOT NULL,
  tipe         TEXT    DEFAULT 'produksi',
  bulan        TEXT,
  ukuran_bytes INTEGER,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE laporan_exports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "laporan_exports: akses milik sendiri" ON laporan_exports;
CREATE POLICY "laporan_exports: akses milik sendiri"
  ON laporan_exports
  USING (firebase_uid = current_setting('app.firebase_uid', TRUE));

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

-- Hapus trigger lama dulu jika ada
DROP TRIGGER IF EXISTS trg_user_profiles_updated_at ON user_profiles;
DROP TRIGGER IF EXISTS trg_bep_history_updated_at ON bep_history;
DROP TRIGGER IF EXISTS trg_pendapatan_harian_updated_at ON pendapatan_harian;

-- Buat trigger baru
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
