import { Component, OnInit, Injectable, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';

/* PrimeNG */
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { MenuModule } from 'primeng/menu';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { MenuItem } from 'primeng/api';

export interface AuthUser {
  id: string;
  displayName?: string;
  username?: string;
  email?: string;
  Email?: string;
  photoURL?: string;
  AvatarUrl?: string;
  Status?: string;
  Firstname?: string;
  Lastname?: string;
  Course?: string;
  Department?: string;
  role_id?: number;
  // Group account specific fields
  group_id?: string;
  account_type?: string;
  leader_name?: string;
  members?: any[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private userSubject = new BehaviorSubject<AuthUser | null>(null);
  user$ = this.userSubject.asObservable();
  private http = inject(HttpClient);
  private browserCloseHandlerAdded = false;

  constructor() {
    // Initialize user state from server on service creation
    this.initializeUser();
    // Set up browser close logout handler
    this.setupBrowserCloseLogout();
  }

  private async initializeUser() {
    try {
      const response = await this.http.get<{user: AuthUser}>('http://localhost:5050/auth/me', {
        withCredentials: true
      }).toPromise();
      
      if (response?.user) {
        this.userSubject.next(response.user);
      }
    } catch (error: any) {
      // Handle different types of errors
      if (error?.status === 401) {
        // 401 is expected when no user is logged in - don't log as error
        console.log('No authenticated user session found');
      } else {
        // Other errors might be network issues or server problems
        console.warn('Auth check failed:', error?.message || error);
      }
    }
  }

  setUser(user: AuthUser) {
    this.userSubject.next(user);
    // Set session timestamp when user logs in
    if (user && typeof window !== 'undefined') {
      sessionStorage.setItem('loginTimestamp', Date.now().toString());
    }
  }

  async logout() {
    try {
      // Call backend logout endpoint to clear HttpOnly cookie
      await this.http.post('http://localhost:5050/auth/logout', {}, {
        withCredentials: true
      }).toPromise();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local state
      this.userSubject.next(null);
      // Clear any remaining session storage for guest mode
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('guestMode');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('role');
        sessionStorage.removeItem('loginTimestamp');
        sessionStorage.removeItem('pageHiddenAt');
        localStorage.removeItem('user');
      }
    }
  }

  get currentUser() {
    return this.userSubject.value;
  }

  // Method to refresh user data from server
  async refreshUser() {
    await this.initializeUser();
  }

  // Set up browser close logout handler
  private setupBrowserCloseLogout() {
    if (typeof window === 'undefined' || this.browserCloseHandlerAdded) {
      return;
    }

    // Handle browser/tab close
    window.addEventListener('beforeunload', (event) => {
      // Only logout if user is authenticated
      if (this.currentUser) {
        // Use sendBeacon for reliable logout on page unload
        this.logoutOnBrowserClose();
      }
    });

    // Handle page visibility change (when tab becomes hidden)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && this.currentUser) {
        // Store a timestamp when the page becomes hidden
        sessionStorage.setItem('pageHiddenAt', Date.now().toString());
      } else if (document.visibilityState === 'visible') {
        // Check if we should logout when page becomes visible again
        this.checkForStaleSession();
      }
    });

    this.browserCloseHandlerAdded = true;
  }

  // Logout when browser is closing
  private logoutOnBrowserClose() {
    try {
      // Use sendBeacon for reliable request during page unload
      const logoutData = new Blob([JSON.stringify({ reason: 'browser_close' })], {
        type: 'application/json'
      });
      navigator.sendBeacon('http://localhost:5050/auth/logout', logoutData);
      
      // Clear local state immediately
      this.userSubject.next(null);
      sessionStorage.clear();
      localStorage.removeItem('user');
      
      console.log('Browser close logout initiated');
    } catch (error) {
      console.error('Error during browser close logout:', error);
    }
  }

  // Check for stale sessions when page becomes visible
  private checkForStaleSession() {
    const pageHiddenAt = sessionStorage.getItem('pageHiddenAt');
    if (pageHiddenAt) {
      const hiddenTime = parseInt(pageHiddenAt);
      const currentTime = Date.now();
      const timeDiff = currentTime - hiddenTime;
      
      // If page was hidden for more than 30 minutes, logout
      if (timeDiff > 30 * 60 * 1000) { // 30 minutes
        console.log('Session expired due to inactivity');
        this.logout();
      }
      
      // Remove the timestamp
      sessionStorage.removeItem('pageHiddenAt');
    }
  }
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, ToolbarModule, ButtonModule, AvatarModule, MenuModule, ConfirmDialogModule],
  providers: [ConfirmationService],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css'],
})
export class Navbar implements OnInit {
  user$!: Observable<AuthUser | null>;
  profileItems: MenuItem[] = [];
  /** Default fallback image in assets */
  defaultAvatar = 'assets/profile.jpg';
  

  constructor(private auth: AuthService, private router: Router, private confirmationService: ConfirmationService) {
    this.user$ = this.auth.user$; // assign in ctor to avoid DI timing issues
  }

  ngOnInit() {
    // Initialize profile items based on user role
    this.user$.subscribe(user => {
      this.updateProfileItems(user);
      console.log('Navbar: User state changed:', user);
      console.log('Navbar: Guest mode:', this.isGuestMode());
    });
  }


  logout() {
    const currentUser = this.auth.currentUser;
    const userRole = currentUser?.Status?.toLowerCase();
    const isGuest = userRole === 'guest';
    
    this.confirmationService.confirm({
      message: isGuest 
        ? 'Are you sure you want to sign out? You will need to sign in again to access your account.'
        : 'Are you sure you want to sign out?',
      header: 'Confirm Sign Out',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes, Sign Out',
      rejectLabel: 'Cancel',
      accept: async () => {
        await this.auth.logout();
        // Clear guest mode
        sessionStorage.removeItem('guestMode');
        
        // Navigate all users to signup-choose after logout
        this.router.navigate(['/signup-choose']);
      }
    });
  }

  /** Update profile menu items based on user role */
  private updateProfileItems(user: AuthUser | null) {
    if (!user) {
      this.profileItems = [];
      return;
    }

    this.profileItems = [];

    // Add "Edit Information" for students and guests
    if (user.Status?.toLowerCase() === 'student' || user.Status?.toLowerCase() === 'guest') {
      this.profileItems.push({
        label: 'Edit Information',
        icon: 'pi pi-user-edit',
        command: () => this.navigateToProfile()
      });
    }

    // Always add "Sign out"
    this.profileItems.push({
      label: 'Sign out',
      icon: 'pi pi-sign-out',
      command: () => this.logout()
    });
  }

  /** Navigate to profile page based on user role */
  navigateToProfile() {
    const currentUser = this.auth.currentUser;
    const userRole = currentUser?.Status?.toLowerCase();
    
    // Debug logging
    console.log('Edit Information clicked - Debug info:');
    console.log('Current User:', currentUser);
    console.log('User Role:', userRole);
    console.log('Session Storage guestMode:', sessionStorage.getItem('guestMode'));
    
    if (!currentUser) {
      console.error('No current user found, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }
    
    if (userRole === 'guest') {
      console.log('Edit Information clicked - navigating to /guest-profile');
      this.router.navigate(['/guest-profile']).then(success => {
        if (success) {
          console.log('Navigation to /guest-profile successful');
        } else {
          console.error('Navigation to /guest-profile failed');
        }
      }).catch(error => {
        console.error('Navigation error:', error);
      });
    } else if (userRole === 'student') {
      console.log('Edit Information clicked - navigating to /student-profile');
      this.router.navigate(['/student-profile']).then(success => {
        if (success) {
          console.log('Navigation to /student-profile successful');
        } else {
          console.error('Navigation to /student-profile failed');
        }
      }).catch(error => {
        console.error('Navigation error:', error);
      });
    } else {
      console.error('Unknown user role or no role found:', userRole);
      console.log('Available user properties:', Object.keys(currentUser || {}));
    }
  }

  /** Decide which image to use: user photo or default asset */
  avatarFor(u: AuthUser | null | undefined): string {
    if (!u) return this.defaultAvatar;
    
    // For guest users (Google OAuth), prioritize AvatarUrl from database
    if (u.Status?.toLowerCase() === 'guest' && u.AvatarUrl?.trim()) {
      return u.AvatarUrl.trim();
    }
    
    // For other users or fallback, use photoURL or default
    const src = u.photoURL?.trim() || u.AvatarUrl?.trim();
    return src && src.length > 0 ? src : this.defaultAvatar;
  }

  /** Check if in guest mode */
  isGuestMode(): boolean {
    return sessionStorage.getItem('guestMode') === 'true';
  }

  /** Check if current user is a guest user */
  isGuestUser(): boolean {
    const currentUser = this.auth.currentUser;
    if (!currentUser) return false;
    
    // Check if user status is 'guest' (case insensitive)
    return currentUser.Status?.toLowerCase() === 'guest';
  }

  /** Navigate to About Us page */
  navigateToAbout(): void {
    console.log('About button clicked - navigating to /about-us');
    console.log('Current user:', this.auth.currentUser);
    console.log('User role:', this.auth.currentUser?.Status);
    
    this.router.navigate(['/about-us']).then(success => {
      if (success) {
        console.log('Navigation to /about-us successful');
      } else {
        console.error('Navigation to /about-us failed');
      }
    }).catch(error => {
      console.error('Navigation error:', error);
    });
  }

  /** Navigate to Login page */
  navigateToLogin(): void {
    console.log('Login button clicked - navigating to /login');
    console.log('Current user:', this.auth.currentUser);
    console.log('Guest mode:', sessionStorage.getItem('guestMode'));
    
    this.router.navigate(['/login']).then(success => {
      if (success) {
        console.log('Navigation to /login successful');
      } else {
        console.error('Navigation to /login failed');
      }
    }).catch(error => {
      console.error('Navigation error:', error);
    });
  }

  /** Navigate to Search page */
  navigateToSearch(): void {
    console.log('Search button clicked - navigating to /search-thesis');
    console.log('Current user:', this.auth.currentUser);
    console.log('User role:', this.auth.currentUser?.Status);
    
    
    this.router.navigate(['/search-thesis']).then(success => {
      if (success) {
        console.log('Navigation to /search-thesis successful');
      } else {
        console.error('Navigation to /search-thesis failed');
      }
    }).catch(error => {
      console.error('Navigation error:', error);
    });
  }

  /** Navigate to Home page */
  navigateToHome(): void {
    console.log('Home button clicked - navigating to /home');
    console.log('Current user:', this.auth.currentUser);
    console.log('User role:', this.auth.currentUser?.Status);
    
    this.router.navigate(['/home']).then(success => {
      if (success) {
        console.log('Navigation to /home successful');
      } else {
        console.error('Navigation to /home failed');
      }
    }).catch(error => {
      console.error('Navigation error:', error);
    });
  }

  /** Get display name for user */
  getDisplayName(u: AuthUser | null | undefined): string {
    if (!u) return 'User';
    
    // For group accounts, display the group ID
    if (u.account_type === 'group' && u.group_id) {
      return u.group_id;
    }
    
    // For users with firstname/lastname (from database)
    if (u.Firstname && u.Lastname) {
      return `${u.Firstname} ${u.Lastname}`;
    }
    
    // For Google users or fallback
    return u.displayName || u.username || u.email?.split('@')[0] || 'User';
  }

  /** Get email to display for user */
  getUserEmail(u: AuthUser | null | undefined): string {
    if (!u) return '';
    
    // For group accounts, show "Group Account" instead of email
    if (u.account_type === 'group') {
      return 'Group Account';
    }
    
    // For regular users, show email
    return u.email || u.Email || '';
  }

  /** Optional: initials helper if you ever want a text avatar fallback */
  initials(u: AuthUser | null | undefined): string {
    if (!u) return '?';
    const base = (u.email || u.displayName || u.username || '').trim();
    if (!base) return '?';
    return base
      .split(/[ .@_-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(s => s[0]!.toUpperCase())
      .join('');
  }
}
