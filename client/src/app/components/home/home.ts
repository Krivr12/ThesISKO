import { Component, OnInit } from '@angular/core';
import { Navbar } from '../navbar/navbar';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { ButtonModule } from 'primeng/button';
import { CarouselModule } from 'primeng/carousel';
import { Footer } from '../footer/footer';
import { RecordsService } from '../../service/records.service';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';

interface UpdateItem {
  // data para sa carousel cards
  id: string;
  title: string;
  submitted_at: string;
  authors: string[];
  access_level?: string;
  tags: string[];
  program?: string;
  document_type?: string;
  abstract?: string;
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
    FormsModule,    
    RouterLink        
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
        // map API -> UI model
        this.updates = (data || []).map((item: any) => ({
          id: item.id ?? item._id,
          title: item.title,
          submitted_at: item.submitted_at,
          authors: item.authors ?? [],
          tags: item.tags ?? [],
          access_level: item.access_level ?? 'Unknown',
          program: item.program,
          document_type: item.document_type,
          abstract: item.abstract ?? item.abstract_text ?? item.summary ?? ''
        }));
      },
      error: (err) => console.error('Error fetching latest records:', err) 
    });
  }

  // click sa carousel item -> punta sa Search Result 
  navigateToRecord(item: UpdateItem) {
    this.router.navigate(['/search-result'], { state: { thesis: item } });
  }

  // search function
  goSearch() {
    const q = (this.homeQuery || '').trim();
    this.router.navigate(['/search-thesis'], {
      queryParams: { q: q || null }
    });
  }
}
