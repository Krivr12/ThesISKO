import { Component, OnInit, ViewChild, AfterViewInit, TemplateRef } from '@angular/core';
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
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';

/* Your shared components */
import { Sidenavbar } from '../sidenavbar/sidenavbar';

/* Parser */
import { parseGroupId } from '../../shared/utils/group-id';

/* --- Data types --- */
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

type Person = { firstName: string; lastName: string; email: string; };

@Component({
  selector: 'app-for-fic',
  standalone: true,
  imports: [
    CommonModule, RouterModule, HttpClientModule, Sidenavbar,
    MatSidenavModule, MatToolbarModule, MatButtonModule, MatIconModule,
    MatTableModule, MatFormFieldModule, MatSelectModule, MatOptionModule,
    MatPaginatorModule, MatSortModule, MatInputModule,
    MatDialogModule, FormsModule
  ],
  templateUrl: './for-fic.html',
  styleUrl: './for-fic.css'
})
export class ForFIC implements OnInit, AfterViewInit {
  /* Table data */
  groups: GroupRow[] = [];
  dataSource = new MatTableDataSource<GroupRow>([]);

  /* Filters / dropdowns */
  selectedDepartment: 'IT' | 'CS' | null = null;
  selectedSection: string | null = null;
  sections: string[] = [];

  /* Columns */
  groupColumns: string[] = ['groupId', 'leader', 'status', 'forApproval'];

  /* Mat refs */
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  /* Dialog ref */
  @ViewChild('addGroupDialog') addGroupDialog!: TemplateRef<any>;

  /* Dialog form state */
  leader: Person = { firstName: '', lastName: '', email: '' };
  members: Person[] = [];

  constructor(
    private http: HttpClient,
    private router: Router,
    private dialog: MatDialog
  ) {}

  /* ---------- Lifecycle ---------- */
  ngOnInit(): void {
    this.http.get<any>('/groups.json').subscribe(raw => {
      const arr: any[] = Array.isArray(raw) ? raw : (raw?.groups ?? []);

      this.groups = arr.map((it) => {
        const gid = it.group_id ?? it.groupId ?? '';
        const p = parseGroupId(gid);

        const statusSrc = String(it.status ?? 'Ongoing');
        const normalizedStatus =
          (statusSrc[0]?.toUpperCase() ?? '') + statusSrc.slice(1).toLowerCase();

        const course: 'BSIT' | 'BSCS' =
          (p.course === 'BSIT' || p.course === 'BSCS') ? p.course : 'BSIT';
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

      this.sections = Array.from(new Set(this.groups.map(g => g.sectionKey)))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

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

  /* ---------- Navigation ---------- */
  goToApproval(groupId: string): void {
    const group = this.groups.find(g => String(g.group_id) === String(groupId));
    this.router.navigate(['/fichistory-page', groupId], { state: { group } });
  }

  /* ---------- Filters ---------- */
  viewAll(): void {
    this.selectedDepartment = null;
    this.selectedSection = null;
    this.dataSource.data = this.groups;
    if (this.paginator) this.paginator.firstPage();
  }

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

  /* ---------- Add Group Dialog ---------- */
  openAddDialog(): void {
    this.leader = { firstName: '', lastName: '', email: '' };
    this.members = [];
    this.dialog.open(this.addGroupDialog, {
      panelClass: 'add-group-clean',
      width: '720px'   
    });
  }

  addMemberRow(): void {
    this.members.push({ firstName: '', lastName: '', email: '' });
  }

  removeMemberRow(i: number): void {
    this.members.splice(i, 1);
  }

  private validEmail(email: string): boolean {
    return !!email && email.includes('@') && email.includes('.');
  }

  isFormValid(): boolean {
    const leaderOk =
      this.leader.firstName.trim() &&
      this.leader.lastName.trim() &&
      this.validEmail(this.leader.email);

    if (!leaderOk) return false;

    for (const m of this.members) {
      const ok =
        m.firstName.trim() &&
        m.lastName.trim() &&
        this.validEmail(m.email);
      if (!ok) return false;
    }
    return true;
  }

  saveNewGroup(ref: any): void {
    const leaderFull = `${this.leader.firstName.trim()} ${this.leader.lastName.trim()}`.trim();
    const memberNames = this.members.map(m => `${m.firstName.trim()} ${m.lastName.trim()}`.trim());
    const memberEmails = this.members.map(m => m.email.trim());

    const course =
      this.selectedDepartment === 'IT' ? 'BSIT' :
      this.selectedDepartment === 'CS' ? 'BSCS' : 'BSIT';

    const newRow: GroupRow = {
      group_id: `TEMP-${Date.now()}`,
      title: '',
      leader: leaderFull,
      submitted_at: new Date(),
      status: 'Ongoing',
      members: memberNames,
      leader_email: this.leader.email.trim(),
      member_emails: memberEmails,
      schoolYear: '',
      course,
      courseShort: course === 'BSIT' ? 'IT' : 'CS',
      year: '',
      section: '',
      sectionKey: ''
    };

    this.groups = [newRow, ...this.groups];
    this.viewAll(); // show everything after adding
    ref.close();
  }
}
