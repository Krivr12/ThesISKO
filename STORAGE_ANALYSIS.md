# Data Storage Analysis - MongoDB vs PostgreSQL Table

## Current Redundancy Issues

### Currently Stored in BOTH MongoDB and Table (REDUNDANT):
1. `email` - stored in both
2. `program` - stored in both
3. `department` - stored in both
4. `role` - stored in both
5. `full_name` / `fullName` - stored in both
6. `city` - stored in both
7. `country` - stored in both
8. `school` - stored in both
9. `status` - stored in both
10. `createdAt` / `created_at` - stored in both
11. `updatedAt` / `updated_at` - stored in both

---

## What SHOULD Be Stored Where

### PostgreSQL Table (`requesters_analytics`) - Structured Data Only

| Field | Type | Description |
|-------|------|-------------|
| `id` | SERIAL | Primary key |
| `request_id` | VARCHAR(255) | Foreign key to MongoDB `_id` |
| `user_type` | VARCHAR(50) | 'student' or 'guest' |
| `email` | VARCHAR(255) | Requester email |
| `status` | VARCHAR(50) | 'pending', 'approved', 'rejected' |
| `created_at` | TIMESTAMP | Request creation time |
| `updated_at` | TIMESTAMP | Last update time |
| `program` | VARCHAR(255) | Program/College name |
| `department` | VARCHAR(255) | Department name |
| `role` | VARCHAR(50) | 'Student' or 'Faculty' |
| `full_name` | VARCHAR(255) | Guest full name (NULL for PUPian) |
| `city` | VARCHAR(255) | Guest city (NULL for PUPian) |
| `country` | VARCHAR(255) | Guest country (NULL for PUPian) |
| `school` | VARCHAR(255) | University/Organization (NULL for PUPian) |

**Total: 14 fields**

---

### MongoDB (`requests` collection) - Long Text & Arrays Only

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Primary key (becomes `request_id` in table) |
| `document_id` | String | ID of the requested document |
| `purpose` | String | Purpose of request (long text, min 24-50 chars) |
| `intendedUse` | String | Intended use of information (long text, min 24 chars) - Old docs only |
| `howDidYouLearn` | String | How did you learn about document (long text, optional) - Old docs only |
| `chaptersRequested` | Array[String] | Selected chapters array |

**Total: 5-6 fields** (depending on document type)

---

## Fields That Should Be REMOVED from MongoDB

These are currently in MongoDB but should be REMOVED (they're redundant with table):

1. ❌ `userType` - Already in table as `user_type`
2. ❌ `requester.email` - Already in table as `email`
3. ❌ `requester.program` - Already in table as `program`
4. ❌ `requester.department` - Already in table as `department`
5. ❌ `requester.role` - Already in table as `role`
6. ❌ `requester.fullName` - Already in table as `full_name`
7. ❌ `requester.city` - Already in table as `city`
8. ❌ `requester.country` - Already in table as `country`
9. ❌ `requester.school` - Already in table as `school`
10. ❌ `requester.supervisor` - Should this be in table? (Optional field)
11. ❌ `status` - Already in table as `status`
12. ❌ `createdAt` - Already in table as `created_at`
13. ❌ `updatedAt` - Already in table as `updated_at`
14. ❌ `consentToContact` - Boolean, not long text (should this be in table?)
15. ❌ `preferredContactMethod` - Short string, not long text (should this be in table?)

---

## Final Storage Structure

### PostgreSQL Table (`requesters_analytics`)
**Stores: All structured requester data for analytics**

```sql
- id
- request_id (FK to MongoDB)
- user_type
- email
- status
- created_at
- updated_at
- program
- department
- role
- full_name
- city
- country
- school
```

### MongoDB (`requests`)
**Stores: Only long texts and arrays**

```javascript
{
  _id: ObjectId,                    // Primary key
  document_id: String,              // Which document was requested
  purpose: String,                  // Long text
  intendedUse: String,              // Long text (old docs only)
  howDidYouLearn: String,           // Long text, optional (old docs only)
  chaptersRequested: [String]       // Array
}
```

---

## Questions to Clarify

1. **`supervisor`** (optional field for old documents):
   - Short text field (not long text)
   - Should it be in the table or MongoDB?

2. **`consentToContact`** (boolean):
   - Not long text
   - Should it be in the table for analytics?

3. **`preferredContactMethod`** (short string: 'Email' or 'Phone'):
   - Not long text
   - Should it be in the table for analytics?

4. **`document_id`**:
   - Needed in MongoDB to know which document was requested
   - Should it also be in the table for easier querying?

---

## Summary

**MongoDB should ONLY contain:**
- `_id` (for linking)
- `document_id` (to identify requested document)
- `purpose` (long text)
- `intendedUse` (long text, old docs)
- `howDidYouLearn` (long text, old docs)
- `chaptersRequested` (array)

**Table should contain:**
- All structured requester information
- All fields needed for analytics
- No long text fields
- No arrays





