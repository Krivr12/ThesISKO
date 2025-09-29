import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

/* Angular Material */
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';

import { Sidenavbar } from '../sidenavbar/sidenavbar';

interface Group {
  group_id: string;
  block_id: string;       // e.g., 2425-IT-3B
  course: string;         // BSIT | BSCS
  title: string;
  abstract: string;
  submitted_at: string;   // date string
  leader: string;
  members: string[];
  leader_email: string;
  member_emails: string[];
  status: string;         // approved | ongoing | rejected | pending | for approval | pending approval
  panelist: string;
  facultyid: string;
}

type Stats = {
  total: number;
  approved: number;
  rejected: number;
  ongoing: number;
  pendingToCheck: number;
  approvedPercent: number;
  rejectedPercent: number;
  ongoingPercent: number;
  byStatus: Record<string, number>;
};

@Component({
  selector: 'app-for-panellanding',
  imports: [
    CommonModule, RouterModule, HttpClientModule,
    MatSidenavModule, MatToolbarModule, MatButtonModule, MatIconModule,
    MatTableModule, MatFormFieldModule, MatSelectModule, MatOptionModule,
    MatPaginatorModule, MatSortModule, MatInputModule, Sidenavbar
  ],
  templateUrl: './for-panellanding.html',
  styleUrl: './for-panellanding.css'
})
export class ForPanellanding implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['group_id', 'title', 'leader', 'status'];

  dataSource = new MatTableDataSource<Group>([]);
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  public stats: Stats = {
    total: 0, approved: 0, rejected: 0, ongoing: 0, pendingToCheck: 0,
    approvedPercent: 0, rejectedPercent: 0, ongoingPercent: 0, byStatus: {},
  };
  public pendingList: Group[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    // Put groups.json in src/assets/ (or move public/ to project root and use '/groups.json')
    this.http.get<Group[]>('groups.json').subscribe({
      next: (rows) => {
        // Minimal normalize
        const normalized: Group[] = (rows || []).map((r) => ({
          ...r,
          group_id: String(r.group_id ?? ''),
          block_id: String(r.block_id ?? ''),
          title: String(r.title ?? ''),
          leader: String(r.leader ?? ''),
          status: String(r.status ?? '').toLowerCase(),
          submitted_at: String(r.submitted_at ?? ''),
        }));
        this.dataSource.data = normalized;

        // Filter across fields
        this.dataSource.filterPredicate = (d: Group, f: string) => {
          const v = (f || '').toLowerCase().trim();
          return (
            d.group_id.toLowerCase().includes(v) ||
            d.title.toLowerCase().includes(v) ||
            d.leader.toLowerCase().includes(v) ||
            d.status.toLowerCase().includes(v)
          );
        };

        // Sort strings case-insensitively
        this.dataSource.sortingDataAccessor = (d: Group, col: string) =>
          (d as any)[col]?.toString().toLowerCase() ?? '';

        this.recalcStats(); // initial stats
      },
      error: (err) => console.error('Could not load assets/groups.json', err),
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  applyFilter(value: string): void {
    this.dataSource.filter = (value || '').trim().toLowerCase();
    this.paginator?.firstPage();
    this.recalcStats();
  }

  viewGroup(element: Group) {
    console.log('Viewing group:', element);
    // this.router.navigate(['/history', element.group_id]);
  }

  /* === stats + pending === */
  private recalcStats(): void {
    const rows = this.dataSource.filteredData?.length
      ? this.dataSource.filteredData
      : this.dataSource.data;

    const byStatus: Record<string, number> = {};
    const norm = (s: string) => (s || '').trim().toLowerCase();

    for (const r of rows) {
      const key = norm(r.status);
      byStatus[key] = (byStatus[key] || 0) + 1;
    }

    const total = rows.length;
    const approved = byStatus['approved'] || 0;
    const rejected = byStatus['rejected'] || 0;
    const ongoing = byStatus['ongoing'] || 0;

    const pendingSet = new Set(['pending', 'pending approval', 'for approval']);
    const pendingList = rows
      .filter((r) => pendingSet.has(norm(r.status)))
      .sort((a, b) => this.parseDate(a.submitted_at) - this.parseDate(b.submitted_at));

    const pct = (n: number, t: number) => (t ? Math.round((n * 1000) / t) / 10 : 0);

    this.stats = {
      total,
      approved,
      rejected,
      ongoing,
      pendingToCheck: pendingList.length,
      approvedPercent: pct(approved, total),
      rejectedPercent: pct(rejected, total),
      ongoingPercent: pct(ongoing, total),
      byStatus,
    };

    this.pendingList = pendingList;
  }

  private parseDate(d: string): number {
    const t = Date.parse(d);
    return Number.isNaN(t) ? 0 : t;
  }
}