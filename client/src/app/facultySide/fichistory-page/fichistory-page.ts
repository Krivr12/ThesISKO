import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Sidenavbar } from '../sidenavbar/sidenavbar';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../environments/environment';

type Status = 'Approved' | 'Not Approved' | 'Pending';

export interface GroupMeta {
  group_id: string;
  title: string;
  leader: string;
  members: string[];
}

export interface Panelist {
  name: string;
  status: Status;
}

export interface HistoryItem {
  ts: string;
  action: string;
  by: string;
  remarks?: string;
  source: 'student' | 'panelist';
}

@Component({
  selector: 'app-fichistory-page',
  standalone: true,
  imports: [CommonModule, HttpClientModule, Sidenavbar, MatIconModule],
  templateUrl: './fichistory-page.html',
  styleUrls: ['./fichistory-page.css']
})
export class FICHistoryPage implements OnInit {
  loading = true;
  groupId = '';
  group?: GroupMeta | null;
  panelists: Panelist[] = [];
  history: HistoryItem[] = [];
  
  // FIC approval tracking
  facultyApproved = false;
  canApprove = false;
  approvalMessage = '';
  currentUserEmail = '';
  currentUserName = '';
  manuscriptFiles: string[] = [];

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private location: Location
  ) {}
  
  ngOnInit(): void {
    // Get current user from session storage
    const userStr = sessionStorage.getItem('currentUser');
    if (userStr) {
      const user = JSON.parse(userStr);
      this.currentUserEmail = user.email || '';
      this.currentUserName = `${user.Firstname || ''} ${user.Lastname || ''}`.trim();
    }
    
    this.groupId =
      this.route.snapshot.paramMap.get('group_id') ||
      this.route.snapshot.paramMap.get('id') ||
      '';
    this.bootstrapData();
  }

  private bootstrapData(): void {
    const gid = this.groupId;

    if (!gid) {
      
      this.loading = false;
      return;
    }


    // Fetch group from MongoDB API
    this.http.get<any>(`${environment.authApiUrl}/groups/${gid}`).pipe(
      catchError((err) => {
        
        return of(null);
      })
    ).subscribe((response: any) => {
      if (!response) {
        
        this.loading = false;
        return;
      }


      // Map MongoDB group structure to GroupMeta
      const leaderName = response.leader 
        ? `${response.leader.firstname || ''} ${response.leader.surname || ''}`.trim()
        : '';

      const memberNames = (response.members || []).map((m: any) => 
        `${m.firstname || ''} ${m.surname || ''}`.trim()
      );

      this.group = {
        group_id: response.group_id,
        title: response.title || '',
        leader: leaderName,
        members: memberNames
      };

      // Extract panelists from milestones
      const uploadManuscript = response.milestones?.find((m: any) => m.type === 'upload_manuscript');
      const approvedBy = uploadManuscript?.approved_by || [];
      
      // Track manuscript files and FIC approval status
      this.manuscriptFiles = uploadManuscript?.s3_key || [];
      this.facultyApproved = uploadManuscript?.verified?.faculty_in_charge?.approved || false;

      // Fetch block to get panelist names
      if (response.block_id) {
        this.http.get<any>(`${environment.authApiUrl}/blocks/${response.block_id}`).pipe(
          catchError(() => of(null))
        ).subscribe((block: any) => {
          if (block && block.panelists) {
            const panelistNames = block.panelists || [];
            const panelistEmails = block.panelists_email || [];

            this.panelists = panelistNames.map((name: string, index: number) => {
              const email = panelistEmails[index];
              const hasApproved = approvedBy.some((a: any) => 
                a.panelist_id === email || a.name?.includes(name)
              );

              return {
                name: name,
                status: hasApproved ? 'Approved' : 'Not Approved'
              } as Panelist;
            });
            
            // Get the actual required panelist count from the block (flexible)
            const requiredPanelistCount = this.panelists.length;
            
            // Check if all panelists have approved
            const allPanelistsApproved = this.panelists.every(p => p.status === 'Approved');
            const hasManuscript = this.manuscriptFiles.length > 0;
            
            
            // FIC can approve only if:
            // 1. All panelists have approved (based on block's panelist count)
            // 2. Manuscript has been uploaded
            // 3. FIC hasn't already approved
            this.canApprove = allPanelistsApproved && hasManuscript && !this.facultyApproved;
            
            // Set approval message for display (optional)
            if (this.facultyApproved) {
              this.approvalMessage = 'Approved';
            } else if (!hasManuscript) {
              this.approvalMessage = 'No manuscript uploaded';
            } else if (!allPanelistsApproved) {
              this.approvalMessage = `${approvedBy.length}/${requiredPanelistCount} panelists approved`;
            } else {
              this.approvalMessage = '';
            }
          } else {
            // Use mock panelists if block not found
            this.panelists = this.mockPanelists();
          }
          
          this.loading = false;
        });
      } else {
        // Use mock panelists if no block_id
        this.panelists = this.mockPanelists();
        this.loading = false;
      }

      // History will be implemented with S3 logging system later
      this.history = [];
    });
  }

  approveManuscript(): void {
    if (!this.canApprove) {
      if (this.facultyApproved) {
        alert('You have already approved this manuscript.');
      } else if (!this.manuscriptFiles.length) {
        alert('No manuscript has been uploaded yet.');
      } else {
        alert('Please wait for all panelists to approve before you can approve.');
      }
      return;
    }

    if (!this.currentUserName) {
      alert('Unable to identify current user. Please log in again.');
      return;
    }

    const confirmMsg = `Are you sure you want to approve the manuscript for group ${this.group?.group_id}?`;
    if (!confirm(confirmMsg)) {
      return;
    }


    const payload = {
      name: this.currentUserName
    };

    this.http.patch(
      `${environment.authApiUrl}/groups/${this.groupId}/milestones/upload_manuscript/faculty-approve`,
      payload
    ).subscribe({
      next: (response: any) => {
        alert('✅ Manuscript approved successfully!');
        
        // Update local state
        this.facultyApproved = true;
        this.canApprove = false;
        this.approvalMessage = '✅ You have approved this manuscript';
        
        // Reload data to reflect changes
        this.bootstrapData();
      },
      error: (error) => {
        
        const errorMsg = error.error?.error || 'Failed to approve manuscript';
        alert(`❌ ${errorMsg}`);
      }
    });
  }

  rejectManuscript(): void {
    const reason = prompt('Please provide a reason for rejection:');
    
    if (!reason || reason.trim() === '') {
      alert('Rejection reason is required.');
      return;
    }

    if (!this.currentUserName) {
      alert('Unable to identify current user. Please log in again.');
      return;
    }

    const confirmMsg = `Are you sure you want to reject the manuscript for group ${this.group?.group_id}?\n\nReason: ${reason}\n\nNote: The group can resubmit, and existing panelist approvals will be preserved.`;
    if (!confirm(confirmMsg)) {
      return;
    }


    const payload = {
      name: this.currentUserName,
      reason: reason.trim()
    };

    this.http.patch(
      `${environment.authApiUrl}/groups/${this.groupId}/milestones/upload_manuscript/faculty-reject`,
      payload
    ).subscribe({
      next: (response: any) => {
        alert(`✅ Manuscript rejected successfully!\n\nThe group can now resubmit their work. Panelist approvals have been preserved.`);
        this.bootstrapData();
      },
      error: (error) => {
        
        alert(`❌ Failed to reject manuscript: ${error.error?.error || error.message || 'Unknown error'}`);
      }
    });
  }

  goBack(): void { this.location.back(); }

  private mockPanelists(): Panelist[] {
    return [
      { name: 'Panelist 1', status: 'Not Approved' },
      { name: 'Panelist 2', status: 'Not Approved' },
      { name: 'Panelist 3', status: 'Not Approved' },
    ];
  }
}
