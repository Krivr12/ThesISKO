import { Component, inject} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../service/auth';
import { AuthService } from '../navbar/navbar';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-login-admin',
  imports: [
    FormsModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
  ],
  templateUrl: './login-admin.html',
  styleUrl: './login-admin.css'
})
export class LoginAdmin {
  login = {
    email: '',
    password: '',
  }

  private authService = inject(Auth);
  private navAuthService = inject(AuthService);
  private router = inject(Router);
  private messageService = inject(MessageService);
  onLogin() {
    const {email, password} = this.login;
    this.authService.loginAdmin(email, password).subscribe({
      next: (response: any) => {
        if (response.user) {
          this.authService.setUser(response.user);
          this.navAuthService.setUser(response.user);
          localStorage.setItem('email', email);
          localStorage.setItem('currentUser', JSON.stringify(response.user));
          
          // Redirect based on role - NEW UNIFIED ADMINSIDE
          if (response.user.role_id === 4 || response.user.role_id === 5) {
            // Chairperson (4) or Dean (5) → Unified AdminSide Dashboard
            this.router.navigate(['/adminSide/dashboard']);
          } else {
            // Other roles - redirect to home
            this.router.navigate(['/home']);
          }
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'error',
            detail: 'Wrong password or email.', 
          });
        }
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'error',
          detail: 'Something went wrong', 
        });
      }
    })
  }
}
