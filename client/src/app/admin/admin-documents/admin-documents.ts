import { Component, OnInit, ViewChild} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AdminSideBar } from '../admin-side-bar/admin-side-bar';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';

// data Structure
interface Thesis {
  id: string;
  title: string;
  submissionDate: string;
  status: 'For Approval' | 'Approved' | 'Plagiarism' | 'Incomplete' | 'Incorrect' | 'Technical' | string;
  abstract: string;
  documents: { name: string; file: string; }[];
  authors: string[];
  tags: string[];
}

@Component({
  selector: 'app-admin-documents',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminSideBar, MatPaginatorModule],
  templateUrl: './admin-documents.html',
  styleUrls: ['./admin-documents.css']
})
export class AdminDocuments implements OnInit {

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  
  // State variables
  view: 'list' | 'details' = 'list';
  isApproveModalVisible = false;
  isRejectModalVisible = false;
  isPdfViewerVisible = false;
  
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
  
   // Pagination (manual; synced with <mat-paginator>)
   currentPage = 1; // 1-based
   itemsPerPage = 10;
   totalPages = 0;
   pages: (number | string)[] = []; 

  // Filter
  currentFilter: 'For Approval' | 'With Issues' | 'Approved' = 'For Approval';

  // Sorting
  sortColumn: keyof Thesis | null = null;
  sortDirection: 'asc' | 'desc' = 'asc';

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    this.documents = this.getPlaceholderData();
    this.filterAndSortDocuments();
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

  viewDocument(doc: { name: string; file: string }): void {
    this.currentPdfDocument = doc;
    this.pdfLoading = true;
    this.pdfError = '';
    this.isPdfViewerVisible = true;

    // placeholder pdf url
    const pdfUrl = this.getPlaceholderPdfUrl();
    this.currentPdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(pdfUrl);
    
    // loading simulation
    setTimeout(() => {
      this.pdfLoading = false;
    }, 1000);
  }

  // placeholder pdf for file viewer
  private getPlaceholderPdfUrl(): string {
    return 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
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

    // Create a temporary anchor element to trigger download
    const link = document.createElement('a');
    link.href = this.getPlaceholderPdfUrl();
    link.download = this.currentPdfDocument.file;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    // 1. Filtering
    switch (this.currentFilter) {
        case 'For Approval':
            this.filteredDocuments = this.documents.filter(doc => doc.status === 'For Approval');
            break;
        case 'Approved':
            this.filteredDocuments = this.documents.filter(doc => doc.status === 'Approved');
            break;
        case 'With Issues':
            this.filteredDocuments = this.documents.filter(doc => 
                doc.status !== 'For Approval' && doc.status !== 'Approved'
            );
            break;
        default:
            this.filteredDocuments = [...this.documents];
    }

    // 2. Sorting
    if (this.sortColumn) {
        this.filteredDocuments.sort((a, b) => {
            const aValue = a[this.sortColumn!];
            const bValue = b[this.sortColumn!];

            if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }

    // 3. Paginator
    this.totalPages = Math.ceil(this.filteredDocuments.length / this.itemsPerPage);
    this.updatePages();
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

  // Placeholder data
  private getPlaceholderData(): Thesis[] {
    return [
      { id: 'CP-2025-001', title: 'PananaliksikHub – Central hub for academic research.', submissionDate: '2025-01-12 09:15:23', status: 'For Approval', abstract: '...', documents: [], authors: [], tags: [] },
      { id: 'TH-2025-001', title: 'SaliksikPH – "Saliksik" means research; with a...', submissionDate: '2025-02-28 14:47:10', status: 'For Approval', abstract: '...', documents: [], authors: [], tags: [] },
      { id: 'CP-2025-002', title: 'Tuklasan – From "tuklas" (to discover); sounds ...', submissionDate: '2025-03-05 08:03:55', status: 'For Approval', abstract: '...', documents: [], authors: [], tags: [] },
      { id: 'TH-2025-002', title: 'SulatAgham – Combining "sulat" (to write) ...', submissionDate: '2025-05-22 19:34:42', status: 'For Approval', abstract: '...', documents: [], authors: [], tags: [] },
      { id: 'CP-2025-003', title: 'hesIkot – Wordplay on "thesis" and "ikot" ...', submissionDate: '2025-06-01 11:25:49', status: 'For Approval', abstract: '...', documents: [], authors: [], tags: [] },
      { id: 'TH-2025-003', title: 'ThinkSpace – A space for academic ideas and ...', submissionDate: '2025-07-14 16:58:31', status: 'For Approval', abstract: '...', documents: [], authors: [], tags: [] },
      { id: 'TH-2025-004', title: 'Paperly – Lightweight, modern feel for storing ...', submissionDate: '2025-08-06 13:25:49', status: 'For Approval', abstract: '...', documents: [], authors: [], tags: [] },
      { id: 'CP-2025-004', title: 'Eduscan – Educational paper search and ...', submissionDate: '2025-09-09 10:40:05', status: 'For Approval', abstract: '...', documents: [], authors: [], tags: [] },
      { id: 'TH-2025-005', title: 'DocuNest – A "nest" for storing important ...', submissionDate: '2025-10-30 18:12:00', status: 'For Approval', abstract: '...', documents: [], authors: [], tags: [] },
      { id: 'CP-2025-005', title: 'ArchiveSphere - A comprehensive digital archive...', submissionDate: '2025-11-15 11:00:00', status: 'For Approval', abstract: '...', documents: [], authors: [], tags: [] },
      { id: 'TH-2025-006', title: 'IntellectaHub - A hub for intellectual works...', submissionDate: '2025-12-01 22:30:00', status: 'For Approval', abstract: '...', documents: [], authors: [], tags: [] },
      { id: 'CP-2025-006', title: 'ThesisReef - A reef of academic papers...', submissionDate: '2024-12-25 10:00:00', status: 'For Approval', abstract: '...', documents: [], authors: [], tags: [] },
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