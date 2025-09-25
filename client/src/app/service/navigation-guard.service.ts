import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Location } from '@angular/common';
import { AuthService } from '../components/navbar/navbar';

@Injectable({
  providedIn: 'root'
})
export class NavigationGuardService {
  private previousUrl: string = '';
  private currentUrl: string = '';

  constructor(
    private router: Router,
    private location: Location,
    private authService: AuthService
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
      'admin': ['/admin-dashboard', '/admin-documents', '/admin-block', '/admin-faculties', '/admin-request', '/admin-template', '/faculty-home', '/for-fic', '/for-panel', '/fichistory-page', '/panelist-approval-page']
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
        
        // Define restricted routes that should trigger logout popup for admin users
        const restrictedForAdmin = [
          '/login', '/login-faculty', '/login-admin', 
          '/signup', '/signup-choose',
          '/home', '/about-us', '/search-thesis', '/search-result', '/submission',
          '/superAdmin/'
        ];
        
        const isRestrictedRoute = restrictedForAdmin.some(path => currentPath.startsWith(path));
        
        if (!isRestrictedRoute) {
          return; // Allow access to routes not explicitly restricted
        }
        
        // Show logout confirmation for unauthorized access
        event?.preventDefault();
        
        const confirmed = confirm(
          `You are trying to access a restricted area outside your admin permissions.\n\nThis will log you out. Do you want to continue?`
        );
        
        if (confirmed) {
          this.authService.logout();
          this.router.navigate(['/signup-choose']);
        } else {
          // Navigate back to admin dashboard
          this.router.navigate(['/admin-dashboard']);
        }
        return;
      }
      
      // Other admin users can access everything
      return;
    }

    // Check if current path is allowed for user role
    const userAllowedPaths = allowedPaths[userRole as keyof typeof allowedPaths] || [];
    const isAllowed = userAllowedPaths.some(path => currentPath.startsWith(path));

    if (!isAllowed && (userRole === 'student' || userRole === 'guest')) {
      // Prevent the navigation first
      event?.preventDefault();
      
      const confirmed = confirm(
        `You are trying to access a restricted area. This will log you out.\n\nDo you want to continue and logout?`
      );
      
      if (confirmed) {
        this.authService.logout();
        this.router.navigate(['/signup-choose']);
      } else {
        // Navigate back to allowed area
        const defaultPath = userAllowedPaths[0] || '/home';
        this.router.navigate([defaultPath]);
      }
    }
  }
}
