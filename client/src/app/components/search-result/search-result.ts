import { Component, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule, NgIf, NgFor, DatePipe } from '@angular/common';
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

import { Footer } from "../footer/footer";
import { Navbar } from "../navbar/navbar";

type UserRole = 'student' | 'guest';

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
export class SearchResult {
  // ===== Templates for role-based dialogs =====
  @ViewChild('dlgRequestAccessStudent', { static: true }) dlgStudent!: TemplateRef<any>;
  @ViewChild('dlgRequestAccessGuest', { static: true }) dlgGuest!: TemplateRef<any>;

  thesis: any; // Store thesis passed from router

  constructor(
    private router: Router,
    private dialog: MatDialog,
    private http: HttpClient
  ) {
    const nav = this.router.getCurrentNavigation();
    if (nav?.extras?.state && nav.extras.state['thesis']) {
      this.thesis = nav.extras.state['thesis'];
    } else {
      this.router.navigate(['/search-thesis']);
    }

    // Initialize current user and role
    this.currentUserEmail = this.getCurrentUserEmail();
    this.userRole = this.deriveRole(this.currentUserEmail);
  }

  // ===== Auth / identity =====
  currentUserEmail = '';
  userRole: UserRole = 'guest';

  // ===== Checkbox options =====
  requestOptions = ['Chapter 1', 'Chapter 2', 'Chapter 3', 'Chapter 4', 'Chapter 5', 'All'] as const;
  selectedRequestChapters = new Set<string>();

  // ===== Common form fields =====
  requestPurpose = '';

  // ===== Student-only fields =====
  studentProgram: string = '';
  studentDepartment: string = '';

  // ===== Guest-only fields =====
  requestEmail = '';       // guest email
  touchGuestEmail = false;
  guestCountry: string = '';
  guestCity: string = '';
  guestSchool: string = '';

  // ===== Role helpers =====
  private deriveRole(email: string): UserRole {
    if (/@iskolarngbayan\.pup\.edu\.ph$/i.test(email || '')) return 'student';
    return 'guest';
  }
  isGmail(email: string): boolean {
    return /^[^@\s]+@gmail\.com$/i.test((email || '').trim());
  }

  // ===== Validation helpers =====
  // Student: email from auth; needs program, department, purpose, chapters
  get studentFormValid(): boolean {
    return this.chaptersValid && this.purposeValid && !!this.studentProgram && !!this.studentDepartment;
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
    this.resetRequestDialog();
    const tpl = this.userRole === 'student' ? this.dlgStudent : this.dlgGuest;
    this.dialog.open(tpl, { width: '640px', autoFocus: false });
  }

  resetRequestDialog(): void {
    this.selectedRequestChapters.clear();
    this.requestPurpose = '';

    // student fields
    // (keep email from auth; do not reset)
    this.studentProgram = '';
    this.studentDepartment = '';

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

  onReturnClick(): void {
    this.router.navigate(['/search-thesis']);
  }

  // Replace with your real auth source
  private getCurrentUserEmail(): string {
    // e.g., return this.authService.currentUser?.email ?? '';
    return ''; // if blank, defaults to guest flow
  }
}
