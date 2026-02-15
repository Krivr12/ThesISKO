import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../navbar/navbar';

@Component({
  selector: 'app-signup-choose',
  standalone: true,
  imports: [
    ButtonModule,
    RouterLink,
  ],
  templateUrl: './signup-choose.html',
  styleUrl: './signup-choose.css'
})
export class SignupChoose {
  private router = inject(Router);
  private authService = inject(AuthService);

  /**
   * Navigate to login page for PUPian users
   * PUPians have their own accounts, so Google login should be hidden
   */
  onPupianLogin(): void {
    this.router.navigate(['/login'], { queryParams: { type: 'pupian' } });
  }

  onGuestAccess() {
    // Set guest mode flag for temporary access
    sessionStorage.setItem('guestMode', 'true');
    
    // Navigate to home page - navbar will show login button
    this.router.navigate(['/home']);
  }
}
