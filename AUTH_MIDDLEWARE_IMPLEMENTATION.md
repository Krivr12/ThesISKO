# Authentication Middleware Implementation Guide

## 📋 What Was Implemented

### 1. **Created Authentication Middleware** (`server/middlewares/authMiddleware.js`)

Two middleware functions were created:

#### `requireAuth` - Main Authentication Middleware
- **Purpose**: Validates authentication cookies and protects routes
- **Functionality**:
  - Extracts `auth_user` cookie from request
  - Validates cookie exists
  - Parses JSON safely with error handling
  - Validates user object structure (requires `id`/`user_id` and `email`/`Email`)
  - Attaches user to `req.user` for route handlers
  - Returns consistent 401 errors for authentication failures
  - Logs authentication attempts (in dev mode or with `DEBUG_AUTH=true`)

#### `optionalAuth` - Optional Authentication Middleware
- **Purpose**: Attaches user if cookie exists, but doesn't fail if missing
- **Use Case**: Routes that work for both authenticated and unauthenticated users
- **Functionality**: Same validation as `requireAuth`, but silently continues if cookie is missing/invalid

### 2. **Added Test Endpoint** (`server/routes/auth.js`)

Created `/auth/protected-test` endpoint to verify middleware functionality:
- **Route**: `GET /auth/protected-test`
- **Protection**: Requires authentication via `requireAuth` middleware
- **Response**: Returns user information if authenticated successfully

---

## 🧪 How to Test (Development Environment)

### Prerequisites
1. Server must be running (`npm run dev` in `server/` directory)
2. You need to be logged in (have an `auth_user` cookie set)

### Testing Methods

#### Method 1: Using Browser Developer Tools (Easiest)

1. **Start your server**:
   ```bash
   cd server
   npm run dev
   ```

2. **Login to your application** (via frontend or API):
   - Go to your login page
   - Login with valid credentials
   - This sets the `auth_user` cookie

3. **Open Browser DevTools**:
   - Press `F12` or right-click → Inspect
   - Go to **Console** tab

4. **Test the protected endpoint**:
   ```javascript
   // Test authenticated request
   fetch('http://localhost:5050/auth/protected-test', {
     credentials: 'include' // Important: includes cookies
   })
   .then(res => res.json())
   .then(data => console.log('✅ Success:', data))
   .catch(err => console.error('❌ Error:', err));
   ```

5. **Expected Results**:
   - **If logged in**: Returns `200 OK` with user data
   - **If not logged in**: Returns `401 Unauthorized` with error message

#### Method 2: Using cURL (Command Line)

1. **Test without authentication** (should fail):
   ```bash
   curl -X GET http://localhost:5050/auth/protected-test \
     -H "Content-Type: application/json" \
     -v
   ```
   **Expected**: `401 Unauthorized` response

2. **Test with authentication** (after logging in):
   ```bash
   # First, login and save cookies
   curl -X POST http://localhost:5050/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"your-email@example.com","password":"your-password"}' \
     -c cookies.txt
   
   # Then test protected endpoint with cookies
   curl -X GET http://localhost:5050/auth/protected-test \
     -b cookies.txt \
     -v
   ```
   **Expected**: `200 OK` with user data

#### Method 3: Using Postman/Thunder Client

1. **Setup**:
   - Create a new GET request
   - URL: `http://localhost:5050/auth/protected-test`

2. **Test without cookie**:
   - Send request without cookies
   - **Expected**: `401 Unauthorized`

3. **Test with cookie**:
   - First, login via `POST /auth/login` or `POST /auth/admin-login`
   - Copy the `auth_user` cookie from response
   - Add cookie to request: `Cookie: auth_user=<cookie-value>`
   - Send request
   - **Expected**: `200 OK` with user data

#### Method 4: Test via Frontend (Angular)

1. **Add test method to your Angular service**:
   ```typescript
   // In your auth service or component
   testProtectedEndpoint() {
     return this.http.get(`${this.baseUrl}/auth/protected-test`, {
       withCredentials: true // Important for cookies
     });
   }
   ```

2. **Call it from a component**:
   ```typescript
   this.authService.testProtectedEndpoint().subscribe({
     next: (data) => console.log('✅ Protected route works!', data),
     error: (err) => console.error('❌ Auth failed:', err)
   });
   ```

---

## ✅ Test Cases to Verify

### Test Case 1: No Cookie (Should Fail)
- **Request**: GET `/auth/protected-test` without cookie
- **Expected Response**: 
  ```json
  {
    "authenticated": false,
    "error": "Authentication required",
    "message": "No authentication cookie found"
  }
  ```
- **Status Code**: `401`

### Test Case 2: Invalid Cookie Format (Should Fail)
- **Request**: GET `/auth/protected-test` with malformed cookie
- **Cookie**: `auth_user=invalid-json`
- **Expected Response**:
  ```json
  {
    "authenticated": false,
    "error": "Invalid authentication token",
    "message": "Authentication cookie is malformed"
  }
  ```
- **Status Code**: `401`

### Test Case 3: Valid Cookie (Should Succeed)
- **Request**: GET `/auth/protected-test` with valid cookie
- **Expected Response**:
  ```json
  {
    "success": true,
    "message": "Protected route accessed successfully!",
    "user": {
      "id": 123,
      "email": "user@example.com",
      "status": "student",
      "role_id": 2,
      "firstname": "John",
      "lastname": "Doe"
    },
    "timestamp": "2024-01-01T00:00:00.000Z",
    "note": "If you see this message, the authentication middleware is working correctly!"
  }
  ```
- **Status Code**: `200`

### Test Case 4: Cookie Missing Required Fields (Should Fail)
- **Request**: GET `/auth/protected-test` with cookie missing `id` or `email`
- **Expected Response**:
  ```json
  {
    "authenticated": false,
    "error": "Invalid user data",
    "message": "User ID is missing" // or "User email is missing"
  }
  ```
- **Status Code**: `401`

---

## 🔍 How to Check if It's Working

### 1. **Check Server Logs**

When you make requests, you should see logs like:

**Successful authentication**:
```
[authMiddleware] ✅ Authenticated user: user@example.com (ID: 123) for GET /auth/protected-test
```

**Failed authentication**:
```
[authMiddleware] ❌ No authentication cookie found for GET /auth/protected-test
```

### 2. **Check Response Headers**

- **Status Code**: Should be `200` for authenticated, `401` for unauthenticated
- **Response Body**: Should contain user data or error message

### 3. **Verify Cookie in Browser**

1. Open DevTools → **Application** tab (Chrome) or **Storage** tab (Firefox)
2. Go to **Cookies** → `http://localhost:5050`
3. Look for `auth_user` cookie
4. Check if it contains valid JSON user data

---

## 🚀 Production vs Development Testing

### ✅ **Development Testing (Recommended)**

**Advantages**:
- ✅ Faster iteration (no deployment needed)
- ✅ No Vercel deploy count limits
- ✅ Easy debugging with console logs
- ✅ Can test multiple scenarios quickly

**How to Test in Dev**:
1. Run `npm run dev` in `server/` directory
2. Use any of the testing methods above
3. Check server console for logs
4. Verify responses match expected behavior

### ⚠️ **Production Testing**

**When Needed**:
- Final verification before release
- Testing cookie domain/subdomain behavior
- Testing HTTPS secure cookie flags

**How to Test in Production**:
1. Deploy to Vercel
2. Login via production URL
3. Test `/auth/protected-test` endpoint
4. Verify cookies work across subdomains (if applicable)

**Note**: The middleware works the same in both environments. The only difference is:
- **Dev**: Logs are more verbose (shows all auth attempts)
- **Prod**: Logs only show errors (unless `DEBUG_AUTH=true` is set)

---

## 📝 Next Steps

### 1. **Apply Middleware to Protected Routes**

Once testing confirms it works, apply `requireAuth` to actual protected routes:

```javascript
// Example: server/routes/submissions.js
import { requireAuth } from '../middlewares/authMiddleware.js';

// Protect all routes
router.use(requireAuth);

// Or protect specific routes
router.get('/pending-dean/:email', requireAuth, handler);
```

### 2. **Create Role-Based Authorization**

You can extend the middleware to check roles:

```javascript
// Future: server/middlewares/authMiddleware.js
export const requireRole = (...allowedRoles) => {
  return async (req, res, next) => {
    await requireAuth(req, res, () => {
      if (!allowedRoles.includes(req.user.role_id)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      next();
    });
  };
};
```

### 3. **Add User Validation (Optional)**

For extra security, you can add database validation:

```javascript
// Future enhancement
export const requireAuthWithValidation = async (req, res, next) => {
  await requireAuth(req, res, async () => {
    // Validate user still exists in database
    const pool = (await import('../data/database.js')).default;
    const result = await pool.query('SELECT * FROM users_info WHERE user_id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
    next();
  });
};
```

---

## 🐛 Troubleshooting

### Issue: "No authentication cookie found"
**Solution**: Make sure you're logged in and cookies are enabled in your browser

### Issue: "Invalid authentication token"
**Solution**: Cookie might be corrupted. Try logging out and logging back in

### Issue: CORS errors
**Solution**: Make sure `credentials: 'include'` is set in fetch requests, and CORS is configured to allow credentials

### Issue: Cookie not being sent
**Solution**: 
- Check if cookie domain matches your server domain
- Verify `withCredentials: true` in Angular HTTP requests
- Check browser console for cookie warnings

---

## 📚 Files Modified/Created

1. ✅ **Created**: `server/middlewares/authMiddleware.js` - Main middleware file
2. ✅ **Modified**: `server/routes/auth.js` - Added test endpoint
3. ✅ **Created**: `AUTH_MIDDLEWARE_IMPLEMENTATION.md` - This documentation

---

## ✨ Summary

The authentication middleware is now ready to use! It:
- ✅ Validates authentication cookies
- ✅ Provides consistent error handling
- ✅ Logs authentication attempts (dev mode)
- ✅ Attaches user to `req.user` for route handlers
- ✅ Works in both development and production
- ✅ Includes a test endpoint for verification

**You can test it right now in development without deploying!** 🎉




