# Contact Form Testing Guide

## 📋 Prerequisites

Before testing, ensure:

1. **Backend server is running** (port 5050)
2. **Frontend server is running** (Angular dev server)
3. **Superadmin user exists** in database with `role_id = 5`
4. **Email service is configured** (Brevo/Resend/Gmail)

---

## ✅ Step 1: Verify Superadmin Exists

**Option A: Using Database Query**
```sql
SELECT user_id, email, firstname, lastname, role_id 
FROM users_info 
WHERE role_id = 5;
```

**Option B: Check Server Logs**
When the server starts, it should show email service status. Look for:
```
✅ Brevo (Priority 1): Enabled
✅ Resend (Priority 2): Enabled  
✅ Gmail SMTP (Priority 3): Enabled
```

---

## 🧪 Step 2: Test Email Service First

Before testing the contact form, verify email service works:

**Using the test endpoint:**
```bash
curl -X POST http://localhost:5050/auth/test-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "your-email@example.com",
    "subject": "Test Email",
    "message": "Testing email service"
  }'
```

**Or use Postman/Thunder Client:**
- Method: `POST`
- URL: `http://localhost:5050/auth/test-email`
- Body (JSON):
```json
{
  "to": "your-email@example.com",
  "subject": "Test Email",
  "message": "Testing email service"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Email sent successfully",
  "provider": "brevo",
  "messageId": "..."
}
```

---

## 🎯 Step 3: Test Contact Form via Frontend

1. **Navigate to About Page**
   - Open browser: `http://localhost:4200/about-us` (or your frontend URL)
   - Scroll to "Got some concerns? Connect with us!" section

2. **Fill Out the Form**
   - Name: `Test User`
   - Email: `test@example.com`
   - Subject: `Test Contact Form`
   - Message: `This is a test message to verify the contact form is working.`

3. **Submit the Form**
   - Click "Submit" button
   - Button should change to "Sending..." while processing
   - Wait for success/error message

4. **Check for Success Message**
   - Should see green success message: "Your message has been sent successfully..."
   - Form fields should be cleared
   - Message auto-hides after 5 seconds

---

## 🔍 Step 4: Verify Email Was Sent

1. **Check Superadmin's Email Inbox**
   - Look for email with subject: `[ThesISKO Contact Form] Test Contact Form`
   - Email should contain:
     - User's name and email
     - Subject
     - Message content
     - Formatted in ThesISKO email template

2. **Check Server Console Logs**
   - Should see: `📧 Sending contact form message from test@example.com to superadmin: admin@example.com`
   - Should see: `✅ Contact form email sent successfully`
   - Should see which email provider was used (Brevo/Resend/Gmail)

---

## 🧪 Step 5: Test Contact Form via API Directly

**Using cURL:**
```bash
curl -X POST http://localhost:5050/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "subject": "API Test",
    "message": "Testing contact form via API"
  }'
```

**Using Postman/Thunder Client:**
- Method: `POST`
- URL: `http://localhost:5050/contact`
- Headers: `Content-Type: application/json`
- Body (JSON):
```json
{
  "name": "Test User",
  "email": "test@example.com",
  "subject": "API Test",
  "message": "Testing contact form via API"
}
```

**Expected Success Response:**
```json
{
  "success": true,
  "message": "Your message has been sent successfully. We will get back to you soon!"
}
```

**Expected Error Responses:**

Missing fields:
```json
{
  "success": false,
  "error": "All fields are required: name, email, subject, and message"
}
```

Invalid email:
```json
{
  "success": false,
  "error": "Invalid email format"
}
```

No superadmin found:
```json
{
  "success": false,
  "error": "Superadmin not found. Please contact system administrator."
}
```

---

## 🐛 Troubleshooting

### Issue: "Superadmin not found" Error

**Solution:**
1. Check if superadmin exists:
   ```sql
   SELECT * FROM users_info WHERE role_id = 5;
   ```
2. If no results, create a superadmin user or update an existing user:
   ```sql
   UPDATE users_info SET role_id = 5 WHERE email = 'admin@example.com';
   ```

### Issue: Email Not Received

**Check:**
1. **Server logs** - Look for email sending errors
2. **Email provider status** - Check if Brevo/Resend/Gmail is configured
3. **Spam folder** - Check superadmin's spam/junk folder
4. **Email provider limits** - Check if daily limits are exceeded

**Debug email service:**
```bash
# Test email service directly
curl -X POST http://localhost:5050/auth/test-email \
  -H "Content-Type: application/json" \
  -d '{"to": "superadmin@example.com"}'
```

### Issue: Frontend Form Not Submitting

**Check:**
1. **Browser console** - Look for JavaScript errors
2. **Network tab** - Check if POST request is being sent
3. **CORS errors** - Ensure backend allows frontend origin
4. **API URL** - Verify `environment.authApiUrl` is correct

### Issue: Form Validation Errors

**Test cases:**
- Submit empty form → Should show "Please fill in all fields"
- Submit with invalid email → Should show "Please enter a valid email address"
- Submit with valid data → Should work correctly

---

## 📊 Expected Console Output

**Successful Submission:**
```
📧 Sending contact form message from test@example.com to superadmin: admin@example.com
📧 Attempting to send email via Brevo...
✅ Email sent successfully via Brevo
✅ Contact form email sent successfully
```

**If Email Service Fails:**
```
📧 Attempting to send email via Brevo...
⚠️ Brevo failed: [error message]
📧 Attempting to send email via Resend...
✅ Email sent successfully via Resend
✅ Contact form email sent successfully
```

---

## ✅ Success Criteria

The contact form is working correctly if:

- ✅ Form submits without errors
- ✅ Success message appears on frontend
- ✅ Email is received by superadmin
- ✅ Email contains all form data (name, email, subject, message)
- ✅ Email is formatted using ThesISKO template
- ✅ Server logs show successful email sending
- ✅ Form resets after successful submission

---

## 🚀 Quick Test Checklist

- [ ] Backend server running on port 5050
- [ ] Frontend server running
- [ ] Superadmin exists in database (role_id = 5)
- [ ] Email service configured and tested
- [ ] Contact form accessible on About page
- [ ] Form validation works (empty fields, invalid email)
- [ ] Form submission works
- [ ] Email received by superadmin
- [ ] Server logs show success

---

**Need Help?** Check server logs for detailed error messages!

