import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminSideBar } from '../admin-side-bar/admin-side-bar';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';

interface Thesis {
  id: string;
  title: string;
  submissionDate: string;
  status:
    | 'For Approval'
    | 'Approved'
    | 'Plagiarism'
    | 'Incomplete'
    | 'Incorrect'
    | 'Technical'
    | string;
  abstract: string;
  documents: { name: string; file: string }[];
  authors: string[];
  tags: string[];
}

@Component({
  selector: 'app-admin-documents',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminSideBar, MatPaginatorModule],
  templateUrl: './admin-documents.html',
  styleUrl: './admin-documents.css',
})
export class AdminDocuments implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  // View/state
  view: 'list' | 'details' = 'list';
  isApproveModalVisible = false;
  isRejectModalVisible = false;

  // Data
  documents: Thesis[] = [];
  filteredDocuments: Thesis[] = [];
  selectedDocument: Thesis | null = null;

  // Filter & sort
  currentFilter: 'For Approval' | 'With Issues' = 'For Approval';
  sortColumn: keyof Thesis | null = null;
  sortDirection: 'asc' | 'desc' = 'asc';

  // Pagination (manual; synced with <mat-paginator>)
  currentPage = 1; // 1-based
  itemsPerPage = 10;
  totalPages = 0;
  pages: (number | string)[] = []; // if you also show custom page chips

  // Reject form
  rejectionReasons = {
    plagiarism: false,
    incomplete: false,
    technical: false,
    incorrect: false,
  };
  rejectionComment = '';

  // ---------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------
  ngOnInit(): void {
    this.documents = this.getPlaceholderData();
    this.filterAndSortDocuments();
  }

  // ---------------------------------------------------
  // Template event handlers
  // ---------------------------------------------------
  onPage(evt: PageEvent): void {
    this.itemsPerPage = evt.pageSize;
    this.currentPage = evt.pageIndex + 1; // PageEvent is 0-based
    this.updatePages();
  }

  setFilter(filter: 'For Approval' | 'With Issues'): void {
    this.currentFilter = filter;
    this.currentPage = 1;
    // Reflect in Material paginator UI if available
    if (this.paginator) this.paginator.firstPage();
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

  showListView(): void {
    this.view = 'list';
    this.selectedDocument = null;
    this.filterAndSortDocuments();
  }

  showDetailsView(doc: Thesis): void {
    this.selectedDocument = doc;
    this.view = 'details';
  }

  // ---------------------------------------------------
  // Approve / Reject modals
  // ---------------------------------------------------
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
    if (reset) this.resetRejectionForm();
  }

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
      if (reasons.length) {
        newStatus = reasons.length === 1 ? reasons[0] : `${reasons[0]} +${reasons.length - 1}`;
      }
      this.updateDocumentStatus(this.selectedDocument.id, newStatus);
    }
    // Keep selections after closing so user sees what they chose
    this.closeRejectModal(false);
    this.showListView();
  }

  // ---------------------------------------------------
  // Derived data for template
  // ---------------------------------------------------
  get paginatedDocuments(): Thesis[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredDocuments.slice(startIndex, startIndex + this.itemsPerPage);
  }

  // Optional: if you also render custom page chips somewhere
  goToPage(page: number | string): void {
    if (typeof page === 'number' && page > 0 && page <= this.totalPages) {
      this.currentPage = page;
      if (this.paginator) this.paginator.pageIndex = this.currentPage - 1;
      this.updatePages();
    }
  }

  // ---------------------------------------------------
  // Core data ops
  // ---------------------------------------------------
  private filterAndSortDocuments(): void {
    // 1) Filter
    this.filteredDocuments =
      this.currentFilter === 'For Approval'
        ? this.documents.filter((d) => d.status === 'For Approval')
        : this.documents.filter((d) => d.status !== 'For Approval');

    // 2) Sort
    if (this.sortColumn) {
      const col = this.sortColumn;
      const dir = this.sortDirection === 'asc' ? 1 : -1;
      this.filteredDocuments = [...this.filteredDocuments].sort((a, b) => {
        const av = (a as any)[col];
        const bv = (b as any)[col];
        return av < bv ? -1 * dir : av > bv ? 1 * dir : 0;
      });
    }

    // 3) Pagination bounds
    this.totalPages = Math.max(1, Math.ceil(this.filteredDocuments.length / this.itemsPerPage));
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;

    this.updatePages();
  }

  private updateDocumentStatus(docId: string, status: string): void {
    const doc = this.documents.find((d) => d.id === docId);
    if (doc) doc.status = status;
  }

  private resetRejectionForm(): void {
    this.rejectionReasons = {
      plagiarism: false,
      incomplete: false,
      technical: false,
      incorrect: false,
    };
    this.rejectionComment = '';
  }

  private updatePages(): void {
    // Only needed if you also render your own page chips with ellipses
    const maxPagesToShow = 5;
    const pages: (number | string)[] = [];

    if (this.totalPages <= maxPagesToShow + 2) {
      for (let i = 1; i <= this.totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (this.currentPage > 3) pages.push('...');
      let start = Math.max(2, this.currentPage - 1);
      let end = Math.min(this.totalPages - 1, this.currentPage + 1);
      if (this.currentPage <= 3) end = 4;
      if (this.currentPage >= this.totalPages - 2) start = this.totalPages - 3;
      for (let i = start; i <= end; i++) pages.push(i);
      if (this.currentPage < this.totalPages - 2) pages.push('...');
      pages.push(this.totalPages);
    }

    this.pages = pages;
  }

  // ---------------------------------------------------
  // Seed data
  // ---------------------------------------------------
  private getPlaceholderData(): Thesis[] {
    const base: Thesis[] = [
      {
        id: 'CP-2025-001',
        title: 'PananaliksikHub – Central hub for academic research.',
        submissionDate: '2025-01-12 09:15:23',
        status: 'For Approval',
        abstract: '...',
        documents: [],
        authors: [],
        tags: [],
      },
      {
        id: 'TH-2025-001',
        title: 'SaliksikPH – “Saliksik” means research; with a...',
        submissionDate: '2025-02-28 14:47:10',
        status: 'For Approval',
        abstract: '...',
        documents: [],
        authors: [],
        tags: [],
      },
      {
        id: 'CP-2025-002',
        title: 'Tuklasan – From “tuklas” (to discover); sounds ...',
        submissionDate: '2025-03-05 08:03:55',
        status: 'For Approval',
        abstract: '...',
        documents: [],
        authors: [],
        tags: [],
      },
      {
        id: 'TH-2025-002',
        title: 'SulatAgham – Combining “sulat” (to write) ...',
        submissionDate: '2025-05-22 19:34:42',
        status: 'For Approval',
        abstract: '...',
        documents: [],
        authors: [],
        tags: [],
      },
      {
        id: 'CP-2025-003',
        title: 'hesIkot – Wordplay on “thesis” and “ikot” ...',
        submissionDate: '2025-06-01 11:25:49',
        status: 'For Approval',
        abstract: '...',
        documents: [],
        authors: [],
        tags: [],
      },
      {
        id: 'TH-2025-003',
        title: 'ThinkSpace – A space for academic ideas and ...',
        submissionDate: '2025-07-14 16:58:31',
        status: 'For Approval',
        abstract: '...',
        documents: [],
        authors: [],
        tags: [],
      },
      {
        id: 'TH-2025-004',
        title: 'Paperly – Lightweight, modern feel for storing ...',
        submissionDate: '2025-08-06 13:25:49',
        status: 'For Approval',
        abstract: '...',
        documents: [],
        authors: [],
        tags: [],
      },
      {
        id: 'CP-2025-004',
        title: 'Eduscan – Educational paper search and ...',
        submissionDate: '2025-09-09 10:40:05',
        status: 'For Approval',
        abstract: '...',
        documents: [],
        authors: [],
        tags: [],
      },
      {
        id: 'TH-2025-005',
        title: 'DocuNest – A “nest” for storing important ...',
        submissionDate: '2025-10-30 18:12:00',
        status: 'For Approval',
        abstract: '...',
        documents: [],
        authors: [],
        tags: [],
      },
      {
        id: 'CP-2025-005',
        title: 'ArchiveSphere - A comprehensive digital archive...',
        submissionDate: '2025-11-15 11:00:00',
        status: 'For Approval',
        abstract: '...',
        documents: [],
        authors: [],
        tags: [],
      },
      {
        id: 'TH-2025-006',
        title: 'IntellectaHub - A hub for intellectual works...',
        submissionDate: '2025-12-01 22:30:00',
        status: 'For Approval',
        abstract: '...',
        documents: [],
        authors: [],
        tags: [],
      },
      {
        id: 'CP-2025-006',
        title: 'ThesisReef - A reef of academic papers...',
        submissionDate: '2024-12-25 10:00:00',
        status: 'For Approval',
        abstract: '...',
        documents: [],
        authors: [],
        tags: [],
      },
    ];

    // enrich with common fields
    return base.map((doc) => ({
      ...doc,
      abstract:
        'This is a centrally managed digital repository designed to streamline the storage, retrieval, and dissemination of academic research outputs. It empowers students, educators, and researchers alike.',
      documents: [
        { name: 'Thesis Manuscript', file: `${doc.title.split(' ')[0]}_Manuscript.pdf` },
        { name: 'Copyright Form', file: `${doc.title.split(' ')[0]}_Copyright.pdf` },
        { name: 'Turnitin AI Checker Result', file: `${doc.title.split(' ')[0]}_Turnitin.pdf` },
        { name: 'Approval Sheet', file: `${doc.title.split(' ')[0]}_Approval.pdf` },
        { name: 'Certificate of Completion', file: `${doc.title.split(' ')[0]}_COC.pdf` },
      ],
      authors: ['Aithea Ramos', 'Jericho Santos', 'Danica Reyes', 'Miguel Dela Cruz'],
      tags: ['Academic Research', 'Digital Repository', 'Thesis Archive', 'Semantic Search'],
    }));
  }
}
