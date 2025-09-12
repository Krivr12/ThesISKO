import { Component } from '@angular/core';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { AvatarGroupModule } from 'primeng/avatargroup';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-navbar',
  imports: [
    ToolbarModule,
    ButtonModule,
    AvatarModule,
    AvatarGroupModule,
    RouterLink
  ],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar {

}
