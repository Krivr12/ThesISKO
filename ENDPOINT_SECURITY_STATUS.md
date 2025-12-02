# Endpoint Security Status

This document lists all backend endpoints and their current security status.

**Legend:**
- 🔴 **UNPROTECTED** - No authentication, no authorization
- 🟠 **PARTIAL** - Some protection but incomplete
- 🟢 **PROTECTED** - Properly secured
- ⚪ **PUBLIC** - Intentionally public (no protection needed)

---

## Authentication Routes (`/auth`)

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/auth/test` | GET | ⚪ PUBLIC | Test endpoint |
| `/auth/test-google-callback` | GET | ⚪ PUBLIC | Test endpoint |
| `/auth/google` | GET | ⚪ PUBLIC | OAuth initiation |
| `/auth/google/callback` | GET | ⚪ PUBLIC | OAuth callback |
| `/auth/google/failure` | GET | ⚪ PUBLIC | OAuth failure |
| `/auth/login` | POST | ⚪ PUBLIC | User login |
| `/auth/admin-login` | POST | ⚪ PUBLIC | Admin login |
| `/auth/me` | GET | 🔴 UNPROTECTED | Should require auth |
| `/auth/logout` | POST | 🔴 UNPROTECTED | Should require auth |
| `/auth/google/debug` | GET | 🔴 UNPROTECTED | Should be removed in production |
| `/auth/test-email` | POST | 🔴 UNPROTECTED | Should be removed in production |
| `/auth/resend-verification` | POST | ⚪ PUBLIC | Email verification |

---

## Submissions Routes (`/submissions`)

| Endpoint | Method | Status | Required Auth | Required Role | Notes |
|----------|--------|--------|---------------|---------------|-------|
| `/submissions/generate-id/:department/:program` | GET | 🔴 UNPROTECTED | ✅ Yes | Student/Admin | Should verify user can create submissions |
| `/submissions/create` | POST | 🔴 UNPROTECTED | ✅ Yes | Student | Should verify submitter_email matches user |
| `/submissions/check-duplicates` | GET | 🔴 UNPROTECTED | ✅ Yes | Student | Should require auth |
| `/submissions/my-submissions/:email` | GET | 🔴 UNPROTECTED | ✅ Yes | Student | Should verify email matches user |
| `/submissions/:submission_id/resubmit` | PATCH | 🔴 UNPROTECTED | ✅ Yes | Student | Should verify ownership |
| `/submissions/pending-chairperson/:email` | GET | 🔴 UNPROTECTED | ✅ Yes | Chairperson (4) | Should verify user is chairperson |
| `/submissions/:submission_id/chairperson-approve` | PATCH | 🔴 UNPROTECTED | ✅ Yes | Chairperson (4) | Should verify user is chairperson of program |
| `/submissions/:submission_id/chairperson-reject` | PATCH | 🔴 UNPROTECTED | ✅ Yes | Chairperson (4) | Should verify user is chairperson of program |
| `/submissions/pending-dean/:email` | GET | 🔴 UNPROTECTED | ✅ Yes | Dean (5) | Should verify user is dean of department |
| `/submissions/:submission_id/dean-approve` | PATCH | 🔴 UNPROTECTED | ✅ Yes | Dean (5) | Should verify user is dean of department |
| `/submissions/:submission_id/dean-reject` | PATCH | 🔴 UNPROTECTED | ✅ Yes | Dean (5) | Should verify user is dean of department |
| `/submissions/with-program-info` | GET | 🔴 UNPROTECTED | ✅ Yes | Admin/Dean | Should require admin role |
| `/submissions/:submission_id` | GET | 🔴 UNPROTECTED | ✅ Yes | Varies | Should verify access based on role |
| `/submissions/` | GET | 🔴 UNPROTECTED | ✅ Yes | Admin | Should require admin role |
| `/submissions/:submission_id/repository` | POST | 🔴 UNPROTECTED | ✅ Yes | Admin/Dean | Should require admin role |

---

## Admin Routes (`/admin`)

| Endpoint | Method | Status | Required Auth | Required Role | Notes |
|----------|--------|--------|---------------|---------------|-------|
| `/admin/faculty` | GET | 🔴 UNPROTECTED | ✅ Yes | Admin (7, 8) | Should require superadmin |
| `/admin/faculty/all-roles` | GET | 🔴 UNPROTECTED | ✅ Yes | Admin (7, 8) | Should require superadmin |
| `/admin/faculty/blocks` | GET | 🔴 UNPROTECTED | ✅ Yes | Admin (7, 8) | Should require admin |
| `/admin/faculty` | POST | 🔴 UNPROTECTED | ✅ Yes | SuperAdmin (8) | Should require superadmin |
| `/admin/faculty/:id` | PUT | 🔴 UNPROTECTED | ✅ Yes | SuperAdmin (8) | Should require superadmin |
| `/admin/faculty/all-roles/:id` | PUT | 🔴 UNPROTECTED | ✅ Yes | SuperAdmin (8) | Should require superadmin |
| `/admin/faculty/:id` | DELETE | 🔴 UNPROTECTED | ✅ Yes | SuperAdmin (8) | Should require superadmin |
| `/admin/faculty/:id/reset-password` | POST | 🔴 UNPROTECTED | ✅ Yes | SuperAdmin (8) | Should require superadmin |

---

## Groups Routes (`/groups`)

| Endpoint | Method | Status | Required Auth | Required Role | Notes |
|----------|--------|--------|---------------|---------------|-------|
| `/groups` | GET | 🔴 UNPROTECTED | ✅ Yes | Admin | Should require admin role |
| `/groups/by-fic/:email` | GET | 🔴 UNPROTECTED | ✅ Yes | Faculty (3) | Should verify email matches user |
| `/groups/by-chairperson/:email` | GET | 🔴 UNPROTECTED | ✅ Yes | Chairperson (4) | Should verify email matches user |
| `/groups/by-panelist/:email` | GET | 🔴 UNPROTECTED | ✅ Yes | Faculty (3) | Should verify email matches user |
| `/groups/by-dean/:email` | GET | 🔴 UNPROTECTED | ✅ Yes | Dean (5) | Should verify email matches user |
| `/groups/:group_id` | GET | 🔴 UNPROTECTED | ✅ Yes | Varies | Should verify user has access |
| `/groups` | POST | 🔴 UNPROTECTED | ✅ Yes | Admin | Should require admin role |
| `/groups/:groupId/milestones/:milestoneType/files` | PATCH | 🔴 UNPROTECTED | ✅ Yes | Student/Faculty | Should verify ownership/role |
| `/groups/:groupId/milestones/upload_manuscript/faculty-reject` | PATCH | 🔴 UNPROTECTED | ✅ Yes | Faculty (3) | Should verify user is FIC |
| `/groups/:groupId/milestones/upload_manuscript/panelist-reject` | PATCH | 🔴 UNPROTECTED | ✅ Yes | Faculty (3) | Should verify user is panelist |
| `/groups/:groupId/milestones/upload_manuscript/faculty-approve` | PATCH | 🔴 UNPROTECTED | ✅ Yes | Faculty (3) | Should verify user is FIC |
| `/groups/:groupId/milestones/:milestoneType/chairperson-approve` | PATCH | 🔴 UNPROTECTED | ✅ Yes | Chairperson (4) | Should verify user is chairperson |
| `/groups/:groupId/milestones/upload_manuscript/approve` | PATCH | 🔴 UNPROTECTED | ✅ Yes | Chairperson (4) | Should verify user is chairperson |
| `/groups/:groupId/chairperson-approve-final` | PATCH | 🔴 UNPROTECTED | ✅ Yes | Chairperson (4) | Should verify user is chairperson |
| `/groups/:groupId/chairperson-reject` | PATCH | 🔴 UNPROTECTED | ✅ Yes | Chairperson (4) | Should verify user is chairperson |
| `/groups/:groupId/dean-approve` | PATCH | 🔴 UNPROTECTED | ✅ Yes | Dean (5) | Should verify user is dean |
| `/groups/:groupId/dean-reject` | PATCH | 🔴 UNPROTECTED | ✅ Yes | Dean (5) | Should verify user is dean |
| `/groups/:groupId/refresh-progress` | PATCH | 🔴 UNPROTECTED | ✅ Yes | Varies | Should verify access |
| `/groups/:group_id` | PATCH | 🔴 UNPROTECTED | ✅ Yes | Admin | Should require admin role |
| `/groups/:group_id` | DELETE | 🔴 UNPROTECTED | ✅ Yes | SuperAdmin (8) | Should require superadmin |
| `/groups/:group_id/repository` | POST | 🔴 UNPROTECTED | ✅ Yes | Admin | Should require admin role |

---

## Records Routes (`/records`)

| Endpoint | Method | Status | Required Auth | Required Role | Notes |
|----------|--------|--------|---------------|---------------|-------|
| `/records` | GET | 🔴 UNPROTECTED | ⚠️ Partial | Public/Admin | Should filter by access_level |
| `/records/latest` | GET | 🔴 UNPROTECTED | ⚠️ Partial | Public | Should filter by access_level |
| `/records/:_id` | GET | 🔴 UNPROTECTED | ⚠️ Partial | Public | Should check access_level |
| `/records` | POST | 🔴 UNPROTECTED | ✅ Yes | Admin | Should require admin role |
| `/records/bulk` | POST | 🔴 UNPROTECTED | ✅ Yes | Admin | Should require admin role |
| `/records/search` | POST | 🔴 UNPROTECTED | ⚠️ Partial | Public | Should filter by access_level |
| `/records/theses/by-ids` | POST | 🔴 UNPROTECTED | ⚠️ Partial | Public | Should filter by access_level |
| `/records/:_id` | DELETE | 🔴 UNPROTECTED | ✅ Yes | SuperAdmin (8) | Should require superadmin |
| `/records/:_id` | PUT | 🔴 UNPROTECTED | ✅ Yes | SuperAdmin (8) | Should require superadmin |
| `/records/:_id/with-file` | PUT | 🔴 UNPROTECTED | ✅ Yes | SuperAdmin (8) | Should require superadmin |
| `/records/:doc_id` | PUT | 🔴 UNPROTECTED | ✅ Yes | SuperAdmin (8) | Should require superadmin |

---

## Requests Routes (`/requests`)

| Endpoint | Method | Status | Required Auth | Required Role | Notes |
|----------|--------|--------|---------------|---------------|-------|
| `/requests/analytics` | GET | 🔴 UNPROTECTED | ✅ Yes | Admin/Dean | Should require admin role |
| `/requests/:request_id/details` | GET | 🔴 UNPROTECTED | ✅ Yes | Admin/Requester | Should verify ownership or admin |
| `/requests` | POST | 🟠 PARTIAL | ⚪ Public | Guest/Student | Has rate limiting & validation |
| `/requests/:id/respond` | POST | 🔴 UNPROTECTED | ✅ Yes | Dean (5) | Should verify user is dean |
| `/requests/:id/reject` | POST | 🔴 UNPROTECTED | ✅ Yes | Dean (5) | Should verify user is dean |

---

## S3 Routes (`/s3`)

| Endpoint | Method | Status | Required Auth | Required Role | Notes |
|----------|--------|--------|---------------|---------------|-------|
| `/s3/signed-url` | POST | 🔴 UNPROTECTED | ✅ Yes | Student/Faculty | Should verify group ownership |
| `/s3/submission/signed-url` | POST | 🔴 UNPROTECTED | ✅ Yes | Student | Should verify submission ownership |
| `/s3/signed-urls` | POST | 🔴 UNPROTECTED | ✅ Yes | Student/Faculty | Should verify group ownership |
| `/s3/submission/signed-urls` | POST | 🔴 UNPROTECTED | ✅ Yes | Student | Should verify submission ownership |
| `/s3/view-urls` | POST | 🔴 UNPROTECTED | ✅ Yes | Varies | Should verify access |
| `/s3/submission/view-urls` | POST | 🔴 UNPROTECTED | ✅ Yes | Varies | Should verify access |
| `/s3/file` | DELETE | 🔴 UNPROTECTED | ✅ Yes | Owner/Admin | Should verify ownership |
| `/s3/submission/file` | DELETE | 🔴 UNPROTECTED | ✅ Yes | Owner/Admin | Should verify ownership |
| `/s3/update-file` | POST | 🔴 UNPROTECTED | ✅ Yes | Owner/Admin | Should verify ownership |
| `/s3/submission/update-file` | POST | 🔴 UNPROTECTED | ✅ Yes | Owner/Admin | Should verify ownership |
| `/s3/view-repository-file` | POST | 🔴 UNPROTECTED | ⚠️ Partial | Public | Should check access_level |

---

## Programs Routes (`/programs`)

| Endpoint | Method | Status | Required Auth | Required Role | Notes |
|----------|--------|--------|---------------|---------------|-------|
| `/programs/faculty/available` | GET | 🔴 UNPROTECTED | ✅ Yes | Admin | Should require admin role |
| `/programs` | GET | 🔴 UNPROTECTED | ⚠️ Partial | Public | Some data should be public |
| `/programs/:program_id` | GET | 🔴 UNPROTECTED | ⚠️ Partial | Public | Some data should be public |
| `/programs` | POST | 🔴 UNPROTECTED | ✅ Yes | SuperAdmin (8) | Should require superadmin |
| `/programs/:program_id` | PUT | 🔴 UNPROTECTED | ✅ Yes | SuperAdmin (8) | Should require superadmin |
| `/programs/:program_id` | DELETE | 🔴 UNPROTECTED | ✅ Yes | SuperAdmin (8) | Should require superadmin |

---

## Blocks Routes (`/blocks`)

| Endpoint | Method | Status | Required Auth | Required Role | Notes |
|----------|--------|--------|---------------|---------------|-------|
| `/blocks/faculty/:email` | GET | 🔴 UNPROTECTED | ✅ Yes | Faculty (3) | Should verify email matches user |
| `/blocks` | GET | 🔴 UNPROTECTED | ✅ Yes | Admin | Should require admin role |
| `/blocks/:block_id` | GET | 🔴 UNPROTECTED | ✅ Yes | Admin | Should require admin role |
| `/blocks` | POST | 🔴 UNPROTECTED | ✅ Yes | SuperAdmin (8) | Should require superadmin |
| `/blocks/:block_id` | PUT | 🔴 UNPROTECTED | ✅ Yes | SuperAdmin (8) | Should require superadmin |
| `/blocks/:block_id` | DELETE | 🔴 UNPROTECTED | ✅ Yes | SuperAdmin (8) | Should require superadmin |

---

## Analytics Routes (`/analytics`)

| Endpoint | Method | Status | Required Auth | Required Role | Notes |
|----------|--------|--------|---------------|---------------|-------|
| `/analytics/dashboard` | GET | 🔴 UNPROTECTED | ✅ Yes | Admin (7, 8) | Should require admin role |
| `/analytics/requests-by-month` | GET | 🔴 UNPROTECTED | ✅ Yes | Admin (7, 8) | Should require admin role |
| `/analytics/user-growth` | GET | 🔴 UNPROTECTED | ✅ Yes | Admin (7, 8) | Should require admin role |
| `/analytics/viewed-documents` | GET | 🔴 UNPROTECTED | ✅ Yes | Admin (7, 8) | Should require admin role |

---

## Document Types Routes (`/document-types`)

| Endpoint | Method | Status | Required Auth | Required Role | Notes |
|----------|--------|--------|---------------|---------------|-------|
| `/document-types` | GET | 🔴 UNPROTECTED | ⚠️ Partial | Public | Some data should be public |
| `/document-types/:type_id` | GET | 🔴 UNPROTECTED | ⚠️ Partial | Public | Some data should be public |
| `/document-types` | POST | 🔴 UNPROTECTED | ✅ Yes | SuperAdmin (8) | Should require superadmin |
| `/document-types/:type_id` | PATCH | 🔴 UNPROTECTED | ✅ Yes | SuperAdmin (8) | Should require superadmin |
| `/document-types/:type_id` | DELETE | 🔴 UNPROTECTED | ✅ Yes | SuperAdmin (8) | Should require superadmin |

---

## Requirements Routes (`/requirements`)

| Endpoint | Method | Status | Required Auth | Required Role | Notes |
|----------|--------|--------|---------------|---------------|-------|
| `/requirements` | GET | 🔴 UNPROTECTED | ⚠️ Partial | Public | Some data should be public |
| `/requirements/document-types` | GET | 🔴 UNPROTECTED | ⚠️ Partial | Public | Some data should be public |
| `/requirements/by-type/:document_type` | GET | 🔴 UNPROTECTED | ⚠️ Partial | Public | Some data should be public |
| `/requirements/:document_type/files` | GET | 🔴 UNPROTECTED | ⚠️ Partial | Public | Some data should be public |
| `/requirements` | POST | 🔴 UNPROTECTED | ✅ Yes | SuperAdmin (8) | Should require superadmin |
| `/requirements/:id` | PATCH | 🔴 UNPROTECTED | ✅ Yes | SuperAdmin (8) | Should require superadmin |
| `/requirements/:document_type` | PUT | 🔴 UNPROTECTED | ✅ Yes | SuperAdmin (8) | Should require superadmin |
| `/requirements/:document_type` | DELETE | 🔴 UNPROTECTED | ✅ Yes | SuperAdmin (8) | Should require superadmin |
| `/requirements/id/:id` | DELETE | 🔴 UNPROTECTED | ✅ Yes | SuperAdmin (8) | Should require superadmin |

---

## Users Routes (`/api/users`)

| Endpoint | Method | Status | Required Auth | Required Role | Notes |
|----------|--------|--------|---------------|---------------|-------|
| `/api/users` | GET | 🔴 UNPROTECTED | ✅ Yes | Admin (7, 8) | Should require admin role |
| `/api/users` | POST | ⚪ PUBLIC | ⚪ Public | Public | Signup endpoint |
| `/api/users/login` | POST | ⚪ PUBLIC | ⚪ Public | Public | Login endpoint |
| `/api/users/verify` | GET | ⚪ PUBLIC | ⚪ Public | Public | Email verification |
| `/api/users/:id` | GET | 🔴 UNPROTECTED | ✅ Yes | Owner/Admin | Should verify ownership or admin |
| `/api/users/:id` | PUT | 🔴 UNPROTECTED | ✅ Yes | Owner | Should verify ownership |

---

## Contact Routes (`/contact`)

| Endpoint | Method | Status | Required Auth | Required Role | Notes |
|----------|--------|--------|---------------|---------------|-------|
| `/contact` | POST | ⚪ PUBLIC | ⚪ Public | Public | Contact form (should have rate limiting) |

---

## Group Progress Routes (`/group_progress`)

| Endpoint | Method | Status | Required Auth | Required Role | Notes |
|----------|--------|--------|---------------|---------------|-------|
| `/group_progress` | GET | 🔴 UNPROTECTED | ✅ Yes | Admin | Should require admin role |
| `/group_progress/create-progress` | POST | 🔴 UNPROTECTED | ✅ Yes | Admin | Should require admin role |
| `/group_progress/update-title` | PUT | 🔴 UNPROTECTED | ✅ Yes | Owner/Admin | Should verify ownership |
| `/group_progress/upload_manuscript/:group_id` | PUT | 🔴 UNPROTECTED | ✅ Yes | Owner | Should verify ownership |
| `/group_progress/complete_copyright/:group_id` | PUT | 🔴 UNPROTECTED | ✅ Yes | Owner | Should verify ownership |
| `/group_progress/pass_turnitin/:group_id` | PUT | 🔴 UNPROTECTED | ✅ Yes | Owner | Should verify ownership |
| `/group_progress/upload_all_docs/:group_id` | PUT | 🔴 UNPROTECTED | ✅ Yes | Owner | Should verify ownership |
| `/group_progress/describe_work/:group_id` | PUT | 🔴 UNPROTECTED | ✅ Yes | Owner | Should verify ownership |
| `/group_progress/update-faculty-status` | PUT | 🔴 UNPROTECTED | ✅ Yes | Faculty/Admin | Should verify role |
| `/group_progress/delete` | DELETE | 🔴 UNPROTECTED | ✅ Yes | Admin | Should require admin role |
| `/group_progress/check-status/:group_id/:requirement` | GET | 🔴 UNPROTECTED | ✅ Yes | Owner/Admin | Should verify access |

---

## S3 Search Routes (`/s3`)

| Endpoint | Method | Status | Required Auth | Required Role | Notes |
|----------|--------|--------|---------------|---------------|-------|
| `/s3/search` | GET | 🔴 UNPROTECTED | ⚠️ Partial | Public | Should filter by access_level |

---

## Summary Statistics

- **Total Endpoints:** ~150+
- **🔴 Unprotected:** ~140+ (93%+)
- **🟠 Partial Protection:** ~10 (7%)
- **🟢 Protected:** 0 (0%)
- **⚪ Public (Intentionally):** ~5 (3%)

---

## Role Definitions

| Role ID | Role Name | Description |
|---------|-----------|-------------|
| 1 | Student | Regular student users |
| 2 | Guest | Guest users (limited access) |
| 3 | Faculty | Faculty members |
| 4 | Chairperson | Department chairperson |
| 5 | Dean | College dean |
| 6 | Admin | System administrator |
| 7 | Admin + Faculty | Admin with faculty privileges |
| 8 | SuperAdmin | Super administrator |

---

## Next Steps

1. **Immediate:** Implement authentication middleware
2. **Immediate:** Implement authorization middleware
3. **Short-term:** Apply to all endpoints systematically
4. **Short-term:** Remove sensitive data from URLs
5. **Medium-term:** Add comprehensive testing

---

**Last Updated:** 2024  
**Status:** 🔴 CRITICAL - Immediate action required


