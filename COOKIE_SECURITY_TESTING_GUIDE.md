# Cookie Security Testing Guide

This guide will help you test the cookie security improvements we just implemented.

---

## Prerequisites

1. **Browser Developer Tools** - Chrome/Edge/Firefox DevTools
2. **Access to your application:**
   - Frontend: `https://thesisko.online`
   - Backend: `https://server.thesisko.online`
3. **Test accounts** (or ability to create them)

---

## Test 1: Verify Cookie is Set on Login

### Steps:

1. **Open Browser DevTools**
   - Press `F12` or `Right-click → Inspect`
   - Go to **Application** tab (Chrome/Edge) or **Storage** tab (Firefox)
   - Click on **Cookies** in the left sidebar
   - Select your domain: `thesisko.online` or `server.thesisko.online`

2. **Clear Existing Cookies** (Optional but recommended)
   - Right-click on cookies → Clear
   - Or manually delete `auth_user` cookie if it exists

3. **Perform Login**
   - Go to your login page
   - Login with a test account (regular user or admin)

4. **Verify Cookie is Created**
   - Check the Cookies section in DevTools
   - Look for cookie named `auth_user`
   - **Expected:** Cookie should appear after successful login

### What to Check:

✅ Cookie name: `auth_user`  
✅ Cookie value: Should be a JSON string (starts with `{`)  
✅ Domain: Should be `.thesisko.online` (with leading dot)  
✅ Path: Should be `/`  
✅ HttpOnly: Should be **checked/true** (this prevents JavaScript access)  
✅ Secure: Should be **checked/true** (if on HTTPS)  
✅ SameSite: Should be `Lax`  
✅ Expires/Max-Age: Should be approximately 24 hours from now

---

## Test 2: Verify HttpOnly Protection (XSS Protection)

This test verifies that JavaScript cannot access the cookie (prevents XSS attacks).

### Steps:

1. **Login to your application** (so cookie is set)

2. **Open Browser Console** (F12 → Console tab)

3. **Try to Access Cookie via JavaScript:**
   ```javascript
   // Try to read cookie
   document.cookie
   ```

4. **Expected Result:**
   - The `auth_user` cookie should **NOT** appear in `document.cookie`
   - Only non-HttpOnly cookies should appear
   - This proves the cookie is protected from JavaScript access

### What to Check:

✅ `document.cookie` does **NOT** contain `auth_user`  
✅ Only other cookies (if any) are visible  
✅ This confirms HttpOnly protection is working

---

## Test 3: Verify Secure Flag (HTTPS Only)

This test verifies that cookies are only sent over HTTPS in production.

### Steps:

1. **Check if you're on HTTPS:**
   - Look at the URL bar
   - Should show `https://` (not `http://`)

2. **In DevTools → Application → Cookies:**
   - Find the `auth_user` cookie
   - Check the **Secure** column

3. **Expected Result:**
   - If on HTTPS: Secure should be **checked/true**
   - If on HTTP (development): Secure might be **unchecked/false** (this is OK for local dev)

### What to Check:

✅ On HTTPS: Secure flag is **true**  
✅ Cookie is only sent over secure connections  
✅ This prevents cookie theft over unencrypted connections

---

## Test 4: Verify SameSite Protection (CSRF Protection)

This test verifies that the cookie respects SameSite settings.

### Steps:

1. **Login to your application**

2. **Check Cookie in DevTools:**
   - Application → Cookies → `auth_user`
   - Look at **SameSite** column

3. **Expected Result:**
   - SameSite should be `Lax`
   - This allows cross-subdomain requests (thesisko.online ↔ server.thesisko.online)
   - But prevents most CSRF attacks from external sites

### What to Check:

✅ SameSite is set to `Lax`  
✅ Cookie works between subdomains (thesisko.online and server.thesisko.online)  
✅ Cookie is protected from external site CSRF attacks

---

## Test 5: Verify Cross-Subdomain Functionality

This test verifies that cookies work between your frontend and backend subdomains.

### Steps:

1. **Login on Frontend:**
   - Go to `https://thesisko.online`
   - Login with a test account
   - Verify cookie is set (Test 1)

2. **Make API Call to Backend:**
   - Open Browser Console (F12)
   - Run this command:
   ```javascript
   fetch('https://server.thesisko.online/auth/me', {
     credentials: 'include'  // Important: sends cookies
   })
   .then(r => r.json())
   .then(data => console.log('User data:', data))
   .catch(err => console.error('Error:', err))
   ```

3. **Expected Result:**
   - Should return user data: `{ authenticated: true, user: {...} }`
   - This proves cookie is shared between subdomains

### What to Check:

✅ Cookie is accessible from both `thesisko.online` and `server.thesisko.online`  
✅ API calls include the cookie automatically  
✅ User authentication works across subdomains

---

## Test 6: Verify Cookie Expiration

This test verifies that cookies expire after 24 hours.

### Steps:

1. **Check Cookie Expiration:**
   - DevTools → Application → Cookies → `auth_user`
   - Look at **Expires** or **Max-Age** column

2. **Calculate:**
   - Current time + 24 hours = Expected expiration
   - Max-Age should be approximately `86400000` milliseconds (24 hours)

3. **Manual Test (Optional):**
   - Note the current time
   - Wait 24+ hours (or manually expire cookie in DevTools)
   - Try to access protected endpoint
   - Should get 401 Unauthorized

### What to Check:

✅ Max-Age is approximately 24 hours (86400000 ms)  
✅ Cookie expires after the set duration  
✅ Expired cookies are not accepted

---

## Test 7: Verify Logout Clears Cookie

This test verifies that logout properly clears the authentication cookie.

### Steps:

1. **Login to your application**
   - Verify cookie exists (Test 1)

2. **Perform Logout:**
   - Click logout button
   - Or call logout endpoint

3. **Check Cookies in DevTools:**
   - Application → Cookies
   - Look for `auth_user` cookie

4. **Expected Result:**
   - `auth_user` cookie should be **removed** or **expired**
   - Cookie should no longer exist

### What to Check:

✅ Cookie is removed after logout  
✅ Cannot access protected endpoints after logout  
✅ User is properly logged out

---

## Test 8: Verify Cookie Domain Setting

This test verifies that the cookie domain is set correctly for subdomain sharing.

### Steps:

1. **Login to your application**

2. **Check Cookie in DevTools:**
   - Application → Cookies → `auth_user`
   - Look at **Domain** column

3. **Expected Result:**
   - Domain should be `.thesisko.online` (with leading dot)
   - The leading dot allows cookie sharing across subdomains

### What to Check:

✅ Domain is `.thesisko.online` (with leading dot)  
✅ Cookie is available on all subdomains  
✅ Works for both `thesisko.online` and `server.thesisko.online`

---

## Test 9: Verify Cookie Path Setting

This test verifies that the cookie is available for the entire domain.

### Steps:

1. **Check Cookie in DevTools:**
   - Application → Cookies → `auth_user`
   - Look at **Path** column

2. **Expected Result:**
   - Path should be `/`
   - This means cookie is available for all paths on the domain

### What to Check:

✅ Path is set to `/`  
✅ Cookie works on all routes (not just login page)  
✅ Available across entire application

---

## Test 10: Test Different Login Types

This test verifies that all login methods set cookies correctly.

### Steps:

1. **Test Regular User Login:**
   - Login as a regular user (student)
   - Verify cookie is set with correct data
   - Check `account_type` in cookie value (should be `'user'`)

2. **Test Admin Login:**
   - Login as admin
   - Verify cookie is set with correct data
   - Check `account_type` in cookie value (should be `'admin'`)

3. **Test Google OAuth Login (if applicable):**
   - Login via Google OAuth
   - Verify cookie is set with correct data
   - Check cookie properties

### What to Check:

✅ All login methods create cookies  
✅ Cookie data is correct for each login type  
✅ `account_type` field is set correctly  
✅ All cookies have same security settings

---

## Quick Verification Checklist

Run through this quick checklist to verify everything is working:

- [ ] Cookie is created on login
- [ ] Cookie name is `auth_user`
- [ ] Cookie domain is `.thesisko.online`
- [ ] Cookie path is `/`
- [ ] HttpOnly is **true** (JavaScript cannot access)
- [ ] Secure is **true** (on HTTPS)
- [ ] SameSite is `Lax`
- [ ] Max-Age is ~24 hours
- [ ] Cookie works across subdomains
- [ ] Cookie is cleared on logout
- [ ] All login types create cookies correctly

---

## Troubleshooting

### Cookie Not Appearing

**Possible Causes:**
- Login failed (check console for errors)
- Cookie was blocked by browser
- Domain mismatch
- HTTPS/HTTP mismatch

**Solutions:**
- Check browser console for errors
- Verify login was successful
- Check if cookies are enabled in browser
- Verify domain settings match

### Cookie Not Working Across Subdomains

**Possible Causes:**
- Domain not set correctly
- Missing leading dot in domain
- Browser security settings

**Solutions:**
- Verify domain is `.thesisko.online` (with leading dot)
- Check browser allows cross-subdomain cookies
- Test in different browsers

### HttpOnly Not Working

**Possible Causes:**
- Cookie was set before the fix
- Browser cache
- Code not updated

**Solutions:**
- Clear cookies and login again
- Hard refresh browser (Ctrl+Shift+R)
- Verify code changes were deployed

---

## Browser-Specific Instructions

### Chrome/Edge:
1. F12 → **Application** tab → **Cookies** → Select domain
2. View cookie properties in the table
3. Check HttpOnly, Secure, SameSite columns

### Firefox:
1. F12 → **Storage** tab → **Cookies** → Select domain
2. Click on cookie to view properties
3. Check HttpOnly, Secure, SameSite in details

### Safari:
1. Develop menu → Show Web Inspector → **Storage** tab
2. Select **Cookies** → Select domain
3. View cookie properties

---

## Expected Results Summary

After running all tests, you should see:

✅ **Cookie Security:**
- HttpOnly: ✅ Protected from JavaScript
- Secure: ✅ Only sent over HTTPS
- SameSite: ✅ Lax (CSRF protection)
- Domain: ✅ `.thesisko.online` (subdomain sharing)
- Path: ✅ `/` (entire domain)
- Max-Age: ✅ 24 hours

✅ **Functionality:**
- Login creates cookie ✅
- Logout clears cookie ✅
- Cross-subdomain works ✅
- All login types work ✅

---

## Next Steps

Once all tests pass:
1. ✅ Cookie security is working correctly
2. ✅ Ready to proceed with authentication middleware
3. ✅ Foundation is secure for route protection

---

**Test Date:** _______________  
**Tester:** _______________  
**Results:** [ ] All Pass | [ ] Issues Found (see notes below)

**Notes:**
_________________________________________________
_________________________________________________
_________________________________________________

