import { Component, OnInit, Injectable } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';

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
  photoURL?: string;
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
    }
  }

  logout() {
    this.userSubject.next(null);
    if (this.hasStorage) {
      localStorage.removeItem('user');
    }
    // also clear tokens/cookies here if you use them
  }

  get currentUser() {
    return this.userSubject.value;
  }

  private restoreUser(): AuthUser | null {
    try {
      if (!this.hasStorage) return null;
      const raw = localStorage.getItem('user');
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

  constructor(private auth: AuthService, private router: Router) {
    this.user$ = this.auth.user$; // assign in ctor to avoid DI timing issues
  }

  ngOnInit() {
    this.profileItems = [
      { label: 'Sign out', icon: 'pi pi-sign-out', command: () => this.logout() },
    ];
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/home']);
  }

  /** Decide which image to use: user photo or default asset */
  avatarFor(u: AuthUser | null | undefined): string {
    const src = u?.photoURL?.trim();
    return src && src.length > 0 ? src : this.defaultAvatar;
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
