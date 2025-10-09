import { Component, ViewChild, TemplateRef } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { RouterLink, Router} from '@angular/router';
import { MatDialogModule , MatDialog} from '@angular/material/dialog';
import { AuthService } from '../../components/navbar/navbar';
import { Auth } from '../../service/auth';

@Component({
  selector: 'app-sidenavbar',
  imports: [ 
    MatSidenavModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    RouterModule,
    RouterLink,
    MatDialogModule
  ],
  templateUrl: './sidenavbar.html',
  styleUrl: './sidenavbar.css'
})
export class Sidenavbar {
  @ViewChild('logoutConfirm') logoutConfirmTpl!: TemplateRef<any>;

  constructor(
    private dialog: MatDialog, 
    private router: Router,
    private navAuthService: AuthService,
    private mainAuthService: Auth
  ) {}

  openLogoutDialog(ev?: Event) {
    ev?.preventDefault();

    const ref = this.dialog.open(this.logoutConfirmTpl, {
      disableClose: true, // block backdrop/ESC
      width: '360px'
    });

    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        console.log('🔍 Faculty logout confirmed - clearing AuthServices');
        
        // Clear both AuthServices
        this.navAuthService.logout();
        this.mainAuthService.logout();
        
        // Navigate to signup choose
        this.router.navigateByUrl('/signup-choose');
      }
    });


}
}
