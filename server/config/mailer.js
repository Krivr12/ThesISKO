import nodemailer from 'nodemailer'

// Debug environment variables
console.log('📧 Email Configuration Debug:');
console.log('SMTP_HOST:', process.env.SMTP_HOST || 'NOT SET');
console.log('SMTP_PORT:', process.env.SMTP_PORT || 'NOT SET');
console.log('SMTP_USER:', process.env.SMTP_USER ? 'SET' : 'NOT SET');
console.log('SMTP_PASS:', process.env.SMTP_PASS ? 'SET' : 'NOT SET');

// Centralized mail transporter used across routes
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
  port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || '959561001@smtp-brevo.com',
    pass: process.env.SMTP_PASS || 'xsmtpsib-dc1d10df1f26fc48a4c2ee44c6931e04da8d79279879a7153f7a099efc884ecb-SNWCqbY5HaLGQc7X',
  },
  tls: {
    rejectUnauthorized: false
  }
})

// Verify SMTP configuration on startup for easier debugging
transporter.verify((err) => {
  if (err) {
    console.error('❌ SMTP verification failed:', err && (err.response || err.message || err))
    console.error('📧 Check your email configuration in config.env')
  } else {
    console.log('✅ SMTP server is ready to take our messages')
  }
})

export { transporter }
