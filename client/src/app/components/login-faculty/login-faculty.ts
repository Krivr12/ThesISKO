import { Component, inject} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../service/auth';
import { AuthService } from '../navbar/navbar';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-login-faculty',
  standalone: true,
  imports: [ FormsModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    RouterLink,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './login-faculty.html',
  styleUrl: './login-faculty.css'
})
export class LoginFaculty {
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
    this.authService.loginFaculty(email, password).subscribe({
      next: (response: {message: string, user: any}) => {
        if (response.user) {
          const user = response.user;
          
          // Store user data in session storage
          const userData = {
            id: user.StudentID || user.user_id || user.id,
            email: user.Email || email,
            Status: user.Status,
            Firstname: user.Firstname,
            Lastname: user.Lastname,
            AvatarUrl: user.AvatarUrl,
            role_id: user.role_id
          };
          
          sessionStorage.setItem('currentUser', JSON.stringify(userData));
          
          // Set user in both auth services
          this.authService.setUser(userData);
          this.navAuthService.setUser(userData);
          
          // Faculty login should only allow faculty users (role_id = 3)
          if (user.role_id === 3) {
            // Faculty - redirect to faculty home
            this.router.navigate(['/faculty-home']);
          } else {
            // This shouldn't happen since backend only allows faculty, but just in case
            this.messageService.add({
              severity: 'error',
              summary: 'Access Denied',
              detail: 'Only faculty members can access this login.',
            });
          }
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
