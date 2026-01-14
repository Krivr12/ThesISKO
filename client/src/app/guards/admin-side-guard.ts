import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { Auth } from '../service/auth';
import { switchMap, map, take } from 'rxjs/operators';
import { from } from 'rxjs';
import { ConfirmationService } from 'primeng/api';

/**
 * Guard for adminSide routes (accessible by both chairperson and dean)
 * 
 * Authorization Requirements:
 * - User must be logged in (valid authentication cookie)
 * - User must have role_id = 4 (Chairperson) OR role_id = 5 (Dean)
 * 
 * Security Flow:
 * 1. First verifies authentication cookie with server via /auth/me
 * 2. If cookie is valid, checks user role from server response
 * 3. If cookie is invalid, clears local state and redirects to login
 * 4. This ensures client-side sessionStorage matches server-side cookie state
 */
export const adminSideGuard: CanActivateFn = (route, state) => {
  const authService = inject(Auth);
  const router = inject(Router);
  const confirmationService = inject(ConfirmationService);

  // Step 1: Verify cookie with server first (ensures cookie is valid)
  // Convert promise to observable using from()
  return from(authService.verifyCookie()).pipe(
    // Step 2: After cookie verification, get current user from observable
    switchMap((cookieValid) => {
      if (!cookieValid) {
        // Cookie verification failed - user is not authenticated
        console.warn('🔒 adminSideGuard: Cookie verification failed - redirecting to login');
        router.navigate(['/login-admin']);
        return from([false]); // Return false to block access
      }

      // Cookie is valid - now check user from observable
      return authService.currentUser$.pipe(
        take(1),
        map(user => {
          if (!user) {
            // User not logged in (shouldn't happen if cookie is valid, but safety check)
            console.warn('🔒 adminSideGuard: No user found after cookie verification');
            router.navigate(['/login-admin']);
            return false;
          }

          // Check if user has admin role (chairperson or dean)
          // role_id 4 = chairperson, role_id 5 = dean
          if (user.role_id === 4 || user.role_id === 5) {
            return true;
          }

          // User doesn't have admin privileges - show logout confirmation
          console.warn(`🔒 adminSideGuard: User with role_id ${user.role_id} attempted to access admin route`);
          confirmationService.confirm({
            message: 'You are not authorized to access admin pages. Would you like to logout and return to the appropriate login page?',
            header: 'Unauthorized Access',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Yes, Logout',
            rejectLabel: 'Cancel',
            accept: () => {
              // Logout and redirect to appropriate login
              authService.logout();
              sessionStorage.removeItem('guestMode');
              router.navigate(['/login-admin']);
            },
            reject: () => {
              // Redirect to home page
              router.navigate(['/home']);
            }
          });
          return false;
        })
      );
    }),
    take(1) // Ensure we only take the first emission
  );
};

