import { Component, OnInit, ViewChild, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationStart } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { filter } from 'rxjs/operators';

/* Angular Material */
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

import { Sidenavbar } from '../sidenavbar/sidenavbar';

interface Group {
  group_id: string;
  block_id: string;       // e.g., 2425-IT-3B
  course: string;         // BSIT | BSCS
  title: string;
  abstract: string;
  submitted_at: string;   // date string
  leader: string;
  members: string[];
  leader_email: string;
  member_emails: string[];
  status: string;         // approved | ongoing | rejected | pending | for approval | pending approval
  panelist: string;
  facultyid: string;
}

type Stats = {
  total: number;
  approved: number;
  rejected: number;
  ongoing: number;
  pendingToCheck: number;
  approvedPercent: number;
  rejectedPercent: number;
  ongoingPercent: number;
  byStatus: Record<string, number>;
};

@Component({
  selector: 'app-faculty-home',
  standalone: true,
  imports: [
    CommonModule, RouterModule, HttpClientModule,
    MatSidenavModule, MatToolbarModule, MatButtonModule, MatIconModule,
    MatTableModule, MatFormFieldModule, MatSelectModule, MatOptionModule,
    MatPaginatorModule, MatSortModule, MatInputModule, Sidenavbar
  ],
  templateUrl: './faculty-home.html',
  styleUrls: ['./faculty-home.css'],
})
export class FacultyHome implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['group_id', 'title', 'leader', 'status'];

  dataSource = new MatTableDataSource<Group>([]);
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  public stats: Stats = {
    total: 0, approved: 0, rejected: 0, ongoing: 0, pendingToCheck: 0,
    approvedPercent: 0, rejectedPercent: 0, ongoingPercent: 0, byStatus: {},
  };
  public pendingList: Group[] = [];
  public facultyName: string = 'Faculty Member'; // Default name
  private isLoggingOut: boolean = false; // Flag to prevent multiple dialogs
  private isLogoutInProgress: boolean = false; // Flag to prevent auth checks during logout
  private hasShownAuthAlert: boolean = false; // Flag to prevent repeated auth alerts

  constructor(private http: HttpClient, private router: Router) {
    // Remove immediate auth check from constructor to prevent issues
  }

  ngOnInit(): void {
    // Check if user is still logged in
    this.checkAuthStatus();
    
    // Get faculty name from session storage
    this.getFacultyName();
    
    // Check if user is trying to access signup-choose directly
    this.checkCurrentRoute();
    
    // Add global authentication check on focus/visibility change
    this.addGlobalAuthCheck();
    
    // Listen for navigation events
    this.router.events
      .pipe(filter(event => event instanceof NavigationStart))
      .subscribe((event: NavigationStart) => {
        // Check if trying to navigate outside faculty side and not already logging out
        if (this.isOutsideFacultySide(event.url) && !this.isLoggingOut) {
          // Prevent the navigation by replacing current state
          history.replaceState(null, '', window.location.href);
          
          // Show confirmation dialog
          const confirmed = window.confirm('Do you want to logout?');
          
          if (confirmed) {
            // User confirmed logout
            this.isLoggingOut = true;
            this.isLogoutInProgress = true; // Set flag to prevent auth checks
            this.logout();
          } else {
            // User cancelled - ensure we stay on faculty page
            this.isLoggingOut = false;
            // Force navigation back to faculty home
            this.router.navigate(['/faculty-home']);
          }
        }
      });

    // Reset logout flag periodically to prevent it from getting stuck
    setInterval(() => {
      if (this.isLoggingOut && this.isOnFacultyPage()) {
        this.isLoggingOut = false;
      }
    }, 5000); // Reset every 5 seconds if still on faculty page
    
    // Put groups.json in src/assets/ (or move public/ to project root and use '/groups.json')
    this.http.get<Group[]>('groups.json').subscribe({
      next: (rows) => {
        // Minimal normalize
        const normalized: Group[] = (rows || []).map((r) => ({
          ...r,
          group_id: String(r.group_id ?? ''),
          block_id: String(r.block_id ?? ''),
          title: String(r.title ?? ''),
          leader: String(r.leader ?? ''),
          status: String(r.status ?? '').toLowerCase(),
          submitted_at: String(r.submitted_at ?? ''),
        }));
        this.dataSource.data = normalized;

        // Filter across fields
        this.dataSource.filterPredicate = (d: Group, f: string) => {
          const v = (f || '').toLowerCase().trim();
          return (
            d.group_id.toLowerCase().includes(v) ||
            d.title.toLowerCase().includes(v) ||
            d.leader.toLowerCase().includes(v) ||
            d.status.toLowerCase().includes(v)
          );
        };

        // Sort strings case-insensitively
        this.dataSource.sortingDataAccessor = (d: Group, col: string) =>
          (d as any)[col]?.toString().toLowerCase() ?? '';

        this.recalcStats(); // initial stats
      },
      error: (err) => console.error('Could not load assets/groups.json', err),
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  applyFilter(value: string): void {
    this.dataSource.filter = (value || '').trim().toLowerCase();
    this.paginator?.firstPage();
    this.recalcStats();
  }

  viewGroup(element: Group) {
    console.log('Viewing group:', element);
    // this.router.navigate(['/history', element.group_id]);
  }

  /* === stats + pending === */
  private recalcStats(): void {
    const rows = this.dataSource.filteredData?.length
      ? this.dataSource.filteredData
      : this.dataSource.data;

    const byStatus: Record<string, number> = {};
    const norm = (s: string) => (s || '').trim().toLowerCase();

    for (const r of rows) {
      const key = norm(r.status);
      byStatus[key] = (byStatus[key] || 0) + 1;
    }

    const total = rows.length;
    const approved = byStatus['approved'] || 0;
    const rejected = byStatus['rejected'] || 0;
    const ongoing = byStatus['ongoing'] || 0;

    const pendingSet = new Set(['pending', 'pending approval', 'for approval']);
    const pendingList = rows
      .filter((r) => pendingSet.has(norm(r.status)))
      .sort((a, b) => this.parseDate(a.submitted_at) - this.parseDate(b.submitted_at));

    const pct = (n: number, t: number) => (t ? Math.round((n * 1000) / t) / 10 : 0);

    this.stats = {
      total,
      approved,
      rejected,
      ongoing,
      pendingToCheck: pendingList.length,
      approvedPercent: pct(approved, total),
      rejectedPercent: pct(rejected, total),
      ongoingPercent: pct(ongoing, total),
      byStatus,
    };

    this.pendingList = pendingList;
  }

  private parseDate(d: string): number {
    const t = Date.parse(d);
    return Number.isNaN(t) ? 0 : t;
  }

  private getFacultyName(): void {
    try {
      const userData = sessionStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        // Get firstname and lastname from the user data
        const firstName = user.Firstname || user.firstname || '';
        const lastName = user.Lastname || user.lastname || '';
        
        if (firstName && lastName) {
          this.facultyName = `${firstName} ${lastName}`;
        } else if (firstName) {
          this.facultyName = firstName;
        } else {
          this.facultyName = 'Faculty Member';
        }
      }
    } catch (error) {
      console.error('Error getting faculty name:', error);
      this.facultyName = 'Faculty Member';
    }
  }


  @HostListener('window:beforeunload', ['$event'])
  beforeUnloadHandler(event: BeforeUnloadEvent) {
    // This handles browser refresh/close
    return false;
  }


  private checkAuthStatus(): void {
    // Skip auth check if logout is in progress
    if (this.isLogoutInProgress) return;
    
    // Check if user is still logged in
    const user = sessionStorage.getItem('user');
    const role = sessionStorage.getItem('role');
    
    if (!user || !role || role.toLowerCase() !== 'faculty') {
      // User is not logged in or not a faculty member
      if (!this.hasShownAuthAlert) {
        this.hasShownAuthAlert = true;
        alert('You are not logged in. Please login first.');
        // Use setTimeout to allow alert to be dismissed before redirect
        setTimeout(() => {
          window.location.href = '/signup-choose';
        }, 100);
      }
      return;
    }
  }

  private addGlobalAuthCheck(): void {
    // Only check authentication when window gains focus (not periodically)
    window.addEventListener('focus', () => {
      // Only check if not already showing alert and not logging out
      if (!this.hasShownAuthAlert && !this.isLogoutInProgress) {
        this.checkAuthStatus();
      }
    });
    
    // Check authentication when page becomes visible (but only once)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && !this.hasShownAuthAlert && !this.isLogoutInProgress) {
        this.checkAuthStatus();
      }
    });
    
    // Remove periodic checks to prevent repeated alerts
    // setInterval(() => {
    //   this.checkAuthStatus();
    // }, 5000);
  }

  private checkCurrentRoute(): void {
    // Check if the current URL is outside faculty side
    if (this.isOutsideFacultySide(window.location.pathname)) {
      const confirmed = window.confirm('Do you want to logout?');
      
      if (confirmed) {
        // User confirmed logout
        this.isLoggingOut = true;
        this.isLogoutInProgress = true; // Set flag to prevent auth checks
        this.logout();
      } else {
        // User cancelled - navigate back to faculty home
        this.isLoggingOut = false;
        this.router.navigate(['/faculty-home']);
      }
    }
  }

  private isOutsideFacultySide(url: string): boolean {
    // Define faculty-side allowed routes
    const facultyRoutes = [
      '/faculty-home',
      '/for-fic',
      '/for-panel',
      '/panelist-approval-page',
      '/fichistory-page'
    ];
    
    // Check if the URL is outside faculty side
    const isOutsideFaculty = !facultyRoutes.some(route => url.includes(route));
    
    // Also check for specific non-faculty routes
    const nonFacultyRoutes = [
      '/login',
      '/login-admin',
      '/login-faculty',
      '/signup',
      '/signup-choose',
      '/home',
      '/search-thesis',
      '/search-result',
      '/submission',
      '/thank-you',
      '/about-us'
    ];
    
    const isNonFacultyRoute = nonFacultyRoutes.some(route => url.includes(route));
    
    return isOutsideFaculty || isNonFacultyRoute;
  }

  private isOnFacultyPage(): boolean {
    const currentUrl = window.location.pathname;
    const facultyRoutes = [
      '/faculty-home',
      '/for-fic',
      '/for-panel',
      '/panelist-approval-page',
      '/fichistory-page'
    ];
    
    return facultyRoutes.some(route => currentUrl.includes(route));
  }


  private logout(): void {
    // Set flag to prevent auth checks during logout
    this.isLogoutInProgress = true;
    
    // Clear session storage
    sessionStorage.removeItem('email');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('role');
    
    // Use window.location for more reliable navigation
    window.location.href = '/signup-choose';
  }
}
