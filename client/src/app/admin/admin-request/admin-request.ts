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

  constructor(
    private http: HttpClient,
    private router: Router,
    private sanitizer: DomSanitizer,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    // Load requests from database
    this.loadRequestData();

    // Case-insensitive filter across a few fields
    this.dataSource.filterPredicate = (d, f) => (
      [d.email, d.department, d.program, d.status, d.user_type, d.country, d.city, d.school]
        .filter(Boolean).join(' ').toLowerCase()
    ).includes((f || '').toLowerCase());
  }

  private loadRequestData(): void {
    // Load requests from Supabase via API
    this.http.get<any[]>('/api/requests/analytics').subscribe({
      next: rows => {
        this.dataSource.data = rows ?? [];
        console.log('✅ Request data loaded from database:', rows.length, 'requests');
      },
      error: (error) => {
        console.error('❌ Error loading request data:', error);
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

    // Open dialog with request data
    this.dialog.open(this.verifyTpl, {
      panelClass: 'thesisko-dialog',
      width: 'min(1100px, 96vw)',
      maxWidth: '96vw',
      maxHeight: '90vh',
      autoFocus: false,
      restoreFocus: false,
      data: { row }
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
  toList(value: unknown): string {
    if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
    if (typeof value === 'string') return value.trim() || '—';
    return '—';
  }
}