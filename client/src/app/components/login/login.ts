import { Component, inject } from '@angular/core';
import { CardModule } from 'primeng/card';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../service/auth';
import { MessageService } from 'primeng/api';
import { AuthService } from '../navbar/navbar';

@Component({
  selector: 'app-login',
  imports: [
    CardModule,
    FormsModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    RouterLink
  ],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
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
    next: (response: {message: string, user: any, account_type?: string, redirect_to?: string}) => {
      if (response.user) {
        const user = response.user;
        // Clear guest mode when user logs in
        sessionStorage.removeItem('guestMode');
        
        // Check if this is a group account
        if (response.account_type === 'group') {
          console.log('Group account login detected, redirecting to submission page');
          
          // Store group data in session
          sessionStorage.setItem('user', JSON.stringify(user));
          sessionStorage.setItem('role', 'group');
          sessionStorage.setItem('account_type', 'group');
          
          // Update AuthService with group data
          this.navAuthService.setUser({
            id: user.group_id || user.id,
            email: user.username, // Groups use username instead of email
            Status: 'group',
            Firstname: user.leader_name || 'Group',
            Lastname: user.group_id || '',
            AvatarUrl: undefined,
            group_id: user.group_id,
            account_type: 'group'
          });
          
          // Redirect to submission page for groups
          this.router.navigate(['/submission']);
          return;
        }
        
        // Regular user login flow
        // Update AuthService with user data (cookie is set by server)
        this.navAuthService.setUser({
          id: user.StudentID || user.user_id || user.id,
          email: user.Email || email,
          Status: user.Status,
          Firstname: user.Firstname,
          Lastname: user.Lastname,
          AvatarUrl: user.AvatarUrl,
          role_id: user.role_id
        });
        
        // Navigate based on role
        const userRole = user.Status?.toLowerCase();
        if (userRole === 'faculty') {
          this.router.navigate(['/faculty-home']);
        } else {
          this.router.navigate(['/home']);
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

loginWithGoogle() {
  // Redirect to Google OAuth endpoint
  window.location.href = 'http://localhost:5050/auth/google';
}
}
