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

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.groupId =
      this.route.snapshot.paramMap.get('group_id') ||
      this.route.snapshot.paramMap.get('id') ||
      '';
    this.bootstrapData();
  }

  private bootstrapData(): void {
    const gid = this.groupId;

    if (!gid) {
      console.error('No group ID provided');
      this.loading = false;
      return;
    }

    console.log('📚 Fetching group data for:', gid);

    // Fetch group from MongoDB API
    this.http.get<any>(`${environment.authApiUrl}/groups/${gid}`).pipe(
      catchError((err) => {
        console.error('❌ Error fetching group:', err);
        return of(null);
      })
    ).subscribe((response: any) => {
      if (!response) {
        console.error('Group not found');
        this.loading = false;
        return;
      }

      console.log('✅ Group response:', response);

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
    // TODO: Implement approval with backend API
    console.log('Approve manuscript for group:', this.group?.group_id);
  }

  rejectManuscript(): void {
    // TODO: Implement rejection with backend API
    console.log('Reject manuscript for group:', this.group?.group_id);
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
