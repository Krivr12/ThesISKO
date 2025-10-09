import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

/* PrimeNG Components */
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

/* Local imports */
import { Navbar } from '../navbar/navbar';
import { Footer } from '../footer/footer';
import { AuthService, AuthUser } from '../navbar/navbar';

@Component({
  selector: 'app-guest-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    InputTextModule,
    ButtonModule,
    ToastModule,
    Navbar,
    Footer
  ],
  providers: [MessageService],
  templateUrl: './guest-profile.html',
  styleUrls: ['./guest-profile.css']
})
export class GuestProfile implements OnInit {
  profileForm!: FormGroup;
  currentUser: AuthUser | null = null;
  isLoading = false;

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private http = inject(HttpClient);
  private messageService = inject(MessageService);

  ngOnInit() {
    this.currentUser = this.authService.currentUser;
    
    if (!this.currentUser || this.currentUser.Status?.toLowerCase() !== 'guest') {
      this.messageService.add({
        severity: 'error',
        summary: 'Access Denied',
        detail: 'This page is only accessible to guest users.'
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
      email: [{ value: '', disabled: true }] // Email should not be editable for guests
    });
  }

  private loadUserData() {
    if (this.currentUser) {
      // For guests, we'll use the data from auth service (Google OAuth data)
      this.profileForm.patchValue({
        firstName: this.currentUser.Firstname,
        lastName: this.currentUser.Lastname,
        email: this.currentUser.email || this.currentUser.Email
      });
    }
  }

  onSave() {
    if (this.profileForm.valid) {
      this.isLoading = true;
      const formData = this.profileForm.getRawValue();

      const updateData = {
        firstname: formData.firstName,
        lastname: formData.lastName
      };

      this.http.put(`http://localhost:5050/api/users/${this.currentUser?.id}`, updateData).subscribe({
        next: (response: any) => {
          this.isLoading = false;
          
          // Show success message
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Profile updated successfully! You will be logged out.'
          });

          // Update the auth service with new user data
          if (this.currentUser) {
            this.authService.setUser({
              ...this.currentUser,
              Firstname: formData.firstName,
              Lastname: formData.lastName
            });
          }

          // Log out user after successful profile update
          setTimeout(() => {
            this.authService.logout();
            this.router.navigate(['/signup-choose']);
          }, 2000);
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
}
