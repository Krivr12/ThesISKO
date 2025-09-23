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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private http: HttpClient,
    private dialog: MatDialog,
     private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    const fromState = (history.state && history.state.group) ? history.state.group : null;
    if (fromState) {
      this.setGroup(this.normalizeGroup(fromState));
      return;
    }

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.http.get<any>('/groups.json').subscribe({
        next: (raw) => {
          const list: any[] = Array.isArray(raw) ? raw : (raw?.groups ?? []);
          const found = list.find(x => (x.group_id ?? x.groupId) === id);
          if (found) this.setGroup(this.normalizeGroup(found));
        },
        error: () => {
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
    const statusSrc = String(it.status ?? 'Ongoing');
    const normalizedStatus = (statusSrc[0]?.toUpperCase() ?? '') + statusSrc.slice(1).toLowerCase();

    return {
      group_id: it.group_id ?? it.groupId ?? '',
      block_id: it.block_id ?? it.blockId,
      course: it.course ?? it.parsedCourse ?? '',
      title: it.title ?? '',
      abstract: it.abstract ?? '',
      submitted_at: it.submitted_at ?? it.submission_date ?? '',
      leader: it.leader ?? '',
      members: it.members ?? [],
      leader_email: it.leader_email ?? it.leaderEmail ?? '',
      member_emails: it.member_emails ?? it.memberEmails ?? [],
      status: normalizedStatus,
      panelist: it.panelist ?? it.panelists ?? '',
      facultyid: it.facultyid ?? it.facultyId ?? '',
      fileName: it.fileName ?? it.filename,
      fileUrl: it.fileUrl ?? it.fileURL,
      fileSizeText: it.fileSizeText ?? it.sizeText,
      fileProgress: it.fileProgress ?? it.progress,
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

  /* ===== Submit (replace with your API) ===== */
  private submitDecision(
    decision: 'Approved' | 'Rejected' | 'For Revision',
    payload: { reasons?: string[]; remarks?: string }
  ) {
    console.log('DECISION:', decision, 'GROUP:', this.group, 'PAYLOAD:', payload);
    // TODO: call your backend here
    // Optionally: navigate back or show a toast/snackbar
  }

  openFilePreview(fileUrl: string, fileName?: string) {
    if (!fileUrl) return;
    this.previewTitle = 'Preview Document';
    this.previewFileName = fileName;
    this.previewSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(fileUrl);

    this.dialog.open(this.pdfDialog, {
      panelClass: 'file-viewer-dialog',
      width: '90vw',
      maxWidth: '95vw'
    });
  }
}
