import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
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

/* Your shared components */
import { Sidenavbar } from '../sidenavbar/sidenavbar';

/* Parser */
import { parseGroupId } from '../../shared/utils/group-id';

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
  course: 'BSIT' | 'BSCS';
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
  groups: GroupRow[] = [];
  dataSource = new MatTableDataSource<GroupRow>([]);

  selectedDepartment: 'IT' | 'CS' | null = null;
  selectedSection: string | null = null;
  sections: string[] = [];

  // show ONLY these columns
  groupColumns: string[] = [
    'groupId', 'title', 'submissionDate', 'leader', 'status', 'forApproval'
  ];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    // Check if user is still logged in
    this.checkAuthStatus();
    
    // If the json is in /public
    this.http.get<any>('/groups.json').subscribe(raw => {
      const arr: any[] = Array.isArray(raw) ? raw : (raw?.groups ?? []);

      this.groups = arr.map((it) => {
        const gid = it.group_id ?? it.groupId ?? '';
        const p = parseGroupId(gid);

        // normalize status casing (your JSON uses "ongoing")
        const statusSrc = String(it.status ?? 'Ongoing');
        const normalizedStatus = (statusSrc[0]?.toUpperCase() ?? '') + statusSrc.slice(1).toLowerCase();

        const course: 'BSIT' | 'BSCS' = (p.course === 'BSIT' || p.course === 'BSCS') ? p.course : 'BSIT';
        const courseShort: 'IT' | 'CS' = course === 'BSIT' ? 'IT' : 'CS';

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
          course,
          courseShort,
          year: p.year,
          section: p.section,
          sectionKey: p.section ? `${p.year}${p.section}` : p.year,
        } satisfies GroupRow;
      });

      this.dataSource.data = this.groups;

      // build section dropdown (e.g. ["3A", "3B", ...])
      this.sections = Array.from(new Set(this.groups.map(g => g.sectionKey)))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

      // make date & group id sorting correct
      this.dataSource.sortingDataAccessor = (item, prop) => {
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

  /* VERIFY button navigation with full row in state */
  goToApproval(groupId: string): void {
    const group = this.groups.find(g => String(g.group_id) === String(groupId));
    this.router.navigate(['/panelist-approval-page', groupId], { state: { group } });
  }

  /* Filters */
  filterByDepartment(dept: 'IT' | 'CS'): void {
    this.selectedDepartment = dept;
    this.applyFilters();
  }

  filterBySection(section: string): void {
    this.selectedSection = section;
    this.applyFilters();
  }

  applyFilters(): void {
    const filtered = this.groups.filter(g =>
      (!this.selectedDepartment || g.courseShort === this.selectedDepartment) &&
      (!this.selectedSection || g.sectionKey === this.selectedSection)
    );
    this.dataSource.data = filtered;
    if (this.paginator) this.paginator.firstPage();
  }

  private checkAuthStatus(): void {
    // Check if user is still logged in
    const user = sessionStorage.getItem('user');
    const role = sessionStorage.getItem('role');
    
    if (!user || !role || role.toLowerCase() !== 'faculty') {
      // User is not logged in or not a faculty member
      alert('You are not logged in. Please login first.');
      this.router.navigate(['/signup-choose']);
      return;
    }
  }
}
