import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Auth } from '../../service/auth';

@Component({
  selector: 'app-role-test',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="role-test-container">
      <h2>Role Test Page</h2>
      <div *ngIf="currentUser">
        <p><strong>Current User:</strong> {{ currentUser.Firstname || currentUser.firstname }} {{ currentUser.Lastname || currentUser.lastname }}</p>
        <p><strong>Email:</strong> {{ currentUser.Email || currentUser.email }}</p>
        <p><strong>Role ID:</strong> {{ currentUser.role_id }}</p>
        <p><strong>Status:</strong> {{ currentUser.Status || currentUser.status }}</p>
      </div>
      <div *ngIf="!currentUser">
        <p>No user logged in</p>
      </div>
      
      <div class="test-links">
        <h3>Test Role-Based Access:</h3>
        <a routerLink="/faculty-home" class="test-link">Try Faculty Home (Requires role_id = 3)</a>
        <a routerLink="/admin-dashboard" class="test-link">Try Admin Dashboard (Requires role_id = 4 or 5)</a>
        <a routerLink="/home" class="test-link">Go to Home (Public)</a>
      </div>
    </div>
  `,
  styles: [`
    .role-test-container {
      padding: 20px;
      max-width: 600px;
      margin: 0 auto;
    }
    
    .test-links {
      margin-top: 20px;
    }
    
    .test-link {
      display: block;
      margin: 10px 0;
      padding: 10px;
      background: #f0f0f0;
      text-decoration: none;
      border-radius: 5px;
      color: #333;
    }
    
    .test-link:hover {
      background: #e0e0e0;
    }
  `]
})
export class RoleTestComponent {
  private authService = inject(Auth);
  private router = inject(Router);
  
  currentUser: any = null;
  
  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }
}
