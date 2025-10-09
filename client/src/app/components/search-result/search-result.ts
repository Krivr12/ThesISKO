import { Component, TemplateRef, ViewChild, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

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
import { NgIf, NgFor, DatePipe } from '@angular/common';
import { Footer } from "../footer/footer";
import { Navbar, AuthService } from "../navbar/navbar";

type UserRole = 'student' | 'guest' | 'group';

@Component({
  selector: 'app-search-result',
  standalone: true,
  imports: [
    Footer, Navbar,
    NgIf, NgFor, DatePipe, CommonModule, FormsModule,
    MatDialogModule, MatCheckboxModule, MatFormFieldModule, MatInputModule, MatButtonModule,
    MatSelectModule, MatDividerModule,
    HttpClientModule, MatOptionModule
  ],
  templateUrl: './search-result.html',
  styleUrls: ['./search-result.css']
})
export class SearchResult implements OnInit {
  // ===== Templates for role-based dialogs =====
  @ViewChild('dlgRequestAccessStudent', { static: true }) dlgStudent!: TemplateRef<any>;
  @ViewChild('dlgRequestAccessGuest', { static: true }) dlgGuest!: TemplateRef<any>;
  @ViewChild('dlgLoginRequired') dlgLoginRequired!: TemplateRef<any>;
  @ViewChild('dlgTerms') dlgTerms!: TemplateRef<any>;

  thesis: any; // Store thesis passed from router
  citationCopied = false; // Track if citation was just copied
  copiedFormat = ''; // Track which format was copied (APA/MLA)

  constructor(
    private router: Router,
    private dialog: MatDialog,
    private http: HttpClient,
    private authService: AuthService
  ) {
    const nav = this.router.getCurrentNavigation();
    if (nav?.extras?.state && nav.extras.state['thesis']) {
      this.thesis = nav.extras.state['thesis'];
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

  private initializeUserRole(): void {
    this.currentUserEmail = this.getCurrentUserEmail();
    this.userRole = this.deriveRole(this.currentUserEmail);
    
    // Debug: Show what user data we actually have
    const currentUser = this.authService.currentUser;
    console.log('DEBUG - Full user object:', currentUser);
    console.log('DEBUG - Available properties:', currentUser ? Object.keys(currentUser) : 'No user');
    console.log('DEBUG - Course property:', currentUser?.Course);
    console.log('DEBUG - Department property:', currentUser?.Department);
    
    // Auto-select course and department for students based on their account data
    if (this.userRole === 'student') {
      this.studentProgram = this.getCurrentUserCourse();
      this.studentDepartment = this.getCurrentUserDepartment();
      
    }
    
    console.log('User role initialized:', { 
      email: this.currentUserEmail, 
      role: this.userRole,
      preselectedCourse: this.studentProgram,
      preselectedDepartment: this.studentDepartment
    });
  }

  // ===== Auth / identity =====
  currentUserEmail = '';
  userRole: UserRole = 'guest';

  // ===== Checkbox options =====
  requestOptions = ['Chapter 1', 'Chapter 2', 'Chapter 3', 'Chapter 4', 'Chapter 5', 'All'] as const;
  selectedRequestChapters = new Set<string>();

  // ===== Common form fields =====
  requestPurpose = '';
  termsAccepted = false;

  // ===== Student-only fields =====
  studentProgram: string = '';
  studentDepartment: string = '';

  // ===== Guest-only fields =====
  requestEmail = '';       // guest email
  touchGuestEmail = false;
  guestCountry: string = '';
  guestCity: string = '';
  guestSchool: string = '';

  onReturnClick(): void {
    this.router.navigate(['/search-thesis']);
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
  // Student: email, program, department auto-filled from account; needs purpose, chapters
  get studentFormValid(): boolean {
    return this.chaptersValid && this.purposeValid && !!this.studentProgram && !!this.studentDepartment;
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
    console.log('🔍 getFilteredDepartmentOptions called:', {
      studentProgram: this.studentProgram,
      hasMapping: !!this.programToDepartments[this.studentProgram],
      availablePrograms: Object.keys(this.programToDepartments),
      resultLength: (this.programToDepartments[this.studentProgram] || []).length
    });
    
    const result = this.programToDepartments[this.studentProgram] || [];
    
    // If no departments found and we have a program, try to find a close match
    if (result.length === 0 && this.studentProgram) {
      console.warn('⚠️ No departments found for program:', this.studentProgram);
      console.log('Available program keys:', Object.keys(this.programToDepartments));
    }
    
    return result;
  }

  // TrackBy function for department options to optimize rendering
  trackDepartmentBy(index: number, item: {value: string, label: string}): string {
    return item.value;
  }

  // Handle program selection change
  onProgramChange(): void {
    console.log('🔄 Program changed to:', this.studentProgram);
    
    // Clear department selection if the current selection is not valid for the new program
    const validDepartments = this.getFilteredDepartmentOptions().map(d => d.value);
    console.log('🔍 Valid departments for new program:', validDepartments);
    
    if (this.studentDepartment && !validDepartments.includes(this.studentDepartment)) {
      console.log('🔄 Clearing invalid department:', this.studentDepartment);
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
    return this.chaptersValid && this.purposeValid &&
           this.isGmail(this.requestEmail) &&
           !!this.guestCountry && !!this.guestCity && !!this.guestSchool;
  }
  private get purposeValid(): boolean {
    return (this.requestPurpose?.trim().length ?? 0) >= 8;
  }
  private get chaptersValid(): boolean {
    return this.selectedRequestChapters.size > 0;
  }

  // ===== UI actions =====
  openRequestDialog(): void {
    // Check if user is logged in
    if (!this.currentUserEmail) {
      // Show login required dialog
      this.dialog.open(this.dlgLoginRequired, { width: '500px', autoFocus: false });
      return;
    }
    
    this.resetRequestDialog();
    // Students and groups use the student template, guests use the guest template
    const tpl = (this.userRole === 'student' || this.userRole === 'group') ? this.dlgStudent : this.dlgGuest;
    this.dialog.open(tpl, { width: '640px', autoFocus: false });
  }

  resetRequestDialog(): void {
    this.selectedRequestChapters.clear();
    this.requestPurpose = '';

    // student fields
    // (keep email from auth and auto-select course/department based on user account)
    if (this.userRole === 'student') {
      this.studentProgram = this.getCurrentUserCourse();
      this.studentDepartment = this.getCurrentUserDepartment();
    } else if (this.userRole === 'group') {
      // Groups can also use program/department if needed
      this.studentProgram = this.getCurrentUserCourse();
      this.studentDepartment = this.getCurrentUserDepartment();
    } else {
      this.studentProgram = '';
      this.studentDepartment = '';
    }

    // guest fields
    this.requestEmail = '';
    this.touchGuestEmail = false;
    this.guestCountry = '';
    this.guestCity = '';
    this.guestSchool = '';
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

  confirmRequest(dialogRef: any): void {
    const chapters = this.selectedRequestChapters.has('All')
      ? this.requestOptions.filter(o => o !== 'All')
      : Array.from(this.selectedRequestChapters);

    const base = {
      role: this.userRole,
      purpose: this.requestPurpose.trim(),
      chapters,
      thesis_id: this.thesis?.id ?? null
    };

    const payload =
      this.userRole === 'student'
        ? {
            ...base,
            email: this.currentUserEmail,
            program: this.studentProgram,
            department: this.studentDepartment
          }
        : this.userRole === 'group'
        ? {
            ...base,
            email: this.currentUserEmail,
            group_id: this.authService.currentUser?.group_id,
            leader_name: this.authService.currentUser?.leader_name
          }
        : {
            ...base,
            email: this.requestEmail.trim(),
            country: this.guestCountry.trim(),
            city: this.guestCity.trim(),
            school: this.guestSchool.trim()
          };

    // TODO: replace with your real endpoint
    // this.http.post('/api/access-requests', payload).subscribe({
    //   next: () => dialogRef.close(payload),
    //   error: err => console.error('Request failed', err)
    // });

    console.log('Sending access request:', payload);
    dialogRef.close(payload);
    this.resetRequestDialog();
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
    const ref = this.dialog.open(this.dlgTerms, {
      width: '720px',
      autoFocus: false,
      restoreFocus: false
    });

    ref.afterClosed().subscribe(agreed => {
      if (agreed === true) {
        // Close the original request dialog and proceed
        if (prevDialogRef) prevDialogRef.close();
        this.finalizeRequestSubmission();
      } else {
        // User canceled; allow original dialog to be closed normally again
        if (prevDialogRef) prevDialogRef.disableClose = false;
      }
    });
  }

  // Your actual submit logic (API call, snackbar, etc.)
  finalizeRequestSubmission(): void {
    // TODO: replace with your real submit call
    // this.requestService.submit({...}).subscribe(...)
    // Example placeholder:
    // this.snack.open('Request sent. Please watch your email for updates.', 'Close', { duration: 3000 });

    console.log('Request submitted!');
  }

  // Get current user email from AuthService
  private getCurrentUserEmail(): string {
    const currentUser = this.authService.currentUser;
    return currentUser?.email || currentUser?.Email || '';
  }

  private getCurrentUserCourse(): string {
    const currentUser = this.authService.currentUser;
    const department = currentUser?.Department || '';
    
    console.log('🔍 Course Debug (now returning college names):', {
      hasCurrentUser: !!currentUser,
      department: department,
      departmentType: typeof department,
      allUserKeys: currentUser ? Object.keys(currentUser) : 'no user',
      fullUser: currentUser
    });
    
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
    console.log('🔍 Course Result (college name):', { input: department, mapped: result });
    return result;
  }

  private getCurrentUserDepartment(): string {
    const currentUser = this.authService.currentUser;
    const course = currentUser?.Course || '';
    
    console.log('🔍 Department Debug (now returning full course names):', {
      hasCurrentUser: !!currentUser,
      course: course,
      courseType: typeof course,
      allUserKeys: currentUser ? Object.keys(currentUser) : 'no user',
      fullUser: currentUser
    });
    
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
    console.log('🔍 Department Result (full course name):', { input: course, mapped: result });
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
    console.log(`🔥 ${format.toUpperCase()} CITATION CLICKED!`);
    console.log('generateCitation called', { thesis: this.thesis, citationCopied: this.citationCopied, format });
    
    if (!this.thesis || this.citationCopied) {
      console.log('❌ Returning early:', { hasThesis: !!this.thesis, citationCopied: this.citationCopied });
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
    console.log('Authors data:', this.thesis.authors, typeof this.thesis.authors);
    
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
    const year = this.thesis.submitted_at
      ? new Date(this.thesis.submitted_at).getFullYear()
      : 'n.d.';

    // Title in sentence case (only first word + proper nouns capitalized)
    const title = this.thesis.title
      ? this.thesis.title.charAt(0).toUpperCase() +
        this.thesis.title.slice(1).toLowerCase()
      : 'Untitled';

    // Thesis type
    const thesisType = this.thesis.document_type || 'Thesis';

    const university = 'Polytechnic University of the Philippines';

    // APA 7th edition format
    const apaCitation = `${authorsAPA} (${year}). ${title} [${thesisType}, ${university}].`;

    // Copy to clipboard with fallback
    console.log('Generated APA citation:', apaCitation);
    
    // Check if clipboard API is available
    if (navigator.clipboard && window.isSecureContext) {
      // Modern clipboard API
      navigator.clipboard.writeText(apaCitation).then(() => {
        console.log('✅ Successfully copied to clipboard');
        this.citationCopied = true;
        setTimeout(() => {
          this.citationCopied = false;
          this.copiedFormat = '';
          console.log('Reset citationCopied to false');
        }, 2000);
      }).catch(err => {
        console.error('❌ Clipboard API failed:', err);
        this.fallbackCopyTextToClipboard(apaCitation);
      });
    } else {
      // Fallback for older browsers or non-secure contexts
      console.log('📋 Using fallback copy method');
      this.fallbackCopyTextToClipboard(apaCitation);
    }
  }

  private generateMLACitation(): void {
    // Convert authors to MLA format: "Last, First M., et al." or "Last, First M."
    console.log('Authors data:', this.thesis.authors, typeof this.thesis.authors);
    
    let authorsRaw: string[];
    if (typeof this.thesis.authors === 'string') {
      authorsRaw = this.thesis.authors.split(',');
    } else if (Array.isArray(this.thesis.authors)) {
      authorsRaw = this.thesis.authors;
    } else {
      authorsRaw = ['Unknown Author'];
    }
    
    // MLA author formatting
    let authorsMLA = '';
    if (authorsRaw.length === 1) {
      // Single author: Last, First
      const parts = authorsRaw[0].trim().split(' ');
      const lastName = parts.pop() || '';
      const firstName = parts.join(' ');
      authorsMLA = `${lastName}, ${firstName}`;
    } else if (authorsRaw.length === 2) {
      // Two authors: Last1, First1, and Last2 First2
      const author1Parts = authorsRaw[0].trim().split(' ');
      const lastName1 = author1Parts.pop() || '';
      const firstName1 = author1Parts.join(' ');
      
      const author2Parts = authorsRaw[1].trim().split(' ');
      const lastName2 = author2Parts.pop() || '';
      const firstName2 = author2Parts.join(' ');
      
      authorsMLA = `${lastName1}, ${firstName1}, and ${firstName2} ${lastName2}`;
    } else if (authorsRaw.length === 3) {
      // Three authors: Last1, First1, Last2 First2, and Last3 First3
      const author1Parts = authorsRaw[0].trim().split(' ');
      const lastName1 = author1Parts.pop() || '';
      const firstName1 = author1Parts.join(' ');
      
      const author2Parts = authorsRaw[1].trim().split(' ');
      const lastName2 = author2Parts.pop() || '';
      const firstName2 = author2Parts.join(' ');
      
      const author3Parts = authorsRaw[2].trim().split(' ');
      const lastName3 = author3Parts.pop() || '';
      const firstName3 = author3Parts.join(' ');
      
      authorsMLA = `${lastName1}, ${firstName1}, ${firstName2} ${lastName2}, and ${firstName3} ${lastName3}`;
    } else if (authorsRaw.length > 3) {
      // More than 3 authors: Last1, First1, et al.
      const firstAuthor = authorsRaw[0].trim().split(' ');
      const lastName = firstAuthor.pop() || '';
      const firstName = firstAuthor.join(' ');
      authorsMLA = `${lastName}, ${firstName}, et al.`;
    }

    // Year
    const year = this.thesis.submitted_at
      ? new Date(this.thesis.submitted_at).getFullYear()
      : 'n.d.';

    // Title in title case for MLA (capitalize each major word)
    const title = this.thesis.title 
      ? this.toTitleCase(this.thesis.title)
      : 'Untitled';

    const university = 'Polytechnic University of the Philippines';
    const thesisType = this.thesis.document_type || 'Thesis';

    // MLA 8th edition format: Author. *Title in Italics.* Year, Institution, Type.
    // Remove any trailing period from authorsMLA to avoid double periods
    const mlaCitation = `${authorsMLA.replace(/\.$/, '')}. *${title}.* ${year}, ${university}, ${thesisType}.`;

    // Copy to clipboard with fallback
    console.log('Generated MLA citation:', mlaCitation);
    
    // Check if clipboard API is available
    if (navigator.clipboard && window.isSecureContext) {
      // Modern clipboard API
      navigator.clipboard.writeText(mlaCitation).then(() => {
        console.log('✅ Successfully copied to clipboard');
        this.citationCopied = true;
        setTimeout(() => {
          this.citationCopied = false;
          this.copiedFormat = '';
          console.log('Reset citationCopied to false');
        }, 2000);
      }).catch(err => {
        console.error('❌ Clipboard API failed:', err);
        this.fallbackCopyTextToClipboard(mlaCitation);
      });
    } else {
      // Fallback for older browsers or non-secure contexts
      console.log('📋 Using fallback copy method');
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
        console.log('✅ Fallback copy successful');
        this.citationCopied = true;
        setTimeout(() => {
          this.citationCopied = false;
          this.copiedFormat = '';
          console.log('Reset citationCopied to false');
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
    // Words that should stay lowercase in titles (except when first word)
    const articles = ['a', 'an', 'the'];
    const prepositions = ['in', 'on', 'at', 'by', 'for', 'with', 'without', 'to', 'from', 'up', 'down', 'of', 'and', 'or', 'but'];
    const exceptions = [...articles, ...prepositions];
    
    return str.toLowerCase().split(' ').map((word, index) => {
      // Always capitalize first word, or if not in exceptions list
      if (index === 0 || !exceptions.includes(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word;
    }).join(' ');
  }
}
