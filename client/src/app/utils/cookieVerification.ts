/**
 * Cookie Verification Utility
 * 
 * Provides centralized functions to verify authentication cookies
 * by calling the server's /auth/me endpoint. This ensures that
 * client-side sessionStorage is in sync with server-side cookie state.
 */

import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CookieVerificationResult {
  authenticated: boolean;
  user: any | null;
  error?: string;
  errorType?: 'no_cookie' | 'expired' | 'invalid' | 'server_error' | 'network_error';
}

/**
 * Verifies authentication cookie by calling /auth/me endpoint
 * 
 * @param http - HttpClient instance for making API calls
 * @returns Promise with verification result containing user data if authenticated
 * 
 * Usage:
 *   const result = await verifyAuthCookie(this.http);
 *   if (result.authenticated && result.user) {
 *     // Cookie is valid, user is authenticated
 *   }
 */
export async function verifyAuthCookie(http: HttpClient): Promise<CookieVerificationResult> {
  try {
    const response = await firstValueFrom(
      http.get<{ authenticated: boolean; user?: any; error?: string }>(
        `${environment.authApiUrl}/auth/me`,
        { withCredentials: true } // Include cookies in request
      )
    );

    if (response.authenticated && response.user) {
      return {
        authenticated: true,
        user: response.user,
      };
    } else {
      // Server says not authenticated (401 response but with authenticated: false)
      return {
        authenticated: false,
        user: null,
        error: response.error || 'Not authenticated',
        errorType: 'no_cookie',
      };
    }
  } catch (error: any) {
    // Handle different error types
    if (error.status === 401) {
      // Unauthorized - cookie missing or invalid
      return {
        authenticated: false,
        user: null,
        error: 'Authentication cookie is missing or invalid',
        errorType: 'no_cookie',
      };
    } else if (error.status === 0 || error.status === undefined || error.name === 'TimeoutError') {
      // Network error, CORS issue, or timeout
      // Don't treat this as authentication failure - let the caller decide
      return {
        authenticated: false,
        user: null,
        error: 'Network error - unable to verify authentication',
        errorType: 'network_error',
      };
    } else if (error.status >= 500) {
      // Server error (5xx) - don't treat as auth failure
      return {
        authenticated: false,
        user: null,
        error: error.message || 'Server error during authentication verification',
        errorType: 'server_error',
      };
    } else {
      // Other HTTP errors (4xx except 401)
      return {
        authenticated: false,
        user: null,
        error: error.message || 'Error during authentication verification',
        errorType: 'server_error',
      };
    }
  }
}

/**
 * Clears all authentication-related data from sessionStorage
 * Call this when cookie verification fails to ensure clean state
 */
export function clearAuthStorage(): void {
  sessionStorage.removeItem('currentUser');
  sessionStorage.removeItem('user');
  sessionStorage.removeItem('role');
  sessionStorage.removeItem('email');
  sessionStorage.removeItem('loginTimestamp');
}

