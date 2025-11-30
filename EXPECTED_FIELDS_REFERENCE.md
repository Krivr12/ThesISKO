# Expected Fields for Request Submission

## Validation Middleware Requirements (`server/middlewares/requestValidator.js`)

The middleware checks for these **REQUIRED** fields:

### 1. `document_id` (String, Required)
- **Source:** `this.thesis._id` from frontend
- **Validation:** Must exist and be truthy
- **Error if missing:** "Missing required fields."

### 2. `user_type` (String, Required)
- **Valid values:** `"student"` or `"guest"`
- **Source:** 
  - PUPian: `formType === 'pupian' ? 'student' : 'guest'`
  - Guest: `'guest'`
- **Validation:** Must be one of `["student", "guest"]`
- **Error if missing:** "Missing required fields."
- **Error if invalid:** "Invalid user_type. Must be 'student' or 'guest'."

### 3. `email` (String, Required)
- **Source:**
  - PUPian: `this.currentUserEmail`
  - Guest: `this.guestEmail`
- **Validation:** Must exist, be truthy, and pass `isEmail()` validation
- **Error if missing:** "Invalid or missing email."
- **Error if invalid format:** "Invalid or missing email."

### 4. `purpose` (String, Required)
- **Source:** `this.requestPurpose.trim()`
- **Validation:** Must exist and be truthy (non-empty after trim)
- **Error if missing:** "Missing required fields."
- **Note:** Empty string after `.trim()` will fail validation

### 5. `chaptersRequested` (Array, Optional but validated if present)
- **Source:** `Array.from(this.selectedRequestChapters)`
- **Validation:** If present, must be an array
- **Error if invalid:** "chaptersRequested must be an array."
- **Note:** Can be empty array `[]`, but if present must be array type

---

## Frontend Payload Structure

The frontend sends a **combined payload** with both MongoDB fields and structured data:

```typescript
{
  // MongoDB fields (from mongoPayload)
  document_id: string,           // ✅ REQUIRED
  user_type: string,             // ✅ REQUIRED ('student' or 'guest')
  chaptersRequested: string[],   // ✅ REQUIRED (can be empty array)
  purpose: string,                // ✅ REQUIRED (must be non-empty after trim)
  intendedUse?: string,          // Optional (old docs only)
  howDidYouLearn?: string,        // Optional (old docs only)
  
  // Structured data for PostgreSQL (from structuredData)
  email: string,                  // ✅ REQUIRED (must be valid email)
  program: string,                // Required for table
  department: string,             // Required for table
  role: string,                   // Required for table
  
  // Guest-specific fields (if formType === 'guest')
  full_name?: string,             // Guest only
  city?: string,                  // Guest only
  country?: string,               // Guest only
  school?: string,                // Guest only
  
  // Old document fields (if docStatus === 'old')
  supervisor?: string,            // Optional
  contact_number?: string,        // Old docs only
  consent_to_contact?: boolean,   // Old docs only
  preferred_contact_method?: string // Old docs only (if consent given)
}
```

---

## Common Issues

### Issue 1: Empty `purpose`
- **Symptom:** "Missing required fields" error
- **Cause:** `this.requestPurpose` is empty or whitespace-only
- **Fix:** Ensure `requestPurpose` has content (min 24 chars for active, min 50 for old)

### Issue 2: Missing `email`
- **Symptom:** "Invalid or missing email" error
- **Cause:** 
  - PUPian: `this.currentUserEmail` is empty/undefined
  - Guest: `this.guestEmail` is empty/undefined or invalid format
- **Fix:** Ensure email is populated and valid

### Issue 3: Empty `chaptersRequested`
- **Symptom:** "Missing required fields" error (if validation checks for it)
- **Cause:** `this.selectedRequestChapters` is empty Set
- **Fix:** Ensure at least one chapter is selected

### Issue 4: `document_id` is undefined
- **Symptom:** "Missing required fields" error
- **Cause:** `this.thesis._id` is undefined
- **Fix:** Ensure thesis data is loaded before submission

---

## Debug Checklist

When debugging "Missing required fields" error, check:

1. ✅ `document_id` exists and is not empty
2. ✅ `user_type` is exactly `"student"` or `"guest"` (not `"pupian"`)
3. ✅ `email` exists, is not empty, and is valid email format
4. ✅ `purpose` exists, is not empty after trim, and meets minimum length
5. ✅ `chaptersRequested` is an array (can be empty `[]`)

Add console.log before submission to verify:
```typescript
console.log('📤 [FINALIZE] Payload check:', {
  document_id: this.thesis._id,
  user_type: userType,
  email: formType === 'pupian' ? this.currentUserEmail : this.guestEmail,
  purpose: this.requestPurpose.trim(),
  purposeLength: this.requestPurpose.trim().length,
  chaptersRequested: chapters,
  chaptersLength: chapters.length
});
```







