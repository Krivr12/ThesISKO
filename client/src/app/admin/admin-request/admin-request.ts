import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AdminSideBar } from '../admin-side-bar/admin-side-bar';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { RequestService, RequesterAnalytics, RequestDetails } from '../../service/request.service';
import { S3Service } from '../../service/s3.service';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-admin-request',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminSideBar, MatPaginatorModule, HttpClientModule],
  templateUrl: './admin-request.html',
  styleUrls: ['./admin-request.css']
})
export class AdminRequest implements OnInit {

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  
  // State variables
  view: 'list' | 'details' = 'list';
  isApproveModalVisible = false;
  isRejectModalVisible = false;
  isPdfViewerVisible = false;
  
  // PDF Viewer state for viewing original manuscript
  currentPdfDocument: { name: string; file: string } | null = null;
  currentPdfUrl: SafeResourceUrl | null = null;
  pdfLoading = false;
  pdfError = '';
  
  // PDF Upload state for approval
  uploadedPdfFile: File | null = null;
  uploadedPdfFileName: string = '';
  
  // Data for page
  requests: RequesterAnalytics[] = [];
  selectedRequest: RequesterAnalytics | null = null;
  selectedRequestDetails: RequestDetails | null = null;
  filteredRequests: RequesterAnalytics[] = [];
  
  // Rejection modal
  rejectionReason = '';
  
   // Pagination
   currentPage = 1;
   itemsPerPage = 10;
   totalPages = 0;
   pages: (number | string)[] = []; 

  // Filter
  currentFilter: 'pending' | 'approved' | 'rejected' = 'pending';

  // Sorting
  sortColumn: keyof RequesterAnalytics | null = null;
  sortDirection: 'asc' | 'desc' = 'asc';

  constructor(
    private sanitizer: DomSanitizer,
    private requestService: RequestService,
    private s3Service: S3Service
  ) {}

  ngOnInit(): void {
    this.loadRequestsFromDatabase();
  }

  // Load requests from Supabase via API
  loadRequestsFromDatabase(): void {
    this.requestService.getAllRequests().subscribe({
      next: (requests: RequesterAnalytics[]) => {
        this.requests = requests;
        this.filterAndSortRequests();
      },
      error: (error) => {
        console.error('Error loading requests:', error);
        this.requests = [];
        this.filterAndSortRequests();
      }
    });
  }

  onPage(evt: PageEvent): void {
    this.itemsPerPage = evt.pageSize;
    this.currentPage = evt.pageIndex + 1;
    this.updatePages();
  }

  // View management
  showListView(): void {
    this.view = 'list';
    this.selectedRequest = null;
    this.selectedRequestDetails = null;
    this.uploadedPdfFile = null;
    this.uploadedPdfFileName = '';
    this.filterAndSortRequests();
  }

  showDetailsView(request: RequesterAnalytics): void {
    this.selectedRequest = request;
    this.view = 'details';
    
    // Fetch detailed request data
    this.requestService.getRequestDetails(request.request_id).subscribe({
      next: (details) => {
        this.selectedRequestDetails = details;
      },
      error: (error) => {
        console.error('Error loading request details:', error);
        alert('Failed to load request details.');
      }
    });
  }

  // PDF Upload handling
  onPdfFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      this.uploadedPdfFile = file;
      this.uploadedPdfFileName = file.name;
    } else {
      alert('Please select a valid PDF file.');
      this.uploadedPdfFile = null;
      this.uploadedPdfFileName = '';
    }
  }

  // View original manuscript from repository
  viewOriginalManuscript(): void {
    if (!this.selectedRequestDetails?.document?.file_key) {
      alert('Document file not available.');
      return;
    }

    this.currentPdfDocument = { 
      name: 'Original Manuscript', 
      file: this.selectedRequestDetails.document.file_key 
    };
    this.pdfLoading = true;
    this.pdfError = '';
    this.isPdfViewerVisible = true;
    this.currentPdfUrl = null;

    // Get signed URL from S3
    this.s3Service.getRepositoryFileSignedUrl(this.selectedRequestDetails.document.file_key).subscribe({
      next: (response) => {
        this.currentPdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(response.signedUrl);
        this.pdfLoading = false;
      },
      error: (error) => {
        console.error('Error getting signed URL:', error);
        this.pdfError = 'Failed to load document. The file may be unavailable or access has expired.';
        this.pdfLoading = false;
      }
    });
  }

  onPdfLoad(): void {
    this.pdfLoading = false;
  }

  onPdfError(): void {
    this.pdfLoading = false;
    this.pdfError = 'Failed to load document. The file may be unavailable.';
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
    if (!this.uploadedPdfFile) {
      alert('Please upload the approved PDF file before approving the request.');
      return;
    }
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
        this.rejectionReason = '';
    }
  }

  // Data handling
  approveRequest(): void {
    if (!this.selectedRequest || !this.uploadedPdfFile) {
      alert('Missing required data for approval.');
      return;
    }

    this.requestService.approveRequest(this.selectedRequest.request_id, this.uploadedPdfFile).subscribe({
      next: (response) => {
        console.log('✅ Request approved successfully:', response);
        
        // Update local requests array
        const request = this.requests.find(r => r.request_id === this.selectedRequest!.request_id);
        if (request) {
          request.status = 'approved';
        }
        
        // Close modal and return to list view
        this.closeApproveModal();
        this.showListView();
        
        alert('Request approved successfully. Email sent to requester.');
      },
      error: (error) => {
        console.error('❌ Error approving request:', error);
        alert('Failed to approve request. Please try again.');
        this.closeApproveModal();
      }
    });
  }

  rejectRequest(): void {
    if (!this.selectedRequest) {
      alert('No request selected.');
      return;
    }

    if (!this.rejectionReason.trim()) {
      alert('Please provide a reason for rejection.');
      return;
    }

    this.requestService.rejectRequest(this.selectedRequest.request_id, this.rejectionReason).subscribe({
      next: (response) => {
        console.log('✅ Request rejected successfully:', response);
        
        // Update local requests array
        const request = this.requests.find(r => r.request_id === this.selectedRequest!.request_id);
        if (request) {
          request.status = 'rejected';
        }
        
        // Close modal and return to list view
        this.closeRejectModal();
        this.showListView();
        
        alert('Request rejected successfully. Email sent to requester.');
      },
      error: (error) => {
        console.error('❌ Error rejecting request:', error);
        alert('Failed to reject request. Please try again.');
        this.closeRejectModal();
      }
    });
  }

  setFilter(filter: 'pending' | 'approved' | 'rejected'): void {
    this.currentFilter = filter;
    this.currentPage = 1;
    this.filterAndSortRequests();
  }
  
  filterAndSortRequests(): void {
    // 1. Filtering by status
    this.filteredRequests = this.requests.filter(req => req.status === this.currentFilter);

    // 2. Sorting
    if (this.sortColumn) {
        this.filteredRequests.sort((a, b) => {
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

    // 3. Paginator
    this.totalPages = Math.ceil(this.filteredRequests.length / this.itemsPerPage);
    this.updatePages();
  }

  onSort(column: keyof RequesterAnalytics): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.filterAndSortRequests();
  }

  get paginatedRequests(): RequesterAnalytics[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredRequests.slice(startIndex, startIndex + this.itemsPerPage);
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

  // Helper methods
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace(',', '');
  }

  formatChapters(chapters: string[]): string {
    if (!chapters || chapters.length === 0) return 'N/A';
    return chapters.join(', ');
  }
}