import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/* PrimeNG Components */
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { PasswordModule } from 'primeng/password';
import { MessageService } from 'primeng/api';

/* Local imports */
import { Navbar } from '../navbar/navbar';
import { Footer } from '../footer/footer';
import { AuthService, AuthUser } from '../navbar/navbar';


@Component({
  selector: 'app-student-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    ToastModule,
    Navbar,
    Footer
  ],
  providers: [MessageService],
  templateUrl: './student-profile.html',
  styleUrls: ['./student-profile.css']
})
export class StudentProfile implements OnInit {
  profileForm!: FormGroup;
  currentUser: AuthUser | null = null;
  isLoading = false;

  // Custom validator for password confirmation
  private passwordMatchValidator = (control: AbstractControl): ValidationErrors | null => {
    const newPassword = control.get('newPassword')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    
    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      control.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    // Remove the error if passwords match
    if (newPassword && confirmPassword && newPassword === confirmPassword) {
      const confirmControl = control.get('confirmPassword');
      if (confirmControl?.hasError('passwordMismatch')) {
        delete confirmControl.errors?.['passwordMismatch'];
        if (Object.keys(confirmControl.errors || {}).length === 0) {
          confirmControl.setErrors(null);
        }
      }
    }
    
    return null;
  };

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private http = inject(HttpClient);
  private messageService = inject(MessageService);

  ngOnInit() {
    // Initialize form first to prevent template binding errors
    this.initializeForm();
    
    this.currentUser = this.authService.currentUser;
    
    // Check if user is a student or PUPian (same logic as navbar)
    const userStatus = this.currentUser?.Status?.toLowerCase();
    const userRoleId = this.currentUser?.role_id;
    const isStudent = userStatus === 'student' || userStatus === 'pup-ian' || userRoleId === 2;
    
    if (!this.currentUser || !isStudent) {
      this.messageService.add({
        severity: 'error',
        summary: 'Access Denied',
        detail: 'This page is only accessible to students and PUPians.'
      });
      this.router.navigate(['/home']);
      return;
    }

    this.loadUserData();
  }

  private initializeForm() {
    this.profileForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: [{ value: '', disabled: true }], // Email should not be editable
      studentId: [{ value: '', disabled: true }], // Student ID should not be editable
      currentPassword: [''],
      newPassword: ['', [Validators.minLength(6)]],
      confirmPassword: ['']
    }, { validators: this.passwordMatchValidator });

    // Add conditional validation for password fields
    this.profileForm.get('newPassword')?.valueChanges.subscribe(value => {
      const currentPasswordControl = this.profileForm.get('currentPassword');
      const confirmPasswordControl = this.profileForm.get('confirmPassword');
      
      if (value) {
        // If new password is provided, make current password and confirm password required
        currentPasswordControl?.setValidators([Validators.required]);
        confirmPasswordControl?.setValidators([Validators.required]);
      } else {
        // If new password is empty, remove required validation from password fields
        currentPasswordControl?.clearValidators();
        confirmPasswordControl?.clearValidators();
      }
      
      currentPasswordControl?.updateValueAndValidity();
      confirmPasswordControl?.updateValueAndValidity();
    });
  }

  private loadUserData() {
    if (this.currentUser) {
      // Get additional user data from the server
        this.http.get(`${environment.authApiUrl}/api/users/${this.currentUser.id}`).subscribe({
        next: (userData: any) => {
          this.profileForm.patchValue({
            firstName: userData.Firstname || this.currentUser?.Firstname,
            lastName: userData.Lastname || this.currentUser?.Lastname,
            email: userData.Email || this.currentUser?.email || this.currentUser?.Email,
            studentId: userData.student_id
          });
        },
        error: (error) => {
          console.error('Error loading user data:', error);
          // Fallback to user data from auth service
          this.profileForm.patchValue({
            firstName: this.currentUser?.Firstname,
            lastName: this.currentUser?.Lastname,
            email: this.currentUser?.email || this.currentUser?.Email
          });
        }
      });
    }
  }


  onSave() {
    if (this.profileForm.valid) {
      this.isLoading = true;
      const formData = this.profileForm.getRawValue();

      const updateData: any = {
        firstname: formData.firstName,
        lastname: formData.lastName
        // Note: student_id and email are not included as they cannot be modified
      };

      // Add password data if user wants to change password
      if (formData.newPassword && formData.currentPassword) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }

      this.http.put(`${environment.authApiUrl}/api/users/${this.currentUser?.id}`, updateData).subscribe({
        next: (response: any) => {
          this.isLoading = false;
          
          // Show success message
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Profile updated successfully! You will be logged out.'
          });

          // Always log out user after successful profile update
          setTimeout(() => {
            this.authService.logout();
            this.router.navigate(['/signup-choose']);
          }, 2000);

          // Clear password fields after successful update
          if (formData.newPassword) {
            this.profileForm.patchValue({
              currentPassword: '',
              newPassword: '',
              confirmPassword: ''
            });
          }
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Error updating profile:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.error?.error || 'Failed to update profile. Please try again.'
          });
        }
      });
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please fill in all required fields correctly.'
      });
    }
  }

  onCancel() {
    this.router.navigate(['/home']);
  }

  // Form validation getters
  get firstName() { return this.profileForm.get('firstName'); }
  get lastName() { return this.profileForm.get('lastName'); }
  get studentId() { return this.profileForm.get('studentId'); }
  get currentPassword() { return this.profileForm.get('currentPassword'); }
  get newPassword() { return this.profileForm.get('newPassword'); }
  get confirmPassword() { return this.profileForm.get('confirmPassword'); }
}
