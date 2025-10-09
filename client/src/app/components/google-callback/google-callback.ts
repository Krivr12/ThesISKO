import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../navbar/navbar';
import { Auth } from '../../service/auth';

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
  private mainAuthService = inject(Auth);
  
  constructor(private router: Router) {}

  ngOnInit() {
    console.log('Google Callback component initialized');
    console.log('Current URL:', window.location.href);
    console.log('Current AuthService user:', this.authService.currentUser);
    
    // Check URL parameters for user data
    const urlParams = new URLSearchParams(window.location.search);
    const dataParam = urlParams.get('data');
    const error = urlParams.get('error');

    console.log('URL params - data:', dataParam ? 'present' : 'missing', 'error:', error);
    console.log('Full URL params:', Object.fromEntries(urlParams.entries()));

    if (error === 'auth_failed') {
      console.error('Google authentication failed');
      this.router.navigate(['/login']);
      return;
    }

    if (dataParam) {
      try {
        console.log('Raw dataParam:', dataParam);
        const decodedData = decodeURIComponent(dataParam);
        console.log('Decoded dataParam:', decodedData);
        const response = JSON.parse(decodedData);
        console.log('Parsed response:', response);
        const user = response.user;
        
        console.log('Google Callback - Received user data:', JSON.stringify(user, null, 2));
        
        if (user) {
          // Fetch fresh user data from database to get the stored avatar
          this.fetchUserFromDatabase(user.id);
          return;
        } else {
          console.error('No user data in response:', response);
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
        console.error('Raw dataParam that failed to parse:', dataParam);
      }
    }

    // Fallback: Check if user is authenticated via API
    this.checkAuthStatus();
    
    // Additional fallback: If no data and no error, wait a bit then redirect to home
    setTimeout(() => {
      console.log('Fallback: Redirecting to home after timeout');
      this.router.navigate(['/home']);
    }, 3000);
  }

  private navigateByRole(role: string) {
    console.log('navigateByRole called with role:', role);
    // Google OAuth should ONLY handle guest users
    if (role?.toLowerCase() === 'guest') {
      console.log('Navigating to home page for guest user');
      this.router.navigate(['/home']).then(success => {
        console.log('Navigation to home successful:', success);
      }).catch(error => {
        console.error('Navigation to home failed:', error);
      });
    } else {
      // If somehow a non-guest tries to use Google OAuth, redirect to login
      console.warn('Google OAuth attempted by non-guest user. Redirecting to login.');
      this.router.navigate(['/login']);
    }
  }

  private navigateByRoleId(roleId: number) {
    console.log('navigateByRoleId called with role_id:', roleId);
    // Google OAuth should ONLY handle guest users (role_id = 1)
    if (roleId === 1) {
      console.log('Navigating to home page for guest user (role_id = 1)');
      this.router.navigate(['/home']).then(success => {
        console.log('Navigation to home successful:', success);
      }).catch(error => {
        console.error('Navigation to home failed:', error);
      });
    } else {
      // If somehow a non-guest tries to use Google OAuth, redirect to login
      console.warn('Google OAuth attempted by non-guest user (role_id = ' + roleId + '). Redirecting to login.');
      this.router.navigate(['/login']);
    }
  }

  fetchUserFromDatabase(userId: string) {
    console.log('fetchUserFromDatabase called with userId:', userId);
    // Fetch user data from database using the user ID
    fetch(`http://localhost:5050/api/users/${userId}`, {
      credentials: 'include'
    })
    .then(response => {
      console.log('fetchUserFromDatabase response status:', response.status);
      console.log('fetchUserFromDatabase response headers:', response.headers);
      return response.json();
    })
    .then(userData => {
      console.log('Google Callback - Fetched user from database:', JSON.stringify(userData, null, 2));
      
      if (userData) {
        // Clear any existing guest mode flag since user is now authenticated
        sessionStorage.removeItem('guestMode');
        
        // Update AuthService with user data from database
        const authUser = {
          id: userData.user_id || userData.StudentID || userData.studentid || userData.id, // Prioritize user_id
          email: userData.Email || userData.email,
          Email: userData.Email || userData.email, // Add both email and Email for compatibility
          Status: userData.Status || userData.status || 'guest',
          Firstname: userData.Firstname || userData.firstname,
          Lastname: userData.Lastname || userData.lastname,
          AvatarUrl: userData.AvatarUrl || userData.avatarurl,
          role_id: userData.role_id || 1, // Add role_id to authUser
          displayName: (userData.Firstname || userData.firstname) && (userData.Lastname || userData.lastname) 
            ? `${userData.Firstname || userData.firstname} ${userData.Lastname || userData.lastname}` 
            : (userData.Email || userData.email)
        };
        
        // Store user data in session storage
        sessionStorage.setItem('currentUser', JSON.stringify(authUser));
        sessionStorage.setItem('user', JSON.stringify(userData));
        sessionStorage.setItem('role', userData.Status || userData.status || 'guest');
        sessionStorage.setItem('email', userData.Email || userData.email);
        
        console.log('Google Callback - Raw userData from database:', JSON.stringify(userData, null, 2));
        console.log('Google Callback - Mapped authUser:', JSON.stringify(authUser, null, 2));
        console.log('Google Callback - userData.user_id:', userData.user_id);
        console.log('Google Callback - userData.StudentID:', userData.StudentID);
        console.log('Google Callback - userData.Email:', userData.Email);
        console.log('Google Callback - userData.Firstname:', userData.Firstname);
        console.log('Google Callback - userData.Lastname:', userData.Lastname);
        
        console.log('Google Callback - Setting auth user from database:', JSON.stringify(authUser, null, 2));
        console.log('Google Callback - AuthService current user before setUser:', this.authService.currentUser);
        this.authService.setUser(authUser);
        this.mainAuthService.setUser(authUser);
        console.log('Google Callback - AuthService current user after setUser:', this.authService.currentUser);
        console.log('Google Callback - MainAuthService current user after setUser:', this.mainAuthService.currentUser);
        
        // Add a small delay to ensure the AuthService state is updated
        setTimeout(() => {
          console.log('Google Callback - AuthService current user after timeout:', this.authService.currentUser);
        // Navigate based on user role
        console.log('About to navigate with role:', userData.Status || 'guest', 'role_id:', userData.role_id);
        this.navigateByRoleId(userData.role_id || 1); // Default to guest (role_id = 1)
        }, 100);
      } else {
        console.error('No user data found in database');
        this.router.navigate(['/login']);
      }
    })
    .catch(error => {
      console.error('Error fetching user from database:', error);
      console.error('Error details:', error.message, error.stack);
      this.router.navigate(['/login']);
    });
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
        
        // Update AuthService with user data
        const authUser = {
          id: data.user.StudentID || data.user.user_id || data.user.id,
          email: data.user.Email,
          Status: data.user.Status || 'guest',
          Firstname: data.user.Firstname,
          Lastname: data.user.Lastname,
          AvatarUrl: data.user.AvatarUrl,
          role_id: data.user.role_id || 1
        };
        
        // Store user data in session storage
        sessionStorage.setItem('currentUser', JSON.stringify(authUser));
        sessionStorage.setItem('user', JSON.stringify(data.user));
        sessionStorage.setItem('role', data.user.Status || 'guest');
        sessionStorage.setItem('email', data.user.Email);
        
        this.authService.setUser(authUser);
        this.mainAuthService.setUser(authUser);
        
        console.log('Google OAuth API: User authenticated and navbar should update', data.user);
        
        // Only allow guests to proceed with Google OAuth
        const userRoleId = data.user.role_id || 1;
        if (userRoleId === 1) {
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
