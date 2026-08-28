import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Navbar } from '../navbar/navbar';
import { Footer } from "../footer/footer";
import { SearchBar } from '../search-bar/search-bar';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';

interface Thesis {
  _id: string;
  document_id: string;
  title: string;
  author: string;
  authors?: string[]; // Full array from API for filtering by any author
  year: number | string; // Can be number or "N/A"
  keywords: string[];
}

@Component({
  selector: 'app-search-thesis',
  standalone: true,
  imports: [CommonModule, FormsModule, Navbar, Footer, SearchBar, HttpClientModule, MatPaginatorModule],
  templateUrl: './search-thesis.html',
  styleUrl: './search-thesis.css'
})
export class SearchThesis implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  
  constructor(private router: Router, private http: HttpClient, private route: ActivatedRoute) {}
  totalItems: number = 0;
  itemsPerPage: number = 8;
  currentPage: number = 1;
  maxPageButtons: number = 5;
  totalPages: number = 0;
  pages: number[] = [];
  
  isCollapsed: boolean = false;
  searchQuery: string = '';
  isLoading: boolean = true; // Loading state for spinner
  
  // filter states
  selectedTags: string[] = [];
  selectedYear: string = '';
  authorName: string = '';
  customTagInput: string = ''; //added filter state for custom tag
  sortBy: string = 'relevance'; // sorting mode: relevance | newest | oldest | title

  // user-added tags
  customTags = signal<string[]>([]);

  // get unique years from theses
  availableYears = signal<number[]>([]);

  allTheses: Thesis[] = [];

  filteredTheses: Thesis[] = [];
  displayedTheses: Thesis[] = [];

  ngOnInit(): void {
    // Check for query parameter from hero search
    this.route.queryParams.subscribe(params => {
      if (params['q'] && params['q'].trim() !== '') {
        this.searchQuery = params['q'];
        this.performSemanticSearch(params['q']);
      } else {
        this.loadTheses();
      }
    });
  }

  loadTheses(): void {
    this.isLoading = true; // Show spinner
    this.http.get<Thesis[]>(`${environment.recordsApiUrl}/`).subscribe({
      next: (data) => {
        this.allTheses = data;
        this.updateAvailableYears();
        this.applyFilters();
        this.isLoading = false; // Hide spinner, show content
      },
      error: (error) => {
        
        // Fallback to empty array if API fails
        this.allTheses = [];
        this.updateAvailableYears();
        this.applyFilters();
        this.isLoading = false; // Hide spinner even on error
      }
    });
  }

  // Semantic search method
  performSemanticSearch(query: string): void {
    if (!query || query.trim() === '') {
      this.loadTheses(); // Load all theses if query is empty
      return;
    }

    this.isLoading = true; // Show spinner
    this.http.post<{results: any[]}>(`${environment.recordsApiUrl}/search`, {
      query: query.trim(),
      topK: 20 // Get more results for better filtering
    }).subscribe({
      next: (response) => {
        // Transform semantic search results to match Thesis interface
        this.allTheses = response.results.map(doc => {
          const firstAuthor = doc.authors && doc.authors.length > 0 
            ? doc.authors[0] 
            : "Unknown Author";
          
          // Use year field directly, show "N/A" if not available
          const year = doc.year || "N/A";
          
          return {
            _id: doc._id,
            document_id: doc._id?.toString(),
            title: doc.title || "Untitled",
            author: firstAuthor,
            authors: doc.authors || [],
            year: year,
            keywords: doc.tags || []
          };
        });
        
        
        this.updateAvailableYears();
        this.applyFilters();
        this.isLoading = false; // Hide spinner, show content
      },
      error: (error) => {
        
        // Fallback to regular search on error
        this.loadTheses();
      }
    });
  }

  updateAvailableYears(): void {
    // Extract unique numeric years from theses, filter out "N/A"
    // Handle both string and number years, convert strings to numbers
    const years = [...new Set(
      this.allTheses
        .map(thesis => thesis.year)
        .filter(year => year !== "N/A" && year !== null && year !== undefined)
        .map(year => typeof year === 'string' ? parseInt(year, 10) : year)
        .filter(year => !isNaN(year) && isFinite(year))
    )].sort((a, b) => b - a);
    this.availableYears.set(years);
  }

  toggleFilters(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  onSearch(): void {
    this.currentPage = 1;
    // Use semantic search if there's a query, otherwise load all theses
    if (this.searchQuery && this.searchQuery.trim() !== '') {
      this.performSemanticSearch(this.searchQuery);
    } else {
      this.loadTheses();
    }
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

  setSort(value: string): void {
    this.sortBy = value;
    this.currentPage = 1;
    this.applyFilters();
  }

  get sortLabel(): string {
    switch (this.sortBy) {
      case 'newest': return 'Newest';
      case 'oldest': return 'Oldest';
      case 'title': return 'Title (A–Z)';
      default: return 'Relevance';
    }
  }

  private sortTheses(theses: Thesis[]): Thesis[] {
    const toYear = (y: number | string): number => {
      const n = typeof y === 'string' ? parseInt(y, 10) : y;
      return isNaN(n as number) || !isFinite(n as number) ? 0 : (n as number);
    };

    switch (this.sortBy) {
      case 'newest':
        return [...theses].sort((a, b) => toYear(b.year) - toYear(a.year));
      case 'oldest':
        return [...theses].sort((a, b) => toYear(a.year) - toYear(b.year));
      case 'title':
        return [...theses].sort((a, b) =>
          (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' })
        );
      default: // 'relevance' - preserve original/backend order
        return theses;
    }
  }

  // New function for adding user-inputted tags
  addCustomTag(): void {
    if (this.customTagInput.trim() && !this.customTags().includes(this.customTagInput.trim())) {
      this.customTags.update(tags => [...tags, this.customTagInput.trim()]);
      this.customTagInput = '';
    }
  }

  removeCustomTag(tag: string): void {
    this.customTags.update(tags => tags.filter(t => t !== tag));
    
    // Also remove from selected tags if it was selected
    this.selectedTags = this.selectedTags.filter(t => t !== tag);
    
    this.currentPage = 1;
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedTags = [];
    this.selectedYear = '';
    this.authorName = '';
    this.customTags.set([]);
    this.applyFilters();
  }

  applyFilters(): void {
    this.filteredTheses = this.allTheses.filter(thesis => {
      // Skip search query filter for semantic search results
      // The semantic search already filtered by relevance
      const matchesSearch = true; // Always true for semantic search results
      
      // Tag filter
      const matchesTags = this.selectedTags.length === 0 || 
        this.selectedTags.some(tag => 
          thesis.keywords.some(kw => kw.toLowerCase().includes(tag.toLowerCase()))
        );
      
      // Year filter - handle both string and number years
      const matchesYear = this.selectedYear === '' || 
        (thesis.year !== "N/A" && thesis.year !== null && thesis.year !== undefined &&
         thesis.year.toString() === this.selectedYear.toString());
      
      // Author filter: match if any author in the array (or single author) contains the search string
      const authorList = (thesis.authors && thesis.authors.length > 0) ? thesis.authors : [thesis.author];
      const matchesAuthor = this.authorName === '' ||
        authorList.some(a => (a || '').toLowerCase().includes(this.authorName.toLowerCase()));
      
      return matchesSearch && matchesTags && matchesYear && matchesAuthor;
    });

    this.filteredTheses = this.sortTheses(this.filteredTheses);

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

  onPage(event: PageEvent): void {
    this.itemsPerPage = event.pageSize;
    this.currentPage = event.pageIndex + 1; // convert 0-based -> 1-based
    this.updateDisplayedTheses();
  }

  viewThesis(thesis: Thesis): void {
    this.router.navigate(['/search-result'], { 
      state: { 
        document_id: thesis._id,
        searchQuery: this.searchQuery // Preserve search query for return navigation
      }
    });
  }
}
