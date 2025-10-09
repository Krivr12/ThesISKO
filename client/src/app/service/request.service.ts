import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RequestSubmission {
  docId: string;
  userType: 'student' | 'guest' | 'group';
  requester: {
    email: string;
    name?: string;
    program?: string;
    department?: string;
    country?: string;
    city?: string;
    school?: string;
    group_id?: string;
    leader_name?: string;
  };
  chaptersRequested: string[];
  purpose: string;
}

export interface RequestResponse {
  message: string;
  requestId: string;
}

@Injectable({
  providedIn: 'root'
})
export class RequestService {
  private baseUrl = 'http://localhost:5050'; // Update this to your server URL

  constructor(private http: HttpClient) {}

  submitRequest(request: RequestSubmission): Observable<RequestResponse> {
    return this.http.post<RequestResponse>(`${this.baseUrl}/requests`, request, {
      withCredentials: true
    });
  }

  // Get all requests (for admin)
  getAllRequests(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/requests`, {
      withCredentials: true
    });
  }

  // Get request by ID
  getRequestById(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/requests/${id}`, {
      withCredentials: true
    });
  }
}
