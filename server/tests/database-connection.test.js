/**
 * Database Connection Test
 * Tests MongoDB and PostgreSQL database connections
 */

import mongoose from 'mongoose';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../config.env') });

let pgPool;

async function testMongoConnection() {
  console.log('\n🔍 Testing MongoDB Connection...');
  try {
    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB connection successful');
    console.log(`   Connected to: ${mongoose.connection.name}`);
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return false;
  }
}

async function testPostgresConnection() {
  console.log('\n🔍 Testing PostgreSQL Connection...');
  try {
    pgPool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    const client = await pgPool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    
    console.log('✅ PostgreSQL connection successful');
    console.log(`   Server time: ${result.rows[0].now}`);
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 DATABASE CONNECTION TESTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const mongoSuccess = await testMongoConnection();
  const postgresSuccess = await testPostgresConnection();

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 TEST RESULTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`MongoDB:    ${mongoSuccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`PostgreSQL: ${postgresSuccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Cleanup
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
  if (pgPool) {
    await pgPool.end();
  }

  const allPassed = mongoSuccess && postgresSuccess;
  process.exit(allPassed ? 0 : 1);
}

runTests();
