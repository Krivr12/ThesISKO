import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { AdminSideNav } from '../admin-side-nav/admin-side-nav';
import { Auth } from '../../service/auth';
import { environment } from '../../../environments/environment';

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
    console.log('Approvals component initialized');
    // Load document types on component init
    this.loadDocumentTypes();
    
    // Subscribe to auth service to get current user
    this.authService.currentUser$.subscribe(user => {
      console.log('Auth service user update:', user);
      console.log('User exists:', !!user);
      console.log('User email:', user?.Email);
      console.log('User email type:', typeof user?.Email);
      console.log('User email truthy:', !!user?.Email);
      this.currentUser.set(user);
      if (user && user.Email) {
        console.log('User authenticated, loading submissions for:', user.Email);
        this.loadSubmissions();
      } else {
        console.log('No user or no email, not loading submissions');
        console.log('User object keys:', user ? Object.keys(user) : 'null');
      }
    });
  }

  loadDocumentTypes() {
    this.loadingDocumentTypes.set(true);
    console.log('Loading document types from:', `${this.requirementsUrl}/document-types`);
    
    this.http.get<{ success: boolean; data: string[] }>(`${this.requirementsUrl}/document-types`)
      .subscribe({
        next: (response) => {
          console.log('Document types loaded:', response);
          this.documentTypes.set(response.data || []);
          this.loadingDocumentTypes.set(false);
        },
        error: (error) => {
          console.error('Error loading document types:', error);
          // Don't show alert, just log error and continue
          this.loadingDocumentTypes.set(false);
        }
      });
  }

  loadSubmissions() {
    const user = this.currentUser();
    if (!user || !user.Email) {
      alert('User not logged in');
      return;
    }

    this.loading.set(true);

    // Use the role-specific API endpoints that handle filtering on the backend
    const endpoint = this.isDean() 
      ? `${this.apiUrl}/pending-dean/${user.Email}`
      : `${this.apiUrl}/pending-chairperson/${user.Email}`;

    console.log('Loading submissions from:', endpoint);

    this.http.get<{ success: boolean; data: Submission[] }>(endpoint)
      .subscribe({
        next: (response) => {
          console.log('Submissions loaded:', response);
          this.submissions.set(response.data);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading submissions:', error);
          alert('Failed to load submissions: ' + error.message);
          this.loading.set(false);
        }
      });
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

