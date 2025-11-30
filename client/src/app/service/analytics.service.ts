import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DashboardAnalytics {
  totalThesis: number;
  totalUsers: number;
  totalRequests: number;
  totalDownloads: number;
  registeredNonPUP: number;
  pendingApprovals: number;
  docsPerProgram: ProgramStats[];
  commonKeywords: KeywordStats[];
  requestsByType: RequestsByType;
  changes: PercentageChanges;
  period: string;
}

export interface PercentageChanges {
  thesis: number;
  users: number;
  requests: number;
  downloads: number;
}

export interface ProgramStats {
  program_id: string;
  program_name: string;
  count: number;
}

export interface KeywordStats {
  keyword: string;
  count: number;
}

export interface RequestsByType {
  student: number;
  guest: number;
}

export interface MonthlyRequestsData {
  months: string[];
  studentRequests: number[];
  guestRequests: number[];
}

export interface UserGrowthData {
  months: string[];
  newUsers: number[];
  cumulativeUsers: number[];
}

export interface DocumentViewStats {
  document_id: string;
  title: string;
  authors: string[];
  year: string;
  program: string;
  views: number;
}

export interface ViewedDocumentsResponse {
  mostViewed: DocumentViewStats[];
  leastViewed: DocumentViewStats[];
  totalDocuments: number;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private apiUrl = `${environment.apiBaseUrl}/analytics`;

  constructor(private http: HttpClient) {}

  getDashboardAnalytics(period: string = 'this_month'): Observable<DashboardAnalytics> {
    return this.http.get<DashboardAnalytics>(`${this.apiUrl}/dashboard`, {
      params: { period }
    });
  }

  getMonthlyRequestsData(months: number = 6): Observable<MonthlyRequestsData> {
    return this.http.get<MonthlyRequestsData>(`${this.apiUrl}/requests-by-month`, {
      params: { months: months.toString() }
    });
  }

  getViewedDocuments(limit: number = 5): Observable<ViewedDocumentsResponse> {
    return this.http.get<ViewedDocumentsResponse>(`${this.apiUrl}/viewed-documents`, {
      params: { limit: limit.toString() }
    });
  }

  getUserGrowthData(months: number = 6): Observable<UserGrowthData> {
    return this.http.get<UserGrowthData>(`${this.apiUrl}/user-growth`, {
      params: { months: months.toString() }
    });
  }
}

