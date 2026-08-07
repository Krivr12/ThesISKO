import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PasswordResetService } from '../../service/password-reset.service';

type PageState = 'validating' | 'invalid' | 'form' | 'success';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule, PasswordModule, ButtonModule, RouterLink, ToastModule],
  providers: [MessageService],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css'
})
export class ResetPassword implements OnInit {
  state: PageState = 'validating';
  tokenError = '';

  token = '';
  email = '';
  newPassword = '';
  confirmPassword = '';
  isLoading = false;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private resetService = inject(PasswordResetService);
  private messageService = inject(MessageService);

  ngOnInit() {
    this.token = this.route.snapshot.queryParams['token'] ?? '';
    this.email = decodeURIComponent(this.route.snapshot.queryParams['email'] ?? '');

    if (!this.token || !this.email) {
      this.state = 'invalid';
      this.tokenError = 'Invalid reset link. Please request a new one.';
      return;
    }

    // Validate token with backend before showing the form
    this.resetService.validateToken(this.token, this.email).subscribe({
      next: (res) => {
        this.state = res.valid ? 'form' : 'invalid';
        if (!res.valid) this.tokenError = res.error ?? 'This reset link is invalid or has expired.';
      },
      error: () => {
        this.state = 'invalid';
        this.tokenError = 'Could not validate the reset link. Please try again.';
      }
    });
  }

  get passwordsMatch(): boolean {
    return this.newPassword === this.confirmPassword;
  }

  get isFormValid(): boolean {
    return (
      this.newPassword.length >= 8 &&
      this.confirmPassword.length >= 8 &&
      this.passwordsMatch
    );
  }

  onSubmit() {
    if (!this.isFormValid) {
      if (!this.passwordsMatch) {
        this.messageService.add({ severity: 'warn', summary: 'Mismatch', detail: 'Passwords do not match.' });
      } else {
        this.messageService.add({ severity: 'warn', summary: 'Too short', detail: 'Password must be at least 8 characters.' });
      }
      return;
    }

    this.isLoading = true;
    this.resetService.resetPassword(this.token, this.email, this.newPassword, this.confirmPassword).subscribe({
      next: () => {
        this.isLoading = false;
        this.state = 'success';
      },
      error: (err) => {
        this.isLoading = false;
        const msg = err.error?.error ?? 'Something went wrong. Please try again.';
        this.messageService.add({ severity: 'error', summary: 'Error', detail: msg });
      }
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  requestNewLink() {
    this.router.navigate(['/forgot-password']);
  }
}
