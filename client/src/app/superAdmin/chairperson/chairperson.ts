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


interface Faculty {
  id?: string;              // optional if your JSON has one
  first_name: string;
  last_name: string;
  email: string;
  faculty_number: string;
}

@Component({
  selector: 'app-chairperson',
  imports: [
    SuperAdminNavBar, CommonModule, RouterModule, HttpClientModule,
    MatSidenavModule, MatToolbarModule, MatButtonModule, MatIconModule,
    MatTableModule, MatFormFieldModule, MatSelectModule, MatOptionModule,
    MatPaginatorModule, MatSortModule, MatInputModule,
    MatDialogModule, FormsModule, RouterModule
  ],
  templateUrl: './chairperson.html',
  styleUrl: './chairperson.css'
})
export class Chairperson implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['name', 'email', 'faculty_number', 'actions'];
  dataSource = new MatTableDataSource<Faculty>([]);

  newFaculty: Faculty = { first_name: '', last_name: '', email: '', faculty_number: '' };
  editFaculty: Faculty = { first_name: '', last_name: '', email: '', faculty_number: '' };

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Dialog templates
  @ViewChild('addFacultyDialog') addFacultyDialogTpl!: TemplateRef<any>;
  @ViewChild('editFacultyDialog') editFacultyDialogTpl!: TemplateRef<any>;

  constructor(
    private http: HttpClient, 
    private dialog: MatDialog, 
    private router: Router,) {}

  ngOnInit(): void {
    // Load initial data from assets/facultysample.json
    // Expected JSON shape: Faculty[]
    this.http.get<Faculty[]>('facultysample.json').subscribe({
      next: (rows) => {
        this.dataSource.data = rows ?? [];
      },
      error: (err) => {
        console.error('Failed to load faculties:', err);
        this.dataSource.data = []; // fallback
      }
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  goBack(): void {
    this.router.navigate(['/dashboard'])
  }

  /** ---------- Add ---------- */
  openAddDialog(): void {
    // reset the model
    this.newFaculty = { first_name: '', last_name: '', email: '', faculty_number: '' };

    const ref = this.dialog.open(this.addFacultyDialogTpl, {
      width: '560px',
      autoFocus: false,
      panelClass: 'add-group-dialog'
    });

    ref.afterClosed().subscribe((result?: Faculty) => {
      if (result && result.first_name && result.last_name && result.email && result.faculty_number) {
        // Add to the table (front-end only)
        const copy = [...this.dataSource.data, { ...result }];
        this.dataSource.data = copy;
      }
    });
  }

  /** ---------- Edit ---------- */
  openEditDialog(row: Faculty): void {
    // make a copy so cancel won't mutate the row
    this.editFaculty = { ...row };

    const ref = this.dialog.open(this.editFacultyDialogTpl, {
      width: '560px',
      autoFocus: false,
      panelClass: 'add-group-dialog'
    });

    ref.afterClosed().subscribe((updated?: Faculty) => {
      if (!updated) return;
      const idx = this.dataSource.data.findIndex(
        r => (r.id ?? `${r.first_name}|${r.last_name}|${r.email}|${r.faculty_number}`)
           === (row.id ?? `${row.first_name}|${row.last_name}|${row.email}|${row.faculty_number}`)
      );
      if (idx > -1) {
        const copy = [...this.dataSource.data];
        copy[idx] = { ...copy[idx], ...updated };
        this.dataSource.data = copy;
      }
    });
  }

  /** Optional: simple client-side filter hook if you add a search box later */
  applyFilter(value: string) {
    this.dataSource.filter = value.trim().toLowerCase();
  }
}