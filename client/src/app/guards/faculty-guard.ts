import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { Auth } from '../service/auth';
import { map, take } from 'rxjs/operators';
import { ConfirmationService } from 'primeng/api';

export const facultyGuard: CanActivateFn = (route, state) => {
  const authService = inject(Auth);
  const router = inject(Router);
  const confirmationService = inject(ConfirmationService);

  return authService.currentUser$.pipe(
    take(1),
    map(user => {
      if (!user) {
        // User not logged in, redirect to faculty login
        router.navigate(['/login-faculty']);
        return false;
      }

      // Check if user has faculty role (role_id = 3, 7, 8)
      // role_id 3 = faculty, 7 = admin_faculty, 8 = superadmin_faculty
      if (user.role_id === 3 || user.role_id === 7 || user.role_id === 8) {
        return true;
      }

      // User doesn't have faculty privileges - show logout confirmation
      confirmationService.confirm({
        message: 'You are not authorized to access faculty pages. Would you like to logout and return to the appropriate login page?',
        header: 'Unauthorized Access',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Yes, Logout',
        rejectLabel: 'Cancel',
        accept: () => {
          // Logout and redirect to appropriate login
          authService.logout();
          sessionStorage.removeItem('guestMode');
          if (user.role_id === 5 || user.role_id === 4 || user.role_id === 8) {
            router.navigate(['/login-admin']);
          } else {
            router.navigate(['/login']);
          }
        },
        reject: () => {
          // Redirect to appropriate home page
          if (user.role_id === 5 || user.role_id === 4 || user.role_id === 8) {
            router.navigate(['/admin-dashboard']);
          } else {
            router.navigate(['/home']);
          }
        }
      });
      return false;
    })
  );
};
