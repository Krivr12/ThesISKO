import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AdminSideNav } from '../admin-side-nav/admin-side-nav';
import { RecordsService, RecordItem } from '../../service/records.service';
import { S3Service } from '../../service/s3.service';
import { Auth } from '../../service/auth';
import { environment } from '../../../environments/environment';

interface DocumentFile {
  id: string; // File identifier (e.g., 'manuscript', 'plagiarism_check', etc.)
  fileType: string; // Display name (e.g., 'Manuscript', 'Plagiarism Check Report')
  fileName: string; // Current file name
  fileKey: string; // S3 key for the file
  uploadedAt?: Date | string; // Upload date if available
}

interface Document {
  _id: string;
  id: string; // document_id
  title: string;
  abstract: string;
  authors: string[];
  tags: string[];
  access_level: string;
  files: DocumentFile[];
  file_key?: string; // Legacy: main manuscript file key
  files_object?: any; // The files object from records collection
  document_status?: 'active' | 'old';
}

@Component({
  selector: 'app-document-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, AdminSideNav],
  templateUrl: './document-edit.html',
  styleUrls: ['./document-edit.css']
})
export class DocumentEdit implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private sanitizer = inject(DomSanitizer);
  private recordsService = inject(RecordsService);
  private s3Service = inject(S3Service);
  private authService = inject(Auth);

  document = signal<Document | null>(null);
  loading = signal<boolean>(false);
  saving = signal<boolean>(false);
  showConfirmModal = signal<boolean>(false);
  showSoftDeleteModal = signal<boolean>(false);
  showSoftDeleteConfirmModal = signal<boolean>(false);

  // User role tracking
  currentUserRole: number | null = null;

  // Form data
  formData = {
    title: '',
    abstract: '',
    access_level: 'Partial',
    authorsString: '',
    tagsString: ''
  };

  // Track staged file replacements: key is file ID, value is the new File object
  fileReplacements = new Map<string, File>();

  // Access level options
  accessLevelOptions = ['Partial', 'Full', 'Embargoed'];

  // PDF Viewer state
  isPdfViewerVisible = signal<boolean>(false);
  currentPdfDocument = signal<{ name: string; file: string } | null>(null);
  currentPdfUrl = signal<SafeResourceUrl | null>(null);
  pdfLoading = signal<boolean>(false);
  pdfError = signal<string>('');

  // Non-signal property for currentPdfDocument (for compatibility)
  currentPdfDocumentRef: { name: string; file: string; fileKey?: string } | null = null;

  private apiUrl = environment.recordsApiUrl;

  ngOnInit() {
    // Load user role
    this.authService.currentUser$.subscribe(user => {
      if (user && user.role_id) {
        this.currentUserRole = user.role_id;
      }
    });

    const documentId = this.route.snapshot.paramMap.get('id');
    if (documentId) {
      this.loadDocument(documentId);
    } else {
      this.router.navigate(['/adminSide/documents']);
    }
  }

  // Check if current user is SUPERADMIN/DEAN (role_id = 5)
  isSuperAdmin(): boolean {
    return this.currentUserRole === 5;
  }

  loadDocument(documentId: string) {
    this.loading.set(true);
    
    // Get all records and find the one with matching document_id
    this.recordsService.getAllRecords().subscribe({
      next: (records: RecordItem[]) => {
        const record = records.find(r => r.document_id === documentId);
        
        if (!record) {
          alert('Document not found');
          this.router.navigate(['/adminSide/documents']);
          this.loading.set(false);
          return;
        }

        // Cast to any to access files property which may exist in actual records
        const recordAny = record as any;

        // Extract files from records collection
        const files = this.extractFilesFromRecord(recordAny);

        const document: Document = {
          _id: record._id,
          id: record.document_id,
          title: record.title || 'Untitled',
          abstract: record.abstract || '',
          authors: record.authors || [],
          tags: record.tags || [],
          access_level: record.access_level || 'Partial',
          files: files,
          file_key: record.file_key, // Keep for backward compatibility
          files_object: recordAny.files, // Store original files object
          document_status: record.document_status || 'active'
        };

        this.document.set(document);
        
        // Populate form
        this.formData.title = document.title;
        this.formData.abstract = document.abstract;
        this.formData.access_level = document.access_level;
        this.formData.authorsString = document.authors.join(', ');
        this.formData.tagsString = document.tags.join(', ');
        
        this.loading.set(false);
      },
      error: (error) => {
        
        alert('Failed to load document');
        this.router.navigate(['/adminSide/documents']);
        this.loading.set(false);
      }
    });
  }

  /**
   * Extract files from record's files object (from records collection)
   * Files are stored as: { fileId: { file_key: string, uploaded_at?: Date, filename?: string, key?: string } }
   * Note: In records collection, files use 'file_key' (not 's3_key')
   * This method specifically looks for the 'files' key in the record from the records collection
   */
  extractFilesFromRecord(record: any): DocumentFile[] {
    const files: DocumentFile[] = [];

    // Check if record has a files object (from records collection)
    // The 'files' key contains all file details for the document
    if (record.files && typeof record.files === 'object') {
      
      // Process files object - iterate through each file entry
      Object.entries(record.files).forEach(([fileId, fileData]: [string, any]) => {
        // In records collection, files use 'file_key' (not 's3_key')
        // Support both for compatibility with different data structures
        const fileKey = fileData?.file_key || fileData?.s3_key;
        
        if (fileData && fileKey) {
          // Extract filename from file_key (last part after /)
          // Handle cases where file_key might have query parameters or encoded tokens
          let cleanFileKey = fileKey;
          const queryIndex = cleanFileKey.indexOf('?');
          if (queryIndex !== -1) {
            cleanFileKey = cleanFileKey.substring(0, queryIndex);
          }
          
          // Use filename from fileData if available, otherwise extract from file_key
          const fileName = fileData.filename || cleanFileKey.split('/').pop() || `${fileId}.pdf`;
          
          // Use the 'key' field from fileData if available, otherwise use the fileId from iteration
          // The 'key' field in fileData is the actual file identifier (e.g., 'manuscript')
          const actualFileId = fileData.key || fileId;
          
          files.push({
            id: actualFileId,
            fileType: this.formatFileType(actualFileId),
            fileName: fileName,
            fileKey: cleanFileKey,
            uploadedAt: fileData.uploaded_at
          });
          
        } else {
          
        }
      });
    } else {
    }
    
    // Fallback: Also add the main manuscript from file_key if it exists and not already in files
    // This handles older records that might only have file_key instead of files object
    if (record.file_key) {
      const hasManuscript = files.some(f => 
        f.id === 'manuscript' || 
        f.id === 'thesis_manuscript' ||
        f.fileType.toLowerCase().includes('manuscript')
      );
      
      if (!hasManuscript) {
        let fileKey = record.file_key;
        const queryIndex = fileKey.indexOf('?');
        if (queryIndex !== -1) {
          fileKey = fileKey.substring(0, queryIndex);
        }
        
        const fileName = fileKey.split('/').pop() || 'Manuscript.pdf';
        files.unshift({
          id: 'manuscript',
          fileType: 'Manuscript',
          fileName: fileName,
          fileKey: fileKey
        });
      }
    }

    return files;
  }

  /**
   * Format file ID to readable file type name
   * e.g., 'plagiarism_check' -> 'Plagiarism Check Report'
   */
  formatFileType(fileId: string): string {
    // Common file type mappings
    const typeMap: { [key: string]: string } = {
      'manuscript': 'Manuscript',
      'thesis_manuscript': 'Thesis Manuscript',
      'plagiarism_check': 'Plagiarism Check Report',
      'copyright_form': 'Copyright Form',
      'approval_sheet': 'Approval Sheet',
      'certificate_of_completion': 'Certificate of Completion',
      'turnitin_report': 'Turnitin Report'
    };

    if (typeMap[fileId.toLowerCase()]) {
      return typeMap[fileId.toLowerCase()];
    }

    // Fallback: convert snake_case to Title Case
    return fileId.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  /**
   * Handle file selection for a specific file ID
   */
  onFileSelected(fileId: string, event: any): void {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    // Validate file type (allow PDF and common document types)
    const allowedTypes = ['application/pdf', 'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
    
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a valid document file (PDF, Word, or PowerPoint).');
      // Reset the input
      event.target.value = '';
      this.fileReplacements.delete(fileId);
      return;
    }

    // Store the file for this file ID
    this.fileReplacements.set(fileId, file);
  }

  /**
   * Get the staged file name for a file ID
   */
  getStagedFileName(fileId: string): string {
    const file = this.fileReplacements.get(fileId);
    return file ? file.name : '';
  }

  /**
   * Check if a file has a staged replacement
   */
  hasStagedReplacement(fileId: string): boolean {
    return this.fileReplacements.has(fileId);
  }

  /**
   * Clear staged replacement for a file
   */
  clearStagedReplacement(fileId: string): void {
    this.fileReplacements.delete(fileId);
  }

  isFormValid(): boolean {
    return this.formData.title.trim().length > 0 && 
           this.formData.abstract.trim().length > 0 &&
           this.formData.authorsString.trim().length > 0;
  }

  openSaveConfirmation(): void {
    if (!this.isFormValid()) {
      alert('Please fill in all required fields.');
      return;
    }
    this.showConfirmModal.set(true);
  }

  closeConfirmModal(): void {
    this.showConfirmModal.set(false);
  }

  saveDocument(): void {
    if (!this.document()) {
      return;
    }

    this.saving.set(true);
    this.closeConfirmModal();

    // Parse authors and tags from comma-separated strings
    const authorsArray = this.formData.authorsString
      .split(',')
      .map(author => author.trim())
      .filter(author => author.length > 0);

    const tagsArray = this.formData.tagsString
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    // Prepare update data
    const updateData: any = {
      document_id: this.document()!.id,
      title: this.formData.title.trim(),
      abstract: this.formData.abstract.trim(),
      authors: authorsArray,
      tags: tagsArray,
      access_level: this.formData.access_level
    };

    // Check if any files need to be replaced
    // For now, the API only supports replacing the manuscript file
    // So we'll prioritize manuscript replacement, or use the first file if no manuscript
    const manuscriptFile = this.fileReplacements.get('manuscript');
    const fileToUpload = manuscriptFile || (this.fileReplacements.size > 0 ? Array.from(this.fileReplacements.values())[0] : null);

    if (fileToUpload) {
      // Update with file (currently API only supports one file at a time)
      this.recordsService.updateRecordWithFile(
        this.document()!._id,
        updateData,
        fileToUpload
      ).subscribe({
        next: (response) => {
          // If there are other files to replace, show a note
          if (this.fileReplacements.size > 1) {
            alert('Document updated successfully! Note: Only the manuscript file was replaced. Other file replacements require API support for multiple files.');
          } else {
            alert('Document updated successfully!');
          }
          this.router.navigate(['/adminSide/documents']);
        },
        error: (error) => {
          
          alert('Failed to update document. Please try again.');
          this.saving.set(false);
        }
      });
    } else {
      // Update without file
      this.recordsService.updateRecord(this.document()!._id, updateData).subscribe({
        next: (response) => {
          alert('Document updated successfully!');
          this.router.navigate(['/adminSide/documents']);
        },
        error: (error) => {
          
          alert('Failed to update document. Please try again.');
          this.saving.set(false);
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/adminSide/documents']);
  }

  viewDocument(file: DocumentFile): void {
    this.currentPdfDocument.set({ 
      name: file.fileType, 
      file: file.fileName 
    });
    this.currentPdfDocumentRef = { 
      name: file.fileType, 
      file: file.fileName,
      fileKey: file.fileKey
    };
    this.isPdfViewerVisible.set(true);
    this.pdfLoading.set(true);
    this.pdfError.set('');

    // Check if fileKey exists
    if (file.fileKey) {
      // Get signed URL from S3
      this.s3Service.getRepositoryFileSignedUrl(file.fileKey).subscribe({
        next: (response) => {
          this.currentPdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(response.signedUrl));
          this.pdfLoading.set(false);
        },
        error: (error) => {
          
          this.pdfError.set('Failed to load document. The file may be unavailable or access has expired.');
          this.pdfLoading.set(false);
        }
      });
    } else {
      this.pdfError.set('Document file key not available.');
      this.pdfLoading.set(false);
    }
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
    this.currentPdfDocumentRef = null;
    this.currentPdfUrl.set(null);
    this.pdfLoading.set(false);
    this.pdfError.set('');
  }

  downloadDocument(): void {
    if (!this.currentPdfDocumentRef) return;

    const doc = this.currentPdfDocumentRef;
    
    if (doc.fileKey) {
      this.s3Service.getRepositoryFileSignedUrl(doc.fileKey).subscribe({
        next: (response) => {
          const link = document.createElement('a');
          link.href = response.signedUrl;
          link.download = doc.file;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        },
        error: (error) => {
          
          alert('Failed to download document. Please try again.');
        }
      });
    } else {
      alert('Document file not available for download.');
    }
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

  /**
   * Get file type by file ID (helper for template)
   */
  getFileTypeById(fileId: string): string {
    const doc = this.document();
    if (!doc || !doc.files) {
      return fileId;
    }
    const file = doc.files.find(f => f.id === fileId);
    return file ? file.fileType : fileId;
  }

  /**
   * Get array of file IDs that have staged replacements (for template iteration)
   */
  getStagedFileIds(): string[] {
    return Array.from(this.fileReplacements.keys());
  }

  // Soft delete modals
  openSoftDeleteModal(): void {
    this.showSoftDeleteModal.set(true);
  }

  closeSoftDeleteModal(): void {
    this.showSoftDeleteModal.set(false);
  }

  openSoftDeleteConfirmModal(): void {
    this.showSoftDeleteConfirmModal.set(true);
  }

  closeSoftDeleteConfirmModal(): void {
    this.showSoftDeleteConfirmModal.set(false);
  }

  // Soft delete document
  softDeleteDocument(): void {
    if (!this.document()) {
      return;
    }

    const documentId = this.document()!._id;

    this.recordsService.softDeleteRecord(documentId).subscribe({
      next: (response) => {
        alert('Document has been successfully soft deleted.');
        this.closeSoftDeleteConfirmModal();
        this.closeSoftDeleteModal();
        this.router.navigate(['/adminSide/documents']);
      },
      error: (error) => {
        
        alert('Failed to soft delete document. Please try again.');
        this.closeSoftDeleteConfirmModal();
      }
    });
  }
}
