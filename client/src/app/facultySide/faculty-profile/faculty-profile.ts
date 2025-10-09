import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

/* PrimeNG Components */
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { PasswordModule } from 'primeng/password';
import { MessageService } from 'primeng/api';

/* Local imports */
import { Sidenavbar } from '../sidenavbar/sidenavbar';
import { Auth } from '../../service/auth';
import { User } from '../../interface/auth';

@Component({
  selector: 'app-faculty-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    ToastModule,
    Sidenavbar
  ],
  providers: [MessageService],
  templateUrl: './faculty-profile.html',
  styleUrls: ['./faculty-profile.css']
})
export class FacultyProfile implements OnInit {
  profileForm!: FormGroup;
  currentUser: User | null = null;
  isLoading = false;

  // Custom validator for password confirmation
  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  private fb = inject(FormBuilder);
  private authService = inject(Auth);
  private router = inject(Router);
  private http = inject(HttpClient);
  private messageService = inject(MessageService);

  ngOnInit() {
    this.currentUser = this.authService.currentUser;
    
    if (!this.currentUser || this.currentUser.role_id !== 3) {
      this.messageService.add({
        severity: 'error',
        summary: 'Access Denied',
        detail: 'This page is only accessible to faculty users.'
      });
      this.router.navigate(['/faculty-home']);
      return;
    }

    this.initializeForm();
  }

  private initializeForm() {
    this.profileForm = this.fb.group({
      // Password Change
      currentPassword: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  // Getter methods for easy access to form controls
  get currentPassword() { return this.profileForm.get('currentPassword'); }
  get password() { return this.profileForm.get('password'); }
  get confirmPassword() { return this.profileForm.get('confirmPassword'); }

  onSave() {
    if (this.profileForm.valid) {
      this.isLoading = true;
      
      const formData = this.profileForm.value;
      
      // Prepare the password change data
      console.log('🔍 Current user data:', this.currentUser);
      const passwordData = {
        currentPassword: formData.currentPassword,
        newPassword: formData.password,
        userId: this.currentUser?.id || this.currentUser?.user_id || this.currentUser?.StudentID
      };
      console.log('🔍 Password change data being sent:', passwordData);

      // Call the actual API endpoint
      this.http.put('http://localhost:5050/api/faculty/change-password', passwordData)
        .subscribe({
          next: (response: any) => {
            this.isLoading = false;
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: response.message || 'Password changed successfully!'
            });
            
            // Clear the form after successful password change
            this.profileForm.reset();
          },
          error: (error: any) => {
            this.isLoading = false;
            console.error('Password change error:', error);
            
            let errorMessage = 'An error occurred while changing password.';
            if (error.error?.message) {
              errorMessage = error.error.message;
            } else if (error.status === 400) {
              errorMessage = 'Invalid current password or new password requirements not met.';
            } else if (error.status === 404) {
              errorMessage = 'Faculty user not found.';
            } else if (error.status === 500) {
              errorMessage = 'Server error. Please try again later.';
            }
            
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: errorMessage
            });
          }
        });
      
    } else {
      this.markFormGroupTouched();
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please fill in all required fields correctly.'
      });
    }
  }


  private markFormGroupTouched() {
    Object.keys(this.profileForm.controls).forEach(key => {
      const control = this.profileForm.get(key);
      control?.markAsTouched();
    });
  }
}
