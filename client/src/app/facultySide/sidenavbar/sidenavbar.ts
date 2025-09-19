import { Component, inject, OnInit } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule, Router } from '@angular/router';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-sidenavbar',
  imports: [ 
    MatSidenavModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    RouterModule,
    RouterLink,
  ],
  templateUrl: './sidenavbar.html',
  styleUrl: './sidenavbar.css'
})
export class Sidenavbar implements OnInit {
  private router = inject(Router);

  ngOnInit(): void {
    // Check if user is still logged in
    this.checkAuthStatus();
  }

  private checkAuthStatus(): void {
    // Check if user is still logged in
    const user = sessionStorage.getItem('user');
    const role = sessionStorage.getItem('role');
    
    if (!user || !role || role.toLowerCase() !== 'faculty') {
      // User is not logged in or not a faculty member
      alert('You are not logged in. Please login first.');
      window.location.href = '/signup-choose';
      return;
    }
  }

  logout() {
    // Clear session storage
    sessionStorage.removeItem('email');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('role');
    
    // Navigate to signup-choose
    this.router.navigate(['/signup-choose']);
  }
}
