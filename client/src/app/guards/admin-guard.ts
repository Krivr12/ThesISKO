import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { Auth } from '../service/auth';
import { map, take } from 'rxjs/operators';
import { ConfirmationService } from 'primeng/api';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(Auth);
  const router = inject(Router);
  const confirmationService = inject(ConfirmationService);

  return authService.currentUser$.pipe(
    take(1),
    map(user => {
      if (!user) {
        // User not logged in, redirect to login
        router.navigate(['/login-admin']);
        return false;
      }

      // Check if user has admin role (role_id = 4, 7)
      // role_id 4 = admin, 7 = admin_faculty
      if (user.role_id === 4 || user.role_id === 7) {
        return true;
      }

      // User doesn't have admin privileges - show logout confirmation
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
          const userRole = user.role_id;
          if (userRole === 3 || userRole === 7 || userRole === 8) {
            router.navigate(['/login-faculty']);
          } else if (userRole === 5) {
            router.navigate(['/login-admin']);
          } else {
            router.navigate(['/login']);
          }
        },
        reject: () => {
          // Redirect to appropriate home page
          const userRole = user.role_id;
          if (userRole === 3 || userRole === 7) {
            router.navigate(['/faculty-home']);
          } else if (userRole === 5 || userRole === 8) {
            router.navigate(['/superadmin-dashboard']);
          } else {
            router.navigate(['/home']);
          }
        }
      });
      return false;
    })
  );
};
