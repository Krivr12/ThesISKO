import { Component, OnInit, ViewChild, AfterViewInit, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../environments/environment';

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

import { AdminSideBar } from '../admin-side-bar/admin-side-bar';

export interface BlockRow {
  block_id: string;
  academic_year?: string;
  program_id?: string;
  block_code?: string;
  faculty_in_charge: string;
  faculty_in_charge_email: string;
  panelists: string[];
  panelists_email: string[];
  panelistCount?: number;  // Computed field for display
}

interface NewBlockForm {
  academic_year: string;              // "2425"
  program_id: string;                 // "IT"
  block_code: string;                 // "3A"
  faculty_in_charge_email: string;    // Selected faculty email
  panelists_email: string[];          // Array of selected panelist emails
}

interface Faculty {
  user_id: string;
  email: string;
  firstname: string;
  lastname: string;
  faculty_id: string;
  role_id: number;
}

interface SelectedPanelist {
  email: string;
  name: string;
}

@Component({
  selector: 'app-admin-block',
  standalone: true,
  imports: [
    AdminSideBar, CommonModule, RouterModule, HttpClientModule, FormsModule,
    MatSidenavModule, MatToolbarModule, MatButtonModule, MatIconModule,
    MatTableModule, MatFormFieldModule, MatSelectModule, MatOptionModule,
    MatPaginatorModule, MatSortModule, MatInputModule, MatDialogModule
  ],
  templateUrl: './admin-block.html',
  styleUrl: './admin-block.css'
})
export class AdminBlock implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['block_id', 'faculty_in_charge', 'panelist_count', 'actions'];
  dataSource = new MatTableDataSource<BlockRow>([]);

  // Faculty data
  availableFaculty: Faculty[] = [];
  
  // Add dialog form model
  newForm: NewBlockForm = { 
    academic_year: '', 
    program_id: '', 
    block_code: '', 
    faculty_in_charge_email: '',
    panelists_email: []
  };

  // Panelist selection
  selectedPanelistEmail: string = '';
  selectedPanelists: SelectedPanelist[] = [];

  // Edit dialog row model
  editRow: BlockRow = { 
    block_id: '', 
    faculty_in_charge: '',
    faculty_in_charge_email: '',
    panelists: [],
    panelists_email: []
  };
  editSelectedPanelists: SelectedPanelist[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Dialog templates
  @ViewChild('addFacultyDialog') addFacultyDialogTpl!: TemplateRef<any>;
  @ViewChild('editFacultyDialog') editFacultyDialogTpl!: TemplateRef<any>;

  constructor(
    private http: HttpClient,
    private dialog: MatDialog,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadBlocks();
    this.loadAvailableFaculty();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  goBack(): void {
    this.router.navigate(['/admin-dashboard']);
  }

  /** Load blocks from API */
  loadBlocks(): void {
    this.http.get<BlockRow[]>(`${environment.authApiUrl}/blocks`).subscribe({
      next: (blocks) => {
        // Add computed panelistCount field
        const processedBlocks = blocks.map(block => ({
          ...block,
          panelists: block.panelists || [],
          panelists_email: block.panelists_email || [],
          panelistCount: (block.panelists_email || []).length
        }));
        this.dataSource.data = processedBlocks;
      },
      error: (err) => {
        
        alert('Failed to load blocks from server');
        this.dataSource.data = [];
      }
    });
  }

  /** Load available faculty from API */
  loadAvailableFaculty(): void {
    this.http.get<{ success: boolean; data: Faculty[] }>(`${environment.authApiUrl}/admin/faculty/blocks`).subscribe({
      next: (response) => {
        this.availableFaculty = response.data || [];
      },
      error: (err) => {
        
        alert('Failed to load faculty list');
      }
    });
  }

  /** Get display name for faculty dropdown */
  getFacultyDisplayName(faculty: Faculty): string {
    return `${faculty.lastname}, ${faculty.firstname} (${faculty.email})`;
  }

  /** Get faculty name by email */
  getFacultyNameByEmail(email: string): string {
    const faculty = this.availableFaculty.find(f => f.email === email);
    if (faculty) {
      return `${faculty.lastname}, ${faculty.firstname}`;
    }
    return email; // Fallback to email if faculty not found
  }

  /** Get available faculty for panelists (exclude faculty in charge) */
  getAvailablePanelistsForAdd(): Faculty[] {
    return this.availableFaculty.filter(f => 
      f.email !== this.newForm.faculty_in_charge_email && 
      !this.selectedPanelists.some(p => p.email === f.email)
    );
  }

  /** Get available faculty for panelists in edit mode */
  getAvailablePanelistsForEdit(): Faculty[] {
    return this.availableFaculty.filter(f => 
      f.email !== this.editRow.faculty_in_charge_email && 
      !this.editSelectedPanelists.some(p => p.email === f.email)
    );
  }

  /** ---------------- Panelist Management (Add Mode) ---------------- */
  addPanelist(): void {
    if (!this.selectedPanelistEmail) return;
    
    const faculty = this.availableFaculty.find(f => f.email === this.selectedPanelistEmail);
    if (!faculty) return;
    
    // Check if already added
    if (this.selectedPanelists.some(p => p.email === faculty.email)) {
      alert('This panelist has already been added');
      return;
    }
    
    // Check if it's the faculty in charge
    if (faculty.email === this.newForm.faculty_in_charge_email) {
      alert('Faculty in Charge cannot also be a panelist');
      return;
    }
    
    this.selectedPanelists.push({
      email: faculty.email,
      name: this.getFacultyDisplayName(faculty)
    });
    
    this.selectedPanelistEmail = '';
  }

  removePanelist(email: string): void {
    this.selectedPanelists = this.selectedPanelists.filter(p => p.email !== email);
  }

  /** ---------------- Panelist Management (Edit Mode) ---------------- */
  addEditPanelist(): void {
    if (!this.selectedPanelistEmail) return;
    
    const faculty = this.availableFaculty.find(f => f.email === this.selectedPanelistEmail);
    if (!faculty) return;
    
    // Check if already added
    if (this.editSelectedPanelists.some(p => p.email === faculty.email)) {
      alert('This panelist has already been added');
      return;
    }
    
    // Check if it's the faculty in charge
    if (faculty.email === this.editRow.faculty_in_charge_email) {
      alert('Faculty in Charge cannot also be a panelist');
      return;
    }
    
    this.editSelectedPanelists.push({
      email: faculty.email,
      name: this.getFacultyDisplayName(faculty)
    });
    
    this.selectedPanelistEmail = '';
  }

  removeEditPanelist(email: string): void {
    this.editSelectedPanelists = this.editSelectedPanelists.filter(p => p.email !== email);
  }

  /** ---------------- Add ---------------- */
  openAddDialog(): void {
    this.newForm = { 
      academic_year: '', 
      program_id: '', 
      block_code: '', 
      faculty_in_charge_email: '',
      panelists_email: []
    };
    this.selectedPanelists = [];
    this.selectedPanelistEmail = '';

    const ref = this.dialog.open(this.addFacultyDialogTpl, {
      width: '90vw',
      maxWidth: '700px',
      autoFocus: false,
      panelClass: 'add-group-dialog'
    });

    ref.afterClosed().subscribe();
  }

  confirmAdd(dialogRef: any) {
    // Form-level guard
    if (!this.newForm.academic_year || !this.newForm.program_id || !this.newForm.block_code) {
      alert('Please fill in all required fields');
      return;
    }

    // Get faculty name for storage
    const faculty = this.availableFaculty.find(f => f.email === this.newForm.faculty_in_charge_email);
    const faculty_in_charge = faculty ? `${faculty.lastname}, ${faculty.firstname}` : '';

    // Prepare panelists arrays
    const panelists = this.selectedPanelists.map(p => {
      const f = this.availableFaculty.find(fac => fac.email === p.email);
      return f ? `${f.lastname}, ${f.firstname}` : p.name;
    });
    const panelists_email = this.selectedPanelists.map(p => p.email);

    const payload = {
      academic_year: this.newForm.academic_year,
      program_id: this.newForm.program_id.toUpperCase(),
      block_code: this.newForm.block_code.toUpperCase(),
      faculty_in_charge,
      faculty_in_charge_email: this.newForm.faculty_in_charge_email,
      panelists,
      panelists_email
    };

    this.http.post(`${environment.authApiUrl}/blocks`, payload).subscribe({
      next: (response: any) => {
        alert('Block created successfully!');
        this.loadBlocks(); // Reload the table
        dialogRef.close();
      },
      error: (err) => {
        
        const errorMessage = err.error?.error || 'Failed to create block';
        alert(`Error: ${errorMessage}`);
      }
    });
  }

  /** ---------------- Edit ---------------- */
  openEditDialog(row: BlockRow): void {
    this.editRow = { ...row };
    
    // Initialize edit panelists list from row data
    this.editSelectedPanelists = [];
    if (row.panelists_email && row.panelists) {
      for (let i = 0; i < row.panelists_email.length; i++) {
        this.editSelectedPanelists.push({
          email: row.panelists_email[i],
          name: row.panelists[i] || row.panelists_email[i]
        });
      }
    }
    this.selectedPanelistEmail = '';

    const ref = this.dialog.open(this.editFacultyDialogTpl, {
      width: '90vw',
      maxWidth: '700px',
      autoFocus: false,
      panelClass: 'add-group-dialog'
    });

    ref.afterClosed().subscribe();
  }

  confirmEdit(dialogRef: any): void {
    if (!this.editRow.block_id) return;

    // Get faculty name for storage
    const faculty = this.availableFaculty.find(f => f.email === this.editRow.faculty_in_charge_email);
    const faculty_in_charge = faculty ? `${faculty.lastname}, ${faculty.firstname}` : this.editRow.faculty_in_charge;

    // Prepare panelists arrays
    const panelists = this.editSelectedPanelists.map(p => {
      const f = this.availableFaculty.find(fac => fac.email === p.email);
      return f ? `${f.lastname}, ${f.firstname}` : p.name;
    });
    const panelists_email = this.editSelectedPanelists.map(p => p.email);

    const payload = {
      faculty_in_charge,
      faculty_in_charge_email: this.editRow.faculty_in_charge_email,
      panelists,
      panelists_email
    };

    this.http.put(`${environment.authApiUrl}/blocks/${this.editRow.block_id}`, payload).subscribe({
      next: (response: any) => {
        alert('Block updated successfully!');
        this.loadBlocks(); // Reload the table
        dialogRef.close();
      },
      error: (err) => {
        
        const errorMessage = err.error?.error || 'Failed to update block';
        alert(`Error: ${errorMessage}`);
      }
    });
  }

  /** ---------------- Delete ---------------- */
  deleteBlock(block_id: string): void {
    if (!confirm(`Are you sure you want to delete block "${block_id}"?`)) {
      return;
    }

    this.http.delete(`${environment.authApiUrl}/blocks/${block_id}`).subscribe({
      next: (response: any) => {
        alert('Block deleted successfully!');
        this.loadBlocks(); // Reload the table
      },
      error: (err) => {
        
        const errorMessage = err.error?.error || 'Failed to delete block';
        alert(`Error: ${errorMessage}`);
      }
    });
  }

  /** Optional: simple client-side filter hook if you add a search box later */
  applyFilter(value: string) {
    this.dataSource.filter = value.trim().toLowerCase();
  }
}
