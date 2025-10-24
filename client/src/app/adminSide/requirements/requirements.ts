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
  to_be_archived?: boolean;
}

interface ArchiveFile {
  id: string;
  label: string;
  to_be_archived: boolean;
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
    [key: string]: StructuredField;
  };
  required_files: FileRequirement[];
  archive_files?: ArchiveFile[];
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
      'title', 'abstract', 'access_level', 'department', 'program', 'year'
    ],
    required_structured_fields: {
      authors: {
        enabled: true,
        min_count: 1,
        max_count: 5,
        require_firstname_lastname: true
      },
      tags: {
        enabled: true,
        min_count: 1,
        max_count: 10,
        require_firstname_lastname: false
      }
    },
    required_files: [],
    archive_files: [],
    is_active: true
  });

  // New file requirement form
  newFileId = signal<string>('');
  newFileLabel = signal<string>('');
  newFileRequired = signal<boolean>(true);
  newFileAccept = signal<string>('');
  newFileArchive = signal<boolean>(false);

  // New metadata field form
  newMetadataField = signal<string>('');

  // New structured field form
  newStructuredFieldName = signal<string>('');

  // Default metadata fields that cannot be removed
  private defaultMetadataFields = ['title', 'abstract', 'access_level', 'department', 'program', 'year'];

  // Default structured fields that cannot be removed
  private defaultStructuredFields = ['authors', 'tags'];

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
      // Ensure default structured fields are always present
      const structuredFields = requirement.required_structured_fields || {};
      const defaultFields = {
        authors: {
          enabled: true,
          min_count: 1,
          max_count: 5,
          require_firstname_lastname: true
        },
        tags: {
          enabled: true,
          min_count: 1,
          max_count: 10,
          require_firstname_lastname: false
        }
      };
      
      // Merge default fields with existing fields, preserving existing values
      const mergedStructuredFields = {
        ...defaultFields,
        ...structuredFields
      };
      
      this.currentRequirement.set({ 
        ...requirement,
        required_structured_fields: mergedStructuredFields
      });
    } else {
      this.editMode.set(false);
      this.currentRequirement.set({
        document_type: '',
        required_metadata: [
          'title', 'abstract', 'access_level', 'department', 'program', 'year'
        ],
        required_structured_fields: {
          authors: {
            enabled: true,
            min_count: 1,
            max_count: 5,
            require_firstname_lastname: true
          },
          tags: {
            enabled: true,
            min_count: 1,
            max_count: 10,
            require_firstname_lastname: false
          }
        },
        required_files: [],
        archive_files: [],
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
        'title', 'abstract', 'access_level', 'department', 'program', 'year'
      ],
      required_structured_fields: {
        authors: {
          enabled: true,
          min_count: 1,
          max_count: 5,
          require_firstname_lastname: true
        },
        tags: {
          enabled: true,
          min_count: 1,
          max_count: 10,
          require_firstname_lastname: false
        }
      },
      required_files: [],
      archive_files: [],
      is_active: true
    });
    // Reset form fields
    this.newMetadataField.set('');
    this.newStructuredFieldName.set('');
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
      accept: this.newFileAccept() || undefined,
      to_be_archived: this.newFileArchive()
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
    this.newFileArchive.set(false);
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
        required_structured_fields: current.required_structured_fields,
        required_files: current.required_files,
        archive_files: this.generateArchiveFiles(),
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
        required_structured_fields: current.required_structured_fields,
        required_files: current.required_files,
        archive_files: this.generateArchiveFiles(),
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
    return this.formatToTitleCase(type);
  }

  // Format document type name to title case
  formatDocumentTypeName(): void {
    const current = this.currentRequirement();
    const formatted = this.formatToTitleCase(current.document_type);
    this.currentRequirement.update(req => ({
      ...req,
      document_type: formatted
    }));
  }

  private formatToTitleCase(text: string): string {
    return text
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Metadata field management
  isDefaultMetadataField(field: string): boolean {
    return this.defaultMetadataFields.includes(field);
  }

  addMetadataField(): void {
    const fieldName = this.newMetadataField().trim();
    if (!fieldName) return;

    const current = this.currentRequirement();
    if (current.required_metadata.includes(fieldName)) {
      alert('This metadata field already exists');
      return;
    }

    this.currentRequirement.update(req => ({
      ...req,
      required_metadata: [...req.required_metadata, fieldName]
    }));

    this.newMetadataField.set('');
  }

  removeMetadataField(index: number): void {
    const current = this.currentRequirement();
    const field = current.required_metadata[index];
    
    if (this.isDefaultMetadataField(field)) {
      alert('Cannot remove default metadata fields');
      return;
    }

    this.currentRequirement.update(req => ({
      ...req,
      required_metadata: req.required_metadata.filter((_, i) => i !== index)
    }));
  }

  // Structured field management
  isDefaultStructuredField(fieldName: string): boolean {
    return this.defaultStructuredFields.includes(fieldName);
  }

  getStructuredFieldsList(): Array<{name: string, enabled: boolean, min_count: number, max_count: number, require_firstname_lastname?: boolean}> {
    const current = this.currentRequirement();
    const fields = current.required_structured_fields || {};
    
    // Always include default structured fields
    const allFields = new Set([...this.defaultStructuredFields, ...Object.keys(fields)]);
    
    return Array.from(allFields).map(name => ({
      name,
      enabled: fields[name]?.enabled ?? (this.defaultStructuredFields.includes(name) ? true : false),
      min_count: fields[name]?.min_count ?? (name === 'authors' ? 1 : name === 'tags' ? 1 : 1),
      max_count: fields[name]?.max_count ?? (name === 'authors' ? 5 : name === 'tags' ? 10 : 10),
      require_firstname_lastname: fields[name]?.require_firstname_lastname ?? (name === 'authors' ? true : false)
    }));
  }

  getFieldDisplayName(fieldName: string): string {
    return this.formatToTitleCase(fieldName);
  }

  addStructuredField(): void {
    const fieldName = this.newStructuredFieldName().trim().toLowerCase();
    if (!fieldName) return;

    const current = this.currentRequirement();
    if (current.required_structured_fields?.[fieldName]) {
      alert('This structured field already exists');
      return;
    }

    this.currentRequirement.update(req => {
      const structuredFields = req.required_structured_fields || {};
      structuredFields[fieldName] = {
        enabled: true,
        min_count: 1,
        max_count: 10,
        require_firstname_lastname: false
      };
      return {
        ...req,
        required_structured_fields: structuredFields
      };
    });

    this.newStructuredFieldName.set('');
  }

  removeStructuredField(fieldName: string): void {
    if (this.isDefaultStructuredField(fieldName)) {
      alert('Cannot remove default structured fields');
      return;
    }

    this.currentRequirement.update(req => {
      const structuredFields = { ...req.required_structured_fields };
      delete structuredFields[fieldName];
      return {
        ...req,
        required_structured_fields: structuredFields
      };
    });
  }

  setStructuredFieldEnabled(fieldName: string, enabled: boolean): void {
    this.currentRequirement.update(req => {
      const structuredFields = req.required_structured_fields || {};
      if (!structuredFields[fieldName]) {
        structuredFields[fieldName] = {
          enabled: false,
          min_count: 1,
          max_count: 10,
          require_firstname_lastname: false
        };
      }
      structuredFields[fieldName].enabled = enabled;
      return {
        ...req,
        required_structured_fields: structuredFields
      };
    });
  }

  setStructuredFieldMinCount(fieldName: string, value: number): void {
    const minValue = Math.max(1, value); // Ensure minimum is 1
    this.currentRequirement.update(req => {
      const structuredFields = req.required_structured_fields || {};
      if (!structuredFields[fieldName]) {
        structuredFields[fieldName] = {
          enabled: false,
          min_count: 1,
          max_count: 10,
          require_firstname_lastname: false
        };
      }
      structuredFields[fieldName].min_count = minValue;
      return {
        ...req,
        required_structured_fields: structuredFields
      };
    });
  }

  setStructuredFieldMaxCount(fieldName: string, value: number): void {
    const maxValue = Math.max(1, value); // Ensure minimum is 1
    this.currentRequirement.update(req => {
      const structuredFields = req.required_structured_fields || {};
      if (!structuredFields[fieldName]) {
        structuredFields[fieldName] = {
          enabled: false,
          min_count: 1,
          max_count: 10,
          require_firstname_lastname: false
        };
      }
      structuredFields[fieldName].max_count = maxValue;
      return {
        ...req,
        required_structured_fields: structuredFields
      };
    });
  }

  setStructuredFieldRequireFirstnameLastname(fieldName: string, value: boolean): void {
    this.currentRequirement.update(req => {
      const structuredFields = req.required_structured_fields || {};
      if (!structuredFields[fieldName]) {
        structuredFields[fieldName] = {
          enabled: false,
          min_count: 1,
          max_count: 10,
          require_firstname_lastname: false
        };
      }
      structuredFields[fieldName].require_firstname_lastname = value;
      return {
        ...req,
        required_structured_fields: structuredFields
      };
    });
  }

  // Event handler methods for template
  onStructuredFieldEnabledChange(fieldName: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    this.setStructuredFieldEnabled(fieldName, target.checked);
  }

  onStructuredFieldMinCountChange(fieldName: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    this.setStructuredFieldMinCount(fieldName, +target.value);
  }

  onStructuredFieldMaxCountChange(fieldName: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    this.setStructuredFieldMaxCount(fieldName, +target.value);
  }

  onStructuredFieldRequireFirstnameLastnameChange(fieldName: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    this.setStructuredFieldRequireFirstnameLastname(fieldName, target.checked);
  }


  // Generate archive_files from required_files
  generateArchiveFiles(): ArchiveFile[] {
    return this.currentRequirement().required_files
      .filter(file => file.to_be_archived)
      .map(file => ({
        id: file.id,
        label: file.label,
        to_be_archived: file.to_be_archived || false
      }));
  }
}
