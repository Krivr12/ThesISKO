import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../components/navbar/navbar';
import { AppConfirmationService } from '../service/confirmation.service';


export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  const currentUser = authService.currentUser;
  
  if (!currentUser) {
    router.navigate(['/signup-choose']);
    return false;
  }
  
  return true;
};

