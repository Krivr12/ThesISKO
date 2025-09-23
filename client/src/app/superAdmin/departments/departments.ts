import { Component, OnInit, ViewChild, AfterViewInit, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

/* Angular Material (standalone) */
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
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { Location } from '@angular/common';

import { SuperAdminNavBar } from "../super-admin-nav-bar/super-admin-nav-bar";

/* ===== Types ===== */
type GroupRaw = {
  group_id?: string;
  department?: string;     // e.g. "CCIS"
  college?: string;        // e.g. "College of ..."
  totalDocuments?: number; // numeric counter variant
  documentsCount?: number; // numeric counter variant
  documents?: unknown[];   // array variant
  files?: unknown[];       // array variant
  // …any other fields present in your groups.json
};

type DeptRow = {
  department: string;
  college: string;
  totalDocuments: number;
};

@Component({
  selector: 'app-departments',
  standalone: true,
  imports: [
    SuperAdminNavBar, CommonModule, RouterModule, HttpClientModule,
    MatSidenavModule, MatToolbarModule, MatButtonModule, MatIconModule,
    MatTableModule, MatFormFieldModule, MatSelectModule, MatOptionModule,
    MatPaginatorModule, MatSortModule, MatInputModule,
    MatDialogModule, FormsModule
  ],
  templateUrl: './departments.html',
  styleUrls: ['./departments.css']
})
export class Departments implements OnInit, AfterViewInit {

  constructor(
    private dialog: MatDialog,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location
  ) {}

  /* ===== Dialog ===== */
  @ViewChild('addGroupDialog') addGroupDialog!: TemplateRef<any>;
  newGroup = { program: '', programCode: '', department: '', chairperson: '' };

  /* ===== Table / Sorting / Pagination ===== */
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  dataSource = new MatTableDataSource<DeptRow>([]);
  /** Must match your HTML's *matHeaderRowDef / *matRowDef */
  deptColumns: (keyof DeptRow)[] = ['department', 'college', 'totalDocuments'];

  ngOnInit(): void {
    this.loadDepartmentsFromGroups();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  /* ===== Data loading / aggregation ===== */
  private loadDepartmentsFromGroups(): void {
    this.http.get<GroupRaw[]>('groups.json').subscribe(all => {
      // Aggregate per (department, college)
      const map = new Map<string, DeptRow>();

      for (const g of all) {
        const dept = (g.department ?? '—').trim();
        const coll = (g.college ?? '—').trim();
        const key = `${dept}||${coll}`;

        // Count documents robustly across possible shapes
        const count = this.countDocs(g);

        if (!map.has(key)) {
          map.set(key, { department: dept, college: coll, totalDocuments: 0 });
        }
        map.get(key)!.totalDocuments += count;
      }

      // Turn map -> array and sort by department
      const rows = Array.from(map.values()).sort((a, b) =>
        a.department.localeCompare(b.department)
      );

      this.dataSource.data = rows;

      // If paginator/sort are already available, reattach (useful if data arrives after AfterViewInit)
      if (this.paginator) this.dataSource.paginator = this.paginator;
      if (this.sort) this.dataSource.sort = this.sort;
    });
  }

  /** Robust document counter for a single group record */
  private countDocs(g: GroupRaw): number {
    // Prefer explicit numeric fields when present
    if (typeof g.totalDocuments === 'number') return g.totalDocuments;
    if (typeof g.documentsCount === 'number') return g.documentsCount;

    // Then fall back to array lengths
    const docsLen = Array.isArray(g.documents) ? g.documents.length : 0;
    const filesLen = Array.isArray(g.files) ? g.files.length : 0;

    // Use whichever is larger (in case both exist but differ)
    const arrCount = Math.max(docsLen, filesLen);

    // If nothing is present, assume 0 for this group
    return arrCount;
  }

  /* ===== Dialog handling ===== */
  openAddDialog(): void {
    this.newGroup = { program: '', programCode: '', department: '', chairperson: '' };
    const ref = this.dialog.open(this.addGroupDialog, {
      panelClass: 'add-group-dialog',
      width: '720px',
      autoFocus: false
    });
    ref.afterClosed().subscribe(result => {
      if (result) {
        // Implement your create logic here if needed
        // For now this dialog only handles the "Add Department" UX.
      }
    });
  }

  /* ===== Navigation ===== */
  goBack(): void {
    this.router.navigate(['/dashboard'])
  }
}
