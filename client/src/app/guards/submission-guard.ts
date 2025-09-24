import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../components/navbar/navbar';

export const submissionGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  const currentUser = authService.currentUser;
  
  // Check if user is authenticated
  if (!currentUser) {
    router.navigate(['/login']);
    return false;
  }
  
  // Check if user is a guest
  if (currentUser.Status?.toLowerCase() === 'guest') {
    // Show a more specific message for guests
    alert('Submission feature is not available for guest users. Please register as a student to submit your thesis.');
    router.navigate(['/home']);
    return false;
  }
  
  // Allow students, faculty, and admin to access submission
  const allowedRoles = ['student', 'faculty', 'admin'];
  const userRole = currentUser.Status?.toLowerCase();
  
  if (!allowedRoles.includes(userRole || '')) {
    router.navigate(['/home']);
    return false;
  }
  
  return true;
};



