import { Component, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { RouterModule, Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import { Auth } from '../../service/auth';
import { AuthService } from '../../components/navbar/navbar';

@Component({
  selector: 'app-super-admin-nav-bar',
  imports: [
    CommonModule,
    MatSidenavModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    RouterModule,
    RouterLink,
  ],
  templateUrl: './super-admin-nav-bar.html',
  styleUrl: './super-admin-nav-bar.css'
})
export class SuperAdminNavBar {

  @ViewChild('logoutConfirm') logoutConfirmTpl!: TemplateRef<any>;
  
  constructor(
    private dialog: MatDialog, 
    private router: Router, 
    private authService: Auth,
    private navAuthService: AuthService
  ) {}

  openLogoutDialog(ev?: Event) {
    ev?.preventDefault();

    const ref = this.dialog.open(this.logoutConfirmTpl, {
      disableClose: true,
      width: '360px'
    });

    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        console.log('🔍 SuperAdmin logout confirmed - clearing AuthServices');
        
        // Clear both AuthServices
        this.navAuthService.logout();
        this.authService.logout();
        
        // Navigate to signup choose
        this.router.navigateByUrl('/signup-choose');
      }
    });
  }
}
