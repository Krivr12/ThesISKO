import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SuperAdminNavBar } from '../super-admin-nav-bar/super-admin-nav-bar';
import { Auth } from '../../service/auth';
import { S3Service } from '../../service/s3.service';
import { environment } from '../../../environments/environment';

interface GroupDetails {
  group_id: string;
  title: string;
  abstract?: string;
  leader: { firstname: string; surname: string; email: string };
  members: { firstname: string; surname: string; email: string }[];
  block_id: string;
  academic_year?: string;
  block_code?: string;
  milestones: Milestone[];
  chairperson_approval?: {
    approved: boolean;
    approved_by?: string;
    approved_at?: Date;
  };
  dean_approval?: {
    approved: boolean;
    approved_by?: string;
    approved_at?: Date;
    rejected?: boolean;
    rejection_reason?: string;
  };
}

interface Milestone {
  type: string;
  status: boolean;
  s3_key?: string[];
  verified?: any;
  created_at?: Date;
  updated_at?: Date;
}

interface DocumentForView {
  name: string;
  s3_key: string;
  milestone_type: string;
}

@Component({
  selector: 'app-dean-details',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, SuperAdminNavBar],
  templateUrl: './dean-details.html',
  styleUrls: ['./dean-details.css']
})
export class DeanDetails implements OnInit {
  loading = signal(true);
  group = signal<GroupDetails | null>(null);
  documents = signal<DocumentForView[]>([]);
  
  // PDF Viewer
  isPdfViewerVisible = signal(false);
  currentPdfDocument = signal<DocumentForView | null>(null);
  currentPdfUrl = signal<SafeResourceUrl | null>(null);
  pdfLoading = signal(false);
  pdfError = signal('');
  
  currentUser: any = null;
  currentUserEmail = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private authService: Auth,
    private s3Service: S3Service
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.currentUser = user;
        this.currentUserEmail = user.email || '';
        
        const groupId = this.route.snapshot.paramMap.get('group_id');
        if (groupId) {
          this.loadGroupDetails(groupId);
        }
      }
    });
  }

  loadGroupDetails(groupId: string): void {
    this.http.get<any>(`${environment.authApiUrl}/groups/${groupId}`, { withCredentials: true })
      .subscribe({
        next: (response) => {
          
          if (response.success && response.data) {
            this.group.set(response.data);
            this.extractDocuments(response.data);
          } else {
            
          }
          this.loading.set(false);
        },
        error: (error) => {
          
          alert('Failed to load group details.');
          this.loading.set(false);
        }
      });
  }

  extractDocuments(group: any): void {
    const docs: DocumentForView[] = [];
    
    
    // Handle both array and object formats for milestones
    let milestonesArray: any[] = [];
    
    if (Array.isArray(group.milestones)) {
      milestonesArray = group.milestones;
    } else if (group.milestones && typeof group.milestones === 'object') {
      // Convert object to array
      milestonesArray = Object.values(group.milestones);
    }
    
    milestonesArray.forEach((milestone, index) => {
      
      if (milestone && milestone.s3_key) {
        const s3Keys = Array.isArray(milestone.s3_key) ? milestone.s3_key : [milestone.s3_key];
        
        s3Keys.forEach((key: string) => {
          if (key) {
            const fileName = key.split('/').pop() || key;
            const doc = {
              name: fileName,
              s3_key: key,
              milestone_type: this.getMilestoneDisplayName(milestone.type)
            };
            docs.push(doc);
          }
        });
      }
    });
    
    
    this.documents.set(docs);
  }

  getMilestoneDisplayName(type: string): string {
    const names: { [key: string]: string } = {
      upload_manuscript: 'Thesis Manuscript',
      complete_copyright: 'Copyright Form',
      pass_turnitin: 'Turnitin Report',
      upload_all_docs: 'All Documents',
      describe_work: 'Metadata Description'
    };
    return names[type] || type;
  }

  viewDocument(doc: DocumentForView): void {
    this.currentPdfDocument.set(doc);
    this.pdfLoading.set(true);
    this.pdfError.set('');
    this.isPdfViewerVisible.set(true);
    this.currentPdfUrl.set(null);

    // Get signed URL from S3
    this.s3Service.getSubmissionFileSignedUrl(doc.s3_key).subscribe({
      next: (response) => {
        const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(response.signedUrl);
        this.currentPdfUrl.set(safeUrl);
        this.pdfLoading.set(false);
      },
      error: (error) => {
        
        this.pdfError.set('Failed to load document. The file may be unavailable.');
        this.pdfLoading.set(false);
      }
    });
  }

  downloadDocument(): void {
    const doc = this.currentPdfDocument();
    if (!doc) return;

    this.s3Service.getSubmissionFileSignedUrl(doc.s3_key).subscribe({
      next: (response) => {
        const link = document.createElement('a');
        link.href = response.signedUrl;
        link.download = doc.name;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      },
      error: (error) => {
        
        alert('Failed to download document.');
      }
    });
  }

  closePdfViewer(): void {
    this.isPdfViewerVisible.set(false);
    this.currentPdfDocument.set(null);
    this.currentPdfUrl.set(null);
    this.pdfError.set('');
  }

  approveAndArchive(): void {
    const group = this.group();
    if (!group) return;

    const userName = `${this.currentUser?.Firstname || ''} ${this.currentUser?.Lastname || ''}`.trim() || 'Dean';
    
    if (!confirm(`Are you sure you want to approve and archive group ${group.group_id}?\n\nThis will move the thesis to the public repository.`)) {
      return;
    }

    this.http.patch(`${environment.authApiUrl}/groups/${group.group_id}/dean-approve`, {
      dean_name: userName
    }, { withCredentials: true }).subscribe({
      next: (response: any) => {
        if (response.success) {
          alert('✅ Group approved and archived successfully!');
          this.router.navigate(['/dean-approval']);
        }
      },
      error: (error) => {
        
        const errorMsg = error.error?.message || 'Failed to approve and archive group.';
        alert(`❌ Error: ${errorMsg}`);
      }
    });
  }

  rejectGroup(): void {
    const group = this.group();
    if (!group) return;

    const reason = prompt(`Please provide a reason for rejecting group ${group.group_id}:`);
    
    if (!reason || reason.trim() === '') {
      alert('Rejection cancelled. A reason is required.');
      return;
    }

    const milestone = prompt(`Which milestone needs to be fixed?\n\nEnter one of:\n- complete_copyright\n- pass_turnitin\n- upload_all_docs\n- describe_work`);

    const validMilestones = ['complete_copyright', 'pass_turnitin', 'upload_all_docs', 'describe_work'];
    if (!milestone || !validMilestones.includes(milestone)) {
      alert('Rejection cancelled. Invalid milestone type.');
      return;
    }

    const userName = `${this.currentUser?.Firstname || ''} ${this.currentUser?.Lastname || ''}`.trim() || 'Dean';

    this.http.patch(`${environment.authApiUrl}/groups/${group.group_id}/dean-reject`, {
      dean_name: userName,
      reason: reason.trim(),
      milestone_to_fix: milestone
    }, { withCredentials: true }).subscribe({
      next: (response: any) => {
        if (response.success) {
          alert('Group rejected. The group will be notified to resubmit the specified milestone.');
          this.router.navigate(['/dean-approval']);
        }
      },
      error: (error) => {
        
        const errorMsg = error.error?.message || 'Failed to reject group.';
        alert(`❌ Error: ${errorMsg}`);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/dean-approval']);
  }

  getLeaderName(): string {
    const leader = this.group()?.leader;
    return leader ? `${leader.firstname} ${leader.surname}` : '—';
  }

  getMemberNames(): string {
    const members = this.group()?.members;
    if (!members || members.length === 0) return '—';
    return members.map(m => `${m.firstname} ${m.surname}`).join(', ');
  }
}

