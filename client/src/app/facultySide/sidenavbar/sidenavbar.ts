import { Component, inject, OnInit } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../components/navbar/navbar';

@Component({
  selector: 'app-sidenavbar',
  imports: [ 
    RouterModule,
    RouterLink,
    RouterLinkActive,
  ],
  templateUrl: './sidenavbar.html',
  styleUrl: './sidenavbar.css'
})
export class Sidenavbar implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);

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

  confirmLogout(event: Event): void {
    event.preventDefault(); // Prevent default navigation
    
    const confirmed = window.confirm('Are you sure you want to logout?');
    
    if (confirmed) {
      // Set a flag to prevent other logout confirmations
      sessionStorage.setItem('sidebarLogoutInitiated', 'true');
      this.logout();
    }
  }

  logout() {
    // Use AuthService logout method to properly clear user data
    this.authService.logout();
    
    // Clear all storage to ensure complete logout
    sessionStorage.clear();
    localStorage.clear();
    
    // Navigate to login/home page and replace history to prevent back navigation
    this.router.navigate(['/signup-choose'], { replaceUrl: true }).then(() => {
      // Additional history manipulation to prevent back button access
      window.history.replaceState(null, '', '/signup-choose');
      window.history.pushState(null, '', '/signup-choose');
    });
  }
}
