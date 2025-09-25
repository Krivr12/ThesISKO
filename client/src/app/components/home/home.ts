import { Component, OnInit } from '@angular/core';
import { Navbar } from '../navbar/navbar';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { Button, ButtonModule } from 'primeng/button';
import { CarouselModule } from 'primeng/carousel';
import { Footer } from '../footer/footer';
import { RecordsService } from '../../service/records.service';
import { DatePipe } from '@angular/common'; 
import { FormsModule } from '@angular/forms';      
import { RouterLink, Router } from '@angular/router'; 


interface UpdateItem {
  title: string;
  submitted_at: string;
  authors: string[];
  access_level: string;
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
    FormsModule,
    ButtonModule,

  ],
  providers: [DatePipe],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home implements OnInit {
  homeQuery = '';
  updates: UpdateItem[] = [];

  responsiveOptions = [
    { breakpoint: '1200px', numVisible: 3, numScroll: 1 },
    { breakpoint: '992px',  numVisible: 2, numScroll: 1 },
    { breakpoint: '768px',  numVisible: 1, numScroll: 1 }
  ];

  constructor(
    private router: Router,
    private recordsService: RecordsService,
    private datePipe: DatePipe
  ) {}

  ngOnInit() {
    this.recordsService.getLatestRecords().subscribe({
      next: (data) => {
        this.updates = data.map((item: any) => ({
          ...item,
          submitted_at: this.datePipe.transform(item.submitted_at, 'mediumDate') || ''
        }));
      },
      error: (err) => console.error('Error fetching latest records:', err)
    });
  }

  goSearch() {
    const q = (this.homeQuery || '').trim();
    this.router.navigate(['/search-thesis'], {
      queryParams: { q }   // Results page can read this via ActivatedRoute
    });
  }

  navigateToSubmission() {
    console.log('Submit Work button clicked');
    
    // Check if user is authenticated
    const currentUser = sessionStorage.getItem('user') || localStorage.getItem('user');
    
    if (!currentUser) {
      console.log('User not authenticated - redirecting to login page');
      this.router.navigate(['/login']).then(success => {
        if (success) {
          console.log('Navigation to /login successful');
        } else {
          console.error('Navigation to /login failed');
        }
      }).catch(error => {
        console.error('Navigation error:', error);
      });
    } else {
      console.log('User authenticated - navigating to /submission');
      this.router.navigate(['/submission']).then(success => {
        if (success) {
          console.log('Navigation to /submission successful');
        } else {
          console.error('Navigation to /submission failed');
        }
      }).catch(error => {
        console.error('Navigation error:', error);
      });
    }
  }
}
