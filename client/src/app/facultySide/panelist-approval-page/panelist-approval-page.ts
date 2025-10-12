import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

/* Angular Material */
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { Sidenavbar } from '../sidenavbar/sidenavbar';
import { parseGroupId } from '../../shared/utils/group-id';
import { S3Service } from '../../service/s3.service';
import { SubmissionService } from '../../service/submission.service';
import { environment } from '../../../environments/environment';

interface Group {
  group_id: string;
  block_id?: string;
  course: string;
  title: string;
  abstract?: string;
  submitted_at: string;
  leader: string;
  members: string[];
  leader_email: string;
  member_emails: string[];
  status: string;
  panelist?: string;
  facultyid?: string;
  fileName?: string;
  fileUrl?: string;
  fileSizeText?: string;
  fileProgress?: number;
  milestones?: any[];
  manuscriptS3Key?: string;  // S3 key for the manuscript file
  manuscriptFileName?: string; // Display name of the manuscript
}

interface GroupVM extends Group {
  schoolYear: string;
  parsedCourse: string;
  year: string;
  section: string;
  groupNo: string;
}

@Component({
  selector: 'app-panelist-approval-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    HttpClientModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    MatCheckboxModule,
    Sidenavbar,
  ],
  templateUrl: './panelist-approval-page.html',
  styleUrls: ['./panelist-approval-page.css'],
})
export class PanelistApprovalPage implements OnInit {
  group: Group | null = null;
  groupVM: GroupVM | null = null;
  remarks = '';

  // Dialog template refs
  @ViewChild('dlgApprove') dlgApproveTpl!: TemplateRef<any>;
  @ViewChild('dlgRevision') dlgRevisionTpl!: TemplateRef<any>;
  @ViewChild('pdfDialog') pdfDialog!: TemplateRef<any>;

  previewTitle = 'Preview Document';
  previewFileName?: string;
  previewSafeUrl!: SafeResourceUrl;

  // “For Revision” dialog state (used by Reject button)
  revisionOptions: string[] = [
    'Plagiarism and Copyright Violations',
    'Incomplete Research',
    'Technical Problems',
    'Incorrect Submission',
    'Others (See comment)',
  ];
  selectedRevisionReasons = new Set<string>();
  revisionComment = '';

  // Loading states
  pdfLoading = false;
  pdfError = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private http: HttpClient,
    private dialog: MatDialog,
    private sanitizer: DomSanitizer,
    private s3Service: S3Service,
    private submissionService: SubmissionService
  ) {}

  ngOnInit(): void {
    const fromState = (history.state && history.state.group) ? history.state.group : null;
    if (fromState) {
      this.setGroup(this.normalizeGroup(fromState));
      return;
    }

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      console.log('👥 Fetching group data for panelist approval:', id);
      
      // Fetch group from MongoDB API using environment URL
      this.submissionService.getGroupStatus(id).subscribe({
        next: (response) => {
          console.log('✅ Group response:', response);
          if (response) {
            this.setGroup(this.normalizeGroup(response));
          }
        },
        error: (err) => {
          console.error('❌ Error fetching group:', err);
          // swallow; empty state will show
        }
      });
    }
  }

  private setGroup(raw: Group) {
    this.group = raw;
    try {
      const p = parseGroupId(raw.group_id);
      this.groupVM = {
        ...raw,
        schoolYear: p.schoolYear,
        parsedCourse: p.course,
        year: p.year,
        section: p.section,
        groupNo: p.groupNo,
      };
    } catch {
      this.groupVM = {
        ...raw,
        schoolYear: '',
        parsedCourse: raw.course,
        year: '',
        section: '',
        groupNo: '',
      };
    }
  }

  private normalizeGroup(it: any): Group {
    // Handle MongoDB format where leader is an object
    let leaderName = '';
    let leaderEmail = '';
    if (typeof it.leader === 'object' && it.leader !== null) {
      leaderName = `${it.leader.firstname || ''} ${it.leader.surname || ''}`.trim();
      leaderEmail = it.leader.email || '';
    } else {
      leaderName = it.leader || '';
      leaderEmail = it.leader_email || it.leaderEmail || '';
    }

    // Handle MongoDB format where members is an array of objects
    let memberNames: string[] = [];
    let memberEmails: string[] = [];
    if (Array.isArray(it.members) && it.members.length > 0 && typeof it.members[0] === 'object') {
      memberNames = it.members.map((m: any) => `${m.firstname || ''} ${m.surname || ''}`.trim());
      memberEmails = it.members.map((m: any) => m.email || '');
    } else {
      memberNames = it.members || [];
      memberEmails = it.member_emails || it.memberEmails || [];
    }

    // Extract manuscript file info from milestones
    let manuscriptS3Key = '';
    let manuscriptFileName = '';
    if (Array.isArray(it.milestones)) {
      const uploadManuscriptMilestone = it.milestones.find((m: any) => m.type === 'upload_manuscript');
      if (uploadManuscriptMilestone && uploadManuscriptMilestone.s3_key && uploadManuscriptMilestone.s3_key.length > 0) {
        manuscriptS3Key = uploadManuscriptMilestone.s3_key[0]; // Get first file
        // Extract filename from S3 key (format: submission/{group_id}/{filename})
        manuscriptFileName = manuscriptS3Key.split('/').pop() || 'manuscript.pdf';
      }
    }

    // Map MongoDB 'progress' field to 'status'
    const statusSrc = String(it.progress ?? it.status ?? 'Ongoing');
    const progressMap: Record<string, string> = {
      'not_started': 'Ongoing',
      'ongoing': 'Ongoing',
      'completed': 'Approved',
      'rejected': 'Rejected'
    };
    const mappedStatus = progressMap[statusSrc] || statusSrc;
    const normalizedStatus = (mappedStatus[0]?.toUpperCase() ?? '') + mappedStatus.slice(1).toLowerCase();

    return {
      group_id: it.group_id ?? it.groupId ?? '',
      block_id: it.block_id ?? it.blockId,
      course: it.course ?? it.parsedCourse ?? '',
      title: it.title ?? '',
      abstract: it.abstract ?? '',
      submitted_at: it.created_at ?? it.submitted_at ?? it.submission_date ?? '',
      leader: leaderName,
      members: memberNames,
      leader_email: leaderEmail,
      member_emails: memberEmails,
      status: normalizedStatus,
      panelist: it.panelist ?? it.panelists ?? '',
      facultyid: it.facultyid ?? it.facultyId ?? '',
      fileName: it.fileName ?? it.filename,
      fileUrl: it.fileUrl ?? it.fileURL,
      fileSizeText: it.fileSizeText ?? it.sizeText,
      fileProgress: it.fileProgress ?? it.progress,
      milestones: it.milestones,
      manuscriptS3Key,
      manuscriptFileName,
    };
  }

  goBack(): void { this.location.back(); }

  /* ===== Dialog Openers ===== */
  openApproveDialog() {
    const ref = this.dialog.open(this.dlgApproveTpl);
    ref.afterClosed().subscribe(ok => {
      if (ok) this.submitDecision('Approved', { remarks: this.remarks?.trim() || '' });
    });
  }

  // Reject now uses the "For Revision" flow (reasons + comment)
  openRejectDialog() {
    this.openRevisionDialog();
  }

  private openRevisionDialog() {
    this.resetRevisionDialog(); // fresh state each time
    const ref = this.dialog.open(this.dlgRevisionTpl, { width: '640px' });
    ref.afterClosed().subscribe(result => {
      if (!result) return; // cancelled
      // Even though button says "Reject", per requirement we mark as "For Revision"
      this.submitDecision('For Revision', result);
    });
  }

  /* ===== For Revision helpers ===== */
  toggleRevisionReason(reason: string, checked: boolean) {
    if (checked) this.selectedRevisionReasons.add(reason);
    else this.selectedRevisionReasons.delete(reason);
  }

  resetRevisionDialog() {
    this.selectedRevisionReasons.clear();
    this.revisionComment = '';
  }

  confirmRevision(ref: MatDialogRef<any>) {
    const payload = {
      reasons: Array.from(this.selectedRevisionReasons),
      remarks: [this.remarks?.trim(), this.revisionComment?.trim()].filter(Boolean).join('\n\n'),
    };
    ref.close(payload);
  }

  /* ===== Submit (calls real API) ===== */
  private submitDecision(
    decision: 'Approved' | 'Rejected' | 'For Revision',
    payload: { reasons?: string[]; remarks?: string }
  ) {
    console.log('DECISION:', decision, 'GROUP:', this.group, 'PAYLOAD:', payload);
    
    if (!this.group?.group_id) {
      alert('Group ID not found');
      return;
    }

    if (decision === 'Approved') {
      // Call approve API endpoint
      // Get panelist info from localStorage or auth service
      const panelistEmail = localStorage.getItem('userEmail') || 'panelist@example.com';
      const panelistName = localStorage.getItem('userName') || 'Panelist';

      this.http.patch<any>(
        `${environment.authApiUrl}/groups/${this.group.group_id}/milestones/upload_manuscript/approve`,
        {
          panelist_id: panelistEmail,
          name: panelistName
        }
      ).subscribe({
        next: (response) => {
          console.log('✅ Approval recorded:', response);
          alert('Manuscript approved successfully!');
          this.router.navigate(['/faculty-home']); // Navigate back to faculty home
        },
        error: (error) => {
          console.error('❌ Error recording approval:', error);
          alert('Failed to record approval. Please try again.');
        }
      });
    } else if (decision === 'Rejected' || decision === 'For Revision') {
      // For rejection, we can add a comment/remark
      // Currently the API doesn't have a reject endpoint for panelists,
      // so we'll just show a message
      alert('Rejection functionality coming soon. For now, please contact the group leader directly.');
      console.log('Rejection payload:', payload);
    }
  }

  /**
   * Open file preview for manuscript using S3 signed URL
   * @param s3Key - S3 key for the file (e.g., "submission/9999-TESTING-TEST_2/manuscript.pdf")
   * @param fileName - Display name for the file
   */
  openFilePreview(s3Key?: string, fileName?: string) {
    if (!s3Key) {
      alert('No manuscript file available for preview.');
      return;
    }

    this.previewTitle = 'Preview Manuscript';
    this.previewFileName = fileName || 'manuscript.pdf';
    this.pdfLoading = true;
    this.pdfError = '';
    this.previewSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl('');

    // Get signed URL for submission file (uses view-urls endpoint)
    const groupId = this.group?.group_id;
    if (!groupId) {
      this.pdfError = 'Group ID not found';
      this.pdfLoading = false;
      return;
    }

    // Extract filename from S3 key
    const filename = s3Key.split('/').pop() || '';
    
    // Get signed URL using view-urls endpoint
    this.http.post<any>(`${environment.authApiUrl}/s3/view-urls`, {
      group_id: groupId,
      filenames: [filename]
    }).subscribe({
      next: (response) => {
        if (response.urls && response.urls.length > 0) {
          this.previewSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(response.urls[0].signedUrl);
          this.pdfLoading = false;
        } else {
          this.pdfError = 'Failed to generate signed URL';
          this.pdfLoading = false;
        }
      },
      error: (error) => {
        console.error('Error getting signed URL:', error);
        this.pdfError = 'Failed to load document. Please try again.';
        this.pdfLoading = false;
      }
    });

    this.dialog.open(this.pdfDialog, {
      panelClass: 'file-viewer-dialog',
      width: '90vw',
      maxWidth: '95vw'
    });
  }
}