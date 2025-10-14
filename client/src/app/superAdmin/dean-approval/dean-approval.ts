import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
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
import { environment } from '../../../environments/environment';

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
export class DeanApproval implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['group_id', 'title', 'leader', 'program', 'block', 'actions'];
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
    console.log(`👨‍💼 Loading groups for dean: ${this.currentUserEmail}`);
    
    this.http.get<any>(`${environment.authApiUrl}/groups/by-dean/${this.currentUserEmail}`)
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
              program_name: g.program_name || '',
              department_name: g.department_name || '',
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

  approveAndArchive(group: GroupRow): void {
    const confirmMsg = `Are you sure you want to give FINAL APPROVAL for group ${group.group_id}?

Title: ${group.title}
Leader: ${group.leader}
Program: ${group.program_name}

This action will:
✓ Archive the thesis to the repository
✓ Generate a document ID
✓ Make it publicly searchable

This action cannot be undone.`;

    if (!confirm(confirmMsg)) {
      return;
    }

    console.log(`🔄 Archiving group: ${group.group_id}`);

    // Call the repository endpoint to archive
    this.http.post(
      `${environment.authApiUrl}/groups/${group.group_id}/repository`,
      {}
    ).subscribe({
      next: (response: any) => {
        console.log('✅ Successfully archived:', response);
        alert(`✅ Thesis archived successfully!

Document ID: ${response.record?.document_id}
Title: ${response.record?.title}

The thesis is now in the repository and searchable by students.`);
        
        // Reload groups to remove the archived one
        this.loadGroups();
      },
      error: (error) => {
        console.error('❌ Error archiving:', error);
        const errorMsg = error.error?.error || 'Failed to archive thesis';
        alert(`❌ ${errorMsg}`);
      }
    });
  }

  viewGroup(group: GroupRow): void {
    // Navigate to group details page (can be implemented later)
    this.router.navigate(['/dean-approval', group.group_id]);
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}

