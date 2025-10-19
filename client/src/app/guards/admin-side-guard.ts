import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { Auth } from '../service/auth';
import { map, take } from 'rxjs/operators';
import { ConfirmationService } from 'primeng/api';

// Guard for adminSide routes (accessible by both chairperson and dean)
// Chairperson: role_id = 4
// Dean: role_id = 5
export const adminSideGuard: CanActivateFn = (route, state) => {
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

      // Check if user has admin role (chairperson or dean)
      // role_id 4 = chairperson, role_id 5 = dean
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
};

