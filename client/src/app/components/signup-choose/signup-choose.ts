import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../navbar/navbar';


@Component({
  selector: 'app-signup-choose',
  imports: [
    ButtonModule,
    RouterLink,
  ],
  templateUrl: './signup-choose.html',
  styleUrl: './signup-choose.css'
})
export class SignupChoose {
  private authService = inject(AuthService);
  private router = inject(Router);

  onGuestAccess() {
    // Set guest mode flag without creating user session
    sessionStorage.setItem('guestMode', 'true');
    
    // Navigate to home
    this.router.navigate(['/home']);
  }
}
