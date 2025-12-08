import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Auth } from '../../service/auth';
import { CustomConfirmService } from '../../service/custom-confirm.service';
import { CustomConfirmDialog } from '../../components/custom-confirm-dialog/custom-confirm-dialog';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  deanOnly?: boolean;
}

@Component({
  selector: 'app-admin-side-nav',
  standalone: true,
  imports: [CommonModule, RouterModule, CustomConfirmDialog],
  templateUrl: './admin-side-nav.html',
  styleUrls: ['./admin-side-nav.css']
})
export class AdminSideNav {
  private authService = inject(Auth);
  private router = inject(Router);
  private customConfirmService = inject(CustomConfirmService);

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
    { label: 'Faculties', icon: '', route: '/adminSide/faculties', deanOnly: true },
    { label: 'Requirements', icon: '', route: '/adminSide/requirements', deanOnly: true },
    { label: 'Request', icon: '', route: '/adminSide/requests' }
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
    this.customConfirmService.confirm({
      message: 'Are you sure you want to sign out?',
      header: 'Confirm Sign Out',
      acceptLabel: 'Yes',
      rejectLabel: 'Cancel',
      acceptCallback: async () => {
        // Perform logout
        this.authService.logout();
        // Navigate to login page
        this.router.navigate(['/login-admin']);
      }
    });
  }
}

