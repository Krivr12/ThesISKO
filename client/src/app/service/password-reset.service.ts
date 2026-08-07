import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PasswordResetService {
  private base = environment.authApiUrl;

  constructor(private http: HttpClient) {}

  /** Step 1 – send reset link to email */
  requestReset(email: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.base}/auth/forgot-password`,
      { email }
    );
  }

  /** Step 2 – validate token before showing the form */
  validateToken(token: string, email: string): Observable<{ valid: boolean; error?: string }> {
    return this.http.get<{ valid: boolean; error?: string }>(
      `${this.base}/auth/reset-password`,
      { params: { token, email } }
    );
  }

  /** Step 3 – submit new password */
  resetPassword(
    token: string,
    email: string,
    newPassword: string,
    confirmPassword: string
  ): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.base}/auth/reset-password`,
      { token, email, newPassword, confirmPassword }
    );
  }
}
