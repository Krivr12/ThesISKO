# `requesters_analytics` Table - Complete Schema

## Overview
This table stores structured requester information for analytics purposes. It works for both **Active** and **Old** document requests. Old document-specific fields (like supervisor, intended use, etc.) are stored only in MongoDB.

---

## Complete Table Schema

```sql
CREATE TABLE requesters_analytics (
  -- Primary Key
  id SERIAL PRIMARY KEY,
  
  -- Foreign Key to MongoDB
  request_id VARCHAR(255) NOT NULL UNIQUE,  -- MongoDB _id.toString()
  
  -- Core Fields (All Requests)
  user_type VARCHAR(50) NOT NULL,          -- 'student' or 'guest'
  email VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',     -- 'pending', 'approved', 'rejected'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  
  -- PUPian (Student) Fields
  program VARCHAR(255),                     -- Program/College name
  department VARCHAR(255),                  -- Department name
  role VARCHAR(50),                        -- 'Student' or 'Faculty'
  
  -- Guest Fields
  full_name VARCHAR(255),                   -- Guest full name
  city VARCHAR(255),                        -- Guest city
  country VARCHAR(255),                      -- Guest country
  school VARCHAR(255),                       -- University/Organization name
  
  -- Old Document Fields (for both PUPian and Guest)
  supervisor VARCHAR(255),                  -- Supervisor/Adviser (optional, old docs only)
  contact_number VARCHAR(20),                -- Contact number (old docs only)
  consent_to_contact BOOLEAN,                -- Consent to contact checkbox (old docs only)
  preferred_contact_method VARCHAR(50),     -- 'Email' or 'Phone' (old docs only, if consent given)
  
  -- Indexes for Performance
  INDEX idx_request_id (request_id),
  INDEX idx_user_type (user_type),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_email (email)
);
```

---

## Field Descriptions

### Core Fields (All Requests)

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `id` | SERIAL | Yes | Primary key, auto-increment |
| `request_id` | VARCHAR(255) | Yes | Foreign key to MongoDB `_id` (as string) |
| `user_type` | VARCHAR(50) | Yes | Either `'student'` (PUPian) or `'guest'` (non-PUP) |
| `email` | VARCHAR(255) | Yes | Requester's email address |
| `status` | VARCHAR(50) | Yes | Request status: `'pending'`, `'approved'`, `'rejected'` |
| `created_at` | TIMESTAMP | Yes | When the request was created (auto-set) |
| `updated_at` | TIMESTAMP | No | When the request was last updated |

### PUPian (Student) Fields

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `program` | VARCHAR(255) | Yes* | Program/College name (e.g., "COLLEGE OF COMPUTER AND INFORMATION SCIENCES") |
| `department` | VARCHAR(255) | Yes* | Department name (e.g., "Bachelor of Science in Information Technology") |
| `role` | VARCHAR(50) | Yes* | Either `'Student'` or `'Faculty'` |

*Required when `user_type = 'student'`, NULL for guests

### Guest Fields

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `full_name` | VARCHAR(255) | Yes* | Guest's full name |
| `city` | VARCHAR(255) | Yes* | Guest's city |
| `country` | VARCHAR(255) | Yes* | Guest's country |
| `school` | VARCHAR(255) | Yes* | University/Organization name |
| `program` | VARCHAR(255) | Yes* | Guest's program (free text) |
| `department` | VARCHAR(255) | Yes* | Guest's department (free text) |
| `role` | VARCHAR(50) | Yes* | Either `'Student'` or `'Faculty'` |

*Required when `user_type = 'guest'`, NULL for PUPian

---

## Field Mapping by Form Type

### Active PUPian Form → Table

| Form Variable | Table Column | Value Example |
|--------------|--------------|---------------|
| `currentUserEmail` | `email` | `student@iskolarngbayan.pup.edu.ph` |
| `studentProgram` | `program` | `COLLEGE OF COMPUTER AND INFORMATION SCIENCES` |
| `studentDepartment` | `department` | `Bachelor of Science in Information Technology` |
| `pupianRole` | `role` | `Student` or `Faculty` |
| - | `user_type` | `student` |
| - | `full_name` | `NULL` |
| - | `city` | `NULL` |
| - | `country` | `NULL` |
| - | `school` | `NULL` |

### Active Guest Form → Table

| Form Variable | Table Column | Value Example |
|--------------|--------------|---------------|
| `guestEmail` | `email` | `guest@example.com` |
| `guestFullName` | `full_name` | `John Doe` |
| `guestCity` | `city` | `Manila` |
| `guestCountry` | `country` | `Philippines` |
| `guestSchool` | `school` | `University of the Philippines` |
| `guestProgram` | `program` | `Computer Science` |
| `guestDepartment` | `department` | `Department of Computer Science` |
| `guestRole` | `role` | `Student` or `Faculty` |
| - | `user_type` | `guest` |

### Old PUPian Form → Table

**Same as Active PUPian** (no additional fields in table)

| Form Variable | Table Column | Notes |
|--------------|--------------|-------|
| `currentUserEmail` | `email` | Same as active |
| `studentProgram` | `program` | Same as active |
| `studentDepartment` | `department` | Same as active |
| `pupianRole` | `role` | Same as active |
| `oldPupianSupervisor` | - | **NOT in table** - stored in MongoDB only |

### Old Guest Form → Table

**Same as Active Guest** (no additional fields in table)

| Form Variable | Table Column | Notes |
|--------------|--------------|-------|
| `guestEmail` | `email` | Same as active |
| `guestFullName` | `full_name` | Same as active |
| `guestCity` | `city` | Same as active |
| `guestCountry` | `country` | Same as active |
| `guestSchool` | `school` | Same as active |
| `guestProgram` | `program` | Same as active |
| `guestDepartment` | `department` | Same as active |
| `guestRole` | `role` | Same as active |
| `oldGuestSupervisor` | - | **NOT in table** - stored in MongoDB only |

---

## Fields NOT in Table (MongoDB Only)

These fields are **NOT** stored in the `requesters_analytics` table:

| Field | Location | Reason |
|-------|----------|--------|
| `purpose` | MongoDB | Long text field (24-50+ chars), not suitable for table |
| `chaptersRequested` | MongoDB | Array data (multiple values) |
| `intendedUse` | MongoDB | Long text field, only for old documents |
| `howDidYouLearn` | MongoDB | Optional long text, only for old documents |

---

## Example INSERT Statements

### Active PUPian Request

```sql
INSERT INTO requesters_analytics (
  request_id, 
  user_type, 
  email, 
  program, 
  department, 
  role, 
  status, 
  created_at
) VALUES (
  '507f1f77bcf86cd799439011',  -- MongoDB _id
  'student',
  'student@iskolarngbayan.pup.edu.ph',
  'COLLEGE OF COMPUTER AND INFORMATION SCIENCES',
  'Bachelor of Science in Information Technology',
  'Student',
  'pending',
  CURRENT_TIMESTAMP
);
```

### Active Guest Request

```sql
INSERT INTO requesters_analytics (
  request_id,
  user_type,
  email,
  full_name,
  city,
  country,
  school,
  program,
  department,
  role,
  status,
  created_at
) VALUES (
  '507f191e810c19729de860ea',  -- MongoDB _id
  'guest',
  'guest@example.com',
  'John Doe',
  'Manila',
  'Philippines',
  'University of the Philippines',
  'Computer Science',
  'Department of Computer Science',
  'Faculty',
  'pending',
  CURRENT_TIMESTAMP
);
```

### Old PUPian Request

```sql
-- Same structure as Active PUPian
INSERT INTO requesters_analytics (
  request_id, 
  user_type, 
  email, 
  program, 
  department, 
  role, 
  status, 
  created_at
) VALUES (
  '507f2a88bcf86cd799439012',  -- MongoDB _id
  'student',
  'student@iskolarngbayan.pup.edu.ph',
  'COLLEGE OF ENGINEERING',
  'Bachelor of Science in Civil Engineering',
  'Faculty',
  'pending',
  CURRENT_TIMESTAMP
);
```

### Old Guest Request

```sql
-- Same structure as Active Guest
INSERT INTO requesters_analytics (
  request_id,
  user_type,
  email,
  full_name,
  city,
  country,
  school,
  program,
  department,
  role,
  status,
  created_at
) VALUES (
  '507f2b99bcf86cd799439013',  -- MongoDB _id
  'guest',
  'researcher@university.edu',
  'Jane Smith',
  'Quezon City',
  'Philippines',
  'Ateneo de Manila University',
  'Information Systems',
  'Department of Information Systems',
  'Student',
  'pending',
  CURRENT_TIMESTAMP
);
```

---

## NULL Field Rules

### For PUPian Requests (`user_type = 'student'`):
- `full_name` = NULL
- `city` = NULL
- `country` = NULL
- `school` = NULL
- `program` = NOT NULL
- `department` = NOT NULL
- `role` = NOT NULL

### For Guest Requests (`user_type = 'guest'`):
- `full_name` = NOT NULL
- `city` = NOT NULL
- `country` = NOT NULL
- `school` = NOT NULL
- `program` = NOT NULL
- `department` = NOT NULL
- `role` = NOT NULL

---

## Summary

**Total Columns: 17**

1. `id` (Primary Key)
2. `request_id` (Foreign Key to MongoDB)
3. `user_type` (student/guest)
4. `email`
5. `status`
6. `created_at`
7. `updated_at`
8. `program` (used by both, but different sources)
9. `department` (used by both, but different sources)
10. `role` (used by both)
11. `full_name` (guests only)
12. `city` (guests only)
13. `country` (guests only)
14. `school` (guests only)
15. `supervisor` (old documents only, optional)
16. `contact_number` (old documents only)
17. `consent_to_contact` (old documents only)
18. `preferred_contact_method` (old documents only, if consent given)

**Key Points:**
- Same table structure for Active and Old documents
- Old document-specific fields are in MongoDB only
- PUPian and Guest share `program`, `department`, and `role` columns
- Guest-specific fields (`full_name`, `city`, `country`, `school`) are NULL for PUPian
- All fields except `id`, `request_id`, `user_type`, `email`, `status`, and `created_at` can be NULL depending on user type

