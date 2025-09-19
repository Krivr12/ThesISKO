import { Component, inject} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../service/auth';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-login-faculty',
  imports: [ FormsModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
  ],
  templateUrl: './login-faculty.html',
  styleUrl: './login-faculty.css'
})
export class LoginFaculty {
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
      next: (response: {message: string, user: any}) => {
        if (response.user) {
          const user = response.user;
          // Store complete user data
          sessionStorage.setItem('email', email);
          sessionStorage.setItem('user', JSON.stringify(user));
          sessionStorage.setItem('role', user.Status || 'faculty');
          
          // Navigate to faculty home
          this.router.navigate(['/faculty-home']);
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Invalid credentials.', 
          });
        }
      },
      error: (error: any) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error?.error || 'Something went wrong', 
        });
      }
    })
  }
}
