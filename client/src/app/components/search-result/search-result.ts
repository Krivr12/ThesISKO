import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { NgIf, NgFor, DatePipe } from '@angular/common'; // 👈 add these
import { Footer } from "../footer/footer";
import { Navbar } from "../navbar/navbar";

@Component({
  selector: 'app-search-result',
  standalone: true,
  imports: [Footer, Navbar, NgIf, NgFor, DatePipe], // 👈 include them here
  templateUrl: './search-result.html',
  styleUrls: ['./search-result.css']
})
export class SearchResult {
  thesis: any; // Store thesis passed from router

  constructor(private router: Router) {
    const nav = this.router.getCurrentNavigation();
    if (nav?.extras?.state && nav.extras.state['thesis']) {
      this.thesis = nav.extras.state['thesis'];
    } else {
      // fallback if no thesis passed (direct link/refresh)
      this.router.navigate(['/search-thesis']);
    }
  }

  onReturnClick(): void {
    this.router.navigate(['/search-thesis']);
  }
}
