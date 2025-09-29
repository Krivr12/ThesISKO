import { Component, OnInit, ViewChild, AfterViewInit, TemplateRef } from '@angular/core';
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
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';

import { Location } from '@angular/common';

/* Your shared components */
import { Sidenavbar } from '../sidenavbar/sidenavbar';

/* Parser */
import { parseGroupId } from '../../shared/utils/group-id';

/* --- Data types --- */
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
  /* URL-driven program filter */
  program: Program | null = null; // ?program=BSIT or ?program=BSCS

  /* Table data */
  groups: GroupRow[] = [];                 // source for current (already program-filtered) list
  private allLoadedGroups: GroupRow[] = []; // raw list from JSON before program filter (kept for safety if needed)
  dataSource = new MatTableDataSource<GroupRow>([]);

  /* Filters / dropdowns */
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
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private location: Location,
  ) {}

  /* ---------- Lifecycle ---------- */
  ngOnInit(): void {
    // read program from query param (?program=BSIT|BSCS)
    const raw = (this.route.snapshot.queryParamMap.get('program') || '').toUpperCase();
    this.program = (raw === 'BSIT' || raw === 'BSCS') ? (raw as Program) : null;

    // Load groups from backend API first, fallback to static JSON
    this.http.get<any>('http://localhost:5050/groups', { withCredentials: true }).subscribe({
      next: (apiResponse) => {
        console.log('Groups loaded from API:', apiResponse);
        const arr: any[] = apiResponse?.groups || [];
        this.processGroupsData(arr);
      },
      error: (apiError) => {
        console.warn('Failed to load from API, falling back to static JSON:', apiError);
        // Fallback to static JSON file
        this.http.get<any>('/groups.json').subscribe({
          next: (rawData) => {
            const arr: any[] = Array.isArray(rawData) ? rawData : (rawData?.groups ?? []);
            this.processGroupsData(arr);
          },
          error: (jsonError) => {
            console.error('Failed to load groups from both API and JSON:', jsonError);
            this.processGroupsData([]);
          }
        });
      }
    });
  }

  private processGroupsData(arr: any[]): void {

      this.allLoadedGroups = arr.map((it) => {
        const gid = it.group_id ?? it.groupId ?? '';
        const p = parseGroupId(gid);

        const statusSrc = String(it.status ?? 'Ongoing');
        const normalizedStatus =
          (statusSrc[0]?.toUpperCase() ?? '') + statusSrc.slice(1).toLowerCase();

        // derive program from parsed id; default to BSIT if unclear
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

      // Build section list from program-filtered data
      this.sections = Array.from(new Set(programFiltered.map(g => g.sectionKey)))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

      // Initialize table with section filter (if any)
      this.applySectionFilter();

      // proper sorting for date & group id
      this.dataSource.sortingDataAccessor = (item: GroupRow, prop: string) => {
        if (prop === 'submissionDate') return new Date(item.submitted_at).getTime();
        if (prop === 'groupId') return item.group_id;
        return (item as any)[prop];
      };
  }

  goBack(): void {
   
      this.router.navigate(['/faculty-home']); // or the list route you prefer
    }
  

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  /* ---------- Navigation ---------- */
  goToApproval(groupId: string): void {
    const group = this.groups.find(g => String(g.group_id) === String(groupId));
    this.router.navigate(
      ['/fichistory-page', groupId],
      { state: { group }, queryParams: this.program ? { program: this.program } : undefined }
    );
  }

  /* ---------- Section filter only ---------- */
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

  /* ---------- Add Group Dialog ---------- */
  openAddDialog(): void {
    this.leader = { firstName: '', lastName: '', email: '' };
    this.members = [];
    this.dialog.open(this.addGroupDialog, {
      panelClass: 'add-group-dialog',
      width: '720px',
      autoFocus: false
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
    if (!this.isFormValid()) {
      alert('Please fill in all required fields correctly.');
      return;
    }

    const leaderFull = `${this.leader.firstName.trim()} ${this.leader.lastName.trim()}`.trim();
    const memberNames = this.members.map(m => `${m.firstName.trim()} ${m.lastName.trim()}`.trim());
    const memberEmails = this.members.map(m => m.email.trim());

    // Generate group ID based on current program and block number
    const currentYear = new Date().getFullYear();
    const shortYear = currentYear.toString().slice(-2);
    const nextYear = (currentYear + 1).toString().slice(-2);
    const schoolYear = `${shortYear}${nextYear}`;
    
    const courseCode = this.program === 'BSCS' ? 'CS' : 'IT';
    
    // Generate block number (e.g., 5-11)
    // You can modify this logic based on your requirements
    const blockSection = Math.floor(Math.random() * 9) + 1; // 1-9
    const blockNumber = Math.floor(Math.random() * 99) + 1; // 1-99
    const blockId = `${blockSection}-${String(blockNumber).padStart(2, '0')}`;
    
    const groupId = `${schoolYear}-${courseCode}-${blockId}`;

    // Prepare the request payload according to backend API
    const groupData = {
      group_id: groupId,
      leader_email: this.leader.email.trim(),
      leader_text: leaderFull,
      members: this.members.map(member => ({
        email: member.email.trim(),
        text: `${member.firstName.trim()} ${member.lastName.trim()}`.trim()
      }))
    };

    console.log('Creating group with data:', groupData);

    // Call the backend API
    this.http.post('http://localhost:5050/groups/create', groupData, {
      withCredentials: true
    }).subscribe({
      next: (response: any) => {
        console.log('Group created successfully:', response);
        
        let message = `Group "${groupId}" created successfully!`;
        
        if (response.email_status?.sent) {
          message += ` The leader will receive an email with login credentials at ${response.email_status.recipient}.`;
        } else {
          message += ` However, the email could not be sent to ${response.email_status?.recipient || 'the leader'}.`;
          if (response.email_status?.error) {
            message += ` Error: ${response.email_status.error}`;
          }
          message += ` Please manually provide the credentials:\nUsername: ${groupId}\nPassword: [Check server logs]`;
        }
        
        alert(message);
        
        // Close the dialog
        ref.close();
        
        // Refresh the groups list
        this.ngOnInit();
        
        // Reset form
        this.leader = { firstName: '', lastName: '', email: '' };
        this.members = [];
      },
      error: (error) => {
        console.error('Error creating group:', error);
        let errorMessage = 'Failed to create group. ';
        
        if (error.status === 400) {
          errorMessage += 'Please check that all fields are filled correctly.';
        } else if (error.status === 404) {
          errorMessage += 'One or more email addresses are not registered students.';
        } else if (error.status === 409) {
          errorMessage += 'Group ID already exists. Please try again.';
        } else {
          errorMessage += 'Please try again later.';
        }
        
        alert(errorMessage);
      }
    });
  }
}
