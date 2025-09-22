import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar';

interface Chairperson {
  firstName: string;
  lastName: string;
  email: string;
  facultyNumber: string;
}

@Component({
  selector: 'app-admin-chairpersons',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminSidebarComponent],
  templateUrl: './admin-chairpersons.html',
  styleUrls: ['./admin-chairpersons.css']
})
export class AdminChairpersons implements OnInit {
  
  // Component state
  isAddChairpersonModalVisible = false;
  isEditMode = false;
  currentEditIndex: number | null = null;
  
  // Sorting and paginatorr
  sortColumn: keyof Chairperson | null = 'lastName';
  sortDirection: 'asc' | 'desc' = 'asc';
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;
  pages: (number | string)[] = [];
  
  // New chairperson form
  newChairperson: Chairperson = {
    firstName: '',
    lastName: '',
    email: '',
    facultyNumber: ''
  };
  
  // Placeholderg data
  chairpersons: Chairperson[] = [
    { firstName: 'Maria Lourdes', lastName: 'Santos', email: 'misantos@pup.edu.ph', facultyNumber: 'FA00001MN2025' },
    { firstName: 'James', lastName: 'Villanueva', email: 'jvillanueva@pup.edu.ph', facultyNumber: 'FA00011MN2023' },
    { firstName: 'Ana', lastName: 'Robles', email: 'arobles@pup.edu.ph', facultyNumber: 'FA00007MN2020' },
    { firstName: 'Michael', lastName: 'Reyes', email: 'mreyes@pup.edu.ph', facultyNumber: 'FA00005MN2017' },
    { firstName: 'Kristine', lastName: 'Dela Cruz', email: 'kdelacruz@pup.edu.ph', facultyNumber: 'FA00005MN2014' },
    { firstName: 'John Carlo', lastName: 'Mendoza', email: 'jcmendoza@pup.edu.ph', facultyNumber: 'FA00010MN2018' },
    { firstName: 'Rowena', lastName: 'Garcia', email: 'rgarcia@pup.edu.ph', facultyNumber: 'FA0003MN2021' },
    { firstName: 'Nathaniel', lastName: 'Torres', email: 'ntorres@pup.edu.ph', facultyNumber: 'FA00022MN2023' },
    { firstName: 'Camille', lastName: 'Javier', email: 'cjavier@pup.edu.ph', facultyNumber: 'FA00002MN2021' }
  ];
  
  filteredChairpersons: Chairperson[] = [];
  
  ngOnInit(): void {
    this.filterAndSortChairpersons();
  }
  
  // Sorting
  onSort(column: keyof Chairperson): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.filterAndSortChairpersons();
  }
  
  filterAndSortChairpersons(): void {
    this.filteredChairpersons = [...this.chairpersons];
    
    // Sort
    if (this.sortColumn) {
      this.filteredChairpersons.sort((a, b) => {
        const aValue = a[this.sortColumn!];
        const bValue = b[this.sortColumn!];
        
        if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    // Paginator
    this.totalPages = Math.ceil(this.filteredChairpersons.length / this.itemsPerPage);
    this.updatePages();
  }
  
  // Paginatort methods
  get paginatedChairpersons(): Chairperson[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredChairpersons.slice(startIndex, startIndex + this.itemsPerPage);
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
  openAddChairpersonModal(): void {
    this.isEditMode = false;
    this.isAddChairpersonModalVisible = true;
  }
  
  openEditChairpersonModal(index: number): void {
    this.isEditMode = true;
    this.currentEditIndex = index;
    this.newChairperson = {...this.chairpersons[index]};
    this.isAddChairpersonModalVisible = true;
  }
  
  closeAddChairpersonModal(): void {
    this.isAddChairpersonModalVisible = false;
    this.isEditMode = false;
    this.currentEditIndex = null;
    this.resetForm();
  }
  
  saveChairperson(): void {
    if (this.isFormValid()) {
      if (this.isEditMode && this.currentEditIndex !== null) {
        // Update existing chairperson
        this.chairpersons[this.currentEditIndex] = {...this.newChairperson};
      } else {
        // Add new chairperson
        this.chairpersons.push({...this.newChairperson});
      }
      this.filterAndSortChairpersons();
      this.closeAddChairpersonModal();
    }
  }
  
  isFormValid(): boolean {
    return !!this.newChairperson.firstName && 
           !!this.newChairperson.lastName && 
           !!this.newChairperson.email && 
           !!this.newChairperson.facultyNumber;
  }
  
  resetForm(): void {
    this.newChairperson = {
      firstName: '',
      lastName: '',
      email: '',
      facultyNumber: ''
    };
  }
  
  // Helper to connect first n last name
  getFullName(chairperson: Chairperson): string {
    return `${chairperson.firstName} ${chairperson.lastName}`;
  }
}