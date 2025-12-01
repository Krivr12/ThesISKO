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
import { environment } from '../../../environments/environment';
import { createLogger } from '../../utils/logger';

const log = createLogger('LoginComponent');

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
        
        log.debug('Login attempt:', { role_id: userRoleId, status: userStatus });
        
        // Only allow student (role_id: 2), group leader (role_id: 6), and guest (role_id: 1) roles to login through this component
        // Block faculty (3), admin (4), superadmin (5), admin_faculty (7), superadmin_faculty (8)
        if (userRoleId === 3 || userRoleId === 4 || userRoleId === 5 || userRoleId === 7 || userRoleId === 8) {
          log.warn('Access denied - User role not allowed for this login page:', userRoleId);
          this.messageService.add({
            severity: 'error',
            summary: 'Access Denied',
            detail: 'Please use the appropriate login page for your role.',
          });
          return;
        }
        
        // Regular user login (student, group leader, and guest)
        const userData = {
          id: user.StudentID || user.user_id || user.id,
          email: user.Email || email,
          Status: user.Status,
          Firstname: user.Firstname,
          Lastname: user.Lastname,
          AvatarUrl: user.AvatarUrl,
          role_id: user.role_id,
          group_id: user.group_id // Include group_id for group leaders
        };
        
        log.debug('User data created:', { id: userData.id, role_id: userData.role_id });
        
        // Store user data in session storage for persistence
        sessionStorage.setItem('currentUser', JSON.stringify(userData));
        sessionStorage.setItem('user', JSON.stringify(user));
        sessionStorage.setItem('role', user.Status || 'student');
        
        // Update both AuthServices with user data
        this.authService.setUser(userData);
        this.navAuthService.setUser(userData);
        
        // Wait for AuthService observable to be updated
        this.authService.currentUser$.pipe(take(1)).subscribe((authUser: any) => {
          log.debug('User authenticated, navigating...');
          
          // Navigate based on user status (only student and guest)
          if (user.Status === 'Pending') {
            this.router.navigate(['/verify-message']);
          } else {
            this.router.navigate(['/home']).catch(error => {
              log.error('Navigation failed:', error);
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
      log.error('Login failed:', { 
        status: error.status, 
        message: error.message,
        details: error.error 
      });
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
  window.location.href = `${environment.authApiUrl}/auth/google`;
}
}
