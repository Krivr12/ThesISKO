import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Auth } from '../../service/auth';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  deanOnly?: boolean;
}

@Component({
  selector: 'app-admin-side-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-side-nav.html',
  styleUrls: ['./admin-side-nav.css']
})
export class AdminSideNav {
  private authService = inject(Auth);
  private router = inject(Router);

  currentUser = computed(() => this.authService.currentUser);
  isDean = computed(() => this.currentUser()?.role_id === 5);
  userRole = computed(() => {
    const roleId = this.currentUser()?.role_id;
    return roleId === 5 ? 'Dean' : roleId === 4 ? 'Chairperson' : 'Admin';
  });

  // Menu items configuration
  private allMenuItems: MenuItem[] = [
    { label: 'Dashboard', icon: '', route: '/adminSide/dashboard' },
    { label: 'Documents', icon: '', route: '/adminSide/documents' },
    { label: 'Approvals', icon: '', route: '/adminSide/approvals' },
    { label: 'Programs', icon: '', route: '/adminSide/programs', deanOnly: true },
    { label: 'Request', icon: '', route: '/adminSide/requests' },
    { label: 'Template', icon: '', route: '/adminSide/templates' }
  ];

  // Filtered menu items based on user role
  menuItems = computed(() => {
    const isDean = this.isDean();
    return this.allMenuItems.filter(item => {
      // Show all items to dean
      if (isDean) return true;
      // Hide dean-only items for chairperson
      return !item.deanOnly;
    });
  });

  isActiveRoute(route: string): boolean {
    return this.router.url === route || this.router.url.startsWith(route + '/');
  }

  logout() {
    if (confirm('Are you sure you want to logout?')) {
      this.authService.logout();
      this.router.navigate(['/login-admin']);
    }
  }
}

