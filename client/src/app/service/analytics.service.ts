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
}

