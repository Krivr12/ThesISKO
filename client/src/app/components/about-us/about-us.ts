import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

import { Navbar } from '../navbar/navbar';
import { Footer } from '../footer/footer';
import { SearchBar } from '../search-bar/search-bar';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-about-us',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule, Navbar, Footer, SearchBar],
  templateUrl: './about-us.html',
  styleUrls: ['./about-us.css'],
})
export class AboutUs {
  homeQuery = '';
  
  // Contact form properties
  contactName = '';
  contactEmail = '';
  contactSubject = '';
  contactMessage = '';
  isSubmitting = false;
  submitMessage = '';
  submitMessageType: 'success' | 'error' | null = null;

  private http = inject(HttpClient);

  constructor(private router: Router) {}

  goSearch() {
    const q = (this.homeQuery || '').trim();
    this.router.navigate(['/search-thesis'], {
      queryParams: { q: q || null },
    });
  }

  // If your template calls (submit)="search()" or (keyup.enter)="search()"
  search() {
    this.goSearch();
  }

  // Handle contact form submission
  onSubmitContactForm(event: Event) {
    event.preventDefault();
    
    // Validate form
    if (!this.contactName || !this.contactEmail || !this.contactSubject || !this.contactMessage) {
      this.showMessage('Please fill in all fields.', 'error');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.contactEmail)) {
      this.showMessage('Please enter a valid email address.', 'error');
      return;
    }

    this.isSubmitting = true;
    this.submitMessage = '';
    this.submitMessageType = null;

    // Prepare form data
    const formData = {
      name: this.contactName.trim(),
      email: this.contactEmail.trim(),
      subject: this.contactSubject.trim(),
      message: this.contactMessage.trim()
    };

    // Submit to backend
    this.http.post(`${environment.authApiUrl}/contact`, formData).subscribe({
      next: (response: any) => {
        this.isSubmitting = false;
        this.showMessage(
          response.message || 'Your message has been sent successfully! We will get back to you soon.',
          'success'
        );
        // Reset form
        this.resetContactForm();
      },
      error: (error) => {
        this.isSubmitting = false;
        const errorMsg = error.error?.error || error.error?.message || 'Failed to send message. Please try again later.';
        this.showMessage(errorMsg, 'error');
        console.error('Contact form submission error:', error);
      }
    });
  }

  // Reset contact form
  resetContactForm() {
    this.contactName = '';
    this.contactEmail = '';
    this.contactSubject = '';
    this.contactMessage = '';
  }

  // Show message to user
  showMessage(message: string, type: 'success' | 'error') {
    this.submitMessage = message;
    this.submitMessageType = type;
    
    // Auto-hide message after 5 seconds
    setTimeout(() => {
      this.submitMessage = '';
      this.submitMessageType = null;
    }, 5000);
  }
}