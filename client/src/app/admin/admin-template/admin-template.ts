import { Component } from '@angular/core';
import { AdminSideBar } from '../admin-side-bar/admin-side-bar';

@Component({
  selector: 'app-admin-template',
  imports: [AdminSideBar],
  templateUrl: './admin-template.html',
  styleUrl: './admin-template.css'
})
export class AdminTemplate {

}
