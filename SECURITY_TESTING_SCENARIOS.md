# Security Testing Scenarios

This document provides test scenarios to verify that email removal and authorization are working correctly.

## Prerequisites

Before testing, ensure you have test accounts for:
- **Student** (role_id = 2)
- **Group Leader** (role_id = 6)
- **Faculty** (role_id = 3)
- **Chairperson** (role_id = 4) - assigned to a specific program
- **Dean** (role_id = 5) - assigned to a department
- **Admin** (role_id = 7 or 8)

---

## Test Category 1: Authentication & Authorization

### Scenario 1.1: Unauthenticated Access Attempt
**Goal:** Verify that unauthenticated users cannot access protected endpoints

**Steps:**
1. Open browser DevTools → Network tab
2. Clear all cookies
3. Try to access: `GET /api/submissions/my-submissions`
4. Try to access: `GET /api/submissions/pending-dean`
5. Try to access: `GET /api/groups/by-chairperson`
6. Try to access: `GET /api/blocks/faculty`

**Expected Result:**
- All requests should return `401 Unauthorized`
- Response should contain: `{ authenticated: false, error: 'Authentication required' }`

---

### Scenario 1.2: Wrong Role Access Attempt
**Goal:** Verify role-based access control

**Steps:**
1. Login as **Student** (role_id = 2)
2. Try to access: `GET /api/submissions/pending-dean`
3. Try to access: `GET /api/submissions/pending-chairperson`
4. Try to access: `GET /api/groups/by-dean`
5. Login as **Faculty** (role_id = 3)
6. Try to access: `GET /api/submissions/pending-dean`
7. Try to access: `GET /api/groups/by-chairperson`

**Expected Result:**
- All requests should return `403 Forbidden`
- Response should contain: `{ error: 'Forbidden', message: 'Insufficient permissions...' }`

---

### Scenario 1.3: Correct Role Access
**Goal:** Verify users with correct roles can access their endpoints

**Steps:**
1. Login as **Student**
2. Access: `GET /api/submissions/my-submissions`
3. Login as **Chairperson**
4. Access: `GET /api/submissions/pending-chairperson`
5. Access: `GET /api/groups/by-chairperson`
6. Login as **Dean**
7. Access: `GET /api/submissions/pending-dean`
8. Access: `GET /api/groups/by-dean`
9. Login as **Faculty**
10. Access: `GET /api/blocks/faculty`
11. Access: `GET /api/groups/by-fic`
12. Access: `GET /api/groups/by-panelist`

**Expected Result:**
- All requests should return `200 OK`
- Data should be returned (may be empty array if no data exists)

---

## Test Category 2: Email Removal from URLs

### Scenario 2.1: Verify URLs Don't Contain Email
**Goal:** Confirm emails are no longer in URLs

**Steps:**
1. Login as any user
2. Open browser DevTools → Network tab
3. Navigate through the application:
   - Student dashboard → View submissions
   - Chairperson dashboard → View pending approvals
   - Dean dashboard → View pending approvals
   - Faculty dashboard → View blocks
4. Check all API requests in Network tab

**Expected Result:**
- URLs should NOT contain email addresses
- Examples:
  - ✅ `GET /api/submissions/my-submissions` (correct)
  - ❌ `GET /api/submissions/my-submissions/user@email.com` (should not exist)
  - ✅ `GET /api/submissions/pending-dean` (correct)
  - ❌ `GET /api/submissions/pending-dean/dean@email.com` (should not exist)

---

### Scenario 2.2: Verify Email Comes from Cookie
**Goal:** Confirm email is retrieved from authentication cookie

**Steps:**
1. Login as **Student** with email: `student1@example.com`
2. Open DevTools → Application → Cookies
3. Find the auth cookie and note the email in the cookie value
4. Make request: `GET /api/submissions/my-submissions`
5. Check server logs (if available) or verify response contains data for `student1@example.com`

**Expected Result:**
- Email in cookie matches the email used to fetch data
- Server should log: `✅ Authenticated user: student1@example.com`

---

## Test Category 3: Resource Ownership Verification

### Scenario 3.1: Student Can Only See Own Submissions
**Goal:** Verify students cannot access other students' submissions

**Steps:**
1. Login as **Student A** (`studentA@example.com`)
2. Create a submission (if possible) or note existing submission ID
3. Logout
4. Login as **Student B** (`studentB@example.com`)
5. Access: `GET /api/submissions/my-submissions`
6. Verify Student B's submissions are returned

**Expected Result:**
- Student B should only see their own submissions
- Student A's submissions should NOT appear in Student B's list
- If Student B tries to access Student A's submission directly, should get `403 Forbidden`

---

### Scenario 3.2: Chairperson Can Only See Their Program's Submissions
**Goal:** Verify chairperson access is limited to their program

**Setup:**
- Create Chairperson A assigned to Program X
- Create Chairperson B assigned to Program Y
- Create submissions for both programs

**Steps:**
1. Login as **Chairperson A**
2. Access: `GET /api/submissions/pending-chairperson`
3. Note which submissions are returned
4. Logout
5. Login as **Chairperson B**
6. Access: `GET /api/submissions/pending-chairperson`
7. Compare submissions

**Expected Result:**
- Chairperson A should only see submissions from Program X
- Chairperson B should only see submissions from Program Y
- No overlap between the two lists

---

### Scenario 3.3: Dean Can Only See Their Department's Submissions
**Goal:** Verify dean access is limited to their department

**Setup:**
- Create Dean A assigned to Department 1
- Create Dean B assigned to Department 2
- Create programs in both departments
- Create submissions for programs in both departments

**Steps:**
1. Login as **Dean A**
2. Access: `GET /api/submissions/pending-dean`
3. Note which submissions are returned
4. Logout
5. Login as **Dean B**
6. Access: `GET /api/submissions/pending-dean`
7. Compare submissions

**Expected Result:**
- Dean A should only see submissions from Department 1's programs
- Dean B should only see submissions from Department 2's programs
- No overlap between the two lists

---

### Scenario 3.4: Chairperson Cannot Approve Other Program's Submissions
**Goal:** Verify chairperson cannot approve submissions outside their program

**Setup:**
- Chairperson A manages Program X
- Submission exists for Program Y (different program)

**Steps:**
1. Login as **Chairperson A**
2. Try to approve submission from Program Y:
   - `PATCH /api/submissions/{submission_id}/chairperson-approve`
   - Use a submission_id from Program Y

**Expected Result:**
- Should return `403 Forbidden`
- Response: `{ error: 'Forbidden', message: 'Submission does not belong to your program' }`
- Submission should NOT be approved

---

### Scenario 3.5: Dean Cannot Approve Other Department's Submissions
**Goal:** Verify dean cannot approve submissions outside their department

**Setup:**
- Dean A manages Department 1
- Submission exists for a program in Department 2

**Steps:**
1. Login as **Dean A**
2. Try to approve submission from Department 2:
   - `PATCH /api/submissions/{submission_id}/dean-approve`
   - Use a submission_id from Department 2

**Expected Result:**
- Should return `403 Forbidden`
- Response: `{ error: 'Forbidden', message: 'Submission does not belong to your department' }`
- Submission should NOT be approved

---

## Test Category 4: Edge Cases & Security

### Scenario 4.1: Cookie Tampering Attempt
**Goal:** Verify system validates cookie data against database

**Steps:**
1. Login as **Student**
2. Open DevTools → Application → Cookies
3. Modify the auth cookie to change:
   - `role_id` from 2 to 5 (pretend to be dean)
   - `email` to a different email
4. Try to access: `GET /api/submissions/pending-dean`

**Expected Result:**
- Should return `403 Forbidden` (if role check happens)
- OR should return empty array (if dean verification fails because email doesn't match database)
- System should verify against database, not just trust cookie

---

### Scenario 4.2: Missing Department Assignment (Dean)
**Goal:** Verify dean without department assignment cannot access

**Setup:**
- Create a user with role_id = 5 (Dean) but no `department_head` assigned

**Steps:**
1. Login as this Dean
2. Try to access: `GET /api/submissions/pending-dean`

**Expected Result:**
- Should return `403 Forbidden`
- Response: `{ error: 'Forbidden', message: 'Dean does not have a department assigned' }`

---

### Scenario 4.3: Missing Program Assignment (Chairperson)
**Goal:** Verify chairperson without program assignment cannot access

**Setup:**
- Create a user with role_id = 4 (Chairperson) but not assigned to any program

**Steps:**
1. Login as this Chairperson
2. Try to access: `GET /api/submissions/pending-chairperson`

**Expected Result:**
- Should return `403 Forbidden`
- Response: `{ error: 'Forbidden', message: 'User is not a chairperson of any program' }`

---

### Scenario 4.4: Faculty Access to Blocks
**Goal:** Verify faculty can only see blocks they're assigned to

**Setup:**
- Faculty A is FIC for Block 1
- Faculty B is FIC for Block 2
- Faculty A is panelist for Block 3

**Steps:**
1. Login as **Faculty A**
2. Access: `GET /api/blocks/faculty`
3. Verify blocks returned

**Expected Result:**
- Should see Block 1 (as FIC) and Block 3 (as panelist)
- Should NOT see Block 2

---

### Scenario 4.5: Resubmission Ownership Check
**Goal:** Verify students can only resubmit their own submissions

**Steps:**
1. Login as **Student A**
2. Note a submission ID that belongs to Student B
3. Try to resubmit: `PATCH /api/submissions/{studentB_submission_id}/resubmit`

**Expected Result:**
- Should return `403 Forbidden`
- Response: `{ error: 'Forbidden', message: 'Cannot access submission: not the submitter' }`

---

## Test Category 5: Frontend Integration

### Scenario 5.1: Frontend URL Construction
**Goal:** Verify frontend doesn't pass email in URLs

**Steps:**
1. Open browser DevTools → Sources tab
2. Set breakpoints in frontend service files:
   - `adminSide/dashboard/dashboard.ts` (line ~135)
   - `adminSide/approvals/approvals.ts` (line ~131)
   - `facultySide/faculty-home/faculty-home.ts` (line ~155)
3. Navigate through the application
4. Check the constructed URLs

**Expected Result:**
- URLs should NOT contain email interpolation
- Example: `endpoint = \`${apiUrl}/submissions/pending-dean\`` ✅
- NOT: `endpoint = \`${apiUrl}/submissions/pending-dean/${email}\`` ❌

---

### Scenario 5.2: Frontend Error Handling
**Goal:** Verify frontend handles 401/403 errors gracefully

**Steps:**
1. Clear cookies
2. Try to navigate to protected pages
3. Check if user is redirected to login
4. Check if error messages are displayed appropriately

**Expected Result:**
- User should be redirected to login page
- Error messages should be user-friendly
- No technical error details exposed to user

---

## Test Category 6: API Response Verification

### Scenario 6.1: Verify Response Structure
**Goal:** Ensure API responses maintain expected structure

**Steps:**
1. Login as appropriate user
2. Make requests to all updated endpoints
3. Verify response structure

**Expected Result:**
- All responses should maintain: `{ success: true, data: [...] }`
- No breaking changes to response format
- Data should be filtered correctly based on user role

---

### Scenario 6.2: Empty Results Handling
**Goal:** Verify endpoints return empty arrays when no data exists

**Steps:**
1. Login as **Chairperson** with no pending submissions
2. Access: `GET /api/submissions/pending-chairperson`
3. Login as **Dean** with no pending submissions
4. Access: `GET /api/submissions/pending-dean`

**Expected Result:**
- Should return: `{ success: true, data: [] }`
- Should NOT return error
- Frontend should handle empty arrays gracefully

---

## Quick Test Checklist

Use this checklist for rapid verification:

- [ ] Unauthenticated access returns 401
- [ ] Wrong role access returns 403
- [ ] Correct role access returns 200 with data
- [ ] URLs don't contain email addresses
- [ ] Student sees only their submissions
- [ ] Chairperson sees only their program's submissions
- [ ] Dean sees only their department's submissions
- [ ] Chairperson cannot approve other program's submissions
- [ ] Dean cannot approve other department's submissions
- [ ] Faculty sees only their assigned blocks
- [ ] Frontend constructs URLs without email
- [ ] Cookie tampering is detected
- [ ] Missing assignments are handled (403)
- [ ] Empty results return empty arrays
- [ ] Error messages are user-friendly

---

## Manual Testing Commands

### Using cURL (without authentication):
```bash
# Should return 401
curl -X GET http://localhost:5050/api/submissions/my-submissions
```

### Using cURL (with cookie):
```bash
# First, login and get cookie, then:
curl -X GET http://localhost:5050/api/submissions/my-submissions \
  -H "Cookie: auth_cookie=<your_cookie_value>"
```

### Using Postman:
1. Create a new request
2. Set method to GET
3. Set URL (without email): `http://localhost:5050/api/submissions/pending-dean`
4. Add cookie in Headers or use Postman's cookie manager
5. Send request

---

## Browser DevTools Testing

1. **Network Tab:**
   - Filter by "Fetch/XHR"
   - Check all API requests
   - Verify URLs don't contain emails
   - Check response status codes

2. **Application Tab:**
   - Check Cookies section
   - Verify auth cookie exists
   - Check cookie value structure

3. **Console Tab:**
   - Check for any JavaScript errors
   - Check for API error messages

---

## Notes

- All tests should be performed in both development and production-like environments
- Test with different browsers (Chrome, Firefox, Edge)
- Test with different user roles simultaneously (multiple tabs)
- Monitor server logs for any unexpected errors
- Verify database queries are efficient (no N+1 problems)

