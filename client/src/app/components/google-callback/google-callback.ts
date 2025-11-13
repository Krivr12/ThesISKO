import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../navbar/navbar';
import { Auth } from '../../service/auth';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-google-callback',
  standalone: true,
  template: `
    <div class="loading-overlay">
      <div class="loading-card">
        <div class="spinner"></div>
        <p class="loading-text">Signing you in...</p>
      </div>
    </div>
  `,
  styles: [`
    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255, 255, 255, 0.95);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }
    
    .loading-card {
      background: white;
      padding: 40px 60px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      text-align: center;
    }
    
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #f0f0f0;
      border-top: 3px solid #800000;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 20px;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .loading-text {
      color: #333;
      font-size: 16px;
      font-weight: 500;
      margin: 0;
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

    if (error) {
      const errorDetails = urlParams.get('details');
      console.error('Google authentication error:', error);
      if (errorDetails) {
        console.error('Error details:', decodeURIComponent(errorDetails));
      }
      
      // Show user-friendly error message
      if (error === 'server_error') {
        alert(`Google login failed due to a server error. Please try again later.\n\nError: ${errorDetails ? decodeURIComponent(errorDetails) : 'Unknown error'}`);
      } else if (error === 'auth_failed') {
        alert('Google authentication failed. Please try again.');
      } else if (error === 'insert_failed') {
        alert('Failed to create your account. Please try again or contact support.');
      }
      
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
          // Use the user data directly from the redirect (cookie should also be set by backend)
          // Clear any existing guest mode flag since user is now authenticated
          sessionStorage.removeItem('guestMode');
          
          // Map user data to AuthUser format
          const authUser = {
            id: user.id || user.user_id || user.StudentID,
            email: user.email || user.Email,
            Email: user.Email || user.email,
            Status: user.Status || user.status || 'guest',
            Firstname: user.Firstname || user.firstname || user.firstName,
            Lastname: user.Lastname || user.lastname || user.lastName,
            AvatarUrl: user.AvatarUrl || user.avatar_url || user.avatar,
            role_id: user.role_id || 1,
            displayName: (user.Firstname || user.firstname || user.firstName) && (user.Lastname || user.lastname || user.lastName)
              ? `${user.Firstname || user.firstname || user.firstName} ${user.Lastname || user.lastname || user.lastName}`
              : (user.email || user.Email)
          };
          
          // Store user data in session storage for persistence
          sessionStorage.setItem('currentUser', JSON.stringify(authUser));
          sessionStorage.setItem('user', JSON.stringify(user));
          sessionStorage.setItem('role', user.Status || user.status || 'guest');
          sessionStorage.setItem('email', user.email || user.Email);
          
          console.log('Google Callback - Setting auth user from redirect data:', JSON.stringify(authUser, null, 2));
          this.authService.setUser(authUser);
          this.mainAuthService.setUser(authUser);
          
          // Add a small delay to ensure the AuthService state is updated
          setTimeout(() => {
            console.log('Google Callback - AuthService current user after timeout:', this.authService.currentUser);
            // Navigate based on user role
            console.log('About to navigate with role:', user.Status || 'guest', 'role_id:', user.role_id);
            this.navigateByRoleId(user.role_id || 1); // Default to guest (role_id = 1)
          }, 100);
          
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
    const roleLower = role?.toLowerCase();
    
    // Navigate based on user role
    if (roleLower === 'guest') {
      console.log('Navigating to home page for guest user');
      this.router.navigate(['/home']).then(success => {
        console.log('Navigation to home successful:', success);
      }).catch(error => {
        console.error('Navigation to home failed:', error);
      });
    } else if (roleLower === 'faculty' || roleLower === 'admin_faculty' || roleLower === 'superadmin_faculty') {
      console.log('Navigating to faculty home for faculty user:', role);
      this.router.navigate(['/faculty-home']).then(success => {
        console.log('Navigation to faculty home successful:', success);
      }).catch(error => {
        console.error('Navigation to faculty home failed:', error);
      });
    } else if (roleLower === 'admin' || roleLower === 'superadmin') {
      console.log('Navigating to admin dashboard for admin user:', role);
      this.router.navigate(['/admin-dashboard']).then(success => {
        console.log('Navigation to admin dashboard successful:', success);
      }).catch(error => {
        console.error('Navigation to admin dashboard failed:', error);
      });
    } else if (roleLower === 'student') {
      console.log('Navigating to home page for student user');
      this.router.navigate(['/home']).then(success => {
        console.log('Navigation to home successful:', success);
      }).catch(error => {
        console.error('Navigation to home failed:', error);
      });
    } else {
      console.warn('Unknown role:', role, '. Redirecting to home.');
      this.router.navigate(['/home']);
    }
  }

  private navigateByRoleId(roleId: number) {
    console.log('navigateByRoleId called with role_id:', roleId);
    
    // Navigate based on role_id
    if (roleId === 1) {
      // Guest
      console.log('Navigating to home page for guest user (role_id = 1)');
      this.router.navigate(['/home']).then(success => {
        console.log('Navigation to home successful:', success);
      }).catch(error => {
        console.error('Navigation to home failed:', error);
      });
    } else if (roleId === 2) {
      // Student
      console.log('Navigating to home page for student user (role_id = 2)');
      this.router.navigate(['/home']).then(success => {
        console.log('Navigation to home successful:', success);
      }).catch(error => {
        console.error('Navigation to home failed:', error);
      });
    } else if (roleId === 3) {
      // Faculty
      console.log('Navigating to faculty home for faculty user (role_id = 3)');
      this.router.navigate(['/faculty-home']).then(success => {
        console.log('Navigation to faculty home successful:', success);
      }).catch(error => {
        console.error('Navigation to faculty home failed:', error);
      });
    } else if (roleId === 4) {
      // Admin
      console.log('Navigating to admin dashboard for admin user (role_id = 4)');
      this.router.navigate(['/admin-dashboard']).then(success => {
        console.log('Navigation to admin dashboard successful:', success);
      }).catch(error => {
        console.error('Navigation to admin dashboard failed:', error);
      });
    } else if (roleId === 5) {
      // Superadmin
      console.log('Navigating to superadmin dashboard for superadmin user (role_id = 5)');
      this.router.navigate(['/superadmin-dashboard']).then(success => {
        console.log('Navigation to superadmin dashboard successful:', success);
      }).catch(error => {
        console.error('Navigation to superadmin dashboard failed:', error);
      });
    } else if (roleId === 7) {
      // Admin + Faculty
      console.log('Navigating to admin dashboard for admin+faculty user (role_id = 7)');
      this.router.navigate(['/admin-dashboard']).then(success => {
        console.log('Navigation to admin dashboard successful:', success);
      }).catch(error => {
        console.error('Navigation to admin dashboard failed:', error);
      });
    } else if (roleId === 8) {
      // Superadmin + Faculty
      console.log('Navigating to superadmin dashboard for superadmin+faculty user (role_id = 8)');
      this.router.navigate(['/superadmin-dashboard']).then(success => {
        console.log('Navigation to superadmin dashboard successful:', success);
      }).catch(error => {
        console.error('Navigation to superadmin dashboard failed:', error);
      });
    } else {
      console.warn('Unknown role_id:', roleId, '. Redirecting to home.');
      this.router.navigate(['/home']);
    }
  }

  fetchUserFromDatabase(userId: string) {
    console.log('fetchUserFromDatabase called with userId:', userId);
    // Use /auth/me endpoint which reads from the cookie set by backend
    fetch(`${environment.authApiUrl}/auth/me`, {
      credentials: 'include'
    })
    .then(response => {
      console.log('fetchUserFromDatabase response status:', response.status);
      console.log('fetchUserFromDatabase response headers:', response.headers);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('Google Callback - Fetched user from /auth/me:', JSON.stringify(data, null, 2));
      
      // Check if authenticated and user exists
      if (data.authenticated && data.user) {
        const userData = data.user;
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
        
        // Store user data in session storage for persistence
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
        console.error('No user data found or not authenticated. Response:', data);
        // Fallback: try checkAuthStatus
        this.checkAuthStatus();
      }
    })
    .catch(error => {
      console.error('Error fetching user from /auth/me:', error);
      console.error('Error details:', error.message, error.stack);
      // Fallback: try checkAuthStatus
      this.checkAuthStatus();
    });
  }

  checkAuthStatus() {
    // Make a request to check if user is logged in
    fetch(`${environment.authApiUrl}/auth/me`, {
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
        
        // Store user data in session storage for persistence
        sessionStorage.setItem('currentUser', JSON.stringify(authUser));
        sessionStorage.setItem('user', JSON.stringify(data.user));
        sessionStorage.setItem('role', data.user.Status || 'guest');
        sessionStorage.setItem('email', data.user.Email);
        
        this.authService.setUser(authUser);
        this.mainAuthService.setUser(authUser);
        
        console.log('Google OAuth API: User authenticated and navbar should update', data.user);
        
        // Navigate based on user role
        const userRoleId = data.user.role_id || 1;
        this.navigateByRoleId(userRoleId);
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
