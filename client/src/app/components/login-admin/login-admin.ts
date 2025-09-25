import { Component, inject} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../service/auth';
import { MessageService } from 'primeng/api';
import { AuthService } from '../navbar/navbar';

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
    this.authService.loginUser(email, password).subscribe({
      next: (response: {message: string, user: any}) => {
        if (response.user) {
          const user = response.user;
          
          // Check if user has admin/superadmin privileges (role_id 4 or 5)
          if (user.role_id !== 4 && user.role_id !== 5) {
            this.messageService.add({
              severity: 'error',
              summary: 'Access Denied',
              detail: 'You do not have admin privileges to access this area.',
            });
            return;
          }
          
          // Clear guest mode when user logs in
          sessionStorage.removeItem('guestMode');
          
          // Store complete user data
          sessionStorage.setItem('email', email);
          sessionStorage.setItem('user', JSON.stringify(user));
          sessionStorage.setItem('role', user.Status || 'admin');
          
          // Update AuthService with user data
          this.navAuthService.setUser({
            id: user.StudentID || user.user_id || user.id,
            email: user.Email || email,
            Status: user.Status,
            Firstname: user.Firstname,
            Lastname: user.Lastname,
            AvatarUrl: user.AvatarUrl,
            role_id: user.role_id
          });
          
          // Check role_id and redirect accordingly
          if (user.role_id === 5) {
            // SuperAdmin with role_id = 5 goes to superAdmin dashboard
            this.router.navigate(['/superAdmin/dashboard']);
          } else if (user.role_id === 4) {
            // Admin with role_id = 4 goes to admin dashboard
            this.router.navigate(['/admin-dashboard']);
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
