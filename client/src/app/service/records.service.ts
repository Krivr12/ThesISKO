import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UpdateItem {
  _id: string;
  document_id: string;
  title: string;
  submitted_at: string;
  year?: number | string; // Year extracted from document (may be from year, metadata.year, student.year, or submitted_at)
  authors: string[];
  tags: string[];
}

// Full record interface from MongoDB
export interface RecordItem {
  _id: string;
  document_id: string;
  title: string;
  abstract: string;
  tags: string[];
  access_level: string;
  authors: string[];
  file_key: string;  // S3 key for manuscript
  program_id: string;
  program_name: string;
  department: string;
  submitted_at?: string;  // Submission date (may not exist on older records)
  created_at: string;
  updated_at: string;
  abstract_embedding?: number[];
}

@Injectable({
  providedIn: 'root'
})
export class RecordsService {
  private apiUrl = environment.recordsApiUrl; // 👈 adjust if your server runs elsewhere

  constructor(private http: HttpClient) {}

  getLatestRecords(): Observable<UpdateItem[]> {
    return this.http.get<UpdateItem[]>(`${this.apiUrl}/latest`);
  }

  // Get all records from MongoDB (for admin documents page)
  getAllRecords(): Observable<RecordItem[]> {
    return this.http.get<RecordItem[]>(`${this.apiUrl}?full=true`);
  }

  // Delete record by MongoDB _id (also deletes S3 file)
  deleteRecord(_id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${_id}`);
  }

  // Update record without file
  updateRecord(_id: string, updateData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${_id}`, updateData);
  }

  // Update record with new manuscript file (replaces existing)
  updateRecordWithFile(_id: string, updateData: any, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('manuscript', file);
    
    // Add other fields to formData
    Object.keys(updateData).forEach(key => {
      if (Array.isArray(updateData[key])) {
        formData.append(key, JSON.stringify(updateData[key]));
      } else {
        formData.append(key, updateData[key]);
      }
    });

    return this.http.put(`${this.apiUrl}/${_id}/with-file`, formData);
  }
}
