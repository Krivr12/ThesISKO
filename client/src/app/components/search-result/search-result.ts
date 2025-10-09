import { Component, ViewChild, TemplateRef } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Footer } from "../footer/footer";
import { Navbar } from "../navbar/navbar";
import { LoginModal } from '../login-modal/login-modal';
import { RequestService, RequestSubmission } from '../../service/request.service';
import { Auth } from '../../service/auth';

@Component({
  selector: 'app-search-result',
  standalone: true,
  imports: [Footer, Navbar, LoginModal, FormsModule, CommonModule],
  templateUrl: './search-result.html',
  styleUrl: './search-result.css'
})
export class SearchResult {
  // Makes sure modal not visible
  isLoginModalVisible = false;

  // Request dialog templates
  @ViewChild('requestDialog', { static: true }) requestDialog!: TemplateRef<any>;
  @ViewChild('termsDialog', { static: true }) termsDialog!: TemplateRef<any>;

  // Current user data
  currentUser: any = null;
  userRole: 'student' | 'guest' | 'group' = 'guest';

  // Request form data
  requestForm = {
    email: '',
    name: '',
    program: '',
    department: '',
    country: '',
    city: '',
    school: '',
    purpose: '',
    selectedChapters: new Set<string>()
  };

  // Available chapters
  requestOptions = ['All', '1', '2', '3', '4', '5'];
  
  // Form validation
  termsAccepted = false;
  touchGuestEmail = false;

  //Placeholder
  document = {
    id: '2025-0001', // This should come from the actual document data
    title: 'Optimizing Urban Traffic Flow Using Reinforcement Learning and Real-Time Sensor Data',
    abstract: 'Urban traffic congestion remains a persistent issue in modern cities, leading to economic inefficiencies, increased emissions, and commuter frustration. This study introduces a reinforcement learning (RL)-based framework that utilizes real-time sensor data to optimize traffic signal control across urban intersections. By employing a model-free Deep Q-Learning algorithm, the system enables an intelligent agent to learn adaptive signal timing strategies aimed at minimizing vehicle waiting times, congestion levels, and travel delays. Real-time inputs from simulated sensors—such as vehicle counts, queue lengths, and speeds—are used to inform decision-making in a dynamic environment. The model is trained and evaluated in a microsimulation platform designed to reflect real-world traffic conditions, demonstrating significant improvements over traditional fixed-time and actuated control systems in metrics such as average travel time, throughput, and fuel consumption. Furthermore, the system exhibits strong adaptability to non-stationary scenarios like peak hours or road incidents, and it scales effectively across multiple intersections. This research highlights the potential of combining reinforcement learning with real-time data to create a more responsive and efficient urban traffic management system, paving the way for future developments involving real-world deployment and cooperative multi-agent learning strategies.',
    dateOfPublication: '2023, March 30',
    degreeName: 'Bachelor of Science in Accountancy',
    subjectCategories: 'Road Management | Technology and Innovation',
    authors: 'Evangelista, Christopher Bryan S.',
    college: 'College of Computer and Information Sciences',
    documentType: 'Bachelor\'s Thesis'
  };

  constructor(
    private router: Router,
    private dialog: MatDialog,
    private requestService: RequestService,
    private authService: Auth
  ) {
    // Initialize user data
    this.initializeUser();
  }

  initializeUser(): void {
    this.currentUser = this.authService.currentUser;
    if (this.currentUser) {
      this.userRole = this.getUserRole();
      this.populateUserData();
    }
  }

  getUserRole(): 'student' | 'guest' | 'group' {
    if (!this.currentUser) return 'guest';
    
    if (this.currentUser.role_id === 1) return 'student';
    if (this.currentUser.role_id === 2) return 'group';
    return 'guest';
  }

  populateUserData(): void {
    if (this.currentUser) {
      this.requestForm.email = this.currentUser.email || '';
      this.requestForm.name = `${this.currentUser.Firstname || ''} ${this.currentUser.Lastname || ''}`.trim();
      this.requestForm.program = this.currentUser.Course || '';
      this.requestForm.department = this.currentUser.Department || '';
    }
  }

  // New method to handle the click event and navigate
  onReturnClick(): void {
    this.router.navigate(['/search-thesis']);
  }

  // Pop up Function
  openLoginModal(): void {
    this.isLoginModalVisible = true;
  }

  closeLoginModal(): void {
    this.isLoginModalVisible = false;
  }

  // Request functionality
  openRequestDialog(): void {
    if (!this.currentUser) {
      this.openLoginModal();
      return;
    }

    this.dialog.open(this.requestDialog, {
      width: '600px',
      maxWidth: '90vw',
      autoFocus: false
    });
  }

  toggleRequestChapter(opt: string, checked: boolean): void {
    if (checked) {
      this.requestForm.selectedChapters.add(opt);
      if (opt === 'All') {
        // If "All" is selected, clear other selections
        this.requestOptions.filter(o => o !== 'All').forEach(chapter => {
          this.requestForm.selectedChapters.delete(chapter);
        });
      } else {
        // If a specific chapter is selected, remove "All"
        this.requestForm.selectedChapters.delete('All');
      }
    } else {
      this.requestForm.selectedChapters.delete(opt);
    }
  }

  isGmail(email: string): boolean {
    return email.toLowerCase().includes('@gmail.com');
  }

  get studentFormValid(): boolean {
    return this.requestForm.program.trim().length > 0 && 
           this.requestForm.department.trim().length > 0 &&
           this.requestForm.purpose.trim().length >= 8;
  }

  get guestFormValid(): boolean {
    return this.isGmail(this.requestForm.email) &&
           this.requestForm.country.trim().length > 0 &&
           this.requestForm.city.trim().length > 0 &&
           this.requestForm.school.trim().length > 0 &&
           this.requestForm.purpose.trim().length >= 8;
  }

  isFormValid(): boolean {
    const hasSelectedChapters = this.requestForm.selectedChapters.size > 0;
    const hasValidPurpose = this.requestForm.purpose.trim().length >= 8;
    
    if (this.userRole === 'student' || this.userRole === 'group') {
      return this.studentFormValid && hasSelectedChapters && hasValidPurpose;
    } else {
      return this.guestFormValid && hasSelectedChapters && hasValidPurpose;
    }
  }

  openTermsAndSubmit(dialogRef?: any): void {
    if (dialogRef) dialogRef.disableClose = true;

    this.termsAccepted = false;
    const ref = this.dialog.open(this.termsDialog, {
      width: '720px',
      autoFocus: false,
      restoreFocus: false
    });

    ref.afterClosed().subscribe(agreed => {
      if (agreed === true) {
        if (dialogRef) dialogRef.close();
        this.submitRequest();
      } else {
        if (dialogRef) dialogRef.disableClose = false;
      }
    });
  }

  submitRequest(): void {
    const chapters = this.requestForm.selectedChapters.has('All')
      ? this.requestOptions.filter(o => o !== 'All')
      : Array.from(this.requestForm.selectedChapters);

    const requestData: RequestSubmission = {
      docId: this.document.id,
      userType: this.userRole,
      requester: {
        email: this.requestForm.email.trim(),
        name: this.requestForm.name.trim(),
        program: this.requestForm.program.trim(),
        department: this.requestForm.department.trim(),
        country: this.requestForm.country.trim(),
        city: this.requestForm.city.trim(),
        school: this.requestForm.school.trim(),
        group_id: this.currentUser?.group_id,
        leader_name: this.currentUser?.leader_name
      },
      chaptersRequested: chapters,
      purpose: this.requestForm.purpose.trim()
    };

    this.requestService.submitRequest(requestData).subscribe({
      next: (response) => {
        console.log('Request submitted successfully:', response);
        alert('Request submitted successfully! You will receive an email confirmation.');
        this.resetRequestForm();
      },
      error: (error) => {
        console.error('Request submission failed:', error);
        alert('Failed to submit request. Please try again.');
      }
    });
  }

  resetRequestForm(): void {
    this.requestForm = {
      email: '',
      name: '',
      program: '',
      department: '',
      country: '',
      city: '',
      school: '',
      purpose: '',
      selectedChapters: new Set<string>()
    };
    this.termsAccepted = false;
    this.touchGuestEmail = false;
    this.populateUserData(); // Re-populate user data
  }

  goToLogin(dialogRef: any): void {
    dialogRef.close();
    this.router.navigate(['/login'], { queryParams: { redirectTo: this.router.url } });
  }
}
