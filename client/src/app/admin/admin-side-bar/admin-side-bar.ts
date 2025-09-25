import { Component } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../components/navbar/navbar';

@Component({
  selector: 'app-admin-side-bar',
  imports: [
    RouterModule,
    RouterLink,
    RouterLinkActive,
  ],
  templateUrl: './admin-side-bar.html',
  styleUrl: './admin-side-bar.css'
})
export class AdminSideBar {

  constructor(private router: Router, private authService: AuthService) {}

  confirmLogout(event: Event): void {
    event.preventDefault(); // Prevent default navigation
    
    const confirmed = window.confirm('Are you sure you want to logout?');
    
    if (confirmed) {
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
}
