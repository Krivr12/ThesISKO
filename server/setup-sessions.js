/**
 * Setup Session Table in Supabase PostgreSQL
 * 
 * This script creates the required session table for express-session
 * with the connect-pg-simple store. Run this once to set up sessions.
 * 
 * Usage: node setup-sessions.js
 */

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, 'config.env') });

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// SQL to create session table (compatible with connect-pg-simple)
const CREATE_SESSION_TABLE = `
  CREATE TABLE IF NOT EXISTS session (
    sid varchar NOT NULL COLLATE "default",
    sess json NOT NULL,
    expire timestamp(6) NOT NULL,
    PRIMARY KEY (sid)
  );

  CREATE INDEX IF NOT EXISTS IDX_session_expire ON session (expire);
`;

async function setupSessions() {
  const client = await pool.connect();
  try {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔧 Setting up Session Table');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Execute the SQL
    await client.query(CREATE_SESSION_TABLE);

    console.log('✅ Session table created successfully!');
    console.log('📊 Table: session');
    console.log('📋 Columns: sid (primary key), sess (JSON), expire (timestamp)');
    console.log('📈 Index on expire column for cleanup performance\n');

    // Verify table exists
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'session'
      );
    `);

    if (result.rows[0].exists) {
      console.log('✅ Verification successful - session table exists');
      
      // Show table info
      const tableInfo = await client.query(`
        SELECT 
          column_name, 
          data_type, 
          is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'session'
        ORDER BY ordinal_position;
      `);

      console.log('\n📋 Table Structure:');
      tableInfo.rows.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(NOT NULL)';
        console.log(`   • ${col.column_name}: ${col.data_type} ${nullable}`);
      });

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🎉 Session table setup complete!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    } else {
      console.error('❌ Table verification failed');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error setting up session table:', error.message);
    
    if (error.message.includes('COLLATE')) {
      console.log('\n💡 Tip: Your PostgreSQL might not support COLLATE "default"');
      console.log('   Trying alternative syntax...\n');
      
      // Retry without COLLATE for some PostgreSQL versions
      try {
        const ALTER_SESSION_TABLE = `
          CREATE TABLE IF NOT EXISTS session (
            sid varchar NOT NULL,
            sess json NOT NULL,
            expire timestamp(6) NOT NULL,
            PRIMARY KEY (sid)
          );

          CREATE INDEX IF NOT EXISTS IDX_session_expire ON session (expire);
        `;
        
        await client.query(ALTER_SESSION_TABLE);
        console.log('✅ Session table created with alternative syntax!');
      } catch (retryError) {
        console.error('❌ Retry failed:', retryError.message);
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

// Run setup
setupSessions().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
