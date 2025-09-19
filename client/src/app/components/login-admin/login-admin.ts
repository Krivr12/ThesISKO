import { Component, inject} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../service/auth';
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
  private router = inject(Router);
  private messageService = inject(MessageService);
  onLogin() {
    const {email, password} = this.login;
    this.authService.loginUser(email, password).subscribe({
      next: (response) => {
        if (response.user) {
          const user = response.user;
          // Store complete user data
          sessionStorage.setItem('email', email);
          sessionStorage.setItem('user', JSON.stringify(user));
          sessionStorage.setItem('role', user.Status || 'admin');
          
          // Navigate to admin dashboard (you can change this route)
          this.router.navigate(['/admin-dashboard']);
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Invalid credentials.', 
          });
        }
      },
      error: (error) => {
        console.error('Login error:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error?.error || 'Something went wrong', 
        });
      }
    })
  }
}
