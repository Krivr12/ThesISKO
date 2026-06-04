/**
 * Authentication Test
 * Tests JWT token generation and validation
 */

import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../config.env') });

function testJWTSecret() {
  console.log('\n🔍 Testing JWT Secret Configuration...');
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    console.error('❌ JWT_SECRET not configured');
    return false;
  }
  
  if (secret.length < 32) {
    console.error('❌ JWT_SECRET too short (should be at least 32 characters)');
    return false;
  }
  
  console.log('✅ JWT_SECRET configured properly');
  console.log(`   Length: ${secret.length} characters`);
  return true;
}

function testTokenGeneration() {
  console.log('\n🔍 Testing JWT Token Generation...');
  try {
    const payload = {
      id: 'test-user-123',
      email: 'test@example.com',
      role: 'student'
    };
    
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '24h'
    });
    
    console.log('✅ JWT token generated successfully');
    console.log(`   Token length: ${token.length} characters`);
    return { success: true, token };
  } catch (error) {
    console.error('❌ JWT token generation failed:', error.message);
    return { success: false, token: null };
  }
}

function testTokenValidation(token) {
  console.log('\n🔍 Testing JWT Token Validation...');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    console.log('✅ JWT token validation successful');
    console.log(`   User ID: ${decoded.id}`);
    console.log(`   Email: ${decoded.email}`);
    console.log(`   Role: ${decoded.role}`);
    return true;
  } catch (error) {
    console.error('❌ JWT token validation failed:', error.message);
    return false;
  }
}

function testInvalidToken() {
  console.log('\n🔍 Testing Invalid Token Rejection...');
  try {
    const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.token';
    jwt.verify(fakeToken, process.env.JWT_SECRET);
    
    console.error('❌ Invalid token was not rejected');
    return false;
  } catch (error) {
    console.log('✅ Invalid token properly rejected');
    return true;
  }
}

async function runTests() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 AUTHENTICATION TESTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const secretTest = testJWTSecret();
  const { success: genSuccess, token } = testTokenGeneration();
  const validationTest = genSuccess ? testTokenValidation(token) : false;
  const invalidTest = testInvalidToken();

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 TEST RESULTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`JWT Secret:         ${secretTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Token Generation:   ${genSuccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Token Validation:   ${validationTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Invalid Rejection:  ${invalidTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const allPassed = secretTest && genSuccess && validationTest && invalidTest;
  process.exit(allPassed ? 0 : 1);
}

runTests();
