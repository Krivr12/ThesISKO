import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AdminSideNav } from '../admin-side-nav/admin-side-nav';
import { Auth } from '../../service/auth';
import { S3Service } from '../../service/s3.service';
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
  year?: string;
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
  // Dynamic metadata fields (any additional fields from requirements)
  [key: string]: any;
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
  private sanitizer = inject(DomSanitizer);
  private s3Service = inject(S3Service);

  submission = signal<Submission | null>(null);
  duplicateSubmissions = signal<any[]>([]);
  loading = signal<boolean>(false);
  showRejectModal = signal<boolean>(false);
  rejectionReason = signal<string>('');
  selectedFiles = signal<FileRequirement[]>([]);
  
  // Requirements for dynamic field display
  requirements = signal<any[]>([]);
  selectedRequirements = signal<any | null>(null);

  // PDF Viewer state
  isPdfViewerVisible = signal<boolean>(false);
  currentPdfDocument = signal<{ name: string; file: string } | null>(null);
  currentPdfUrl = signal<SafeResourceUrl | null>(null);
  pdfLoading = signal<boolean>(false);
  pdfError = signal<string>('');

  currentUser = computed(() => this.authService.currentUser);
  isDean = computed(() => this.currentUser()?.role_id === 5);
  isChairperson = computed(() => this.currentUser()?.role_id === 4);
  userRole = computed(() => this.isDean() ? 'Dean' : 'Chairperson');
  
  // Get dynamic metadata fields that are not handled by hardcoded fields
  dynamicMetadataFields = computed(() => {
    const requirements = this.selectedRequirements();
    if (!requirements) return [];
    
    const hardcodedFields = ['title', 'abstract', 'authors', 'tags', 'year', 'adviser', 'faculty_in_charge', 'panelists', 'access_level', 'department', 'program', 'submitter_email', 'submitted_at', 'document_type', 'submission_id', 'files', 'status', 'chairperson_approval', 'dean_approval'];
    return requirements.required_metadata.filter((field: string) => !hardcodedFields.includes(field));
  });

  private apiUrl = `${environment.apiUrl}/submissions`;

  ngOnInit() {
    const submissionId = this.route.snapshot.paramMap.get('id');
    if (submissionId) {
      this.loadSubmission(submissionId);
    }
    
    // Load requirements for dynamic field display
    this.loadRequirements();
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
        
        // Set selected requirements for dynamic field display
        const submission = response.data;
        const requirements = this.requirements();
        const selectedReq = requirements.find(req => req.document_type === submission.document_type);
        this.selectedRequirements.set(selectedReq || null);
        
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

  viewFile(fileId: string, s3Key: string) {
    this.currentPdfDocument.set({ 
      name: this.formatFileLabel(fileId), 
      file: s3Key 
    });
    this.isPdfViewerVisible.set(true);
    this.pdfLoading.set(true);
    this.pdfError.set('');

    // Use S3Service to get signed URL
    this.s3Service.getSubmissionFileSignedUrl(s3Key).subscribe({
      next: (response) => {
        this.currentPdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(response.signedUrl));
        this.pdfLoading.set(false);
      },
      error: (error) => {
        console.error('Error getting file URL:', error);
        this.pdfLoading.set(false);
        this.pdfError.set('Failed to load document. The file may be unavailable.');
      }
    });
  }

  onPdfLoad(): void {
    this.pdfLoading.set(false);
  }

  onPdfError(): void {
    this.pdfLoading.set(false);
    this.pdfError.set('Failed to load document. The file may be unavailable.');
  }

  closePdfViewer(): void {
    this.isPdfViewerVisible.set(false);
    this.currentPdfDocument.set(null);
    this.currentPdfUrl.set(null);
    this.pdfLoading.set(false);
    this.pdfError.set('');
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
        
        // Handle specific error cases
        if (error.error?.error === 'Approval recorded but archiving failed') {
          const details = error.error?.details || 'Unknown archiving error';
          alert(`⚠️ Approval recorded but archiving failed.\n\nDetails: ${details}\n\nThe submission has been approved but may need manual archiving.`);
        } else if (error.error?.details?.includes('Missing required archive files')) {
          const details = error.error?.details || 'Unknown archiving error';
          alert(`⚠️ Approval failed due to missing archive files.\n\nDetails: ${details}\n\nPlease ensure all required files are uploaded before approval.`);
        } else {
          alert(error.error?.error || 'Failed to approve submission');
        }
        
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

  loadRequirements() {
    this.http.get<{ success: boolean; data: any[] }>(`${environment.apiUrl}/requirements`)
      .subscribe({
        next: (response) => {
          this.requirements.set(response.data);
        },
        error: (error) => {
          console.error('Error loading requirements:', error);
        }
      });
  }

  getFieldDisplayName(field: string): string {
    return field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  getDynamicFieldValue(fieldName: string): any {
    const submission = this.submission();
    if (!submission) return '';
    return submission[fieldName] || '';
  }
}

