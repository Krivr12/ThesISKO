# Quick Test Guide - Email Removal & Authorization

## 🚀 Quick Start Testing

### 1. Test Authentication (5 minutes)

**Test Unauthenticated Access:**
```bash
# Open browser DevTools → Network tab
# Clear all cookies
# Try accessing any protected endpoint
# Expected: 401 Unauthorized
```

**Test Wrong Role:**
1. Login as Student
2. Try: `GET /api/submissions/pending-dean`
3. Expected: 403 Forbidden

---

### 2. Test Email Removal (2 minutes)

**Check URLs in Network Tab:**
- ✅ `GET /api/submissions/my-submissions` (correct)
- ❌ `GET /api/submissions/my-submissions/user@email.com` (should NOT exist)

**Check Frontend Code:**
- Open `adminSide/dashboard/dashboard.ts`
- Line 135 should be: `pending-dean` (no email)
- NOT: `pending-dean/${userEmail}`

---

### 3. Test Resource Ownership (10 minutes)

**Student Test:**
1. Login as Student A
2. View submissions → Should see only Student A's submissions
3. Login as Student B
4. View submissions → Should see only Student B's submissions

**Chairperson Test:**
1. Login as Chairperson of Program X
2. View pending approvals → Should see only Program X submissions
3. Try to approve submission from Program Y → Should get 403

**Dean Test:**
1. Login as Dean of Department 1
2. View pending approvals → Should see only Department 1 submissions
3. Try to approve submission from Department 2 → Should get 403

---

## 🔍 Browser DevTools Quick Checks

### Network Tab
1. Open DevTools (F12)
2. Go to Network tab
3. Filter: "Fetch/XHR"
4. Navigate through app
5. Check all API requests:
   - ✅ No emails in URLs
   - ✅ Status codes: 200 (success) or 401/403 (expected errors)

### Application Tab
1. Go to Application → Cookies
2. Find auth cookie
3. Verify it contains user info (email, role_id)
4. Cookie should be HttpOnly and Secure (if in production)

---

## 📋 Test Checklist (Copy & Paste)

```
Authentication:
[ ] Unauthenticated → 401
[ ] Wrong role → 403
[ ] Correct role → 200

Email Removal:
[ ] URLs don't contain email
[ ] Frontend doesn't pass email
[ ] Email comes from cookie

Resource Ownership:
[ ] Student sees only own data
[ ] Chairperson sees only program data
[ ] Dean sees only department data
[ ] Cannot access other users' data

Security:
[ ] Cookie tampering detected
[ ] Missing assignments handled
[ ] Empty results return []
```

---

## 🧪 Manual API Testing

### Using Browser Console

```javascript
// Test authenticated endpoint
fetch('/api/submissions/my-submissions', {
  credentials: 'include' // Include cookies
})
.then(r => r.json())
.then(data => console.log(data))
.catch(err => console.error(err));
```

### Using Postman

1. **Setup:**
   - Method: GET
   - URL: `http://localhost:5050/api/submissions/pending-dean`
   - Headers: Add Cookie (get from browser after login)

2. **Test Cases:**
   - Without cookie → 401
   - With wrong role cookie → 403
   - With correct role cookie → 200

---

## 🎯 Critical Scenarios to Test

### Must Test These:

1. **Student cannot see other students' submissions**
   - Login as Student A
   - Try to access Student B's submission
   - Expected: 403 or empty results

2. **Chairperson cannot approve other program's submissions**
   - Login as Chairperson of Program X
   - Try to approve submission from Program Y
   - Expected: 403 Forbidden

3. **Dean cannot approve other department's submissions**
   - Login as Dean of Department 1
   - Try to approve submission from Department 2
   - Expected: 403 Forbidden

4. **URLs don't expose emails**
   - Check Network tab
   - All URLs should be clean (no email params)

---

## 🐛 Common Issues to Watch For

1. **CORS errors** - Check if cookies are being sent
2. **401 errors when logged in** - Check cookie name/config
3. **403 errors for correct role** - Check database assignments
4. **Empty arrays** - Normal if no data exists
5. **Frontend errors** - Check if service methods updated

---

## 📞 Quick Debug Commands

### Check Server Logs
```bash
# Look for authentication logs
grep "authMiddleware" server/logs/error.log

# Look for authorization logs
grep "authorizationMiddleware" server/logs/error.log
```

### Check Cookie
```javascript
// In browser console
document.cookie
// Should show auth cookie with user data
```

---

## ✅ Success Criteria

Your implementation is correct if:

1. ✅ All URLs are clean (no emails)
2. ✅ Unauthenticated users get 401
3. ✅ Wrong role users get 403
4. ✅ Users can only access their authorized data
5. ✅ Frontend works without errors
6. ✅ No breaking changes to existing functionality

---

## 🆘 If Something Fails

1. **Check server logs** - Look for error messages
2. **Check browser console** - Look for JavaScript errors
3. **Check Network tab** - Look for failed requests
4. **Verify cookie** - Make sure auth cookie exists
5. **Verify database** - Check user roles and assignments

---

## 📝 Test Data Setup

Before testing, ensure you have:

- [ ] Student account (role_id = 2)
- [ ] Chairperson account (role_id = 4) with program assigned
- [ ] Dean account (role_id = 5) with department assigned
- [ ] Faculty account (role_id = 3)
- [ ] Test submissions in different programs/departments
- [ ] Test groups assigned to different blocks

---

**Happy Testing! 🎉**

