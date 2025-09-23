import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';

import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { SuperAdminNavBar } from '../super-admin-nav-bar/super-admin-nav-bar';

/** Match backend keys for easy wiring */
export interface Row {
  group_id: string;
  title: string;
  submitted_at: string | Date;
}

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [
    CommonModule, HttpClientModule, RouterModule,
    MatSidenavModule, MatTableModule, MatPaginatorModule,
    MatButtonModule, MatIconModule,
    SuperAdminNavBar
  ],
  templateUrl: './documents.html',
  styleUrls: ['./documents.css']
})
export class Documents implements OnInit, AfterViewInit {
  displayedColumns = ['title', 'submissionDate', 'group_id', 'forApproval'];
  dataSource = new MatTableDataSource<Row>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    // If your backend returns { groups: Row[] }, adjust to .groups
    this.http.get<Row[] | { groups: Row[] }>('/groups.json').subscribe((res) => {
      const rows = Array.isArray(res) ? res : (res?.groups ?? []);
      this.dataSource.data = rows;
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  goToApproval(id: string) {
    this.router.navigate(['/documents-verify', id]);
  }

  goBack() {
    this.router.navigate(['/faculty-home']);
  }
}
