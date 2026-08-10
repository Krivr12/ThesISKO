import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
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
import { ModalService } from '../../service/modal.service';

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
export class Home implements OnInit, OnDestroy {
  homeQuery = '';           
  updates: UpdateItem[] = []; // items shown in carousel

  // Carousel responsive options (3-2-1 rule)
  responsiveOptions: any[] = [
    {
      breakpoint: '1024px',
      numVisible: 3,
      numScroll: 1
    },
    {
      breakpoint: '768px',
      numVisible: 2,
      numScroll: 1
    },
    {
      breakpoint: '0px',
      numVisible: 1,
      numScroll: 1
    }
  ];

  // Carousel properties for responsive tracking
  itemsPerPage = 3;
  autoplayInterval: any;

  constructor(
    private router: Router,                 
    private recordsService: RecordsService, // API calls
    private datePipe: DatePipe,
    private authService: Auth,
    private modalService: ModalService
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
      },
      error: (err) => {
        // Error fetching latest records
      } 
    });
  }

  ngOnDestroy() {
    // Cleanup
  }

  // Update items per page based on screen width
  updateItemsPerPage() {
    const width = window.innerWidth;
    if (width < 768) {
      this.itemsPerPage = 1;
    } else if (width < 1024) {
      this.itemsPerPage = 2;
    } else {
      this.itemsPerPage = 3;
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
    // Check if user is authenticated
    if (!this.authService.currentUser) {
      this.modalService.showLoginRequired('To view document details, you must be logged in with your official account.');
      return;
    }
    
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
    // Check if user is authenticated
    if (!this.authService.currentUser) {
      this.modalService.showLoginRequired('To search for thesis, you must be logged in with your official account.');
      return;
    }
    
    const q = (this.homeQuery || '').trim();
    this.router.navigate(['/search-thesis'], {
      queryParams: { q: q || null }
    });
  }
}
