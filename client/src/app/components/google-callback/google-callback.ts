import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

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
          // Store user data in session storage
          sessionStorage.setItem('user', JSON.stringify(user));
          sessionStorage.setItem('role', user.Status || 'guest');
          sessionStorage.setItem('email', user.Email);
          
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
    switch(role?.toLowerCase()) {
      case 'admin':
        this.router.navigate(['/admin-dashboard']);
        break;
      case 'faculty':
        this.router.navigate(['/faculty-home']);
        break;
      case 'student':
      case 'guest':
      default:
        this.router.navigate(['/home']);
        break;
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
        // Store user data in session storage
        sessionStorage.setItem('user', JSON.stringify(data.user));
        sessionStorage.setItem('role', data.user.Status || 'guest');
        sessionStorage.setItem('email', data.user.Email);
        
        // Redirect to home page
        this.router.navigate(['/home']);
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