/**
 * Test script to verify submission rejection emails
 * Run: node test-rejection-email.js
 */

import dotenv from 'dotenv';
// Load BEFORE importing emailService so env vars are available
dotenv.config({ path: './config.env' });

import { sendEmail, getProvidersStatus } from './services/emailService.js';

async function testRejectionEmail() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 TESTING SUBMISSION REJECTION EMAIL');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Check provider status
  console.log('📌 Email Provider Status:');
  const status = getProvidersStatus();
  console.log(JSON.stringify(status, null, 2));
  console.log();

  // Check environment variables
  console.log('📌 Environment Variables:');
  console.log(`   RESEND_API_KEY: ${process.env.RESEND_API_KEY ? '✅ Set' : '❌ NOT SET'}`);
  console.log(`   RESEND_MAIL_FROM: ${process.env.RESEND_MAIL_FROM || 'Not set (using MAIL_FROM)'}`);
  console.log(`   MAIL_FROM: ${process.env.MAIL_FROM || '❌ NOT SET'}`);
  console.log(`   SMTP_HOST: ${process.env.SMTP_HOST ? '✅ Set' : '❌ NOT SET'}`);
  console.log(`   FRONTEND_URL: ${process.env.FRONTEND_URL || 'Not set (using default)'}`);
  console.log();

  // Test email address - use your test email
  const testEmail = 'christopherbryansevangelista@iskolarngbayan.pup.edu.ph'; // Change if needed
  
  console.log(`📧 Sending test rejection email to: ${testEmail}`);
  console.log();

  try {
    const result = await sendEmail({
      to: testEmail,
      subject: 'Submission Rejected - TEST 2026-CCIS-BSIT-0003',
      template: 'submissionRejection',
      data: {
        submissionId: '2026-CCIS-BSIT-0003',
        submissionTitle: 'Test Thesis Submission',
        documentType: 'Thesis',
        program: 'BS Information Technology',
        rejectedBy: 'Christopher Bryan Evangelista',
        rejectionDate: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        rejectionReason: 'This is a TEST rejection email. The main thesis file is missing.',
        rejectedFiles: ['thesis.pdf', 'abstract.txt'],
        needsChairpersonApproval: false,
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4200'
      }
    });

    console.log('\n✅ EMAIL SENT SUCCESSFULLY!\n');
    console.log('Result:', JSON.stringify(result, null, 2));
    console.log('\n📌 Next Steps:');
    console.log('   1. Check your email inbox for the rejection email');
    console.log('   2. Check spam/junk folder if not in inbox');
    console.log('   3. If not received, check the error details above');
    console.log('   4. Verify API key in config.env is correct');
    console.log('   5. Check Resend dashboard at https://resend.com/emails\n');
    
  } catch (error) {
    console.error('\n❌ EMAIL FAILED TO SEND\n');
    console.error('Error:', error.message);
    console.error('\nFull error object:');
    console.error(error);
    
    console.log('\n🔍 TROUBLESHOOTING:\n');
    if (!process.env.RESEND_API_KEY) {
      console.log('   ❌ RESEND_API_KEY not set in config.env');
    }
    if (!process.env.MAIL_FROM && !process.env.RESEND_MAIL_FROM) {
      console.log('   ❌ MAIL_FROM or RESEND_MAIL_FROM not set in config.env');
    }
    console.log('   ✅ Check config.env for correct API keys');
    console.log('   ✅ Verify the email address format is correct');
    console.log('   ✅ Check Resend account usage limits\n');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

testRejectionEmail().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
