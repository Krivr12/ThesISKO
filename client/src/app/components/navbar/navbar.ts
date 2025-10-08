import { Component } from '@angular/core';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { AvatarGroupModule } from 'primeng/avatargroup';
import { RouterLink } from '@angular/router';
import { LoginModal } from "../login-modal/login-modal";

@Component({
  selector: 'app-navbar',
  imports: [
    ToolbarModule,
    ButtonModule,
    AvatarModule,
    AvatarGroupModule,
    RouterLink,
    LoginModal
],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar {

  // This is for asking if user isn't logged in their account
  isLoginModalVisible = false;

  // Pop up function
  openLoginModal(): void {
    this.isLoginModalVisible = true;
  }

  closeLoginModal(): void {
    this.isLoginModalVisible = false;
  }
}
