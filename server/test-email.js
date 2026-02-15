/**
 * Email Service Test Script
 * Tests all configured email providers
 */

import 'dotenv/config';
import { sendEmail, getProvidersStatus, testEmailService } from './services/emailService.js';

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📧 THESISKO EMAIL SERVICE TEST');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Show provider configuration
console.log('📋 PROVIDER CONFIGURATION:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Brevo SMTP Host:', process.env.BREVO_SMTP_HOST);
console.log('Brevo SMTP User:', process.env.BREVO_SMTP_USER);
console.log('Brevo From Email:', process.env.BREVO_MAIL_FROM);
console.log('');
console.log('Resend API Key:', process.env.RESEND_API_KEY ? 'Configured ✓' : 'Missing ✗');
console.log('Resend From Email:', process.env.RESEND_MAIL_FROM);
console.log('');
console.log('Gmail SMTP Host:', process.env.SMTP_HOST);
console.log('Gmail From Email:', process.env.MAIL_FROM);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Show provider status
const status = getProvidersStatus();
console.log('📊 PROVIDER STATUS:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
Object.entries(status).forEach(([key, provider]) => {
  const icon = provider.enabled ? '✅' : '❌';
  console.log(`${icon} ${provider.name} (Priority ${provider.priority})`);
  console.log(`   Daily Limit: ${provider.dailyLimit}`);
  console.log(`   Enabled: ${provider.enabled}`);
  console.log('');
});
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Test email sending
const testEmail = process.argv[2] || 'test@example.com';

console.log(`🧪 TESTING EMAIL SEND TO: ${testEmail}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

try {
  await testEmailService(testEmail);
  console.log('\n✅ TEST COMPLETED SUCCESSFULLY!\n');
  process.exit(0);
} catch (error) {
  console.error('\n❌ TEST FAILED!');
  console.error('Error:', error.message);
  console.error('\n💡 TROUBLESHOOTING TIPS:');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (error.message.includes('noreply@thesisko.online')) {
    console.error('🔴 SENDER EMAIL NOT VERIFIED IN BREVO');
    console.error('   Solution:');
    console.error('   1. Go to Brevo → Senders & IP → Domains');
    console.error('   2. Verify domain: thesisko.online');
    console.error('   3. Add DNS records provided by Brevo');
    console.error('   4. Go to Senders & IP → Senders');
    console.error('   5. Add sender: noreply@thesisko.online');
    console.error('   6. Wait for verification (24-48 hours)');
    console.error('');
    console.error('   ⚡ QUICK FIX: Use thesiskopup@gmail.com temporarily');
    console.error('      Change BREVO_MAIL_FROM=thesiskopup@gmail.com');
  } else if (error.message.includes('550') || error.message.includes('not verified')) {
    console.error('🔴 SENDER NOT AUTHORIZED');
    console.error('   The sender email must be verified in Brevo first.');
  } else if (error.message.includes('authentication')) {
    console.error('🔴 AUTHENTICATION FAILED');
    console.error('   Check your BREVO_SMTP_USER and BREVO_SMTP_PASS');
  } else {
    console.error('🔴 UNKNOWN ERROR');
    console.error('   Check the error message above for details.');
  }
  
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  process.exit(1);
}

