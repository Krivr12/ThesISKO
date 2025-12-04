import { Component, OnInit } from '@angular/core';
import { Navbar } from '../navbar/navbar';
import { SearchBar } from '../search-bar/search-bar';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { ButtonModule } from 'primeng/button';
import { CarouselModule } from 'primeng/carousel';
import { Footer } from '../footer/footer';
import { RecordsService } from '../../service/records.service';
import { DatePipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { Auth } from '../../service/auth';

interface UpdateItem {
  // data para sa carousel cards (matches backend /latest/ endpoint)
  _id: string;
  document_id: string;
  title: string;
  submitted_at: string;
  year?: number | string; // Year extracted from submitted_at or from document year field
  authors: string[];
  tags: string[];
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    Navbar,
    Footer,
    SearchBar,
    IconFieldModule,
    InputIconModule,
    ButtonModule,
    CarouselModule,
    DatePipe,
    FormsModule,
    CommonModule,
    RouterLink
  ],
  providers: [DatePipe],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home implements OnInit {
  homeQuery = '';           
  updates: UpdateItem[] = []; // items shown in carousel

 
  /**
   * Responsive options for PrimeNG carousel
   * Breakpoints work as max-width (applies when screen width <= breakpoint)
   * 
   * - Default (≥1024px): 3 items visible
   * - ≤1023px: 2 items visible
   * - ≤767px: 1 item visible
   */
  responsiveOptions = [
    {
      breakpoint: '1023px',
      numVisible: 2,
      numScroll: 1
    },
    {
      breakpoint: '767px',
      numVisible: 1,
      numScroll: 1
    }
  ];

  constructor(
    private router: Router,                 
    private recordsService: RecordsService, // API calls
    private datePipe: DatePipe,
    private authService: Auth
  ) {}

  // carousel data
  ngOnInit() {
    this.recordsService.getLatestRecords().subscribe({
      next: (data) => {
        // Backend now returns the correct structure, no mapping needed
        this.updates = data || [];
        
        // Debug: Log first item to check year field and full structure
        if (this.updates.length > 0) {
          console.log('📊 First carousel item (full object):', this.updates[0]);
          console.log('📅 Year value:', this.updates[0].year);
          console.log('📅 Year type:', typeof this.updates[0].year);
          
          // Check if year is accessible
          if (this.updates[0].year) {
            console.log('✅ Year is available:', this.updates[0].year);
          } else {
            console.warn('⚠️ Year is missing or undefined');
          }
        }
      },
      error: (err) => console.error('Error fetching latest records:', err) 
    });
  }

  // Check if user is a PUPian (student or group leader) AND logged in
  isPupian(): boolean {
    const currentUser = this.authService.currentUser;
    
    // If no user is logged in, don't show button
    if (!currentUser) return false;
    
    // Role ID 2 = Student, Role ID 6 = Group Leader
    return currentUser.role_id === 2 || currentUser.role_id === 6;
  }

  // click sa carousel item -> punta sa Search Result 
  navigateToRecord(item: UpdateItem) {
    if (!item || !item._id) {
      console.error('Invalid carousel item - missing _id');
      return;
    }
    
    console.log('Carousel item clicked - navigating to search-result with document_id:', item._id);
    console.log('Current user:', this.authService.currentUser);
    
    // Pass document_id in state (same pattern as search-thesis -> search-result)
    // Use navigateByUrl with state for more reliable navigation
    this.router.navigateByUrl('/search-result', { 
      state: { document_id: item._id } 
    }).then(success => {
      if (success) {
        console.log('Navigation to /search-result successful');
      } else {
        console.error('Navigation to /search-result failed - guard may have blocked it');
        // If navigation fails, try again after a short delay (in case user is still loading)
        setTimeout(() => {
          this.router.navigateByUrl('/search-result', { 
            state: { document_id: item._id } 
          }).catch(err => {
            console.error('Retry navigation failed:', err);
          });
        }, 100);
      }
    }).catch(error => {
      console.error('Navigation error:', error);
    });
  }

  // search function
  goSearch() {
    const q = (this.homeQuery || '').trim();
    this.router.navigate(['/search-thesis'], {
      queryParams: { q: q || null }
    });
  }
}