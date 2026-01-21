import { Component, TemplateRef, ViewChild, HostListener, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { environment } from '../../../environments/environment';

/* Angular Material */
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatOptionModule } from '@angular/material/core';

import { HttpClient, HttpClientModule } from '@angular/common/http';
import { NgIf, NgFor } from '@angular/common';
import { Footer } from "../footer/footer";
import { Navbar, AuthService } from "../navbar/navbar";

type UserRole = 'student' | 'guest' | 'group';

@Component({
  selector: 'app-search-result',
  standalone: true,
  imports: [
    Footer, Navbar,
    NgIf, NgFor, CommonModule, FormsModule,
    MatDialogModule, MatCheckboxModule, MatFormFieldModule, MatInputModule, MatButtonModule,
    MatSelectModule, MatDividerModule,
    HttpClientModule, MatOptionModule
  ],
  templateUrl: './search-result.html',
  styleUrls: ['./search-result.css']
})
export class SearchResult implements OnInit, AfterViewInit {
  // ===== Templates for role-based dialogs =====
  @ViewChild('dlgRequestAccessStudent', { static: false }) dlgStudent!: TemplateRef<any>;
  @ViewChild('dlgRequestAccessGuest', { static: false }) dlgGuest!: TemplateRef<any>;
  @ViewChild('dlgGuestStep2', { static: false }) dlgGuestStep2!: TemplateRef<any>;
  @ViewChild('dlgGuestStep3', { static: false }) dlgGuestStep3!: TemplateRef<any>;
  @ViewChild('dlgGuestStep4', { static: false }) dlgGuestStep4!: TemplateRef<any>;
  @ViewChild('dlgOldPupianStep1', { static: false }) dlgOldPupianStep1!: TemplateRef<any>;
  @ViewChild('dlgOldPupianStep2', { static: false }) dlgOldPupianStep2!: TemplateRef<any>;
  @ViewChild('dlgOldPupianStep3', { static: false }) dlgOldPupianStep3!: TemplateRef<any>;
  @ViewChild('dlgOldGuestStep1', { static: false }) dlgOldGuestStep1!: TemplateRef<any>;
  @ViewChild('dlgOldGuestStep2', { static: false }) dlgOldGuestStep2!: TemplateRef<any>;
  @ViewChild('dlgOldGuestStep3', { static: false }) dlgOldGuestStep3!: TemplateRef<any>;
  @ViewChild('dlgOldGuestStep4', { static: false }) dlgOldGuestStep4!: TemplateRef<any>;
  @ViewChild('dlgUserAffiliation', { static: false }) dlgUserAffiliation!: TemplateRef<any>;
  @ViewChild('dlgExternalAffiliation', { static: false }) dlgExternalAffiliation!: TemplateRef<any>;
  @ViewChild('dlgRequestDetails', { static: false }) dlgRequestDetails!: TemplateRef<any>;
  @ViewChild('dlgLoginRequired', { static: false }) dlgLoginRequired!: TemplateRef<any>;
  @ViewChild('dlgTerms', { static: false }) dlgTerms!: TemplateRef<any>;

  thesis: any; // Store thesis passed from router
  citationCopied = false; // Track if citation was just copied
  copiedFormat = ''; // Track which format was copied (APA/MLA)
  isLoading: boolean = true; // Loading state for spinner
  isSubmittingRequest: boolean = false; // Loading state for request submission

  private searchQuery: string = ''; // Store search query from navigation state

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private http: HttpClient,
    private authService: AuthService
  ) {
    const nav = this.router.getCurrentNavigation();

    
    // Try to get document_id from navigation state first
    let documentId = nav?.extras?.state?.['document_id'];
    
    // Store search query from navigation state for return navigation
    this.searchQuery = nav?.extras?.state?.['searchQuery'] || '';
    
    // If not in navigation state, try to get from browser history state (for page refreshes)
    if (!documentId && window.history.state && window.history.state['document_id']) {
      documentId = window.history.state['document_id'];
    }
    
    // Also try to get search query from history state
    if (!this.searchQuery && window.history.state && window.history.state['searchQuery']) {
      this.searchQuery = window.history.state['searchQuery'];
    }
    
    if (documentId) {
      this.loadThesisDetails(documentId);
    } else {
      this.router.navigate(['/search-thesis']);
    }

    // Initialize current user and role
    this.initializeUserRole();
  }

  ngOnInit(): void {
    // Re-initialize user role in case AuthService wasn't ready in constructor
    this.initializeUserRole();
  }

  ngAfterViewInit(): void {
    // Verify ViewChild references are available

  }

  loadThesisDetails(document_id: string): void {
    this.isLoading = true; // Show spinner

    this.http.get<any>(`${environment.recordsApiUrl}/${document_id}`).subscribe({
      next: (data) => {
        this.thesis = data
        this.isLoading = false; // Hide spinner, show content
      },
      error: (error) => {
        console.error('❌ [LOAD-THESIS] Error loading thesis details:', error);
        this.isLoading = false; // Hide spinner even on error
        this.router.navigate(['/search-thesis']);
      }
    });
  }

  private initializeUserRole(): void {
    this.currentUserEmail = this.getCurrentUserEmail();
    this.userRole = this.deriveRole(this.currentUserEmail);
    
    // Debug: Show what user data we actually have
    const currentUser = this.authService.currentUser;
    
    // Auto-select course and department for students based on their account data
    if (this.userRole === 'student') {
      this.studentProgram = this.getCurrentUserCourse();
      this.studentDepartment = this.getCurrentUserDepartment();
      
    };
  }

  // ===== Auth / identity =====
  currentUserEmail = '';
  userRole: UserRole = 'guest';

  // ===== Checkbox options =====
  requestOptions = ['Chapter 1', 'Chapter 2', 'Chapter 3', 'Chapter 4', 'Chapter 5', 'All'] as const;
  selectedRequestChapters = new Set<string>();

  // ===== Legacy fields - removed for active documents =====
  guestContactNumber = '';

  // ===== STEP 2A: PUP MEMBER DETAILS =====
  colleges: string[] = [
    'College of Computer and Information Sciences',
    'College of Business Administration',
    'College of Communication',
  ];
  departments: { [key: string]: string[] } = {
    'College of Computer and Information Sciences': ['BSIT', 'BSCS'],
    'College of Business Administration': ['Marketing', 'HR'],
    'College of Communication': ['Broadcasting', 'Journalism']
  };
  selectedCollege = '';
  selectedDepartment = '';
  filteredDepartments: string[] = [];
  userRoleForm: string = ''; // 'Student' or 'Faculty' for PUP members (different from userRole which is 'student'|'guest'|'group')
  studentID = ''; // Student ID if role is Student
  facultyID = ''; // Faculty ID if role is Faculty

  // ===== STEP 2B: NON-PUP MEMBER DETAILS =====
  affiliationCollege = '';
  affiliationDepartment = '';
  affiliationCountry = '';
  affiliationRole = '';
  countryList = ['Philippines', 'Japan', 'USA', 'Canada'];

  // ===== STEP 3: REQUEST DETAILS =====
  paperType = '';
  selectedChapters = new Set<string>();
  requestPurpose = '';
  requestRemarks = '';

  // ===== Old document specific fields (added to STEP 3 when document is old) =====
  oldDocumentJustification = ''; // Justification for requesting old documents
  researchPurposeDetails = ''; // Research purpose details for old documents

  // ===== STEP 4: TERMS =====
  termsAccepted = false;

  // ===== PUPian form fields (Active Documents) =====
  studentProgram: string = '';
  studentDepartment: string = '';
  pupianRole: string = ''; // 'Student' or 'Faculty' for PUPian form

  // ===== Guest form fields (Active Documents) =====
  guestEmail: string = '';
  guestFullName: string = '';
  guestCity: string = '';
  guestCountry: string = '';
  guestSchool: string = ''; // University/Organization
  guestProgram: string = '';
  guestDepartment: string = '';
  guestRole: string = ''; // 'Student' or 'Faculty' for Guest form

  // ===== Old document form fields =====
  oldPupianSupervisor: string = ''; // Optional supervisor/adviser for PUPian
  oldGuestSupervisor: string = ''; // Optional supervisor/adviser for Guest
  oldPupianContactNumber: string = ''; // Contact number for old PUPian forms
  oldGuestContactNumber: string = ''; // Contact number for old Guest forms
  intendedUse: string = ''; // Intended use of information
  howDidYouLearn: string = ''; // How did you learn about this document (optional)
  consentToContact: boolean = false; // Consent to contact checkbox
  preferredContactMethod: string = ''; // 'Email' or 'Phone'

  // ===== Legacy fields (keeping for backward compatibility) =====
  requestEmail = '';       // guest email
  touchGuestEmail = false;

  onReturnClick(): void {
    // Navigate back to search-thesis with the preserved search query
    if (this.searchQuery && this.searchQuery.trim() !== '') {
      this.router.navigate(['/search-thesis'], {
        queryParams: { q: this.searchQuery }
      });
    } else {
      this.router.navigate(['/search-thesis']);
    }
  }

  // ===== Role helpers =====
  private deriveRole(email: string): UserRole {
    const currentUser = this.authService.currentUser;
    
    // Check role_id from database
    if (currentUser?.role_id) {
      switch (currentUser.role_id) {
        case 1:
          return 'guest';
        case 2:
          return 'student';
        case 3:
          return 'student'; // Faculty can also request manuscripts
        case 4:
        case 5:
          return 'student'; // Admin/SuperAdmin can also request manuscripts
        default:
          break;
      }
    }
    
    // Fallback to email pattern matching if role_id is not available
    if (currentUser?.account_type === 'group') {
      return 'group';
    }
    
    // Check for student email pattern as fallback
    if (/@iskolarngbayan\.pup\.edu\.ph$/i.test(email || '')) return 'student';
    return 'guest';
  }
  isGmail(email: string): boolean {
    return /^[^@\s]+@gmail\.com$/i.test((email || '').trim());
  }

  // ===== Validation helpers =====
  // PUPian: email (pre-filled), program, department, role, chapters, purpose (min 24 chars)
  get studentFormValid(): boolean {
    const valid = this.chaptersValid && this.purposeValid24 && !!this.studentProgram && !!this.studentDepartment && !!this.pupianRole;
    return valid;
  }

  // Guest form validation helpers
  get guestStep1Valid(): boolean {
    return !!(this.guestEmail && this.guestFullName && this.guestCity && this.guestCountry);
  }

  get guestStep2Valid(): boolean {
    return !!(this.guestSchool && this.guestProgram && this.guestDepartment && this.guestRole);
  }

  get guestStep3Valid(): boolean {
    return this.chaptersValid && this.purposeValid24;
  }

  // Static mapping of programs to departments
  private readonly programToDepartments: { [key: string]: {value: string, label: string}[] } = {
      'OPEN UNIVERSITY SYSTEM': [
        {value: 'Doctor of Business Administration', label: 'Doctor of Business Administration'},
        {value: 'Doctor of Engineering', label: 'Doctor of Engineering'},
        {value: 'Doctor of Philosophy in Development Management', label: 'Doctor of Philosophy in Development Management'},
        {value: 'Doctor of Public Administration', label: 'Doctor of Public Administration'},
        {value: 'Master of Communication', label: 'Master of Communication'},
        {value: 'Master of Business Administration', label: 'Master of Business Administration'},
        {value: 'Master of Arts in Educational Management', label: 'Master of Arts in Educational Management'},
        {value: 'Master of Information Technology', label: 'Master of Information Technology'},
        {value: 'Master of Public Administration', label: 'Master of Public Administration'}
      ],
      'COLLEGE OF ACCOUNTANCY AND FINANCE': [
        {value: 'Bachelor of Science in Accountancy', label: 'Bachelor of Science in Accountancy'},
        {value: 'Bachelor of Science in Business Administration Major in Financial Management', label: 'Bachelor of Science in Business Administration Major in Financial Management'},
        {value: 'Bachelor of Science in Management Accounting', label: 'Bachelor of Science in Management Accounting'}
      ],
      'COLLEGE OF ARCHITECTURE, DESIGN AND THE BUILT ENVIRONMENT': [
        {value: 'Bachelor of Science in Architecture', label: 'Bachelor of Science in Architecture'},
        {value: 'Bachelor of Science in Interior Design', label: 'Bachelor of Science in Interior Design'},
        {value: 'Bachelor of Science in Environmental Planning', label: 'Bachelor of Science in Environmental Planning'}
      ],
      'COLLEGE OF ARTS AND LETTERS': [
        {value: 'Bachelor of Arts in English Language Studies', label: 'Bachelor of Arts in English Language Studies'},
        {value: 'Bachelor of Arts in Filipino', label: 'Bachelor of Arts in Filipino'},
        {value: 'Bachelor of Arts in Literary and Cultural Studies', label: 'Bachelor of Arts in Literary and Cultural Studies'},
        {value: 'Bachelor of Arts in Philosophy', label: 'Bachelor of Arts in Philosophy'},
        {value: 'Bachelor of Performing Arts', label: 'Bachelor of Performing Arts'}
      ],
      'COLLEGE OF BUSINESS ADMINISTRATION': [
        {value: 'Bachelor of Science in Business Administration Major in Human Resource Management', label: 'Bachelor of Science in Business Administration Major in Human Resource Management'},
        {value: 'Bachelor of Science in Business Administration Major in Marketing Management', label: 'Bachelor of Science in Business Administration Major in Marketing Management'},
        {value: 'Bachelor of Science in Entrepreneurship', label: 'Bachelor of Science in Entrepreneurship'},
        {value: 'Bachelor of Science in Office Administration', label: 'Bachelor of Science in Office Administration'}
      ],
      'COLLEGE OF COMMUNICATION': [
        {value: 'Bachelor of Arts in Advertising and Public Relations', label: 'Bachelor of Arts in Advertising and Public Relations'},
        {value: 'Bachelor of Arts in Broadcasting', label: 'Bachelor of Arts in Broadcasting'},
        {value: 'Bachelor of Arts in Communication Research', label: 'Bachelor of Arts in Communication Research'},
        {value: 'Bachelor of Arts in Journalism', label: 'Bachelor of Arts in Journalism'}
      ],
      'COLLEGE OF COMPUTER AND INFORMATION SCIENCES': [
        {value: 'Bachelor of Science in Computer Science', label: 'Bachelor of Science in Computer Science'},
        {value: 'Bachelor of Science in Information Technology', label: 'Bachelor of Science in Information Technology'}
      ],
      'COLLEGE OF EDUCATION': [
        {value: 'Master in Business Education', label: 'Master in Business Education'},
        {value: 'Master of Library and Information Science', label: 'Master of Library and Information Science'},
        {value: 'Master of Arts in English Language Teaching', label: 'Master of Arts in English Language Teaching'},
        {value: 'Master of Arts in Educational Management', label: 'Master of Arts in Educational Management'},
        {value: 'Master of Arts in Physical Education and Sports', label: 'Master of Arts in Physical Education and Sports'},
        {value: 'Master of Arts in Education Major in Teaching in the Challenged Areas', label: 'Master of Arts in Education Major in Teaching in the Challenged Areas'},
        {value: 'Post Baccalaureate Diploma in Education', label: 'Post Baccalaureate Diploma in Education'}
      ],
      'COLLEGE OF ENGINEERING': [
        {value: 'Bachelor of Science in Civil Engineering', label: 'Bachelor of Science in Civil Engineering'},
        {value: 'Bachelor of Science in Computer Engineering', label: 'Bachelor of Science in Computer Engineering'},
        {value: 'Bachelor of Science in Electrical Engineering', label: 'Bachelor of Science in Electrical Engineering'},
        {value: 'Bachelor of Science in Electronics and Communications Engineering', label: 'Bachelor of Science in Electronics and Communications Engineering'},
        {value: 'Bachelor of Science in Industrial Engineering', label: 'Bachelor of Science in Industrial Engineering'},
        {value: 'Bachelor of Science in Mechanical Engineering', label: 'Bachelor of Science in Mechanical Engineering'},
        {value: 'Bachelor of Science in Railway Engineering', label: 'Bachelor of Science in Railway Engineering'}
      ],
      'COLLEGE OF HUMAN KINETICS': [
        {value: 'Bachelor of Physical Education', label: 'Bachelor of Physical Education'},
        {value: 'Bachelor of Science in Exercise and Sports Sciences', label: 'Bachelor of Science in Exercise and Sports Sciences'}
      ],
      'COLLEGE OF SOCIAL SCIENCES AND DEVELOPMENT': [
        {value: 'Bachelor of Arts in History', label: 'Bachelor of Arts in History'},
        {value: 'Bachelor of Arts in Sociology', label: 'Bachelor of Arts in Sociology'},
        {value: 'Bachelor of Science in Cooperatives', label: 'Bachelor of Science in Cooperatives'},
        {value: 'Bachelor of Science in Economics', label: 'Bachelor of Science in Economics'},
        {value: 'Bachelor of Science in Psychology', label: 'Bachelor of Science in Psychology'}
      ],
      'COLLEGE OF SCIENCE': [
        {value: 'Bachelor of Science in Food Technology', label: 'Bachelor of Science in Food Technology'},
        {value: 'Bachelor of Science in Applied Mathematics', label: 'Bachelor of Science in Applied Mathematics'},
        {value: 'Bachelor of Science in Biology', label: 'Bachelor of Science in Biology'},
        {value: 'Bachelor of Science in Chemistry', label: 'Bachelor of Science in Chemistry'},
        {value: 'Bachelor of Science in Mathematics', label: 'Bachelor of Science in Mathematics'},
        {value: 'Bachelor of Science in Nutrition and Dietetics', label: 'Bachelor of Science in Nutrition and Dietetics'},
        {value: 'Bachelor of Science in Physics', label: 'Bachelor of Science in Physics'}
      ]
    };

  // Get filtered department options based on selected program (method instead of getter)
  getFilteredDepartmentOptions(): {value: string, label: string}[] {
    const result = this.programToDepartments[this.studentProgram] || [];
    
    // If no departments found and we have a program, try to find a close match
    if (result.length === 0 && this.studentProgram) {
      console.warn('⚠️ No departments found for program:', this.studentProgram);
    }
    
    return result;
  }

  // TrackBy function for department options to optimize rendering
  trackDepartmentBy(index: number, item: {value: string, label: string}): string {
    return item.value;
  }

  // Handle program selection change
  onProgramChange(): void {
    
    // Clear department selection if the current selection is not valid for the new program
    const validDepartments = this.getFilteredDepartmentOptions().map(d => d.value);
    
    if (this.studentDepartment && !validDepartments.includes(this.studentDepartment)) {
      this.studentDepartment = '';
    }
    
    // If no departments are available, log a warning
    if (validDepartments.length === 0) {
      console.warn('⚠️ No departments available for program:', this.studentProgram);
    }
  }

  // Group: only needs purpose and chapters (no additional fields required)
  get groupFormValid(): boolean {
    return this.chaptersValid && this.purposeValid;
  }

  // Guest: gmail + country + city + school + purpose + chapters
  get guestFormValid(): boolean {
    const valid = this.chaptersValid && this.purposeValid &&
           this.isGmail(this.requestEmail) &&
           !!this.guestCountry && !!this.guestCity && !!this.guestSchool;
    return valid;
  }
  private get purposeValid(): boolean {
    return (this.requestPurpose?.trim().length ?? 0) >= 8;
  }
  private get purposeValid24(): boolean {
    return (this.requestPurpose?.trim().length ?? 0) >= 24;
  }
  private get chaptersValid(): boolean {
    return this.selectedRequestChapters.size > 0;
  }

  // ===== UI actions =====
  openRequestDialog(): void {
    
    // Check if user is logged in
    if (!this.currentUserEmail) {
      // Show login required dialog
      if (this.dlgLoginRequired) {
        this.dialog.open(this.dlgLoginRequired, { width: '500px', autoFocus: false });
      } else {
        console.error('❌ [REQUEST-DIALOG] Login required dialog template not available');
      }
      return;
    }
    
    this.resetRequestDialog();
    
    // Route to correct form based on document status and user role
    const isOldDocument = this.thesis?.document_status === 'old';
    const isPUPMember = this.userRole === 'student' || this.userRole === 'group';
    
    if (isOldDocument) {
      // Old document forms
      if (isPUPMember) {
        // Old PUPian form - Step 1
        if (!this.dlgOldPupianStep1) {
          console.error('❌ [REQUEST-DIALOG] Old PUPian Step 1 dialog template not available');
          return;
        }
        this.dialog.open(this.dlgOldPupianStep1, { width: '600px', disableClose: true });
      } else {
        // Old Guest form - Step 1
        if (!this.dlgOldGuestStep1) {
          console.error('❌ [REQUEST-DIALOG] Old Guest Step 1 dialog template not available');
          return;
        }
        // Pre-fill email from logged-in user
        this.guestEmail = this.currentUserEmail;
        this.dialog.open(this.dlgOldGuestStep1, { width: '600px', disableClose: true });
      }
    } else {
      // Active document forms
      if (isPUPMember) {
        // PUPian form - single dialog
        if (!this.dlgStudent) {
          console.error('❌ [REQUEST-DIALOG] Student dialog template not available');
          return;
        }
        this.dialog.open(this.dlgStudent, { width: '600px', disableClose: true });
      } else {
        // Guest form - multi-step, start with Step 1
        if (!this.dlgGuest) {
          console.error('❌ [REQUEST-DIALOG] Guest dialog template not available');
          return;
        }
        // Pre-fill email from logged-in user
        this.guestEmail = this.currentUserEmail;
        this.dialog.open(this.dlgGuest, { width: '600px', disableClose: true });
      }
    }
  }

  resetRequestDialog(): void {
    // PUPian form fields
    this.studentProgram = '';
    this.studentDepartment = '';
    this.pupianRole = '';

    // Guest form fields
    this.guestEmail = '';
    this.guestFullName = '';
    this.guestCity = '';
    this.guestCountry = '';
    this.guestSchool = '';
    this.guestProgram = '';
    this.guestDepartment = '';
    this.guestRole = '';

    // Common fields
    this.selectedRequestChapters.clear();
    this.requestPurpose = '';
    this.termsAccepted = false;

    // Old document fields
    this.oldPupianSupervisor = '';
    this.oldGuestSupervisor = '';
    this.oldPupianContactNumber = '';
    this.oldGuestContactNumber = '';
    this.intendedUse = '';
    this.howDidYouLearn = '';
    this.consentToContact = false;
    this.preferredContactMethod = '';

    // Legacy fields (for backward compatibility)
    this.guestContactNumber = '';
    this.selectedCollege = '';
    this.selectedDepartment = '';
    this.filteredDepartments = [];
    this.userRoleForm = '';
    this.studentID = '';
    this.facultyID = '';
    this.affiliationCollege = '';
    this.affiliationDepartment = '';
    this.affiliationCountry = '';
    this.affiliationRole = '';
    this.paperType = '';
    this.selectedChapters.clear();
    this.requestRemarks = '';
    this.oldDocumentJustification = '';
    this.researchPurposeDetails = '';
    this.requestEmail = '';
    this.touchGuestEmail = false;
  }

  // ===== Guest form navigation methods (Active Documents) =====
  openGuestStep2(prevDialogRef: any): void {
    prevDialogRef.close();
    if (!this.dlgGuestStep2) {
      console.error('❌ Guest Step 2 dialog template not available');
      return;
    }
    this.dialog.open(this.dlgGuestStep2, { width: '600px', disableClose: true });
  }

  openGuestStep3(prevDialogRef: any): void {
    prevDialogRef.close();
    if (!this.dlgGuestStep3) {
      console.error('❌ Guest Step 3 dialog template not available');
      return;
    }
    this.dialog.open(this.dlgGuestStep3, { width: '600px', disableClose: true });
  }

  openGuestStep4(prevDialogRef: any): void {
    prevDialogRef.close();
    if (!this.dlgGuestStep4) {
      console.error('❌ Guest Step 4 dialog template not available');
      return;
    }
    this.dialog.open(this.dlgGuestStep4, { width: '720px', autoFocus: false, restoreFocus: false });
  }

  // ===== Old document form navigation methods =====
  openOldPupianStep2(prevDialogRef: any): void {
    prevDialogRef.close();
    if (!this.dlgOldPupianStep2) {
      console.error('❌ Old PUPian Step 2 dialog template not available');
      return;
    }
    this.dialog.open(this.dlgOldPupianStep2, { width: '600px', disableClose: true });
  }

  openOldPupianStep3(prevDialogRef: any): void {
    prevDialogRef.close();
    if (!this.dlgOldPupianStep3) {
      console.error('❌ Old PUPian Step 3 dialog template not available');
      return;
    }
    this.dialog.open(this.dlgOldPupianStep3, { width: '720px', autoFocus: false, restoreFocus: false });
  }

  openOldGuestStep2(prevDialogRef: any): void {
    prevDialogRef.close();
    if (!this.dlgOldGuestStep2) {
      console.error('❌ Old Guest Step 2 dialog template not available');
      return;
    }
    this.dialog.open(this.dlgOldGuestStep2, { width: '600px', disableClose: true });
  }

  openOldGuestStep3(prevDialogRef: any): void {
    prevDialogRef.close();
    if (!this.dlgOldGuestStep3) {
      console.error('❌ Old Guest Step 3 dialog template not available');
      return;
    }
    this.dialog.open(this.dlgOldGuestStep3, { width: '600px', disableClose: true });
  }

  openOldGuestStep4(prevDialogRef: any): void {
    prevDialogRef.close();
    if (!this.dlgOldGuestStep4) {
      console.error('❌ Old Guest Step 4 dialog template not available');
      return;
    }
    this.dialog.open(this.dlgOldGuestStep4, { width: '720px', autoFocus: false, restoreFocus: false });
  }

  // ===== Multi-step navigation methods (Legacy - for old documents) =====
  openAffiliationDialog(prevDialogRef: any): void {
    prevDialogRef.close();
    // Check user role to determine if PUP member or not
    // 'student' and 'group' are PUP members, 'guest' is non-PUP
    const isPUPMember = this.userRole === 'student' || this.userRole === 'group';
    const target = isPUPMember
      ? this.dlgUserAffiliation
      : this.dlgExternalAffiliation;
    this.dialog.open(target, { width: '600px', disableClose: true });
  }

  openRequestDetails(prevDialogRef: any): void {
    prevDialogRef.close();
    this.dialog.open(this.dlgRequestDetails, { width: '600px', disableClose: true });
  }

  openTerms(prevDialogRef: any): void {
    prevDialogRef.close();
    const ref = this.dialog.open(this.dlgTerms, { width: '720px', autoFocus: false, restoreFocus: false });
    ref.afterClosed().subscribe(agreed => {
      if (agreed === true) {
        this.finalizeRequestSubmission();
      }
    });
  }

  toggleChapter(chapter: string, checked: boolean): void {
    if (checked) {
      this.selectedChapters.add(chapter);
    } else {
      this.selectedChapters.delete(chapter);
    }
  }

  // Filter departments based on selected college
  onCollegeChange(): void {
    if (this.selectedCollege && this.departments[this.selectedCollege]) {
      this.filteredDepartments = this.departments[this.selectedCollege];
      this.selectedDepartment = ''; // Reset department when college changes
    } else {
      this.filteredDepartments = [];
      this.selectedDepartment = '';
    }
  }

  toggleRequestChapter(opt: string, checked: boolean): void {
    if (opt === 'All') {
      if (checked) this.requestOptions.forEach(o => this.selectedRequestChapters.add(o));
      else this.selectedRequestChapters.clear();
      return;
    }

    
    if (checked) this.selectedRequestChapters.add(opt);
    else this.selectedRequestChapters.delete(opt);


    const allOthersSelected = this.requestOptions
      .filter(o => o !== 'All')
      .every(o => this.selectedRequestChapters.has(o));

    if (allOthersSelected) this.selectedRequestChapters.add('All');
    else this.selectedRequestChapters.delete('All');
  }


  // ===== New methods for login and terms dialogs =====
  goToLogin(dialogRef: any): void {
    dialogRef.close();
    // Preserve current page so you can return after login
    this.router.navigate(['/login'], { queryParams: { redirectTo: this.router.url } });
  }

  openTermsAndSubmit(prevDialogRef?: any): void {
    
    // Optional: keep the original dialog open but block accidental outside close
    if (prevDialogRef) prevDialogRef.disableClose = true;

    this.termsAccepted = false; // reset each time
    
    if (!this.dlgTerms) {
      console.error('❌ [TERMS] Terms dialog template not available');
      alert('Error: Terms dialog not available. Please try again.');
      return;
    }
    
    const ref = this.dialog.open(this.dlgTerms, {
      width: '720px',
      autoFocus: false,
      restoreFocus: false
    });

    ref.afterClosed().subscribe(agreed => {
      if (agreed === true) {
        // Close the original request dialog and proceed
        if (prevDialogRef) prevDialogRef.close();
        this.finalizeRequestSubmission('pupian', 'active');
      } else {
        // User canceled; allow original dialog to be closed normally again
        if (prevDialogRef) prevDialogRef.disableClose = false;
      }
    });
  }

  // ===== Submission methods for Active Documents =====
  finalizeGuestRequest(dialogRef: any): void {
    dialogRef.close();
    this.finalizeRequestSubmission('guest', 'active');
  }

  // ===== Submission methods for Old Documents =====
  finalizeOldPupianRequest(dialogRef: any): void {
    dialogRef.close();
    this.finalizeRequestSubmission('pupian', 'old');
  }

  finalizeOldGuestRequest(dialogRef: any): void {
    dialogRef.close();
    this.finalizeRequestSubmission('guest', 'old');
  }

  // Your actual submit logic (API call, snackbar, etc.)
  finalizeRequestSubmission(formType: 'pupian' | 'guest' = 'pupian', docStatus: 'active' | 'old' = 'active'): void {
    
    // Validate that we have the required data
    if (!this.thesis?._id) {
      console.error('❌ [FINALIZE] No thesis ID available');
      alert('Error: Document information not available. Please try again.');
      return;
    }

    this.isSubmittingRequest = true; // Show loading state

    // Prepare chapters array
    const chapters = Array.from(this.selectedRequestChapters);

    // Determine user_type
    const userType = formType === 'pupian' ? 'student' : 'guest';

    // Build MongoDB payload (only long texts and arrays)
    const mongoPayload: any = {
      document_id: this.thesis._id,
      user_type: userType, // Only redundant field allowed
      chaptersRequested: chapters,
      purpose: this.requestPurpose.trim()
    };

    // Add old document specific long text fields
    if (docStatus === 'old') {
      mongoPayload.intendedUse = this.intendedUse.trim();
      if (this.howDidYouLearn) {
        mongoPayload.howDidYouLearn = this.howDidYouLearn.trim();
      }
    }

    // Build structured data for PostgreSQL table (sent separately, not in MongoDB)
    const structuredData: any = {
      user_type: userType,
      email: formType === 'pupian' ? this.currentUserEmail.trim() : this.guestEmail.trim(),
      program: formType === 'pupian' ? this.studentProgram : this.guestProgram.trim(),
      department: formType === 'pupian' ? this.studentDepartment : this.guestDepartment.trim(),
      role: formType === 'pupian' ? this.pupianRole : this.guestRole
    };

    // Add guest-specific structured fields
    if (formType === 'guest') {
      structuredData.full_name = this.guestFullName.trim();
      structuredData.city = this.guestCity.trim();
      structuredData.country = this.guestCountry.trim();
      structuredData.school = this.guestSchool.trim();
    }

    // Add old document specific structured fields
    if (docStatus === 'old') {
      const supervisor = formType === 'pupian' ? this.oldPupianSupervisor : this.oldGuestSupervisor;
      if (supervisor) {
        structuredData.supervisor = supervisor.trim();
      }
      structuredData.consent_to_contact = this.consentToContact;
      if (this.consentToContact) {
        structuredData.preferred_contact_method = this.preferredContactMethod;
      }
      // Add contact number
      const contactNumber = formType === 'pupian' ? this.oldPupianContactNumber : this.oldGuestContactNumber;
      if (contactNumber) {
        structuredData.contact_number = contactNumber.trim();
      }
    }

    // Combine payload (MongoDB fields + structured data for table)
    const requestPayload: any = {
      ...mongoPayload,
      ...structuredData
    };

    // Debug: Log all required fields to help identify missing ones
    console.log('[FINALIZE] Request payload:', {
      document_id: requestPayload.document_id,
      user_type: requestPayload.user_type,
      email: requestPayload.email,
      purpose: requestPayload.purpose,
      purposeLength: requestPayload.purpose?.length || 0,
      chaptersRequested: requestPayload.chaptersRequested,
      chaptersLength: requestPayload.chaptersRequested?.length || 0,
      hasAllRequired: !!(
        requestPayload.document_id &&
        requestPayload.user_type &&
        requestPayload.email &&
        requestPayload.purpose &&
        Array.isArray(requestPayload.chaptersRequested)
      )
    });


    // Call backend API
    this.http.post(`${environment.authApiUrl}/requests/`, requestPayload).subscribe({
      next: (response: any) => {
        this.isSubmittingRequest = false;
        
        // Show success message
        alert(`Request submitted successfully! Request ID: ${response.requestId}`);
        
        // Reset form
        this.resetRequestDialog();
      },
      error: (error) => {
        console.error('❌ [FINALIZE] Error response:', error);
        this.isSubmittingRequest = false;
        
        // Handle different types of errors
        let errorMessage = 'Failed to submit request. Please try again.';
        
        if (error.status === 400) {
          errorMessage = error.error?.error || 'Invalid request data. Please check your information.';
        } else if (error.status === 429) {
          errorMessage = 'Too many requests. Please wait a moment before trying again.';
        } else if (error.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        } else if (error.status === 0) {
          errorMessage = 'Network error. Please check your connection.';
        }
        
        alert(`Error: ${errorMessage}`);
      }
    });
  }

  // Validation helper for contact number (numbers only)
  isValidContactNumber(contactNumber: string): boolean {
    if (!contactNumber) return false;
    return /^[0-9]+$/.test(contactNumber);
  }

  // Get current user email from AuthService
  private getCurrentUserEmail(): string {
    const currentUser = this.authService.currentUser;
    return currentUser?.email || currentUser?.Email || '';
  }

  private getCurrentUserCourse(): string {
    const currentUser = this.authService.currentUser;
    const department = currentUser?.Department || '';
    

    
    // Map department codes to full college names for Program dropdown
    const departmentMapping: { [key: string]: string } = {
      'OUS': 'OPEN UNIVERSITY SYSTEM',
      'CAF': 'COLLEGE OF ACCOUNTANCY AND FINANCE',
      'CADBE': 'COLLEGE OF ARCHITECTURE, DESIGN AND THE BUILT ENVIRONMENT',
      'CAL': 'COLLEGE OF ARTS AND LETTERS',
      'CBA': 'COLLEGE OF BUSINESS ADMINISTRATION',
      'COC': 'COLLEGE OF COMMUNICATION',
      'CCIS': 'COLLEGE OF COMPUTER AND INFORMATION SCIENCES',
      'COED': 'COLLEGE OF EDUCATION',
      'CE': 'COLLEGE OF ENGINEERING',
      'CHK': 'COLLEGE OF HUMAN KINETICS',
      'CSSD': 'COLLEGE OF SOCIAL SCIENCES AND DEVELOPMENT',
      'CS': 'COLLEGE OF SCIENCE'
    };
    
    const result = departmentMapping[department] || department || '';
    return result;
  }

  private getCurrentUserDepartment(): string {
    const currentUser = this.authService.currentUser;
    const course = currentUser?.Course || '';

    // Map course codes to full course names
    const courseMapping: { [key: string]: string } = {
      // OUS - Open University System
      'DBA': 'Doctor of Business Administration',
      'D.ENG': 'Doctor of Engineering',
      'PHDEM': 'Doctor of Philosophy in Development Management',
      'DPA': 'Doctor of Public Administration',
      'MC': 'Master of Communication',
      'MBA': 'Master of Business Administration',
      'MAEM': 'Master of Arts in Educational Management',
      'MIT': 'Master of Information Technology',
      'MPA': 'Master of Public Administration',
      
      // CAF - College of Accountancy and Finance
      'BSA': 'Bachelor of Science in Accountancy',
      'BSBAFM': 'Bachelor of Science in Business Administration Major in Financial Management',
      'BSMA': 'Bachelor of Science in Management Accounting',
      
      // CADBE - College of Architecture, Design and the Built Environment
      'BSARCH': 'Bachelor of Science in Architecture',
      'BSID': 'Bachelor of Science in Interior Design',
      'BSEP': 'Bachelor of Science in Environmental Planning',
      
      // CAL - College of Arts and Letters
      'ABELS': 'Bachelor of Arts in English Language Studies',
      'ABF': 'Bachelor of Arts in Filipino',
      'ABLCS': 'Bachelor of Arts in Literary and Cultural Studies',
      'ABPHILO': 'Bachelor of Arts in Philosophy',
      'BPEA': 'Bachelor of Performing Arts',
      
      // CBA - College of Business Administration
      'BSBAHRM': 'Bachelor of Science in Business Administration Major in Human Resource Management',
      'BSBAMM': 'Bachelor of Science in Business Administration Major in Marketing Management',
      'BSENTREP': 'Bachelor of Science in Entrepreneurship',
      'BSOA': 'Bachelor of Science in Office Administration',
      
      // COC - College of Communication
      'BADPR': 'Bachelor of Arts in Advertising and Public Relations',
      'BAB': 'Bachelor of Arts in Broadcasting',
      'BACR': 'Bachelor of Arts in Communication Research',
      'BAJ': 'Bachelor of Arts in Journalism',
      
      // CCIS - College of Computer and Information Sciences
      'BSCS': 'Bachelor of Science in Computer Science',
      'BSIT': 'Bachelor of Science in Information Technology',
      
      // COED - College of Education
      'MBE': 'Master in Business Education',
      'MLIS': 'Master of Library and Information Science',
      'MAELT': 'Master of Arts in English Language Teaching',
      'MAEDME': 'Master of Arts in Educational Management',
      'MAPES': 'Master of Arts in Physical Education and Sports',
      'MAEDTCA': 'Master of Arts in Education Major in Teaching in the Challenged Areas',
      'PBDE': 'Post Baccalaureate Diploma in Education',
      
      // CE - College of Engineering
      'BSCE': 'Bachelor of Science in Civil Engineering',
      'BSCPE': 'Bachelor of Science in Computer Engineering',
      'BSEE': 'Bachelor of Science in Electrical Engineering',
      'BSECE': 'Bachelor of Science in Electronics and Communications Engineering',
      'BSIE': 'Bachelor of Science in Industrial Engineering',
      'BSME': 'Bachelor of Science in Mechanical Engineering',
      'BSRE': 'Bachelor of Science in Railway Engineering',
      
      // CHK - College of Human Kinetics
      'BPE': 'Bachelor of Physical Education',
      'BSESS': 'Bachelor of Science in Exercise and Sports Sciences',
      
      // CSSD - College of Social Sciences and Development
      'BAH': 'Bachelor of Arts in History',
      'BAS': 'Bachelor of Arts in Sociology',
      'BSC': 'Bachelor of Science in Cooperatives',
      'BSE': 'Bachelor of Science in Economics',
      'BSPSY': 'Bachelor of Science in Psychology',
      
      // CS - College of Science
      'BSFT': 'Bachelor of Science in Food Technology',
      'BSAPMATH': 'Bachelor of Science in Applied Mathematics',
      'BSBIO': 'Bachelor of Science in Biology',
      'BSCHEM': 'Bachelor of Science in Chemistry',
      'BSMATH': 'Bachelor of Science in Mathematics',
      'BSND': 'Bachelor of Science in Nutrition and Dietetics',
      'BSPHY': 'Bachelor of Science in Physics'
    };
    
    const result = courseMapping[course] || course || '';
    return result;
  }

  // Prevent copy/paste actions on thesis content
  preventAction(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  // Block keyboard shortcuts for copying (basic protection only)
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    // Block Ctrl+A (Select All), Ctrl+C (Copy), Ctrl+V (Paste), Ctrl+X (Cut)
    if (event.ctrlKey && ['a', 'c', 'v', 'x'].includes(event.key.toLowerCase())) {
      // Check if the event target is within protected content
      const target = event.target as HTMLElement;
      if (target && target.closest('.protected-content')) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    }
  }

  generateCitation(format: 'apa' | 'mla'): void {
    
    if (!this.thesis || this.citationCopied) {
      return;
    }

    if (format === 'apa') {
      this.copiedFormat = 'APA';
      this.generateAPACitation();
    } else if (format === 'mla') {
      this.copiedFormat = 'MLA';
      this.generateMLACitation();
    }
  }

  private generateAPACitation(): void {

    // Convert authors to APA format: "Last, F. M., Last, F. M., & Last, F. M."
    
    let authorsRaw: string[];
    if (typeof this.thesis.authors === 'string') {
      authorsRaw = this.thesis.authors.split(',');
    } else if (Array.isArray(this.thesis.authors)) {
      authorsRaw = this.thesis.authors;
    } else {
      authorsRaw = ['Unknown Author'];
    }
    const authorsFormatted = authorsRaw.map((author: string) => {
      const parts = author.trim().split(' ');
      const lastName = parts.pop(); // last word is last name
      const initials = parts.map(n => n.charAt(0).toUpperCase() + '.').join(' ');
      return `${lastName}, ${initials}`;
    });

    let authorsAPA = '';
    if (authorsFormatted.length === 1) {
      authorsAPA = authorsFormatted[0];
    } else if (authorsFormatted.length === 2) {
      authorsAPA = authorsFormatted.join(' & ');
    } else {
      authorsAPA = authorsFormatted.slice(0, -1).join(', ') + ', & ' + authorsFormatted.slice(-1);
    }

    // Year (APA needs only year, not full date)
    // First check for direct year field, then try submitted_at, finally fallback to 'n.d.'
    const year = this.thesis.year 
      || (this.thesis.submitted_at ? new Date(this.thesis.submitted_at).getFullYear() : null)
      || 'n.d.';

    // Title in sentence case for APA 7th edition (only first word and proper nouns capitalized)
    // Normalize spaces (remove double spaces) and trim
    const title = this.thesis.title
      ? this.toSentenceCase(this.thesis.title.replace(/\s+/g, ' ').trim())
      : 'Untitled';

    // Thesis type
    const thesisType = this.thesis.document_type || 'Capstone Project';

    const university = 'Polytechnic University of the Philippines';

    // APA 7th edition format: Author (Year). *Title in italics* [Thesis type, Institution].
    const apaCitation = `${authorsAPA} (${year}). *${title}* [${thesisType}, ${university}].`;

    // Copy to clipboard with fallback
    
    // Check if clipboard API is available
    if (navigator.clipboard && window.isSecureContext) {
      // Modern clipboard API
      navigator.clipboard.writeText(apaCitation).then(() => {
        this.citationCopied = true;
        setTimeout(() => {
          this.citationCopied = false;
          this.copiedFormat = '';
        }, 2000);
      }).catch(err => {
        console.error('❌ Clipboard API failed:', err);
        this.fallbackCopyTextToClipboard(apaCitation);
      });
    } else {
      // Fallback for older browsers or non-secure contexts
      this.fallbackCopyTextToClipboard(apaCitation);
    }
  }

  private generateMLACitation(): void {
    
    let authorsRaw: string[];
    if (typeof this.thesis.authors === 'string') {
      authorsRaw = this.thesis.authors.split(',');
    } else if (Array.isArray(this.thesis.authors)) {
      authorsRaw = this.thesis.authors;
    } else {
      authorsRaw = ['Unknown Author'];
    }
    
    // MLA 9th edition author formatting
    let authorsMLA = '';
    if (authorsRaw.length === 1) {
      // Single author: Last, First
      const parts = authorsRaw[0].trim().split(' ');
      const lastName = parts.pop() || '';
      const firstName = parts.join(' ');
      authorsMLA = `${lastName}, ${firstName}`;
    } else if (authorsRaw.length === 2) {
      // Two authors: Last1, First1, and First2 Last2
      const author1Parts = authorsRaw[0].trim().split(' ');
      const lastName1 = author1Parts.pop() || '';
      const firstName1 = author1Parts.join(' ');
      
      const author2Parts = authorsRaw[1].trim().split(' ');
      const lastName2 = author2Parts.pop() || '';
      const firstName2 = author2Parts.join(' ');
      
      authorsMLA = `${lastName1}, ${firstName1}, and ${firstName2} ${lastName2}`;
    } else if (authorsRaw.length >= 3) {
      // Three or more authors: Last1, First1, First2 Last2, First3 Last3, and FirstN LastN
      const author1Parts = authorsRaw[0].trim().split(' ');
      const lastName1 = author1Parts.pop() || '';
      const firstName1 = author1Parts.join(' ');
      
      // Format remaining authors as "First Last"
      const remainingAuthors = authorsRaw.slice(1).map((author: string) => {
        const parts = author.trim().split(' ');
        const lastName = parts.pop() || '';
        const firstName = parts.join(' ');
        return `${firstName} ${lastName}`;
      });
      
      // Join with commas, and "and" before the last author
      if (remainingAuthors.length === 1) {
        authorsMLA = `${lastName1}, ${firstName1}, and ${remainingAuthors[0]}`;
      } else {
        const lastAuthor = remainingAuthors.pop();
        authorsMLA = `${lastName1}, ${firstName1}, ${remainingAuthors.join(', ')}, and ${lastAuthor}`;
      }
    }

    // Year
    // First check for direct year field, then try submitted_at, finally fallback to 'n.d.'
    const year = this.thesis.year 
      || (this.thesis.submitted_at ? new Date(this.thesis.submitted_at).getFullYear() : null)
      || 'n.d.';

    // Title in title case for MLA (capitalize each major word) with italics
    // Normalize spaces (remove double spaces) and trim
    const title = this.thesis.title 
      ? this.toTitleCase(this.thesis.title.replace(/\s+/g, ' ').trim())
      : 'Untitled';

    const university = 'Polytechnic University of the Philippines';
    const thesisType = this.thesis.document_type || 'Capstone Project';

    // MLA 9th edition format: Author. *Title*. Year. Institution, Type.
    // Remove any trailing period from authorsMLA to avoid double periods
    const mlaCitation = `${authorsMLA.replace(/\.$/, '')}. *${title}*. ${year}. ${university}, ${thesisType}.`;

    // Copy to clipboard with fallback
    
    // Check if clipboard API is available
    if (navigator.clipboard && window.isSecureContext) {
      // Modern clipboard API
      navigator.clipboard.writeText(mlaCitation).then(() => {
        this.citationCopied = true;
        setTimeout(() => {
          this.citationCopied = false;
          this.copiedFormat = '';
        }, 2000);
      }).catch(err => {
        console.error('❌ Clipboard API failed:', err);
        this.fallbackCopyTextToClipboard(mlaCitation);
      });
    } else {
      // Fallback for older browsers or non-secure contexts
      this.fallbackCopyTextToClipboard(mlaCitation);
    }
  }

  fallbackCopyTextToClipboard(text: string): void {
    // Create temporary textarea element
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // Avoid scrolling to bottom
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.position = 'fixed';
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        this.citationCopied = true;
        setTimeout(() => {
          this.citationCopied = false;
          this.copiedFormat = '';
        }, 2000);
      } else {
        console.error('❌ Fallback copy failed');
        alert(`Citation (copy manually):\n\n${text}`);
      }
    } catch (err) {
      console.error('❌ Fallback copy error:', err);
      alert(`Citation (copy manually):\n\n${text}`);
    }
    
    document.body.removeChild(textArea);
  }

  private toTitleCase(str: string): string {
    // Words that should stay lowercase in titles (except when first word or after colon)
    const articles = ['a', 'an', 'the'];
    const prepositions = ['in', 'on', 'at', 'by', 'for', 'with', 'without', 'to', 'from', 'up', 'down', 'of', 'and', 'or', 'but'];
    const exceptions = [...articles, ...prepositions];
    
    let capitalizeNext = true; // Start with true to capitalize first word
    
    return str.toLowerCase().split(' ').map((word) => {
      // Check if previous word ended with a colon (word after colon should be capitalized)
      const shouldCapitalize = capitalizeNext || !exceptions.includes(word.replace(/[^a-z]/gi, ''));
      
      // Check if this word ends with a colon for the next word
      capitalizeNext = word.endsWith(':');
      
      if (shouldCapitalize) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word;
    }).join(' ');
  }

  private toSentenceCase(str: string): string {
    // APA 7th edition: Only capitalize the first word and proper nouns
    // Also capitalize the first word after a colon
    if (!str) return str;
    
    return str.toLowerCase().split(': ').map((segment, index) => {
      // Capitalize the first letter of each segment (after colon)
      if (segment.length > 0) {
        return segment.charAt(0).toUpperCase() + segment.slice(1);
      }
      return segment;
    }).join(': ');
  }

  /** Format array or string with proper spacing after commas */
  formatList(value: string | string[] | null | undefined): string {
    if (!value) return '';
    
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    
    // If it's a string, ensure proper spacing after commas
    return value.replace(/,(?!\s)/g, ', ');
  }
}
