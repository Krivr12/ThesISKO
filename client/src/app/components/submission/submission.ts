import { Component, ChangeDetectionStrategy, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Footer } from "../footer/footer";
import { Navbar, AuthService } from "../navbar/navbar";
import { Router } from '@angular/router';
import { S3Service } from '../../service/s3.service';
import { SubmissionService } from '../../service/submission.service';
import { forkJoin } from 'rxjs';

// structure for status update
interface Status {
  text: string;
  type: 'default' | 'error' | 'success' | 'warning';
}

// state definitions
type ViewState = 
  | 'initial' 
  | 'fileSelected' 
  | 'confirming' 
  | 'submitted' 
  | 'needsRevision' 
  | 'revisionFileSelected'
  | 'revisionConfirming'
  | 'revisionSubmitted'
  | 'approved'
  // states for step 2
  | 'step2_templateDownload'
  | 'step2_initial'
  | 'step2_fileSelected'
  | 'step2_confirming'
  | 'step2_submitted'
  | 'step2_approved'
  // step 3
  | 'step3_initial'
  | 'step3_fileSelected'
  | 'step3_checking'
  | 'step3_results'
  // step 4
  | 'step4_initial'
  | 'step4_filesSelected'
  | 'step4_confirming'
  | 'step4_submitted'
  | 'step4_needsRevision'
  | 'step4_revisionFilesSelected'
  | 'step4_revisionConfirming'
  | 'step4_revisionSubmitted'
  | 'step4_approved'
  // stp 5
  | 'step5_initial'
  | 'step5_confirming'
  | 'step5_submitted'
  // step 6
  | 'step6_initial'
  | 'step6_confirming'
  | 'step6_archived';

@Component({
  selector: 'app-submission',
  standalone: true,
  imports: [CommonModule, Footer, Navbar],
  templateUrl: './submission.html',
  styleUrls: ['./submission.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Submission implements OnInit {
  constructor(
    private router: Router, 
    private authService: AuthService,
    private s3Service: S3Service,
    private submissionService: SubmissionService
  ) {}

  ngOnInit() {
    // Role guard: Only group leaders (role_id = 6) can access this page
    const currentUser = this.authService.currentUser;
    
    console.log('🔒 Submission Page Access Check:', {
      user: currentUser?.email,
      role_id: currentUser?.role_id,
      group_id: currentUser?.group_id
    });

    if (!currentUser) {
      console.warn('❌ No user logged in. Redirecting to login.');
      alert('Please log in to access the submission page.');
      this.router.navigate(['/login']);
      return;
    }

    if (currentUser.role_id !== 6) {
      console.warn(`❌ Access denied. User has role_id ${currentUser.role_id}, but needs role_id 6 (Group Leader).`);
      alert('Only group leaders can submit thesis manuscripts.');
      this.router.navigate(['/home']);
      return;
    }

    if (!currentUser.group_id) {
      console.warn('❌ User is group leader but has no group_id.');
      alert('You are not assigned to a group. Please contact your Faculty-in-Charge.');
      this.router.navigate(['/home']);
      return;
    }

    console.log('✅ Access granted. User is a group leader with group_id:', currentUser.group_id);
    
    // Load current group status on page load
    this.loadInitialGroupStatus(currentUser.group_id);
  }
  
  /**
   * Load initial group status when page loads
   * This shows the user which milestones are complete and which approvals are pending
   */
  private loadInitialGroupStatus(groupId: string) {
    this.submissionService.getGroupStatus(groupId).subscribe({
      next: (group) => {
        console.log('📊 Initial group status loaded:', group);
        
        // Check each milestone and update status history
        if (group.milestones && Array.isArray(group.milestones)) {
          group.milestones.forEach((milestone: any) => {
            if (milestone.status === true) {
              // Milestone has files uploaded
              const milestoneName = this.getMilestoneDisplayName(milestone.type);
              
              // Check for approvals
              if (milestone.type === 'upload_manuscript') {
                const panelistApprovals = milestone.approved_by?.length || 0;
                const facultyApproved = milestone.verified?.faculty_in_charge?.approved || false;
                
                if (facultyApproved) {
                  this.statusHistory.update(history => [...history, { 
                    text: `${milestoneName}: Approved by Faculty`, 
                    type: 'success' 
                  }]);
                } else if (panelistApprovals > 0) {
                  this.statusHistory.update(history => [...history, { 
                    text: `${milestoneName}: ${panelistApprovals}/3 panelists approved`, 
                    type: 'default' 
                  }]);
                } else {
                  this.statusHistory.update(history => [...history, { 
                    text: `${milestoneName}: Awaiting panelist review`, 
                    type: 'default' 
                  }]);
                }
              } else if (milestone.type !== 'describe_work') {
                const chairpersonApproved = milestone.verified?.chairperson?.some((c: any) => c.approved) || false;
                
                if (chairpersonApproved) {
                  this.statusHistory.update(history => [...history, { 
                    text: `${milestoneName}: Approved by Chairperson`, 
                    type: 'success' 
                  }]);
                } else {
                  this.statusHistory.update(history => [...history, { 
                    text: `${milestoneName}: Awaiting chairperson review`, 
                    type: 'default' 
                  }]);
                }
              }
            }
          });
        }
      },
      error: (error) => {
        console.error('❌ Error loading initial group status:', error);
      }
    });
  }
  
  /**
   * Get display name for milestone type
   */
  private getMilestoneDisplayName(type: string): string {
    switch(type) {
      case 'upload_manuscript': return 'Manuscript';
      case 'complete_copyright': return 'Copyright Form';
      case 'pass_turnitin': return 'Turnitin Report';
      case 'upload_all_docs': return 'All Documents';
      case 'describe_work': return 'Work Description';
      default: return type;
    }
  }
  // --- STATE MANAGEMENT SIGNALS ---

  viewState = signal<ViewState>('initial');
  statusHistory = signal<Status[]>([]);
  file = signal<File | null>(null);
  uploadProgress = signal<number>(0);
  isDragging = signal<boolean>(false);
  currentStep = signal<number>(1);
  similarityIndex = signal<number>(0);
  files = signal<File[]>([]);
  uploadProgresses = signal<Map<string, number>>(new Map());
  // Step 5 & 6 data
  groupNumber = signal<number | null>(null);
  memberNames = signal<string[]>([]);
  tags = signal<string[]>([]);
  customTag = signal<string>('');
  title = signal<string>('');
  abstract = signal<string>('');
  accessLevel = signal<'Full' | 'Partial' | 'Restricted' | null>(null);
  confirmationChecked = signal<boolean>(false);
  memberInput = signal<string>('');
  memberNamesString = computed(() => this.memberNames().join('\n'));
  
  // Upload tracking signals
  currentS3Keys = signal<string[]>([]); // Store S3 keys for current upload
  isUploading = signal<boolean>(false); // Track if upload is in progress
  uploadError = signal<string | null>(null); // Track upload errors
  
  // predefined tags
  predefinedTags = signal<string[]>([
    'Technology',
    'Information Systems',
    'Web Application',
    'Mobile Application',
    'Artificial Intelligence',
    'Data Science',
    'Cloud Computing',
    'Cybersecurity',
    'User Experience',
    'Database'
  ]);
  
  // Placeholder for the copyright form template file
  copyrightTemplate = {
    name: 'Copyright_Form_Template.pdf',
    size: 135000, // size in bytes
  };
  
  // Placeholder for the completion form template file
  completionFormTemplate = {
    name: 'Generated_Completion_Form.pdf',
    size: 95000, // size in bytes
  };

  submissionSteps = [
    { id: 1, title: 'Upload Manuscript' },
    { id: 2, title: 'Complete Copyright Form' },
    { id: 3, title: 'Pass Turnitin Checker' },
    { id: 4, title: 'Upload all documents' },
    { id: 5, title: 'Describe Work' },
    { id: 6, title: 'Archive Theses' },
  ];

  // --- FILE HANDLING METHODS ---

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
    if (event.dataTransfer?.files?.[0]) {
      this.handleFile(event.dataTransfer.files[0]);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      this.handleFile(input.files[0]);
    }
  }

  private handleFile(file: File) {
    this.file.set(file);
    this.uploadProgress.set(0);
    
    let nextState: ViewState = 'fileSelected';
    if (this.viewState() === 'needsRevision') {
      nextState = 'revisionFileSelected';
    } else if (this.currentStep() === 2) {
      nextState = 'step2_fileSelected';
    } else if (this.currentStep() === 3) {
      this.uploadProgress.set(100);
      nextState = 'step3_fileSelected';
    }
    this.viewState.set(nextState);

    // only run progress bar for steps that need it
    if (this.currentStep() !== 3) {
      const interval = setInterval(() => {
        this.uploadProgress.update(p => {
          if (p >= 100) {
            clearInterval(interval);
            return 100;
          }
          return p + 10;
        });
      }, 100);
    }
  }

  // --- UI ACTION METHODS ---

  private submitFile() {
    if (this.uploadProgress() < 100) return;

    let nextState: ViewState = 'confirming';
    if (this.viewState() === 'revisionFileSelected') {
      nextState = 'revisionConfirming';
    } else if (this.viewState() === 'step2_fileSelected') {
      nextState = 'step2_confirming';
    }
    this.viewState.set(nextState);
  }

  closeModal() {
    const currentState = this.viewState();
    if (currentState === 'confirming') {
      this.viewState.set('fileSelected');
    } else if (currentState === 'revisionConfirming') {
      this.viewState.set('revisionFileSelected');
    } else if (currentState === 'step2_confirming') {
      this.viewState.set('step2_fileSelected');
    }
  }

  confirmUpload(isConfirmed: boolean) {
    const currentState = this.viewState();

    if (!isConfirmed) {
      this.file.set(null);
      this.uploadProgress.set(0);
      this.uploadError.set(null);
      let nextState: ViewState = 'initial';
      if (currentState === 'revisionConfirming') {
        nextState = 'needsRevision';
      } else if (currentState === 'step2_confirming') {
        nextState = 'step2_initial';
      }
      this.viewState.set(nextState);
      return;
    }

    // Real API integration for file upload
    const file = this.file();
    if (!file) {
      this.uploadError.set('No file selected');
      return;
    }

    const currentUser = this.authService.currentUser;
    const groupId = currentUser?.group_id;
    
    if (!groupId) {
      this.uploadError.set('No group ID found. Please contact your Faculty-in-Charge.');
      this.statusHistory.update(history => [...history, { 
        text: 'Error: No group assigned', 
        type: 'error' 
      }]);
      return;
    }

    // Determine milestone type based on current step
    let milestoneType = '';
    if (this.currentStep() === 1) {
      milestoneType = 'upload_manuscript';
    } else if (this.currentStep() === 2) {
      milestoneType = 'complete_copyright';
    } else if (this.currentStep() === 3) {
      milestoneType = 'pass_turnitin';
    }

    // Update UI state
    if (currentState === 'confirming' || currentState === 'revisionConfirming') {
      this.viewState.set(currentState === 'confirming' ? 'submitted' : 'revisionSubmitted');
      this.statusHistory.set([{ text: 'Uploading to server...', type: 'default' }]);
    } else if (currentState === 'step2_confirming') {
      this.viewState.set('step2_submitted');
      this.statusHistory.set([{ text: 'Uploading to server...', type: 'default' }]);
    }
    
    this.isUploading.set(true);

    // Execute upload workflow: Get signed URL → Upload to S3 → Update milestone
    this.uploadSingleFile(groupId, file, milestoneType);
  }
  
  private goToNextStep() {
    this.currentStep.update(step => step + 1);

    // clears status per step
    this.statusHistory.set([]);

    if(this.currentStep() === 2) {
      this.viewState.set('step2_templateDownload');
    } else if (this.currentStep() === 3) {
      this.viewState.set('step3_initial');
    } else if (this.currentStep() === 4) {
      this.viewState.set('step4_initial');
    } else if (this.currentStep() === 5) {
      this.viewState.set('step5_initial');
    } else if (this.currentStep() === 6) {
      this.viewState.set('step6_initial');
    } else {
      this.viewState.set('initial'); 
    }
  }

  // --- STEP 3 SPECIFIC METHODS ---
  
  clearStep3File() {
    this.file.set(null);
    this.viewState.set('step3_initial');
  }

  checkStep3File() {
    if (!this.file()) return;
    this.viewState.set('step3_checking');
    
    // simulate checking
    setTimeout(() => {
      const randomSimilarity = Math.floor(Math.random() * 14) + 5; // random number of percentage 5-18
      this.similarityIndex.set(randomSimilarity);
      this.statusHistory.set([{ text: 'Approved', type: 'success' }]);
      this.viewState.set('step3_results');
    }, 2500);
  }

  // multiple file handling for step 4
onDropMultiple(event: DragEvent) {
  event.preventDefault();
  this.isDragging.set(false);
  if (event.dataTransfer?.files) {
    this.handleMultipleFiles(Array.from(event.dataTransfer.files));
  }
}

onFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files?.length) {
    this.handleMultipleFiles(Array.from(input.files));
  }
}

private handleMultipleFiles(files: File[]) {
  this.files.set(files);
  this.uploadProgresses.set(new Map());
  
  let nextState: ViewState = 'step4_filesSelected';
  if (this.viewState() === 'step4_needsRevision') {
    nextState = 'step4_revisionFilesSelected';
  }
  this.viewState.set(nextState);

  // progress bar for step 4 files
  files.forEach(file => {
    const interval = setInterval(() => {
      this.uploadProgresses.update(progressMap => {
        const currentProgress = progressMap.get(file.name) || 0;
        if (currentProgress >= 100) {
          clearInterval(interval);
          return progressMap;
        }
        const newProgress = currentProgress + 10;
        progressMap.set(file.name, newProgress);
        return new Map(progressMap);
      });
    }, 100);
  });
}

// step 4 specific methods
clearStep4Files() {
  this.files.set([]);
  this.uploadProgresses.set(new Map());
  this.viewState.set('step4_initial');
}

submitStep4Files() {
  const allUploaded = Array.from(this.uploadProgresses().values()).every(progress => progress >= 100);
  if (!allUploaded) return;

  let nextState: ViewState = 'step4_confirming';
  if (this.viewState() === 'step4_revisionFilesSelected') {
    nextState = 'step4_revisionConfirming';
  }
  this.viewState.set(nextState);
}

closeStep4Modal() {
  const currentState = this.viewState();
  if (currentState === 'step4_confirming') {
    this.viewState.set('step4_filesSelected');
  } else if (currentState === 'step4_revisionConfirming') {
    this.viewState.set('step4_revisionFilesSelected');
  }
}

confirmStep4Upload(isConfirmed: boolean) {
  const currentState = this.viewState();

  if (!isConfirmed) {
    this.files.set([]);
    this.uploadProgresses.set(new Map());
    this.uploadError.set(null);
    let nextState: ViewState = 'step4_initial';
    if (currentState === 'step4_revisionConfirming') {
      nextState = 'step4_needsRevision';
    }
    this.viewState.set(nextState);
    return;
  }

  // Real API integration for multiple files
  const files = this.files();
  if (!files || files.length === 0) {
    this.uploadError.set('No files selected');
    return;
  }

  const currentUser = this.authService.currentUser;
  const groupId = currentUser?.group_id;
  
  if (!groupId) {
    this.uploadError.set('No group ID found. Please contact your Faculty-in-Charge.');
    this.statusHistory.update(history => [...history, { 
      text: 'Error: No group assigned', 
      type: 'error' 
    }]);
    return;
  }

  // Update UI state
  this.viewState.set('step4_submitted');
  this.statusHistory.set([{ text: 'Uploading files to server...', type: 'default' }]);
  this.isUploading.set(true);

  // Execute upload workflow for multiple files
  this.uploadMultipleFiles(groupId, files, 'upload_all_docs');
}

private simulateStep4ReviewProcess() {
  setTimeout(() => {
    this.statusHistory.update(history => [...history, { text: 'Pending Review', type: 'default' }]);
  }, 2000);

  setTimeout(() => {
    this.statusHistory.update(history => [...history, { text: 'Rejected - Incomplete', type: 'error' }]);
    this.viewState.set('step4_needsRevision');
  }, 4000);
}

private simulateStep4FinalApproval() {
  setTimeout(() => {
    this.statusHistory.update(history => [...history, { text: 'Approved', type: 'success' }]);
    this.viewState.set('step4_approved');
  }, 3000);
}

  // step 5 methods
updateGroupNumber(number: number) {
  this.groupNumber.set(number);
}

updateMemberNames(names: string) {
  // pressing "enter" creates the chipped name
  const nameArray = names.split('\n')
    .map(name => name.trim())
    .filter(name => name.length > 0);
  
  this.memberNames.set(nameArray);
}

onMemberKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault();
    this.addMember();
  }
}

addMember() {
  const name = this.memberInput().trim();
  if (name) {
    this.memberNames.update(names => [...names, name]);
    this.memberInput.set('');
  }
}

removeMember(index: number) {
  this.memberNames.update(names => names.filter((_, i) => i !== index));
}

updateTitle(title: string) {
  this.title.set(title);
}

updateAbstract(abstract: string) {
  this.abstract.set(abstract);
}

updateAccessLevel(level: 'Full' | 'Partial' | 'Restricted') {
  this.accessLevel.set(level);
}

toggleTag(tag: string) {
  this.tags.update(currentTags => {
    if (currentTags.includes(tag)) {
      return currentTags.filter(t => t !== tag);
    } else {
      return [...currentTags, tag];
    }
  });
}

addCustomTag() {
  if (this.customTag().trim() && !this.tags().includes(this.customTag().trim())) {
    this.tags.update(tags => [...tags, this.customTag().trim()]);
    this.customTag.set('');
  }
}

removeTag(tag: string) {
  this.tags.update(tags => tags.filter(t => t !== tag));
}

toggleConfirmation() {
  this.confirmationChecked.update(checked => !checked);
}

// step 5 validation
isStep5Valid(): boolean {
  return !!this.groupNumber() && 
         !!this.memberNames() && 
         this.tags().length > 0 && 
         !!this.title() && 
         !!this.abstract() && 
         !!this.accessLevel();
}

// step 6 validation
isStep6Valid(): boolean {
  return this.isStep5Valid() && this.confirmationChecked();
}

backToStep5() {
  this.currentStep.update(() => 5);
  this.viewState.set('step5_initial');
}

submitStep5() {
  if (this.isStep5Valid()) {
    this.viewState.set('step5_confirming');
  }
}

confirmStep5(isConfirmed: boolean) {
  if (!isConfirmed) {
    this.viewState.set('step5_initial');
    return;
  }

  // Save metadata to backend
  const currentUser = this.authService.currentUser;
  const groupId = currentUser?.group_id;
  
  if (!groupId) {
    alert('No group ID found. Please contact your Faculty-in-Charge.');
    this.viewState.set('step5_initial');
    return;
  }

  // Prepare data
  const metadata = {
    title: this.title(),
    abstract: this.abstract(),
    tags: this.tags(),
    access_level: this.accessLevel()
  };

  // Update group metadata
  this.submissionService.updateGroupMetadata(groupId, metadata).subscribe({
    next: (result) => {
      console.log('✅ Group metadata updated:', result);
      this.viewState.set('step5_submitted');
    },
    error: (error) => {
      console.error('Error updating group metadata:', error);
      alert('Failed to save work description. Please try again.');
      this.viewState.set('step5_initial');
    }
  });
}

submitStep6() {
  if (this.isStep6Valid()) {
    this.viewState.set('step6_confirming');
  }
}

//THIS WILL BRING IT TO THANK YOU PAGE
confirmStep6(isConfirmed: boolean) {
  if (isConfirmed) {
    this.router.navigate(['/thank-you']);//route to thank you pageee
  } else {
    this.viewState.set('step6_initial');
  }
}

resetToHome() {
  // clear data and states
  this.groupNumber.set(null);
   this.memberNames.set([]);
  this.tags.set([]);
  this.customTag.set('');
  this.title.set('');
  this.abstract.set('');
  this.accessLevel.set(null);
  this.confirmationChecked.set(false);
  this.currentStep.set(1);
  this.viewState.set('initial');
}

  // --- BUTTON LOGIC METHODS ---

  getButtonText(): string {
  const state = this.viewState();
  switch(state) {
    case 'fileSelected': return 'Submit';
    case 'revisionFileSelected': return 'Submit Revision';
    case 'step2_fileSelected': return 'Submit';
    case 'step4_filesSelected': return 'Submit';
    case 'step4_revisionFilesSelected': return 'Submit Revision';
    case 'step5_initial': return 'Submit';
    case 'step6_initial': return 'Archive';
    case 'step6_archived': return 'Back to Home';
    case 'approved':
    case 'step2_templateDownload':
    case 'step2_approved':
    case 'step3_results':
    case 'step4_approved':
    case 'step5_submitted':
      return 'Next';
    default: return 'Submit';
  }
}

  isButtonDisabled(): boolean {
    const state = this.viewState();
    
    //single file
    if (state === 'fileSelected' || state === 'revisionFileSelected' || state === 'step2_fileSelected') {
      return this.uploadProgress() < 100;
    }
    
    //multiple files (Step 4)
    if (state === 'step4_filesSelected' || state === 'step4_revisionFilesSelected') {
      const allUploaded = Array.from(this.uploadProgresses().values()).every(progress => progress >= 100);
      return !allUploaded;
    }
    
    // step 5
    if (state === 'step5_initial') {
      return !this.isStep5Valid();
    }
    
    //step 6
    if (state === 'step6_initial') {
      return !this.isStep6Valid();
    }
    
    // main button
    return ![
      'approved', 
      'step2_templateDownload', 
      'step2_approved', 
      'step3_results', 
      'step4_approved',
      'step5_submitted',
      'step6_archived'
    ].includes(state);
  }

  handleButtonClick(): void {
    const state = this.viewState();
    
    if (['approved', 'step2_approved', 'step3_results', 'step4_approved', 'step5_submitted'].includes(state)) {
      this.goToNextStep();
    } else if (state === 'step2_templateDownload') {
      this.viewState.set('step2_initial');
    } else if (['fileSelected', 'revisionFileSelected', 'step2_fileSelected'].includes(state)) {
      this.submitFile();
    } else if (['step4_filesSelected', 'step4_revisionFilesSelected'].includes(state)) {
      this.submitStep4Files();
    } else if (state === 'step5_initial') {
      this.submitStep5();
    }
    // step 6 has different button to avoid duplicates
  }

  // --- UPLOAD METHODS ---

  /**
   * Upload single file workflow:
   * 1. Get signed URL from backend
   * 2. Upload file to S3
   * 3. Update milestone with S3 key
   */
  private uploadSingleFile(groupId: string, file: File, milestoneType: string) {
    const contentType = file.type || 'application/pdf';
    
    // Step 1: Get signed URL
    this.s3Service.getSignedUrl(groupId, file.name, contentType).subscribe({
      next: (response) => {
        const { uploadUrl, key } = response;
        this.currentS3Keys.set([key]);
        
        this.statusHistory.update(history => [...history, { 
          text: 'Uploading file to storage...', 
          type: 'default' 
        }]);
        
        // Step 2: Upload to S3
        this.s3Service.uploadToS3(uploadUrl, file, contentType).subscribe({
          next: () => {
            this.statusHistory.update(history => [...history, { 
              text: 'File uploaded successfully', 
              type: 'success' 
            }]);
            
            // Step 3: Update milestone
            this.submissionService.addMilestoneFiles(groupId, milestoneType, [key]).subscribe({
              next: (result) => {
                this.isUploading.set(false);
                this.statusHistory.update(history => [...history, { 
                  text: 'Milestone updated - Waiting for approval', 
                  type: 'success' 
                }]);
                
                // Fetch updated group status
                this.loadGroupStatus(groupId);
              },
              error: (error) => {
                console.error('Error updating milestone:', error);
                this.isUploading.set(false);
                this.uploadError.set('Failed to update milestone');
                this.statusHistory.update(history => [...history, { 
                  text: 'Error: Failed to update milestone', 
                  type: 'error' 
                }]);
              }
            });
          },
          error: (error) => {
            console.error('Error uploading to S3:', error);
            this.isUploading.set(false);
            this.uploadError.set('Failed to upload file');
            this.statusHistory.update(history => [...history, { 
              text: 'Error: File upload failed', 
              type: 'error' 
            }]);
          }
        });
      },
      error: (error) => {
        console.error('Error getting signed URL:', error);
        this.isUploading.set(false);
        this.uploadError.set('Failed to get upload URL');
        this.statusHistory.update(history => [...history, { 
          text: 'Error: Could not prepare upload', 
          type: 'error' 
        }]);
      }
    });
  }

  /**
   * Upload multiple files workflow:
   * 1. Get signed URLs for all files from backend
   * 2. Upload all files to S3 in parallel
   * 3. Update milestone with all S3 keys
   */
  private uploadMultipleFiles(groupId: string, files: File[], milestoneType: string) {
    // Prepare file metadata
    const fileMetadata = files.map(file => ({
      filename: file.name,
      contentType: file.type || 'application/pdf'
    }));
    
    // Step 1: Get signed URLs for all files
    this.s3Service.getSignedUrls(groupId, fileMetadata).subscribe({
      next: (response) => {
        const uploadTasks = response.urls.map((urlData, index) => {
          const file = files[index];
          const contentType = fileMetadata[index].contentType;
          
          return this.s3Service.uploadToS3(urlData.uploadUrl, file, contentType);
        });
        
        this.statusHistory.update(history => [...history, { 
          text: `Uploading ${files.length} files to storage...`, 
          type: 'default' 
        }]);
        
        // Step 2: Upload all files in parallel
        forkJoin(uploadTasks).subscribe({
          next: () => {
            const s3Keys = response.urls.map(u => u.key);
            this.currentS3Keys.set(s3Keys);
            
            this.statusHistory.update(history => [...history, { 
              text: 'All files uploaded successfully', 
              type: 'success' 
            }]);
            
            // Step 3: Update milestone with all keys
            this.submissionService.addMilestoneFiles(groupId, milestoneType, s3Keys).subscribe({
              next: (result) => {
                this.isUploading.set(false);
                this.statusHistory.update(history => [...history, { 
                  text: 'Milestone updated - Waiting for approval', 
                  type: 'success' 
                }]);
                
                // Fetch updated group status
                this.loadGroupStatus(groupId);
              },
              error: (error) => {
                console.error('Error updating milestone:', error);
                this.isUploading.set(false);
                this.uploadError.set('Failed to update milestone');
                this.statusHistory.update(history => [...history, { 
                  text: 'Error: Failed to update milestone', 
                  type: 'error' 
                }]);
              }
            });
          },
          error: (error) => {
            console.error('Error uploading files to S3:', error);
            this.isUploading.set(false);
            this.uploadError.set('Failed to upload one or more files');
            this.statusHistory.update(history => [...history, { 
              text: 'Error: File uploads failed', 
              type: 'error' 
            }]);
          }
        });
      },
      error: (error) => {
        console.error('Error getting signed URLs:', error);
        this.isUploading.set(false);
        this.uploadError.set('Failed to get upload URLs');
        this.statusHistory.update(history => [...history, { 
          text: 'Error: Could not prepare uploads', 
          type: 'error' 
        }]);
      }
    });
  }

  /**
   * Load group status and update UI accordingly
   */
  private loadGroupStatus(groupId: string) {
    this.submissionService.getGroupStatus(groupId).subscribe({
      next: (group) => {
        console.log('✅ Group status loaded:', group);
        
        // Update status history based on milestone approvals
        const currentMilestoneType = this.getMilestoneTypeForStep(this.currentStep());
        const milestone = group.milestones?.find((m: any) => m.type === currentMilestoneType);
        
        if (milestone) {
          // Check for approvals
          if (currentMilestoneType === 'upload_manuscript') {
            // Check panelist approvals
            const panelistApprovals = milestone.approved_by?.length || 0;
            const requiredPanelists = 3;
            const facultyApproved = milestone.verified?.faculty_in_charge?.approved || false;
            
            if (facultyApproved) {
              this.statusHistory.update(history => [...history, { 
                text: 'Approved by Faculty-in-Charge', 
                type: 'success' 
              }]);
              // For step 1, only move to approved after faculty approval
              if (this.currentStep() === 1) {
                this.viewState.set('approved');
              }
            } else if (panelistApprovals > 0) {
              this.statusHistory.update(history => [...history, { 
                text: `Approved by ${panelistApprovals}/${requiredPanelists} panelists`, 
                type: 'default' 
              }]);
            }
          } else {
            // Other milestones checked by chairperson
            const chairpersonApproved = milestone.verified?.chairperson?.some((c: any) => c.approved) || false;
            
            if (chairpersonApproved) {
              this.statusHistory.update(history => [...history, { 
                text: 'Approved by Chairperson', 
                type: 'success' 
              }]);
              
              // Update view state based on step
              if (this.currentStep() === 2) {
                this.viewState.set('step2_approved');
              } else if (this.currentStep() === 3) {
                this.viewState.set('step3_results');
              } else if (this.currentStep() === 4) {
                this.viewState.set('step4_approved');
              }
            }
          }
        }
      },
      error: (error) => {
        console.error('Error loading group status:', error);
      }
    });
  }

  /**
   * Get milestone type for current step
   */
  private getMilestoneTypeForStep(step: number): string {
    switch(step) {
      case 1: return 'upload_manuscript';
      case 2: return 'complete_copyright';
      case 3: return 'pass_turnitin';
      case 4: return 'upload_all_docs';
      case 5: return 'describe_work';
      default: return '';
    }
  }

  // --- SIMULATION METHODS ---

  private simulateReviewProcess() {
    setTimeout(() => {
      this.statusHistory.update(history => [...history, { text: 'Pending Review', type: 'default' }]);
    }, 2000);

    setTimeout(() => {
      this.statusHistory.update(history => [...history, { text: 'Rejected - For Revision', type: 'error' }]);
      this.viewState.set('needsRevision');
    }, 4000);
  }

  private simulateFinalApproval() {
     setTimeout(() => {
      this.statusHistory.update(history => [...history, { text: 'Approved', type: 'success' }]);
      this.viewState.set('approved');
    }, 3000);
  }

  private simulateStep2Approval() {
    setTimeout(() => {
      this.statusHistory.update(history => [...history, { text: 'Approved', type: 'success' }]);
      this.viewState.set('step2_approved');
    }, 2000);
  }
}