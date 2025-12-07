import { Component, OnInit, Injectable, inject } from '@angular/core';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { Auth } from '../../service/auth';
import { environment } from '../../../environments/environment';

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

export interface NavItem {
  label: string;
  route?: string;
  action?: () => void;
  title: string;
  visible: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private userSubject = new BehaviorSubject<AuthUser | null>(null);
  user$ = this.userSubject.asObservable();
  private http = inject(HttpClient);
  private browserCloseHandlerAdded = false;
  private mainAuthService = inject(Auth);

  constructor() {
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
          this.userSubject.next(user);
          console.log('✅ Navbar AuthService: User restored synchronously from sessionStorage');
        }
      }
    } catch (e) {
      // Invalid sessionStorage data, will be handled by initializeUser
    }
    
    // Initialize user state from server on service creation
    this.initializeUser();
    // Set up browser close logout handler
    this.setupBrowserCloseLogout();
    
    // Also sync with main Auth service
    this.mainAuthService.currentUser$.subscribe(user => {
      if (user) {
        // Map User type to AuthUser type
        const authUser: AuthUser = {
          id: user.id?.toString() || user.user_id?.toString() || user.StudentID?.toString() || '',
          email: user.email || user.Email,
          Email: user.Email || user.email,
          Status: user.Status,
          Firstname: user.Firstname,
          Lastname: user.Lastname,
          AvatarUrl: user.AvatarUrl,
          role_id: user.role_id,
          Course: user.Course,
          Department: user.Department,
          group_id: user.group_id
        };
        this.userSubject.next(authUser);
      }
    });
  }

  private async initializeUser() {
    try {
      const response = await this.http.get<{user: AuthUser}>(`${environment.authApiUrl}/auth/me`, {
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
        // On 401, check sessionStorage as fallback
        try {
          const userData = sessionStorage.getItem('currentUser');
          if (userData) {
            const user = JSON.parse(userData);
            if (user && (user.id || user.user_id || user.StudentID)) {
              this.userSubject.next(user);
              console.log('✅ Navbar AuthService: Using sessionStorage fallback after 401');
            }
          }
        } catch (e) {
          // Invalid sessionStorage data
        }
      } else {
        // Other errors might be network issues or server problems
        console.warn('Auth check failed:', error?.message || error);
        // On network error, keep sessionStorage data
        try {
          const userData = sessionStorage.getItem('currentUser');
          if (userData) {
            const user = JSON.parse(userData);
            if (user && (user.id || user.user_id || user.StudentID)) {
              this.userSubject.next(user);
              console.log('✅ Navbar AuthService: Using sessionStorage fallback after network error');
            }
          }
        } catch (e) {
          // Invalid sessionStorage data
        }
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
      await this.http.post(`${environment.authApiUrl}/auth/logout`, {}, {
        withCredentials: true
      }).toPromise();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local state
      this.userSubject.next(null);
      // Also clear the main AuthService
      this.mainAuthService.logout();
      // Clear any remaining session/local storage for guest mode
      if (typeof window !== 'undefined') {
        console.log('🧹 Clearing storage...');
        console.log('Before clear - localStorage keys:', Object.keys(localStorage));
        console.log('Before clear - sessionStorage keys:', Object.keys(sessionStorage));
        
        // Clear sessionStorage
        sessionStorage.removeItem('guestMode');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('role');
        sessionStorage.removeItem('loginTimestamp');
        sessionStorage.removeItem('pageHiddenAt');
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('email');
        
        console.log('After clear - localStorage keys:', Object.keys(localStorage));
        console.log('After clear - sessionStorage keys:', Object.keys(sessionStorage));
        console.log('After clear - sessionStorage currentUser:', sessionStorage.getItem('currentUser'));
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

    // DISABLED: beforeunload fires on page refresh, not just browser close
    // This was causing users to be logged out on page refresh
    // Modern browsers keep localStorage persistent, so manual logout is preferred
    
    // Handle page visibility change for session timeout
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
      navigator.sendBeacon(`${environment.authApiUrl}/auth/logout`, logoutData);
      
      // Clear local state immediately
      this.userSubject.next(null);
      sessionStorage.clear();
      
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
  isMenuOpen = false;
  /** Default fallback image in assets */
  defaultAvatar = 'profile.png';
  navItems: NavItem[] = [];
  shouldShowNavbar: boolean = true;

  constructor(private auth: AuthService, private router: Router, private confirmationService: ConfirmationService) {
    this.user$ = this.auth.user$; // assign in ctor to avoid DI timing issues
  }

  ngOnInit() {
    // Check current route and hide navbar on login/admin pages
    this.checkRouteAndToggleNavbar();
    
    // Subscribe to route changes to hide/show navbar dynamically
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.checkRouteAndToggleNavbar();
    });

    // Initialize profile items based on user role
    this.user$.subscribe(user => {
      this.updateProfileItems(user);
      // Update navigation items when user changes
      this.updateNavItems();
    });
    // Initial load
    this.updateNavItems();
  }

  private checkRouteAndToggleNavbar(): void {
    const currentUrl = this.router.url;
    
    // Routes where navbar SHOULD be shown (whitelist approach)
    const allowedRoutes = [
      '/home',
      '/search-thesis',
      '/search-result',
      '/submission',
      '/submission-old',
      '/about-us',
      '/thank-you',
      '/student-profile',
      '/guest-profile'
    ];
    
    // Check if current route matches any allowed route
    const isAllowedRoute = allowedRoutes.some(route => currentUrl === route || currentUrl.startsWith(route + '/'));
    
    // Show navbar only on allowed routes
    this.shouldShowNavbar = isAllowedRoute;
  }

  // Hamburger menu toggle
  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu() {
    this.isMenuOpen = false;
  }


  logout() {
    // All users (student, guest, faculty, admin) use the same PrimeNG confirmation dialog
    this.confirmationService.confirm({
      message: 'Are you sure you want to sign out?',
      header: 'Confirm Sign Out',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes',
      rejectLabel: 'Cancel',
      accept: async () => {
        await this.performLogout();
      }
    });
  }

  private async performLogout() {
    await this.auth.logout();
    // Clear guest mode from both storages
    sessionStorage.removeItem('guestMode');
    localStorage.removeItem('guestMode');
    
    // Navigate all users to signup-choose after logout
    this.router.navigate(['/signup-choose']);
  }


  /** Update profile menu items based on user role */
  private updateProfileItems(user: AuthUser | null) {
    if (!user) {
      this.profileItems = [];
      return;
    }

    this.profileItems = [];

    // Add "Edit Information" for ALL users (universal access)
    this.profileItems.push({
      label: 'Edit Information',
      icon: 'pi pi-user-edit',
      command: () => this.navigateToProfile()
    });

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
    
    if (!currentUser) {
      console.error('No current user found, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }
    
    // Check both Status field and role_id for reliability
    const userStatus = currentUser.Status?.toLowerCase();
    const userRoleId = currentUser.role_id;
    
    // Determine user type and navigate to appropriate profile page
    // Check for student: 'student', 'pup-ian', or role_id === 2
    const isGuest = userStatus === 'guest' || userRoleId === 1;
    const isStudent = userStatus === 'student' || userStatus === 'pup-ian' || userRoleId === 2;
    const isFaculty = userStatus === 'faculty' || userRoleId === 3 || userRoleId === 7 || userRoleId === 8;
    const isAdmin = userRoleId === 4 || userRoleId === 5; // Admin or SuperAdmin
    
    if (isGuest) {
      this.router.navigate(['/guest-profile']);
    } else if (isStudent) {
      this.router.navigate(['/student-profile']);
    } else if (isFaculty) {
      this.router.navigate(['/faculty-change-password']);
    } else if (isAdmin) {
      // For admins/superadmins, navigate to student profile as default (or create admin profile page later)
      this.router.navigate(['/student-profile']);
    } else {
      // Fallback: try student profile for any other user type
      console.warn('Unknown user role, defaulting to student profile:', { userStatus, userRoleId });
      this.router.navigate(['/student-profile']);
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

  /** Check if current user is a student */
  isStudentUser(): boolean {
    const currentUser = this.auth.currentUser;
    if (!currentUser) return false;
    
    // Check if user status is 'student' (case insensitive)
    return currentUser.Status?.toLowerCase() === 'student';
  }

  /** Check if current user is a group leader (role_id = 6) */
  isGroupLeader(): boolean {
    const currentUser = this.auth.currentUser;
    if (!currentUser) return false;
    
    // Check if role_id is 6 (Group Leader)
    return currentUser.role_id === 6;
  }

  /** Check if current user can submit (students or group leaders) */
  canSubmit(): boolean {
    const currentUser = this.auth.currentUser;
    
    if (!currentUser) {
      return false;
    }
    
    // Allow students (role_id = 2) and group leaders (role_id = 6)
    return currentUser.role_id === 2 || currentUser.role_id === 6;
  }

  /** Check if current user is a PUPian (authenticated non-guest user) */
  isPUPianUser(): boolean {
    const currentUser = this.auth.currentUser;
    if (!currentUser) return false;
    
    // PUPian users are authenticated users who are NOT guests
    const isGuest = currentUser.Status?.toLowerCase() === 'guest' || currentUser.role_id === 1;
    return !isGuest;
  }

  /** Update navigation items based on current user type */
  private updateNavItems(): void {
    const currentUser = this.auth.currentUser;
    const isPUPian = this.isPUPianUser();
    
    // Base items that all users see
    const items: NavItem[] = [
      {
        label: 'Home',
        action: () => {
          this.navigateToHome();
          this.closeMenu();
        },
        title: 'Go to home page',
        visible: true
      },
      {
        label: 'Search',
        action: () => {
          this.navigateToSearch();
          this.closeMenu();
        },
        title: 'Search for thesis',
        visible: true
      }
    ];

    // For PUPian users, add Submit before About
    if (isPUPian && this.canSubmit()) {
      items.push({
        label: 'Submit',
        route: '/submission',
        action: () => {
          this.closeMenu();
        },
        title: 'Submit your thesis',
        visible: true
      });
    }

    // About is always last
    items.push({
      label: 'About',
      action: () => {
        this.navigateToAbout();
        this.closeMenu();
      },
      title: 'Navigate to About Us page',
      visible: true
    });

    // Filter out any items that shouldn't be visible (for future extensibility)
    this.navItems = items.filter(item => item.visible);
  }

  /** Get navigation items (for template access) */
  getNavItems(): NavItem[] {
    return this.navItems;
  }

  /** Check if any user is logged in */
  isUserLoggedIn(): boolean {
    const currentUser = this.auth.currentUser;
    return currentUser !== null && currentUser !== undefined;
  }


  /** Navigate to About Us page */
  navigateToAbout(): void {
    console.log('About button clicked - navigating to /about-us');
    const currentUser = this.auth.currentUser;
    console.log('Current user:', currentUser);
    console.log('User role:', currentUser?.Status);
    
    // Use navigateByUrl for more reliable navigation
    this.router.navigateByUrl('/about-us').then(success => {
      if (success) {
        console.log('Navigation to /about-us successful');
      } else {
        console.error('Navigation to /about-us failed - guard may have blocked it');
        // If navigation fails, try again after a short delay (in case user is still loading)
        setTimeout(() => {
          this.router.navigateByUrl('/about-us').catch(err => {
            console.error('Retry navigation failed:', err);
          });
        }, 100);
      }
    }).catch(error => {
      console.error('Navigation error:', error);
    });
  }

  /** Navigate to Login page */
  navigateToLogin(): void {
    // Check if user is in guest mode
    // Guests can use Google login, PUPians cannot
    const isGuestMode = sessionStorage.getItem('guestMode') === 'true';
    const loginType = isGuestMode ? 'guest' : 'pupian';
    
    this.router.navigate(['/login'], { queryParams: { type: loginType } }).then(success => {
      if (success) {
        console.log('Navigation to /login successful with type:', loginType);
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
    const currentUser = this.auth.currentUser;
    console.log('Current user:', currentUser);
    console.log('User role:', currentUser?.Status);
    
    // Use navigateByUrl for more reliable navigation
    this.router.navigateByUrl('/search-thesis').then(success => {
      if (success) {
        console.log('Navigation to /search-thesis successful');
      } else {
        console.error('Navigation to /search-thesis failed - guard may have blocked it');
        // If navigation fails, try again after a short delay (in case user is still loading)
        setTimeout(() => {
          this.router.navigateByUrl('/search-thesis').catch(err => {
            console.error('Retry navigation failed:', err);
          });
        }, 100);
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
    if (!u) {
      return 'User';
    }
    
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
    if (!u) {
      return '';
    }
    
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
