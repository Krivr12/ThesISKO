import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { Auth } from '../service/auth';
import { map, take } from 'rxjs/operators';
import { ConfirmationService } from 'primeng/api';

export const authGuard: CanActivateFn = (route, state) => {
  console.log('🚨 Auth Guard is running for path:', state.url);
  const authService = inject(Auth);
  const router = inject(Router);
  const confirmationService = inject(ConfirmationService);

  console.log('🔍 Auth Guard - About to subscribe to currentUser$');
  console.log('🔍 Auth Guard - Current user before subscription:', authService.currentUser);
  
  return authService.currentUser$.pipe(
    take(1),
    map(user => {
      const currentPath = state.url;
      console.log('🔍 Auth Guard - User from observable:', user);
      console.log('🔍 Auth Guard - Current path:', currentPath);
      
      // Special handling for login route
      if (currentPath === '/login') {
        if (!user) {
          // User not logged in, allow access to login page
          return true;
        } else {
          // User is logged in, show logout confirmation
          confirmationService.confirm({
            message: 'You are already logged in. Would you like to logout and return to the login page?',
            header: 'Already Logged In',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Yes, Logout',
            rejectLabel: 'Cancel',
            accept: () => {
              // Logout and stay on login page
              authService.logout();
              sessionStorage.removeItem('guestMode');
            },
            reject: () => {
              // Redirect to appropriate home page
              const userRole = user.role_id;
              if (userRole === 1) {
                router.navigate(['/home']); // guest
              } else if (userRole === 2) {
                router.navigate(['/home']); // student
              } else if (userRole === 3) {
                router.navigate(['/faculty-home']); // faculty
              } else if (userRole === 4 || userRole === 5) {
                router.navigate(['/admin-dashboard']); // admin/superadmin
              }
            }
          });
          return false;
        }
      }

      if (!user) {
        // Check if in guest mode
        const isGuestMode = sessionStorage.getItem('guestMode') === 'true';
        if (isGuestMode) {
          // Allow access to guest routes in guest mode
          const guestAllowedPaths = ['/home', '/search-thesis', '/search-result', '/about-us'];
          const isGuestPathAllowed = guestAllowedPaths.some(path => currentPath.startsWith(path));
          
          if (isGuestPathAllowed) {
            return true;
          } else {
            // Guest trying to access restricted page, redirect to home
            router.navigate(['/home']);
            return false;
          }
        } else {
          // User not logged in and not in guest mode, redirect to login
          router.navigate(['/login']);
          return false;
        }
      }

      // Get the current user's role
      const userRole = user.role_id;
      const userStatus = user.Status?.toLowerCase();

      // Debug logging
      console.log('🔍 Auth Guard Debug:');
      console.log('  - User object:', user);
      console.log('  - User role_id:', userRole);
      console.log('  - User Status:', userStatus);
      console.log('  - Current path:', currentPath);

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

      console.log('  - Determined role category:', userRoleCategory);

      // Check if current path is allowed for this user
      const isPathAllowed = allowedPaths[userRoleCategory]?.some((path: string) => currentPath.startsWith(path));
      
      console.log('  - Is path allowed:', isPathAllowed);
      console.log('  - Allowed paths for role:', allowedPaths[userRoleCategory]);

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
