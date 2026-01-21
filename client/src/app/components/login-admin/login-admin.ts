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
    RouterLink,
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
  
  /**
   * Admin login handler with cookie verification
   * 
   * Flow:
   * 1. Attempt login with credentials
   * 2. If successful, verify cookie was set by calling /auth/me
   * 3. If cookie verification fails, show error and retry
   * 4. If cookie is valid, store user data and navigate
   */
  onLogin() {
    const {email, password} = this.login;
    
    // Show loading state
    this.messageService.add({
      severity: 'info',
      summary: 'Logging in...',
      detail: 'Please wait',
      life: 2000
    });
    
    this.authService.loginAdmin(email, password).subscribe({
      next: async (response: any) => {
        if (response.user) {
          // Login successful - now verify cookie was set
          
          try {
            // Verify cookie was set by calling /auth/me
            const cookieValid = await this.authService.verifyCookie();
            
            if (cookieValid) {
              // Cookie is valid - proceed with navigation
              
              // Update both auth services with user data
              this.authService.setUser(response.user);
              this.navAuthService.setUser(response.user);
              
              // Store in sessionStorage
              sessionStorage.setItem('email', email);
              sessionStorage.setItem('currentUser', JSON.stringify(response.user));
              
              // Show success message
              this.messageService.add({
                severity: 'success',
                summary: 'Login Successful',
                detail: 'Redirecting...',
                life: 2000
              });
              
              // Redirect based on role - NEW UNIFIED ADMINSIDE
              if (response.user.role_id === 3 || response.user.role_id === 4 || response.user.role_id === 5) {
                // Faculty (3), Chairperson (4) or Dean (5) → Unified AdminSide Dashboard
                this.router.navigate(['/adminSide/dashboard']);
              } else {
                // Other roles - redirect to home
                this.router.navigate(['/home']);
              }
            } else {
              // Cookie verification failed - cookie may not have been set
              console.error('❌ Cookie verification failed after login');
              this.messageService.add({
                severity: 'error',
                summary: 'Authentication Error',
                detail: 'Cookie was not set properly. Please try logging in again.',
              });
              
              // Clear any partial state
              this.authService.logout();
            }
          } catch (error) {
            // Error during cookie verification
            console.error('❌ Error verifying cookie after login:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Verification Error',
              detail: 'Unable to verify authentication. Please try again.',
            });
            
            // Clear any partial state
            this.authService.logout();
          }
        } else {
          // Login failed - invalid credentials
          this.messageService.add({
            severity: 'error',
            summary: 'Login Failed',
            detail: 'Wrong password or email.', 
          });
        }
      },
      error: (error: any) => {
        // Login request failed
        console.error('❌ Login error:', error);
        
        let errorMessage = 'Something went wrong';
        if (error.status === 401) {
          errorMessage = 'Invalid email or password';
        } else if (error.status === 0) {
          errorMessage = 'Network error - please check your connection';
        } else if (error.error?.error) {
          errorMessage = error.error.error;
        }
        
        this.messageService.add({
          severity: 'error',
          summary: 'Login Error',
          detail: errorMessage, 
        });
      }
    })
  }
}
