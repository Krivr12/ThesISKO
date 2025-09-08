import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Navbar } from '../navbar/navbar';
import { Footer } from "../footer/footer";
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

interface Thesis {
  _id: string;
  doc_id: string;
  title: string;
  abstract: string;
  submitted_at: string; // we'll parse year dynamically
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
  constructor(private router: Router, private http: HttpClient) {}

  // Pagination
  totalItems: number = 0;
  itemsPerPage: number = 8;
  currentPage: number = 1;
  maxPageButtons: number = 5;
  totalPages: number = 0;
  pages: number[] = [];

  // Filters
  isCollapsed: boolean = false;
  searchQuery: string = '';
  selectedTags: string[] = [];
  selectedYear: string = '';
  authorName: string = '';

  // Data containers
  allTheses: Thesis[] = [];
  filteredTheses: Thesis[] = [];
  displayedTheses: Thesis[] = [];

  // Signals
  predefinedTags = signal<string[]>([
    'Technology',
    'Information Systems',
    'Web Application',
    'Mobile Application',
    'Artificial Intelligence',
    'Data Science',
    'Cloud Computing',
    'Cybersecurity',
    'User Experience',
    'Database'
  ]);
  availableYears = signal<number[]>([]);

  ngOnInit(): void {
    this.fetchAllRecords();
  }

  private fetchAllRecords(): void {
    this.http.get<Thesis[]>('http://localhost:5050/records').subscribe({
      next: (data) => {
        this.allTheses = data;

        // Extract years from submitted_at
        const years = [...new Set(
          this.allTheses.map(thesis => new Date(thesis.submitted_at).getFullYear())
        )].sort((a, b) => b - a);
        this.availableYears.set(years);

        this.applyFilters();
      },
      error: (err) => {
        console.error("❌ Error fetching records:", err);
      }
    });
  }

  toggleFilters(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  onSearch(): void {
    if (!this.searchQuery.trim()) {
      this.applyFilters();
      return;
    }

    this.http.post<{ results: any[] }>('http://localhost:5050/records/search', {
      query: this.searchQuery,
      topK: 10
    }).subscribe({
      next: (res) => {
        // Replace allTheses with partial results from semantic search
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
      error: (err) => {
        console.error("❌ Semantic search error:", err);
      }
    });
  }

  onTagChange(tag: string, event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    if (isChecked) {
      this.selectedTags.push(tag);
    } else {
      this.selectedTags = this.selectedTags.filter(t => t !== tag);
    }
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
    this.applyFilters();
  }

  applyFilters(): void {
    this.filteredTheses = this.allTheses.filter(thesis => {
      // Tag filter (exact match)
      const matchesTags = this.selectedTags.length === 0 ||
        this.selectedTags.some(tag => thesis.tags.includes(tag));

      // Year filter
      const thesisYear = new Date(thesis.submitted_at).getFullYear().toString();
      const matchesYear = this.selectedYear === '' || thesisYear === this.selectedYear;

      // Author filter
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
    const halfMaxButtons = Math.floor(this.maxPageButtons / 2);

    if (this.totalPages <= this.maxPageButtons) {
      startPage = 1;
      endPage = this.totalPages;
    } else if (this.currentPage <= halfMaxButtons) {
      startPage = 1;
      endPage = this.maxPageButtons;
    } else if (this.currentPage + halfMaxButtons >= this.totalPages) {
      startPage = this.totalPages - this.maxPageButtons + 1;
      endPage = this.totalPages;
    } else {
      startPage = this.currentPage - halfMaxButtons;
      endPage = this.currentPage + halfMaxButtons;
    }

    return Array.from(Array(endPage - startPage + 1).keys()).map(i => startPage + i);
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
    this.http.post<Thesis[]>('http://localhost:5050/records/theses/by-ids', {
      ids: [thesis._id]
    }).subscribe({
      next: (res) => {
        if (res.length > 0) {
          this.router.navigate(['/search-result'], { state: { thesis: res[0] } });
        }
      },
      error: (err) => {
        console.error("❌ Error fetching thesis details:", err);
      }
    });
  }
}
