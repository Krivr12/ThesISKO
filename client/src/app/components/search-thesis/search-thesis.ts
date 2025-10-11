import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Navbar } from '../navbar/navbar';
import { Footer } from "../footer/footer";
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

interface Thesis {
  _id: string;
  document_id: string;
  title: string;
  author: string;
  year: number;
  keywords: string[];
}

@Component({
  selector: 'app-search-thesis',
  standalone: true,
  imports: [CommonModule, FormsModule, Navbar, Footer, HttpClientModule],
  templateUrl: './search-thesis.html',
  styleUrl: './search-thesis.css'
})
export class SearchThesis implements OnInit {
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

  // can add tags here
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
    this.http.get<Thesis[]>('http://localhost:5050/records/').subscribe({
      next: (data) => {
        this.allTheses = data;
        this.updateAvailableYears();
        this.applyFilters();
        this.isLoading = false; // Hide spinner, show content
      },
      error: (error) => {
        console.error('Error loading theses:', error);
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
    this.http.post<{results: any[]}>('http://localhost:5050/records/search', {
      query: query.trim(),
      topK: 20 // Get more results for better filtering
    }).subscribe({
      next: (response) => {
        // Transform semantic search results to match Thesis interface
        this.allTheses = response.results.map(doc => {
          const firstAuthor = doc.authors && doc.authors.length > 0 
            ? doc.authors[0] 
            : "Unknown Author";
          
          let year = null;
          if (doc.submitted_at) {
            try {
              year = new Date(doc.submitted_at).getFullYear();
            } catch (dateError) {
              year = new Date().getFullYear();
            }
          } else {
            year = new Date().getFullYear();
          }
          
          return {
            _id: doc._id,
            document_id: doc._id?.toString(),
            title: doc.title || "Untitled",
            author: firstAuthor,
            year: year,
            keywords: doc.tags || []
          };
        });
        
        this.updateAvailableYears();
        this.applyFilters();
        this.isLoading = false; // Hide spinner, show content
      },
      error: (error) => {
        console.error('Error performing semantic search:', error);
        // Fallback to regular search on error
        this.loadTheses();
      }
    });
  }

  updateAvailableYears(): void {
    // Extract unique years from theses
    const years = [...new Set(this.allTheses.map(thesis => thesis.year))].sort((a, b) => b - a);
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
      // Search query filter
      const matchesSearch = this.searchQuery === '' || 
        thesis.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        thesis.author.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        thesis.keywords.some(kw => kw.toLowerCase().includes(this.searchQuery.toLowerCase()));
      
      // Tag filter
      const matchesTags = this.selectedTags.length === 0 || 
        this.selectedTags.some(tag => 
          thesis.keywords.some(kw => kw.toLowerCase().includes(tag.toLowerCase()))
        );
      
      // Year filter
      const matchesYear = this.selectedYear === '' || 
        thesis.year.toString() === this.selectedYear;
      
      // Author filter
      const matchesAuthor = this.authorName === '' || 
        thesis.author.toLowerCase().includes(this.authorName.toLowerCase());
      
      return matchesSearch && matchesTags && matchesYear && matchesAuthor;
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
    console.log('🔍 [SEARCH-THESIS] Navigating to search-result with _id:', thesis._id);
    console.log('🔍 [SEARCH-THESIS] Document ID for display:', thesis.document_id);
    console.log('🔍 [SEARCH-THESIS] Full thesis object:', thesis);
    this.router.navigate(['/search-result'], { 
      state: { document_id: thesis._id } // Use _id for navigation
    });
  }
}