import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Location } from '@angular/common';
import { AuthService } from '../components/navbar/navbar';
import { AppConfirmationService } from './confirmation.service';

@Injectable({
  providedIn: 'root'
})
export class NavigationGuardService {
  private previousUrl: string = '';
  private currentUrl: string = '';

  constructor(
    private router: Router,
    private location: Location,
    private authService: AuthService,
    private confirmationService: AppConfirmationService
  ) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.previousUrl = this.currentUrl;
        this.currentUrl = event.url;
      }
    });

    // Handle browser back/forward buttons
    window.addEventListener('popstate', (event) => {
      this.handleBrowserNavigation();
    });
  }

  private handleBrowserNavigation() {
    const currentUser = this.authService.currentUser;
    
    if (!currentUser) return;

    const userRole = currentUser.Status?.toLowerCase();
    const currentPath = this.location.path();

    // Define allowed paths for each role
    const allowedPaths = {
      'guest': ['/home', '/about-us', '/search-thesis', '/search-result'],
      'student': ['/home', '/about-us', '/search-thesis', '/search-result', '/submission', '/thank-you'],
      'faculty': ['/faculty-home', '/for-fic', '/for-panel', '/fichistory-page', '/panelist-approval-page'],
      'admin': ['/admin-dashboard', '/admin-documents', '/admin-block', '/admin-faculties', '/admin-request', '/admin-template']
    };

    // Special handling for admin users with role_id check
    if (userRole === 'admin' || userRole === 'superadmin') {
      const roleId = currentUser.role_id;
      
      // SuperAdmin (role_id = 5) can access everything
      if (roleId === 5) {
        return;
      }
      
      // Admin (role_id = 4) has restricted access
      if (roleId === 4) {
        const isAdminRoute = currentPath.startsWith('/admin-');
        const adminAllowedPaths = allowedPaths['admin'] || [];
        const isAllowedAdminPath = adminAllowedPaths.some(path => currentPath.startsWith(path));
        
        if (isAdminRoute || isAllowedAdminPath) {
          return; // Allow access
        }
        
        // Admin (role_id = 4) should only access admin routes
        // If not an admin route or allowed admin path, deny access
        event?.preventDefault();
        
        this.confirmationService.showRestrictedAreaConfirmation(
          'admin',
          () => {
            // User confirmed - logout and redirect
            this.authService.logout();
            this.router.navigate(['/signup-choose']);
          },
          () => {
            // User cancelled - navigate back to admin dashboard
            this.router.navigate(['/admin-dashboard']);
          }
        );
        return;
      }
      
      // Other admin users can access everything
      return;
    }

    // Check if current path is allowed for user role
    const userAllowedPaths = allowedPaths[userRole as keyof typeof allowedPaths] || [];
    const isAllowed = userAllowedPaths.some(path => currentPath.startsWith(path));

    if (!isAllowed && (userRole === 'student' || userRole === 'guest' || userRole === 'faculty')) {
      // Prevent the navigation first
      event?.preventDefault();
      
      this.confirmationService.showRestrictedAreaConfirmation(
        userRole,
        () => {
          // User confirmed - logout and redirect
          this.authService.logout();
          this.router.navigate(['/signup-choose']);
        },
        () => {
          // User cancelled - navigate back to allowed area
          const defaultPath = userRole === 'faculty' ? '/faculty-home' : (userAllowedPaths[0] || '/home');
          this.router.navigate([defaultPath]);
        }
      );
    }
  }
}
