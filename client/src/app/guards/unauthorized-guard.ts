import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { Auth } from '../service/auth';
import { map, take } from 'rxjs/operators';
import { ConfirmationService } from 'primeng/api';

export const unauthorizedGuard: CanActivateFn = (route, state) => {
  const authService = inject(Auth);
  const router = inject(Router);
  const confirmationService = inject(ConfirmationService);

  return authService.currentUser$.pipe(
    take(1),
    map(user => {
      if (!user) {
        // User not logged in, redirect to appropriate login
        router.navigate(['/login']);
        return false;
      }

      // Get the current user's role
      const userRole = user.role_id;
      const userStatus = user.Status?.toLowerCase();

      // Check if user is trying to access a page they're not allowed to
      const currentPath = state.url;
      
      // Define allowed paths for each role
      const allowedPaths: Record<string, string[]> = {
        student: ['/home', '/search-thesis', '/search-result', '/submission', '/thank-you', '/about-us', '/student-profile'],
        guest: ['/home', '/search-thesis', '/search-result', '/about-us', '/guest-profile'],
        faculty: ['/home', '/faculty-home', '/for-fic', '/for-ficlanding', '/for-panel', '/for-panellanding', '/panelist-approval-page', '/fichistory-page', '/faculty-change-password'],
        admin: ['/admin-dashboard', '/admin-documents', '/admin-block', '/admin-request', '/admin-template'],
        superadmin: ['/admin-dashboard', '/admin-documents', '/admin-faculties', '/admin-departments', '/admin-request', '/admin-template']
      };

      // Determine user's role category based on role_id
      let userRoleCategory: string = '';
      if (userRole === 1) {
        userRoleCategory = 'guest';
      } else if (userRole === 2) {
        userRoleCategory = 'student';
      } else if (userRole === 3) {
        userRoleCategory = 'faculty';
      } else if (userRole === 4) {
        userRoleCategory = 'admin';
      } else if (userRole === 5) {
        userRoleCategory = 'superadmin';
      }

      // Check if current path is allowed for this user
      const isPathAllowed = allowedPaths[userRoleCategory]?.some((path: string) => currentPath.startsWith(path));

      if (!isPathAllowed) {
        // Show logout confirmation dialog
        confirmationService.confirm({
          message: 'You are not authorized to access this page. Would you like to logout and return to the appropriate login page?',
          header: 'Unauthorized Access',
          icon: 'pi pi-exclamation-triangle',
          acceptLabel: 'Yes, Logout',
          rejectLabel: 'Cancel',
          accept: () => {
            // Logout and redirect to appropriate login
            authService.logout();
            sessionStorage.removeItem('guestMode');
            if (userRoleCategory === 'faculty') {
              router.navigate(['/login-faculty']);
            } else if (userRoleCategory === 'admin' || userRoleCategory === 'superadmin') {
              router.navigate(['/login-admin']);
            } else {
              router.navigate(['/login']);
            }
          },
          reject: () => {
            // Redirect to appropriate home page
            if (userRoleCategory === 'faculty') {
              router.navigate(['/faculty-home']);
            } else if (userRoleCategory === 'admin' || userRoleCategory === 'superadmin') {
              router.navigate(['/admin-dashboard']);
            } else {
              router.navigate(['/home']);
            }
          }
        });
        return false;
      }

      return true;
    })
  );
};
