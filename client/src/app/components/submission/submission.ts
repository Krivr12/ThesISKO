import { Component, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Footer } from "../footer/footer";
import { Navbar } from "../navbar/navbar";
import { Router } from '@angular/router';

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
export class Submission {
  constructor(private router: Router) {}
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
      let nextState: ViewState = 'initial';
      if (currentState === 'revisionConfirming') {
        nextState = 'needsRevision';
      } else if (currentState === 'step2_confirming') {
        nextState = 'step2_initial';
      }
      this.viewState.set(nextState);
      return;
    }

    if (currentState === 'confirming') {
      this.viewState.set('submitted');
      this.statusHistory.set([{ text: 'Submitted', type: 'default' }]);
      this.simulateReviewProcess();
    } else if (currentState === 'revisionConfirming') {
      this.viewState.set('revisionSubmitted');
      this.statusHistory.update(history => [...history, { text: 'Revision Submitted', type: 'warning' }]);
      this.simulateFinalApproval();
    } else if (currentState === 'step2_confirming') {
      this.viewState.set('step2_submitted');
      this.statusHistory.set([{ text: 'Submitted', type: 'default' }]);
      this.simulateStep2Approval();
    }
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
    let nextState: ViewState = 'step4_initial';
    if (currentState === 'step4_revisionConfirming') {
      nextState = 'step4_needsRevision';
    }
    this.viewState.set(nextState);
    return;
  }

  if (currentState === 'step4_confirming') {
    this.viewState.set('step4_submitted');
    this.statusHistory.set([{ text: 'Submitted', type: 'default' }]);
    this.simulateStep4ReviewProcess();
  } else if (currentState === 'step4_revisionConfirming') {
    this.viewState.set('step4_revisionSubmitted');
    this.statusHistory.update(history => [...history, { text: 'Revision Submitted', type: 'warning' }]);
    this.simulateStep4FinalApproval();
  }
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
  if (isConfirmed) {
    this.viewState.set('step5_submitted');
  } else {
    this.viewState.set('step5_initial');
  }
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