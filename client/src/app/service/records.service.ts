import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UpdateItem {
  title: string;
  submitted_at: string;
  authors: string[];
  access_level: string;
  tags: string[];
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
}
