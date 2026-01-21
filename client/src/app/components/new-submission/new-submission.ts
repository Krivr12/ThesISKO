import { Component, OnInit, signal, computed, inject, effect } from '@angular/core';
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
  year = signal<string>('');
  adviser = signal<string>('');
  facultyInCharge = signal<string>('');
  panelists = signal<string>(''); // Comma-separated
  accessLevel = signal<string>('Full');
  
  // Dynamic metadata fields - now handles all dynamic fields
  dynamicMetadata = signal<Map<string, string>>(new Map());
  
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
  
  // Get ALL dynamic fields from requirements (both metadata and structured fields)
  allDynamicFields = computed(() => {
    const requirements = this.selectedRequirements();
    if (!requirements) return [];
    
    const fields: Array<{
      name: string;
      type: 'metadata' | 'structured';
      enabled: boolean;
      required: boolean;
      fieldType: string;
      placeholder?: string;
      min_count?: number;
      max_count?: number;
      require_firstname_lastname?: boolean;
    }> = [];
    
    // Process required_metadata fields
    if (requirements.required_metadata) {
      requirements.required_metadata.forEach(field => {
        fields.push({
          name: field,
          type: 'metadata',
          enabled: true,
          required: true,
          fieldType: this.getFieldTypeFromName(field)
        });
      });
    }
    
    // Process required_structured_fields
    if (requirements.required_structured_fields) {
      Object.entries(requirements.required_structured_fields).forEach(([fieldName, config]) => {
        if (config.enabled) {
          fields.push({
            name: fieldName,
            type: 'structured',
            enabled: true,
            required: true,
            fieldType: this.getFieldTypeFromName(fieldName),
            min_count: config.min_count,
            max_count: config.max_count,
            require_firstname_lastname: config.require_firstname_lastname
          });
        }
      });
    }
    
    return fields;
  });
  
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
    
    // Watch for document type changes and load specific requirements
    effect(() => {
      const newDocType = this.documentType();
      if (newDocType) {
        this.loadRequirementsForDocumentType(newDocType);
      }
    });
  }

  loadDocumentTypes() {
    this.loading.set(true);
    this.http.get<{ success: boolean; data: Requirement[] }>(
      `${this.apiUrl}/requirements`
    ).subscribe({
      next: (response) => {
        
        // Convert requirements to document types format
        const documentTypes: DocumentType[] = response.data.map(req => ({
          type_id: req.document_type,
          type_name: req.document_type,
          required_files: req.required_files || []
        }));
        
        this.documentTypes.set(documentTypes);
        this.requirements.set(response.data);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading requirements:', error);
        console.error('Error details:', error);
        alert('Failed to load document types: ' + error.message);
        this.loading.set(false);
      }
    });
  }


  loadRequirementsForDocumentType(documentType: string) {
    // Requirements are already loaded in loadDocumentTypes(), no need to fetch again
    const requirement = this.requirements().find(req => req.document_type === documentType);
    if (requirement) {
    } else {
      console.warn('No requirements found for document type:', documentType);
    }
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
    const requirements = this.selectedRequirements();
    
    if (!requirements) {
      alert('Requirements not loaded. Please refresh the page and try again.');
      return;
    }

    
    // Validate all required files are uploaded
    const missingFiles = requirements.required_files
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
      
      // Upload all files to S3 using the same submission ID
      const fileUploads: Promise<{ fileId: string; s3Key: string }>[] = [];
      
      this.uploadedFiles().forEach((file, fileId) => {
        const uploadPromise = new Promise<{ fileId: string; s3Key: string }>((resolve, reject) => {
          // Use the same submission ID for all files
          const s3Key = `submission/${submissionId}/${file.name}`;
          
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
      
      // Prepare submission data dynamically based on requirements
      const submissionData = this.buildDynamicSubmissionData(submissionId, files);

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

  // Helper method to determine field type based on field name
  getFieldTypeFromName(fieldName: string): string {
    const fieldTypeMap: { [key: string]: string } = {
      'title': 'text',
      'abstract': 'textarea',
      'authors': 'text',
      'tags': 'text',
      'year': 'number',
      'adviser': 'text',
      'faculty_in_charge': 'text',
      'panelists': 'text',
      'access_level': 'select',
      'department': 'text',
      'program': 'text'
    };
    
    return fieldTypeMap[fieldName] || 'text';
  }

  // Dynamic field methods - now works with allDynamicFields
  getDynamicFieldValue(fieldName: string): string {
    // Check if it's a hardcoded field first
    const hardcodedValue = this.getHardcodedFieldValue(fieldName);
    if (hardcodedValue !== null) return hardcodedValue;
    
    // Otherwise get from dynamic metadata
    return this.dynamicMetadata().get(fieldName) || '';
  }

  getHardcodedFieldValue(fieldName: string): string | null {
    const fieldMap: { [key: string]: () => string } = {
      'title': () => this.title(),
      'abstract': () => this.abstract(),
      'authors': () => this.authors(),
      'tags': () => this.tags(),
      'year': () => this.year(),
      'adviser': () => this.adviser(),
      'faculty_in_charge': () => this.facultyInCharge(),
      'panelists': () => this.panelists(),
      'access_level': () => this.accessLevel(),
      'department': () => this.department(),
      'program': () => this.program()
    };
    
    return fieldMap[fieldName]?.() || null;
  }

  setDynamicFieldValue(fieldName: string, value: string): void {
    // Check if it's a hardcoded field first
    if (this.setHardcodedFieldValue(fieldName, value)) {
      return;
    }
    
    // Otherwise set in dynamic metadata
    this.dynamicMetadata.update(map => {
      const newMap = new Map(map);
      newMap.set(fieldName, value);
      return newMap;
    });
  }

  setHardcodedFieldValue(fieldName: string, value: string): boolean {
    const fieldMap: { [key: string]: (value: string) => void } = {
      'title': (v) => this.title.set(v),
      'abstract': (v) => this.abstract.set(v),
      'authors': (v) => this.authors.set(v),
      'tags': (v) => this.tags.set(v),
      'year': (v) => this.year.set(v),
      'adviser': (v) => this.adviser.set(v),
      'faculty_in_charge': (v) => this.facultyInCharge.set(v),
      'panelists': (v) => this.panelists.set(v),
      'access_level': (v) => this.accessLevel.set(v),
      'department': (v) => this.department.set(v),
      'program': (v) => this.program.set(v)
    };
    
    if (fieldMap[fieldName]) {
      fieldMap[fieldName](value);
      return true;
    }
    return false;
  }

  isFieldRequired(fieldName: string): boolean {
    const field = this.allDynamicFields().find(f => f.name === fieldName);
    return field?.required || false;
  }

  getFieldPlaceholder(fieldName: string): string {
    const placeholders: { [key: string]: string } = {
      'title': 'Enter the title of your thesis/capstone',
      'abstract': 'Enter the abstract (summary of your work)',
      'authors': 'Enter all authors (comma-separated): Juan Dela Cruz, Maria Santos',
      'tags': 'e.g., Machine Learning, Web Development, Mobile App',
      'year': '2024',
      'adviser': 'Dr. John Doe',
      'faculty_in_charge': 'Prof. Jane Smith',
      'panelists': 'Dr. Alice Brown, Dr. Bob Johnson',
      'access_level': 'Select access level',
      'department': 'e.g., Computer Science',
      'program': 'e.g., BSIT, BSCS'
    };
    
    return placeholders[fieldName] || `Enter ${this.getFieldDisplayName(fieldName).toLowerCase()}`;
  }

  getFieldType(fieldName: string): string {
    const field = this.allDynamicFields().find(f => f.name === fieldName);
    return field?.fieldType || 'text';
  }

  trackByFieldName(index: number, field: any): string {
    return field.name || field;
  }

  onDynamicFieldChange(fieldName: string, event: Event): void {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    if (target) {
      this.setDynamicFieldValue(fieldName, target.value);
    }
  }

  // Build submission data dynamically based on requirements
  buildDynamicSubmissionData(submissionId: string, files: any): any {
    const baseData = {
      submission_id: submissionId,
      submitter_email: this.authService.currentUser?.email,
      document_type: this.documentType(),
      files
    };

    // Process all dynamic fields
    const fieldData: any = {};
    this.allDynamicFields().forEach(field => {
      const value = this.getDynamicFieldValue(field.name);
      
      // Handle special cases for array fields
      if (field.name === 'authors' || field.name === 'tags' || field.name === 'panelists') {
        fieldData[field.name] = value ? value.split(',').map((item: string) => item.trim()) : [];
      } else {
        fieldData[field.name] = value;
      }
    });

    // Add any additional dynamic metadata
    const additionalMetadata = Object.fromEntries(this.dynamicMetadata());
    
    return {
      ...baseData,
      ...fieldData,
      ...additionalMetadata
    };
  }
}

