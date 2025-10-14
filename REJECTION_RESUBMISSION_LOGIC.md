# Rejection and Resubmission Logic

## Overview

The ThesISKO system now supports manuscript rejection and resubmission with intelligent approval preservation. This ensures a smooth workflow where groups can address feedback without requiring panelists who already approved to re-approve.

---

## Key Features

### ✅ Rejection by Panelists
- **Endpoint:** `PATCH /groups/:groupId/milestones/upload_manuscript/panelist-reject`
- **Parameters:** `panelist_id`, `name`, `reason`
- **Behavior:**
  - Removes the panelist's previous approval (if any)
  - Adds a rejection record with reason
  - Marks milestone as incomplete (`status: false`)
  - **Preserves other panelists' approvals**
  - Group can resubmit without affecting other approvals

### ✅ Rejection by Faculty-in-Charge (FIC)
- **Endpoint:** `PATCH /groups/:groupId/milestones/upload_manuscript/faculty-reject`
- **Parameters:** `name`, `reason`
- **Behavior:**
  - Clears faculty approval
  - Adds rejection record with reason
  - Marks milestone as incomplete (`status: false`)
  - **Preserves all panelist approvals**
  - Group can resubmit without panelists re-approving

### ✅ Resubmission Flow
When a group resubmits after rejection:
1. **Upload new manuscript** (replaces old file in S3)
2. **Existing panelist approvals remain intact**
3. **Only the rejecting party needs to re-approve:**
   - If panelist rejected → only that panelist needs to approve again
   - If FIC rejected → only FIC needs to approve again
4. **Other approvals carry forward automatically**

---

## Data Structure

### Milestone Schema (upload_manuscript)
```javascript
{
  type: "upload_manuscript",
  status: boolean,              // false when rejected, allows resubmission
  s3_key: ["path/to/file.pdf"], // Updated on resubmission
  
  // Panelist approvals (preserved during rejection/resubmission)
  approved_by: [
    {
      panelist_id: "email@example.com",
      name: "Dr. Smith",
      approved_at: ISODate("...")
    }
  ],
  
  // Panelist rejections (tracked separately)
  rejected_by: [
    {
      panelist_id: "email@example.com",
      name: "Dr. Jones",
      reason: "Missing methodology section",
      rejected_at: ISODate("...")
    }
  ],
  
  // Faculty verification
  verified: {
    faculty_in_charge: {
      approved: boolean,
      approved_at: ISODate("..."),
      approved_by: "Dr. Faculty",
      
      // Rejection fields (cleared on approval)
      rejected: boolean,
      rejection_reason: "Need more references",
      rejected_by: "Dr. Faculty",
      rejected_at: ISODate("...")
    }
  }
}
```

---

## Workflow Examples

### Example 1: Panelist Rejects, Then Group Resubmits

**Initial State:**
- Panelist 1: ✅ Approved
- Panelist 2: ✅ Approved
- Panelist 3: ❌ Rejects (reason: "Missing figures")

**After Rejection:**
```javascript
{
  status: false,  // Can resubmit
  approved_by: [
    { panelist_id: "panelist1@example.com", name: "Dr. A", ... },
    { panelist_id: "panelist2@example.com", name: "Dr. B", ... }
  ],  // Preserved!
  rejected_by: [
    { panelist_id: "panelist3@example.com", name: "Dr. C", reason: "Missing figures", ... }
  ]
}
```

**Group Resubmits:**
1. Upload new manuscript with figures added
2. **Panelist 1 & 2 approvals still count** ✅
3. **Only Panelist 3 needs to review again**

**Final Approval:**
- Once Panelist 3 approves + FIC approves → Milestone complete!

---

### Example 2: FIC Rejects After All Panelists Approved

**Initial State:**
- Panelist 1: ✅ Approved
- Panelist 2: ✅ Approved  
- Panelist 3: ✅ Approved
- FIC: ❌ Rejects (reason: "Formatting issues")

**After Rejection:**
```javascript
{
  status: false,  // Can resubmit
  approved_by: [
    { panelist_id: "panelist1@example.com", ... },
    { panelist_id: "panelist2@example.com", ... },
    { panelist_id: "panelist3@example.com", ... }
  ],  // All preserved!
  verified: {
    faculty_in_charge: {
      approved: false,
      rejected: true,
      rejection_reason: "Formatting issues",
      ...
    }
  }
}
```

**Group Resubmits:**
1. Fix formatting and upload new manuscript
2. **All 3 panelist approvals still count** ✅
3. **Only FIC needs to approve again**

**Final Approval:**
- FIC reviews and approves → Milestone complete!

---

## Implementation Details

### Backend Routes

#### 1. Panelist Rejection
```javascript
router.patch("/:groupId/milestones/upload_manuscript/panelist-reject", async (req, res) => {
  // 1. Remove panelist's previous approval (if exists)
  await groupsCollection.updateOne(
    { group_id: groupId, "milestones.type": "upload_manuscript" },
    { $pull: { "milestones.$.approved_by": { panelist_id } } }
  );
  
  // 2. Add rejection record
  await groupsCollection.updateOne(
    { group_id: groupId, "milestones.type": "upload_manuscript" },
    {
      $push: { "milestones.$.rejected_by": { panelist_id, name, reason, rejected_at } },
      $set: { "milestones.$.status": false }  // Allow resubmission
    }
  );
});
```

#### 2. FIC Rejection
```javascript
router.patch("/:groupId/milestones/upload_manuscript/faculty-reject", async (req, res) => {
  // Clear faculty approval + add rejection (but preserve approved_by array)
  await groupsCollection.updateOne(
    { group_id: groupId, "milestones.type": "upload_manuscript" },
    {
      $set: {
        "milestones.$.status": false,  // Allow resubmission
        "milestones.$.verified.faculty_in_charge.approved": false,
        "milestones.$.verified.faculty_in_charge.rejected": true,
        "milestones.$.verified.faculty_in_charge.rejection_reason": reason,
        ...
      }
      // NOTE: We do NOT clear "milestones.$.approved_by" array!
    }
  );
});
```

#### 3. Approval Clears Rejection
When approving (either panelist or FIC), rejection flags are cleared:
```javascript
$set: {
  "milestones.$.verified.faculty_in_charge.approved": true,
  "milestones.$.verified.faculty_in_charge.rejected": false,  // Clear rejection
  ...
},
$unset: {
  "milestones.$.verified.faculty_in_charge.rejection_reason": "",
  "milestones.$.verified.faculty_in_charge.rejected_by": "",
  "milestones.$.verified.faculty_in_charge.rejected_at": ""
}
```

---

## Frontend Implementation

### FIC History Page
```typescript
rejectManuscript(): void {
  const reason = prompt('Please provide a reason for rejection:');
  
  if (!reason || !confirm('Are you sure?')) return;
  
  const payload = { name: this.currentUserName, reason: reason.trim() };
  
  this.http.patch(
    `${environment.authApiUrl}/groups/${this.groupId}/milestones/upload_manuscript/faculty-reject`,
    payload
  ).subscribe({
    next: () => {
      alert('✅ Manuscript rejected! Group can resubmit. Panelist approvals preserved.');
      this.bootstrapData();
    },
    error: (error) => alert(`❌ Failed: ${error.error?.error}`)
  });
}
```

### Student Submission Page
- When `milestone.status === false` (rejected), show upload interface again
- Display rejection reason if available
- Previous file is replaced on resubmission
- Approval progress (e.g., "2/3 panelists approved") carries forward

---

## Testing Scenarios

### ✅ Test 1: Single Panelist Rejects
1. 3 panelists approve manuscript
2. 1 panelist rejects with reason
3. Verify: Other 2 approvals preserved
4. Group resubmits
5. Verify: Still shows 2/3 approved, only rejecting panelist needs to re-approve

### ✅ Test 2: FIC Rejects After Panelist Approval
1. All panelists approve
2. FIC rejects with reason
3. Verify: All panelist approvals preserved
4. Group resubmits
5. Verify: Panelist approvals intact, only FIC needs to approve

### ✅ Test 3: Multiple Rejections & Resubmissions
1. Panelist A rejects → Group resubmits → Panelist A approves
2. FIC rejects → Group resubmits → FIC approves
3. Verify: All approvals tracked correctly throughout

### ✅ Test 4: Rejection Reason Display
1. Reject manuscript with reason "Missing abstract"
2. Verify: Student sees rejection reason in submission UI
3. Verify: Rejection reason appears in faculty dashboard

---

## Benefits

1. **Efficiency:** Panelists don't waste time re-reviewing unchanged sections
2. **Transparency:** Clear rejection reasons help students understand what to fix
3. **Flexibility:** System handles multiple rejection/resubmission cycles
4. **Fairness:** Approvals earned once are preserved
5. **Audit Trail:** All rejections tracked with reasons and timestamps

---

## Future Enhancements

- [ ] Email notifications on rejection with reason
- [ ] Rejection analytics (most common reasons)
- [ ] Bulk rejection by multiple panelists simultaneously
- [ ] Rejection history view in student dashboard
- [ ] Chairperson rejection for stages 2-5
- [ ] Dean rejection for stage 6

---

## API Reference

### Panelist Rejection
**Endpoint:** `PATCH /groups/:groupId/milestones/upload_manuscript/panelist-reject`

**Request Body:**
```json
{
  "panelist_id": "panelist@example.com",
  "name": "Dr. Panelist Name",
  "reason": "Missing methodology section"
}
```

**Response (Success):**
```json
{
  "message": "Panelist rejection recorded. Group can resubmit.",
  "reason": "Missing methodology section"
}
```

---

### Faculty Rejection
**Endpoint:** `PATCH /groups/:groupId/milestones/upload_manuscript/faculty-reject`

**Request Body:**
```json
{
  "name": "Dr. Faculty Name",
  "reason": "Formatting issues need to be addressed"
}
```

**Response (Success):**
```json
{
  "message": "Manuscript rejected. Group can resubmit. Panelist approvals preserved.",
  "reason": "Formatting issues need to be addressed"
}
```

---

## Summary

✅ **Rejection implemented for panelists and FIC**  
✅ **Resubmission allowed after rejection**  
✅ **Existing approvals preserved during resubmission**  
✅ **Clear audit trail with rejection reasons**  
✅ **Frontend UI updated to use rejection endpoints**

The system now provides a complete, efficient workflow for manuscript review with intelligent approval management! 🎉

