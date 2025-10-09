import { Component, ViewChild, TemplateRef} from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule, Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import { MatDialogModule , MatDialog} from '@angular/material/dialog';
import { Auth } from '../../service/auth';
import { AuthService } from '../../components/navbar/navbar';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-side-bar',
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    RouterModule,
    RouterLink,
    MatDialogModule,
    CommonModule
  ],
  templateUrl: './admin-side-bar.html',
  styleUrl: './admin-side-bar.css'
})
export class AdminSideBar {

  @ViewChild('logoutConfirm') logoutConfirmTpl!: TemplateRef<any>;
  currentUser: any = null;

  constructor(
    private dialog: MatDialog, 
    private router: Router, 
    private authService: Auth,
    private navAuthService: AuthService
  ) {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  get isAdmin(): boolean {
    return this.currentUser?.role_id === 4;
  }

  get isSuperAdmin(): boolean {
    return this.currentUser?.role_id === 5;
  }

  openLogoutDialog(ev?: Event) {
    ev?.preventDefault();

    const ref = this.dialog.open(this.logoutConfirmTpl, {
      disableClose: true, // block backdrop/ESC
      width: '360px'
    });

    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        console.log('🔍 Admin/SuperAdmin logout confirmed - clearing AuthServices');
        
        // Clear both AuthServices
        this.navAuthService.logout();
        this.authService.logout();
        
        // Navigate to signup choose
        this.router.navigateByUrl('/signup-choose');
      }
    });

}
}
