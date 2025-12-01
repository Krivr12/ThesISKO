import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource } from '@angular/material/table';
import { MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SuperAdminNavBar } from '../super-admin-nav-bar/super-admin-nav-bar';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Auth } from '../../service/auth';
import { User } from '../../interface/auth';

type GroupRow = {
  group_id: string;
  title: string;
  leader: string;
  block_code: string;
  academic_year: string;
  program_name: string;
  department_name: string;
  forApproval: number;
};

@Component({
  selector: 'app-dean-approval',
  standalone: true,
  imports: [
    CommonModule,
    SuperAdminNavBar,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    RouterModule,
    HttpClientModule
  ],
  templateUrl: './dean-approval.html',
  styleUrl: './dean-approval.css'
})
export class DeanApproval implements OnInit, OnDestroy, AfterViewInit {
  displayedColumns: string[] = ['group_id', 'title', 'leader', 'program', 'block', 'actions'];
  dataSource = new MatTableDataSource<GroupRow>([]);
  loading = true;
  currentUserEmail = '';
  currentUser: User | null = null;
  private userSubscription?: Subscription;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private authService = inject(Auth);

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    console.log('🔍 [Dean Approval] ngOnInit started');
    
    // Subscribe to current user from Auth service
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      console.log('👤 [Dean Approval] User from Auth service:', user);
      
      if (user) {
        this.currentUser = user;
        this.currentUserEmail = user.email || user.Email || '';
        console.log('✅ [Dean Approval] User identified');
        console.log('📧 [Dean Approval] Email:', this.currentUserEmail);
        
        // Load groups once we have user data
        if (this.currentUserEmail) {
          console.log('✅ [Dean Approval] Email is valid, calling loadGroups()...');
          this.loadGroups();
        } else {
          console.error('❌ [Dean Approval] Email is empty!');
        }
      } else {
        console.log('⚠️ [Dean Approval] No user from Auth service (user logged out or not authenticated)');
        // Don't show alert or navigate - let auth guard handle it
      }
    });
  }

  ngOnDestroy(): void {
    // Clean up subscription to prevent memory leaks and multiple alerts on logout
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadGroups(): void {
    console.log(`📋 [loadGroups] Starting...`);
    console.log(`📧 [loadGroups] Email: "${this.currentUserEmail}"`);
    console.log(`🔗 [loadGroups] API URL: ${environment.authApiUrl}/groups/by-dean`);
    
    this.http.get<any>(`${environment.authApiUrl}/groups/by-dean`)
      .subscribe({
        next: (response) => {
          console.log('✅ [loadGroups] API Response:', response);
          console.log('✅ [loadGroups] Response success:', response?.success);
          console.log('✅ [loadGroups] Response data length:', response?.data?.length);
          
          if (response.success && response.data) {
            console.log(`📊 [loadGroups] Mapping ${response.data.length} groups...`);
            
            // Map groups to table rows
            const groups: GroupRow[] = response.data.map((g: any) => ({
              group_id: g.group_id,
              title: g.title || 'Untitled',
              leader: g.leader ? `${g.leader.firstname} ${g.leader.surname}` : 'Unknown',
              block_code: g.block_code || '',
              academic_year: g.academic_year || '',
              program_name: g.program_name || '',
              department_name: g.department_name || '',
              forApproval: g.forApproval || 0
            }));

            console.log('📊 [loadGroups] Mapped groups:', groups);
            this.dataSource.data = groups;
            console.log('✅ [loadGroups] DataSource updated');
          } else {
            console.warn('⚠️ [loadGroups] Response format unexpected:', response);
          }

          this.loading = false;
          console.log('✅ [loadGroups] Loading complete');
        },
        error: (error) => {
          console.error('❌ [loadGroups] API Error:', error);
          console.error('❌ [loadGroups] Error status:', error?.status);
          console.error('❌ [loadGroups] Error message:', error?.message);
          alert('Failed to load groups. Please try again.');
          this.loading = false;
        }
      });
  }

  approveAndArchive(group: GroupRow): void {
    const confirmMsg = `Are you sure you want to give FINAL APPROVAL for group ${group.group_id}?

Title: ${group.title}
Leader: ${group.leader}
Program: ${group.program_name}

This action will:
✓ Record Dean approval
✓ Archive the thesis to the repository
✓ Generate a document ID
✓ Make it publicly searchable

This action cannot be undone.`;

    if (!confirm(confirmMsg)) {
      return;
    }

    console.log(`🔄 Approving and archiving group: ${group.group_id}`);

    const userName = this.getUserName();

    // Use dean approval endpoint which triggers automatic archiving
    this.http.patch(
      `${environment.authApiUrl}/groups/${group.group_id}/dean-approve`,
      { dean_name: userName }
    ).subscribe({
      next: (response: any) => {
        console.log('✅ Dean approval and archiving successful:', response);
        
        if (response.archived && response.document_id) {
          alert(`✅ Dean approval recorded and thesis archived successfully!

Document ID: ${response.document_id}
Group ID: ${response.group_id}

The thesis is now in the repository and searchable by students.`);
        } else {
          alert(`⚠️ Dean approval recorded, but archiving encountered an issue.

Group ID: ${response.group_id}

Please check the system logs or contact the administrator.`);
        }
        
        // Reload groups to remove the approved one
        this.loadGroups();
      },
      error: (error) => {
        console.error('❌ Error in dean approval:', error);
        const errorMsg = error.error?.error || 'Failed to approve and archive thesis';
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

    console.log(`🔄 Dean rejecting group: ${group.group_id}, milestone: ${milestone}`);

    const userName = this.getUserName();

    this.http.patch(
      `${environment.authApiUrl}/groups/${group.group_id}/dean-reject`,
      { dean_name: userName, reason: reason.trim(), milestone_to_fix: milestone }
    ).subscribe({
      next: (response) => {
        console.log('✅ Group rejected successfully:', response);
        alert(`✅ Group ${group.group_id} rejected. 

The submission will be sent back to the Chairperson and student to fix ${milestone}.`);
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
      return `${this.currentUser.Firstname || this.currentUser.firstname || ''} ${this.currentUser.Lastname || this.currentUser.lastname || ''}`.trim();
    }
    return 'Unknown User';
  }

  viewGroup(group: GroupRow): void {
    // Navigate to group details page (can be implemented later)
    this.router.navigate(['/dean-approval', group.group_id]);
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}

