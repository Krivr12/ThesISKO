import {
  Component, OnInit, ViewChild, AfterViewInit, TemplateRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

/* Angular Material (standalone) */
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { AdminSideBar } from '../admin-side-bar/admin-side-bar';

interface RequestItem {
  id?: string;              // Primary key from database (UUID)
  request_id?: string;       // Request ID from database
  user_type?: string;        // "student" | "faculty" etc
  email: string;
  department?: string;       // "CCIS" etc
  program?: string;          // "BSIT" etc
  country?: string;
  city?: string;
  school?: string;
  status?: string;           // "pending" | "approved" | "rejected"
  created_at?: string;       // Database timestamp
  updated_at?: string;       // Database timestamp
  
  // Legacy fields for compatibility with existing UI
  requestor_name?: string;
  date?: string;             // "YYYY-MM-DD"
  time?: string;             // "HH:mm"
  selected_chapter?: string; // "1" | "2" | "3" | "4" | "5" | "all"
  purpose?: string;
  title?: string;

  // Enriched fields from groups.json
  group_id?: string;
  block_id?: string;
  course?: string;
  abstract?: string;
  leader?: string;
  members?: string[];
  leader_email?: string;
  member_emails?: string[];
  panelist?: string;
  facultyid?: string;
  faculty_in_charge?: string;
  file_type?: string;

  // Optional date-ish fields
  publication_date?: string;
  date_published?: string;
  pub_date?: string;

  // Optional PDF fields (any one of these can be present)
  pdfLink?: string; pdf_link?: string; pdfUrl?: string; pdf_url?: string;
  fileURL?: string; file_url?: string; pdf?: string;
}

/** Shape expected from groups.json */
interface GroupEntry {
  group_id?: string;
  block_id?: string;
  course?: string;
  program?: string;
  status?: string;
  title: string;
  abstract?: string;
  leader?: string;
  members?: string[];
  leader_email?: string;
  member_emails?: string[];
  panelist?: string;
  facultyid?: string;
  faculty_in_charge?: string;
  file_type?: string;

  publication_date?: string;
  date_published?: string;
  pub_date?: string;

  pdfLink?: string; pdf_link?: string; pdfUrl?: string; pdf_url?: string;
  fileURL?: string; file_url?: string; pdf?: string;
}

@Component({
  selector: 'app-admin-request',
  standalone: true,
  imports: [
    AdminSideBar, CommonModule, RouterModule, HttpClientModule,
    MatSidenavModule, MatToolbarModule, MatButtonModule, MatIconModule,
    MatTableModule, MatPaginatorModule, MatSortModule, MatInputModule,
    MatDialogModule, MatFormFieldModule, FormsModule,
  ],
  templateUrl: './admin-request.html',
  styleUrl: './admin-request.css'
})
export class AdminRequest implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['email', 'department', 'program', 'status', 'created_at', 'actions'];
  dataSource = new MatTableDataSource<RequestItem>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('verifyDialog') verifyTpl!: TemplateRef<any>;
  @ViewChild('confirmDialog') confirmTpl!: TemplateRef<any>;

  verifyNote = '';

  /** Cached groups + title index for fast lookup */
  private groups: GroupEntry[] = [];
  private titleIndex = new Map<string, GroupEntry[]>(); // normalizedTitle -> entries[]

  constructor(
    private http: HttpClient,
    private router: Router,
    private sanitizer: DomSanitizer,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    // Load requests from JSON file
    this.loadRequestData();

    // Load groups once, then index by normalized title
    this.http.get<GroupEntry[]>('groups.json').subscribe({
      next: (rows) => {
        this.groups = rows ?? [];
        this.buildTitleIndex(this.groups);
      },
      error: () => {
        this.groups = [];
        this.titleIndex.clear();
      }
    });

    // Case-insensitive filter across a few fields
    this.dataSource.filterPredicate = (d, f) => (
      [d.requestor_name, d.purpose, d.title, d.selected_chapter, d.date, d.time]
        .filter(Boolean).join(' ').toLowerCase()
    ).includes((f || '').toLowerCase());
  }

  private loadRequestData(): void {
    // Load requests from JSON file
    this.http.get<RequestItem[]>('requestsample.json').subscribe({
      next: rows => {
        this.dataSource.data = rows ?? [];
        console.log('Request data loaded from JSON:', rows);
      },
      error: (error) => {
        console.error('Error loading request data:', error);
        this.dataSource.data = [];
      }
    });
  }


  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  goBack(): void {
    this.router.navigate(['/admin-dashboard']);
  }

  formatChapters(sel: string): string {
    if (!sel) return '—';
    return sel === 'all' ? 'All Chapters' : `Chapter ${sel}`;
  }

  formatDate(dateString: string): string {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch {
      return dateString;
    }
  }

  /** CLICK: Open Request dialog */
  openVerifyDialog(row: RequestItem): void {
    this.verifyNote = '';

    // 1) Enrich the request row with metadata from groups.json by title (+ requestor heuristic)
    const enriched = this.mergeWithBestGroup(row);

    // 2) Build PDF info for dialog
    const pdf = this.buildPdfData(enriched);

    // 3) Open dialog with merged data
    this.dialog.open(this.verifyTpl, {
      panelClass: 'thesisko-dialog',
      width: 'min(1100px, 96vw)',
      maxWidth: '96vw',
      maxHeight: '90vh',
      autoFocus: false,
      restoreFocus: false,
      data: { row: enriched, ...pdf }
    }).afterClosed().subscribe(() => {});
  }
  approveRequest(row: RequestItem): void {
    // Update UI only (no database connection)
    console.log('Request approved:', row);
    this.removeRow(row);
    this.dialog.closeAll();
  }
  
  rejectRequest(row: RequestItem): void {
    // Update UI only (no database connection)
    console.log('Request rejected:', row);
    this.removeRow(row);
    this.dialog.closeAll();
  }
  
  /** Tanggalin ang row sa table (by id kung meron; otherwise by shallow compare/fingerprint) */
  private removeRow(target: RequestItem): void {
    const hasId = !!(target.id || target.request_id);
    const key = (r: RequestItem) =>
      (r.id ?? r.request_id ?? `${r.requestor_name}||${r.email}||${r.title}||${r.date} ${r.time}||${r.selected_chapter}`);
  
    const newData = this.dataSource.data.filter(r => key(r) !== key(target));
    this.dataSource.data = newData;           // re-assign triggers table update
    // (optional) this.dataSource._updateChangeSubscription(); // usually not needed if reassigning
  }

  confirmApprove(row: RequestItem): void {
    this.dialog.open(this.confirmTpl, {
      panelClass: 'thesisko-dialog',
      data: {
        title: 'Approve Request',
        message: 'Are you sure you want to approve this request?',
        okText: 'Approve',
        kind: 'approve'
      }
    }).afterClosed().subscribe((ok: boolean) => {
      if (ok) this.approveRequest(row);
    });
  }
  
  confirmReject(row: RequestItem): void {
    this.dialog.open(this.confirmTpl, {
      panelClass: 'thesisko-dialog',
      data: {
        title: 'Reject Request',
        message: 'Are you sure you want to reject this request?',
        okText: 'Reject',
        kind: 'reject'
      }
    }).afterClosed().subscribe((ok: boolean) => {
      if (ok) this.rejectRequest(row);
    });
  }
  /** ===================== Helpers ===================== */

  /** Build a normalized, loose key for matching titles */
  private normTitle(s: string | undefined | null): string {
    if (!s) return '';
    return s
      .toLowerCase()
      .replace(/[\s\-_]+/g, ' ')
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .trim();
  }

  /** Build index: normalizedTitle -> [GroupEntry, ...] */
  private buildTitleIndex(groups: GroupEntry[]) {
    this.titleIndex.clear();
    for (const g of groups) {
      const key = this.normTitle(g.title);
      if (!key) continue;
      const bucket = this.titleIndex.get(key);
      if (bucket) bucket.push(g);
      else this.titleIndex.set(key, [g]);
    }
  }

  /** Choose the best group by (1) exact title, then (2) requestor involvement */
  private pickBestCandidate(title: string, reqName?: string, reqEmail?: string): GroupEntry | undefined {
    const key = this.normTitle(title);
    const candidates = (key && this.titleIndex.get(key)) ? [...this.titleIndex.get(key)!] : [];

    if (!candidates.length) {
      // loose fallback: contains
      const all = this.groups.filter(g => this.normTitle(g.title).includes(key));
      candidates.push(...all);
    }
    if (!candidates.length) return undefined;

    // If only one, done
    if (candidates.length === 1) return candidates[0];

    // Score by involvement of requestor (name/email) in leader/members/panelist/faculty
    const nReqName = (reqName || '').toLowerCase().trim();
    const nReqEmail = (reqEmail || '').toLowerCase().trim();

    const score = (g: GroupEntry): number => {
      let s = 0;

      const inStr = (hay?: string) =>
        !!hay && nReqName && hay.toLowerCase().includes(nReqName);

      const eqEmail = (hay?: string) =>
        !!hay && nReqEmail && hay.toLowerCase() === nReqEmail;

      // Leader name / email
      if (inStr(g.leader)) s += 5;
      if (eqEmail(g.leader_email)) s += 6;

      // Members
      if (g.members?.some(m => inStr(m))) s += 4;
      if (g.member_emails?.some(e => e && nReqEmail && e.toLowerCase() === nReqEmail)) s += 5;

      // Panelist / Faculty
      if (inStr(g.panelist)) s += 2;
      if (inStr(g.faculty_in_charge)) s += 2;

      // Exact (case-insensitive) title equality gets a small boost
      if ((g.title || '').toLowerCase() === (title || '').toLowerCase()) s += 1;

      return s;
      };

    candidates.sort((a, b) => score(b) - score(a));
    return candidates[0];
  }

  /** Merge request row with the best group match (by title + involvement) */
  private mergeWithBestGroup(row: RequestItem): RequestItem {
    const title = row.title || '';
    const match = this.pickBestCandidate(title, row.requestor_name, row.email);
    if (!match) return row;

    // Date precedence (group date fields or keep original)
    const mergedPubDate =
      match.publication_date || match.date_published || match.pub_date ||
      row.publication_date || row.date_published || row.pub_date;

    // Prefer program->course fallback
    const mergedProgram = match.program || match.course || row.program || row.course;

    // Merge (group fills in blanks and adds metadata)
    const merged: RequestItem = {
      ...row,

      // Core metadata
      group_id: row.group_id ?? match.group_id,
      block_id: row.block_id ?? match.block_id,
      course: row.course ?? (match.course || mergedProgram),
      program: row.program ?? (match.program || mergedProgram),
      status: row.status ?? match.status,
      abstract: row.abstract ?? match.abstract,
      leader: row.leader ?? match.leader,
      members: row.members ?? match.members,
      leader_email: row.leader_email ?? match.leader_email,
      member_emails: row.member_emails ?? match.member_emails,
      panelist: row.panelist ?? match.panelist,
      facultyid: row.facultyid ?? match.facultyid,
      faculty_in_charge: row.faculty_in_charge ?? match.faculty_in_charge,
      file_type: row.file_type ?? match.file_type,

      // Dates
      publication_date: mergedPubDate ?? row.publication_date,
      date_published: mergedPubDate ?? row.date_published,
      pub_date: mergedPubDate ?? row.pub_date,

      // PDF / File links
      pdfLink: row.pdfLink ?? match.pdfLink,
      pdf_link: row.pdf_link ?? match.pdf_link,
      pdfUrl: row.pdfUrl ?? match.pdfUrl,
      pdf_url: row.pdf_url ?? match.pdf_url,
      fileURL: row.fileURL ?? match.fileURL,
      file_url: row.file_url ?? match.file_url,
      pdf: row.pdf ?? match.pdf,
    };

    // If groups use only pdf_url, make sure it is surfaced
    if (!merged.pdfLink && !merged.pdfUrl && !merged.fileURL && !merged.file_url && !merged.pdf && match.pdf_url) {
      merged.pdf_url = match.pdf_url;
    }

    return merged;
  }

  private buildPdfData(row: RequestItem): {
    pdfHref: string | null;
    pdfDisplayName: string;
    pdfSafeUrl: SafeResourceUrl | null;
  } {
    const raw =
      (row as any)?.pdfLink ||
      (row as any)?.pdf_link ||
      (row as any)?.pdfUrl ||
      (row as any)?.pdf_url ||
      (row as any)?.fileURL ||
      (row as any)?.file_url ||
      (row as any)?.pdf ||
      null;

    if (typeof raw === 'string' && raw.trim()) {
      const href = this.ensureProtocol(raw.trim());
      return {
        pdfHref: href,
        pdfDisplayName: this.readableName(href),
        pdfSafeUrl: this.sanitizer.bypassSecurityTrustResourceUrl(href),
      };
    }
    return { pdfHref: null, pdfDisplayName: 'Open PDF', pdfSafeUrl: null };
  }

  toList(value: unknown): string {
    if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
    if (typeof value === 'string') return value.trim() || '—';
    return '—';
  }

  private ensureProtocol(url: string): string {
    if (/^https?:\/\//i.test(url)) return url;
    return `https://${url}`;
  }

  private readableName(url: string): string {
    try {
      const u = new URL(url);
      const last = u.pathname.split('/').filter(Boolean).pop();
      if (last) return decodeURIComponent(last);
      return u.host;
    } catch {
      return url;
    }
  }


}