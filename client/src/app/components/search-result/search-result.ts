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
  citationCopied = false; // Track if citation was just copied
  copiedFormat = ''; // Track which format was copied (APA/MLA)

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
        alert(`APA Citation (copy manually):\n\n${text}`);
      }
    } catch (err) {
      console.error('❌ Fallback copy error:', err);
      alert(`APA Citation (copy manually):\n\n${text}`);
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

 

