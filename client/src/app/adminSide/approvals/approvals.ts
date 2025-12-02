import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { AdminSideNav } from '../admin-side-nav/admin-side-nav';
import { Auth } from '../../service/auth';
import { environment } from '../../../environments/environment';
import { createLogger } from '../../utils/logger';

const log = createLogger('Approvals');

interface Submission {
  submission_id: string;
  title: string;
  authors: string[];
  document_type: string;
  department: string;
  program: string;
  submitter_email: string;
  submitted_at: Date;
  status: string;
  chairperson_approval?: any;
  dean_approval?: any;
  program_info?: {
    program_name: string;
    department_name: string;
    chairperson_email: string;
  };
}

@Component({
  selector: 'app-approvals',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule, AdminSideNav],
  templateUrl: './approvals.html',
  styleUrls: ['./approvals.css']
})
export class Approvals implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private authService = inject(Auth);

  submissions = signal<Submission[]>([]);
  loading = signal<boolean>(false);
  searchTerm = signal<string>('');
  filterDocumentType = signal<string>('');
  documentTypes = signal<string[]>([]);
  loadingDocumentTypes = signal<boolean>(false);

  currentUser = signal<any>(null);
  isDean = computed(() => this.currentUser()?.role_id === 5);
  isChairperson = computed(() => this.currentUser()?.role_id === 4);
  userRole = computed(() => this.isDean() ? 'Dean' : 'Chairperson');
  
  // Helper to get user email (case-insensitive)
  private getUserEmail(user: any): string | null {
    if (!user) return null;
    return user.Email || user.email || null;
  }

  // Filtered submissions
  filteredSubmissions = computed(() => {
    let results = this.submissions();
    
    // Search filter
    const search = this.searchTerm().toLowerCase();
    if (search) {
      results = results.filter(s => 
        s.title.toLowerCase().includes(search) ||
        s.authors.some(a => a.toLowerCase().includes(search)) ||
        s.submission_id.toLowerCase().includes(search)
      );
    }

    // Document type filter
    if (this.filterDocumentType()) {
      results = results.filter(s => s.document_type === this.filterDocumentType());
    }

    return results;
  });

  private apiUrl = `${environment.apiUrl}/submissions`;
  private requirementsUrl = `${environment.apiUrl}/requirements`;

  ngOnInit() {
    // Load document types on component init
    this.loadDocumentTypes();
    
    // Ensure auth service is initialized
    this.authService.initializeUser().catch(err => {
      log.error('Error initializing user:', err);
    });
    
    // Check if user is already available (synchronous check)
    const currentUser = this.authService.currentUser;
    if (currentUser) {
      this.currentUser.set(currentUser);
      const userEmail = this.getUserEmail(currentUser);
      if (userEmail) {
        this.loadSubmissions();
      }
    }
    
    // Subscribe to auth service to get current user updates
    this.authService.currentUser$.subscribe(user => {
      this.currentUser.set(user);
      
      // Get email (case-insensitive check)
      const userEmail = this.getUserEmail(user);
      
      if (user && userEmail) {
        // Only load if we haven't loaded yet or if user changed
        if (this.submissions().length === 0 && !this.loading()) {
          this.loadSubmissions();
        }
      }
    });
  }
  
  /**
   * Load submissions from a specific endpoint
   * @param endpoint - The API endpoint to call
   */
  private loadSubmissionsFromEndpoint(endpoint: string) {
    this.http.get<{ success: boolean; data: Submission[] }>(endpoint, {
      withCredentials: true // Include cookies in request
    })
      .subscribe({
        next: (response) => {
          // Set submissions data
          this.submissions.set(response.data || []);
          this.loading.set(false);
        },
        error: (error) => {
          // 401 means not authenticated - don't show alert, let guard handle it
          if (error.status === 401) {
            this.submissions.set([]);
            this.loading.set(false);
          } else if (error.status === 403) {
            // 403 Forbidden - user doesn't have access to this endpoint
            this.submissions.set([]);
            this.loading.set(false);
          } else if (error.status !== 0) {
            // Only show alert for non-network errors (status 0 = network error)
            alert('Failed to load submissions: ' + (error.error?.error || error.message));
            this.submissions.set([]);
            this.loading.set(false);
          } else {
            // Network error - clear loading state
            this.loading.set(false);
          }
        }
      });
  }

  loadDocumentTypes() {
    this.loadingDocumentTypes.set(true);
    
    this.http.get<{ success: boolean; data: string[] }>(`${this.requirementsUrl}/document-types`)
      .subscribe({
        next: (response) => {
          this.documentTypes.set(response.data || []);
          this.loadingDocumentTypes.set(false);
        },
        error: (error) => {
          log.error('Error loading document types:', error);
          this.loadingDocumentTypes.set(false);
        }
      });
  }

  loadSubmissions() {
    // Don't load if already loading
    if (this.loading()) {
      return;
    }
    
    const user = this.currentUser();
    const userEmail = this.getUserEmail(user);
    
    // If user is not available, wait for it to load
    // The subscription will retry when user becomes available
    if (!user || !userEmail) {
      return;
    }

    // Use the role-specific API endpoints (email removed from URL - comes from auth cookie)
    const endpoint = this.isDean() 
      ? `${this.apiUrl}/pending-dean`
      : `${this.apiUrl}/pending-chairperson`;

    this.loadSubmissionsFromEndpoint(endpoint);
  }

  viewDetails(submissionId: string) {
    this.router.navigate(['/adminSide/approvals', submissionId]);
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'pending_chairperson':
        return 'badge-warning';
      case 'pending_dean':
        return 'badge-info';
      case 'approved':
        return 'badge-success';
      case 'rejected_by_chairperson':
      case 'rejected_by_dean':
        return 'badge-danger';
      default:
        return 'badge-default';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'pending_chairperson':
        return 'Pending Chairperson';
      case 'pending_dean':
        return 'Pending Dean';
      case 'approved':
        return 'Approved';
      case 'rejected_by_chairperson':
        return 'Rejected by Chairperson';
      case 'rejected_by_dean':
        return 'Rejected by Dean';
      default:
        return status;
    }
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

