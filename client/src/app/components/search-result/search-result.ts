import { Component, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

/* Angular Material */
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

import { HttpClient, HttpClientModule } from '@angular/common/http';
import { NgIf, NgFor, DatePipe } from '@angular/common'; // 👈 add these
import { Footer } from "../footer/footer";
import { Navbar } from "../navbar/navbar";

@Component({
  selector: 'app-search-result',
  standalone: true,
  imports: [Footer, Navbar, NgFor, DatePipe,  CommonModule, FormsModule,
    MatDialogModule, MatCheckboxModule,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    HttpClientModule], // 👈 include them here
  templateUrl: './search-result.html',
  styleUrls: ['./search-result.css']
})
export class SearchResult {
  thesis: any; // Store thesis passed from router

  constructor(private router: Router,
    private dialog: MatDialog, private http: HttpClient
  ) {
    const nav = this.router.getCurrentNavigation();
    if (nav?.extras?.state && nav.extras.state['thesis']) {
      this.thesis = nav.extras.state['thesis'];
    } else {
      // fallback if no thesis passed (direct link/refresh)
      this.router.navigate(['/search-thesis']);
    }
  }

  @ViewChild('dlgRequestAccess') dlgRequestAccess!: TemplateRef<any>;

  // Checkbox options
  requestOptions = ['Chapter 1', 'Chapter 2', 'Chapter 3', 'Chapter 4', 'Chapter 5', 'All'] as const;
  selectedRequestChapters = new Set<string>();

  // Form fields
  requestPurpose = '';
  requestEmail = '';



  openRequestDialog() {
    this.resetRequestDialog();
    this.dialog.open(this.dlgRequestAccess, {
      width: '640px',
      // You can pass data if needed via 'data', but not required here.
    });
  }

  resetRequestDialog() {
    this.selectedRequestChapters.clear();
    this.requestPurpose = '';
    this.requestEmail = '';
  }

  toggleRequestChapter(opt: string, checked: boolean) {
    // Handle "All" special behavior
    if (opt === 'All') {
      if (checked) {
        // Select everything including "All"
        this.requestOptions.forEach(o => this.selectedRequestChapters.add(o));
      } else {
        // Deselect all
        this.selectedRequestChapters.clear();
      }
      return;
    }

    // Normal chapter toggle
    if (checked) this.selectedRequestChapters.add(opt);
    else this.selectedRequestChapters.delete(opt);

    // Keep "All" in sync
    const allOthersSelected = this.requestOptions
      .filter(o => o !== 'All')
      .every(o => this.selectedRequestChapters.has(o));

    if (allOthersSelected) this.selectedRequestChapters.add('All');
    else this.selectedRequestChapters.delete('All');
  }

  // --- Validation helpers ---
  get emailValid(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.requestEmail.trim());
  }
  get purposeValid(): boolean {
    return this.requestPurpose.trim().length >= 8; // tweak threshold as you like
  }
  get chaptersValid(): boolean {
    return this.selectedRequestChapters.size > 0;
  }
  get formValid(): boolean {
    return this.emailValid && this.purposeValid && this.chaptersValid;
  }

  confirmRequest(dialogRef: any) {
    // Build payload; if "All" selected, expand to all chapters for backend clarity
    const chapters = this.selectedRequestChapters.has('All')
      ? this.requestOptions.filter(o => o !== 'All')
      : Array.from(this.selectedRequestChapters);

    const payload = {
      email: this.requestEmail.trim(),
      purpose: this.requestPurpose.trim(),
      chapters
    };

    // TODO: replace with your real endpoint
    // this.http.post('/api/access-requests', payload).subscribe({
    //   next: () => { dialogRef.close(); },
    //   error: (err) => { console.error('Request failed', err); }
    // });

    console.log('Sending access request:', payload);
    dialogRef.close();
  }

  onReturnClick(): void {
    this.router.navigate(['/search-thesis']);
  }
}

 

