import { Component, inject } from '@angular/core';
import { CardModule } from 'primeng/card';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../service/auth';
import { AuthService } from '../navbar/navbar';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CardModule,
    FormsModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    RouterLink,
    ToastModule
  ],
  providers: [MessageService],
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
        
        // Handle group account login
        if (response.account_type === 'group') {
          const groupData = {
            id: user.group_id,
            email: user.email,
            account_type: 'group',
            group_id: user.group_id,
            leader_name: user.leader_name,
            members: user.members || []
          };
          
          // Store group data in session storage
          sessionStorage.setItem('currentUser', JSON.stringify(groupData));
          
          // Update AuthService with group data
          this.navAuthService.setUser(groupData);
          
          // Navigate to group dashboard or appropriate page
          this.router.navigate(['/home']);
          return;
        }
        
        // Check if user role is allowed to login through this component
        const userStatus = user.Status?.toLowerCase();
        const userRoleId = user.role_id;
        
        // Debug logging
        console.log('Login attempt - User data:', user);
        console.log('User Status:', userStatus);
        console.log('User Role ID:', userRoleId);
        
        // Only allow student (role_id: 2) and guest (role_id: 1) roles to login through this component
        if (userRoleId === 3 || userRoleId === 4 || userRoleId === 5) {
          console.log('Access denied - User role not allowed for this login page');
          this.messageService.add({
            severity: 'error',
            summary: 'Access Denied',
            detail: 'Please use the appropriate login page for your role.',
          });
          return;
        }
        
        console.log('Access granted - User role allowed for this login page');
        
        // Regular user login (student and guest only)
        const userData = {
          id: user.StudentID || user.user_id || user.id,
          email: user.Email || email,
          Status: user.Status,
          Firstname: user.Firstname,
          Lastname: user.Lastname,
          AvatarUrl: user.AvatarUrl,
          role_id: user.role_id
        };
        
        console.log('Created userData object:', userData);
        console.log('userData.role_id specifically:', userData.role_id);
        console.log('userData.role_id type:', typeof userData.role_id);
        
        // Store user data in session
        sessionStorage.setItem('currentUser', JSON.stringify(userData));
        sessionStorage.setItem('user', JSON.stringify(user));
        sessionStorage.setItem('role', user.Status || 'student');
        
        // Update both AuthServices with user data
        console.log('About to set user in AuthService:', userData);
        this.authService.setUser(userData);
        this.navAuthService.setUser(userData);
        console.log('AuthService user after setUser:', this.authService.currentUser);
        console.log('NavAuthService user after setUser:', this.navAuthService.currentUser);
        
        // Wait for AuthService observable to be updated
        this.authService.currentUser$.pipe(take(1)).subscribe((authUser: any) => {
          console.log('AuthService observable user:', authUser);
          
          // Navigate based on user status (only student and guest)
          console.log('About to navigate - User Status:', user.Status);
          
          if (user.Status === 'Pending') {
            console.log('Navigating to verify-message');
            this.router.navigate(['/verify-message']);
          } else {
            console.log('Navigating to home');
            this.router.navigate(['/home']).then(success => {
              console.log('Navigation to home successful:', success);
            }).catch(error => {
              console.error('Navigation to home failed:', error);
            });
          }
        });
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
      console.error('Error status:', error.status);
      console.error('Error message:', error.message);
      console.error('Error details:', error.error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.error?.error || error.error?.message || 'Something went wrong', 
      });
    }
  })
}

loginWithGoogle() {
  // Redirect to Google OAuth endpoint
  window.location.href = 'http://localhost:5050/auth/google';
}
}
