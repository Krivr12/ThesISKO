# ThesISKO Security Audit Findings
**Date:** August 1, 2026  
**Auditor:** Security Review  
**Stack:** Angular 20 + Node.js/Express 5 + MongoDB Atlas + PostgreSQL/Supabase + AWS S3

---

## Executive Summary
Critical security vulnerabilities discovered that **MUST** be addressed before production deployment. Most severe: production credentials committed to repository, session store using in-memory storage (breaks on Vercel serverless), and missing authorization checks on S3 file access.

---

## Critical Findings (Production Blockers)

| Area | Finding | Severity | File/Location | Fix |
|------|---------|----------|---------------|-----|
| **[DONE✅] Secrets Management** | **Production credentials committed to repository** - MongoDB URI, Supabase service role key, AWS credentials, session secret, Google OAuth client secret, Resend API key, Gmail SMTP credentials all exposed in `server/config.env` committed to Git (commit c29dde5 and earlier). Git history contains these secrets permanently. | **CRITICAL** | `server/config.env` lines 1-64 committed in Git history | 1. **Immediately rotate ALL credentials**: MongoDB, Supabase service role key, AWS IAM keys, SESSION_SECRET, GOOGLE_CLIENT_SECRET, RESEND_API_KEY, SMTP passwords. 2. Remove `server/config.env` from Git: `git rm --cached server/config.env && git commit`. 3. Use `.gitignore` (already correct) and Vercel env vars. 4. Run `git filter-branch` or BFG Repo-Cleaner to purge secrets from Git history before public deployment. |
| **Session Store** | **In-memory session store on serverless** - No persistent session store configured. Express-session defaults to MemoryStore which is ephemeral per serverless invocation on Vercel. Sessions will be lost randomly, users logged out unpredictably. | **CRITICAL** | `server/server.js` lines 103-113 | Implement Supabase-backed session store: Install `connect-pg-simple`, configure `store: new pgSession({ pool, tableName: 'session' })`. Create session table in Supabase. Without this, sessions are unreliable in production serverless. |
| **Session Security** | **No session regeneration on login** - Session IDs not regenerated on authentication, privilege escalation, or role changes. Vulnerable to session fixation attacks. | **CRITICAL** | `server/controller/userController.js` login functions (lines 520-600), `server/routes/auth.js` admin-login (lines 170-210) | Add `req.session.regenerate((err) => { ... })` before setting `req.session.user` in all login endpoints (loginUser, admin-login, Google OAuth callback). |
| **Authorization - S3** | **Missing document-level authorization on S3 signed URLs** - Any authenticated user can request signed URLs for ANY submission/repository file by providing the file key. No verification that the requester owns the submission or is authorized to view it. | **CRITICAL** | `server/routes/s3Routes.js` all routes (lines 1-330), especially `/view-repository-file` (line 280) | Add authorization checks: 1. For submissions: verify `req.user.email === submission.submitter_email` OR user has approval role. 2. For repository files: verify document is `approved` AND user is authenticated. 3. For group files: verify user belongs to group. Query submission/document ownership before generating signed URL. |
| **Authorization - IDOR** | **IDOR in submissions**: No server-side check that user owns the submission in resubmit endpoint. `requireSubmissionOwnership` middleware exists but may not validate email match properly. | **HIGH** | `server/routes/submissions.js` PATCH `/:submission_id/resubmit` (line 281), middleware `server/middlewares/authorizationMiddleware.js` `requireSubmissionOwnership` (line 142) | Audit and strengthen `requireSubmissionOwnership` middleware to explicitly verify `submission.submitter_email === req.user.email` (case-insensitive) OR user has admin role (3,4,5). Current implementation may allow submission to be attached without email validation. |
| **Session Cookie** | **SameSite=None without Secure flag validation** - Cookie config sets `sameSite: 'none'` for cross-origin requests but only enforces `secure: true` if NODE_ENV=production. If Vercel doesn't set NODE_ENV, cookies fail browser security requirements. | **HIGH** | `server/utils/cookieConfig.js` lines 107-125 | Ensure `secure: true` is ALWAYS set in production. Add fallback: `secure: process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'`. Test on Vercel preview that cookies work cross-origin. |
| **Dependency Vulnerabilities** | **High-severity npm vulnerabilities**: `express-rate-limit` IPv4/IPv6 bypass (GHSA-46wh-pxpv-q5gq, CVSS 7.5), `path-to-regexp` ReDoS (GHSA-j3q9-mxjg-w52f, CVSS 7.5) | **HIGH** | `server/package.json` dependencies | Run `npm audit fix` in server/ and client/. Update: `express-rate-limit` to >=8.2.2, `path-to-regexp` to >=8.4.0, `svix` to >=1.92.0, `uuid` to >=11.1.1, `body-parser` to >=2.3.0, `qs` to >=6.16.0. |

---

## High Priority Findings

| Area | Finding | Severity | File/Location | Fix |
|------|---------|----------|---------------|-----|
| **Password Hashing** | **Inconsistent bcrypt salt rounds** - Some functions use `bcrypt.genSalt()` (default 10), others use `bcrypt.genSalt(10)` explicitly, one uses `bcrypt.hash(password, salt)` without explicit rounds. Inconsistency risks weaker hashing. | **HIGH** | `server/controller/userController.js` line 399 (genSalt), line 977 (genSalt(10)), `server/routes/groups.js` line 596 (genSalt default), `server/controller/groupController.js` line 99 (hash with 10 rounds) | Standardize to `bcrypt.hash(password, 12)` (12 rounds) across all password hashing. Remove manual salt generation; bcrypt.hash handles it. Update all: userController, groupController, routes/groups, routes/admin. |
| **Supabase Service Role Key** | **Service role key bypasses RLS** - `SUPABASE_SERVICE_ROLE_KEY` used in code bypasses Row-Level Security. If accidentally exposed client-side or logged, grants unrestricted DB access. No evidence of RLS being enabled. | **HIGH** | `server/config.env` line 15, `server/services/analyticsService.js` (likely imported via supabase client) | 1. Audit all Supabase queries to ensure service role key is NEVER exposed client-side. 2. Enable RLS on all Supabase tables. 3. Use anon key for client-side, service role key ONLY server-side. 4. Verify `users_info`, `sessions` tables have RLS policies. |
| **Email Relay Abuse** | **Unauthenticated contact form allows spam relay** - `/contact` endpoint has NO authentication or rate limiting. Anyone can POST arbitrary messages that get emailed to superadmin, enabling spam/phishing relay. | **HIGH** | `server/routes/contact.js` (no auth middleware), `server/controller/contactController.js` (no rate limit check) | Add rate limiting: Apply `authRateLimiter` (or stricter contact-specific limiter: 3 requests per hour per IP) to `router.post('/', authRateLimiter, submitContactForm)`. Add CAPTCHA (hCaptcha/reCAPTCHA) verification server-side. |
| **OAuth - State Parameter** | **Missing CSRF state parameter validation in Google OAuth** - Passport Google strategy not configured with `state: true`. Vulnerable to CSRF during OAuth flow. | **HIGH** | `server/config/passport.js` lines 5-25 (GoogleStrategy config) | Add `state: true` to GoogleStrategy options: `new GoogleStrategy({ ..., callbackURL: '...', state: true }, ...)`. Passport will automatically handle state generation/verification. |
| **Logout** | **Logout doesn't destroy server session** - `logoutUser` clears cookie and calls `req.session.destroy`, but if session store is in-memory (critical issue above), session may persist in other serverless instances. | **HIGH** | `server/controller/userController.js` `logoutUser` (lines 705-770) | Once persistent session store is implemented (critical fix), verify `req.session.destroy` works. Add callback error handling to log session destruction failures. |
| **Security Headers** | **Missing security headers** - No CSP, X-Content-Type-Options, X-Frame-Options, HSTS configured. Helmet used but default settings may not be restrictive enough for production. | **HIGH** | `server/server.js` line 45 (`app.use(helmet())`), `server/vercel.json` (no headers section) | 1. Configure Helmet with strict CSP: `helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], ... } } })`. 2. Add `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` explicitly. 3. Add HSTS: `Strict-Transport-Security: max-age=31536000; includeSubDomains`. 4. Test that Angular app still functions with strict CSP. |

---

## Medium Priority Findings

| Area | Finding | Severity | File/Location | Fix |
|------|---------|----------|---------------|-----|
| **User Enumeration** | **Login errors may leak user existence** - Different error messages: "Invalid password" vs "Invalid credentials. User not found" in login flow could allow attackers to enumerate valid emails. Admin-login explicitly says "Access denied. Only faculty, administrators...". | **MEDIUM** | `server/controller/userController.js` lines 540-600 (different error messages), `server/routes/auth.js` admin-login line 163 | Unify all login error responses to generic "Invalid email or password" for both user-not-found and wrong-password cases. Don't reveal role restrictions in error messages. |
| **Rate Limiting** | **Rate limiter uses requester.email from request body** - MongoDB rate limiter keys by `req.body.requester.email` which is client-controlled. Attacker can bypass by changing email in each request. Also, no per-route limits (same 10/day for login vs search). | **MEDIUM** | `server/middlewares/rateLimiter.js` lines 24-26 (keys by `req.body.requester.email`) | Change key to: `const key = req.user?.email ? `email:${req.user.email}` : `ip:${req.ip}`;` (use authenticated user email if available, fallback to IP). Apply stricter limits per-route: auth endpoints 5/15min, contact 3/hour, submissions 20/day. Use `authRateLimiter` for auth routes (already exists). |
| **S3 Bucket Configuration** | **No confirmation that S3 buckets block public access** - Code doesn't verify bucket-level public access settings. If misconfigured in AWS console, files could be publicly listable/downloadable. | **MEDIUM** | AWS S3 bucket settings (not in code), `server/routes/s3Routes.js` | Verify in AWS Console: Both `THESISKO_DOCUMENTS_BUCKET` and `THESISKO_REPOSITORY_BUCKET` have "Block all public access" enabled. Add IAM policy to prevent disabling public access block. |
| **S3 Signed URL Expiry** | **Signed URLs expire in 5 minutes (300s) for all operations** - Short expiry is good for security, but may cause user experience issues for large PDF downloads on slow connections. Upload expiry is also 5min which may be too short for large thesis PDFs. | **MEDIUM** | `server/routes/s3Routes.js` all `getSignedUrl(..., { expiresIn: 300 })` calls | Consider: 1. Upload URLs: 15 min (900s) for large thesis uploads. 2. Download URLs: 10 min (600s) for viewing PDFs. 3. Keep 5 min for delete/update operations. Balance security vs UX. |
| **Input Validation - File Upload** | **File type validation missing magic byte check** - S3 upload routes accept `contentType` from client but don't verify actual file content. Attacker could upload .exe renamed as .pdf. | **MEDIUM** | `server/routes/s3Routes.js` signed-url generation (no content verification), client-side file selection | Add server-side file content validation: 1. Use `multer` with file filter to check magic bytes (PDF: `%PDF`, DOCX: PK signature). 2. Reject files with mismatched MIME type vs actual content. 3. Scan uploads with ClamAV or AWS GuardDuty Malware Protection. |
| **Chairperson/Dean Scope** | **Approval endpoints don't fully verify submission belongs to chairperson's program / dean's department** - Middleware `requireChairpersonSubmissionAccess` and `requireDeanSubmissionAccess` check program/department match, but logic may have edge cases (e.g., if program.department_id is null). | **MEDIUM** | `server/middlewares/authorizationMiddleware.js` lines 192-253 (requireChairpersonSubmissionAccess), lines 255-321 (requireDeanSubmissionAccess) | Add explicit null checks: If `program.department_id` or `submission.program` is null/undefined, reject with 400 error "Invalid submission data". Ensure MongoDB program records always have `department_id` populated. |
| **XSS - Angular** | **bypassSecurityTrustResourceUrl used for S3 URLs** - Multiple Angular components use `bypassSecurityTrustResourceUrl` to embed signed S3 URLs in iframes. If S3 URL generation is compromised or attacker can inject URL, could lead to XSS. | **MEDIUM** | Client: `client/src/app/superAdmin/documents/documents.ts` line 193, `client/src/app/adminSide/approvals/approval-details.ts` line 186, 10+ other files | Validate S3 URL format before bypassing: Check `signedUrl.startsWith('https://') && signedUrl.includes('.s3.')`. Angular's DomSanitizer is correct usage, but add URL validation as defense-in-depth. |
| **MongoDB - NoSQL Injection** | **Potential NoSQL injection in analytics queries** - Analytics route uses `$ne` and `$exists` operators in aggregation pipeline. If user input is passed to these without sanitization, could enable query manipulation. | **MEDIUM** | `server/routes/analytics.js` lines 154-160 (uses `$ne` in aggregation) | Audit: Ensure no user input is directly interpolated into MongoDB queries. All queries use parameterized values. MongoDB driver automatically sanitizes parameters, but verify no string concatenation like `query = { field: req.query.field }` exists. |
| **CORS** | **CORS reflects localhost on any port** - Server allows ANY localhost port in development (`/^http:\/\/localhost:\d{1,5}$/`). If malicious localhost server runs on user's machine, can make authenticated requests. | **MEDIUM** | `server/server.js` lines 61-70 (CORS localhost regex) | Remove wildcard localhost in production. Use exact origins: `ALLOWED_ORIGINS=http://localhost:4200` for dev. In production, only allow `https://thesisko.online,https://thesisko.vercel.app`. |
| **Error Logging** | **Stack traces may leak in production** - No evidence that error responses hide stack traces in production mode. Default Express error handler may expose file paths. | **MEDIUM** | `server/server.js` error handler (line 147), various catch blocks | Audit all `catch` blocks: Replace `res.json({ error: error.message })` with generic messages in production. Check `process.env.NODE_ENV === 'production'` before including `error.message` or stack in responses. Use centralized error handler. |

---

## Low Priority / Informational

| Area | Finding | Severity | File/Location | Fix |
|------|---------|----------|---------------|-----|
| **Logging** | **No structured logging for security events** - Login failures, role changes, approvals logged to console.log but not persisted. No alerting on repeated failures. | **LOW** | Console logs throughout codebase (no persistent logger) | Implement Winston or Pino logger. Log to file/service (CloudWatch, Datadog): failed logins (IP, email), role changes, chairperson/dean approvals/rejections. Add alert on 10+ failed logins from same IP in 1 hour. |
| **OAuth - Google-only accounts** | **Google OAuth accounts can't be brute-forced** - If account only has Google auth (no password), cannot brute force via `/login`. However, if user later sets a password, no notification sent. | **LOW** | `server/controller/authController.js` Google OAuth flow sets `password_hash: 'guest_no_password'` | Document behavior: Google-only accounts have no password. If password reset is requested for Google account, notify user "This account uses Google Sign-In. No password needed." |
| **Deployment Environment** | **NODE_ENV may not be set on Vercel** - Code checks `process.env.NODE_ENV === 'production'` but Vercel may use `VERCEL_ENV`. Could result in development behavior in production. | **LOW** | Multiple files check `NODE_ENV` | Add to Vercel env vars: `NODE_ENV=production`. Or check both: `const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';` |
| **Vercel Deployment** | **No health check monitoring configured** - `/health` endpoint exists but no uptime monitoring or alerting configured. | **LOW** | `server/server.js` `/health` route (line 123) | Set up Vercel monitoring or external service (UptimeRobot, Pingdom) to poll `/health` every 5 min. Alert if 3 consecutive failures. |
| **Database Connection Pooling** | **PostgreSQL pool settings not explicitly configured** - `pg` pool uses defaults (max 10 connections). On Vercel serverless, may hit connection limits. | **LOW** | `server/data/database.js` (pool config not shown in audit) | Explicitly set pool limits: `new Pool({ connectionString: process.env.DATABASE_URL, max: 5, idleTimeoutMillis: 30000 })`. Use Supabase connection pooler (port 5432, already configured). |
| **Resend Webhook** | **Webhook signature verification implemented but inbound email processing incomplete** - Resend webhook verifies Svix signature correctly, but `processInboundEmail` function is a stub. If used in future, could introduce new attack surface. | **LOW** | `server/routes/webhooks.js` lines 78-94 (stub function) | Complete or remove inbound email processing. If completed, add validation: parse email headers, sanitize body, rate limit per sender, prevent email loops. |

---

## Audit Checklist Status

### 1. Authentication & Session Management
- ❌ **Session cookies**: `httpOnly=true, secure=true, sameSite=none` configured, but `secure` only enforced if NODE_ENV=production (needs Vercel env check)
- ✅ **Session secret**: In env var (SESSION_SECRET), but **CRITICAL: committed to Git history**
- ❌ **Session store**: No persistent store - **uses in-memory (critical issue)**
- ✅ **Password hashing**: bcrypt used, but inconsistent salt rounds (fix to 12 rounds)
- ⚠️ **Login/password-reset**: Rate limited (authRateLimiter), but **user enumeration possible via error messages**
- ❌ **Google OAuth**: No state parameter validation (CSRF vulnerable)
- ❌ **Session fixation**: **No session regeneration on login/privilege change**
- ⚠️ **Logout**: Destroys session, but relies on broken in-memory store

### 2. Authorization & Role-Based Access
- ✅ **Role checks**: Enforced server-side via `requireRole`, `requireAuth` middleware
- ❌ **IDOR**: **Submission resubmit may not properly verify ownership**
- ✅ **Chairperson scope**: Middleware checks program_id match
- ⚠️ **Privilege escalation**: Cookie payload signed (prevents tampering), but **no session regeneration weakens this**
- ⚠️ **Approval workflow**: State transitions validated, but edge cases possible (null program/department)

### 3. Input Validation & Injection
- ✅ **MongoDB**: Parameterized queries, no string interpolation found (audit confirmed)
- ✅ **PostgreSQL/Supabase**: Parameterized queries ($1, $2), no raw SQL concatenation
- ❌ **RLS**: No evidence RLS is enabled on Supabase (service role key bypasses RLS)
- ⚠️ **File upload**: Type validated by extension/MIME, but **no magic byte check**
- ✅ **Vector search**: Embeddings generated server-side, no direct query manipulation
- ⚠️ **XSS**: `bypassSecurityTrustResourceUrl` used (necessary for iframes), but URLs should be validated

### 4. File Storage & S3
- ⚠️ **Bucket private**: Not verified in code (must check AWS Console settings)
- ✅ **Signed URL expiration**: 5 minutes (300s) - good, but may be too short for large uploads
- ❌ **Signed URL authorization**: **No document-level authorization check before generating signed URL (critical)**
- ✅ **S3 IAM credentials**: From env vars (but **committed to Git**)
- ⚠️ **Malicious-file protection**: None implemented (add magic byte validation + antivirus scan)

### 5. API & Network Security
- ✅ **CORS**: Restricted to ALLOWED_ORIGINS, but allows all localhost ports in dev
- ⚠️ **Rate limiting**: Global + auth-specific, but **keys by client-provided email (bypassable)**
- ❌ **Security headers**: Helmet used with defaults, **no strict CSP configured**
- ✅ **HTTPS enforced**: Vercel handles HTTPS, no HTTP allowed
- ⚠️ **Error responses**: May leak stack traces (not confirmed, needs production testing)

### 6. Secrets & Configuration
- ❌ **Secrets in env vars**: Yes, but **server/config.env committed to Git with all production secrets (critical)**
- ❌ **Supabase service role key**: Not exposed client-side (audit confirmed), but **committed to Git**
- ⚠️ **Vercel env separation**: Must verify preview vs prod env vars are separate
- ✅ **Default credentials**: None found in seed scripts (verified)

### 7. Third-Party Integrations
- ❌ **Email relay abuse**: **Contact form has no auth or rate limiting (spam vector)**
- ✅ **Webhook verification**: Resend webhook verifies Svix signature correctly

### 8. Dependency & Supply Chain
- ❌ **npm audit**: **7 vulnerabilities (2 high: express-rate-limit, path-to-regexp) - must fix**
- ⚠️ **Express 5 compatibility**: Express 5 is stable (5.1.0), middleware versions appear compatible
- ✅ **Passport strategies**: No known CVEs in passport-local 1.0.0, passport-google-oauth20 2.0.0

### 9. Logging & Monitoring
- ⚠️ **Security event logging**: Failed logins logged to console, but **not persisted or monitored**
- ❌ **Alerting**: No anomaly detection configured

---

## Immediate Action Items (Before Production)

1. **ROTATE ALL SECRETS** - MongoDB, Supabase, AWS, session secret, OAuth, API keys
2. **REMOVE config.env FROM GIT HISTORY** - BFG Repo-Cleaner or filter-branch
3. **IMPLEMENT PERSISTENT SESSION STORE** - connect-pg-simple + Supabase
4. **ADD SESSION REGENERATION** - On all login flows
5. **FIX S3 AUTHORIZATION** - Verify ownership before signed URLs
6. **FIX DEPENDENCY VULNERABILITIES** - npm audit fix (express-rate-limit, path-to-regexp)
7. **ADD RATE LIMITING TO CONTACT FORM** - Prevent spam relay
8. **CONFIGURE SECURITY HEADERS** - Strict CSP, HSTS, X-Frame-Options
9. **VERIFY S3 BUCKETS ARE PRIVATE** - AWS Console settings
10. **TEST ON VERCEL** - Verify NODE_ENV, cookies, sessions work in production

---

## Recommended Security Enhancements

1. **Enable Supabase RLS** on all tables (users_info, sessions)
2. **Add file content validation** (magic bytes) for uploads
3. **Implement structured logging** (Winston) with security event monitoring
4. **Add OAuth state parameter** validation for CSRF protection
5. **Unify login error messages** to prevent user enumeration
6. **Configure strict CSP** for Angular app
7. **Set up uptime monitoring** and alerting
8. **Improve rate limiting** (key by authenticated user, not req.body)
9. **Add malware scanning** for uploaded PDFs (ClamAV/GuardDuty)
10. **Document Google OAuth behavior** for password-less accounts

---

## Testing Checklist Before Go-Live

- [ ] Rotate all secrets and verify new ones work
- [ ] Test session persistence across Vercel serverless invocations
- [ ] Attempt IDOR attack (access other user's submission) - should fail
- [ ] Attempt to access S3 files without authorization - should fail
- [ ] Spam contact form (>3 requests/hour) - should be rate limited
- [ ] Test Google OAuth with CSRF attack - should be blocked (once state param added)
- [ ] Verify cookies work cross-origin (thesisko.online → server.thesisko.online)
- [ ] Check error responses don't leak stack traces in production
- [ ] Confirm S3 buckets have "Block all public access" enabled
- [ ] Run npm audit - should show 0 high/critical vulnerabilities
- [ ] Test large file upload (50MB PDF) - should complete within signed URL expiry
- [ ] Verify CSP doesn't break Angular app functionality
- [ ] Simulate failed logins (10x) - should trigger rate limit + log event
- [ ] Test chairperson cannot approve submission outside their program
- [ ] Test dean cannot approve submission outside their department

---

**End of Audit Report**
