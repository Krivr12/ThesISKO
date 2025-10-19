import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { AdminSideNav } from '../admin-side-nav/admin-side-nav';
import { Auth } from '../../service/auth';
import { environment } from '../../../environments/environment';

interface FileRequirement {
  id: string;
  label: string;
  s3_key?: string;
  uploaded_at?: Date;
  needsResubmit?: boolean;
}

interface Submission {
  submission_id: string;
  title: string;
  abstract: string;
  authors: string[];
  tags: string[];
  adviser: string;
  faculty_in_charge: string;
  panelists: string[];
  department: string;
  program: string;
  access_level: string;
  document_type: string;
  submitter_email: string;
  submitted_at: Date;
  files: any;
  status: string;
  chairperson_approval?: any;
  dean_approval?: any;
}

@Component({
  selector: 'app-approval-details',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule, AdminSideNav],
  templateUrl: './approval-details.html',
  styleUrls: ['./approval-details.css']
})
export class ApprovalDetails implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(Auth);

  submission = signal<Submission | null>(null);
  duplicateSubmissions = signal<any[]>([]);
  loading = signal<boolean>(false);
  showRejectModal = signal<boolean>(false);
  rejectionReason = signal<string>('');
  selectedFiles = signal<FileRequirement[]>([]);

  currentUser = computed(() => this.authService.currentUser);
  isDean = computed(() => this.currentUser()?.role_id === 5);
  isChairperson = computed(() => this.currentUser()?.role_id === 4);
  userRole = computed(() => this.isDean() ? 'Dean' : 'Chairperson');

  private apiUrl = `${environment.apiUrl}/submissions`;
  private s3ApiUrl = `${environment.apiUrl}/s3`;

  ngOnInit() {
    const submissionId = this.route.snapshot.paramMap.get('id');
    if (submissionId) {
      this.loadSubmission(submissionId);
    }
  }

  loadSubmission(submissionId: string) {
    this.loading.set(true);
    
    this.http.get<{ success: boolean; data: Submission; potential_duplicates: any[] }>(
      `${this.apiUrl}/${submissionId}`
    ).subscribe({
      next: (response) => {
        this.submission.set(response.data);
        this.duplicateSubmissions.set(response.potential_duplicates || []);
        this.initializeFilesList();
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading submission:', error);
        alert('Failed to load submission details');
        this.router.navigate(['/adminSide/approvals']);
        this.loading.set(false);
      }
    });
  }

  initializeFilesList() {
    const submission = this.submission();
    if (!submission) return;

    const filesList: FileRequirement[] = [];
    
    Object.entries(submission.files).forEach(([id, fileData]: [string, any]) => {
      filesList.push({
        id,
        label: this.formatFileLabel(id),
        s3_key: fileData.s3_key,
        uploaded_at: fileData.uploaded_at,
        needsResubmit: false
      });
    });

    this.selectedFiles.set(filesList);
  }

  formatFileLabel(id: string): string {
    return id.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  async downloadFile(fileId: string, s3Key: string) {
    try {
      const response = await this.http.get<{ url: string }>(
        `${this.s3ApiUrl}/presigned-url?key=${encodeURIComponent(s3Key)}`
      ).toPromise();

      if (response?.url) {
        window.open(response.url, '_blank');
      }
    } catch (error) {
      console.error('Error getting download URL:', error);
      alert('Failed to download file');
    }
  }

  approveSubmission() {
    if (!confirm('Are you sure you want to approve this submission?')) {
      return;
    }

    const submission = this.submission();
    const user = this.currentUser();
    if (!submission || !user) return;

    this.loading.set(true);

    const endpoint = this.isDean()
      ? `${this.apiUrl}/${submission.submission_id}/dean-approve`
      : `${this.apiUrl}/${submission.submission_id}/chairperson-approve`;

    const payload = this.isDean()
      ? { dean_name: `${user.Firstname || user.firstname} ${user.Lastname || user.lastname}` }
      : { chairperson_name: `${user.Firstname || user.firstname} ${user.Lastname || user.lastname}` };

    this.http.patch(endpoint, payload).subscribe({
      next: () => {
        alert('Submission approved successfully!');
        this.router.navigate(['/adminSide/approvals']);
      },
      error: (error) => {
        console.error('Error approving submission:', error);
        alert(error.error?.error || 'Failed to approve submission');
        this.loading.set(false);
      }
    });
  }

  openRejectModal() {
    this.showRejectModal.set(true);
    this.rejectionReason.set('');
    // Reset file flags
    this.selectedFiles.update(files => 
      files.map(f => ({ ...f, needsResubmit: false }))
    );
  }

  closeRejectModal() {
    this.showRejectModal.set(false);
  }

  toggleFileForResubmission(index: number) {
    this.selectedFiles.update(files => {
      const updated = [...files];
      updated[index].needsResubmit = !updated[index].needsResubmit;
      return updated;
    });
  }

  confirmReject() {
    const reason = this.rejectionReason().trim();
    if (!reason) {
      alert('Please provide a reason for rejection');
      return;
    }

    const filesToResubmit = this.selectedFiles()
      .filter(f => f.needsResubmit)
      .map(f => f.id);

    if (filesToResubmit.length === 0) {
      alert('Please select at least one file that needs resubmission');
      return;
    }

    const submission = this.submission();
    const user = this.currentUser();
    if (!submission || !user) return;

    this.loading.set(true);

    const endpoint = this.isDean()
      ? `${this.apiUrl}/${submission.submission_id}/dean-reject`
      : `${this.apiUrl}/${submission.submission_id}/chairperson-reject`;

    const payload = this.isDean()
      ? {
          dean_name: `${user.Firstname || user.firstname} ${user.Lastname || user.lastname}`,
          reason,
          rejected_files: filesToResubmit
        }
      : {
          chairperson_name: `${user.Firstname || user.firstname} ${user.Lastname || user.lastname}`,
          reason,
          rejected_files: filesToResubmit
        };

    this.http.patch(endpoint, payload).subscribe({
      next: () => {
        alert('Submission rejected. Student will be notified to resubmit the specified files.');
        this.router.navigate(['/adminSide/approvals']);
      },
      error: (error) => {
        console.error('Error rejecting submission:', error);
        alert(error.error?.error || 'Failed to reject submission');
        this.loading.set(false);
      }
    });
  }

  goBack() {
    this.router.navigate(['/adminSide/approvals']);
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

