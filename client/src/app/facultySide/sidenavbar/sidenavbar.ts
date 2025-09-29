import { Component, ViewChild, TemplateRef } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { RouterLink, Router} from '@angular/router';
import { MatDialogModule , MatDialog} from '@angular/material/dialog';

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

  constructor(private dialog: MatDialog, private router: Router) {}

  openLogoutDialog(ev?: Event) {
    ev?.preventDefault();

    const ref = this.dialog.open(this.logoutConfirmTpl, {
      disableClose: true, // block backdrop/ESC
      width: '360px'
    });

    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        // TODO: clear auth/session if needed
        // localStorage.removeItem('token'); etc.
        this.router.navigateByUrl('/signup-choose');
      }
    });


}
}
