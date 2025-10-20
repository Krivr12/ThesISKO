import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AdminSideNav } from '../admin-side-nav/admin-side-nav';

interface FileRequirement {
  id: string;
  label: string;
  required: boolean;
  accept?: string;
}

interface StructuredField {
  enabled: boolean;
  min_count?: number;
  max_count?: number;
  require_firstname_lastname?: boolean;
}

interface Requirement {
  _id?: string;
  document_type: string;
  required_metadata: string[];
  required_structured_fields?: {
    authors?: StructuredField;
    panelists?: StructuredField;
    tags?: StructuredField;
  };
  required_files: FileRequirement[];
  created_by?: string;
  created_at?: Date;
  updated_at?: Date;
  is_active: boolean;
}

@Component({
  selector: 'app-requirements',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, AdminSideNav],
  templateUrl: './requirements.html',
  styleUrls: ['./requirements.css']
})
export class Requirements implements OnInit {
  private http = inject(HttpClient);

  requirements = signal<Requirement[]>([]);
  loading = signal<boolean>(false);
  showModal = signal<boolean>(false);
  editMode = signal<boolean>(false);
  
  // Form data
  currentRequirement = signal<Requirement>({
    document_type: '',
    required_metadata: [
      'title', 'abstract', 'adviser', 'faculty_in_charge', 'department', 'program', 'access_level'
    ],
    required_structured_fields: {
      authors: {
        enabled: true,
        min_count: 1,
        max_count: 5,
        require_firstname_lastname: true
      },
      panelists: {
        enabled: true,
        min_count: 1,
        max_count: 4,
        require_firstname_lastname: true
      },
      tags: {
        enabled: true,
        min_count: 3,
        require_firstname_lastname: false
      }
    },
    required_files: [],
    is_active: true
  });

  // New file requirement form
  newFileId = signal<string>('');
  newFileLabel = signal<string>('');
  newFileRequired = signal<boolean>(true);
  newFileAccept = signal<string>('');

  // Available document types
  documentTypes = signal<string[]>(['capstone_paper', 'thesis']);

  private apiUrl = `${environment.apiUrl}/requirements`;

  constructor() {}

  ngOnInit() {
    this.loadRequirements();
  }

  loadRequirements() {
    this.loading.set(true);
    this.http.get<{ success: boolean; data: Requirement[] }>(this.apiUrl)
      .subscribe({
        next: (response) => {
          this.requirements.set(response.data);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading requirements:', error);
          alert('Failed to load requirements');
          this.loading.set(false);
        }
      });
  }

  openModal(requirement?: Requirement) {
    if (requirement) {
      this.editMode.set(true);
      this.currentRequirement.set({ ...requirement });
    } else {
      this.editMode.set(false);
      this.currentRequirement.set({
        document_type: '',
        required_metadata: [
          'title', 'abstract', 'adviser', 'faculty_in_charge', 'department', 'program', 'access_level'
        ],
        required_structured_fields: {
          authors: {
            enabled: true,
            min_count: 1,
            max_count: 5,
            require_firstname_lastname: true
          },
          panelists: {
            enabled: true,
            min_count: 1,
            max_count: 4,
            require_firstname_lastname: true
          },
          tags: {
            enabled: true,
            min_count: 3,
            require_firstname_lastname: false
          }
        },
        required_files: [],
        is_active: true
      });
    }
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.editMode.set(false);
    this.currentRequirement.set({
      document_type: '',
      required_metadata: [
        'title', 'abstract', 'authors', 'tags', 'adviser',
        'faculty_in_charge', 'panelists', 'department', 'program', 'access_level'
      ],
      required_files: [],
      is_active: true
    });
  }

  addFileRequirement() {
    const id = this.newFileId();
    const label = this.newFileLabel();
    
    if (!id || !label) {
      alert('Please enter both ID and Label for the file requirement');
      return;
    }

    // Check if ID already exists
    const existing = this.currentRequirement().required_files.find(f => f.id === id);
    if (existing) {
      alert('A file requirement with this ID already exists');
      return;
    }

    const newFile: FileRequirement = {
      id,
      label,
      required: this.newFileRequired(),
      accept: this.newFileAccept() || undefined
    };

    this.currentRequirement.update(req => ({
      ...req,
      required_files: [...req.required_files, newFile]
    }));

    // Reset form
    this.newFileId.set('');
    this.newFileLabel.set('');
    this.newFileRequired.set(true);
    this.newFileAccept.set('');
  }

  removeFileRequirement(index: number) {
    this.currentRequirement.update(req => ({
      ...req,
      required_files: req.required_files.filter((_, i) => i !== index)
    }));
  }

  moveFileUp(index: number) {
    if (index === 0) return;
    
    this.currentRequirement.update(req => {
      const files = [...req.required_files];
      [files[index - 1], files[index]] = [files[index], files[index - 1]];
      return { ...req, required_files: files };
    });
  }

  moveFileDown(index: number) {
    this.currentRequirement.update(req => {
      const files = [...req.required_files];
      if (index === files.length - 1) return req;
      [files[index], files[index + 1]] = [files[index + 1], files[index]];
      return { ...req, required_files: files };
    });
  }

  saveRequirement() {
    const current = this.currentRequirement();

    if (!current.document_type) {
      alert('Please select a document type');
      return;
    }

    if (current.required_files.length === 0) {
      alert('Please add at least one file requirement');
      return;
    }

    this.loading.set(true);

    if (this.editMode()) {
      // Update existing
      this.http.put(`${this.apiUrl}/${current.document_type}`, {
        required_metadata: current.required_metadata,
        required_files: current.required_files,
        is_active: current.is_active
      }).subscribe({
        next: () => {
          alert('Requirements updated successfully');
          this.closeModal();
          this.loadRequirements();
        },
        error: (error) => {
          console.error('Error updating requirements:', error);
          alert(error.error?.message || 'Failed to update requirements');
          this.loading.set(false);
        }
      });
    } else {
      // Create new
      this.http.post(this.apiUrl, {
        document_type: current.document_type,
        required_metadata: current.required_metadata,
        required_files: current.required_files,
        created_by: 'dean' // TODO: Get from auth service
      }).subscribe({
        next: () => {
          alert('Requirements created successfully');
          this.closeModal();
          this.loadRequirements();
        },
        error: (error) => {
          console.error('Error creating requirements:', error);
          alert(error.error?.message || 'Failed to create requirements');
          this.loading.set(false);
        }
      });
    }
  }

  deleteRequirement(documentType: string) {
    if (!confirm(`Are you sure you want to delete requirements for ${documentType}?`)) {
      return;
    }

    this.loading.set(true);
    this.http.delete(`${this.apiUrl}/${documentType}`)
      .subscribe({
        next: () => {
          alert('Requirements deleted successfully');
          this.loadRequirements();
        },
        error: (error) => {
          console.error('Error deleting requirements:', error);
          alert(error.error?.message || 'Failed to delete requirements');
          this.loading.set(false);
        }
      });
  }

  getDocumentTypeDisplayName(type: string): string {
    switch (type) {
      case 'capstone_paper': return 'Capstone Paper';
      case 'thesis': return 'Thesis';
      default: return type;
    }
  }

  // Helper methods for structured fields
  getAuthorsEnabled(): boolean {
    return this.currentRequirement().required_structured_fields?.authors?.enabled ?? false;
  }

  setAuthorsEnabled(value: boolean): void {
    const current = this.currentRequirement();
    if (!current.required_structured_fields) {
      current.required_structured_fields = {};
    }
    if (!current.required_structured_fields.authors) {
      current.required_structured_fields.authors = {
        enabled: false,
        min_count: 1,
        max_count: 5,
        require_firstname_lastname: true
      };
    }
    current.required_structured_fields.authors.enabled = value;
    this.currentRequirement.set({...current});
  }

  getAuthorsMinCount(): number {
    return this.currentRequirement().required_structured_fields?.authors?.min_count ?? 1;
  }

  setAuthorsMinCount(value: number): void {
    const current = this.currentRequirement();
    if (!current.required_structured_fields) {
      current.required_structured_fields = {};
    }
    if (!current.required_structured_fields.authors) {
      current.required_structured_fields.authors = {
        enabled: false,
        min_count: 1,
        max_count: 5,
        require_firstname_lastname: true
      };
    }
    current.required_structured_fields.authors.min_count = value;
    this.currentRequirement.set({...current});
  }

  getAuthorsMaxCount(): number {
    return this.currentRequirement().required_structured_fields?.authors?.max_count ?? 5;
  }

  setAuthorsMaxCount(value: number): void {
    const current = this.currentRequirement();
    if (!current.required_structured_fields) {
      current.required_structured_fields = {};
    }
    if (!current.required_structured_fields.authors) {
      current.required_structured_fields.authors = {
        enabled: false,
        min_count: 1,
        max_count: 5,
        require_firstname_lastname: true
      };
    }
    current.required_structured_fields.authors.max_count = value;
    this.currentRequirement.set({...current});
  }

  getAuthorsRequireFirstnameLastname(): boolean {
    return this.currentRequirement().required_structured_fields?.authors?.require_firstname_lastname ?? true;
  }

  setAuthorsRequireFirstnameLastname(value: boolean): void {
    const current = this.currentRequirement();
    if (!current.required_structured_fields) {
      current.required_structured_fields = {};
    }
    if (!current.required_structured_fields.authors) {
      current.required_structured_fields.authors = {
        enabled: false,
        min_count: 1,
        max_count: 5,
        require_firstname_lastname: true
      };
    }
    current.required_structured_fields.authors.require_firstname_lastname = value;
    this.currentRequirement.set({...current});
  }

  // Panelists helpers
  getPanelistsEnabled(): boolean {
    return this.currentRequirement().required_structured_fields?.panelists?.enabled ?? false;
  }

  setPanelistsEnabled(value: boolean): void {
    const current = this.currentRequirement();
    if (!current.required_structured_fields) {
      current.required_structured_fields = {};
    }
    if (!current.required_structured_fields.panelists) {
      current.required_structured_fields.panelists = {
        enabled: false,
        min_count: 1,
        max_count: 4,
        require_firstname_lastname: true
      };
    }
    current.required_structured_fields.panelists.enabled = value;
    this.currentRequirement.set({...current});
  }

  getPanelistsMinCount(): number {
    return this.currentRequirement().required_structured_fields?.panelists?.min_count ?? 1;
  }

  setPanelistsMinCount(value: number): void {
    const current = this.currentRequirement();
    if (!current.required_structured_fields) {
      current.required_structured_fields = {};
    }
    if (!current.required_structured_fields.panelists) {
      current.required_structured_fields.panelists = {
        enabled: false,
        min_count: 1,
        max_count: 4,
        require_firstname_lastname: true
      };
    }
    current.required_structured_fields.panelists.min_count = value;
    this.currentRequirement.set({...current});
  }

  getPanelistsMaxCount(): number {
    return this.currentRequirement().required_structured_fields?.panelists?.max_count ?? 4;
  }

  setPanelistsMaxCount(value: number): void {
    const current = this.currentRequirement();
    if (!current.required_structured_fields) {
      current.required_structured_fields = {};
    }
    if (!current.required_structured_fields.panelists) {
      current.required_structured_fields.panelists = {
        enabled: false,
        min_count: 1,
        max_count: 4,
        require_firstname_lastname: true
      };
    }
    current.required_structured_fields.panelists.max_count = value;
    this.currentRequirement.set({...current});
  }

  getPanelistsRequireFirstnameLastname(): boolean {
    return this.currentRequirement().required_structured_fields?.panelists?.require_firstname_lastname ?? true;
  }

  setPanelistsRequireFirstnameLastname(value: boolean): void {
    const current = this.currentRequirement();
    if (!current.required_structured_fields) {
      current.required_structured_fields = {};
    }
    if (!current.required_structured_fields.panelists) {
      current.required_structured_fields.panelists = {
        enabled: false,
        min_count: 1,
        max_count: 4,
        require_firstname_lastname: true
      };
    }
    current.required_structured_fields.panelists.require_firstname_lastname = value;
    this.currentRequirement.set({...current});
  }

  // Tags helpers
  getTagsEnabled(): boolean {
    return this.currentRequirement().required_structured_fields?.tags?.enabled ?? false;
  }

  setTagsEnabled(value: boolean): void {
    const current = this.currentRequirement();
    if (!current.required_structured_fields) {
      current.required_structured_fields = {};
    }
    if (!current.required_structured_fields.tags) {
      current.required_structured_fields.tags = {
        enabled: false,
        min_count: 3,
        require_firstname_lastname: false
      };
    }
    current.required_structured_fields.tags.enabled = value;
    this.currentRequirement.set({...current});
  }

  getTagsMinCount(): number {
    return this.currentRequirement().required_structured_fields?.tags?.min_count ?? 3;
  }

  setTagsMinCount(value: number): void {
    const current = this.currentRequirement();
    if (!current.required_structured_fields) {
      current.required_structured_fields = {};
    }
    if (!current.required_structured_fields.tags) {
      current.required_structured_fields.tags = {
        enabled: false,
        min_count: 3,
        require_firstname_lastname: false
      };
    }
    current.required_structured_fields.tags.min_count = value;
    this.currentRequirement.set({...current});
  }

  getTagsMaxCount(): number {
    return this.currentRequirement().required_structured_fields?.tags?.max_count ?? 10;
  }

  setTagsMaxCount(value: number): void {
    const current = this.currentRequirement();
    if (!current.required_structured_fields) {
      current.required_structured_fields = {};
    }
    if (!current.required_structured_fields.tags) {
      current.required_structured_fields.tags = {
        enabled: false,
        min_count: 3,
        require_firstname_lastname: false
      };
    }
    current.required_structured_fields.tags.max_count = value;
    this.currentRequirement.set({...current});
  }
}
