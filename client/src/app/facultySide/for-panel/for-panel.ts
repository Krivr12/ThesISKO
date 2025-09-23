import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

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
  /** URL-driven program filter (?program=BSIT|BSCS) */
  program: Program | null = null;

  /** Table data (already program-filtered) */
  groups: GroupRow[] = [];
  private allLoadedGroups: GroupRow[] = []; // raw from JSON before program filter
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

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
  ) {}

  ngOnInit(): void {
    // Read program from query param
    const raw = (this.route.snapshot.queryParamMap.get('program') || '').toUpperCase();
    this.program = (raw === 'BSIT' || raw === 'BSCS') ? (raw as Program) : null;

    this.http.get<any>('/groups.json').subscribe(rawData => {
      const arr: any[] = Array.isArray(rawData) ? rawData : (rawData?.groups ?? []);

      this.allLoadedGroups = arr.map((it) => {
        const gid = it.group_id ?? it.groupId ?? '';
        const p = parseGroupId(gid);

        // normalize status casing (handles "ongoing", etc.)
        const statusSrc = String(it.status ?? 'Ongoing');
        const normalizedStatus = (statusSrc[0]?.toUpperCase() ?? '') + statusSrc.slice(1).toLowerCase();

        const derivedCourse: Program =
          (p.course === 'BSIT' || p.course === 'BSCS') ? p.course : 'BSIT';
        const courseShort: 'IT' | 'CS' = derivedCourse === 'BSIT' ? 'IT' : 'CS';

        return {
          group_id: gid,
          title: it.title ?? '',
          leader: it.leader ?? '',
          submitted_at: it.submitted_at ?? it.submission_date ?? '',

          // pass-throughs for detail page
          members: it.members ?? [],
          leader_email: it.leader_email ?? '',
          member_emails: it.member_emails ?? [],

          status: normalizedStatus as GroupRow['status'],

          // derived
          schoolYear: p.schoolYear,
          course: derivedCourse,
          courseShort,
          year: p.year,
          section: p.section,
          sectionKey: p.section ? `${p.year}${p.section}` : p.year,
        } satisfies GroupRow;
      });

      // Apply program filter immediately (BSIT-only or BSCS-only)
      const programFiltered = this.program
        ? this.allLoadedGroups.filter(g => g.course === this.program)
        : this.allLoadedGroups;

      this.groups = programFiltered;

      // Build section dropdown from the program-filtered data
      this.sections = Array.from(new Set(programFiltered.map(g => g.sectionKey)))
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
