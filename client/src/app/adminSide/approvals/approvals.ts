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
  filterDepartment = signal<string>('');
  filterDocumentType = signal<string>('');

  currentUser = computed(() => this.authService.currentUser);
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

    // Department filter
    if (this.filterDepartment()) {
      results = results.filter(s => s.department === this.filterDepartment());
    }

    // Document type filter
    if (this.filterDocumentType()) {
      results = results.filter(s => s.document_type === this.filterDocumentType());
    }

    return results;
  });

  private apiUrl = `${environment.apiUrl}/submissions`;

  ngOnInit() {
    this.loadSubmissions();
  }

  loadSubmissions() {
    const user = this.currentUser();
    if (!user || !user.email) {
      alert('User not logged in');
      return;
    }

    this.loading.set(true);

    const endpoint = this.isDean() 
      ? `${this.apiUrl}/pending-dean/${user.email}`
      : `${this.apiUrl}/pending-chairperson/${user.email}`;

    this.http.get<{ success: boolean; data: Submission[] }>(endpoint)
      .subscribe({
        next: (response) => {
          this.submissions.set(response.data);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading submissions:', error);
          alert('Failed to load submissions');
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

