import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AdminSideNav } from '../admin-side-nav/admin-side-nav';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface Faculty {
  user_id: number;
  firstname: string;
  lastname: string;
  email: string;
  faculty_id: string;
  role_id: number;
  role_name: string;
  role_display: string;
  created_at?: string;
}

@Component({
  selector: 'app-admin-faculties',
  standalone: true,
  imports: [
    AdminSideNav,
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './faculties.html',
  styleUrls: ['./faculties.css']
})
export class AdminFaculties implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['name', 'email', 'faculty_id', 'role', 'actions'];
  dataSource = new MatTableDataSource<Faculty>([]);
  
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Dialog state
  isAddDialogOpen = false;
  isEditDialogOpen = false;
  
  // Form data
  newFaculty: Faculty = {
    user_id: 0,
    firstname: '',
    lastname: '',
    email: '',
    faculty_id: '',
    role_id: 0,
    role_name: '',
    role_display: ''
  };
  
  editFaculty: Faculty = {
    user_id: 0,
    firstname: '',
    lastname: '',
    email: '',
    faculty_id: '',
    role_id: 0,
    role_name: '',
    role_display: ''
  };

  constructor(
    private http: HttpClient,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadFaculties();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadFaculties(): void {
    this.http.get<{ success: boolean; data: Faculty[] }>(`${environment.authApiUrl}/admin/faculty/all-roles`)
      .subscribe({
        next: (response) => {
          this.dataSource.data = response.data || [];
        },
        error: (error) => {
          console.error('Error loading faculties:', error);
        }
      });
  }

  openAddDialog(): void {
    this.isAddDialogOpen = true;
  }

  closeAddDialog(): void {
    this.isAddDialogOpen = false;
    this.resetNewFaculty();
  }

  openEditDialog(row: Faculty): void {
    this.editFaculty = { ...row };
    this.isEditDialogOpen = true;
  }

  closeEditDialog(): void {
    this.isEditDialogOpen = false;
    this.resetEditFaculty();
  }

  addFaculty(): void {
    if (!this.isNewFacultyValid()) {
      alert('Please fill in all required fields');
      return;
    }

    this.http.post(`${environment.authApiUrl}/admin/faculty`, {
      firstname: this.newFaculty.firstname,
      lastname: this.newFaculty.lastname,
      email: this.newFaculty.email,
      faculty_id: this.newFaculty.faculty_id
    }).subscribe({
      next: (response: any) => {
        console.log('Faculty created successfully:', response);
        this.loadFaculties();
        alert(`Faculty account created successfully! Email sent to ${this.newFaculty.email}`);
        this.closeAddDialog();
      },
      error: (error) => {
        console.error('Error creating faculty:', error);
        const errorMessage = error.error?.error || 'Failed to create faculty account';
        alert(`Error: ${errorMessage}`);
      }
    });
  }

  updateFaculty(): void {
    if (!this.isEditFacultyValid()) {
      alert('Please fill in all required fields');
      return;
    }

    this.http.put(`${environment.authApiUrl}/admin/faculty/all-roles/${this.editFaculty.user_id}`, {
      firstname: this.editFaculty.firstname,
      lastname: this.editFaculty.lastname,
      email: this.editFaculty.email,
      faculty_id: this.editFaculty.faculty_id
    }).subscribe({
      next: (response: any) => {
        console.log('User updated successfully:', response);
        this.loadFaculties();
        alert('User updated successfully!');
        this.closeEditDialog();
      },
      error: (error) => {
        console.error('Error updating user:', error);
        const errorMessage = error.error?.error || 'Failed to update user';
        alert(`Error: ${errorMessage}`);
      }
    });
  }

  isNewFacultyValid(): boolean {
    return !!this.newFaculty.firstname?.trim() && 
           !!this.newFaculty.lastname?.trim() && 
           !!this.newFaculty.email?.trim() && 
           !!this.newFaculty.faculty_id?.trim();
  }

  isEditFacultyValid(): boolean {
    return !!this.editFaculty.firstname?.trim() && 
           !!this.editFaculty.lastname?.trim() && 
           !!this.editFaculty.email?.trim();
  }

  resetNewFaculty(): void {
    this.newFaculty = {
      user_id: 0,
      firstname: '',
      lastname: '',
      email: '',
      faculty_id: '',
      role_id: 0,
      role_name: '',
      role_display: ''
    };
  }

  resetEditFaculty(): void {
    this.editFaculty = {
      user_id: 0,
      firstname: '',
      lastname: '',
      email: '',
      faculty_id: '',
      role_id: 0,
      role_name: '',
      role_display: ''
    };
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  goBack(): void {
    // This method is referenced in the template but not implemented
    // You can add navigation logic here if needed
    console.log('Go back clicked');
  }
}
