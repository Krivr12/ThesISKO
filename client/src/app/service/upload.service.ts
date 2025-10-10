import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UploadService {
  private baseUrl = 'https://thesisko-server.vercel.app/s3/upload'; //  backend URL

  constructor(private http: HttpClient) {}

  // method to send the file to the backend
 uploadFile(file: File): Observable<any> {
  const formData = new FormData();
  formData.append('file', file); // 'file' must match the field name backend expects
  return this.http.post(this.baseUrl, formData); // no extra /upload
}
}

