import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { signal } from '@angular/core';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';

import { Navbar } from '../navbar/navbar';
import { Footer } from '../footer/footer';

interface Thesis {
  _id: string;
  doc_id: string;
  title: string;
  abstract: string;
  submitted_at: string; // ISO date string
  access_level: string;
  authors: string[];
  tags: string[];
  program: string;
  document_type: string;
}

@Component({
  selector: 'app-search-thesis',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, Navbar, Footer, MatPaginatorModule],
  templateUrl: 'search-thesis.html',
  styleUrls: ['search-thesis.css']
})
export class SearchThesis implements OnInit {

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  // Pagination (driven by <mat-paginator>)
  totalItems = 0;
  itemsPerPage = 10;     // match your mat-paginator [pageSize]
  currentPage = 1;      // 1-based for easier slicing

  // Filters
  isCollapsed = false;
  searchQuery = '';
  selectedTags: string[] = [];
  selectedYear = '';
  authorName = '';

  // Data
  allTheses: Thesis[] = [];
  filteredTheses: Thesis[] = [];
  displayedTheses: Thesis[] = [];

  // Signals
  predefinedTags = signal<string[]>([
    'Technology','Information Systems','Web Application','Mobile Application',
    'Artificial Intelligence','Data Science','Cloud Computing','Cybersecurity',
    'User Experience','Database'
  ]);
  availableYears = signal<number[]>([]);

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    // Single source of truth: URL query param `q`
    this.route.queryParamMap.subscribe(params => {
      const q = (params.get('q') || '').trim();
      this.searchQuery = q;

      // reset paging whenever the search term changes
      this.currentPage = 1;
      this.paginator?.firstPage();

      if (q) {
        this.doSemanticSearch(q);
      } else {
        this.fetchAllRecords();
      }
    });
  }

  // ------------------------
  // Data fetching
  // ------------------------
  private fetchAllRecords(): void {
    this.http.get<Thesis[]>('http://localhost:5050/records').subscribe({
      next: (data) => {
        this.allTheses = data;

        const years = [...new Set(
          this.allTheses
            .map(t => new Date(t.submitted_at).getFullYear())
            .filter(y => !Number.isNaN(y))
        )].sort((a,b) => b - a);
        this.availableYears.set(years);

        this.applyFilters();
      },
      error: (err) => console.error('❌ Error fetching records:', err)
    });
  }

  private doSemanticSearch(q: string): void {
    this.http.post<{ results: any[] }>('http://localhost:5050/records/search', {
      query: q,
      topK: 20
    }).subscribe({
      next: (res) => {
        this.allTheses = res.results.map(r => ({
          _id: r._id,
          doc_id: r.doc_id ?? '',
          title: r.title,
          abstract: r.abstract ?? '',
          submitted_at: r.submitted_at,
          access_level: r.access_level ?? '',
          authors: r.authors || [],
          tags: r.tags || [],
          program: r.program ?? '',
          document_type: r.document_type ?? ''
        }));
        this.applyFilters();
      },
      error: (err) => console.error('❌ Semantic search error:', err)
    });
  }

  // ------------------------
  // Search + filters
  // ------------------------
  onSearch(): void {
    const q = (this.searchQuery || '').trim();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: q || null },
      queryParamsHandling: 'merge'
    });
  }

  toggleFilters(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  onTagChange(tag: string, event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.selectedTags = isChecked
      ? [...this.selectedTags, tag]
      : this.selectedTags.filter(t => t !== tag);

    this.currentPage = 1;
    this.paginator?.firstPage();
    this.applyFilters();
  }

  onYearChange(year: string): void {
    this.selectedYear = year;
    this.currentPage = 1;
    this.paginator?.firstPage();
    this.applyFilters();
  }

  onAuthorChange(): void {
    this.currentPage = 1;
    this.paginator?.firstPage();
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedTags = [];
    this.selectedYear = '';
    this.authorName = '';
    this.currentPage = 1;
    this.paginator?.firstPage();

    // Also clear query param; subscription will reload all
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: null },
      queryParamsHandling: 'merge'
    });
  }

  applyFilters(): void {
    this.filteredTheses = this.allTheses.filter(thesis => {
      const matchesTags =
        this.selectedTags.length === 0 ||
        this.selectedTags.some(tag => thesis.tags.includes(tag));

      const thesisYear = new Date(thesis.submitted_at).getFullYear().toString();
      const matchesYear =
        this.selectedYear === '' || thesisYear === this.selectedYear;

      const matchesAuthor =
        this.authorName === '' ||
        thesis.authors.some(a =>
          a.toLowerCase().includes(this.authorName.toLowerCase())
        );

      return matchesTags && matchesYear && matchesAuthor;
    });

    this.totalItems = this.filteredTheses.length;
    this.updateDisplayedTheses();
  }

  // ------------------------
  // Pagination wiring
  // ------------------------
  onPage(event: PageEvent): void {
    this.itemsPerPage = event.pageSize;
    this.currentPage = event.pageIndex + 1; // convert 0-based -> 1-based
    this.updateDisplayedTheses();
  }

  private updateDisplayedTheses(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.displayedTheses = this.filteredTheses.slice(startIndex, endIndex);
  }

  // ------------------------
  // Navigation
  // ------------------------
  viewThesis(thesis: Thesis): void {
    this.http.post<Thesis[]>('http://localhost:5050/records/theses/by-ids', {
      ids: [thesis._id]
    }).subscribe({
      next: (res) => {
        if (res.length > 0) {
          this.router.navigate(['/search-result'], { state: { thesis: res[0] } });
        }
      },
      error: (err) => console.error('❌ Error fetching thesis details:', err)
    });
  }
}
