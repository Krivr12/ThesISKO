import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource } from '@angular/material/table';
import { MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AdminSideBar } from '../admin-side-bar/admin-side-bar';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../environments/environment';

type GroupRow = {
  group_id: string;
  title: string;
  leader: string;
  block_code: string;
  academic_year: string;
  forApproval: number;
};

@Component({
  selector: 'app-admin-chairperson-approval',
  standalone: true,
  imports: [
    CommonModule,
    AdminSideBar,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    RouterModule,
    HttpClientModule
  ],
  templateUrl: './admin-chairperson-approval.html',
  styleUrl: './admin-chairperson-approval.css'
})
export class AdminChairpersonApproval implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['group_id', 'title', 'leader', 'block', 'actions'];
  dataSource = new MatTableDataSource<GroupRow>([]);
  loading = true;
  currentUserEmail = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    // Get current user email
    const userStr = sessionStorage.getItem('currentUser');
    if (userStr) {
      const user = JSON.parse(userStr);
      this.currentUserEmail = user.email || '';
    }

    if (!this.currentUserEmail) {
      alert('Unable to identify current user. Please log in again.');
      this.router.navigate(['/login-admin']);
      return;
    }

    this.loadGroups();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadGroups(): void {
    console.log(`📋 Loading groups for chairperson: ${this.currentUserEmail}`);
    
    this.http.get<any>(`${environment.authApiUrl}/groups/by-chairperson/${this.currentUserEmail}`)
      .subscribe({
        next: (response) => {
          console.log('✅ Groups loaded:', response);
          
          if (response.success && response.data) {
            // Map groups to table rows
            const groups: GroupRow[] = response.data.map((g: any) => ({
              group_id: g.group_id,
              title: g.title || 'Untitled',
              leader: g.leader ? `${g.leader.firstname} ${g.leader.surname}` : 'Unknown',
              block_code: g.block_code || '',
              academic_year: g.academic_year || '',
              forApproval: g.forApproval || 0
            }));

            this.dataSource.data = groups;
          }

          this.loading = false;
        },
        error: (error) => {
          console.error('❌ Error loading groups:', error);
          alert('Failed to load groups. Please try again.');
          this.loading = false;
        }
      });
  }

  approveGroup(group: GroupRow): void {
    const confirmMsg = `Are you sure you want to approve all milestones for group ${group.group_id}?

This will approve:
- Copyright Form
- Turnitin Report
- All Documents
- Work Description

The group will then be forwarded to the Dean for final approval.`;

    if (!confirm(confirmMsg)) {
      return;
    }

    console.log(`🔄 Approving group: ${group.group_id}`);

    // Call all 4 milestone approval endpoints in sequence
    const milestones = ['complete_copyright', 'pass_turnitin', 'upload_all_docs', 'describe_work'];
    const userName = this.getUserName();

    this.approveMilestones(group.group_id, milestones, userName, 0);
  }

  private approveMilestones(groupId: string, milestones: string[], userName: string, index: number): void {
    if (index >= milestones.length) {
      alert('✅ All milestones approved successfully!');
      this.loadGroups(); // Reload to update the list
      return;
    }

    const milestoneType = milestones[index];

    this.http.patch(
      `${environment.authApiUrl}/groups/${groupId}/milestones/${milestoneType}/chairperson-approve`,
      { name: userName }
    ).subscribe({
      next: () => {
        console.log(`✅ Approved: ${milestoneType}`);
        // Approve next milestone
        this.approveMilestones(groupId, milestones, userName, index + 1);
      },
      error: (error) => {
        console.error(`❌ Error approving ${milestoneType}:`, error);
        alert(`Failed to approve ${milestoneType}. Please try again.`);
      }
    });
  }

  private getUserName(): string {
    const userStr = sessionStorage.getItem('currentUser');
    if (userStr) {
      const user = JSON.parse(userStr);
      return `${user.firstname || ''} ${user.lastname || ''}`.trim();
    }
    return 'Unknown User';
  }

  viewGroup(group: GroupRow): void {
    this.router.navigate(['/admin-chairperson-approval', group.group_id]);
  }

  goBack(): void {
    this.router.navigate(['/admin-dashboard']);
  }
}

