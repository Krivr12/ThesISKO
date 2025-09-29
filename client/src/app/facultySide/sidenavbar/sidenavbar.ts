import { Component } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule, Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../components/navbar/navbar';

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
export class Sidenavbar {

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
