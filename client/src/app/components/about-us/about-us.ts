import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { Navbar } from '../navbar/navbar';
import { Footer } from '../footer/footer';

@Component({
  selector: 'app-about-us',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, Navbar, Footer],
  templateUrl: './about-us.html',
  styleUrls: ['./about-us.css'],
})
export class AboutUs {
  homeQuery = '';

  constructor(private router: Router) {}

  goSearch() {
    const q = (this.homeQuery || '').trim();
    this.router.navigate(['/search-thesis'], {
      queryParams: { q: q || null },
    });
  }

  // If your template calls (submit)="search()" or (keyup.enter)="search()"
  search() {
    this.goSearch();
  }
}