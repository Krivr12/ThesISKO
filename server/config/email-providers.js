/**
 * Email Service Provider Configurations
 * 
 * This file documents the email service providers used by ThesISKO.
 * The unified email service (services/emailService.js) automatically handles
 * failover between providers in the following order:
 * 
 * Priority Order:
 * 1. Brevo/Sendinblue (Primary) - 300 emails/day
 * 2. Resend (Secondary) - 100 emails/day, 3000/month
 * 3. Gmail SMTP (Tertiary/Fallback) - 500 emails/day
 * 
 * Configuration is loaded from environment variables in config.env
 */

// ========================================
// PROVIDER CONFIGURATIONS
// ========================================

export const EMAIL_PROVIDERS = {
  
  // Brevo (formerly Sendinblue) - PRIMARY
  brevo: {
    name: 'Brevo/Sendinblue',
    priority: 1,
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    description: 'Primary email service for ThesISKO. Good deliverability and analytics.',
    dailyLimit: '300 emails/day (free tier)',
    pros: [
      '300 free emails/day',
      'Excellent deliverability',
      'Email campaign features',
      'Good analytics and tracking',
      'No recipient verification required'
    ],
    cons: [
      'Sender email must be verified',
      'Lower daily limit on free tier'
    ],
    setupInstructions: `
      1. Sign up at https://app.brevo.com/
      2. Get SMTP credentials from Settings → SMTP & API
      3. Verify sender email in Senders & IP section
      4. Add to config.env:
         BREVO_SMTP_HOST=smtp-relay.brevo.com
         BREVO_SMTP_PORT=587
         BREVO_SMTP_USER=your-smtp-user
         BREVO_SMTP_PASS=your-smtp-key
         BREVO_MAIL_FROM=your-verified-email@domain.com
    `
  },

  // Gmail SMTP - TERTIARY (FALLBACK)
  gmail: {
    name: 'Gmail SMTP',
    priority: 3,
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    description: 'Fallback email service. Requires App Password with 2FA enabled.',
    dailyLimit: '500 emails/day',
    pros: [
      'Higher daily limit (500/day)',
      'No recipient verification needed',
      'Good deliverability',
      'Can check sent emails in Gmail',
      'Familiar interface'
    ],
    cons: [
      'Requires App Password setup',
      'Requires 2FA enabled',
      'May have stricter spam filters'
    ],
    setupInstructions: `
      1. Enable 2FA on your Gmail account
      2. Go to https://myaccount.google.com/apppasswords
      3. Generate App Password for "Mail"
      4. Add to config.env:
         SMTP_HOST=smtp.gmail.com
         SMTP_PORT=587
         SMTP_USER=your-email@gmail.com
         SMTP_PASS=your-app-password (16 characters)
         MAIL_FROM=your-email@gmail.com
    `
  },

  // Resend - SECONDARY
  resend: {
    name: 'Resend',
    priority: 2,
    apiEndpoint: 'https://api.resend.com/emails',
    description: 'Secondary email service. Modern API-based service with good developer experience.',
    dailyLimit: '100 emails/day',
    monthlyLimit: '3000 emails/month (free tier)',
    pros: [
      'Simple API integration',
      'Good documentation',
      'Modern developer experience',
      'Reliable delivery',
      '3000 emails/month free tier'
    ],
    cons: [
      'Lower daily limit (100/day)',
      'Requires API key setup',
      'Domain verification required'
    ],
    setupInstructions: `
      1. Sign up at https://resend.com/
      2. Get API key from Settings → API Keys
      3. Verify your sending domain
      4. Add to config.env:
         RESEND_API_KEY=re_xxxxxxxxxxxx
         RESEND_MAIL_FROM=your-verified-email@domain.com
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
  if (host.includes('resend')) return EMAIL_PROVIDERS.resend;
  return { name: 'Custom SMTP', description: 'Custom SMTP configuration' };
}

/**
 * Get all providers in priority order
 * @returns {Array} Array of provider configs sorted by priority
 */
export function getProvidersPriorityOrder() {
  return Object.values(EMAIL_PROVIDERS).sort((a, b) => a.priority - b.priority);
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

