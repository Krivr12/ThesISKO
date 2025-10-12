# Panelist Approval Page - Implementation Summary

## 🎯 What Was Implemented

The panelist approval page now integrates with the real backend API to:
1. ✅ Display the uploaded manuscript filename beside "Subject: Thesis Manuscript"
2. ✅ Make the filename clickable to view the PDF
3. ✅ Provide a "Preview" button for viewing the manuscript
4. ✅ Call the real approval API endpoint when panelists approve

---

## 📝 Changes Made

### 1. **TypeScript Component** (`panelist-approval-page.ts`)

#### Added Services & Imports:
```typescript
import { S3Service } from '../../service/s3.service';
import { SubmissionService } from '../../service/submission.service';
import { environment } from '../../../environments/environment';
```

#### Updated Group Interface:
```typescript
interface Group {
  // ... existing fields
  milestones?: any[];
  manuscriptS3Key?: string;      // S3 key for the manuscript file
  manuscriptFileName?: string;   // Display name of the manuscript
}
```

#### Key Methods Updated:

**1. `ngOnInit()` - Now uses environment-based URL**
```typescript
this.submissionService.getGroupStatus(id).subscribe({...});
```

**2. `normalizeGroup()` - Extracts manuscript from milestones**
```typescript
const uploadManuscriptMilestone = it.milestones.find((m: any) => m.type === 'upload_manuscript');
if (uploadManuscriptMilestone && uploadManuscriptMilestone.s3_key) {
  manuscriptS3Key = uploadManuscriptMilestone.s3_key[0];
  manuscriptFileName = manuscriptS3Key.split('/').pop() || 'manuscript.pdf';
}
```

**3. `openFilePreview()` - Gets S3 signed URL for viewing**
```typescript
// Uses /s3/view-urls endpoint to get signed URL
this.http.post<any>(`${environment.authApiUrl}/s3/view-urls`, {
  group_id: groupId,
  filenames: [filename]
}).subscribe({...});
```

**4. `submitDecision()` - Calls real approval API**
```typescript
// Approve endpoint: PATCH /groups/{groupId}/milestones/upload_manuscript/approve
this.http.patch<any>(
  `${environment.authApiUrl}/groups/${this.group.group_id}/milestones/upload_manuscript/approve`,
  {
    panelist_id: panelistEmail,
    name: panelistName
  }
).subscribe({...});
```

---

### 2. **HTML Template** (`panelist-approval-page.html`)

#### Updated Subject Row:
```html
<div class="subject-row">
  <div class="subject-label"><b>Subject:</b> Thesis Manuscript</div>

  <div class="file-pill" *ngIf="g.manuscriptFileName">
    <mat-icon>attach_file</mat-icon>

    <!-- Clickable filename -->
    <a 
      style="cursor: pointer; color: #800000; text-decoration: underline;"
      (click)="openFilePreview(g.manuscriptS3Key, g.manuscriptFileName)">
      {{ g.manuscriptFileName }}
    </a>

    <!-- Preview button -->
    <button
      mat-stroked-button
      class="ml-8"
      (click)="openFilePreview(g.manuscriptS3Key, g.manuscriptFileName)">
      <mat-icon>visibility</mat-icon>
      Preview
    </button>
  </div>

  <!-- No file message -->
  <div *ngIf="!g.manuscriptFileName" style="color: #666; font-style: italic;">
    No manuscript uploaded yet.
  </div>
</div>
```

#### Updated PDF Dialog with Loading & Error States:
```html
<ng-template #pdfDialog let-dialogRef="dialogRef">
  <div class="viewer-header">
    <!-- Title and close button -->
  </div>

  <div class="viewer-body">
    <!-- Loading state -->
    <div *ngIf="pdfLoading">Loading document...</div>

    <!-- Error state -->
    <div *ngIf="pdfError && !pdfLoading">{{ pdfError }}</div>

    <!-- PDF iframe -->
    <iframe 
      *ngIf="!pdfLoading && !pdfError && previewSafeUrl" 
      [src]="previewSafeUrl"></iframe>
  </div>
</ng-template>
```

---

## 🔄 Workflow

### Viewing Manuscript:

1. **Page loads** → Fetches group data via `SubmissionService.getGroupStatus()`
2. **Extract manuscript** → Gets S3 key from `milestones.upload_manuscript.s3_key[0]`
3. **Display filename** → Shows filename beside "Subject: Thesis Manuscript"
4. **Click filename/preview** → Calls `/s3/view-urls` to get signed URL
5. **Show PDF** → Displays in iframe modal

### Approving Manuscript:

1. **Panelist clicks "Approve"** → Opens confirmation dialog
2. **Confirms approval** → Calls `submitDecision('Approved', ...)`
3. **API call** → `PATCH /groups/{groupId}/milestones/upload_manuscript/approve`
   - Body: `{ panelist_id: "email", name: "Panelist Name" }`
4. **Success** → Shows alert and navigates to faculty home
5. **Backend updates** → Group milestone status updated with panelist approval

---

## 🔗 API Endpoints Used

### 1. Get Group Status
**Method:** `GET`
**URL:** `/groups/{group_id}`
**Response:**
```json
{
  "group_id": "9999-TESTING-TEST_2",
  "milestones": [
    {
      "type": "upload_manuscript",
      "status": true,
      "s3_key": ["submission/9999-TESTING-TEST_2/manuscript.pdf"],
      "approved_by": [...]
    }
  ]
}
```

### 2. Get S3 Signed URL for Viewing
**Method:** `POST`
**URL:** `/s3/view-urls`
**Body:**
```json
{
  "group_id": "9999-TESTING-TEST_2",
  "filenames": ["manuscript.pdf"]
}
```
**Response:**
```json
{
  "urls": [
    {
      "key": "submission/9999-TESTING-TEST_2/manuscript.pdf",
      "signedUrl": "https://s3.amazonaws.com/..."
    }
  ]
}
```

### 3. Approve Manuscript
**Method:** `PATCH`
**URL:** `/groups/{group_id}/milestones/upload_manuscript/approve`
**Body:**
```json
{
  "panelist_id": "panelist@example.com",
  "name": "Dr. John Doe"
}
```
**Response:**
```json
{
  "message": "Panelist approval recorded"
}
```

---

## 🧪 Testing Instructions

### Test 1: View Manuscript
1. Login as a panelist
2. Navigate to a group's approval page
3. Verify filename appears beside "Subject: Thesis Manuscript"
4. Click the filename → PDF should open in modal
5. Click "Preview" button → Same PDF should open

### Test 2: Approve Manuscript
1. View a group's manuscript
2. Add comments/remarks (optional)
3. Click "Approve" button
4. Confirm approval in dialog
5. Verify success alert appears
6. Verify navigation to faculty home

### Test 3: Multiple Panelist Approvals
1. Have 3 different panelists approve the same manuscript
2. Verify each approval is recorded in the backend
3. Check group status shows all panelist approvals

---

## 📌 Important Notes

### Panelist Authentication
The current implementation gets panelist info from localStorage:
```typescript
const panelistEmail = localStorage.getItem('userEmail') || 'panelist@example.com';
const panelistName = localStorage.getItem('userName') || 'Panelist';
```

**⚠️ TODO:** Update this to use proper authentication service when available.

### Rejection Flow
Currently, rejection is not fully implemented:
```typescript
else if (decision === 'Rejected' || decision === 'For Revision') {
  alert('Rejection functionality coming soon...');
}
```

**⚠️ TODO:** Implement rejection API endpoint if needed.

### File Format
Only the **first file** in the `s3_key` array is displayed:
```typescript
manuscriptS3Key = uploadManuscriptMilestone.s3_key[0];
```

This is intentional since there should only be one manuscript file for the "upload_manuscript" milestone.

---

## 🎨 UI/UX Features

1. ✅ **Clickable filename** - Maroon color (#800000) with underline
2. ✅ **Preview button** - Material Design button with visibility icon
3. ✅ **Loading state** - Hourglass icon with "Loading document..." message
4. ✅ **Error state** - Error icon with error message
5. ✅ **No file state** - Italic gray text: "No manuscript uploaded yet."
6. ✅ **Modal viewer** - Full-width (90vw) modal for PDF viewing

---

## 🚀 Next Steps

1. **Faculty-in-Charge Approval**: Similar implementation for FIC after all panelists approve
2. **Chairperson Approval**: For steps 2-5 (copyright, turnitin, all docs)
3. **Real-time Status Updates**: WebSocket or polling to show approval progress
4. **Email Notifications**: Notify group leader when all panelists approve
5. **Rejection Workflow**: If rejection is needed, add API endpoint and UI

---

## ✅ Checklist

- [x] Display manuscript filename
- [x] Make filename clickable
- [x] Show preview button
- [x] Get S3 signed URL for viewing
- [x] Display PDF in modal
- [x] Handle loading state
- [x] Handle error state
- [x] Call approval API endpoint
- [x] Show success message
- [x] Navigate after approval
- [x] Use environment-based URLs
- [x] No linter errors

**Status: Complete! 🎉**

