import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Navbar } from '../navbar/navbar';
import { Footer } from '../footer/footer';
import { Auth } from '../../service/auth';
import { S3Service } from '../../service/s3.service';
import { environment } from '../../../environments/environment';

interface DocumentType {
  type_id: string;
  type_name: string;
  required_files: {
    id: string;
    label: string;
    required: boolean;
    accept?: string;
  }[];
}

interface Requirement {
  _id?: string;
  document_type: string;
  required_metadata: string[];
  required_structured_fields?: {
    authors?: {
      enabled: boolean;
      min_count?: number;
      max_count?: number;
      require_firstname_lastname?: boolean;
    };
    panelists?: {
      enabled: boolean;
      min_count?: number;
      max_count?: number;
      require_firstname_lastname?: boolean;
    };
    tags?: {
      enabled: boolean;
      min_count?: number;
      max_count?: number;
      require_firstname_lastname?: boolean;
    };
  };
  required_files: {
    id: string;
    label: string;
    required: boolean;
    accept?: string;
  }[];
  created_by?: string;
  created_at?: Date;
  updated_at?: Date;
  is_active: boolean;
}

@Component({
  selector: 'app-new-submission',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, Navbar, Footer],
  templateUrl: './new-submission.html',
  styleUrls: ['./new-submission.css']
})
export class NewSubmission implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private authService = inject(Auth);
  private s3Service = inject(S3Service);

  // Step 1: Basic info
  currentStep = signal<number>(1);
  department = signal<string>('');
  program = signal<string>('');
  documentType = signal<string>('');
  
  // Step 2: Metadata
  title = signal<string>('');
  abstract = signal<string>('');
  authors = signal<string>(''); // Comma-separated
  tags = signal<string>(''); // Comma-separated
  adviser = signal<string>('');
  facultyInCharge = signal<string>('');
  panelists = signal<string>(''); // Comma-separated
  accessLevel = signal<string>('Full');
  
  // Step 3: Files
  uploadedFiles = signal<Map<string, File>>(new Map());
  uploadProgress = signal<Map<string, number>>(new Map());
  
  // Data
  documentTypes = signal<DocumentType[]>([]);
  requirements = signal<Requirement[]>([]);
  selectedDocType = computed(() => 
    this.documentTypes().find(dt => dt.type_id === this.documentType())
  );
  selectedRequirements = computed(() => 
    this.requirements().find(req => req.document_type === this.documentType())
  );
  
  // Duplicate warning
  duplicateWarning = signal<any[]>([]);
  showDuplicateWarning = signal<boolean>(false);
  
  // Loading
  loading = signal<boolean>(false);
  submitting = signal<boolean>(false);

  private apiUrl = `${environment.apiUrl}`;

  ngOnInit() {
    // Check if user is student (role 2)
    const user = this.authService.currentUser;
    if (!user || user.role_id !== 2) {
      alert('Only students can submit thesis documents.');
      this.router.navigate(['/home']);
      return;
    }

    this.loadDocumentTypes();
    this.loadRequirements();
  }

  loadDocumentTypes() {
    console.log('Loading document types from:', `${this.apiUrl}/document-types`);
    this.loading.set(true);
    this.http.get<{ success: boolean; data: DocumentType[] }>(
      `${this.apiUrl}/document-types`
    ).subscribe({
      next: (response) => {
        console.log('Document types loaded:', response);
        console.log('Document types data:', response.data);
        console.log('Document types count:', response.data.length);
        this.documentTypes.set(response.data);
        console.log('Document types signal after set:', this.documentTypes());
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading document types:', error);
        console.error('Error details:', error);
        alert('Failed to load document types: ' + error.message);
        this.loading.set(false);
      }
    });
  }

  loadRequirements() {
    console.log('Loading requirements from:', `${this.apiUrl}/requirements`);
    this.http.get<{ success: boolean; data: Requirement[] }>(
      `${this.apiUrl}/requirements`
    ).subscribe({
      next: (response) => {
        console.log('Requirements loaded:', response);
        this.requirements.set(response.data);
      },
      error: (error) => {
        console.error('Error loading requirements:', error);
        // Don't show alert for requirements as it's not critical for basic functionality
      }
    });
  }

  nextStep() {
    if (this.currentStep() === 1) {
      if (!this.department() || !this.program() || !this.documentType()) {
        alert('Please fill in all required fields');
        return;
      }
    } else if (this.currentStep() === 2) {
      if (!this.title() || !this.abstract() || !this.authors()) {
        alert('Please fill in all required fields');
        return;
      }
      // Check for duplicates
      this.checkDuplicates();
    }
    
    this.currentStep.update(step => step + 1);
  }

  previousStep() {
    this.currentStep.update(step => Math.max(1, step - 1));
  }

  checkDuplicates() {
    this.http.get<{ success: boolean; found: boolean; duplicates: any[] }>(
      `${this.apiUrl}/submissions/check-duplicates?title=${encodeURIComponent(this.title())}&authors=${encodeURIComponent(this.authors())}`
    ).subscribe({
      next: (response) => {
        if (response.found && response.duplicates.length > 0) {
          this.duplicateWarning.set(response.duplicates);
          this.showDuplicateWarning.set(true);
        }
      },
      error: (error) => {
        console.error('Error checking duplicates:', error);
      }
    });
  }

  onFileSelected(event: Event, fileId: string) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      // Validate PDF
      if (file.type !== 'application/pdf') {
        alert('Only PDF files are allowed');
        input.value = '';
        return;
      }

      this.uploadedFiles.update(files => {
        const newFiles = new Map(files);
        newFiles.set(fileId, file);
        return newFiles;
      });
    }
  }

  removeFile(fileId: string) {
    this.uploadedFiles.update(files => {
      const newFiles = new Map(files);
      newFiles.delete(fileId);
      return newFiles;
    });
  }

  async generateSubmissionId(): Promise<string> {
    const dept = this.department().toUpperCase();
    const prog = this.program().toUpperCase();
    
    try {
      const response = await this.http.get<{ success: boolean; submission_id: string }>(
        `${this.apiUrl}/submissions/generate-id/${dept}/${prog}`
      ).toPromise();
      
      if (response?.success && response.submission_id) {
        console.log('Generated submission ID from backend:', response.submission_id);
        return response.submission_id;
      } else {
        throw new Error('Failed to generate submission ID');
      }
    } catch (error) {
      console.error('Error generating submission ID from backend:', error);
      // Fallback to local generation
      const now = new Date();
      const year = now.getFullYear();
      const sequence = (now.getTime() % 10000).toString().padStart(4, '0');
      return `${year}-${dept}-${prog}-${sequence}`;
    }
  }

  async submitAll() {
    const docType = this.selectedDocType();
    if (!docType) return;

    // Validate all required files are uploaded
    const missingFiles = docType.required_files
      .filter(f => f.required)
      .filter(f => !this.uploadedFiles().has(f.id));

    if (missingFiles.length > 0) {
      alert(`Please upload all required files: ${missingFiles.map(f => f.label).join(', ')}`);
      return;
    }

    if (!confirm('Are you sure you want to submit? You cannot edit after submission.')) {
      return;
    }

    this.submitting.set(true);

    try {
      // Generate submission ID ONCE at the beginning
      const submissionId = await this.generateSubmissionId();
      console.log('Generated submission ID:', submissionId);
      
      // Upload all files to S3 using the same submission ID
      const fileUploads: Promise<{ fileId: string; s3Key: string }>[] = [];
      
      this.uploadedFiles().forEach((file, fileId) => {
        const uploadPromise = new Promise<{ fileId: string; s3Key: string }>((resolve, reject) => {
          // Use the same submission ID for all files
          const s3Key = `submission/${submissionId}/${file.name}`;
          console.log(`Uploading ${file.name} to: ${s3Key}`);
          
          // Get signed URL for upload
          this.s3Service.getSignedUrl(submissionId, file.name, file.type || 'application/pdf').subscribe({
            next: (response) => {
              const { uploadUrl } = response;
              
              // Upload to S3
              this.s3Service.uploadToS3(uploadUrl, file, file.type || 'application/pdf').subscribe({
                next: () => {
                  this.uploadProgress.update(map => {
                    const newMap = new Map(map);
                    newMap.set(fileId, 100);
                    return newMap;
                  });
                  resolve({ fileId, s3Key });
                },
                error: (error) => {
                  console.error('S3 upload error:', error);
                  reject(error);
                }
              });
            },
            error: (error) => {
              console.error('Error getting signed URL:', error);
              reject(error);
            }
          });
        });
        fileUploads.push(uploadPromise);
      });

      const uploadResults = await Promise.all(fileUploads);
      
      // Build files object
      const files: any = {};
      uploadResults.forEach(({ fileId, s3Key }) => {
        files[fileId] = { s3_key: s3Key };
      });
      
      // Prepare submission data
      const submissionData = {
        submission_id: submissionId,
        submitter_email: this.authService.currentUser?.email,
        document_type: this.documentType(),
        department: this.department(),
        program: this.program(),
        title: this.title(),
        abstract: this.abstract(),
        authors: this.authors().split(',').map(a => a.trim()),
        tags: this.tags() ? this.tags().split(',').map(t => t.trim()) : [],
        adviser: this.adviser(),
        faculty_in_charge: this.facultyInCharge(),
        panelists: this.panelists() ? this.panelists().split(',').map(p => p.trim()) : [],
        access_level: this.accessLevel(),
        files
      };

      // Submit to backend
      this.http.post<{ success: boolean; submission_id: string }>(
        `${this.apiUrl}/submissions/create`,
        submissionData
      ).subscribe({
        next: (response) => {
          alert(`Submission successful! Your submission ID is: ${response.submission_id}`);
          this.router.navigate(['/thank-you']);
        },
        error: (error) => {
          console.error('Error creating submission:', error);
          alert(error.error?.error || 'Failed to create submission');
          this.submitting.set(false);
        }
      });
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Failed to upload files. Please try again.');
      this.submitting.set(false);
    }
  }

  getFileProgress(fileId: string): number {
    return this.uploadProgress().get(fileId) || 0;
  }

  isFileUploaded(fileId: string): boolean {
    return this.uploadedFiles().has(fileId);
  }

  getFieldDisplayName(field: string): string {
    return field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}

