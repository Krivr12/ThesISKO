import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Sidenavbar } from '../sidenavbar/sidenavbar';
import { MatIconModule } from '@angular/material/icon';

type Status = 'Approved' | 'Not Approved' | 'Pending';

export interface GroupMeta {
  group_id: string;
  title?: string;
  username: string;
  created_at: string;
  leader: {
    student_id: string;
    name: string;
    email: string;
  };
  members: {
    student_id: string;
    name: string;
    email: string;
    role: string;
  }[];
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
  private readonly GROUPS_URL = '/groups.json'; // or '/assets/groups.json'

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

    // Use backend API to get real group data
    const group$ = this.http.get<GroupMeta>(`http://localhost:5050/groups/${gid}`, { withCredentials: true }).pipe(
      catchError((error) => {
        console.error('Error fetching group data from backend:', error);
        // Fallback to static JSON if backend fails
        return this.http.get<GroupMeta[]>(this.GROUPS_URL).pipe(
          map((list: GroupMeta[] = []) => {
            const found = list.find(g => String(g.group_id) === String(gid));
            return found ?? null; 
          }),
          catchError(() => of(null))
        );
      })
    );

    const panelists$ = this.http
      .get<Panelist[]>(`/api/panel/${gid}/panelists`)
      .pipe(catchError(() => of(this.mockPanelists())));

    const studentHistory$ = this.http
      .get<HistoryItem[]>(`/api/student/${gid}/history`)
      .pipe(catchError(() => of(this.mockStudentHistory())));

    const panelHistory$ = this.http
      .get<HistoryItem[]>(`/api/panel/${gid}/history`)
      .pipe(catchError(() => of(this.mockPanelHistory())));

    forkJoin({ group: group$, panelists: panelists$, studentHistory: studentHistory$, panelHistory: panelHistory$ })
      .pipe(
        map(({ group, panelists, studentHistory, panelHistory }) => {
          const merged = [...studentHistory, ...panelHistory].sort(
            (a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()
          );
          return { group, panelists, history: merged };
        })
      )
      .subscribe(({ group, panelists, history }) => {
        this.group = group;            
        this.panelists = panelists;
        this.history = history;
        this.loading = false;
      });
  }

  approveManuscript(): void {
    this.history.unshift({
      ts: new Date().toISOString(),
      action: 'Approved',
      by: 'Panel – You',
      remarks: '',
      source: 'panelist',
    });
  }

  rejectManuscript(): void {
    this.history.unshift({
      ts: new Date().toISOString(),
      action: 'Rejected',
      by: 'Panel – You',
      remarks: '—',
      source: 'panelist',
    });
  }

  goBack(): void { this.location.back(); }

  private mockPanelists(): Panelist[] {
    return [
      { name: 'Nino Escueta', status: 'Not Approved' },
      { name: 'Aleta Fabregas', status: 'Not Approved' },
      { name: 'Sherilyn Usero', status: 'Not Approved' },
    ];
  }
  private mockStudentHistory(): HistoryItem[] {
    return [
      { ts: '2025-09-08T08:22:31+08:00', action: 'Submitted', by: 'Leader – Patricia Reyes', remarks: '', source: 'student' },
      { ts: '2025-09-08T09:25:03+08:00', action: 'Resubmitted', by: 'Leader – Patricia Reyes', remarks: '', source: 'student' },
    ];
  }
  private mockPanelHistory(): HistoryItem[] {
    return [
      { ts: '2025-09-08T09:18:47+08:00', action: 'Rejected', by: 'Faculty –', remarks: 'Missing References', source: 'panelist' },
      { ts: '2025-09-07T09:07:21+08:00', action: 'Ongoing', by: 'Faculty –', remarks: 'Under review', source: 'panelist' },
    ];
  }

  getMemberNames(): string {
    if (!this.group?.members || this.group.members.length === 0) {
      return '—';
    }
    return this.group.members.map(member => member.name).join(', ');
  }
}
