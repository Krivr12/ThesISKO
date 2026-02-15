import { Component, OnInit, ViewChild} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AdminSideNav } from '../admin-side-nav/admin-side-nav';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { RecordsService, RecordItem } from '../../service/records.service';
import { S3Service } from '../../service/s3.service';
import { HttpClientModule } from '@angular/common/http';

// data Structure
interface Thesis {
  _id: string;        // MongoDB ObjectId (for deletion/operations)
  id: string;         // document_id (for display: "2025-BSCS-0001")
  title: string;
  submissionDate: string;
  status: 'For Approval' | 'Approved' | 'Plagiarism' | 'Incomplete' | 'Incorrect' | 'Technical' | string;
  abstract: string;
  documents: { name: string; file: string; fileKey?: string; }[];  // fileKey added for S3 access
  authors: string[];
  tags: string[];
  file_key?: string;  // S3 key for deletion
  document_status?: 'active' | 'old';  // Document status: active or old (5+ years)
}

@Component({
  selector: 'app-admin-documents',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminSideNav, MatPaginatorModule, HttpClientModule],
  templateUrl: './documents.html',
  styleUrls: ['./documents.css']
})
export class AdminDocuments implements OnInit {

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  // State variables
  view: 'list' | 'details' = 'list';
  isApproveModalVisible = false;
  isRejectModalVisible = false;
  isDeleteModalVisible = false;
  isPdfViewerVisible = false;
  isUpdateModalVisible = false;
  isConfirmUpdateModalVisible = false;
  
  // PDF Viewer state
  currentPdfDocument: { name: string; file: string } | null = null;
  currentPdfUrl: SafeResourceUrl | null = null;
  pdfLoading = false;
  pdfError = '';
  
  // Data for page
  documents: Thesis[] = [];
  selectedDocument: Thesis | null = null;
  filteredDocuments: Thesis[] = [];
  
  // Rejection modal
  rejectionReasons = {
    plagiarism: false,
    incomplete: false,
    technical: false,
    incorrect: false
  };
  rejectionComment = '';

  // Update form
  updateForm = {
    title: '',
    abstract: '',
    authorsString: '',
    manuscriptFile: null as File | null,
    manuscriptFileName: ''
  };
  
   // Pagination (manual; synced with <mat-paginator>)
   currentPage = 1; // 1-based
   itemsPerPage = 10;
   totalPages = 0;
   pages: (number | string)[] = []; 

  // Filter
  currentFilter: 'For Approval' | 'With Issues' | 'Approved' = 'For Approval';

  // Search (keyword by title)
  searchKeyword = '';

  // Sorting
  sortColumn: keyof Thesis | null = null;
  sortDirection: 'asc' | 'desc' = 'asc';

  constructor(
    private sanitizer: DomSanitizer,
    private recordsService: RecordsService,
    private s3Service: S3Service,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadRecordsFromDatabase();
  }

  // Load records from MongoDB via API
  loadRecordsFromDatabase(): void {
    this.recordsService.getAllRecords().subscribe({
      next: (records: RecordItem[]) => {
        this.documents = this.mapRecordsToThesis(records);
        this.filterAndSortDocuments();
      },
      error: (error) => {
        
        // Fallback to placeholder data if API fails
        this.documents = this.getPlaceholderData();
        this.filterAndSortDocuments();
      }
    });
  }

  // Map MongoDB RecordItem to Thesis interface
  mapRecordsToThesis(records: RecordItem[]): Thesis[] {
    return records.map(record => {
      // Use submitted_at if available, fallback to created_at
      const dateField = record.submitted_at || record.created_at;
      
      // Format submission date
      const submissionDate = dateField ? this.formatDate(dateField) : '';

      // Create documents array with single manuscript entry
      const documents = [];
      if (record.file_key) {
        // Extract filename from S3 key (last part after /)
        const fileName = record.file_key.split('/').pop() || 'Manuscript.pdf';
        documents.push({
          name: 'Thesis Manuscript',
          file: fileName,
          fileKey: record.file_key  // Include full S3 key for signed URL generation
        });
      }

      return {
        _id: record._id,         // MongoDB ObjectId for deletion
        id: record.document_id,  // Use document_id for display (e.g., "2025-BSCS-0001")
        title: record.title || 'Untitled',
        submissionDate: submissionDate,
        status: 'Approved',  // All records in collection are approved
        abstract: record.abstract || 'No abstract available',
        documents: documents,
        authors: record.authors || [],
        tags: record.tags || [],
        file_key: record.file_key,  // S3 key for deletion
        document_status: record.document_status || 'active'  // Map document_status from record
      };
    });
  }
  onPage(evt: PageEvent): void {
    this.itemsPerPage = evt.pageSize;
    this.currentPage = evt.pageIndex + 1; // PageEvent is 0-based
    this.updatePages();
  }


  // View management
  showListView(): void {
    this.view = 'list';
    this.selectedDocument = null;
    this.filterAndSortDocuments();
  }

  showDetailsView(doc: Thesis): void {
    this.selectedDocument = doc;
    this.view = 'details';
  }

  // PDF document handling
  getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toUpperCase() || 'FILE';
  }

  viewDocument(doc: { name: string; file: string; fileKey?: string }): void {
    this.currentPdfDocument = doc;
    this.pdfLoading = true;
    this.pdfError = '';
    this.isPdfViewerVisible = true;
    this.currentPdfUrl = null;

    // Check if fileKey exists (for real documents from database)
    if (doc.fileKey) {
      // Get signed URL from S3
      this.s3Service.getRepositoryFileSignedUrl(doc.fileKey).subscribe({
        next: (response) => {
          this.currentPdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(response.signedUrl);
          this.pdfLoading = false;
        },
        error: (error) => {
          
          this.pdfError = 'Failed to load document. The file may be unavailable or access has expired.';
          this.pdfLoading = false;
        }
      });
    } else {
      // Fallback for documents without fileKey (shouldn't happen for approved docs)
      this.pdfError = 'Document file key not available.';
      this.pdfLoading = false;
    }
  }

  onPdfLoad(): void {
    this.pdfLoading = false;
  }

  onPdfError(): void {
    this.pdfLoading = false;
    this.pdfError = 'Failed to load document. The file may be unavailable.';
  }

  downloadDocument(): void {
    if (!this.currentPdfDocument) return;

    // Cast to our extended type to access fileKey
    const doc = this.currentPdfDocument as { name: string; file: string; fileKey?: string };
    
    // If we have a fileKey, get signed URL for download
    if (doc.fileKey) {
      this.s3Service.getRepositoryFileSignedUrl(doc.fileKey).subscribe({
        next: (response) => {
          // Create temporary anchor element to trigger download
          const link = document.createElement('a');
          link.href = response.signedUrl;
          link.download = this.currentPdfDocument!.file;
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

  closePdfViewer(): void {
    this.isPdfViewerVisible = false;
    this.currentPdfDocument = null;
    this.currentPdfUrl = null;
    this.pdfLoading = false;
    this.pdfError = '';
  }

  // Modal management
  openApproveModal(): void {
    this.isApproveModalVisible = true;
  }

  closeApproveModal(): void {
    this.isApproveModalVisible = false;
  }
  
  openRejectModal(): void {
    this.isRejectModalVisible = true;
  }
  
  closeRejectModal(reset: boolean = true): void {
    this.isRejectModalVisible = false;
    if(reset) {
        this.resetRejectionForm();
    }
  }

  openDeleteModal(): void {
    this.isDeleteModalVisible = true;
  }

  closeDeleteModal(): void {
    this.isDeleteModalVisible = false;
  }

  // Data handling
  approveSubmission(): void {
    if (this.selectedDocument) {
      this.updateDocumentStatus(this.selectedDocument.id, 'Approved');
    }
    this.closeApproveModal();
    this.showListView();
  }

  rejectSubmission(): void {
    if (this.selectedDocument) {
      const reasons = Object.entries(this.rejectionReasons)
        .filter(([, checked]) => checked)
        .map(([reason]) => reason.charAt(0).toUpperCase() + reason.slice(1));
        
      let newStatus = 'With Issues';
      if (reasons.length > 0) {
        newStatus = reasons[0];
        if (reasons.length > 1) {
          newStatus += ` +${reasons.length - 1}`;
        }
      }
      this.updateDocumentStatus(this.selectedDocument.id, newStatus);
    }
    this.closeRejectModal(false);
    this.showListView();
  }

  deleteDocument(): void {
    if (!this.selectedDocument) return;

    const documentId = this.selectedDocument._id;

    this.recordsService.deleteRecord(documentId).subscribe({
      next: (response) => {
        
        // Remove from local documents array
        this.documents = this.documents.filter(d => d._id !== documentId);
        
        // Close modal and return to list view
        this.closeDeleteModal();
        this.showListView();
        
        // Refresh the filtered view
        this.filterAndSortDocuments();
      },
      error: (error) => {
        
        alert('Failed to delete document. Please try again.');
        this.closeDeleteModal();
      }
    });
  }

  private updateDocumentStatus(docId: string, status: string): void {
      const docInList = this.documents.find(d => d.id === docId);
       if (docInList) {
        docInList.status = status;
      }
  }
  
  private resetRejectionForm(): void {
    this.rejectionReasons = {
      plagiarism: false,
      incomplete: false,
      technical: false,
      incorrect: false
    };
    this.rejectionComment = '';
  }

  setFilter(filter: 'For Approval' | 'With Issues' | 'Approved'): void {
    this.currentFilter = filter;
    this.currentPage = 1;
    this.filterAndSortDocuments();
  }
  
  filterAndSortDocuments(): void {
    // 1. Filtering - Only show approved documents
    this.filteredDocuments = this.documents.filter(doc => doc.status === 'Approved');

    // 2. Keyword search by title
    const keyword = this.searchKeyword.trim().toLowerCase();
    if (keyword) {
      this.filteredDocuments = this.filteredDocuments.filter(doc =>
        (doc.title || '').toLowerCase().includes(keyword)
      );
    }

    // 3. Sorting
    if (this.sortColumn) {
        this.filteredDocuments.sort((a, b) => {
            const aValue = a[this.sortColumn!];
            const bValue = b[this.sortColumn!];

            // Handle undefined values
            if (aValue === undefined && bValue === undefined) return 0;
            if (aValue === undefined) return 1;
            if (bValue === undefined) return -1;

            if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }

    // 4. Paginator
    this.totalPages = Math.ceil(this.filteredDocuments.length / this.itemsPerPage);
    this.updatePages();
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.filterAndSortDocuments();
  }

  onSort(column: keyof Thesis): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.filterAndSortDocuments();
  }

  get paginatedDocuments(): Thesis[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredDocuments.slice(startIndex, startIndex + this.itemsPerPage);
  }

  goToPage(page: number | string): void {
    if (typeof page === 'number' && page > 0 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePages();
    }
  }

  updatePages(): void {
    const maxPagesToShow = 5;
    const pages: (number | string)[] = [];
    if (this.totalPages <= maxPagesToShow + 2) {
        for (let i = 1; i <= this.totalPages; i++) {
            pages.push(i);
        }
    } else {
        pages.push(1);
        if (this.currentPage > 3) {
            pages.push('...');
        }
        
        let start = Math.max(2, this.currentPage - 1);
        let end = Math.min(this.totalPages - 1, this.currentPage + 1);

        if (this.currentPage <= 3) {
            end = 4;
        }
        if (this.currentPage >= this.totalPages - 2) {
            start = this.totalPages - 3;
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        if (this.currentPage < this.totalPages - 2) {
            pages.push('...');
        }
        pages.push(this.totalPages);
    }
    this.pages = pages;
  }

  // Navigate to edit page instead of opening modal
  openUpdateModal(doc: Thesis): void {
    // Navigate to the edit page using document_id (e.g., "2025-BSIT-0004")
    this.router.navigate(['/adminSide/documents/edit', doc.id]);
  }

  closeUpdateModal(): void {
    this.isUpdateModalVisible = false;
    this.selectedDocument = null;
    this.resetUpdateForm();
  }

  openConfirmUpdateModal(): void {
    this.isConfirmUpdateModalVisible = true;
  }

  closeConfirmUpdateModal(): void {
    this.isConfirmUpdateModalVisible = false;
  }

  onManuscriptFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      this.updateForm.manuscriptFile = file;
      this.updateForm.manuscriptFileName = file.name;
    } else {
      alert('Please select a valid PDF file.');
      this.updateForm.manuscriptFile = null;
      this.updateForm.manuscriptFileName = '';
    }
  }

  isUpdateFormValid(): boolean {
    return this.updateForm.title.trim().length > 0 && 
           this.updateForm.abstract.trim().length > 0 &&
           this.updateForm.authorsString.trim().length > 0;
  }

  updateDocument(): void {
    if (!this.selectedDocument || !this.isUpdateFormValid()) {
      alert('Please fill in all required fields.');
      return;
    }

    // Parse authors from comma-separated string
    const authorsArray = this.updateForm.authorsString
      .split(',')
      .map(author => author.trim())
      .filter(author => author.length > 0);

    // Prepare update data
    const updateData: any = {
      document_id: this.selectedDocument.id,
      title: this.updateForm.title.trim(),
      abstract: this.updateForm.abstract.trim(),
      authors: authorsArray
    };

    // If there's a manuscript file, we'll need to upload it
    if (this.updateForm.manuscriptFile) {
      this.recordsService.updateRecordWithFile(
        this.selectedDocument._id, 
        updateData, 
        this.updateForm.manuscriptFile
      ).subscribe({
        next: (response) => {
          
          // Update local document
          const doc = this.documents.find(d => d._id === this.selectedDocument!._id);
          if (doc) {
            doc.title = this.updateForm.title.trim();
            doc.abstract = this.updateForm.abstract.trim();
            doc.authors = authorsArray;
            // Update file key if provided in response
            if (response.file_key) {
              doc.file_key = response.file_key;
            }
          }
          
          // Close modals and refresh
          this.closeConfirmUpdateModal();
          this.closeUpdateModal();
          this.filterAndSortDocuments();
          
          alert('Document updated successfully!');
        },
        error: (error) => {
          
          alert('Failed to update document. Please try again.');
          this.closeConfirmUpdateModal();
        }
      });
    } else {
      // Update without file
      this.recordsService.updateRecord(this.selectedDocument._id, updateData).subscribe({
        next: (response) => {
          
          // Update local document
          const doc = this.documents.find(d => d._id === this.selectedDocument!._id);
          if (doc) {
            doc.title = this.updateForm.title.trim();
            doc.abstract = this.updateForm.abstract.trim();
            doc.authors = authorsArray;
          }
          
          // Close modals and refresh
          this.closeConfirmUpdateModal();
          this.closeUpdateModal();
          this.filterAndSortDocuments();
          
          alert('Document updated successfully!');
        },
        error: (error) => {
          
          alert('Failed to update document. Please try again.');
          this.closeConfirmUpdateModal();
        }
      });
    }
  }

  private resetUpdateForm(): void {
    this.updateForm = {
      title: '',
      abstract: '',
      authorsString: '',
      manuscriptFile: null,
      manuscriptFileName: ''
    };
  }

  // Helper methods
  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    
    // Format: Nov 11 2025 11:12PM
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const hoursStr = hours.toString();
    
    return `${month} ${day} ${year} ${hoursStr}:${minutes}${ampm}`;
  }

  // Placeholder data
  private getPlaceholderData(): Thesis[] {
    return [
      { _id: 'placeholder-001', id: 'CP-2025-001', title: 'PananaliksikHub – Central hub for academic research.', submissionDate: '2025-01-12 09:15:23', status: 'For Approval', abstract: '...', documents: [], authors: [], tags: [] },
      { _id: 'placeholder-002', id: 'TH-2025-001', title: 'SaliksikPH – "Saliksik" means research; with a...', submissionDate: '2025-02-28 14:47:10', status: 'For Approval', abstract: '...', documents: [], authors: [], tags: [] },
      { _id: 'placeholder-003', id: 'CP-2025-002', title: 'Tuklasan – From "tuklas" (to discover); sounds ...', submissionDate: '2025-03-05 08:03:55', status: 'For Approval', abstract: '...', documents: [], authors: [], tags: [] },
      { _id: 'placeholder-004', id: 'TH-2025-002', title: 'SulatAgham – Combining "sulat" (to write) ...', submissionDate: '2025-05-22 19:34:42', status: 'For Approval', abstract: '...', documents: [], authors: [], tags: [] },
      { _id: 'placeholder-005', id: 'CP-2025-003', title: 'hesIkot – Wordplay on "thesis" and "ikot" ...', submissionDate: '2025-06-01 11:25:49', status: 'For Approval', abstract: '...', documents: [], authors: [], tags: [] },
      { _id: 'placeholder-006', id: 'TH-2025-003', title: 'ThinkSpace – A space for academic ideas and ...', submissionDate: '2025-07-14 16:58:31', status: 'For Approval', abstract: '...', documents: [], authors: [], tags: [] },
      { _id: 'placeholder-007', id: 'TH-2025-004', title: 'Paperly – Lightweight, modern feel for storing ...', submissionDate: '2025-08-06 13:25:49', status: 'For Approval', abstract: '...', documents: [], authors: [], tags: [] },
      { _id: 'placeholder-008', id: 'CP-2025-004', title: 'Eduscan – Educational paper search and ...', submissionDate: '2025-09-09 10:40:05', status: 'For Approval', abstract: '...', documents: [], authors: [], tags: [] },
      { _id: 'placeholder-009', id: 'TH-2025-005', title: 'DocuNest – A "nest" for storing important ...', submissionDate: '2025-10-30 18:12:00', status: 'For Approval', abstract: '...', documents: [], authors: [], tags: [] },
      { _id: 'placeholder-010', id: 'CP-2025-005', title: 'ArchiveSphere - A comprehensive digital archive...', submissionDate: '2025-11-15 11:00:00', status: 'For Approval', abstract: '...', documents: [], authors: [], tags: [] },
      { _id: 'placeholder-011', id: 'TH-2025-006', title: 'IntellectaHub - A hub for intellectual works...', submissionDate: '2025-12-01 22:30:00', status: 'For Approval', abstract: '...', documents: [], authors: [], tags: [] },
      { _id: 'placeholder-012', id: 'CP-2025-006', title: 'ThesisReef - A reef of academic papers...', submissionDate: '2024-12-25 10:00:00', status: 'For Approval', abstract: '...', documents: [], authors: [], tags: [] },
    ].map(doc => ({
      ...doc,
      abstract: 'This is a centrally managed digital repository designed to streamline the storage, retrieval, and dissemination of academic research outputs. It empowers students, educators, and researchers alike.',
      documents: [
        { name: 'Thesis Manuscript', file: `${doc.title.split(' ')[0]}_Manuscript.pdf` },
        { name: 'Copyright Form', file: `${doc.title.split(' ')[0]}_Copyright.pdf` },
        { name: 'Turnitin AI Checker Result', file: `${doc.title.split(' ')[0]}_Turnitin.pdf` },
        { name: 'Approval Sheet', file: `${doc.title.split(' ')[0]}_Approval.pdf` },
        { name: 'Certificate of Completion', file: `${doc.title.split(' ')[0]}_COC.pdf` },
      ],
      authors: ['Aithea Ramos', 'Jericho Santos', 'Danica Reyes', 'Miguel Dela Cruz'],
      tags: ['Academic Research', 'Digital Repository', 'Thesis Archive', 'Semantic Search']
    }));
  }
}
