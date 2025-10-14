# 📧 Email Service Configuration Guide

This guide explains how to set up email services for ThesISKO system.

## 📋 Overview

ThesISKO uses email for:
- 🎓 Sending credentials to newly created students
- 👥 Notifying group leaders about their assignment
- 📬 Notifying group members about group creation
- 🔐 Password resets and account notifications

## 🎯 Supported Email Providers

### 1. **Gmail SMTP** (Recommended for Development) ⭐

**Best for:** Development and testing

**Pros:**
- ✅ Easy setup (5 minutes)
- ✅ No recipient verification needed
- ✅ 500-2000 emails/day limit
- ✅ Check sent emails in Gmail
- ✅ Good deliverability (won't go to spam)

**Setup Steps:**

1. **Enable 2-Step Verification:**
   - Go to https://myaccount.google.com/security
   - Enable 2-Step Verification if not already enabled

2. **Generate App Password:**
   - Go to https://myaccount.google.com/apppasswords
   - Select App: "Mail"
   - Select Device: "Other" → Type "ThesISKO"
   - Click Generate
   - Copy the 16-character password (format: `abcd efgh ijkl mnop`)

3. **Update `config.env`:**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-char-app-password
   MAIL_FROM=your-email@gmail.com
   ```

4. **Restart server and test!**

---

### 2. **Brevo (formerly Sendinblue)** (Alternative)

**Best for:** Marketing emails, analytics

**Pros:**
- ✅ 300 free emails/day
- ✅ Email campaign features
- ✅ Good analytics dashboard

**Cons:**
- ⚠️ Sender email must be verified
- ⚠️ Lower daily limit on free tier

**Setup Steps:**

1. **Create Brevo Account:**
   - Sign up at https://app.brevo.com/

2. **Get SMTP Credentials:**
   - Go to Settings → SMTP & API
   - Copy your SMTP credentials

3. **Verify Sender Email:**
   - Go to Senders & IP
   - Add and verify your sender email
   - Check your email for verification link

4. **Update `config.env`:**
   ```env
   SMTP_HOST=smtp-relay.brevo.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-smtp-login@smtp-brevo.com
   SMTP_PASS=your-smtp-key
   MAIL_FROM=verified-sender@yourdomain.com
   ```

---

### 3. **AWS SES** (For Production)

**Best for:** High-volume production emails

**Pros:**
- ✅ Highly scalable
- ✅ Very reliable
- ✅ Low cost at scale

**Cons:**
- ⚠️ Sandbox mode requires recipient verification
- ⚠️ More complex setup
- ⚠️ Requires AWS account

**Setup Steps:**

1. **Create AWS Account**

2. **Request Production Access:**
   - Go to AWS SES Console
   - Request to move out of sandbox
   - Approval takes 24-48 hours

3. **Verify Domain or Email:**
   - Verify your sending domain or email address

4. **Create SMTP Credentials:**
   - Go to SMTP Settings
   - Create SMTP Credentials
   - Copy username and password

5. **Update `config.env`:**
   ```env
   SMTP_HOST=email-smtp.ap-southeast-1.amazonaws.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-aws-smtp-username
   SMTP_PASS=your-aws-smtp-password
   MAIL_FROM=verified@yourdomain.com
   ```

---

## 🔧 Configuration Reference

### Required Environment Variables

All email providers require these variables in `config.env`:

```env
# SMTP Server Configuration
SMTP_HOST=smtp.gmail.com              # Email service hostname
SMTP_PORT=587                          # SMTP port (587 for TLS)
SMTP_SECURE=false                      # false for TLS, true for SSL
SMTP_USER=your-email@gmail.com        # SMTP username
SMTP_PASS=your-password               # SMTP password or app password
MAIL_FROM=your-email@gmail.com        # Default sender email
```

---

## 🧪 Testing Email Configuration

After updating `config.env`, restart the server:

```bash
cd server
node server.js
```

**Look for this message:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ EMAIL SERVICE READY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Provider:    Gmail SMTP
📧 Host:        smtp.gmail.com
📧 User:        your-email@gmail.com
📧 From:        your-email@gmail.com
📧 Daily Limit: 500-2000 emails/day
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Test by creating a group:**
1. Login as faculty
2. Create a test group with your real email
3. Check your inbox (and spam folder!)

---

## 🐛 Troubleshooting

### Problem: "SMTP verification failed"

**Possible Causes:**
- Incorrect credentials
- App Password not generated (Gmail)
- 2FA not enabled (Gmail)
- Firewall blocking port 587

**Solution:**
1. Double-check credentials in `config.env`
2. For Gmail: Regenerate App Password
3. Check firewall settings

---

### Problem: "Sender not verified"

**Applies to:** Brevo, AWS SES

**Solution:**
1. Login to provider dashboard
2. Verify your sender email address
3. Check verification email in inbox

---

### Problem: Emails going to spam

**Solutions:**
- Use Gmail SMTP (best deliverability)
- Verify sender domain (Brevo/AWS)
- Ask recipients to whitelist sender

---

## 📊 Email Limits Comparison

| Provider | Free Tier Limit | Setup Time | Verification Needed? |
|----------|----------------|------------|---------------------|
| **Gmail SMTP** | 500-2000/day | 5 minutes | No (just App Password) |
| **Brevo** | 300/day | 15 minutes | Yes (sender email) |
| **AWS SES** | Sandbox: Verified only<br>Production: High volume | 30 minutes + approval | Yes (domain/email) |

---

## 🎯 Recommendation

**For Development/Testing:** Use **Gmail SMTP** ⭐
- Quick setup
- Reliable
- No verification hassles

**For Production:** Use **AWS SES**
- Scalable
- Cost-effective
- Professional

---

## 📝 Need Help?

1. Check server startup logs for detailed error messages
2. Review this guide
3. Check provider-specific documentation:
   - [Gmail App Passwords](https://support.google.com/accounts/answer/185833)
   - [Brevo SMTP](https://help.brevo.com/hc/en-us/articles/209467485)
   - [AWS SES](https://docs.aws.amazon.com/ses/)

---

**Last Updated:** October 12, 2025

