import nodemailer from 'nodemailer'

// Centralized mail transporter used across routes
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
})

// Verify SMTP configuration on startup for easier debugging
transporter.verify((err) => {
  if (err) {
    console.error('SMTP verification failed:', err && (err.response || err.message || err))
  } else {
    console.log('SMTP server is ready to take our messages')
  }
})

export { transporter }
