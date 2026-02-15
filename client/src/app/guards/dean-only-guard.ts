import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { Auth } from '../service/auth';
import { map, take } from 'rxjs/operators';

// Guard for dean-only routes (programs, document types)
// Dean: role_id = 5
export const deanOnlyGuard: CanActivateFn = (route, state) => {
  const authService = inject(Auth);
  const router = inject(Router);

  return authService.currentUser$.pipe(
    take(1),
    map(user => {
      if (!user) {
        // User not logged in, redirect to login
        router.navigate(['/login-admin']);
        return false;
      }

      // Check if user is dean (role_id = 5)
      if (user.role_id === 5) {
        return true;
      }

      // If chairperson (role_id = 4), redirect to dashboard
      if (user.role_id === 4) {
        alert('This page is only accessible to Deans.');
        router.navigate(['/adminSide/dashboard']);
        return false;
      }

      // Other users, redirect to login
      router.navigate(['/login-admin']);
      return false;
    })
  );
};

