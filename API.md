# ThesISKO API Documentation

This document provides an overview of the ThesISKO REST API endpoints.

## Base URL

```
http://localhost:3000
```

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

---

## Authentication Endpoints

### Login
```
POST /auth/login
```
**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
**Response:**
```json
{
  "token": "jwt-token-here",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "role": "student"
  }
}
```

### Signup
```
POST /auth/signup
```
**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "student"
}
```

### Logout
```
GET /auth/logout
```
**Headers:** Authorization required

---

## Submission Endpoints

### Get Student Submissions
```
GET /submissions/student/:email
```
**Headers:** Authorization required  
**Response:**
```json
[
  {
    "_id": "submission-id",
    "title": "Thesis Title",
    "student_email": "student@example.com",
    "status": "pending",
    "year": 2026,
    "created_at": "2026-06-04T10:00:00Z"
  }
]
```

### Create Submission
```
POST /submissions
```
**Headers:** Authorization required  
**Body:**
```json
{
  "title": "Thesis Title",
  "abstract": "Thesis abstract...",
  "keywords": ["AI", "Machine Learning"],
  "year": 2026
}
```

### Update Submission
```
PUT /submissions/:id
```
**Headers:** Authorization required  
**Body:** Fields to update

### Delete Submission
```
DELETE /submissions/:id
```
**Headers:** Authorization required

---

## File Management Endpoints

### Upload File
```
POST /files/upload
```
**Headers:** Authorization required  
**Content-Type:** multipart/form-data  
**Body:**
- `file`: File to upload
- `submissionId`: Associated submission ID

### Download File
```
GET /files/download/:fileId
```
**Headers:** Authorization required  
**Response:** File stream

### Get Presigned URL
```
GET /files/presigned/:fileKey
```
**Headers:** Authorization required  
**Response:**
```json
{
  "url": "https://s3-presigned-url...",
  "expiresIn": 3600
}
```

---

## Admin Endpoints

### Get All Submissions
```
GET /admin/submissions
```
**Headers:** Authorization required (Admin only)  
**Query Parameters:**
- `status`: Filter by status (pending, approved, rejected)
- `year`: Filter by year
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

### Approve Submission
```
PUT /admin/submissions/:id/approve
```
**Headers:** Authorization required (Admin only)  
**Body:**
```json
{
  "comments": "Approval comments..."
}
```

### Reject Submission
```
PUT /admin/submissions/:id/reject
```
**Headers:** Authorization required (Admin only)  
**Body:**
```json
{
  "reason": "Rejection reason..."
}
```

---

## Document Type Endpoints

### Get Document Types
```
GET /document-types
```
**Headers:** Authorization required

### Create Document Type
```
POST /document-types
```
**Headers:** Authorization required (Admin only)  
**Body:**
```json
{
  "name": "Master Thesis",
  "code": "MST",
  "description": "Master level thesis"
}
```

### Update Document Type
```
PUT /document-types/:id
```
**Headers:** Authorization required (Admin only)

### Delete Document Type
```
DELETE /document-types/:id
```
**Headers:** Authorization required (Admin only)

---

## Template Endpoints

### Get Templates
```
GET /templates
```
**Headers:** Authorization required

### Create Template
```
POST /templates
```
**Headers:** Authorization required (Admin only)  
**Content-Type:** multipart/form-data  
**Body:**
- `file`: Template file
- `name`: Template name
- `type`: Template type

### Download Template
```
GET /templates/:id/download
```
**Headers:** Authorization required

---

## Requirements Endpoints

### Get Requirements
```
GET /requirements
```
**Headers:** Authorization required

### Create Requirement
```
POST /requirements
```
**Headers:** Authorization required (Admin only)  
**Body:**
```json
{
  "title": "Requirement Title",
  "description": "Requirement description...",
  "documentType": "document-type-id",
  "mandatory": true
}
```

### Update Requirement
```
PUT /requirements/:id
```
**Headers:** Authorization required (Admin only)

### Delete Requirement
```
DELETE /requirements/:id
```
**Headers:** Authorization required (Admin only)

---

## User Management Endpoints

### Get All Users
```
GET /users
```
**Headers:** Authorization required (Admin only)

### Get User by ID
```
GET /users/:id
```
**Headers:** Authorization required

### Update User
```
PUT /users/:id
```
**Headers:** Authorization required (Admin/Self only)  
**Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com"
}
```

### Delete User
```
DELETE /users/:id
```
**Headers:** Authorization required (Admin only)

---

## Statistics Endpoints

### Get Dashboard Statistics
```
GET /stats/dashboard
```
**Headers:** Authorization required (Admin only)  
**Response:**
```json
{
  "totalSubmissions": 150,
  "pendingSubmissions": 25,
  "approvedSubmissions": 100,
  "rejectedSubmissions": 25,
  "totalUsers": 200,
  "submissionsByMonth": [...]
}
```

### Get Submission Statistics
```
GET /stats/submissions
```
**Headers:** Authorization required (Admin only)  
**Query Parameters:**
- `year`: Filter by year
- `status`: Filter by status

---

## Search Endpoints

### Search Submissions
```
GET /search
```
**Query Parameters:**
- `q`: Search query
- `year`: Filter by year
- `documentType`: Filter by document type
- `page`: Page number
- `limit`: Items per page

**Response:**
```json
{
  "results": [...],
  "total": 50,
  "page": 1,
  "pages": 5
}
```

---

## Webhook Endpoints

### Resend Inbound Email Webhook
```
POST /webhooks/resend/inbound
```
**Headers:**
- `svix-id`: Webhook ID
- `svix-timestamp`: Timestamp
- `svix-signature`: Signature
**Body:** Resend webhook payload

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": "Invalid input data",
  "details": "Validation error message"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

---

## Rate Limiting

API endpoints are rate-limited to prevent abuse:
- **General endpoints:** 100 requests per 15 minutes per IP
- **Authentication endpoints:** 5 requests per 15 minutes per IP

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1623456789
```

---

## File Upload Limits

- **Maximum file size:** 100MB
- **Allowed file types:** PDF, DOC, DOCX, TXT, ZIP
- **Maximum files per submission:** 10

---

## Notes

- All timestamps are in UTC ISO 8601 format
- All dates are in YYYY-MM-DD format
- Page numbers start at 1
- Default pagination limit is 10 items per page

---

*API Documentation - Generated June 2026*
