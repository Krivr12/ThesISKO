import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../navbar/navbar';

@Component({
  selector: 'app-google-callback',
  standalone: true,
  template: `
    <div class="flex justify-content-center align-items-center min-h-screen">
      <div class="text-center">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <h3 class="mt-3">Processing Google Login...</h3>
        <p>Please wait while we complete your authentication.</p>
      </div>
    </div>
  `,
  styles: [`
    .min-h-screen {
      min-height: 100vh;
    }
    .spinner-border {
      width: 3rem;
      height: 3rem;
    }
  `]
})
export class GoogleCallbackComponent implements OnInit {
  private authService = inject(AuthService);
  
  constructor(private router: Router) {}

  ngOnInit() {
    // Check URL parameters for user data
    const urlParams = new URLSearchParams(window.location.search);
    const dataParam = urlParams.get('data');
    const error = urlParams.get('error');

    if (error === 'auth_failed') {
      console.error('Google authentication failed');
      this.router.navigate(['/login']);
      return;
    }

    if (dataParam) {
      try {
        const response = JSON.parse(decodeURIComponent(dataParam));
        const user = response.user;
        
        if (user) {
          // Clear any existing guest mode flag since user is now authenticated
          sessionStorage.removeItem('guestMode');
          
          // Store user data in session storage
          sessionStorage.setItem('user', JSON.stringify(user));
          sessionStorage.setItem('role', user.Status || 'guest');
          sessionStorage.setItem('email', user.Email);
          
          // Update AuthService with user data
          this.authService.setUser({
            id: user.StudentID || user.user_id || user.id,
            email: user.Email,
            Status: user.Status || 'guest',
            Firstname: user.Firstname,
            Lastname: user.Lastname,
            AvatarUrl: user.AvatarUrl
          });
          
          console.log('Google OAuth: User authenticated and navbar should update', user);
          
          
          // Navigate based on user role
          this.navigateByRole(user.Status || 'guest');
          return;
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }

    // Fallback: Check if user is authenticated via API
    this.checkAuthStatus();
  }

  private navigateByRole(role: string) {
    // Google OAuth should ONLY handle guest users
    if (role?.toLowerCase() === 'guest') {
      this.router.navigate(['/home']); // Guest goes to home
    } else {
      // If somehow a non-guest tries to use Google OAuth, redirect to login
      console.warn('Google OAuth attempted by non-guest user. Redirecting to login.');
      this.router.navigate(['/login']);
    }
  }

  checkAuthStatus() {
    // Make a request to check if user is logged in
    fetch('http://localhost:5050/auth/me', {
      credentials: 'include' // Include cookies for session
    })
    .then(response => response.json())
    .then(data => {
      if (data.authenticated && data.user) {
        // Clear any existing guest mode flag since user is now authenticated
        sessionStorage.removeItem('guestMode');
        
        // Store user data in session storage
        sessionStorage.setItem('user', JSON.stringify(data.user));
        sessionStorage.setItem('role', data.user.Status || 'guest');
        sessionStorage.setItem('email', data.user.Email);
        
        // Update AuthService with user data
        this.authService.setUser({
          id: data.user.StudentID || data.user.user_id || data.user.id,
          email: data.user.Email,
          Status: data.user.Status || 'guest',
          Firstname: data.user.Firstname,
          Lastname: data.user.Lastname,
          AvatarUrl: data.user.AvatarUrl
        });
        
        console.log('Google OAuth API: User authenticated and navbar should update', data.user);
        
        // Only allow guests to proceed with Google OAuth
        const userRole = data.user.Status || 'guest';
        if (userRole.toLowerCase() === 'guest') {
          this.router.navigate(['/home']);
        } else {
          console.warn('Non-guest user attempted Google OAuth. Redirecting to login.');
          this.router.navigate(['/login']);
        }
      } else {
        // Authentication failed, redirect to login
        this.router.navigate(['/login']);
      }
    })
    .catch(error => {
      console.error('Auth check failed:', error);
      this.router.navigate(['/login']);
    });
  }
}