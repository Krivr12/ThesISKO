import { Component} from '@angular/core';

import { AdminSideBar } from '../admin-side-bar/admin-side-bar';


@Component({
  selector: 'app-admin-dashboard',
  imports: [AdminSideBar],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboard {}