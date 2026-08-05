/**
 * Session Management Test
 * Tests that sessions are properly created and stored in PostgreSQL
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from '../data/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables BEFORE using pool
dotenv.config({ path: join(__dirname, '../config.env') });

async function testSessionTable() {
  console.log('\n🔍 Testing Session Table...');
  try {
    // Check if table exists
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'session'
      );
    `);

    if (!result.rows[0].exists) {
      console.error('❌ Session table does not exist');
      return false;
    }

    console.log('✅ Session table exists');
    return true;
  } catch (error) {
    console.error('❌ Error checking session table:', error.message);
    return false;
  }
}

async function testSessionInsert() {
  console.log('\n🔍 Testing Session Insert...');
  try {
    // Create a test session
    const testSessionId = 'test_' + Date.now();
    const testData = {
      passport: {
        user: {
          id: 'test-user-123',
          email: 'test@example.com',
          role_id: 2
        }
      }
    };

    const expireTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    await pool.query(
      'INSERT INTO session (sid, sess, expire) VALUES ($1, $2, $3)',
      [testSessionId, JSON.stringify(testData), expireTime]
    );

    console.log('✅ Test session inserted successfully');
    console.log(`   Session ID: ${testSessionId}`);
    console.log(`   User: ${testData.passport.user.email}`);
    console.log(`   Expires: ${expireTime.toISOString()}`);

    return testSessionId;
  } catch (error) {
    console.error('❌ Error inserting test session:', error.message);
    return null;
  }
}

async function testSessionRead(sessionId) {
  console.log('\n🔍 Testing Session Read...');
  try {
    const result = await pool.query(
      'SELECT sid, sess, expire FROM session WHERE sid = $1',
      [sessionId]
    );

    if (result.rows.length === 0) {
      console.error('❌ Test session not found');
      return false;
    }

    const row = result.rows[0];
    console.log('✅ Test session retrieved successfully');
    console.log(`   Session ID: ${row.sid}`);
    console.log(`   User Email: ${row.sess.passport.user.email}`);
    console.log(`   Expires: ${row.expire.toISOString()}`);

    return true;
  } catch (error) {
    console.error('❌ Error reading test session:', error.message);
    return false;
  }
}

async function testSessionCleanup(sessionId) {
  console.log('\n🔍 Testing Session Cleanup...');
  try {
    await pool.query('DELETE FROM session WHERE sid = $1', [sessionId]);
    console.log('✅ Test session deleted successfully');
    return true;
  } catch (error) {
    console.error('❌ Error deleting test session:', error.message);
    return false;
  }
}

async function testSessionStats() {
  console.log('\n🔍 Testing Session Statistics...');
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN expire > NOW() THEN 1 END) as active_sessions,
        COUNT(CASE WHEN expire <= NOW() THEN 1 END) as expired_sessions
      FROM session;
    `);

    const stats = result.rows[0];
    console.log('✅ Session statistics retrieved');
    console.log(`   Total Sessions: ${stats.total_sessions}`);
    console.log(`   Active Sessions: ${stats.active_sessions}`);
    console.log(`   Expired Sessions: ${stats.expired_sessions}`);

    return true;
  } catch (error) {
    console.error('❌ Error retrieving session statistics:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 SESSION MANAGEMENT TESTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const tableTest = await testSessionTable();
  
  if (!tableTest) {
    console.log('\n❌ Session table test failed. Run this first:');
    console.log('   node server/setup-sessions.js\n');
    process.exit(1);
  }

  const insertTest = await testSessionInsert();
  const readTest = insertTest ? await testSessionRead(insertTest) : false;
  const cleanupTest = insertTest ? await testSessionCleanup(insertTest) : false;
  const statsTest = await testSessionStats();

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 TEST RESULTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Session Table:    ${tableTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Session Insert:   ${insertTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Session Read:     ${readTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Session Cleanup:  ${cleanupTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Session Stats:    ${statsTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const allPassed = tableTest && insertTest && readTest && cleanupTest && statsTest;
  process.exit(allPassed ? 0 : 1);
}

runTests();
