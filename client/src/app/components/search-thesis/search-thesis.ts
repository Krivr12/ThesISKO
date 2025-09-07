import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Navbar } from '../navbar/navbar';
import { Footer } from "../footer/footer";
import { Router } from '@angular/router';

// Updated interface to match backend response
interface SearchResult {
  _id: string;
  title: string;
  abstract: string;
  score: number;
}

interface SearchResponse {
  results: SearchResult[];
}

@Component({
  selector: 'app-search-thesis',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, Navbar, Footer],
  templateUrl: './search-thesis.html',
  styleUrl: './search-thesis.css'
})
export class SearchThesis implements OnInit {
  constructor(private router: Router) {}
  totalItems: number = 0;
  itemsPerPage: number = 8;
  currentPage: number = 1;
  maxPageButtons: number = 5;
  totalPages: number = 0;
  pages: number[] = [];
  
  // UI state
  isCollapsed: boolean = false;
  searchQuery: string = '';
  
  // filter states
  selectedTags: string[] = [];
  selectedYear: string = '';
  authorName: string = '';

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

  // get unique years from theses
  availableYears = signal<number[]>([]);

  // Display data
  displayedResults: SearchResult[] = [];

  filteredTheses: Thesis[] = [];
  displayedTheses: Thesis[] = [];

  ngOnInit(): void {
    // Extract unique years from theses
    const years = [...new Set(this.allTheses.map(thesis => thesis.year))].sort((a, b) => b - a);
    this.availableYears.set(years);
    
    this.applyFilters();
  }

  toggleFilters(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  onSearch(): void {
    this.currentPage = 1;
    this.applyFilters();
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

  private updateDisplayedResults(): void {
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
    this.router.navigate(['/search-result'], { 
      state: { thesis: thesis } 
    });
  }
}
