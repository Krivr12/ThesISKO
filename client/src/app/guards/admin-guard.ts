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

      // Check if user has admin role (role_id = 4) or superadmin role (role_id = 5)
      if (user.role_id === 4 || user.role_id === 5) {
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
          const userStatus = user.Status?.toLowerCase();
          if (userStatus === 'faculty') {
            router.navigate(['/login-faculty']);
          } else {
            router.navigate(['/login']);
          }
        },
        reject: () => {
          // Redirect to appropriate home page
          const userStatus = user.Status?.toLowerCase();
          if (userStatus === 'faculty') {
            router.navigate(['/faculty-home']);
          } else {
            router.navigate(['/home']);
          }
        }
      });
      return false;
    })
  );
};
