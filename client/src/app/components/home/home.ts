import { Component, OnInit } from '@angular/core';
import { Navbar } from '../navbar/navbar';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { ButtonModule } from 'primeng/button';
import { CarouselModule } from 'primeng/carousel';
import { Footer } from '../footer/footer';
import { RecordsService } from '../../service/records.service';
import { DatePipe } from '@angular/common';  // ✅ import here

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
    DatePipe   // ✅ add it to imports if using standalone
  ],
  providers: [DatePipe],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home implements OnInit {

  updates: UpdateItem[] = [];

  responsiveOptions: any[] = [
    { breakpoint: '1199px', numVisible: 3, numScroll: 1 },
    { breakpoint: '991px', numVisible: 2, numScroll: 1 },
    { breakpoint: '767px', numVisible: 1, numScroll: 1 }
  ];

  // ✅ inject multiple services in one constructor
  constructor(
    private recordsService: RecordsService,
    private datePipe: DatePipe
  ) {}

  ngOnInit() {
    this.recordsService.getLatestRecords().subscribe({
      next: (data) => {
        // Example: format the date right after fetching
        this.updates = data.map(item => ({
          ...item,
          submitted_at: this.datePipe.transform(item.submitted_at, 'mediumDate') || ''
        }));
      },
      error: (err) => {
        console.error('Error fetching latest records:', err);
      }
    });
  }
}
