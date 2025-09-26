import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../components/navbar/navbar';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  const currentUser = authService.currentUser;
  
  if (!currentUser) {
    router.navigate(['/signup-choose']);
    return false;
  }
  
  return true;
};

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  const currentUser = authService.currentUser;
  const isGuestMode = sessionStorage.getItem('guestMode') === 'true';
  const currentPath = state.url;
  
  // Define guest-accessible paths (no login required)
  const guestAccessiblePaths = ['/home', '/about-us', '/search-thesis', '/search-result'];
  const isGuestAccessible = guestAccessiblePaths.some(path => currentPath.startsWith(path));
  
  // Allow unauthenticated users to access login/signup pages
  const publicPaths = ['/login', '/login-faculty', '/login-admin', '/signup', '/signup-choose', '/google-callback'];
  const isPublicPath = publicPaths.some(path => currentPath.startsWith(path));
  
  // Allow guest mode access to guest-accessible paths AND public paths (login/signup)
  if (isGuestMode && (isGuestAccessible || isPublicPath)) {
    return true;
  }
  
  // For non-guest-accessible and non-public paths in guest mode, redirect to login
  if (isGuestMode && !isGuestAccessible && !isPublicPath) {
    router.navigate(['/login']);
    return false;
  }
  
  // Regular authentication check for logged-in users
  if (!currentUser) {
    if (isPublicPath) {
      return true; // Allow access to login/signup pages
    }
    // Allow unauthenticated users to access guest-accessible paths
    if (isGuestAccessible) {
      return true;
    }
    router.navigate(['/signup-choose']);
    return false;
  }
  
  const userRole = currentUser.Status?.toLowerCase();
  
  // Define allowed paths for each role
const allowedPaths = {
    'guest': ['/home', '/about-us', '/search-thesis', '/search-result', '/guest-profile'],
    'student': ['/home', '/about-us', '/search-thesis', '/search-result', '/submission', '/thank-you', '/student-profile'],
    'faculty': ['/faculty-home', '/for-fic', '/for-panel', '/fichistory-page', '/panelist-approval-page'],
    'admin': ['/admin-dashboard', '/admin-documents', '/admin-block', '/admin-faculties', '/admin-request', '/admin-template', '/faculty-home', '/for-fic', '/for-panel', '/fichistory-page', '/panelist-approval-page']
  };
  
  // Admin role handling with role_id specific routing
  if (userRole === 'admin' || userRole === 'superadmin') {
    const roleId = currentUser.role_id;
    
    // SuperAdmin (role_id = 5) can access superAdmin routes
    if (roleId === 5) {
      const isSuperAdminRoute = currentPath.startsWith('/superAdmin/');
      if (isSuperAdminRoute) {
        return true;
      }
      // Allow superAdmin to access other areas too if needed
      return true;
    }
    
    // Admin (role_id = 4) can access admin routes
    if (roleId === 4) {
      const isAdminRoute = currentPath.startsWith('/admin-');
      if (isAdminRoute) {
        return true;
      }
      
      // Check if trying to access allowed admin paths from the allowedPaths array
      const adminAllowedPaths = allowedPaths['admin'] || [];
      const isAllowedAdminPath = adminAllowedPaths.some(path => currentPath.startsWith(path));
      
      if (isAllowedAdminPath) {
        return true;
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
        return true; // Allow access to routes not explicitly restricted
      }
      
      // Show logout confirmation for unauthorized access
      const confirmed = confirm(
        `You are trying to access a restricted area outside your admin permissions.\n\nThis will log you out. Do you want to continue?`
      );
      
      if (confirmed) {
        authService.logout();
        router.navigate(['/signup-choose']);
        return false;
      } else {
        // Navigate back to admin dashboard
        router.navigate(['/admin-dashboard']);
        return false;
      }
    }
    
    // Other admin users use the faculty interface
    return true;
  }
  
  // Check if current path is allowed for user role
  const userAllowedPaths = allowedPaths[userRole as keyof typeof allowedPaths] || [];
  const isAllowed = userAllowedPaths.some(path => currentPath.startsWith(path));
  
  if (!isAllowed) {
    // Show confirmation dialog for students and guests
    if (userRole === 'student' || userRole === 'guest') {
      const confirmed = confirm(
        `You are trying to access a restricted area. This will log you out.\n\nDo you want to continue and logout?`
      );
      
      if (confirmed) {
        authService.logout();
        router.navigate(['/signup-choose']);
        return false;
      } else {
        // Stay on current page by navigating back to allowed area
        const defaultPath = userAllowedPaths[0] || '/home';
        router.navigate([defaultPath]);
        return false;
      }
    }
    
    // For faculty trying to access other areas, just redirect
    if (userRole === 'faculty') {
      router.navigate(['/faculty-home']);
      return false;
    }
    
    // Default: redirect to appropriate home
    const redirectPath = userRole === 'faculty' ? '/faculty-home' : '/home';
    router.navigate([redirectPath]);
    return false;
  }
  
  return true;
};
