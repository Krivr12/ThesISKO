import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class SubmissionService {
  private baseUrl = 'https://thesisko.onrender.com'; // your backend URL

  constructor(private http: HttpClient) {}

  uploadFile(file: File): Observable<number> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post(`${this.baseUrl}/s3/upload`, formData, {
      reportProgress: true,
      observe: 'events'
    }).pipe(
      map((event: HttpEvent<any>) => {
        switch (event.type) {
          case HttpEventType.UploadProgress:
            return Math.round((100 * event.loaded) / (event.total || 1));
          case HttpEventType.Response:
            return 100;
          default:
            return 0;
        }
      })
    );
  }
}
