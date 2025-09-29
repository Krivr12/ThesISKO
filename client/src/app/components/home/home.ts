import { Component, OnInit } from '@angular/core';
import { Navbar } from '../navbar/navbar';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { Button, ButtonModule } from 'primeng/button';
import { CarouselModule } from 'primeng/carousel';
import { Footer } from '../footer/footer';
import { RecordsService } from '../../service/records.service';
import { DatePipe, NgFor, NgIf } from '@angular/common'; 
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
    NgFor,
    NgIf,

  ],
  providers: [DatePipe],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home implements OnInit {
  homeQuery = '';
  updates: UpdateItem[] = [
    {
      title: 'AI-Powered Learning Management System',
      submitted_at: '2024-01-15',
      authors: ['John Doe', 'Jane Smith'],
      access_level: 'Public',
      tags: ['AI', 'Machine Learning', 'Education']
    },
    {
      title: 'Blockchain-Based Voting System', 
      submitted_at: '2024-01-10',
      authors: ['Alice Johnson'],
      access_level: 'Restricted',
      tags: ['Blockchain', 'Security', 'Voting']
    },
    {
      title: 'IoT Smart Home Automation',
      submitted_at: '2024-01-05',
      authors: ['Bob Wilson', 'Carol Brown'],
      access_level: 'Public',
      tags: ['IoT', 'Smart Home', 'Automation']
    },
    {
      title: 'Mobile Health Monitoring App',
      submitted_at: '2024-01-01',
      authors: ['David Lee', 'Emma Davis'],
      access_level: 'Public',
      tags: ['Mobile App', 'Healthcare', 'Monitoring']
    },
    {
      title: 'E-commerce Recommendation Engine',
      submitted_at: '2023-12-28',
      authors: ['Frank Miller'],
      access_level: 'Restricted',
      tags: ['E-commerce', 'Recommendation', 'Data Mining']
    },
    {
      title: 'Augmented Reality Educational Tool',
      submitted_at: '2023-12-25',
      authors: ['Grace Taylor', 'Henry Clark'],
      access_level: 'Public',
      tags: ['AR', 'Education', 'Interactive Learning']
    }
  ];

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
    console.log('Home component initializing, fetching latest records from MongoDB...');
    
    // Try to fetch real data from MongoDB
    this.recordsService.getLatestRecords().subscribe({
      next: (data) => {
        console.log('✅ Latest records received from MongoDB:', data);
        if (data && data.length > 0) {
          this.updates = data.map((item: any) => ({
            title: item.title || 'Untitled',
            submitted_at: this.datePipe.transform(item.submitted_at, 'mediumDate') || item.submitted_at || 'Unknown Date',
            authors: Array.isArray(item.authors) ? item.authors : (item.authors ? [item.authors] : ['Unknown Author']),
            access_level: item.access_level || 'Unknown',
            tags: Array.isArray(item.tags) ? item.tags : (item.tags ? [item.tags] : ['No Tags'])
          }));
          console.log('✅ Processed MongoDB updates for carousel:', this.updates);
        } else {
          console.log('⚠️ No data received from MongoDB, keeping sample data');
        }
      },
      error: (err) => {
        console.error('❌ Error fetching latest records from MongoDB:', err);
        console.log('🔄 Using sample data as fallback');
        // Keep the existing sample data as fallback
      }
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
