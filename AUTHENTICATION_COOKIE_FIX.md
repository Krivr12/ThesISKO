# Authentication Cookie Fix

## Issue

Users were getting `401 Unauthorized` errors when accessing protected endpoints like `/submissions/pending-chairperson`, even when logged in.

**Error Message:**
```
{authenticated: false, error: "Authentication required", message: "No authentication cookie found"}
```

## Root Cause

The authentication cookie was being set correctly on login, but **was not being sent with HTTP requests** because `withCredentials: true` was missing from most HTTP client calls.

### Why This Happened

When making cross-origin requests (e.g., from `thesisko.online` to `server.thesisko.online`), browsers require the `withCredentials: true` option to include cookies in the request. Without this option, cookies are silently omitted.

## Solution

### 1. Created HTTP Interceptor (Recommended)

Created a global HTTP interceptor that automatically adds `withCredentials: true` to **all** HTTP requests:

**File:** `client/src/app/interceptors/auth.interceptor.ts`
```typescript
import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const clonedRequest = req.clone({
    withCredentials: true
  });
  return next(clonedRequest);
};
```

**Registered in:** `client/src/app/app.config.ts`
```typescript
provideHttpClient(
  withInterceptors([authInterceptor])
)
```

### 2. Fixed Specific Files (Redundant but Safe)

Also added explicit `withCredentials: true` to specific files that were causing issues:

- ✅ `client/src/app/adminSide/approvals/approvals.ts`
- ✅ `client/src/app/adminSide/dashboard/dashboard.ts`
- ✅ `client/src/app/adminSide/approvals/approval-details.ts`

## How It Works

1. **Login:** User logs in → Cookie is set with proper security flags
2. **HTTP Requests:** Interceptor automatically adds `withCredentials: true` → Cookie is sent with request
3. **Backend:** Middleware reads cookie → User is authenticated

## Testing

After this fix, you should be able to:

1. ✅ Login successfully
2. ✅ Access `/submissions/pending-chairperson` as Chairperson
3. ✅ Access `/submissions/pending-dean` as Dean
4. ✅ Access all other protected endpoints

## Verification

To verify cookies are being sent:

1. Open browser DevTools → Network tab
2. Make a request to a protected endpoint
3. Check the request headers → Should see `Cookie: auth_user=...`
4. Check the request → Should have `credentials: include` in the request details

## Additional Notes

- The interceptor applies to **all** HTTP requests automatically
- No need to manually add `withCredentials: true` to individual requests anymore
- The explicit additions in specific files are redundant but harmless
- This fix ensures consistent cookie handling across the entire application

## Related Files

- `server/utils/cookieConfig.js` - Cookie configuration (already correct)
- `server/middlewares/authMiddleware.js` - Authentication middleware (already correct)
- `client/src/app/service/auth.ts` - Auth service (already had withCredentials for login)

---

**Status:** ✅ Fixed
**Date:** Fixed in this session
**Impact:** All authenticated requests now work correctly

