import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { Auth } from '../service/auth';
import { map, take, startWith } from 'rxjs/operators';
import { ConfirmationService } from 'primeng/api';
import { createLogger } from '../utils/logger';

const log = createLogger('AuthGuard');

export const authGuard: CanActivateFn = (route, state) => {
  log.debug('Auth Guard running for path:', state.url);
  const authService = inject(Auth);
  const router = inject(Router);
  const confirmationService = inject(ConfirmationService);
  
  // First, check sessionStorage for user data (faster than waiting for observable)
  // This is critical for page refreshes where the observable might not have emitted yet
  let sessionUser: any = null;
  try {
    const userData = sessionStorage.getItem('currentUser');
    if (userData) {
      sessionUser = JSON.parse(userData);
      // If we have sessionStorage data but observable hasn't emitted, set it immediately
      if (!authService.currentUser) {
        authService.setUser(sessionUser);
      }
    }
  } catch (e) {
    // Invalid sessionStorage data, ignore
  }
  
  // Use startWith to ensure we have a value immediately (from sessionStorage)
  return authService.currentUser$.pipe(
    startWith(sessionUser), // Start with sessionUser if available
    take(1),
    map(user => {
      const currentPath = state.url;
      // Extract path without query parameters for route matching
      const pathWithoutQuery = currentPath.split('?')[0];
      
      // Use sessionUser as fallback if observable hasn't emitted yet
      // Also check sessionStorage again in case it was updated
      let currentUser = user || sessionUser;
      if (!currentUser) {
        try {
          const userData = sessionStorage.getItem('currentUser');
          if (userData) {
            currentUser = JSON.parse(userData);
            // Set it in the service if not already set
            if (!authService.currentUser) {
              authService.setUser(currentUser);
            }
          }
        } catch (e) {
          // Invalid sessionStorage data, ignore
        }
      }
      
      // Special handling for login route (with or without query parameters)
      if (pathWithoutQuery === '/login') {
        if (!currentUser) {
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
              const userRole = currentUser.role_id;
              if (userRole === 1) {
                router.navigate(['/home']); // guest
              } else if (userRole === 2 || userRole === 6) {
                router.navigate(['/home']); // student or group leader
              } else if (userRole === 3) {
                router.navigate(['/faculty-home']); // faculty
              } else if (userRole === 4 || userRole === 5) {
                router.navigate(['/admin-dashboard']); // admin/superadmin
              } else if (userRole === 7) {
                router.navigate(['/faculty-home']); // admin_faculty defaults to faculty home
              } else if (userRole === 8) {
                router.navigate(['/admin-dashboard']); // superadmin_faculty defaults to admin dashboard
              }
            }
          });
          return false;
        }
      }

      if (!currentUser) {
        // Check if in guest mode (for unauthenticated browsing)
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

      // Get the current user's role (use currentUser which includes sessionUser fallback)
      const userRole = currentUser.role_id;
      const userStatus = currentUser.Status?.toLowerCase();

      // Debug logging (only in development)
      log.debug('Auth check:', { 
        role_id: userRole, 
        status: userStatus, 
        path: currentPath,
        hasUser: !!currentUser,
        userFromObservable: !!user,
        userFromSession: !!sessionUser
      });

      // Define allowed paths for each role
      const allowedPaths: Record<string, string[]> = {
        student: ['/home', '/search-thesis', '/search-result', '/submission', '/thank-you', '/about-us', '/student-profile'],
        guest: ['/home', '/search-thesis', '/search-result', '/about-us', '/guest-profile'],
        faculty: ['/home', '/faculty-home', '/for-fic', '/for-ficlanding', '/for-panel', '/for-panellanding', '/panelist-approval-page', '/fichistory-page', '/faculty-change-password'],
        admin: ['/admin-dashboard', '/admin-documents', '/admin-block', '/admin-faculties', '/admin-request', '/admin-template'],
        superadmin: ['/superadmin-dashboard', '/superadmin-documents', '/superadmin-programs', '/superadmin-faculties', '/superadmin-request', '/superadmin-templates', '/admin-dashboard', '/admin-documents', '/admin-faculties', '/admin-programs', '/admin-request', '/admin-template'],
        admin_faculty: ['/home', '/faculty-home', '/for-fic', '/for-ficlanding', '/for-panel', '/for-panellanding', '/panelist-approval-page', '/fichistory-page', '/faculty-change-password', '/admin-dashboard', '/admin-documents', '/admin-block', '/admin-faculties', '/admin-request', '/admin-template'],
        superadmin_faculty: ['/home', '/faculty-home', '/for-fic', '/for-ficlanding', '/for-panel', '/for-panellanding', '/panelist-approval-page', '/fichistory-page', '/faculty-change-password', '/superadmin-dashboard', '/superadmin-documents', '/superadmin-programs', '/superadmin-faculties', '/superadmin-request', '/superadmin-templates', '/admin-dashboard', '/admin-documents', '/admin-faculties', '/admin-programs', '/admin-request', '/admin-template']
      };

      // Determine user's role category based on role_id
      let userRoleCategory: string = '';
      if (userRole === 1) {
        userRoleCategory = 'guest';
      } else if (userRole === 2) {
        userRoleCategory = 'student';
      } else if (userRole === 6) {
        // Group Leader - treated like student with extra permissions
        userRoleCategory = 'student';
      } else if (userRole === 3) {
        userRoleCategory = 'faculty';
      } else if (userRole === 4) {
        userRoleCategory = 'admin';
      } else if (userRole === 5) {
        userRoleCategory = 'superadmin';
      } else if (userRole === 7) {
        userRoleCategory = 'admin_faculty';
      } else if (userRole === 8) {
        userRoleCategory = 'superadmin_faculty';
      }

      // Check if current path is allowed for this user
      const isPathAllowed = allowedPaths[userRoleCategory]?.some((path: string) => currentPath.startsWith(path));
      
      log.debug('Path authorization:', { 
        roleCategory: userRoleCategory, 
        path: currentPath, 
        allowed: isPathAllowed 
      });

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
            if (userRoleCategory === 'faculty' || userRoleCategory === 'admin_faculty' || userRoleCategory === 'superadmin_faculty') {
              router.navigate(['/login-faculty']);
            } else if (userRoleCategory === 'admin' || userRoleCategory === 'superadmin') {
              router.navigate(['/login-admin']);
            } else {
              router.navigate(['/login']);
            }
          },
          reject: () => {
            // Redirect to appropriate home page
            if (userRoleCategory === 'faculty' || userRoleCategory === 'admin_faculty') {
              router.navigate(['/faculty-home']);
            } else if (userRoleCategory === 'admin') {
              router.navigate(['/admin-dashboard']);
            } else if (userRoleCategory === 'superadmin' || userRoleCategory === 'superadmin_faculty') {
              router.navigate(['/superadmin-dashboard']);
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
