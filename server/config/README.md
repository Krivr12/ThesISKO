# 📁 Configuration Directory

This directory contains all server configuration files for the ThesISKO system.

## 📂 File Structure

```
server/config/
├── mailer.js              # Main email transporter (Nodemailer)
├── email-providers.js     # Email provider configurations & helpers
├── passport.js            # Passport.js OAuth configuration
├── config.env            # Environment variables (NEVER commit!)
├── config.env.example    # Template for config.env
├── EMAIL_SETUP.md        # Complete email setup guide
└── README.md             # This file
```

---

## 📄 File Descriptions

### **`mailer.js`** ✉️
Main email service configuration using Nodemailer.

**Features:**
- Loads SMTP configuration from environment variables
- Validates email configuration on startup
- Provides detailed logging about email service status
- Exports `transporter` object used across the app

**Usage:**
```javascript
import { transporter } from '../config/mailer.js';

await transporter.sendMail({
  from: process.env.MAIL_FROM,
  to: 'user@example.com',
  subject: 'Hello',
  text: 'Message content'
});
```

---

### **`email-providers.js`** 📧
Email provider configurations and helper functions.

**Supported Providers:**
- Gmail SMTP (recommended for development)
- Brevo/Sendinblue
- AWS SES

**Exports:**
- `EMAIL_PROVIDERS` - Configuration objects for each provider
- `getProviderConfig(host)` - Get provider info based on SMTP host
- `validateEmailConfig(config)` - Validate email configuration

---

### **`passport.js`** 🔐
Passport.js configuration for Google OAuth authentication.

**Handles:**
- Google OAuth strategy
- User session serialization
- OAuth callback processing

---

### **`config.env`** ⚙️
Environment variables for the entire server.

**⚠️ IMPORTANT:**
- This file contains sensitive credentials
- NEVER commit this file to Git
- Always included in `.gitignore`

**Contains:**
- Database credentials (MongoDB, Supabase)
- OAuth credentials (Google)
- SMTP credentials (Email)
- AWS credentials (S3, SES)
- Session secrets

---

### **`config.env.example`** 📋
Template file for `config.env`.

**Usage:**
1. Copy this file to `config.env`
2. Replace placeholder values with actual credentials
3. Follow the comments for guidance

---

### **`EMAIL_SETUP.md`** 📖
Complete guide for setting up email services.

**Includes:**
- Step-by-step setup for Gmail SMTP
- Step-by-step setup for Brevo
- Step-by-step setup for AWS SES
- Troubleshooting guide
- Provider comparison table

---

## 🚀 Quick Start

### Setting Up Email (Gmail SMTP)

1. **Get Gmail App Password:**
   ```
   1. Enable 2FA at https://myaccount.google.com/security
   2. Generate App Password at https://myaccount.google.com/apppasswords
   3. Copy the 16-character password
   ```

2. **Update `config.env`:**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password-here
   MAIL_FROM=your-email@gmail.com
   ```

3. **Restart Server:**
   ```bash
   cd server
   node server.js
   ```

4. **Verify:**
   Look for this message:
   ```
   ✅ EMAIL SERVICE READY
   📧 Provider: Gmail SMTP
   ```

---

## 🔧 Configuration Variables

### Email Configuration
```env
SMTP_HOST         # Email server hostname
SMTP_PORT         # SMTP port (usually 587)
SMTP_SECURE       # Use SSL? (false for TLS)
SMTP_USER         # SMTP username
SMTP_PASS         # SMTP password
MAIL_FROM         # Default sender email
```

### Database Configuration
```env
ATLAS_URI         # MongoDB connection string
DATABASE_URL      # Supabase connection string
SUPABASE_URL      # Supabase project URL
SUPABASE_SERVICE_ROLE_KEY  # Supabase service key
```

### OAuth Configuration
```env
GOOGLE_CLIENT_ID      # Google OAuth Client ID
GOOGLE_CLIENT_SECRET  # Google OAuth Secret
GOOGLE_CALLBACK_URL   # OAuth callback URL
```

### AWS Configuration
```env
AWS_ACCESS_KEY_ID     # AWS access key
AWS_SECRET_ACCESS_KEY # AWS secret key
AWS_REGION            # AWS region
THESISKO_DOCUMENTS_BUCKET  # S3 bucket for docs
THESISKO_REPOSITORY_BUCKET # S3 bucket for repo
```

---

## 🔒 Security Best Practices

1. **Never commit `config.env`**
   - Always in `.gitignore`
   - Use `config.env.example` as template

2. **Rotate credentials regularly**
   - Email passwords
   - Database passwords
   - API keys

3. **Use environment-specific configs**
   - Development: `config.env`
   - Production: Environment variables or secret managers

4. **Limit access**
   - Only share credentials with authorized team members
   - Use separate credentials for dev/prod

---

## 📚 Additional Resources

- [EMAIL_SETUP.md](./EMAIL_SETUP.md) - Complete email configuration guide
- [Nodemailer Documentation](https://nodemailer.com/)
- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)
- [Brevo SMTP Guide](https://help.brevo.com/hc/en-us/articles/209467485)
- [AWS SES Documentation](https://docs.aws.amazon.com/ses/)

---

## 🐛 Troubleshooting

**Email not sending?**
1. Check server startup logs
2. Verify SMTP credentials
3. Read [EMAIL_SETUP.md](./EMAIL_SETUP.md)

**Connection errors?**
1. Check firewall settings
2. Verify port 587 is open
3. Try different SMTP provider

**Configuration errors?**
1. Run `node server.js` and read error messages
2. Check `config.env` for typos
3. Compare with `config.env.example`

---

**Last Updated:** October 12, 2025

