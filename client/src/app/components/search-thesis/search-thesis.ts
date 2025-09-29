import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Navbar } from '../navbar/navbar';
import { Footer } from "../footer/footer";
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

interface Thesis {
  _id: string;
  doc_id: string;
  title: string;
  abstract: string;
  submitted_at: string;
  access_level: string;
  authors: string[];
  tags: string[];
  program: string;
  document_type: string;
}

@Component({
  selector: 'app-search-thesis',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, Navbar, Footer],
  templateUrl: 'search-thesis.html',
  styleUrls: ['search-thesis.css']
})
export class SearchThesis implements OnInit {
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  // Pagination
  totalItems = 0;
  itemsPerPage = 8;
  currentPage = 1;
  maxPageButtons = 5;
  totalPages = 0;
  pages: number[] = [];

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

  ngOnInit(): void {
    // Single source of truth: URL query param `q`
    this.route.queryParamMap.subscribe(params => {
      const q = (params.get('q') || '').trim();
      this.searchQuery = q; // pre-fill the input

      // reset pagination on every new q
      this.currentPage = 1;

      if (q) {
        this.doSemanticSearch(q);
      } else {
        this.fetchAllRecords();
      }
    });
  }

  private fetchAllRecords(): void {
    this.http.get<Thesis[]>('https://thesisko-server.vercel.app//records').subscribe({
      next: (data) => {
        this.allTheses = data;

        const years = [...new Set(
          this.allTheses.map(t => new Date(t.submitted_at).getFullYear())
        )].sort((a,b) => b - a);
        this.availableYears.set(years);

        this.applyFilters();
      },
      error: (err) => console.error("❌ Error fetching records:", err)
    });
  }

  // Push q to URL; the subscription above will run the actual search/fetch
  onSearch(): void {
    const q = (this.searchQuery || '').trim();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: q || null },
      queryParamsHandling: 'merge'
    });
  }

  private doSemanticSearch(q: string): void {
    this.http.post<{ results: any[] }>('https://thesisko-server.vercel.app//records/search', {
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
      error: (err) => console.error("❌ Semantic search error:", err)
    });
  }

  toggleFilters(): void { this.isCollapsed = !this.isCollapsed; }

  onTagChange(tag: string, event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.selectedTags = isChecked
      ? [...this.selectedTags, tag]
      : this.selectedTags.filter(t => t !== tag);
    this.currentPage = 1;
    this.applyFilters();
  }

  onYearChange(year: string): void {
    this.selectedYear = year;
    this.currentPage = 1;
    this.applyFilters();
  }

  onAuthorChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedTags = [];
    this.selectedYear = '';
    this.authorName = '';
    this.currentPage = 1;
    // Update URL too (removes q), then subscription reloads all
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: null },
      queryParamsHandling: 'merge'
    });
  }

  applyFilters(): void {
    this.filteredTheses = this.allTheses.filter(thesis => {
      const matchesTags = this.selectedTags.length === 0 ||
        this.selectedTags.some(tag => thesis.tags.includes(tag));

      const thesisYear = new Date(thesis.submitted_at).getFullYear().toString();
      const matchesYear = this.selectedYear === '' || thesisYear === this.selectedYear;

      const matchesAuthor = this.authorName === '' ||
        thesis.authors.some(a => a.toLowerCase().includes(this.authorName.toLowerCase()));

      return matchesTags && matchesYear && matchesAuthor;
    });

    this.totalItems = this.filteredTheses.length;
    this.calculatePagination();
    this.updateDisplayedTheses();
  }

  private calculatePagination(): void {
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    this.pages = this.getPageRange();
  }

  private getPageRange(): number[] {
    let startPage: number, endPage: number;
    const half = Math.floor(this.maxPageButtons / 2);

    if (this.totalPages <= this.maxPageButtons) {
      startPage = 1; endPage = this.totalPages;
    } else if (this.currentPage <= half) {
      startPage = 1; endPage = this.maxPageButtons;
    } else if (this.currentPage + half >= this.totalPages) {
      startPage = this.totalPages - this.maxPageButtons + 1;
      endPage = this.totalPages;
    } else {
      startPage = this.currentPage - half;
      endPage = this.currentPage + half;
    }
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  }

  private updateDisplayedTheses(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.displayedTheses = this.filteredTheses.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.calculatePagination();
      this.updateDisplayedTheses();
    }
  }

  viewThesis(thesis: Thesis): void {
    this.http.post<Thesis[]>('https://thesisko-server.vercel.app//records/theses/by-ids', {
      ids: [thesis._id]
    }).subscribe({
      next: (res) => {
        if (res.length > 0) {
          this.router.navigate(['/search-result'], { state: { thesis: res[0] } });
        }
      },
      error: (err) => console.error("❌ Error fetching thesis details:", err)
    });
  }
}
