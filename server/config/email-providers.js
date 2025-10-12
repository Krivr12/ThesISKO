/**
 * Email Service Provider Configurations
 * 
 * This file contains configurations for different email service providers.
 * Switch between providers by updating the SMTP_* environment variables in config.env
 * 
 * Supported Providers:
 * 1. Gmail SMTP (Recommended for development)
 * 2. Brevo/Sendinblue (Alternative)
 * 3. AWS SES (For production - requires out of sandbox)
 */

// ========================================
// PROVIDER CONFIGURATIONS
// ========================================

export const EMAIL_PROVIDERS = {
  
  // Gmail SMTP Configuration
  gmail: {
    name: 'Gmail SMTP',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // Use TLS
    description: 'Best for development. Requires App Password with 2FA enabled.',
    dailyLimit: '500-2000 emails/day',
    pros: [
      'Easy setup',
      'No recipient verification needed',
      'Good deliverability',
      'Can check sent emails in Gmail'
    ],
    cons: [
      'Requires App Password setup',
      'Not ideal for very high volume'
    ],
    setupInstructions: `
      1. Enable 2FA on your Gmail account
      2. Go to https://myaccount.google.com/apppasswords
      3. Generate App Password for "Mail"
      4. Use generated password in SMTP_PASS
    `
  },

  // Brevo (formerly Sendinblue) Configuration
  brevo: {
    name: 'Brevo/Sendinblue',
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    description: 'Good for marketing emails. Free tier available.',
    dailyLimit: '300 emails/day (free tier)',
    pros: [
      '300 free emails/day',
      'Email campaign features',
      'Good analytics'
    ],
    cons: [
      'Sender email must be verified',
      'Lower daily limit on free tier'
    ],
    setupInstructions: `
      1. Sign up at https://app.brevo.com/
      2. Get SMTP credentials from Settings → SMTP & API
      3. Verify sender email in Senders & IP section
      4. Use SMTP credentials in config.env
    `
  },

  // AWS SES Configuration
  aws_ses: {
    name: 'AWS Simple Email Service',
    host: 'email-smtp.{region}.amazonaws.com',
    port: 587,
    secure: false,
    description: 'Production-grade email service. Requires AWS account.',
    dailyLimit: 'Depends on AWS limits (unlimited with proper access)',
    pros: [
      'Highly scalable',
      'Very reliable',
      'Low cost at scale'
    ],
    cons: [
      'Sandbox mode requires recipient verification',
      'More complex setup',
      'Requires AWS account'
    ],
    setupInstructions: `
      1. Create AWS account
      2. Request production access (out of sandbox)
      3. Verify sending domain or email
      4. Create SMTP credentials in AWS Console
      5. Use SMTP credentials in config.env
    `
  }
};

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Get provider configuration based on SMTP host
 * @param {string} host - SMTP host from environment
 * @returns {Object} Provider configuration
 */
export function getProviderConfig(host) {
  if (host.includes('gmail')) return EMAIL_PROVIDERS.gmail;
  if (host.includes('brevo') || host.includes('sendinblue')) return EMAIL_PROVIDERS.brevo;
  if (host.includes('amazonaws')) return EMAIL_PROVIDERS.aws_ses;
  return { name: 'Custom SMTP', description: 'Custom SMTP configuration' };
}

/**
 * Validate email configuration
 * @param {Object} config - Email configuration object
 * @returns {Object} Validation result
 */
export function validateEmailConfig(config) {
  const errors = [];
  
  if (!config.host) errors.push('SMTP_HOST is required');
  if (!config.user) errors.push('SMTP_USER is required');
  if (!config.pass) errors.push('SMTP_PASS is required');
  if (!config.from) errors.push('MAIL_FROM is required');
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

