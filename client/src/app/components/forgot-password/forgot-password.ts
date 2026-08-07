import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PasswordResetService } from '../../service/password-reset.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, InputTextModule, ButtonModule, RouterLink, ToastModule],
  providers: [MessageService],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css'
})
export class ForgotPassword {
  email = '';
  isLoading = false;
  emailSent = false; // show success state instead of navigating away

  private resetService = inject(PasswordResetService);
  private router = inject(Router);
  private messageService = inject(MessageService);

  onSubmit() {
    const trimmed = this.email.trim().toLowerCase();
    if (!trimmed) {
      this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Please enter your email address.' });
      return;
    }

    this.isLoading = true;
    this.resetService.requestReset(trimmed).subscribe({
      next: () => {
        this.isLoading = false;
        this.emailSent = true;
      },
      error: () => {
        this.isLoading = false;
        // Still show success-like feedback to prevent enumeration
        this.emailSent = true;
      }
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
