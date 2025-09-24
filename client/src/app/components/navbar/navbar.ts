import { Component, OnInit, Injectable, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { ActivityLoggerService } from '../../service/activity-logger.service';

/* PrimeNG */
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { MenuModule } from 'primeng/menu';
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
  role_id?: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private get hasStorage() {
    return typeof window !== 'undefined' && !!window.localStorage;
  }

  private userSubject = new BehaviorSubject<AuthUser | null>(this.restoreUser());
  user$ = this.userSubject.asObservable();

  setUser(user: AuthUser) {
    this.userSubject.next(user);
    if (this.hasStorage) {
      localStorage.setItem('user', JSON.stringify(user));
      sessionStorage.setItem('user', JSON.stringify(user));
    }
  }

  logout() {
    this.userSubject.next(null);
    if (this.hasStorage) {
      localStorage.removeItem('user');
      sessionStorage.removeItem('user');
    }
    // also clear tokens/cookies here if you use them
  }

  get currentUser() {
    return this.userSubject.value;
  }

  private restoreUser(): AuthUser | null {
    try {
      if (!this.hasStorage) return null;
      // Check both localStorage and sessionStorage
      const localRaw = localStorage.getItem('user');
      const sessionRaw = sessionStorage.getItem('user');
      const raw = localRaw || sessionRaw;
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  }
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, ToolbarModule, ButtonModule, AvatarModule, MenuModule],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css'],
})
export class Navbar implements OnInit {
  user$!: Observable<AuthUser | null>;
  profileItems: MenuItem[] = [];
  /** Default fallback image in assets */
  defaultAvatar = 'assets/profile.jpg';
  
  private activityLogger = inject(ActivityLoggerService);

  constructor(private auth: AuthService, private router: Router) {
    this.user$ = this.auth.user$; // assign in ctor to avoid DI timing issues
  }

  ngOnInit() {
    this.profileItems = [
      { label: 'Sign out', icon: 'pi pi-sign-out', command: () => this.logout() },
    ];
    // Sync with sessionStorage on init
    this.syncWithSessionStorage();
    
    // Debug: Log user state changes
    this.user$.subscribe(user => {
      console.log('Navbar: User state changed:', user);
      console.log('Navbar: Guest mode:', this.isGuestMode());
      console.log('Navbar: Session user:', sessionStorage.getItem('user'));
    });
  }

  private syncWithSessionStorage() {
    if (typeof window !== 'undefined' && !!window.localStorage) {
      const sessionUser = sessionStorage.getItem('user');
      if (sessionUser && !this.auth.currentUser) {
        try {
          const user = JSON.parse(sessionUser) as AuthUser;
          this.auth.setUser(user);
        } catch (e) {
          console.error('Error parsing session user:', e);
        }
      }
    }
  }

  logout() {
    this.auth.logout();
    // Clear guest mode
    sessionStorage.removeItem('guestMode');
    this.router.navigate(['/signup-choose']);
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

  /** Navigate to Search page */
  navigateToSearch(): void {
    console.log('Search button clicked - navigating to /search-thesis');
    console.log('Current user:', this.auth.currentUser);
    console.log('User role:', this.auth.currentUser?.Status);
    
    // Log navigation activity
    this.activityLogger.logNavigation(window.location.pathname, '/search-thesis', 'navbar_click').subscribe();
    
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
    
    // For users with firstname/lastname (from database)
    if (u.Firstname && u.Lastname) {
      return `${u.Firstname} ${u.Lastname}`;
    }
    
    // For Google users or fallback
    return u.displayName || u.username || u.email?.split('@')[0] || 'User';
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
