import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/* Angular Material (standalone) */
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';

import { Location } from '@angular/common';

/* Your shared components */
import { Sidenavbar } from '../sidenavbar/sidenavbar';

/* Parser */
import { parseGroupId } from '../../shared/utils/group-id';

type Program = 'BSIT' | 'BSCS';

interface GroupRow {
  group_id: string;
  title: string;
  leader: string;
  submitted_at: string | Date;
  status: 'Ongoing' | 'Rejected' | 'Approved';

  // needed by detail page
  members: string[];
  leader_email: string;
  member_emails: string[];

  // derived
  schoolYear: string;
  course: Program;
  courseShort: 'IT' | 'CS';
  year: string;
  section: string;
  sectionKey: string;
}

@Component({
  selector: 'app-for-panel',
  standalone: true,
  imports: [
    CommonModule, RouterModule, HttpClientModule, Sidenavbar,
    MatSidenavModule, MatToolbarModule, MatButtonModule, MatIconModule,
    MatTableModule, MatFormFieldModule, MatSelectModule, MatOptionModule,
    MatPaginatorModule, MatSortModule, MatInputModule
  ],
  templateUrl: './for-panel.html',
  styleUrl: './for-panel.css'
})
export class ForPanel implements OnInit, AfterViewInit {
  /* URL-driven block filter */
  block_id: string = ''; // From query param ?block=2425-BSIT-5
  program: Program | null = null; // Derived from block
  program_id: string = ''; // Derived from block

  /** Table data */
  groups: GroupRow[] = [];
  private allLoadedGroups: GroupRow[] = [];
  dataSource = new MatTableDataSource<GroupRow>([]);

  /** Section filter only */
  selectedSection: string | null = null;
  sections: string[] = [];

  // show ONLY these columns
  groupColumns: string[] = [
    'groupId', 'title', 'submissionDate', 'leader', 'status', 'forApproval'
  ];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  /* Current user */
  currentUserEmail: string = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
  ) {}

  ngOnInit(): void {
    // Get current user email from local storage
    const userStr = localStorage.getItem('currentUser') || localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.currentUserEmail = user.email || user.Email || '';
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }

    // Read block_id from query param (?block=2425-BSIT-5)
    this.block_id = this.route.snapshot.queryParamMap.get('block') || '';

    if (!this.currentUserEmail) {
      console.error('No user email found in session');
      return;
    }

    if (!this.block_id) {
      console.error('No block_id provided in query params');
      return;
    }

    console.log('👥 Fetching groups for block:', this.block_id);

    // Fetch groups for this specific block
    const apiUrl = `${environment.authApiUrl}/groups?block_id=${encodeURIComponent(this.block_id)}`;

    this.http.get<any[]>(apiUrl).subscribe({
      next: (response) => {
        console.log('✅ Panelist groups response:', response);

        if (!Array.isArray(response)) {
          console.error('Invalid response format');
          return;
        }

        const arr = response;

        this.allLoadedGroups = arr.map((it) => {
          // Map MongoDB group structure to GroupRow
          const gid = it.group_id || '';
          
          // Extract section from block_code
          // Format can be: "5A", "3B", or just "5", "3" (no section letter)
          const blockCode = it.block_code || '';
          
          // Extract year (first char or first digit)
          const yearMatch = blockCode.match(/^\d+/);
          const year = yearMatch ? yearMatch[0] : '';
          
          // Extract section (letters after the year)
          const section = blockCode.replace(/^\d+/, '') || '';
          
          // SectionKey is the full block_code (e.g., "5A" or "5")
          const sectionKey = blockCode || year;

          // Map progress to status
          const progressMap: Record<string, 'Ongoing' | 'Rejected' | 'Approved'> = {
            'not_started': 'Ongoing',
            'ongoing': 'Ongoing',
            'completed': 'Approved',
            'rejected': 'Rejected'
          };
          const status = progressMap[it.progress] || 'Ongoing';

          // Format leader name from object
          const leaderName = it.leader 
            ? `${it.leader.firstname || ''} ${it.leader.surname || ''}`.trim()
            : '';

          // Format member names
          const memberNames = (it.members || []).map((m: any) => 
            `${m.firstname || ''} ${m.surname || ''}`.trim()
          );

          const memberEmails = (it.members || []).map((m: any) => m.email || '');

          // Determine course from block_id (e.g., "2425-BSIT-5" -> "BSIT")
          const blockParts = this.block_id.split('-');
          const programFromBlock = blockParts[1] || 'BSIT'; // e.g., "BSIT"
          const derivedCourse: Program = (programFromBlock === 'BSIT' || programFromBlock === 'BSCS') 
            ? programFromBlock as Program 
            : 'BSIT';
          const courseShort: 'IT' | 'CS' = derivedCourse === 'BSIT' ? 'IT' : 'CS';
          
          // Store program for later use
          if (!this.program) {
            this.program = derivedCourse;
            this.program_id = derivedCourse;
          }

          return {
            group_id: gid,
            title: it.title || '',
            leader: leaderName,
            submitted_at: it.created_at || '',

            // pass-throughs for detail page
            members: memberNames,
            leader_email: it.leader?.email || '',
            member_emails: memberEmails,

            status: status,

            // derived
            schoolYear: it.academic_year || '',
            course: derivedCourse,
            courseShort,
            year: year,
            section: section,
            sectionKey: sectionKey,
          } satisfies GroupRow;
        });

        this.groups = this.allLoadedGroups;

        // Build section dropdown from the loaded data
        this.sections = Array.from(new Set(this.groups.map(g => g.sectionKey)))
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

        // Initialize table with current section filter (if any)
        this.applySectionFilter();

        // proper sorting for date & group id
        this.dataSource.sortingDataAccessor = (item: GroupRow, prop: string) => {
          if (prop === 'submissionDate') return new Date(item.submitted_at).getTime();
          if (prop === 'groupId') return item.group_id;
          return (item as any)[prop];
        };
      },
      error: (err) => {
        console.error('❌ Error fetching panelist groups:', err);
      }
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  /* VERIFY / APPROVE button navigation with full row in state.
     Also forward the ?program so detail pages can enforce the same filter. */
  goToApproval(groupId: string): void {
    const group = this.groups.find(g => String(g.group_id) === String(groupId));
    this.router.navigate(
      ['/panelist-approval-page', groupId],
      { state: { group }, queryParams: this.program ? { program: this.program } : undefined }
    );
  }

  goBack(): void {
   
      this.router.navigate(['/faculty-home']); // or the list route you prefer
    }

  /* -------- Section filter only -------- */
  viewAllSections(): void {
    this.selectedSection = null;
    this.applySectionFilter();
  }

  filterBySection(section: string): void {
    this.selectedSection = section;
    this.applySectionFilter();
  }

  private applySectionFilter(): void {
    const filtered = this.groups.filter(g =>
      (!this.selectedSection || g.sectionKey === this.selectedSection)
    );
    this.dataSource.data = filtered;
    if (this.paginator) this.paginator.firstPage();
  }
}
