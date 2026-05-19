-- AutoNG — Supabase Schema
-- Paste into Supabase SQL Editor → Run

-- ── Cars ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cars (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title           TEXT NOT NULL,
  make            TEXT NOT NULL,
  model           TEXT NOT NULL,
  year            INTEGER NOT NULL,
  price           BIGINT NOT NULL,
  location        TEXT NOT NULL,
  mileage         INTEGER,
  condition       TEXT CHECK (condition IN ('Excellent','Good','Fair','Needs Work')),
  transmission    TEXT CHECK (transmission IN ('Automatic','Manual')),
  fuel_type       TEXT CHECK (fuel_type IN ('Petrol','Diesel','Hybrid','Electric')),
  color           TEXT,
  description     TEXT,
  images          TEXT[] DEFAULT '{}',
  status          TEXT DEFAULT 'available' CHECK (status IN ('available','held','sold')),
  held_by_email   TEXT,
  held_at         TIMESTAMPTZ,
  is_approved     BOOLEAN DEFAULT FALSE,
  seller_name     TEXT,
  seller_phone    TEXT,
  seller_email    TEXT,
  seller_whatsapp TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  approved_at     TIMESTAMPTZ,
  sold_at         TIMESTAMPTZ
);

-- ── Inspection requests ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inspection_requests (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  car_id             UUID REFERENCES cars(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  email              TEXT NOT NULL,
  phone              TEXT NOT NULL,
  whatsapp           TEXT,
  request_type       TEXT CHECK (request_type IN ('inspect','inspect_hold')),
  total_amount       BIGINT NOT NULL,
  paystack_reference TEXT UNIQUE,
  payment_status     TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed')),
  hold_granted       BOOLEAN DEFAULT FALSE,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ── Auctions ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auctions (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title        TEXT NOT NULL,
  description  TEXT,
  auction_date TIMESTAMPTZ NOT NULL,
  status       TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming','live','ended')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE auctions ENABLE ROW LEVEL SECURITY;

-- Public reads approved, non-sold cars only
CREATE POLICY "public_read_cars" ON cars
  FOR SELECT USING (is_approved = TRUE AND status != 'sold');

-- Public reads upcoming / live auctions
CREATE POLICY "public_read_auctions" ON auctions
  FOR SELECT USING (status IN ('upcoming','live'));

-- Service role bypass (backend uses service role key)
CREATE POLICY "service_all_cars"         ON cars               USING (auth.role() = 'service_role');
CREATE POLICY "service_all_inspections"  ON inspection_requests USING (auth.role() = 'service_role');
CREATE POLICY "service_all_auctions"     ON auctions            USING (auth.role() = 'service_role');

-- ── Storage (run after creating bucket in Supabase Storage UI) ────────────────
-- INSERT INTO storage.buckets (id, name, public) VALUES ('car-images', 'car-images', true)
--   ON CONFLICT DO NOTHING;

CREATE POLICY "public_read_images" ON storage.objects
  FOR SELECT USING (bucket_id = 'car-images');

CREATE POLICY "service_upload_images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'car-images' AND auth.role() = 'service_role');

CREATE POLICY "service_delete_images" ON storage.objects
  FOR DELETE USING (bucket_id = 'car-images' AND auth.role() = 'service_role');

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cars_status   ON cars(status);
CREATE INDEX IF NOT EXISTS idx_cars_approved ON cars(is_approved);
CREATE INDEX IF NOT EXISTS idx_insp_car      ON inspection_requests(car_id);
CREATE INDEX IF NOT EXISTS idx_insp_email    ON inspection_requests(email);
CREATE INDEX IF NOT EXISTS idx_insp_ref      ON inspection_requests(paystack_reference);
