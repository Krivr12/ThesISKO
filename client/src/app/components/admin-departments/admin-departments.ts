import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar';

interface Department {
  program: string;
  programCode: string;
  college: string;
  chairperson: string;
  documentCount: number;
}

@Component({
  selector: 'app-admin-departments',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminSidebarComponent],
  templateUrl: './admin-departments.html',
  styleUrls: ['./admin-departments.css']
})
export class AdminDepartments implements OnInit {
  
  // Component state
  isAddDepartmentModalVisible = false;
  currentCollege: string = 'CCIS';
  
  // Sorting and paginator
  sortColumn: keyof Department | null = 'program';
  sortDirection: 'asc' | 'desc' = 'asc';
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;
  pages: (number | string)[] = [];
  
  // New department form
  newDepartment: Department = {
    program: '',
    programCode: '',
    college: '', 
    chairperson: '',
    documentCount: 0
  };
  
  // Sample data
  departments: Department[] = [
    { program: 'Bachelor of Science in Information Technology', programCode: 'BSIT', college: 'CCIS', chairperson: 'FA0001MN2025', documentCount: 673 },
    { program: 'Bachelor of Science in Computer Science', programCode: 'BSCS', college: 'CCIS', chairperson: 'FA0002MN2025', documentCount: 577 },
    // Commented out other possible colleges for future use
    // { program: 'Bachelor of Science in Civil Engineering', programCode: 'BSCE', college: 'CE', chairperson: 'FA0003MN2025', documentCount: 421 },
    // { program: 'Bachelor in Advertising and Public Relations', programCode: 'BADPR', college: 'COC', chairperson: 'FA0004MN2025', documentCount: 389 },
    // { program: 'Bachelor of Arts in Journalism', programCode: 'BAJ', college: 'COC', chairperson: 'FA0005MN2025', documentCount: 312 }
  ];
  
  filteredDepartments: Department[] = [];
  
  ngOnInit(): void {
    this.filterAndSortDepartments();
  }
  
  // Filter by college
  setCollegeFilter(college: string): void {
    this.currentCollege = college;
    this.currentPage = 1;
    this.filterAndSortDepartments();
  }
  
  // Get available colleges for filter buttons
  get availableColleges(): string[] {
    return ['CCIS', 'all'];
    // For future use when adding other colleges:
    // return ['CCIS', 'COC', 'CE', 'all'];
  }
  
  // Sorting
  onSort(column: keyof Department): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.filterAndSortDepartments();
  }
  
  filterAndSortDepartments(): void {
    // Filter
    if (this.currentCollege === 'all') {
      this.filteredDepartments = [...this.departments];
    } else {
      this.filteredDepartments = this.departments.filter(dept => dept.college === this.currentCollege);
    }
    
    // Sort
    if (this.sortColumn) {
      this.filteredDepartments.sort((a, b) => {
        const aValue = a[this.sortColumn!];
        const bValue = b[this.sortColumn!];
        
        if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    // Pagination
    this.totalPages = Math.ceil(this.filteredDepartments.length / this.itemsPerPage);
    this.updatePages();
  }
  
  // Paginatorr
  get paginatedDepartments(): Department[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredDepartments.slice(startIndex, startIndex + this.itemsPerPage);
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
  openAddDepartmentModal(): void {
    this.isAddDepartmentModalVisible = true;
  }
  
  closeAddDepartmentModal(): void {
    this.isAddDepartmentModalVisible = false;
    this.resetForm();
  }
  
  addDepartment(): void {
    if (this.isFormValid()) {
      this.departments.push({...this.newDepartment});
      this.filterAndSortDepartments();
      this.closeAddDepartmentModal();
    }
  }
  
  isFormValid(): boolean {
    return !!this.newDepartment.program && 
           !!this.newDepartment.programCode && 
           !!this.newDepartment.college && 
           !!this.newDepartment.chairperson;
  }
  
  resetForm(): void {
    this.newDepartment = {
      program: '',
      programCode: '',
      college: '',
      chairperson: '',
      documentCount: 0
    };
  }
}