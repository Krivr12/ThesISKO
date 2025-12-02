import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { signupPostData, User } from '../interface/auth';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { verifyAuthCookie, clearAuthStorage } from '../utils/cookieVerification';

@Injectable({
  providedIn: 'root'
})
export class Auth {
  private baseUrl = environment.authApiUrl
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private isLoggingOut = false;
  private isInitializing = false; // Prevent multiple simultaneous initializations

  constructor(private http: HttpClient) {
    // Initialize user by verifying cookie with server on service creation
    // This ensures sessionStorage is in sync with server-side cookie state
    this.initializeUser();
  }

  signupUser(postData: signupPostData) {
    return this.http.post(`${this.baseUrl}/api/users`, postData);
  }

  loginUser(email: string, password: string): Observable<{message: string, user: User, account_type?: string, redirect_to?: string}> {
    return this.http.post<{message: string, user: User, account_type?: string, redirect_to?: string}>(`${this.baseUrl}/auth/login`, {
      email,
      password
    }, {
      withCredentials: true // Enable cookies
    });
  }

  loginFaculty(email: string, password: string): Observable<{message: string, user: User, account_type?: string}> {
    return this.http.post<{message: string, user: User, account_type?: string}>(`${this.baseUrl}/auth/faculty-login`, {
      email,
      password
    }, {
      withCredentials: true // Enable cookies
    });
  }

  loginAdmin(email: string, password: string): Observable<{message: string, user: User, account_type?: string}> {
    return this.http.post<{message: string, user: User, account_type?: string}>(`${this.baseUrl}/auth/admin-login`, {
      email,
      password
    }, {
      withCredentials: true // Enable cookies
    });
  }

  resendVerificationEmail(email: string): Observable<{message: string}> {
    return this.http.post<{message: string}>(`${this.baseUrl}/auth/resend-verification`, {
      email
    });
  }

  // User management methods
  setUser(user: User): void {
    this.currentUserSubject.next(user);
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Verify authentication cookie with server
   * Useful for guards and components that need to ensure cookie is still valid
   * 
   * @returns Promise that resolves to true if cookie is valid, false otherwise
   */
  async verifyCookie(): Promise<boolean> {
    try {
      const verificationResult = await verifyAuthCookie(this.http);
      
      if (verificationResult.authenticated && verificationResult.user) {
        // Cookie is valid - sync state
        const user: User = {
          id: verificationResult.user.id || verificationResult.user.user_id || verificationResult.user.StudentID,
          email: verificationResult.user.email || verificationResult.user.Email,
          Status: verificationResult.user.Status,
          Firstname: verificationResult.user.Firstname,
          Lastname: verificationResult.user.Lastname,
          AvatarUrl: verificationResult.user.AvatarUrl,
          role_id: verificationResult.user.role_id,
          Course: verificationResult.user.Course,
          Department: verificationResult.user.Department,
          ...(verificationResult.user.group_id && { group_id: verificationResult.user.group_id }),
        } as User;
        
        sessionStorage.setItem('currentUser', JSON.stringify(user));
        this.currentUserSubject.next(user);
        return true;
      } else {
        // Cookie invalid - clear state
        clearAuthStorage();
        this.currentUserSubject.next(null);
        return false;
      }
    } catch (error: any) {
      // On error, clear state to be safe
      clearAuthStorage();
      this.currentUserSubject.next(null);
      return false;
    }
  }

  /**
   * Get user-friendly error message for cookie verification failures
   * 
   * @param errorType - Type of error from cookie verification
   * @returns User-friendly error message
   */
  getCookieErrorMessage(errorType?: string): string {
    switch (errorType) {
      case 'no_cookie':
        return 'Your session has expired. Please log in again.';
      case 'expired':
        return 'Your session has expired. Please log in again.';
      case 'invalid':
        return 'Your session is invalid. Please log in again.';
      case 'network_error':
        return 'Network error. Please check your connection and try again.';
      case 'server_error':
        return 'Server error. Please try again later.';
      default:
        return 'Authentication error. Please log in again.';
    }
  }

  /**
   * Initialize user by verifying authentication cookie with server
   * This ensures client-side state (sessionStorage) matches server-side state (cookie)
   * 
   * Flow:
   * 1. First, try to verify cookie via /auth/me endpoint
   * 2. If cookie is valid, sync sessionStorage with server response
   * 3. If cookie is invalid/missing, clear sessionStorage and set user to null
   * 4. If network error, fall back to sessionStorage (but log warning)
   */
  async initializeUser(): Promise<void> {
    // Don't initialize if we're in the middle of logging out
    if (this.isLoggingOut) {
      return;
    }

    // Prevent multiple simultaneous initializations
    if (this.isInitializing) {
      return;
    }

    this.isInitializing = true;

    try {
      // Step 1: Verify cookie with server
      const verificationResult = await verifyAuthCookie(this.http);

      if (verificationResult.authenticated && verificationResult.user) {
        // Cookie is valid - sync sessionStorage with server data
        // Normalize user data format
        const user: User = {
          id: verificationResult.user.id || verificationResult.user.user_id || verificationResult.user.StudentID,
          email: verificationResult.user.email || verificationResult.user.Email,
          Status: verificationResult.user.Status,
          Firstname: verificationResult.user.Firstname,
          Lastname: verificationResult.user.Lastname,
          AvatarUrl: verificationResult.user.AvatarUrl,
          role_id: verificationResult.user.role_id,
          Course: verificationResult.user.Course,
          Department: verificationResult.user.Department,
          ...(verificationResult.user.group_id && { group_id: verificationResult.user.group_id }),
        } as User;

        // Update sessionStorage to match server data
        sessionStorage.setItem('currentUser', JSON.stringify(user));
        
        // Update observable
        this.currentUserSubject.next(user);
      } else {
        // Cookie is invalid or missing - clear local state
        // Clear all auth-related storage
        clearAuthStorage();
        
        // Clear observable
        this.currentUserSubject.next(null);
      }
    } catch (error: any) {
      // Unexpected error during verification
      // Fallback: check sessionStorage
      const userData = sessionStorage.getItem('currentUser');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          this.currentUserSubject.next(user);
        } catch (parseError) {
          clearAuthStorage();
          this.currentUserSubject.next(null);
        }
      } else {
        // No sessionStorage data either - user is not logged in
        this.currentUserSubject.next(null);
      }
    } finally {
      this.isInitializing = false;
    }
  }

  logout(): void {
    // Set logout flag to prevent re-initialization
    this.isLoggingOut = true;
    
    // Clear session storage first
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('role');
    
    // Force clear the observable
    this.currentUserSubject.next(null);
    
    // Double-check by clearing again after a small delay
    setTimeout(() => {
      // Force clear again if needed
      if (this.currentUserSubject.value !== null) {
        this.currentUserSubject.next(null);
      }
      
      // Reset logout flag after a delay
      setTimeout(() => {
        this.isLoggingOut = false;
      }, 500);
    }, 100);
  }
  
}
