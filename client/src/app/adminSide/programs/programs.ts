import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { AdminSideNav } from '../admin-side-nav/admin-side-nav';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface Program {
  _id?: string;
  program_id: string;        // Display and primary key (e.g., "BSIT")
  department_id: string;     // e.g., "CCIS"
  department_name: string;   // e.g., "College of Computer and Information Sciences"
  program_name: string;      // e.g., "Bachelor of Science in Information Technology"
  chairperson_email: string; // Email of the chairperson
  created_at?: string;
  edited_at?: string;
}

interface Faculty {
  email: string;
  firstname: string;
  lastname: string;
  faculty_id: string;
}

@Component({
  selector: 'app-admin-programs',
  standalone: true,
  imports: [CommonModule, FormsModule, MatPaginatorModule, AdminSideNav],
  templateUrl: './programs.html',
  styleUrls: ['./programs.css']
})
export class AdminPrograms implements OnInit {
  
  private apiUrl = `${environment.authApiUrl}/programs`;
  
  // Component state
  isAddProgramModalVisible = false;
  isEditProgramModalVisible = false;
  currentDepartment: string = 'CCIS';
  
  // Sorting and paginator
  sortColumn: keyof Program | null = 'program_name';
  sortDirection: 'asc' | 'desc' = 'asc';
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;
  pages: (number | string)[] = [];
  
  // New program form
  newProgram: Program = {
    program_id: '',
    department_id: '',
    department_name: '',
    program_name: '',
    chairperson_email: ''
  };
  
  // Edit program form
  editingProgram: Program = {
    program_id: '',
    department_id: '',
    department_name: '',
    program_name: '',
    chairperson_email: ''
  };
  originalChairpersonEmail: string = '';
  
  // Data
  programs: Program[] = [];
  availableFaculty: Faculty[] = [];
  filteredPrograms: Program[] = [];
  isLoading = false;
  errorMessage = '';

  constructor(private http: HttpClient) {}
  
  ngOnInit(): void {
    this.loadPrograms();
    this.loadAvailableFaculty();
  }

  // API Calls
  loadPrograms(): void {
    this.isLoading = true;
    this.http.get<{ success: boolean; data: Program[] }>(this.apiUrl)
      .subscribe({
        next: (response) => {
          this.programs = response.data || [];
          this.filterAndSortPrograms();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error loading programs:', err);
          this.errorMessage = 'Failed to load programs';
          this.isLoading = false;
        }
      });
  }

  loadAvailableFaculty(): void {
    this.http.get<{ success: boolean; data: Faculty[] }>(`${this.apiUrl}/faculty/available`)
      .subscribe({
        next: (response) => {
          this.availableFaculty = response.data || [];
        },
        error: (err) => {
          console.error('Error loading faculty:', err);
          this.errorMessage = 'Failed to load available faculty';
        }
      });
  }

  getFacultyDisplayName(faculty: Faculty): string {
    return `${faculty.lastname}, ${faculty.firstname} (${faculty.email})`;
  }

  onPage(evt: PageEvent): void {
    this.itemsPerPage = evt.pageSize;
    this.currentPage = evt.pageIndex + 1; // PageEvent is 0-based
    this.updatePages();
  }
  
  // Filter by department
  setDepartmentFilter(department: string): void {
    this.currentDepartment = department;
    this.currentPage = 1;
    this.filterAndSortPrograms();
  }
  
  // Get available departments for filter buttons
  get availableDepartments(): string[] {
    return ['CCIS', 'all'];
    // For future use when adding other colleges:
    // return ['CCIS', 'COC', 'CE', 'all'];
  }
  
  // Sorting
  onSort(column: keyof Program): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.filterAndSortPrograms();
  }
  
  filterAndSortPrograms(): void {
    // Filter
    if (this.currentDepartment === 'all') {
      this.filteredPrograms = [...this.programs];
    } else {
      this.filteredPrograms = this.programs.filter(prog => prog.department_id === this.currentDepartment);
    }
    
    // Sort
    if (this.sortColumn) {
      this.filteredPrograms.sort((a, b) => {
        const aValue = a[this.sortColumn!];
        const bValue = b[this.sortColumn!];
        
        // Handle undefined values
        if (aValue === undefined && bValue === undefined) return 0;
        if (aValue === undefined) return this.sortDirection === 'asc' ? 1 : -1;
        if (bValue === undefined) return this.sortDirection === 'asc' ? -1 : 1;
        
        if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    // Pagination
    this.totalPages = Math.ceil(this.filteredPrograms.length / this.itemsPerPage);
    this.updatePages();
  }
  
  // Paginator
  get paginatedPrograms(): Program[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredPrograms.slice(startIndex, startIndex + this.itemsPerPage);
  }
  
  goToPage(page: number | string): void {
    if (typeof page === 'number' && page > 0 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePages();
    }
  }
  
  updatePages(): void {
    const maxPagesToShow = 5;
    const pages: (number | string)[] = [];
    
    if (this.totalPages <= maxPagesToShow + 2) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (this.currentPage > 3) {
        pages.push('...');
      }
      
      let start = Math.max(2, this.currentPage - 1);
      let end = Math.min(this.totalPages - 1, this.currentPage + 1);
      
      if (this.currentPage <= 3) {
        end = 4;
      }
      if (this.currentPage >= this.totalPages - 2) {
        start = this.totalPages - 3;
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (this.currentPage < this.totalPages - 2) {
        pages.push('...');
      }
      pages.push(this.totalPages);
    }
    this.pages = pages;
  }
  
  // Modal methods
  openAddProgramModal(): void {
    this.isAddProgramModalVisible = true;
  }
  
  closeAddProgramModal(): void {
    this.isAddProgramModalVisible = false;
    this.resetForm();
  }
  
  addProgram(): void {
    if (!this.isFormValid()) {
      alert('Please fill in all required fields');
      return;
    }

    this.isLoading = true;
    this.http.post<{ success: boolean; message: string; data: any }>(this.apiUrl, this.newProgram)
      .subscribe({
        next: (response) => {
          console.log('✅ Program created:', response);
          alert('Program created successfully!');
          this.loadPrograms(); // Reload programs
          this.loadAvailableFaculty(); // Reload faculty (to update dropdown)
          this.closeAddProgramModal();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('❌ Error creating program:', err);
          const errorMsg = err.error?.message || 'Failed to create program';
          alert(`Error: ${errorMsg}`);
          this.isLoading = false;
        }
      });
  }
  
  isFormValid(): boolean {
    return !!this.newProgram.program_id?.trim() && 
           !!this.newProgram.department_id?.trim() && 
           !!this.newProgram.department_name?.trim() && 
           !!this.newProgram.program_name?.trim() && 
           !!this.newProgram.chairperson_email?.trim();
  }
  
  resetForm(): void {
    this.newProgram = {
      program_id: '',
      department_id: '',
      department_name: '',
      program_name: '',
      chairperson_email: ''
    };
  }

  // Edit Program Methods
  openEditProgramModal(program: Program): void {
    this.editingProgram = { ...program }; // Create a copy
    this.originalChairpersonEmail = program.chairperson_email;
    this.isEditProgramModalVisible = true;
  }

  closeEditProgramModal(): void {
    this.isEditProgramModalVisible = false;
    this.editingProgram = {
      program_id: '',
      department_id: '',
      department_name: '',
      program_name: '',
      chairperson_email: ''
    };
    this.originalChairpersonEmail = '';
  }

  updateProgram(): void {
    if (!this.isEditFormValid()) {
      alert('Please fill in all required fields');
      return;
    }

    this.isLoading = true;
    const updateData = {
      department_id: this.editingProgram.department_id,
      department_name: this.editingProgram.department_name,
      program_name: this.editingProgram.program_name,
      chairperson_email: this.editingProgram.chairperson_email
    };

    this.http.put<{ success: boolean; message: string }>(
      `${this.apiUrl}/${this.editingProgram.program_id}`, 
      updateData
    ).subscribe({
      next: (response) => {
        console.log('✅ Program updated:', response);
        alert('Program updated successfully!');
        this.loadPrograms(); // Reload programs
        this.loadAvailableFaculty(); // Reload faculty (to update dropdown)
        this.closeEditProgramModal();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('❌ Error updating program:', err);
        const errorMsg = err.error?.message || 'Failed to update program';
        alert(`Error: ${errorMsg}`);
        this.isLoading = false;
      }
    });
  }

  isEditFormValid(): boolean {
    return !!this.editingProgram.program_id?.trim() && 
           !!this.editingProgram.department_id?.trim() && 
           !!this.editingProgram.department_name?.trim() && 
           !!this.editingProgram.program_name?.trim() && 
           !!this.editingProgram.chairperson_email?.trim();
  }

  // Delete Program Method
  deleteProgram(program: Program): void {
    const confirmDelete = confirm(
      `Are you sure you want to delete the program "${program.program_name}" (${program.program_id})?\n\n` +
      `This will:\n` +
      `- Remove the program from the system\n` +
      `- Unassign the chairperson (${program.chairperson_email})\n` +
      `- Demote the chairperson back to faculty status\n\n` +
      `This action cannot be undone.`
    );

    if (!confirmDelete) {
      return;
    }

    this.isLoading = true;
    this.http.delete<{ success: boolean; message: string }>(
      `${this.apiUrl}/${program.program_id}`
    ).subscribe({
      next: (response) => {
        console.log('✅ Program deleted:', response);
        alert(`Program "${program.program_name}" deleted successfully!`);
        this.loadPrograms(); // Reload programs
        this.loadAvailableFaculty(); // Reload faculty (chairperson is now available again)
        this.isLoading = false;
      },
      error: (err) => {
        console.error('❌ Error deleting program:', err);
        const errorMsg = err.error?.message || 'Failed to delete program';
        alert(`Error: ${errorMsg}`);
        this.isLoading = false;
      }
    });
  }
}

