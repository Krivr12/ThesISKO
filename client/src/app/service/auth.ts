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
    // CRITICAL: Restore user from sessionStorage immediately (synchronously)
    // This ensures the user is available before guards run on page refresh
    // This is especially important for guests to prevent redirects
    try {
      const userData = sessionStorage.getItem('currentUser');
      if (userData) {
        const user = JSON.parse(userData);
        // Validate that it's a proper user object
        if (user && (user.id || user.user_id || user.StudentID) && (user.email || user.Email)) {
          // Set user immediately so guards can access it
          this.currentUserSubject.next(user);
          console.log('✅ User restored synchronously from sessionStorage in constructor');
        }
      }
    } catch (e) {
      // Invalid sessionStorage data, will be handled by initializeUser
    }
    
    // Then verify cookie with server asynchronously
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
   * 1. First, check sessionStorage for existing user data (for faster initial load)
   * 2. Then, try to verify cookie via /auth/me endpoint
   * 3. If cookie is valid, sync sessionStorage with server response
   * 4. If cookie is invalid/missing (401), clear sessionStorage and set user to null
   * 5. If network error, keep sessionStorage data (don't clear on network issues)
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

    // Step 0: First, restore from sessionStorage for immediate UI update
    // This is critical for page refreshes - ensures user is available immediately
    const userData = sessionStorage.getItem('currentUser');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        // Validate that it's a proper user object
        if (user && (user.id || user.user_id || user.StudentID) && (user.email || user.Email)) {
          // Set user immediately so UI doesn't show logged out state
          // This is especially important for guests (role_id = 1) to prevent redirects
          this.currentUserSubject.next(user);
          console.log('✅ User restored from sessionStorage:', { id: user.id, role_id: user.role_id, email: user.email || user.Email });
        } else {
          console.warn('Invalid user data in sessionStorage, will verify with server');
        }
      } catch (parseError) {
        // Invalid sessionStorage data, will be cleared below
        console.warn('Invalid sessionStorage data, will verify with server');
      }
    }

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
        // Cookie is invalid or missing (401 response) - clear local state
        // Only clear if we got a 401 (unauthorized), not on network errors
        if (verificationResult.errorType === 'no_cookie' || verificationResult.errorType === 'invalid') {
          clearAuthStorage();
          this.currentUserSubject.next(null);
        }
        // If it's a network error, keep existing sessionStorage data
      }
    } catch (error: any) {
      // Network error or other unexpected error during verification
      // Don't clear sessionStorage on network errors - keep existing user data
      // This prevents users from being logged out due to temporary network issues
      console.warn('Cookie verification failed (network error), keeping existing session:', error.message);
      
      // If we have sessionStorage data, keep it
      if (userData) {
        try {
          const user = JSON.parse(userData);
          // Keep the user logged in based on sessionStorage
          this.currentUserSubject.next(user);
        } catch (parseError) {
          // Invalid sessionStorage data - clear it
          clearAuthStorage();
          this.currentUserSubject.next(null);
        }
      } else {
        // No sessionStorage data - user is not logged in
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
