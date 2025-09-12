import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  
  const user = sessionStorage.getItem('user');
  if (user) {
    return true;   // ✅ user is logged in → allow access
  } else {
    router.navigate(['/login']); // 🚪 send back to login page
    return false;  // ❌ block access
  }
};
