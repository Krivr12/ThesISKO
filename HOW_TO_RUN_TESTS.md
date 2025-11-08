# How to Run Contact Form Tests

## 🚀 Quick Start

### Method 1: Using the Test Script (Recommended)

1. **Make sure your backend server is running:**
   ```bash
   cd ThesISKO/server
   npm start
   # Server should be running on http://localhost:5050
   ```

2. **Open a new terminal and run the test script:**
   ```bash
   cd ThesISKO/server
   node test-contact-form.js
   ```

3. **Expected Output:**
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🧪 TESTING CONTACT FORM
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   📤 Sending test contact form submission...
   URL: http://localhost:5050/contact
   Data: { ... }

   ✅ SUCCESS!
   Response: {
     "success": true,
     "message": "Your message has been sent successfully..."
   }

   📧 Check the superadmin email inbox for the message!
   ```

---

### Method 2: Using cURL (Command Line)

**Windows (PowerShell):**
```powershell
curl -X POST http://localhost:5050/contact `
  -H "Content-Type: application/json" `
  -d '{\"name\":\"Test User\",\"email\":\"test@example.com\",\"subject\":\"Test\",\"message\":\"Testing contact form\"}'
```

**Windows (CMD):**
```cmd
curl -X POST http://localhost:5050/contact -H "Content-Type: application/json" -d "{\"name\":\"Test User\",\"email\":\"test@example.com\",\"subject\":\"Test\",\"message\":\"Testing contact form\"}"
```

**Linux/Mac:**
```bash
curl -X POST http://localhost:5050/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "subject": "Test",
    "message": "Testing contact form"
  }'
```

---

### Method 3: Using Postman or Thunder Client

1. **Open Postman/Thunder Client**

2. **Create a new request:**
   - **Method:** `POST`
   - **URL:** `http://localhost:5050/contact`

3. **Set Headers:**
   - Key: `Content-Type`
   - Value: `application/json`

4. **Set Body (raw JSON):**
   ```json
   {
     "name": "Test User",
     "email": "test@example.com",
     "subject": "Test Contact Form",
     "message": "This is a test message"
   }
   ```

5. **Click Send**

6. **Expected Response:**
   ```json
   {
     "success": true,
     "message": "Your message has been sent successfully. We will get back to you soon!"
   }
   ```

---

### Method 4: Test via Frontend (Browser)

1. **Start both servers:**
   ```bash
   # Terminal 1: Backend
   cd ThesISKO/server
   npm start

   # Terminal 2: Frontend
   cd ThesISKO/client
   npm start
   ```

2. **Open browser:**
   - Navigate to: `http://localhost:4200/about-us` (or your Angular dev server URL)

3. **Scroll down** to "Got some concerns? Connect with us!" section

4. **Fill out the form:**
   - Name: `Test User`
   - Email: `test@example.com`
   - Subject: `Test`
   - Message: `This is a test message`

5. **Click Submit**

6. **Check for:**
   - ✅ Green success message appears
   - ✅ Form fields are cleared
   - ✅ Server console shows email sent

---

## 📋 Prerequisites Checklist

Before running tests, ensure:

- [ ] **Backend server is running** on port 5050
- [ ] **Superadmin exists** in database (role_id = 5)
- [ ] **Email service is configured** (Brevo/Resend/Gmail)
- [ ] **Database connection is working**

---

## 🔍 Verify Superadmin Exists

**Using SQL:**
```sql
SELECT user_id, email, firstname, lastname, role_id 
FROM users_info 
WHERE role_id = 5;
```

**If no superadmin exists, create one:**
```sql
-- Option 1: Update existing user
UPDATE users_info SET role_id = 5 WHERE email = 'admin@example.com';

-- Option 2: Check what users exist
SELECT * FROM users_info ORDER BY role_id;
```

---

## 🐛 Troubleshooting

### Error: "Cannot find module"
```bash
# Make sure you're in the server directory
cd ThesISKO/server
node test-contact-form.js
```

### Error: "Connection refused" or "ECONNREFUSED"
- **Solution:** Make sure backend server is running on port 5050
- Check: `http://localhost:5050/health` should return JSON

### Error: "Superadmin not found"
- **Solution:** Create or update a user with `role_id = 5`
- Run SQL query above to verify

### Error: "Failed to send email"
- **Solution:** Check email service configuration
- Test email service first: `POST http://localhost:5050/auth/test-email`

---

## ✅ Success Indicators

The test is successful if you see:

1. **API Response:**
   ```json
   {
     "success": true,
     "message": "Your message has been sent successfully..."
   }
   ```

2. **Server Console:**
   ```
   📧 Sending contact form message from test@example.com to superadmin: admin@example.com
   ✅ Contact form email sent successfully
   ```

3. **Email Received:**
   - Check superadmin's email inbox
   - Subject: `[ThesISKO Contact Form] Test`
   - Contains all form data

---

## 🎯 Quick Test Commands

**Test email service first:**
```bash
curl -X POST http://localhost:5050/auth/test-email \
  -H "Content-Type: application/json" \
  -d '{"to": "your-email@example.com"}'
```

**Test contact form:**
```bash
cd ThesISKO/server
node test-contact-form.js
```

**Check server health:**
```bash
curl http://localhost:5050/health
```

---

**Need more help?** Check `CONTACT_FORM_TESTING.md` for detailed testing guide!

