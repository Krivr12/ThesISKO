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
  submitted_at?: Date;
  created_at?: Date;
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
  
  // Get ALL fields from submission dynamically
  allSubmissionFields = computed(() => {
    const submission = this.submission();
    if (!submission) return [];
    
    // System fields to exclude
    const systemFields = ['_id', 'submission_id', 'submitter_email', 'document_type', 'files', 'status', 'chairperson_approval', 'dean_approval', 'created_at', 'updated_at', 'archived', 'archived_at', 'document_id'];
    
    return Object.entries(submission)
      .filter(([key, value]) => !systemFields.includes(key) && value !== null && value !== undefined && value !== '')
      .map(([key, value]) => ({ 
        name: key, 
        value, 
        type: this.detectFieldType(value),
        displayName: this.getFieldDisplayName(key)
      }));
  });

  // Categorize fields automatically
  metadataFields = computed(() => {
    return this.allSubmissionFields().filter(field => this.isMetadataField(field));
  });

  contentFields = computed(() => {
    return this.allSubmissionFields().filter(field => this.isContentField(field));
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

    this.http.patch(endpoint, payload, {
      withCredentials: true // Include cookies in request
    }).subscribe({
      next: () => {
        alert('Submission approved successfully!');
        this.router.navigate(['/adminSide/approvals']);
      },
      error: (error) => {
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

    this.http.patch(endpoint, payload, {
      withCredentials: true // Include cookies in request
    }).subscribe({
      next: () => {
        alert('Submission rejected. Student will be notified to resubmit the specified files.');
        this.router.navigate(['/adminSide/approvals']);
      },
      error: (error) => {
        alert(error.error?.error || 'Failed to reject submission');
        this.loading.set(false);
      }
    });
  }

  goBack() {
    this.router.navigate(['/adminSide/approvals']);
  }

  formatDate(date: Date | string | undefined | null): string {
    if (!date) return 'N/A';
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        return 'N/A';
      }
      
      // Format as "12 Nov 2024"
      const day = dateObj.getDate();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[dateObj.getMonth()];
      const year = dateObj.getFullYear();
      
      return `${day} ${month} ${year}`;
    } catch (error) {
      return 'N/A';
    }
  }

  // Get submission date - prefer created_at, fallback to submitted_at
  getSubmissionDate(): Date | string | undefined {
    const submission = this.submission();
    if (!submission) return undefined;
    
    // Prefer created_at, fallback to submitted_at
    return submission.created_at || submission.submitted_at;
  }

  loadRequirements() {
    this.http.get<{ success: boolean; data: any[] }>(`${environment.apiUrl}/requirements`)
      .subscribe({
        next: (response) => {
          this.requirements.set(response.data);
        },
        error: (error) => {
          // Silently fail - requirements are optional
        }
      });
  }

  getFieldDisplayName(field: string): string {
    return field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  // Detect field type based on value
  detectFieldType(value: any): string {
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'string') {
      if (value.length > 200) return 'longtext';
      return 'text';
    }
    return 'text';
  }

  // Determine if field is metadata (basic info)
  isMetadataField(field: any): boolean {
    const metadataFields = ['department', 'program', 'access_level', 'year', 'adviser', 'faculty_in_charge'];
    return metadataFields.includes(field.name) || field.type === 'number' || field.type === 'boolean';
  }

  // Determine if field is content (rich content)
  isContentField(field: any): boolean {
    const contentFields = ['title', 'abstract', 'authors', 'tags', 'panelists'];
    return contentFields.includes(field.name) || field.type === 'array' || field.type === 'longtext';
  }

  // Format field value for display
  formatFieldValue(field: any): string {
    if (Array.isArray(field.value)) {
      return field.value.join(', ');
    }
    if (typeof field.value === 'boolean') {
      return field.value ? 'Yes' : 'No';
    }
    return field.value.toString();
  }

  getDynamicFieldValue(fieldName: string): any {
    const submission = this.submission();
    if (!submission) return '';
    return submission[fieldName] || '';
  }

  getAuthorsDisplay(): string {
    const submission = this.submission();
    if (!submission) return 'N/A';
    
    if (Array.isArray(submission.authors)) {
      return submission.authors.join(', ');
    }
    
    if (typeof submission.authors === 'string') {
      return submission.authors;
    }
    
    return 'N/A';
  }

  getPanelistsDisplay(): string {
    const submission = this.submission();
    if (!submission) return 'N/A';
    
    if (Array.isArray(submission.panelists)) {
      return submission.panelists.length > 0 ? submission.panelists.join(', ') : 'N/A';
    }
    
    if (typeof submission.panelists === 'string') {
      return submission.panelists;
    }
    
    return 'N/A';
  }
}

