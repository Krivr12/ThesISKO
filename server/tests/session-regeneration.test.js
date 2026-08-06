/**
 * Session Regeneration Security Test Suite
 * 
 * Tests to verify that session IDs properly regenerate on login,
 * preventing session fixation attacks.
 * 
 * Run with: npm test -- session-regeneration.test.js
 * Or manually test endpoints with curl/Postman using SESSION_REGENERATION_VERIFICATION_GUIDE.md
 */

import http from 'http';
import assert from 'assert';

/**
 * Helper function to make HTTP requests and capture cookies
 */
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          cookies: parseCookies(res.headers['set-cookie']),
          body: data
        });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

/**
 * Parse Set-Cookie headers to extract session ID
 */
function parseCookies(setCookieHeaders) {
  const cookies = {};
  if (!setCookieHeaders) return cookies;
  
  (Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders]).forEach(cookie => {
    const [nameValue] = cookie.split(';');
    const [name, value] = nameValue.split('=');
    cookies[name.trim()] = value.trim();
  });
  
  return cookies;
}

/**
 * Extract session ID from Connect.SID cookie
 */
function extractSessionId(cookies) {
  return cookies['connect.sid'] || cookies['sessionid'] || null;
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe('Session Regeneration Security Tests', () => {
  
  const baseUrl = 'http://localhost:5050';
  const testUser = {
    email: 'christopherbryansevangelista@iskolarngbayan.pup.edu.ph',
    password: 'testingbsit!'
  };
  
  const testAdmin = {
    email: 'bryansalmo75@gmail.com',
    password: '07W0aeoO'
  };

  // =========================================================================
  // TEST 1: Regular User Login - Session Should Regenerate
  // =========================================================================
  it('TEST 1: Regular user login should regenerate session ID', async function() {
    this.timeout(5000);
    
    console.log('\n📋 TEST 1: Regular Login Session Regeneration');
    console.log('═'.repeat(50));
    
    // Step 1: Get initial session (pre-login)
    console.log('Step 1: Getting initial session (pre-login)...');
    const initialResp = await makeRequest({
      hostname: 'localhost',
      port: 5050,
      path: '/health', // Any endpoint to get initial session
      method: 'GET'
    });
    
    const sessionBefore = extractSessionId(initialResp.cookies);
    console.log(`✓ Initial session ID: ${sessionBefore || 'none'}`);
    
    // Step 2: Submit login credentials
    console.log('\nStep 2: Submitting login credentials...');
    const loginData = JSON.stringify({
      email: testUser.email,
      password: testUser.password
    });
    
    const loginResp = await makeRequest({
      hostname: 'localhost',
      port: 5050,
      path: '/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    }, loginData);
    
    const sessionAfter = extractSessionId(loginResp.cookies);
    console.log(`✓ Session ID after login: ${sessionAfter || 'none'}`);
    console.log(`✓ Login status: ${loginResp.status}`);
    
    // Step 3: Verify session regeneration
    console.log('\nStep 3: Verifying session regeneration...');
    if (loginResp.status === 200) {
      console.log('✓ Login successful (200 OK)');
      
      if (sessionBefore && sessionAfter && sessionBefore !== sessionAfter) {
        console.log('✅ PASS: Session ID changed (regeneration occurred)');
        return true;
      } else if (sessionAfter && !sessionBefore) {
        console.log('✅ PASS: New session ID created after login');
        return true;
      } else {
        console.log('❌ FAIL: Session ID did not change');
        console.log(`  Before: ${sessionBefore}`);
        console.log(`  After: ${sessionAfter}`);
        throw new Error('Session not regenerated');
      }
    } else {
      console.log(`⚠️ Login failed with status ${loginResp.status}`);
      console.log(`Response: ${loginResp.body}`);
      throw new Error('Login failed');
    }
  });

  // =========================================================================
  // TEST 2: Admin Login - Session Should Regenerate
  // =========================================================================
  it('TEST 2: Admin login should regenerate session ID', async function() {
    this.timeout(5000);
    
    console.log('\n📋 TEST 2: Admin Login Session Regeneration');
    console.log('═'.repeat(50));
    
    // Step 1: Get initial session
    console.log('Step 1: Getting initial session (pre-login)...');
    const initialResp = await makeRequest({
      hostname: 'localhost',
      port: 5050,
      path: '/health',
      method: 'GET'
    });
    
    const sessionBefore = extractSessionId(initialResp.cookies);
    console.log(`✓ Initial session ID: ${sessionBefore || 'none'}`);
    
    // Step 2: Submit admin login
    console.log('\nStep 2: Submitting admin login credentials...');
    const loginData = JSON.stringify({
      email: testAdmin.email,
      password: testAdmin.password
    });
    
    const loginResp = await makeRequest({
      hostname: 'localhost',
      port: 5050,
      path: '/auth/admin-login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    }, loginData);
    
    const sessionAfter = extractSessionId(loginResp.cookies);
    console.log(`✓ Session ID after admin login: ${sessionAfter || 'none'}`);
    console.log(`✓ Admin login status: ${loginResp.status}`);
    
    // Step 3: Verify session regeneration
    console.log('\nStep 3: Verifying session regeneration...');
    if (loginResp.status === 200) {
      console.log('✓ Admin login successful (200 OK)');
      
      if (sessionBefore && sessionAfter && sessionBefore !== sessionAfter) {
        console.log('✅ PASS: Admin session ID changed (regeneration occurred)');
        return true;
      } else if (sessionAfter && !sessionBefore) {
        console.log('✅ PASS: New admin session ID created after login');
        return true;
      } else {
        console.log('❌ FAIL: Admin session ID did not change');
        throw new Error('Admin session not regenerated');
      }
    } else {
      console.log(`⚠️ Admin login failed with status ${loginResp.status}`);
      throw new Error('Admin login failed');
    }
  });

  // =========================================================================
  // TEST 3: Old Session Should Be Invalid After Login
  // =========================================================================
  it('TEST 3: Old session ID should not work after login', async function() {
    this.timeout(5000);
    
    console.log('\n📋 TEST 3: Old Session Invalidation');
    console.log('═'.repeat(50));
    
    // Step 1: Get initial session
    console.log('Step 1: Getting initial session...');
    const initialResp = await makeRequest({
      hostname: 'localhost',
      port: 5050,
      path: '/health',
      method: 'GET'
    });
    
    const oldSession = extractSessionId(initialResp.cookies);
    console.log(`✓ Initial session ID: ${oldSession}`);
    
    // Step 2: Login (which should invalidate old session)
    console.log('\nStep 2: Logging in (should invalidate old session)...');
    const loginData = JSON.stringify({
      email: testUser.email,
      password: testUser.password
    });
    
    await makeRequest({
      hostname: 'localhost',
      port: 5050,
      path: '/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    }, loginData);
    
    console.log('✓ Login completed');
    
    // Step 3: Try to use old session
    console.log('\nStep 3: Attempting to use old session...');
    const oldSessionResp = await makeRequest({
      hostname: 'localhost',
      port: 5050,
      path: '/auth/me',
      method: 'GET',
      headers: {
        'Cookie': `connect.sid=${oldSession}`
      }
    });
    
    console.log(`✓ Response status: ${oldSessionResp.status}`);
    
    if (oldSessionResp.status === 401 || oldSessionResp.status === 403) {
      console.log('✅ PASS: Old session properly rejected (401/403)');
      return true;
    } else if (oldSessionResp.status === 200) {
      console.log('❌ FAIL: Old session still works (should be invalid)');
      throw new Error('Old session not invalidated');
    } else {
      console.log(`⚠️ Unexpected status: ${oldSessionResp.status}`);
      throw new Error('Unexpected response');
    }
  });

  // =========================================================================
  // TEST 4: Session Error Handling
  // =========================================================================
  it('TEST 4: Session errors should be handled gracefully', async function() {
    this.timeout(5000);
    
    console.log('\n📋 TEST 4: Error Handling');
    console.log('═'.repeat(50));
    
    // Step 1: Login with invalid credentials
    console.log('Step 1: Testing invalid credentials...');
    const loginData = JSON.stringify({
      email: 'invalid@example.com',
      password: 'wrongpassword'
    });
    
    const resp = await makeRequest({
      hostname: 'localhost',
      port: 5050,
      path: '/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    }, loginData);
    
    console.log(`✓ Response status: ${resp.status}`);
    console.log(`✓ Response: ${resp.body}`);
    
    if (resp.status === 401) {
      console.log('✅ PASS: Invalid credentials properly rejected');
      return true;
    } else {
      console.log('❌ FAIL: Expected 401 for invalid credentials');
      throw new Error('Unexpected error handling');
    }
  });

});

// ============================================================================
// MANUAL TESTING COMMANDS
// ============================================================================

/**
 * To run these tests:
 * 
 * 1. Start the server:
 *    npm run dev --prefix server
 * 
 * 2. Run tests with npm:
 *    npm test --prefix server
 * 
 * 3. Or use curl for manual testing:
 * 
 *    # Get initial session
 *    curl -v http://localhost:5050/health
 *    # Note sessionID from Set-Cookie header
 *    
 *    # Login
 *    curl -X POST http://localhost:5050/auth/login \
 *      -H "Content-Type: application/json" \
 *      -d '{"email":"test@example.com","password":"TestPassword123!"}'
 *    # Note new sessionID from Set-Cookie header (should be different)
 *    
 *    # Try to use old session
 *    curl -b "connect.sid=OLD_SESSION_ID" http://localhost:5050/auth/me
 *    # Should get 401 Unauthorized
 * 
 * 4. Or use Postman:
 *    - Create requests for /auth/login and /auth/me
 *    - Enable "Send cookies with requests"
 *    - Check that session ID changes after login
 *    - Clear cookies and try old session - should fail
 */

export default { makeRequest, extractSessionId, parseCookies };
