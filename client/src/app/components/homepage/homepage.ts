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
  _id: string;
  document_id: string;
  title: string;
  submitted_at: string;
  year?: number | string;
  authors: string[];
  tags: string[];
}

@Component({
  selector: 'app-homepage',
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
  templateUrl: './homepage.html',
  styleUrl: './homepage.css'
})
export class Homepage implements OnInit, OnDestroy {
  homeQuery = '';
  updates: UpdateItem[] = [];

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

  itemsPerPage = 3;
  autoplayInterval: any;

  constructor(
    private router: Router,
    private recordsService: RecordsService,
    private datePipe: DatePipe,
    private authService: Auth,
    private modalService: ModalService
  ) {}

  @HostListener('window:resize')
  onResize() {
    this.updateItemsPerPage();
  }

  ngOnInit() {
    this.updateItemsPerPage();
    this.recordsService.getLatestRecords().subscribe({
      next: (data) => {
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

  isPupian(): boolean {
    const currentUser = this.authService.currentUser;

    if (!currentUser) return false;

    return currentUser.role_id === 2 || currentUser.role_id === 6;
  }

  navigateToRecord(item: UpdateItem) {
    if (!this.authService.currentUser) {
      this.modalService.showLoginRequired('To view document details, you must be logged in with your official account.');
      return;
    }

    if (!item || !item._id) {
      return;
    }

    this.router.navigateByUrl('/search-result', {
      state: { document_id: item._id }
    }).then(success => {
      if (success) {
      } else {
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

  goSearch() {
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
