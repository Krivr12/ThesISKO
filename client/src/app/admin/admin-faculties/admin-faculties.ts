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

import { AdminSideBar } from '../admin-side-bar/admin-side-bar';




interface Faculty {
  user_id?: string;
  firstname: string;
  lastname: string;
  email: string;
  faculty_id: string;
  status?: string;
  created_at?: string;
}

@Component({
  selector: 'app-admin-faculties',
  imports: [ AdminSideBar, CommonModule, RouterModule, HttpClientModule,
    MatSidenavModule, MatToolbarModule, MatButtonModule, MatIconModule,
    MatTableModule, MatFormFieldModule, MatSelectModule, MatOptionModule,
    MatPaginatorModule, MatSortModule, MatInputModule,
    MatDialogModule, FormsModule, RouterModule],
  templateUrl: './admin-faculties.html',
  styleUrl: './admin-faculties.css'
})
export class AdminFaculties implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['name', 'email', 'faculty_id', 'status', 'actions'];
  dataSource = new MatTableDataSource<Faculty>([]);

  newFaculty: Faculty = { firstname: '', lastname: '', email: '', faculty_id: '' };
  editFaculty: Faculty = { firstname: '', lastname: '', email: '', faculty_id: '' };

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
    // Load faculty data from database
    this.loadFaculties();
  }

  loadFaculties(): void {
    this.http.get<Faculty[]>('http://localhost:5050/admin/faculty').subscribe({
      next: (faculties) => {
        this.dataSource.data = faculties ?? [];
        console.log('Loaded faculties from database:', faculties);
      },
      error: (err) => {
        console.error('Failed to load faculties from database:', err);
        this.dataSource.data = []; // fallback
      }
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  goBack(): void {
    this.router.navigate(['/admin-dashboard'])
  }

  /** ---------- Add ---------- */
  openAddDialog(): void {
    // reset the model
    this.newFaculty = { firstname: '', lastname: '', email: '', faculty_id: '' };

    const ref = this.dialog.open(this.addFacultyDialogTpl, {
      width: '560px',
      autoFocus: false,
      panelClass: 'add-group-dialog'
    });

    ref.afterClosed().subscribe((result?: Faculty) => {
      if (result && result.firstname && result.lastname && result.email && result.faculty_id) {
        // Call API to create faculty account
        this.createFaculty(result);
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
        r => (r.user_id ?? `${r.firstname}|${r.lastname}|${r.email}|${r.faculty_id}`)
           === (row.user_id ?? `${row.firstname}|${row.lastname}|${row.email}|${row.faculty_id}`)
      );
      if (idx > -1) {
        const copy = [...this.dataSource.data];
        copy[idx] = { ...copy[idx], ...updated };
        this.dataSource.data = copy;
      }
    });
  }

  /** ---------- Create Faculty ---------- */
  createFaculty(faculty: Faculty): void {
    this.http.post('http://localhost:5050/admin/faculty', {
      firstname: faculty.firstname,
      lastname: faculty.lastname,
      email: faculty.email,
      faculty_id: faculty.faculty_id
    }).subscribe({
      next: (response: any) => {
        console.log('Faculty created successfully:', response);
        // Reload the faculty list to show the new faculty
        this.loadFaculties();
        // Show success message (you can add a snackbar or toast here)
        alert(`Faculty account created successfully! Email sent to ${faculty.email}`);
      },
      error: (error) => {
        console.error('Error creating faculty:', error);
        // Show error message
        const errorMessage = error.error?.error || 'Failed to create faculty account';
        alert(`Error: ${errorMessage}`);
      }
    });
  }

  /** Optional: simple client-side filter hook if you add a search box later */
  applyFilter(value: string) {
    this.dataSource.filter = value.trim().toLowerCase();
  }
}