/**
 * Quick Test Script for Contact Form
 * 
 * Usage: node test-contact-form.js
 * 
 * This script tests the contact form endpoint directly
 */

import 'dotenv/config';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load config.env
import dotenv from 'dotenv';
dotenv.config({ path: join(__dirname, 'config.env') });

async function testContactForm() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 TESTING CONTACT FORM');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const baseUrl = process.env.BASE_URL || 'http://localhost:5050';
  const contactUrl = `${baseUrl}/contact`;

  // Test data
  const testData = {
    name: 'Test User',
    email: 'test@example.com',
    subject: 'Test Contact Form Submission',
    message: 'This is a test message to verify the contact form is working correctly.'
  };

  console.log('📤 Sending test contact form submission...');
  console.log('URL:', contactUrl);
  console.log('Data:', JSON.stringify(testData, null, 2));
  console.log('');

  try {
    // Use Node's built-in http/https modules
    const http = await import('http');
    const https = await import('https');
    const { URL } = await import('url');
    
    const urlObj = new URL(contactUrl);
    const client = urlObj.protocol === 'https:' ? https : http;
    const postData = JSON.stringify(testData);

    const response = await new Promise((resolve, reject) => {
      const req = client.request(contactUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: () => Promise.resolve(JSON.parse(data))
          });
        });
      });
      
      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log('✅ SUCCESS!');
      console.log('Response:', JSON.stringify(result, null, 2));
      console.log('\n📧 Check the superadmin email inbox for the message!');
    } else {
      console.log('❌ FAILED!');
      console.log('Status:', response.status);
      console.log('Response:', JSON.stringify(result, null, 2));
      
      if (result.error?.includes('Superadmin not found')) {
        console.log('\n💡 TROUBLESHOOTING:');
        console.log('   No superadmin found in database.');
        console.log('   Solution: Create a user with role_id = 5');
        console.log('   SQL: SELECT * FROM users_info WHERE role_id = 5;');
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return result;

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('\n💡 TROUBLESHOOTING:');
    console.error('   1. Make sure backend server is running on port 5050');
    console.error('   2. Check if the /contact endpoint is accessible');
    console.error('   3. Verify CORS settings allow requests');
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    process.exit(1);
  }
}

// Run the test
testContactForm();

