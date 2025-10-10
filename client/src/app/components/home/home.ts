import { Component, OnInit } from '@angular/core';
import { Navbar } from '../navbar/navbar';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { ButtonModule } from 'primeng/button';
import { CarouselModule } from 'primeng/carousel';
import { Footer } from '../footer/footer';
import { RecordsService } from '../../service/records.service';
import { DatePipe, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';

interface UpdateItem {
  // data para sa carousel cards (matches backend /latest/ endpoint)
  _id: string;
  document_id: string;
  title: string;
  submitted_at: string;
  authors: string[];
  tags: string[];
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    Navbar,
    Footer,
    IconFieldModule,
    InputIconModule,
    ButtonModule,
    CarouselModule,
    DatePipe,
    SlicePipe,
    FormsModule
  ],
  providers: [DatePipe],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home implements OnInit {
  homeQuery = '';           
  updates: UpdateItem[] = []; // items shown in carousel

 
  responsiveOptions = [
    { breakpoint: '1200px', numVisible: 3, numScroll: 1 },
    { breakpoint: '992px',  numVisible: 2, numScroll: 1 },
    { breakpoint: '768px',  numVisible: 1, numScroll: 1 }
  ];

  constructor(
    private router: Router,                 
    private recordsService: RecordsService, // API calls
    private datePipe: DatePipe             
  ) {}

  // carousel data
  ngOnInit() {
    this.recordsService.getLatestRecords().subscribe({
      next: (data) => {
        // Backend now returns the correct structure, no mapping needed
        this.updates = data || [];
      },
      error: (err) => console.error('Error fetching latest records:', err) 
    });
  }

  // click sa carousel item -> punta sa Search Result 
  navigateToRecord(item: UpdateItem) {
    // Pass document_id in state (same pattern as search-thesis -> search-result)
    this.router.navigate(['/search-result'], { 
      state: { document_id: item._id } 
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