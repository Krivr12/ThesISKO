# Security Audit Report - ThesISKO Backend & Frontend

**Date:** 2024  
**Severity:** 🔴 **CRITICAL** - Multiple endpoints exposed without authentication

---

## Executive Summary

The application has **CRITICAL security vulnerabilities** where **ALL backend endpoints are publicly accessible** without authentication or authorization checks. An attacker can access sensitive data, modify submissions, approve/reject documents, and perform administrative functions without being logged in.

**Example Vulnerability:** `https://server.thesisko.online/submissions/pending-dean/thesiskopup@gmail.com` returns all pending dean submissions without any authentication.

---

## Current Security Measures

### ✅ Implemented Security Features

1. **CORS Protection**
   - Configured in `server/server.js` and `server/app.js`
   - Uses `ALLOWED_ORIGINS` environment variable
   - Allows localhost in development (potential risk)
   - **Status:** ✅ Working but can be bypassed if origin is spoofed

2. **Rate Limiting**
   - Implemented in `server/middlewares/rateLimiter.js`
   - Applied globally in `app.js` (line 47)
   - Applied specifically to `/requests` route
   - Uses MongoDB for tracking
   - **Status:** ✅ Working but only prevents brute force, not unauthorized access

3. **Helmet Middleware**
   - Basic security headers
   - Implemented in `server/server.js` (line 49)
   - **Status:** ✅ Working

4. **Cookie-Based Authentication**
   - Uses `auth_user` cookie (HttpOnly, Secure in production)
   - Implemented in `server/routes/auth.js` and `server/controller/userController.js`
   - **Status:** ✅ Working but **NOT ENFORCED** on any routes

5. **Client-Side Guards**
   - `auth-guard.ts` - General authentication guard
   - `admin-guard.ts` - Admin-only routes
   - `admin-side-guard.ts` - Chairperson/Dean routes
   - `faculty-guard.ts` - Faculty routes
   - `dean-only-guard.ts` - Dean-only routes
   - `unauthorized-guard.ts` - Unauthorized access guard
   - **Status:** ✅ Working but **CAN BE BYPASSED** by directly calling API endpoints

6. **Request Validation**
   - `server/middlewares/requestValidator.js`
   - Only applied to `/requests` route
   - Validates email, user_type, purpose
   - **Status:** ✅ Working but limited scope

7. **Session Management**
   - Express-session configured
   - Passport.js for Google OAuth
   - **Status:** ✅ Configured but **NOT USED** for route protection

---

## Critical Vulnerabilities

### 🔴 CRITICAL: No Authentication Middleware

**Issue:** Zero authentication middleware is applied to any backend routes. All endpoints are publicly accessible.

**Affected Routes:**
- `/submissions/*` - **ALL endpoints exposed**
  - `GET /submissions/pending-dean/:email` - Returns all pending submissions
  - `GET /submissions/pending-chairperson/:email` - Returns all pending submissions
  - `GET /submissions/:submission_id` - Returns submission details
  - `GET /submissions/my-submissions/:email` - Returns user's submissions
  - `PATCH /submissions/:submission_id/chairperson-approve` - Can approve submissions
  - `PATCH /submissions/:submission_id/dean-approve` - Can approve submissions
  - `PATCH /submissions/:submission_id/chairperson-reject` - Can reject submissions
  - `PATCH /submissions/:submission_id/dean-reject` - Can reject submissions
  - `POST /submissions/create` - Can create submissions
  - `POST /submissions/:submission_id/repository` - Can archive documents

- `/admin/*` - **ALL endpoints exposed**
  - `GET /admin/faculty` - Returns all faculty members
  - `POST /admin/faculty` - Can create faculty
  - `PUT /admin/faculty/:id` - Can update faculty
  - `DELETE /admin/faculty/:id` - Can delete faculty
  - `POST /admin/faculty/:id/reset-password` - Can reset passwords

- `/groups/*` - **ALL endpoints exposed**
  - `GET /groups` - Returns all groups
  - `GET /groups/:group_id` - Returns group details
  - `POST /groups` - Can create groups
  - `PATCH /groups/:groupId/dean-approve` - Can approve groups
  - `PATCH /groups/:groupId/chairperson-approve` - Can approve groups
  - `DELETE /groups/:group_id` - Can delete groups

- `/records/*` - **ALL endpoints exposed**
  - `GET /records` - Returns all records
  - `GET /records/:_id` - Returns record details
  - `POST /records` - Can create records
  - `PUT /records/:_id` - Can update records
  - `DELETE /records/:_id` - Can delete records

- `/requests/*` - **ALL endpoints exposed**
  - `GET /requests/analytics` - Returns request analytics
  - `GET /requests/:request_id/details` - Returns request details
  - `POST /requests/:id/respond` - Can approve/reject requests
  - `POST /requests/:id/reject` - Can reject requests

- `/s3/*` - **ALL endpoints exposed**
  - `POST /s3/signed-url` - Can generate S3 signed URLs
  - `POST /s3/view-urls` - Can generate view URLs
  - `DELETE /s3/file` - Can delete files from S3

- `/programs/*` - **ALL endpoints exposed**
- `/blocks/*` - **ALL endpoints exposed**
- `/analytics/*` - **ALL endpoints exposed**
- `/document-types/*` - **ALL endpoints exposed**
- `/requirements/*` - **ALL endpoints exposed**

**Impact:**
- 🔴 **Data Breach:** All sensitive data accessible
- 🔴 **Unauthorized Modifications:** Can approve/reject submissions, modify records
- 🔴 **Privilege Escalation:** Can perform admin functions
- 🔴 **Data Loss:** Can delete records, groups, faculty
- 🔴 **Compliance Violation:** GDPR, FERPA violations

**Proof of Concept:**
```bash
# Without authentication, anyone can:
curl https://server.thesisko.online/submissions/pending-dean/thesiskopup@gmail.com
# Returns all pending submissions

curl -X PATCH https://server.thesisko.online/submissions/2024-CCIS-BSIT-0001/dean-approve \
  -H "Content-Type: application/json" \
  -d '{"dean_name": "Attacker"}'
# Can approve submissions
```

---

### 🔴 CRITICAL: No Authorization Checks

**Issue:** Even if authentication existed, there are no role-based access control (RBAC) checks.

**Missing Checks:**
- No verification that user is a dean before accessing `/submissions/pending-dean/:email`
- No verification that user is a chairperson before accessing `/submissions/pending-chairperson/:email`
- No verification that user owns the submission before accessing `/submissions/my-submissions/:email`
- No verification that user is admin before accessing `/admin/*` routes
- No verification that user is faculty before accessing `/groups/by-fic/:email`

**Impact:**
- 🔴 **Horizontal Privilege Escalation:** Users can access other users' data
- 🔴 **Vertical Privilege Escalation:** Regular users can perform admin functions

---

### 🟠 HIGH: Information Disclosure via URL Parameters

**Issue:** Email addresses and IDs are exposed in URLs, revealing user information.

**Examples:**
- `/submissions/pending-dean/thesiskopup@gmail.com` - Email in URL
- `/submissions/my-submissions/user@example.com` - Email in URL
- `/groups/by-fic/faculty@example.com` - Email in URL
- `/blocks/faculty/teacher@example.com` - Email in URL

**Impact:**
- 🟠 **Information Disclosure:** Email addresses exposed
- 🟠 **User Enumeration:** Can discover valid user emails
- 🟠 **Privacy Violation:** Personal information in URLs/logs

---

### 🟠 HIGH: No Input Sanitization

**Issue:** Many endpoints don't sanitize or validate input properly.

**Examples:**
- SQL Injection risk in PostgreSQL queries (though parameterized queries are used)
- NoSQL Injection risk in MongoDB queries
- XSS risk in stored data
- Path traversal risk in file operations

**Impact:**
- 🟠 **Injection Attacks:** SQL/NoSQL injection possible
- 🟠 **XSS:** Stored XSS in user-generated content
- 🟠 **Path Traversal:** File system access possible

---

### 🟠 HIGH: No CSRF Protection

**Issue:** No CSRF tokens or SameSite cookie protection for state-changing operations.

**Impact:**
- 🟠 **CSRF Attacks:** Can perform actions on behalf of authenticated users
- 🟠 **Session Hijacking:** Cookies can be stolen via XSS

---

### 🟡 MEDIUM: Weak Cookie Security

**Issue:** Cookie security could be improved.

**Current Settings:**
```javascript
res.cookie('auth_user', JSON.stringify({...}), {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // Only secure in production
  sameSite: 'lax', // Should be 'strict' for sensitive operations
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
});
```

**Issues:**
- `sameSite: 'lax'` allows some CSRF attacks
- Cookie contains user data in plain JSON (should be a session ID)
- No cookie rotation or refresh mechanism

**Impact:**
- 🟡 **CSRF:** Lax SameSite allows some attacks
- 🟡 **Cookie Theft:** Large cookie payload increases risk

---

### 🟡 MEDIUM: Client-Side Security Can Be Bypassed

**Issue:** Client-side guards only protect UI routes, not API endpoints.

**Impact:**
- 🟡 **API Bypass:** Attackers can call APIs directly
- 🟡 **False Sense of Security:** UI appears secure but backend is open

---

### 🟡 MEDIUM: Rate Limiting Not Comprehensive

**Issue:** Rate limiting only applied globally and to `/requests` route.

**Missing:**
- No rate limiting on authentication endpoints
- No rate limiting on sensitive operations (approvals, deletions)
- No IP-based blocking for repeated failures

**Impact:**
- 🟡 **Brute Force:** Can attempt unlimited login attempts
- 🟡 **DoS:** Can spam sensitive endpoints

---

## Security Recommendations

### 🔴 PRIORITY 1: Implement Authentication Middleware (CRITICAL)

**Action Required:** Create and apply authentication middleware to ALL protected routes.

**Implementation Steps:**

1. **Create Authentication Middleware**
   ```javascript
   // server/middlewares/authMiddleware.js
   export const requireAuth = async (req, res, next) => {
     try {
       const authCookie = req.cookies.auth_user;
       
       if (!authCookie) {
         return res.status(401).json({ 
           error: 'Authentication required',
           authenticated: false 
         });
       }
       
       const user = JSON.parse(authCookie);
       
       // Verify user still exists and is active
       // Add token expiration check
       // Add session validation
       
       req.user = user; // Attach user to request
       next();
     } catch (error) {
       return res.status(401).json({ 
         error: 'Invalid authentication',
         authenticated: false 
       });
     }
   };
   ```

2. **Apply to All Protected Routes**
   - Apply `requireAuth` middleware to all routes except:
     - `/auth/*` (login, signup, OAuth)
     - `/health` (health check)
     - Public endpoints (if any)

3. **Route Protection Example**
   ```javascript
   // server/routes/submissions.js
   import { requireAuth } from '../middlewares/authMiddleware.js';
   
   // Protect all routes
   router.use(requireAuth);
   
   // Or protect specific routes
   router.get('/pending-dean/:email', requireAuth, async (req, res) => {
     // ...
   });
   ```

---

### 🔴 PRIORITY 2: Implement Authorization Middleware (CRITICAL)

**Action Required:** Create role-based and resource-based authorization checks.

**Implementation Steps:**

1. **Create Role-Based Authorization**
   ```javascript
   // server/middlewares/authorizationMiddleware.js
   
   // Check if user has required role
   export const requireRole = (...allowedRoles) => {
     return (req, res, next) => {
       if (!req.user) {
         return res.status(401).json({ error: 'Authentication required' });
       }
       
       if (!allowedRoles.includes(req.user.role_id)) {
         return res.status(403).json({ 
           error: 'Insufficient permissions',
           required: allowedRoles,
           current: req.user.role_id
         });
       }
       
       next();
     };
   };
   
   // Check if user owns the resource
   export const requireOwnership = (resourceEmailField = 'email') => {
     return async (req, res, next) => {
       // Verify user owns the resource
       // e.g., check if req.user.email matches resource email
       next();
     };
   };
   ```

2. **Apply Authorization to Routes**
   ```javascript
   // Example: Only deans can access pending dean submissions
   router.get('/pending-dean/:email', 
     requireAuth,
     requireRole(5), // role_id 5 = Dean
     async (req, res) => {
       // Verify email matches user's department
       if (req.user.email !== req.params.email) {
         // Additional check: verify user is dean of that department
       }
       // ...
     }
   );
   ```

3. **Role Definitions**
   - Document all role IDs and their permissions
   - Create role constants file
   - Implement role hierarchy

---

### 🟠 PRIORITY 3: Fix Information Disclosure (HIGH)

**Action Required:** Remove sensitive data from URLs.

**Implementation Steps:**

1. **Use Session-Based Identification**
   - Don't pass emails in URLs
   - Use authenticated user from session/cookie
   - Use IDs instead of emails where possible

2. **Example Fix**
   ```javascript
   // BEFORE (INSECURE):
   router.get('/pending-dean/:email', async (req, res) => {
     const { email } = req.params;
     // ...
   });
   
   // AFTER (SECURE):
   router.get('/pending-dean', requireAuth, requireRole(5), async (req, res) => {
     const email = req.user.email; // From authenticated session
     // ...
   });
   ```

---

### 🟠 PRIORITY 4: Implement Input Validation & Sanitization (HIGH)

**Action Required:** Validate and sanitize all user input.

**Implementation Steps:**

1. **Use Validation Library**
   - Install `express-validator` or `joi`
   - Create validation schemas for each endpoint
   - Sanitize input before processing

2. **Example Implementation**
   ```javascript
   import { body, param, validationResult } from 'express-validator';
   
   router.post('/create',
     requireAuth,
     [
       body('title').trim().isLength({ min: 1, max: 500 }).escape(),
       body('abstract').trim().isLength({ min: 1, max: 5000 }).escape(),
       body('authors').isArray().notEmpty(),
       body('document_type').trim().isIn(['thesis', 'capstone', 'dissertation']),
     ],
     async (req, res) => {
       const errors = validationResult(req);
       if (!errors.isEmpty()) {
         return res.status(400).json({ errors: errors.array() });
       }
       // ...
     }
   );
   ```

3. **Sanitize Database Queries**
   - Always use parameterized queries (already done for PostgreSQL)
   - Validate ObjectIds for MongoDB
   - Escape special characters

---

### 🟠 PRIORITY 5: Implement CSRF Protection (HIGH)

**Action Required:** Add CSRF tokens to state-changing operations.

**Implementation Steps:**

1. **Install CSRF Protection**
   ```bash
   npm install csurf
   ```

2. **Implement CSRF Middleware**
   ```javascript
   import csrf from 'csurf';
   
   const csrfProtection = csrf({ 
     cookie: {
       httpOnly: true,
       secure: process.env.NODE_ENV === 'production',
       sameSite: 'strict'
     }
   });
   
   // Apply to state-changing routes
   app.use('/submissions', csrfProtection);
   app.use('/admin', csrfProtection);
   // ...
   ```

3. **Update Cookie Settings**
   ```javascript
   res.cookie('auth_user', JSON.stringify({...}), {
     httpOnly: true,
     secure: process.env.NODE_ENV === 'production',
     sameSite: 'strict', // Changed from 'lax'
     maxAge: 24 * 60 * 60 * 1000
   });
   ```

---

### 🟡 PRIORITY 6: Improve Cookie Security (MEDIUM)

**Action Required:** Use session IDs instead of storing user data in cookies.

**Implementation Steps:**

1. **Store Session in Database**
   - Create sessions table/collection
   - Store session ID in cookie
   - Lookup user data from session

2. **Implement Session Management**
   ```javascript
   // Generate session ID
   const sessionId = crypto.randomBytes(32).toString('hex');
   
   // Store session in database
   await sessionsCollection.insertOne({
     sessionId,
     userId: user.id,
     email: user.email,
     roleId: user.role_id,
     createdAt: new Date(),
     expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
   });
   
   // Store only session ID in cookie
   res.cookie('session_id', sessionId, {
     httpOnly: true,
     secure: process.env.NODE_ENV === 'production',
     sameSite: 'strict',
     maxAge: 24 * 60 * 60 * 1000
   });
   ```

---

### 🟡 PRIORITY 7: Enhance Rate Limiting (MEDIUM)

**Action Required:** Add comprehensive rate limiting.

**Implementation Steps:**

1. **Rate Limit Authentication Endpoints**
   ```javascript
   import rateLimit from 'express-rate-limit';
   
   const authLimiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 5, // 5 attempts per window
     message: 'Too many login attempts, please try again later'
   });
   
   router.post('/login', authLimiter, async (req, res) => {
     // ...
   });
   ```

2. **Rate Limit Sensitive Operations**
   - Approval/rejection endpoints
   - Deletion endpoints
   - Password reset endpoints

3. **IP-Based Blocking**
   - Track failed attempts per IP
   - Temporarily block IPs with too many failures

---

### 🟡 PRIORITY 8: Add Security Headers (MEDIUM)

**Action Required:** Enhance security headers.

**Implementation Steps:**

1. **Configure Helmet Properly**
   ```javascript
   import helmet from 'helmet';
   
   app.use(helmet({
     contentSecurityPolicy: {
       directives: {
         defaultSrc: ["'self'"],
         styleSrc: ["'self'", "'unsafe-inline'"],
         scriptSrc: ["'self'"],
         imgSrc: ["'self'", "data:", "https:"],
       },
     },
     hsts: {
       maxAge: 31536000,
       includeSubDomains: true,
       preload: true
     }
   }));
   ```

2. **Add Custom Security Headers**
   ```javascript
   app.use((req, res, next) => {
     res.setHeader('X-Content-Type-Options', 'nosniff');
     res.setHeader('X-Frame-Options', 'DENY');
     res.setHeader('X-XSS-Protection', '1; mode=block');
     res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
     next();
   });
   ```

---

### 🟡 PRIORITY 9: Implement Audit Logging (MEDIUM)

**Action Required:** Log all sensitive operations.

**Implementation Steps:**

1. **Create Audit Log Middleware**
   ```javascript
   // server/middlewares/auditLogger.js
   export const auditLog = (action) => {
     return async (req, res, next) => {
       // Log before action
       await auditCollection.insertOne({
         userId: req.user?.id,
         email: req.user?.email,
         action,
         endpoint: req.path,
         method: req.method,
         ip: req.ip,
         timestamp: new Date(),
         userAgent: req.get('user-agent')
       });
       
       next();
     };
   };
   ```

2. **Apply to Sensitive Routes**
   ```javascript
   router.patch('/:submission_id/dean-approve',
     requireAuth,
     requireRole(5),
     auditLog('dean_approve_submission'),
     async (req, res) => {
       // ...
     }
   );
   ```

---

### 🟡 PRIORITY 10: Add API Versioning & Documentation (LOW)

**Action Required:** Version APIs and document security requirements.

**Implementation Steps:**

1. **API Versioning**
   ```javascript
   app.use('/api/v1/submissions', submissions);
   app.use('/api/v1/admin', admin);
   ```

2. **API Documentation**
   - Document all endpoints
   - Document authentication requirements
   - Document authorization requirements
   - Document rate limits

---

## Implementation Priority

### Immediate (This Week)
1. ✅ Create authentication middleware
2. ✅ Apply authentication to ALL protected routes
3. ✅ Create authorization middleware
4. ✅ Apply authorization to role-based routes

### Short Term (This Month)
5. ✅ Fix information disclosure (remove emails from URLs)
6. ✅ Implement input validation
7. ✅ Add CSRF protection
8. ✅ Improve cookie security

### Medium Term (Next Quarter)
9. ✅ Enhance rate limiting
10. ✅ Add security headers
11. ✅ Implement audit logging
12. ✅ Security testing and penetration testing

---

## Testing Checklist

After implementing fixes, test:

- [ ] Cannot access `/submissions/pending-dean/:email` without authentication
- [ ] Cannot access `/admin/*` routes without admin role
- [ ] Cannot approve submissions without dean role
- [ ] Cannot access other users' submissions
- [ ] Cannot perform CSRF attacks
- [ ] Rate limiting works on authentication endpoints
- [ ] Input validation prevents injection attacks
- [ ] Audit logs capture sensitive operations
- [ ] Cookies are secure and HttpOnly
- [ ] Security headers are present

---

## Additional Security Considerations

1. **Environment Variables**
   - Ensure sensitive keys are not in code
   - Use secure secret management
   - Rotate secrets regularly

2. **Database Security**
   - Use connection pooling
   - Implement query timeouts
   - Regular backups
   - Encrypt sensitive data at rest

3. **File Upload Security**
   - Validate file types
   - Scan for malware
   - Limit file sizes
   - Store in secure S3 buckets with proper IAM

4. **Error Handling**
   - Don't expose stack traces in production
   - Don't expose database errors
   - Log errors securely

5. **Dependencies**
   - Regularly update dependencies
   - Scan for vulnerabilities (`npm audit`)
   - Use Snyk or similar tools

---

## Conclusion

The application has **CRITICAL security vulnerabilities** that must be addressed immediately. The most urgent issue is the complete lack of authentication and authorization on backend endpoints. All sensitive operations are publicly accessible.

**Recommended Action:** Implement authentication and authorization middleware as the highest priority, then systematically address other security concerns.

---

**Report Generated:** 2024  
**Next Review:** After implementing Priority 1 & 2 fixes


