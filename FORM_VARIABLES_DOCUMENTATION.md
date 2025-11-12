# Form Variables Documentation - Search Result Page

## Overview
The search-result page has **4 different form variations** based on:
- **Document Status**: `active` or `old`
- **Requester Role**: `PUPian` (student/group) or `Guest` (non-PUP member)

---

## Form Structure

All forms follow a multi-step flow:
- **STEP 1**: Basic User Info (same for both roles)
- **STEP 2A**: PUP Member Details (PUPian only)
- **STEP 2B**: Non-PUP Member Details (Guest only)
- **STEP 3**: Request Details (conditional fields for old documents)
- **STEP 4**: Terms & Conditions (same for both)

---

## Form 1: Active Document + PUPian Requester

**Uses the simpler `dlgRequestAccessStudent` form (single dialog, not multi-step)**

| Variable Name | Type | Required | Description |
|--------------|------|----------|-------------|
| `currentUserEmail` | string | Yes | PUP email (read-only, pre-filled from authentication) |
| `studentProgram` | string | Yes | Program selection from dropdown (12 options: OPEN UNIVERSITY SYSTEM, COLLEGE OF ACCOUNTANCY AND FINANCE, etc.) |
| `studentDepartment` | string | Yes | Department selection (filtered based on selected program, uses `getFilteredDepartmentOptions()`) |
| `selectedRequestChapters` | Set<string> | Yes | Selected chapters from checkboxes: "Chapter 1", "Chapter 2", "Chapter 3", "Chapter 4", "Chapter 5", "All" (at least one required) |
| `requestPurpose` | string | Yes | Purpose of request (textarea, minimum 8 characters) |

**Note**: This form goes directly to Terms & Conditions (STEP 4) after submission, skipping the multi-step flow.

---

## Form 2: Active Document + Guest Requester

### STEP 1: Basic User Info
| Variable Name | Type | Required | Description |
|--------------|------|----------|-------------|
| `guestFullName` | string | Yes | Full name of the requester |
| `guestEmail` | string | Yes | Email address (pre-filled if logged in, must be valid email format) |
| `guestContactNumber` | string | Yes | Contact number (11 digits, pattern: `[0-9]{11}`) |

### STEP 2B: Non-PUP Member Details
| Variable Name | Type | Required | Description |
|--------------|------|----------|-------------|
| `affiliationCollege` | string | Yes | College or organization name (free text input) |
| `affiliationDepartment` | string | Yes | Department or office name (free text input) |
| `affiliationCountry` | string | Yes | Country selection from dropdown: "Philippines", "Japan", "USA", "Canada" |
| `affiliationRole` | string | Yes | Designation/role: "Student", "Professor", "Researcher", "Faculty Member", or "Others" |

### STEP 3: Request Details
| Variable Name | Type | Required | Description |
|--------------|------|----------|-------------|
| `paperType` | string | Yes | Type of paper: "Capstone" or "Thesis" |
| `selectedChapters` | Set<string> | Yes | Selected chapters from: "Chapter 1", "Chapter 2", "Chapter 3", "Chapter 4", "Chapter 5" (at least one required) |
| `requestPurpose` | string | Yes | Purpose of request: "Citation", "Referencing", "Review", "Replication", or "Others" |
| `requestRemarks` | string | Yes | Additional remarks/notes (textarea, required) |

### STEP 4: Terms & Conditions
| Variable Name | Type | Required | Description |
|--------------|------|----------|-------------|
| `termsAccepted` | boolean | Yes | Checkbox to accept terms and conditions |

---

## Form 3: Old Document + PUPian Requester

**Note**: The `dlgRequestAccessStudent` form does NOT currently include old document fields. This may need to be updated, or PUPian users requesting old documents may need to use the multi-step flow. For now, documenting the multi-step flow that would be needed:

### STEP 1: Basic User Info
| Variable Name | Type | Required | Description |
|--------------|------|----------|-------------|
| `guestFullName` | string | Yes | Full name of the requester |
| `guestEmail` | string | Yes | Email address (pre-filled if logged in, must be valid email format) |
| `guestContactNumber` | string | Yes | Contact number (11 digits, pattern: `[0-9]{11}`) |

### STEP 2A: PUP Member Details
| Variable Name | Type | Required | Description |
|--------------|------|----------|-------------|
| `selectedCollege` | string | Yes | Selected college from dropdown (e.g., "College of Computer and Information Sciences") |
| `selectedDepartment` | string | Yes | Selected department (filtered based on college) |
| `userRoleForm` | string | Yes | Role selection: "Student" or "Faculty" |
| `studentID` | string | Conditional | Required if `userRoleForm === 'Student'` |
| `facultyID` | string | Conditional | Required if `userRoleForm === 'Faculty'` |

### STEP 3: Request Details (with Old Document Fields)
| Variable Name | Type | Required | Description |
|--------------|------|----------|-------------|
| `paperType` | string | Yes | Type of paper: "Capstone" or "Thesis" |
| `selectedChapters` | Set<string> | Yes | Selected chapters from: "Chapter 1", "Chapter 2", "Chapter 3", "Chapter 4", "Chapter 5" (at least one required) |
| `requestPurpose` | string | Yes | Purpose of request: "Citation", "Referencing", "Review", "Replication", or "Others" |
| `requestRemarks` | string | Yes | Additional remarks/notes (textarea, required) |
| `oldDocumentJustification` | string | Yes | **OLD DOC ONLY**: Justification for requesting older document (minimum 20 characters) |
| `researchPurposeDetails` | string | Yes | **OLD DOC ONLY**: Detailed research purpose, methodology, and how document will be used (minimum 30 characters) |

### STEP 4: Terms & Conditions
| Variable Name | Type | Required | Description |
|--------------|------|----------|-------------|
| `termsAccepted` | boolean | Yes | Checkbox to accept terms and conditions |

---

## Form 4: Old Document + Guest Requester

### STEP 1: Basic User Info
| Variable Name | Type | Required | Description |
|--------------|------|----------|-------------|
| `guestFullName` | string | Yes | Full name of the requester |
| `guestEmail` | string | Yes | Email address (pre-filled if logged in, must be valid email format) |
| `guestContactNumber` | string | Yes | Contact number (11 digits, pattern: `[0-9]{11}`) |

### STEP 2B: Non-PUP Member Details
| Variable Name | Type | Required | Description |
|--------------|------|----------|-------------|
| `affiliationCollege` | string | Yes | College or organization name (free text input) |
| `affiliationDepartment` | string | Yes | Department or office name (free text input) |
| `affiliationCountry` | string | Yes | Country selection from dropdown: "Philippines", "Japan", "USA", "Canada" |
| `affiliationRole` | string | Yes | Designation/role: "Student", "Professor", "Researcher", "Faculty Member", or "Others" |

### STEP 3: Request Details (with Old Document Fields)
| Variable Name | Type | Required | Description |
|--------------|------|----------|-------------|
| `paperType` | string | Yes | Type of paper: "Capstone" or "Thesis" |
| `selectedChapters` | Set<string> | Yes | Selected chapters from: "Chapter 1", "Chapter 2", "Chapter 3", "Chapter 4", "Chapter 5" (at least one required) |
| `requestPurpose` | string | Yes | Purpose of request: "Citation", "Referencing", "Review", "Replication", or "Others" |
| `requestRemarks` | string | Yes | Additional remarks/notes (textarea, required) |
| `oldDocumentJustification` | string | Yes | **OLD DOC ONLY**: Justification for requesting older document (minimum 20 characters) |
| `researchPurposeDetails` | string | Yes | **OLD DOC ONLY**: Detailed research purpose, methodology, and how document will be used (minimum 30 characters) |

### STEP 4: Terms & Conditions
| Variable Name | Type | Required | Description |
|--------------|------|----------|-------------|
| `termsAccepted` | boolean | Yes | Checkbox to accept terms and conditions |

---

## Summary by Form Type

### Active Document Forms (Forms 1 & 2)
- **Form 1 (PUPian)**: 5 variables (uses simple `dlgRequestAccessStudent` form)
  - `currentUserEmail`, `studentProgram`, `studentDepartment`, `selectedRequestChapters`, `requestPurpose`
- **Form 2 (Guest)**: 11 variables (uses multi-step flow)
  - STEP 1: `guestFullName`, `guestEmail`, `guestContactNumber`
  - STEP 2B: `affiliationCollege`, `affiliationDepartment`, `affiliationCountry`, `affiliationRole`
  - STEP 3: `paperType`, `selectedChapters`, `requestPurpose`, `requestRemarks`
  - STEP 4: `termsAccepted`

### Old Document Forms (Forms 3 & 4)
- **Form 3 (PUPian)**: **Note**: The simple form doesn't include old document fields. May need multi-step flow or form update.
  - If using multi-step: 13 variables (includes 2 additional old document fields)
- **Form 4 (Guest)**: 13 variables (uses multi-step flow, includes 2 additional old document fields)
  - Additional Fields: `oldDocumentJustification`, `researchPurposeDetails`

---

## Backend Payload Structure

When submitted, the data is transformed into this structure:

```javascript
{
  document_id: string,
  userType: 'student' | 'guest',
  requester: {
    // For PUPian:
    email: string,
    fullName: string,
    contactNumber: string,
    college: string,
    department: string,
    role: 'Student' | 'Faculty',
    studentID?: string,  // if role is Student
    facultyID?: string   // if role is Faculty
    
    // For Guest:
    email: string,
    fullName: string,
    contactNumber: string,
    college: string,
    department: string,
    country: string,
    role: string
  },
  chaptersRequested: string[],
  paperType: string,
  purpose: string,
  remarks: string,
  oldDocumentJustification?: string,  // only if document_status === 'old'
  researchPurposeDetails?: string     // only if document_status === 'old'
}
```

---

## Notes

1. **PUPian Form Structure**: PUPian users (students/groups) use the simpler `dlgRequestAccessStudent` form for active documents, which is a single dialog with 5 fields. This form does NOT currently include old document fields, so there may be a gap for PUPian users requesting old documents.

2. **Form Routing**: The `openRequestDialog()` method currently always opens the guest multi-step flow (`dlgGuest`). If PUPian users should use the simpler form, the routing logic may need to be updated to check `userRole` and open `dlgStudent` for PUPian users.

3. **Validation Rules**:
   - `guestContactNumber`: Must be exactly 11 digits
   - `guestEmail`: Must be a valid email format
   - `oldDocumentJustification`: Minimum 20 characters
   - `researchPurposeDetails`: Minimum 30 characters
   - `requestPurpose`: Minimum 8 characters (for legacy student form)
   - At least one chapter must be selected

3. **Conditional Fields**:
   - `studentID` is only required when `userRoleForm === 'Student'`
   - `facultyID` is only required when `userRoleForm === 'Faculty'`
   - Old document fields (`oldDocumentJustification`, `researchPurposeDetails`) only appear when `thesis.document_status === 'old'`

