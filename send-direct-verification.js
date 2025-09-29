// Send verification email directly using the same logic as the server
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, 'config.env') });

async function sendDirectVerification() {
  try {
    console.log('📧 Sending direct verification email...\n');
    
    // Import database and mailer
    const pool = (await import('./data/database.js')).default;
    const { transporter } = await import('./config/mailer.js');
    
    const email = 'maangelangalicia@iskolarngbayan.pup.edu.ph';
    
    // Check if user exists in pending table
    console.log('🔍 Checking for pending user...');
    const [pending] = await pool.execute(
      'SELECT * FROM users_pending WHERE LOWER(email) = ? LIMIT 1',
      [email.toLowerCase()]
    );
    
    if (pending.length === 0) {
      console.log('❌ No pending verification found for this email');
      console.log('💡 User may need to sign up first');
      return;
    }
    
    const user = pending[0];
    console.log(`✅ Found pending user: ${user.firstname} ${user.lastname}`);
    
    // Check if expired
    if (new Date(user.expiresat) < new Date()) {
      console.log('⏰ Verification link has expired');
      console.log('💡 User needs to sign up again');
      return;
    }
    
    const hoursLeft = Math.round((new Date(user.expiresat) - new Date()) / (1000 * 60 * 60));
    console.log(`⏱️ Verification expires in ${hoursLeft} hours`);
    
    // Create verification URL
    const verifyUrl = `http://localhost:5050/verify-student?token=${user.token}&email=${encodeURIComponent(email)}`;
    
    console.log('\n📧 Sending verification email...');
    console.log(`To: ${email}`);
    console.log(`Subject: Verify your email - ThesISKO`);
    
    const emailOptions = {
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: email,
      subject: 'Verify your email - ThesISKO',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #800000;">Welcome to ThesISKO!</h2>
          <p>Hello ${user.firstname},</p>
          <p>Thank you for registering as a student. Please verify your email by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}"
              style="display:inline-block;background:#4CAF50;color:white;
                     padding:15px 30px;text-decoration:none;border-radius:5px;
                     font-weight:bold;font-size:16px;">
              Verify Email Address
            </a>
          </div>
          <p>This link will expire in ${hoursLeft} hours.</p>
          <p>If you didn't create this account, please ignore this email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            This email was sent from ThesISKO System. Please do not reply to this email.
          </p>
        </div>
      `
    };
    
    const result = await transporter.sendMail(emailOptions);
    
    console.log('\n✅ Verification email sent successfully!');
    console.log(`📧 Message ID: ${result.messageId}`);
    console.log(`📧 Response: ${result.response}`);
    console.log(`📧 Accepted: ${JSON.stringify(result.accepted)}`);
    console.log(`📧 Rejected: ${JSON.stringify(result.rejected)}`);
    
    console.log('\n🎉 Email sent! Check your inbox and spam folder.');
    console.log('📊 This should now appear in your Brevo dashboard logs.');
    
    console.log(`\n🔗 Manual verification URL (if needed):`);
    console.log(verifyUrl);
    
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    console.error('Details:', error.message);
  } finally {
    process.exit(0);
  }
}

sendDirectVerification();
