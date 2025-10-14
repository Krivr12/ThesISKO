/**
 * Email Service Configuration
 * 
 * Centralized email transporter using Nodemailer
 * Supports multiple email providers (Gmail, Brevo, AWS SES)
 * 
 * Configuration is loaded from environment variables in config.env:
 * - SMTP_HOST: Email service hostname
 * - SMTP_PORT: SMTP port (usually 587 for TLS)
 * - SMTP_USER: SMTP authentication username
 * - SMTP_PASS: SMTP authentication password
 * - MAIL_FROM: Default sender email address
 */

import nodemailer from 'nodemailer'
import { getProviderConfig, validateEmailConfig } from './email-providers.js'

// Load email configuration from environment
const emailConfig = {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.MAIL_FROM
}

// Validate configuration
const validation = validateEmailConfig(emailConfig)
if (!validation.isValid) {
  console.error('❌ Email configuration validation failed:')
  validation.errors.forEach(err => console.error(`   - ${err}`))
  console.error('📧 Please check your config.env file')
}

// Get provider information
const providerInfo = getProviderConfig(emailConfig.host)

// Create Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: emailConfig.host,
  port: emailConfig.port,
  secure: false, // Use TLS (true for port 465, false for 587)
  auth: {
    user: emailConfig.user,
    pass: emailConfig.pass,
  },
  tls: {
    rejectUnauthorized: false // Allow self-signed certificates
  }
})

// Verify SMTP configuration on startup
transporter.verify((err) => {
  if (err) {
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('❌ SMTP VERIFICATION FAILED')
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('Error:', err.message || err.response || err)
    console.error('\nCurrent Configuration:')
    console.error(`  Provider: ${providerInfo.name}`)
    console.error(`  Host:     ${emailConfig.host}`)
    console.error(`  Port:     ${emailConfig.port}`)
    console.error(`  User:     ${emailConfig.user}`)
    console.error(`  From:     ${emailConfig.from}`)
    console.error('\n📧 Please check your config.env file')
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  } else {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ EMAIL SERVICE READY')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`📧 Provider:    ${providerInfo.name}`)
    console.log(`📧 Host:        ${emailConfig.host}`)
    console.log(`📧 User:        ${emailConfig.user}`)
    console.log(`📧 From:        ${emailConfig.from}`)
    console.log(`📧 Daily Limit: ${providerInfo.dailyLimit || 'Varies'}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  }
})

export { transporter }
