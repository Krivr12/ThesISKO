import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AdminSideNav } from '../admin-side-nav/admin-side-nav';

interface FileRequirement {
  id: string;
  label: string;
  required: boolean;
  accept?: string;
}

interface DocumentType {
  _id?: string;
  type_id: string;
  type_name: string;
  required_metadata: string[];
  required_files: FileRequirement[];
  created_by?: string;
  created_at?: Date;
  updated_at?: Date;
  is_active: boolean;
}

@Component({
  selector: 'app-document-types',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, AdminSideNav],
  templateUrl: './document-types.html',
  styleUrls: ['./document-types.css']
})
export class DocumentTypes implements OnInit {
  documentTypes = signal<DocumentType[]>([]);
  loading = signal<boolean>(false);
  showModal = signal<boolean>(false);
  editMode = signal<boolean>(false);
  
  // Form data
  currentType = signal<DocumentType>({
    type_id: '',
    type_name: '',
    required_metadata: [
      'title', 'abstract', 'authors', 'tags', 'adviser',
      'faculty_in_charge', 'panelists', 'department', 'program', 'access_level'
    ],
    required_files: [],
    is_active: true
  });

  // New file requirement form
  newFileId = signal<string>('');
  newFileLabel = signal<string>('');
  newFileRequired = signal<boolean>(true);

  private apiUrl = `${environment.apiUrl}/document-types`;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadDocumentTypes();
  }

  loadDocumentTypes() {
    this.loading.set(true);
    this.http.get<{ success: boolean; data: DocumentType[] }>(this.apiUrl)
      .subscribe({
        next: (response) => {
          this.documentTypes.set(response.data);
          this.loading.set(false);
        },
        error: (error) => {
          
          alert('Failed to load document types');
          this.loading.set(false);
        }
      });
  }

  openCreateModal() {
    this.editMode.set(false);
    this.currentType.set({
      type_id: '',
      type_name: '',
      required_metadata: [
        'title', 'abstract', 'authors', 'tags', 'adviser',
        'faculty_in_charge', 'panelists', 'department', 'program', 'access_level'
      ],
      required_files: [],
      is_active: true
    });
    this.showModal.set(true);
  }

  openEditModal(docType: DocumentType) {
    this.editMode.set(true);
    this.currentType.set({ ...docType });
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.newFileId.set('');
    this.newFileLabel.set('');
    this.newFileRequired.set(true);
  }

  addFileRequirement() {
    const id = this.newFileId();
    const label = this.newFileLabel();

    if (!id || !label) {
      alert('Please fill in both file ID and label');
      return;
    }

    // Check for duplicate ID
    const current = this.currentType();
    if (current.required_files.some(f => f.id === id)) {
      alert('File ID must be unique');
      return;
    }

    const newFile: FileRequirement = {
      id: id.toLowerCase().replace(/\s+/g, '_'),
      label,
      required: this.newFileRequired(),
      accept: '.pdf'
    };

    this.currentType.update(type => ({
      ...type,
      required_files: [...type.required_files, newFile]
    }));

    // Reset form
    this.newFileId.set('');
    this.newFileLabel.set('');
    this.newFileRequired.set(true);
  }

  removeFileRequirement(index: number) {
    this.currentType.update(type => ({
      ...type,
      required_files: type.required_files.filter((_, i) => i !== index)
    }));
  }

  moveFileUp(index: number) {
    if (index === 0) return;
    this.currentType.update(type => {
      const files = [...type.required_files];
      [files[index - 1], files[index]] = [files[index], files[index - 1]];
      return { ...type, required_files: files };
    });
  }

  moveFileDown(index: number) {
    const current = this.currentType();
    if (index === current.required_files.length - 1) return;
    this.currentType.update(type => {
      const files = [...type.required_files];
      [files[index], files[index + 1]] = [files[index + 1], files[index]];
      return { ...type, required_files: files };
    });
  }

  saveDocumentType() {
    const current = this.currentType();

    if (!current.type_name) {
      alert('Please enter a document type name');
      return;
    }

    if (current.required_files.length === 0) {
      alert('Please add at least one file requirement');
      return;
    }

    this.loading.set(true);

    if (this.editMode()) {
      // Update existing
      this.http.patch(`${this.apiUrl}/${current.type_id}`, {
        type_name: current.type_name,
        required_files: current.required_files,
        is_active: current.is_active
      }).subscribe({
        next: () => {
          alert('Document type updated successfully');
          this.closeModal();
          this.loadDocumentTypes();
        },
        error: (error) => {
          
          alert(error.error?.error || 'Failed to update document type');
          this.loading.set(false);
        }
      });
    } else {
      // Create new
      this.http.post(this.apiUrl, {
        type_name: current.type_name,
        required_metadata: current.required_metadata,
        required_files: current.required_files,
        created_by: 'dean' // TODO: Get from auth service
      }).subscribe({
        next: () => {
          alert('Document type created successfully');
          this.closeModal();
          this.loadDocumentTypes();
        },
        error: (error) => {
          
          alert(error.error?.error || 'Failed to create document type');
          this.loading.set(false);
        }
      });
    }
  }

  toggleActive(docType: DocumentType) {
    if (!confirm(`Are you sure you want to ${docType.is_active ? 'deactivate' : 'activate'} this document type?`)) {
      return;
    }

    this.http.patch(`${this.apiUrl}/${docType.type_id}`, {
      is_active: !docType.is_active
    }).subscribe({
      next: () => {
        alert(`Document type ${docType.is_active ? 'deactivated' : 'activated'} successfully`);
        this.loadDocumentTypes();
      },
      error: (error) => {
        
        alert('Failed to update document type');
      }
    });
  }

  deleteDocumentType(docType: DocumentType) {
    if (!confirm(`Are you sure you want to delete "${docType.type_name}"? This action cannot be undone.`)) {
      return;
    }

    this.http.delete(`${this.apiUrl}/${docType.type_id}`).subscribe({
      next: () => {
        alert('Document type deleted successfully');
        this.loadDocumentTypes();
      },
      error: (error) => {
        
        alert('Failed to delete document type');
      }
    });
  }
}

