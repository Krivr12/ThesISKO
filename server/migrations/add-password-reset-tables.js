/**
 * Migration: Add Password Reset Tables
 * 
 * Creates:
 *   - password_reset_tokens  : stores hashed tokens with expiry
 *   - password_change_audit  : immutable audit log of all password changes
 * Alters:
 *   - users_info             : adds last_password_change, updated_at columns
 * 
 * Usage: node migrations/add-password-reset-tables.js
 */

import pkg from 'pg';
const { Pool } = pkg;
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from config.env (same pattern as setup-sessions.js)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

const migrations = [
  {
    name: 'create_password_reset_tokens',
    sql: `
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        reset_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id       INTEGER NOT NULL,
        email         VARCHAR(255) NOT NULL,

        -- Hashed token stored in DB; plain token travels only in the email link
        reset_token_hash  VARCHAR(255) NOT NULL,

        created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at    TIMESTAMP NOT NULL,

        -- Usage tracking
        is_used       BOOLEAN NOT NULL DEFAULT FALSE,
        used_at       TIMESTAMP,
        used_by_ip    VARCHAR(45),

        -- Request metadata for audit
        request_ip    VARCHAR(45),
        request_user_agent TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_prt_user_id   ON password_reset_tokens (user_id);
      CREATE INDEX IF NOT EXISTS idx_prt_email      ON password_reset_tokens (email);
      CREATE INDEX IF NOT EXISTS idx_prt_expires_at ON password_reset_tokens (expires_at);
    `
  },
  {
    name: 'create_password_change_audit',
    sql: `
      CREATE TABLE IF NOT EXISTS password_change_audit (
        audit_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     INTEGER NOT NULL,
        change_type VARCHAR(50) NOT NULL,  -- 'password_reset' | 'admin_reset' | 'user_change'
        changed_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        changed_by  VARCHAR(100),          -- 'user_self' | 'admin:{id}' | 'system'
        ip_address  VARCHAR(45),
        user_agent  TEXT,
        success     BOOLEAN DEFAULT TRUE
      );

      CREATE INDEX IF NOT EXISTS idx_pca_user_id   ON password_change_audit (user_id);
      CREATE INDEX IF NOT EXISTS idx_pca_changed_at ON password_change_audit (changed_at);
    `
  },
  {
    name: 'add_users_info_password_columns',
    sql: `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users_info' AND column_name = 'last_password_change'
        ) THEN
          ALTER TABLE users_info ADD COLUMN last_password_change TIMESTAMP;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users_info' AND column_name = 'updated_at'
        ) THEN
          ALTER TABLE users_info ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;
      END$$;
    `
  }
];

async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔧 Running Password Reset Migrations');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    for (const migration of migrations) {
      try {
        await client.query(migration.sql);
        console.log(`✅ ${migration.name}`);
      } catch (err) {
        console.error(`❌ ${migration.name}:`, err.message);
        throw err;
      }
    }

    console.log('\n✅ All migrations completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch(err => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
