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
    this.currentUser = this.authService.currentUser;
    
    if (!this.currentUser || this.currentUser.Status?.toLowerCase() !== 'student') {
      this.messageService.add({
        severity: 'error',
        summary: 'Access Denied',
        detail: 'This page is only accessible to students.'
      });
      this.router.navigate(['/home']);
      return;
    }

    this.initializeForm();
    this.loadUserData();
  }

  private initializeForm() {
    this.profileForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: [{ value: '', disabled: true }], // Email should not be editable
      studentId: ['', [Validators.required]],
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
        this.http.get(`http://localhost:5050/api/users/${this.currentUser.id}`).subscribe({
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
        lastname: formData.lastName,
        student_id: formData.studentId
      };

      // Add password data if user wants to change password
      if (formData.newPassword && formData.currentPassword) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }

      this.http.put(`http://localhost:5050/api/users/${this.currentUser?.id}`, updateData).subscribe({
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
            this.router.navigate(['/login']);
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
