-- =============================================================
--  GameBazaar — Complete Database Setup
--  Run this file once on a fresh PostgreSQL database.
--  Compatible with PostgreSQL 13+
--
--  Usage:
--    psql -U postgres -d gamebazaar -f database_setup.sql
--  OR paste into pgAdmin / DBeaver query window.
-- =============================================================


-- ─────────────────────────────────────────────────────────────
-- 0. EXTENSIONS
-- ─────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ─────────────────────────────────────────────────────────────
-- 1. ENUM TYPES
-- ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE role_enum AS ENUM ('ADMIN', 'USER');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE order_status_enum AS ENUM ('PENDING', 'DELIVERED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status_enum AS ENUM ('PENDING', 'SUCCESS', 'FAILED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;


-- ─────────────────────────────────────────────────────────────
-- 2. TABLES
-- ─────────────────────────────────────────────────────────────

-- Users
CREATE TABLE IF NOT EXISTS users (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                   VARCHAR(255) NOT NULL,
  email                  VARCHAR(255) UNIQUE NOT NULL,
  whatsapp_number        VARCHAR(20)  UNIQUE NOT NULL,
  password_hash          VARCHAR(255) NOT NULL,
  role                   role_enum    NOT NULL DEFAULT 'USER',
  refresh_token          TEXT,
  reset_password_token   VARCHAR(255),
  reset_password_expires TIMESTAMPTZ,
  is_active              BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Games
CREATE TABLE IF NOT EXISTS games (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_name      VARCHAR(255)    NOT NULL,
  description    TEXT            NOT NULL,
  features       TEXT[]          DEFAULT '{}',
  images         TEXT[]          DEFAULT '{}',
  original_price DECIMAL(10,2)   NOT NULL,
  sale_price     DECIMAL(10,2)   NOT NULL,
  category       VARCHAR(100)    NOT NULL,
  availability   BOOLEAN         NOT NULL DEFAULT TRUE,
  is_featured    BOOLEAN         NOT NULL DEFAULT FALSE,
  is_trending    BOOLEAN         NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Webhook events  (must exist before orders, orders has FK to it)
CREATE TABLE IF NOT EXISTS webhook_events (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  razorpay_event_id   VARCHAR(255) UNIQUE NOT NULL,
  event_type          VARCHAR(100) NOT NULL,
  payload             JSONB,
  processed           BOOLEAN      NOT NULL DEFAULT FALSE,
  processing_error    TEXT,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  processed_at        TIMESTAMPTZ
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID          NOT NULL REFERENCES users(id)          ON DELETE CASCADE,
  game_id          UUID          NOT NULL REFERENCES games(id)          ON DELETE CASCADE,
  payment_id       VARCHAR(255),
  razorpay_order_id VARCHAR(255),
  order_amount     DECIMAL(10,2) NOT NULL,
  status           order_status_enum NOT NULL DEFAULT 'PENDING',
  delivery_notes   TEXT,
  webhook_event_id UUID          REFERENCES webhook_events(id)          ON DELETE SET NULL,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Idempotency keys  (must exist before payments, payments has FK to it)
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  idempotency_key     VARCHAR(255) UNIQUE NOT NULL,
  user_id             UUID          NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  game_id             UUID          NOT NULL REFERENCES games(id)  ON DELETE CASCADE,
  razorpay_order_id   VARCHAR(255)  NOT NULL,
  amount              DECIMAL(10,2) NOT NULL,
  status              VARCHAR(20)   NOT NULL DEFAULT 'PENDING',  -- PENDING | USED | EXPIRED
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  expires_at          TIMESTAMPTZ   NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes')
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  razorpay_payment_id  VARCHAR(255) UNIQUE NOT NULL,
  razorpay_order_id    VARCHAR(255) UNIQUE NOT NULL,
  user_id              UUID          NOT NULL REFERENCES users(id)           ON DELETE CASCADE,
  order_id             UUID          REFERENCES orders(id)                   ON DELETE SET NULL,
  idempotency_key_id   UUID          REFERENCES idempotency_keys(id)        ON DELETE SET NULL,
  amount               DECIMAL(10,2) NOT NULL,
  currency             VARCHAR(10)   NOT NULL DEFAULT 'INR',
  status               payment_status_enum NOT NULL DEFAULT 'PENDING',
  source               VARCHAR(20)   DEFAULT 'checkout',  -- checkout | webhook | webhook_confirmed
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────
-- 3. INDEXES
-- ─────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_users_email             ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_whatsapp          ON users(whatsapp_number);

CREATE INDEX IF NOT EXISTS idx_games_name              ON games(game_name);
CREATE INDEX IF NOT EXISTS idx_games_category          ON games(category);
CREATE INDEX IF NOT EXISTS idx_games_availability      ON games(availability);
CREATE INDEX IF NOT EXISTS idx_games_featured          ON games(is_featured);
CREATE INDEX IF NOT EXISTS idx_games_trending          ON games(is_trending);

CREATE INDEX IF NOT EXISTS idx_orders_user_id          ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_game_id          ON orders(game_id);
CREATE INDEX IF NOT EXISTS idx_orders_status           ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at       ON orders(created_at);

CREATE INDEX IF NOT EXISTS idx_payments_razorpay_id    ON payments(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id        ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at     ON payments(created_at);

CREATE INDEX IF NOT EXISTS idx_idempotency_key         ON idempotency_keys(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_idempotency_user_game   ON idempotency_keys(user_id, game_id, status);

CREATE INDEX IF NOT EXISTS idx_webhook_event_id        ON webhook_events(razorpay_event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_type_created    ON webhook_events(event_type, created_at);


-- ─────────────────────────────────────────────────────────────
-- 4. AUTO-UPDATE updated_at TRIGGER
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at  ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_games_updated_at  ON games;
CREATE TRIGGER update_games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ─────────────────────────────────────────────────────────────
-- 5. SEED DATA — ADMIN USER
--    Password: Admin@123  (bcrypt hash, cost=12)
--    ⚠️  Change the password after first login!
-- ─────────────────────────────────────────────────────────────

INSERT INTO users (name, email, whatsapp_number, password_hash, role)
VALUES (
  'Admin',
  'admin@gamebazaar.com',
  '919999999999',
  -- bcrypt hash of "Admin@123" (cost 12) — generated via Node bcryptjs
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4oJMDpSHVK',
  'ADMIN'
)
ON CONFLICT (email) DO UPDATE
  SET role = 'ADMIN';


-- ─────────────────────────────────────────────────────────────
-- 6. SEED DATA — GAMES
--    These are the games currently listed in the store.
--    Images are uploaded files — paths are relative to /uploads/.
--    Replace image paths if you are setting up on a new server.
-- ─────────────────────────────────────────────────────────────

INSERT INTO games (
  id, game_name, description, features, images,
  original_price, sale_price, category,
  availability, is_featured, is_trending
) VALUES

-- GTA V
(
  '063296ed-17f3-4c44-a9ef-9706ef20ef1e',
  'GTA V',
  'Open world crime game',
  ARRAY[]::TEXT[],
  ARRAY['uploads/games/game-1781719257534-774256908.jpg'],
  1280.00, 299.00, 'RPG',
  TRUE, FALSE, TRUE
),

-- Cyberpunk 2077
(
  '6b6d7533-a79e-41a9-a641-ad5ceaacbc34',
  'Cyberpunk 2077',
  'Cyberpunk 2077 available in minimum price on steam go and enroll this . offer valid for the limited time.',
  ARRAY[]::TEXT[],
  ARRAY[
    'uploads/games/game-1781718384927-773843073.jpg',
    'uploads/games/game-1781718384930-613048415.jpg',
    'uploads/games/game-1781718384942-679245468.jpg',
    'uploads/games/game-1781718407671-39611725.jpg',
    'uploads/games/game-1781718420204-852204620.jpg',
    'uploads/games/game-1781718429261-203316556.jpg'
  ],
  3499.00, 399.00, 'RPG',
  TRUE, FALSE, TRUE
),

-- Red Dead Redemption 2
(
  'fe953cff-0c04-4a3f-855c-77778ae49fc5',
  'Red Dead Redemption 2',
  'Offer Valid for Limited Time',
  ARRAY[]::TEXT[],
  ARRAY['uploads/games/game-1781718717666-415497126.jpg'],
  3499.00, 299.00, 'Adventure',
  TRUE, FALSE, TRUE
)

ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- 7. VERIFICATION QUERIES  (optional — run to confirm setup)
-- ─────────────────────────────────────────────────────────────

-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public'
--   ORDER BY table_name;

-- SELECT id, name, email, role, created_at FROM users;

-- SELECT id, game_name, sale_price, category, availability, is_trending FROM games;
