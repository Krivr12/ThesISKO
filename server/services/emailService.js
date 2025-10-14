/**
 * Unified Email Service for ThesISKO
 * 
 * This service provides a unified interface for sending emails with automatic failover
 * across multiple email providers:
 * 1. Brevo (Primary) - 300 emails/day
 * 2. Resend (Secondary) - 100 emails/day (3000/month)
 * 3. Gmail SMTP (Tertiary/Fallback) - 500 emails/day
 * 
 * Usage:
 * ```javascript
 * import { sendEmail } from './services/emailService.js';
 * 
 * await sendEmail({
 *   to: 'user@example.com',
 *   subject: 'Welcome',
 *   template: 'verification',
 *   data: { firstname: 'John', verifyUrl: 'https://...' }
 * });
 * ```
 */

import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Resend client
let resendClient = null;
try {
  if (process.env.RESEND_API_KEY) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
} catch (error) {
  console.error('⚠️ Failed to initialize Resend client:', error.message);
}

// Email provider configurations
const providers = {
  brevo: {
    name: 'Brevo',
    priority: 1,
    dailyLimit: 300,
    enabled: !!(process.env.BREVO_SMTP_HOST && process.env.BREVO_SMTP_USER && process.env.BREVO_SMTP_PASS),
    transporter: null
  },
  resend: {
    name: 'Resend',
    priority: 2,
    dailyLimit: 100,
    monthlyLimit: 3000,
    enabled: !!process.env.RESEND_API_KEY,
    client: resendClient
  },
  gmail: {
    name: 'Gmail SMTP',
    priority: 3,
    dailyLimit: 500,
    enabled: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
    transporter: null
  }
};

// Initialize Nodemailer transporters
if (providers.brevo.enabled) {
  providers.brevo.transporter = nodemailer.createTransport({
    host: process.env.BREVO_SMTP_HOST,
    port: parseInt(process.env.BREVO_SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.BREVO_SMTP_USER,
      pass: process.env.BREVO_SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  });
}

if (providers.gmail.enabled) {
  providers.gmail.transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  });
}

/**
 * Load and process email template
 * @param {string} templateName - Name of template file (without .html)
 * @param {Object} data - Data to populate template
 * @returns {string} Processed HTML
 */
function loadTemplate(templateName, data = {}) {
  try {
    const templatePath = path.join(__dirname, '../templates/email', `${templateName}.html`);
    const basePath = path.join(__dirname, '../templates/email', 'base.html');
    
    if (!fs.existsSync(templatePath)) {
      console.warn(`⚠️ Template ${templateName}.html not found, using fallback`);
      return generateFallbackTemplate(data);
    }

    let content = fs.readFileSync(templatePath, 'utf8');
    const baseTemplate = fs.readFileSync(basePath, 'utf8');

    // Simple template variable replacement
    const processTemplate = (template, variables) => {
      let processed = template;
      
      // Replace simple variables {{variable}}
      Object.keys(variables).forEach(key => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        processed = processed.replace(regex, variables[key] || '');
      });

      // Handle conditional blocks {{#if variable}}...{{/if}}
      processed = processed.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, content) => {
        return variables[condition] ? content : '';
      });

      // Handle each loops {{#each array}}...{{/each}}
      processed = processed.replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, arrayName, template) => {
        const array = variables[arrayName];
        if (!Array.isArray(array)) return '';
        
        return array.map(item => {
          let itemHtml = template;
          Object.keys(item).forEach(key => {
            const regex = new RegExp(`\\{\\{this\\.${key}\\}\\}`, 'g');
            itemHtml = itemHtml.replace(regex, item[key] || '');
          });
          return itemHtml;
        }).join('');
      });

      return processed;
    };

    // Process content template first
    content = processTemplate(content, data);

    // Then inject into base template
    const finalHtml = processTemplate(baseTemplate, {
      ...data,
      content: content,
      year: new Date().getFullYear()
    });

    return finalHtml;
  } catch (error) {
    console.error('❌ Error loading template:', error.message);
    return generateFallbackTemplate(data);
  }
}

/**
 * Generate fallback HTML template
 */
function generateFallbackTemplate(data) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #800000; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">ThesISKO</h1>
        <p style="margin: 5px 0 0 0;">Polytechnic University of the Philippines</p>
      </div>
      <div style="padding: 30px; background: #f9f9f9;">
        ${data.message || data.mainContent || '<p>You have a new notification from ThesISKO.</p>'}
      </div>
      <div style="background: #333; color: #999; padding: 20px; text-align: center; font-size: 12px;">
        <p>© ${new Date().getFullYear()} ThesISKO. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Send email using Brevo SMTP
 */
async function sendWithBrevo(to, subject, html, from) {
  if (!providers.brevo.enabled || !providers.brevo.transporter) {
    throw new Error('Brevo is not configured');
  }

  const mailOptions = {
    from: from || process.env.BREVO_MAIL_FROM || process.env.MAIL_FROM,
    to: to,
    subject: subject,
    html: html
  };

  console.log('📧 Attempting to send email via Brevo...');
  const result = await providers.brevo.transporter.sendMail(mailOptions);
  console.log('✅ Email sent successfully via Brevo');
  return { provider: 'brevo', messageId: result.messageId };
}

/**
 * Send email using Resend API
 */
async function sendWithResend(to, subject, html, from) {
  if (!providers.resend.enabled || !providers.resend.client) {
    throw new Error('Resend is not configured');
  }

  console.log('📧 Attempting to send email via Resend...');
  const result = await providers.resend.client.emails.send({
    from: from || process.env.RESEND_MAIL_FROM || process.env.MAIL_FROM,
    to: to,
    subject: subject,
    html: html
  });

  console.log('✅ Email sent successfully via Resend');
  return { provider: 'resend', messageId: result.data?.id || result.id };
}

/**
 * Send email using Gmail SMTP
 */
async function sendWithGmail(to, subject, html, from) {
  if (!providers.gmail.enabled || !providers.gmail.transporter) {
    throw new Error('Gmail SMTP is not configured');
  }

  const mailOptions = {
    from: from || process.env.MAIL_FROM,
    to: to,
    subject: subject,
    html: html
  };

  console.log('📧 Attempting to send email via Gmail SMTP...');
  const result = await providers.gmail.transporter.sendMail(mailOptions);
  console.log('✅ Email sent successfully via Gmail SMTP');
  return { provider: 'gmail', messageId: result.messageId };
}

/**
 * Main unified email sending function
 * 
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} [options.template] - Template name (verification, credentials, groupCreation, requestApproval, general)
 * @param {Object} [options.data] - Data to populate template
 * @param {string} [options.html] - Raw HTML (if not using template)
 * @param {string} [options.from] - Sender email (optional, uses default)
 * @returns {Promise<Object>} Result object with provider and messageId
 */
export async function sendEmail(options) {
  const { to, subject, template, data = {}, html: rawHtml, from } = options;

  // Validate required fields
  if (!to || !subject) {
    throw new Error('Email recipient (to) and subject are required');
  }

  if (!template && !rawHtml) {
    throw new Error('Either template name or html content is required');
  }

  // Generate HTML content
  let html;
  if (template) {
    // Ensure common data fields
    const templateData = {
      ...data,
      year: new Date().getFullYear(),
      frontendUrl: process.env.FRONTEND_URL || 'https://thesisko.online',
      supportEmail: 'thesiskopup@gmail.com'
    };
    html = loadTemplate(template, templateData);
  } else {
    html = rawHtml;
  }

  // Try providers in order: Brevo → Resend → Gmail
  const errors = [];
  
  // Try Brevo first (Primary)
  if (providers.brevo.enabled) {
    try {
      return await sendWithBrevo(to, subject, html, from);
    } catch (error) {
      console.warn('⚠️ Brevo failed:', error.message);
      errors.push({ provider: 'brevo', error: error.message });
    }
  }

  // Try Resend second (Secondary)
  if (providers.resend.enabled) {
    try {
      return await sendWithResend(to, subject, html, from);
    } catch (error) {
      console.warn('⚠️ Resend failed:', error.message);
      errors.push({ provider: 'resend', error: error.message });
    }
  }

  // Try Gmail SMTP last (Tertiary/Fallback)
  if (providers.gmail.enabled) {
    try {
      return await sendWithGmail(to, subject, html, from);
    } catch (error) {
      console.warn('⚠️ Gmail SMTP failed:', error.message);
      errors.push({ provider: 'gmail', error: error.message });
    }
  }

  // All providers failed
  console.error('❌ All email providers failed:', errors);
  throw new Error(`Failed to send email via all providers. Errors: ${JSON.stringify(errors)}`);
}

/**
 * Get status of all email providers
 */
export function getProvidersStatus() {
  return {
    brevo: {
      name: providers.brevo.name,
      enabled: providers.brevo.enabled,
      priority: providers.brevo.priority,
      dailyLimit: providers.brevo.dailyLimit
    },
    resend: {
      name: providers.resend.name,
      enabled: providers.resend.enabled,
      priority: providers.resend.priority,
      dailyLimit: providers.resend.dailyLimit,
      monthlyLimit: providers.resend.monthlyLimit
    },
    gmail: {
      name: providers.gmail.name,
      enabled: providers.gmail.enabled,
      priority: providers.gmail.priority,
      dailyLimit: providers.gmail.dailyLimit
    }
  };
}

/**
 * Test email function for debugging
 */
export async function testEmailService(to = 'test@example.com') {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 TESTING EMAIL SERVICE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const status = getProvidersStatus();
  console.log('Provider Status:');
  console.log(JSON.stringify(status, null, 2));

  try {
    const result = await sendEmail({
      to: to,
      subject: 'ThesISKO Email Service Test',
      template: 'general',
      data: {
        recipientName: 'Test User',
        message: 'This is a test email from the ThesISKO unified email service.',
        mainContent: 'If you received this email, the email service is working correctly!',
        footerNote: 'This is an automated test. Please disregard if received in error.'
      }
    });

    console.log('\n✅ Email sent successfully!');
    console.log('Provider used:', result.provider);
    console.log('Message ID:', result.messageId);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return result;
  } catch (error) {
    console.error('\n❌ Email test failed!');
    console.error('Error:', error.message);
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    throw error;
  }
}

// Log initialization status
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📧 EMAIL SERVICE INITIALIZED');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const status = getProvidersStatus();
Object.entries(status).forEach(([key, provider]) => {
  const icon = provider.enabled ? '✅' : '❌';
  console.log(`${icon} ${provider.name} (Priority ${provider.priority}): ${provider.enabled ? 'Enabled' : 'Disabled'}`);
});
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

