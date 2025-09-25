import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

/* Angular Material (standalone) */
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';

import { AdminSideBar } from '../admin-side-bar/admin-side-bar';

interface RequestItem {
  requestor_name: string;
  date: string;             // "YYYY-MM-DD"
  time: string;             // "HH:mm"
  selected_chapter: string; // "1" | "2" | "3" | "4" | "5" | "all"
  purpose: string;
  email: string;
  verified?: boolean;       // UI-only
}
@Component({
  selector: 'app-admin-request',
  imports: [AdminSideBar, CommonModule, RouterModule, HttpClientModule,
    MatSidenavModule, MatToolbarModule, MatButtonModule, MatIconModule,
    MatTableModule, MatPaginatorModule, MatSortModule, MatInputModule],
  templateUrl: './admin-request.html',
  styleUrl: './admin-request.css'
})
export class AdminRequest implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['requestor', 'time', 'chapters', 'purpose', 'actions'];
  dataSource = new MatTableDataSource<RequestItem>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // Place request_samples.json under /assets/ (or adjust path if different)
    this.http.get<RequestItem[]>('requestsample.json').subscribe({
      next: rows => { this.dataSource.data = rows ?? []; },
      error: err => {
        console.error('Failed to load request samples:', err);
        this.dataSource.data = [];
      }
    });

    // Optional: custom filter to search across multiple fields if you later add a search box
    this.dataSource.filterPredicate = (data: RequestItem, filter: string) => {
      const value = (data.requestor_name + ' ' + data.purpose + ' ' + data.selected_chapter + ' ' + data.date + ' ' + data.time).toLowerCase();
      return value.includes(filter);
    };
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  goBack(): void {
    this.router.navigate(['/admin-dashboard']);
  }

  formatChapters(sel: string): string {
    if (!sel) return '';
    return sel === 'all' ? 'All Chapters' : `Chapter ${sel}`;
  }

  verify(row: RequestItem): void {
    // Front-end only: mark as verified and (optionally) send to API here
    row.verified = true;
    // Example: console.log or call a service to persist verification
    console.log('Verified request from:', row.requestor_name, row.date, row.time);
  }

  /** Optional: hook if you add a search box */
  applyFilter(value: string) {
    this.dataSource.filter = value.trim().toLowerCase();
  }
}
