import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// Interface for Supabase requesters_analytics
export interface RequesterAnalytics {
  id?: number;
  request_id: string;
  user_type: string;
  email: string;
  status: string;
  department?: string;
  program?: string;
  country?: string;
  city?: string;
  school?: string;
  created_at: string;
  updated_at?: string;
}

// Interface for request details
export interface RequestDetails {
  request: {
    _id: string;
    document_id: string;
    userType: string;
    requester: {
      email: string;
      department?: string;
      program?: string;
      country?: string;
      city?: string;
      school?: string;
      [key: string]: any;
    };
    chaptersRequested: string[];
    purpose: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    deanRemarks?: string;
    approvedChapters?: string[];
    s3Key?: string;
  };
  document: {
    _id: string;
    document_id: string;
    title: string;
    abstract: string;
    authors: string[];
    tags: string[];
    file_key: string;
    program_name: string;
    department: string;
    submitted_at?: string;
    created_at: string;
  } | null;
}

@Injectable({
  providedIn: 'root'
})
export class RequestService {
  private apiUrl = `${environment.authApiUrl}/requests`;

  constructor(private http: HttpClient) {}

  // Get all requests from Supabase
  getAllRequests(): Observable<RequesterAnalytics[]> {
    return this.http.get<RequesterAnalytics[]>(`${this.apiUrl}/analytics`);
  }

  // Get request details (MongoDB + Records)
  getRequestDetails(requestId: string): Observable<RequestDetails> {
    return this.http.get<RequestDetails>(`${this.apiUrl}/${requestId}/details`);
  }

  // Approve request with PDF upload
  approveRequest(requestId: string, pdfFile: File): Observable<any> {
    const formData = new FormData();
    formData.append('pdf', pdfFile);
    formData.append('status', 'approved');
    formData.append('deanRemarks', 'Request approved by admin');

    return this.http.post(`${this.apiUrl}/${requestId}/respond`, formData);
  }

  // Reject request
  rejectRequest(requestId: string, reason: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${requestId}/reject`, { reason });
  }
}

