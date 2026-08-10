import { Component, inject, HostListener } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';
import { passwordMismatchValidator } from '../../shared/password-mismatch.directive';
import { Auth } from '../../service/auth';
import { signupPostData } from '../../interface/auth';
import { MessageService } from 'primeng/api';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { CommonModule } from '@angular/common';

// Utility function to convert ALL CAPS to Title Case
function formatTitle(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CardModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    RouterLink,
    AutoCompleteModule,
    ToastModule,
    CommonModule,
  ],
  providers: [MessageService],
  templateUrl: './signup.html',
  styleUrls: ['./signup.css'] 
})
export class Signup {
  private signupService = inject(Auth);
  private messageService = inject(MessageService);
  private router = inject(Router);

  // Modal visibility state
  showVerificationModal = false;

  // Dropdown state
  departmentOpen = false;
  courseOpen = false;
  departmentSearchFilter = '';
  courseSearchFilter = '';

  departments = [
    { value: 'OUS', viewValue: 'OPEN UNIVERSITY SYSTEM' },
    { value: 'CAF', viewValue: 'COLLEGE OF ACCOUNTANCY AND FINANCE' },
    { value: 'CADBE', viewValue: 'COLLEGE OF ARCHITECTURE, DESIGN AND THE BUILT ENVIRONMENT' },
    { value: 'CAL', viewValue: 'COLLEGE OF ARTS AND LETTERS' },
    { value: 'CBA', viewValue: 'COLLEGE OF BUSINESS ADMINISTRATION' },
    { value: 'COC', viewValue: 'COLLEGE OF COMMUNICATION' },
    { value: 'CCIS', viewValue: 'COLLEGE OF COMPUTER AND INFORMATION SCIENCES' },
    { value: 'COED', viewValue: 'COLLEGE OF EDUCATION' },
    { value: 'CE', viewValue: 'COLLEGE OF ENGINEERING' },
    { value: 'CHK', viewValue: 'COLLEGE OF HUMAN KINETICS' },
    { value: 'CSSD', viewValue: 'COLLEGE OF SOCIAL SCIENCES AND DEVELOPMENT' },
    { value: 'CS', viewValue: 'COLLEGE OF SCIENCE' }
  ];
  
  courses: Record<string, { value: string; viewValue: string }[]> = {
    OUS: [
      { value: 'DBA', viewValue: 'DBA' },
      { value: 'D.ENG', viewValue: 'D.ENG' },
      { value: 'PHDEM', viewValue: 'PHDEM' },
      { value: 'DPA', viewValue: 'DPA' },
      { value: 'MC', viewValue: 'MC' },
      { value: 'MBA', viewValue: 'MBA' },
      { value: 'MAEM', viewValue: 'MAEM' },
      { value: 'MIT', viewValue: 'MIT' },
      { value: 'MPA', viewValue: 'MPA' }
    ],
    CAF: [
      { value: 'BSA', viewValue: 'BSA' },
      { value: 'BSBAFM', viewValue: 'BSBAFM' },
      { value: 'BSMA', viewValue: 'BSMA' }
    ],
    CADBE: [
      { value: 'BSARCH', viewValue: 'BSARCH' },
      { value: 'BSID', viewValue: 'BSID' },
      { value: 'BSEP', viewValue: 'BSEP' }
    ],
    CAL: [
      { value: 'ABELS', viewValue: 'ABELS' },
      { value: 'ABF', viewValue: 'ABF' },
      { value: 'ABLCS', viewValue: 'ABLCS' },
      { value: 'ABPHILO', viewValue: 'ABPHILO' },
      { value: 'BPEA', viewValue: 'BPEA' }
    ],
    CBA: [
      { value: 'DBA', viewValue: 'DBA' },
      { value: 'MBA', viewValue: 'MBA' },
      { value: 'BSBAHRM', viewValue: 'BSBAHRM' },
      { value: 'BSBAMM', viewValue: 'BSBAMM' },
      { value: 'BSENTREP', viewValue: 'BSENTREP' },
      { value: 'BSOA', viewValue: 'BSOA' }
    ],
    COC: [
      { value: 'BADPR', viewValue: 'BADPR' },
      { value: 'BAB', viewValue: 'BAB' },
      { value: 'BACR', viewValue: 'BACR' },
      { value: 'BAJ', viewValue: 'BAJ' }
    ],
    CCIS: [
      { value: 'BSCS', viewValue: 'BSCS' },
      { value: 'BSIT', viewValue: 'BSIT' }
    ],
    COED: [
      { value: 'PHDEM', viewValue: 'PHDEM' },
      { value: 'MBE', viewValue: 'MBE' },
      { value: 'MLIS', viewValue: 'MLIS' },
      { value: 'MAELT', viewValue: 'MAELT' },
      { value: 'MAEDME', viewValue: 'MAEDME' },
      { value: 'MAPES', viewValue: 'MAPES' },
      { value: 'MAEDTCA', viewValue: 'MAEDTCA' },
      { value: 'PBDE', viewValue: 'PBDE' }
    ],
    CE: [
      { value: 'BSCE', viewValue: 'BSCE' },
      { value: 'BSCPE', viewValue: 'BSCPE' },
      { value: 'BSEE', viewValue: 'BSEE' },
      { value: 'BSECE', viewValue: 'BSECE' },
      { value: 'BSIE', viewValue: 'BSIE' },
      { value: 'BSME', viewValue: 'BSME' },
      { value: 'BSRE', viewValue: 'BSRE' }
    ],
    CHK: [
      { value: 'BPE', viewValue: 'BPE' },
      { value: 'BSESS', viewValue: 'BSESS' }
    ],
    CSSD: [
      { value: 'BAH', viewValue: 'BAH' },
      { value: 'BAS', viewValue: 'BAS' },
      { value: 'BSC', viewValue: 'BSC' },
      { value: 'BSE', viewValue: 'BSE' },
      { value: 'BSPSY', viewValue: 'BSPSY' }
    ],
    CS: [
      { value: 'BSFT', viewValue: 'BSFT' },
      { value: 'BSAPMATH', viewValue: 'BSAPMATH' },
      { value: 'BSBIO', viewValue: 'BSBIO' },
      { value: 'BSCHEM', viewValue: 'BSCHEM' },
      { value: 'BSMATH', viewValue: 'BSMATH' },
      { value: 'BSND', viewValue: 'BSND' },
      { value: 'BSPHY', viewValue: 'BSPHY' }
    ]
  };

  filteredCourses: any[] = [];
  filteredDepartments: any[] = [];

  signupForm = new FormGroup({
    firstName: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[a-zA-Z\s\.]*$/) // Allow letters, spaces, and periods
    ]),
    lastName: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[a-zA-Z\s\.]*$/) // Allow letters, spaces, and periods
    ]),
    email: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/)
    ]),
    studentNum: new FormControl('', [
      Validators.required,
      Validators.pattern(/^\d{4}-\d{5}-[A-Z]{2}-\d$/)
    ]),
    password: new FormControl('', [Validators.required]),
    confirmPassword: new FormControl('', [Validators.required]),
    department: new FormControl('', Validators.required),
    course: new FormControl('', Validators.required),
  }, {
    validators: passwordMismatchValidator
  });

  // Track fields with errors (to show inline error styling)
  fieldsWithErrors: Set<string> = new Set();

  ngOnInit() {
    this.filteredDepartments = this.departments;
  }

  // Close dropdowns when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const customSelects = document.querySelectorAll('.custom-select');
    let clickedInside = false;

    customSelects.forEach(select => {
      if (select.contains(target)) {
        clickedInside = true;
      }
    });

    if (!clickedInside) {
      this.closeDropdowns();
    }
  }

  // Format text for display
  formatTitle(text: string): string {
    return formatTitle(text);
  }

  // Get selected department label
  getSelectedDepartmentLabel(): string {
    const deptValue = this.signupForm.get('department')?.value;
    if (!deptValue) return 'Select';
    const dept = this.departments.find(d => d.value === deptValue);
    return dept ? this.formatTitle(dept.viewValue) : 'Select';
  }

  // Get selected course label
  getSelectedCourseLabel(): string {
    const courseValue = this.signupForm.get('course')?.value;
    if (!courseValue) return 'Select';
    const course = this.filteredCourses.find(c => c.value === courseValue);
    return course ? course.value : 'Select';
  }

  // Toggle department dropdown
  toggleDepartmentDropdown() {
    this.departmentOpen = !this.departmentOpen;
    if (this.departmentOpen) {
      this.courseOpen = false;
    }
    this.departmentSearchFilter = '';
    this.filteredDepartments = this.departments;
  }

  // Filter departments
  filterDepartments(searchTerm: string) {
    this.departmentSearchFilter = searchTerm;
    this.filteredDepartments = this.departments.filter(dept =>
      dept.viewValue.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  // Select department
  selectDepartment(dept: any) {
    this.signupForm.get('department')?.setValue(dept.value);
    this.departmentOpen = false;
    this.onDepartmentChange(dept.value);
  }

  // Toggle course dropdown
  toggleCourseDropdown() {
    if (!this.signupForm.get('department')?.value) return;
    this.courseOpen = !this.courseOpen;
    if (this.courseOpen) {
      this.departmentOpen = false;
    }
    this.courseSearchFilter = '';
  }

  // Filter courses
  filterCourses(searchTerm: string) {
    this.courseSearchFilter = searchTerm;
  }

  // Get filtered courses
  getFilteredCourses(): any[] {
    if (!this.courseSearchFilter) return this.filteredCourses;
    return this.filteredCourses.filter(course =>
      course.value.toLowerCase().includes(this.courseSearchFilter.toLowerCase()) ||
      course.viewValue.toLowerCase().includes(this.courseSearchFilter.toLowerCase())
    );
  }

  // Select course
  selectCourse(course: any) {
    this.signupForm.get('course')?.setValue(course.value);
    this.courseOpen = false;
  }

  // Close dropdowns when clicking outside
  closeDropdowns() {
    this.departmentOpen = false;
    this.courseOpen = false;
  }

  // Check if field is in error state
  isFieldInError(fieldName: string): boolean {
    return this.fieldsWithErrors.has(fieldName);
  }

  // Clear field error state and remove from error set
  clearFieldError(fieldName: string): void {
    this.fieldsWithErrors.delete(fieldName);
  }

  // Mark field as in error
  private markFieldError(fieldName: string): void {
    this.fieldsWithErrors.add(fieldName);
  }

  onDepartmentChange(dept: string) {
    this.filteredCourses = this.courses[dept] || [];
    this.signupForm.get('course')?.setValue(''); 
  }

  // Submit handler
  onSignup() {
    if (this.signupForm.valid) {
      const formValue = this.signupForm.value;
      
      // Map frontend field names to backend field names
      const postData = {
        firstname: formValue.firstName!,
        lastname: formValue.lastName!,
        email: formValue.email!,
        student_id: formValue.studentNum!,
        password: formValue.password!,
        department: formValue.department!,
        course: formValue.course!,
        status: 'Student' // Set status based on role
      };

      this.signupService.signupUser(postData).subscribe({
        next: (response: any) => {
        // Show verification modal instead of toast + immediate redirect
        this.showVerificationModal = true;
        },
        error: (err) => {
          
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: err.error?.error || 'Something went wrong',
          });
        },
      });
    } else {
      // Mark all invalid fields with errors
      Object.keys(this.signupForm.controls).forEach(key => {
        const control = this.signupForm.get(key);
        if (control && control.invalid) {
          this.markFieldError(key);
        }
      });
      
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please fill in all required fields correctly',
      });
    }
  }

  // Getters for form validation
  get firstName() { return this.signupForm.get('firstName') as FormControl; }
  get lastName() { return this.signupForm.get('lastName') as FormControl; }
  get email() { return this.signupForm.get('email') as FormControl; }
  get password() { return this.signupForm.get('password') as FormControl; }
  get confirmPassword() { return this.signupForm.get('confirmPassword') as FormControl; }
  get department() { return this.signupForm.get('department') as FormControl; }
  get course() { return this.signupForm.get('course') as FormControl; }
  get studentNum() { return this.signupForm.get('studentNum') as FormControl; }

  // Handle modal okay button click
  onModalOkay() {
    this.showVerificationModal = false;
    this.router.navigate(['/login']);
  }
}