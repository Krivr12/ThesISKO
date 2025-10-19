import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminSideNav } from '../admin-side-nav/admin-side-nav';

@Component({
  selector: 'app-admin-programs',
  standalone: true,
  imports: [CommonModule, AdminSideNav],
  template: `
    <div class="dashboard-layout">
      <app-admin-side-nav></app-admin-side-nav>
      <div class="programs-content">
        <h2>Programs Management</h2>
        <p>Programs page - To be implemented (or wrap existing superAdmin programs)</p>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-layout { display: flex; height: 100vh; }
    .programs-content { flex: 1; margin-left: 200px; padding: 2rem; overflow-y: auto; background-color: #f9f9f9; }
    @media (max-width: 768px) { .programs-content { margin-left: 0; } }
  `]
})
export class AdminPrograms {}

