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
  
  // Allow guest mode access to guest-accessible paths
  if (isGuestMode && isGuestAccessible) {
    return true;
  }
  
  // For non-guest-accessible paths in guest mode, redirect to login
  if (isGuestMode && !isGuestAccessible) {
    router.navigate(['/login']);
    return false;
  }
  
  // Regular authentication check for logged-in users
  if (!currentUser) {
    router.navigate(['/signup-choose']);
    return false;
  }
  
  const userRole = currentUser.Status?.toLowerCase();
  
  // Define allowed paths for each role
  const allowedPaths = {
    'guest': ['/home', '/about-us', '/search-thesis', '/search-result'],
    'student': ['/home', '/about-us', '/search-thesis', '/search-result', '/submission', '/thank-you'],
    'faculty': ['/faculty-home', '/for-fic', '/for-panel', '/fichistory-page', '/panelist-approval-page'],
    'admin': [] // Admin can access everything
  };
  
  // Admin can access everything
  if (userRole === 'admin') {
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
