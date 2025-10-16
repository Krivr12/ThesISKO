import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy, inject } from '@angular/core';
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
import { Auth } from '../../service/auth';
import { User } from '../../interface/auth';
import { Subscription } from 'rxjs';

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
export class AdminChairpersonApproval implements OnInit, AfterViewInit, OnDestroy {
  displayedColumns: string[] = ['group_id', 'title', 'leader', 'block', 'actions'];
  dataSource = new MatTableDataSource<GroupRow>([]);
  loading = true;
  currentUserEmail = '';
  currentUser: User | null = null;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private authService = inject(Auth);
  private userSubscription?: Subscription;

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    // Subscribe to current user from Auth service
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.currentUser = user;
        // Try both lowercase and uppercase email
        this.currentUserEmail = user.email || (user as any).Email || '';
        
        // Load groups once we have user data
        if (this.currentUserEmail) {
          this.loadGroups();
        }
      }
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  ngOnDestroy(): void {
    // Unsubscribe to prevent memory leaks and errors on logout
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  loadGroups(): void {
    this.http.get<any>(`${environment.authApiUrl}/groups/by-chairperson/${this.currentUserEmail}`)
      .subscribe({
        next: (response) => {
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
          console.error('❌ Failed to load groups:', error);
          alert('Failed to load groups. Please check your connection and try again.');
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

    const userName = this.getUserName();

    // Use single group-level approval endpoint
    this.http.patch(
      `${environment.authApiUrl}/groups/${group.group_id}/chairperson-approve-final`,
      { name: userName }
    ).subscribe({
      next: (response) => {
        console.log('✅ Group approved successfully:', response);
        alert(`✅ Group ${group.group_id} approved successfully! Forwarded to Dean for final approval.`);
        this.loadGroups(); // Reload to update the list
      },
      error: (error) => {
        console.error('❌ Error approving group:', error);
        const errorMsg = error.error?.error || 'Failed to approve group. Please try again.';
        alert(`❌ Error: ${errorMsg}`);
      }
    });
  }

  rejectGroup(group: GroupRow): void {
    const reason = prompt(`Please provide a reason for rejecting group ${group.group_id}:`);
    
    if (!reason || reason.trim() === '') {
      alert('Rejection cancelled. A reason is required.');
      return;
    }

    const milestone = prompt(`Which milestone needs to be fixed?\n\nEnter one of:\n- complete_copyright\n- pass_turnitin\n- upload_all_docs\n- describe_work`);

    const validMilestones = ['complete_copyright', 'pass_turnitin', 'upload_all_docs', 'describe_work'];
    if (!milestone || !validMilestones.includes(milestone)) {
      alert('Rejection cancelled. Invalid milestone type.');
      return;
    }

    console.log(`🔄 Rejecting group: ${group.group_id}, milestone: ${milestone}`);

    const userName = this.getUserName();

    this.http.patch(
      `${environment.authApiUrl}/groups/${group.group_id}/chairperson-reject`,
      { name: userName, reason: reason.trim(), milestone }
    ).subscribe({
      next: (response) => {
        console.log('✅ Group rejected successfully:', response);
        alert(`✅ Group ${group.group_id} rejected. Student will be notified to fix ${milestone}.`);
        this.loadGroups(); // Reload to update the list
      },
      error: (error) => {
        console.error('❌ Error rejecting group:', error);
        const errorMsg = error.error?.error || 'Failed to reject group. Please try again.';
        alert(`❌ Error: ${errorMsg}`);
      }
    });
  }

  private getUserName(): string {
    if (this.currentUser) {
      const fullName = `${this.currentUser.Firstname || this.currentUser.firstname || ''} ${this.currentUser.Lastname || this.currentUser.lastname || ''}`.trim();
      return fullName || 'Unknown User';
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

