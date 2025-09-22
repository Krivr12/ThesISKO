import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Toolbar } from "primeng/toolbar";

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-sidebar.html',
  styleUrls: ['./admin-sidebar.css']
})
export class AdminSidebarComponent {
  constructor(private router: Router) {}

  logout(): void {
    console.log('User logged out');
    this.router.navigate(['/login']);
  }
}

