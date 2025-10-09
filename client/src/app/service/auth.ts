import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { signupPostData, User } from '../interface/auth';
import { Observable, BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Auth {
  private baseUrl = 'http://localhost:5050'
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private isLoggingOut = false;

  constructor(private http: HttpClient) {
    // Initialize user from session storage on service creation
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

  initializeUser(): void {
    // Don't initialize if we're in the middle of logging out
    if (this.isLoggingOut) {
      console.log('🔍 AuthService initializeUser skipped - logging out');
      return;
    }
    
    const userData = sessionStorage.getItem('currentUser');
    console.log('🔍 AuthService initializeUser called');
    console.log('  - userData from sessionStorage:', userData ? 'exists' : 'null');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        console.log('  - Parsed user:', user);
        this.currentUserSubject.next(user);
      } catch (error) {
        console.error('Error parsing user data from session storage:', error);
        sessionStorage.removeItem('currentUser');
      }
    }
  }

  logout(): void {
    console.log('🔍 Main AuthService logout - Before clear:');
    console.log('  - sessionStorage currentUser:', sessionStorage.getItem('currentUser'));
    console.log('  - currentUserSubject value:', this.currentUserSubject.value);
    
    // Set logout flag to prevent re-initialization
    this.isLoggingOut = true;
    
    // Clear session storage first
    sessionStorage.removeItem('currentUser');
    
    // Force clear the observable
    this.currentUserSubject.next(null);
    
    // Double-check by clearing again after a small delay
    setTimeout(() => {
      console.log('🔍 Main AuthService logout - Double check after delay:');
      console.log('  - sessionStorage currentUser:', sessionStorage.getItem('currentUser'));
      console.log('  - currentUserSubject value:', this.currentUserSubject.value);
      
      // Force clear again if needed
      if (this.currentUserSubject.value !== null) {
        console.log('⚠️ User still exists, forcing clear...');
        this.currentUserSubject.next(null);
      }
      
      // Reset logout flag after a delay
      setTimeout(() => {
        this.isLoggingOut = false;
        console.log('🔍 Logout flag reset - AuthService can be re-initialized');
      }, 500);
    }, 100);
    
    console.log('🔍 Main AuthService logout - After clear:');
    console.log('  - sessionStorage currentUser:', sessionStorage.getItem('currentUser'));
    console.log('  - currentUserSubject value:', this.currentUserSubject.value);
  }
  
}
