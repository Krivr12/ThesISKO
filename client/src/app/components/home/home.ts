import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Navbar } from '../navbar/navbar';
import { SearchBar } from '../search-bar/search-bar';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { ButtonModule } from 'primeng/button';
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
    DatePipe,
    FormsModule,
    CommonModule,
    RouterLink
  ],
  providers: [DatePipe],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home implements OnInit, OnDestroy {
  homeQuery = '';           
  updates: UpdateItem[] = []; // items shown in carousel

  // Custom carousel properties
  currentIndex = 0;
  itemsPerPage = 3;
  autoplayInterval: any;
  touchStartX = 0;
  touchEndX = 0;

  // Calculate translateX percentage for smooth sliding
  get translateX(): number {
    // Each item takes (100 / itemsPerPage)% of the visible area
    // We need to account for the gap between items
    const itemWidth = 100 / this.itemsPerPage;
    return -this.currentIndex * itemWidth;
  }

  constructor(
    private router: Router,                 
    private recordsService: RecordsService, // API calls
    private datePipe: DatePipe,
    private authService: Auth
  ) {}

  @HostListener('window:resize')
  onResize() {
    this.updateItemsPerPage();
  }

  // carousel data
  ngOnInit() {
    this.updateItemsPerPage();
    this.recordsService.getLatestRecords().subscribe({
      next: (data) => {
        // Backend now returns the correct structure, no mapping needed
        this.updates = data || [];
        
        // Debug: Log first item to check year field and full structure
        if (this.updates.length > 0) {
          
          // Check if year is accessible
          if (this.updates[0].year) {
          } else {
            
          }
        }
        
        // Start autoplay after data loads
        this.startAutoplay();
      },
      error: (err) => {
        // Error fetching latest records
      } 
    });
  }

  ngOnDestroy() {
    this.stopAutoplay();
  }

  // Update items per page based on screen width
  updateItemsPerPage() {
    const width = window.innerWidth;
    if (width <= 767) {
      this.itemsPerPage = 1;
    } else if (width <= 1023) {
      this.itemsPerPage = 2;
    } else {
      this.itemsPerPage = 3;
    }
    // Ensure currentIndex is valid after resize
    const maxIndex = Math.max(0, this.updates.length - this.itemsPerPage);
    if (this.currentIndex > maxIndex) {
      this.currentIndex = maxIndex;
    }
  }

  // Get visible items for current page
  get visibleItems(): UpdateItem[] {
    return this.updates.slice(this.currentIndex, this.currentIndex + this.itemsPerPage);
  }

  // Get total number of pages/dots
  get totalPages(): number {
    return Math.max(1, this.updates.length - this.itemsPerPage + 1);
  }

  // Navigate to previous items
  prevSlide() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
    } else {
      // Loop to end
      this.currentIndex = Math.max(0, this.updates.length - this.itemsPerPage);
    }
  }

  // Navigate to next items
  nextSlide() {
    if (this.currentIndex < this.updates.length - this.itemsPerPage) {
      this.currentIndex++;
    } else {
      // Loop to beginning
      this.currentIndex = 0;
    }
  }

  // Go to specific page
  goToPage(index: number) {
    this.currentIndex = index;
  }

  // Start autoplay
  startAutoplay() {
    this.stopAutoplay();
    this.autoplayInterval = setInterval(() => {
      this.nextSlide();
    }, 3000);
  }

  // Stop autoplay
  stopAutoplay() {
    if (this.autoplayInterval) {
      clearInterval(this.autoplayInterval);
    }
  }

  // Pause autoplay on hover
  onCarouselMouseEnter() {
    this.stopAutoplay();
  }

  // Resume autoplay on mouse leave
  onCarouselMouseLeave() {
    this.startAutoplay();
  }

  // Touch events for mobile swipe
  onTouchStart(event: TouchEvent) {
    this.touchStartX = event.touches[0].clientX;
  }

  onTouchEnd(event: TouchEvent) {
    this.touchEndX = event.changedTouches[0].clientX;
    this.handleSwipe();
  }

  handleSwipe() {
    const diff = this.touchStartX - this.touchEndX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        this.nextSlide();
      } else {
        this.prevSlide();
      }
    }
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
      
      return;
    }
    
    
    // Pass document_id in state (same pattern as search-thesis -> search-result)
    // Use navigateByUrl with state for more reliable navigation
    this.router.navigateByUrl('/search-result', { 
      state: { document_id: item._id } 
    }).then(success => {
      if (success) {
      } else {
        
        // If navigation fails, try again after a short delay (in case user is still loading)
        setTimeout(() => {
          this.router.navigateByUrl('/search-result', { 
            state: { document_id: item._id } 
          }).catch(err => {
            
          });
        }, 100);
      }
    }).catch(error => {
      
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
