import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class S3Service {
  private apiUrl = environment.authApiUrl; // Base API URL

  constructor(private http: HttpClient) {}

  /**
   * Get signed URL for viewing repository file (approved documents)
   * @param fileKey - Full S3 key (e.g., "repository-files/2025-BSCS-0001/manuscript.pdf")
   * @returns Observable with signedUrl and expiresIn
   */
  getRepositoryFileSignedUrl(fileKey: string): Observable<{ signedUrl: string; expiresIn: number }> {
    return this.http.post<{ signedUrl: string; expiresIn: number }>(
      `${this.apiUrl}/s3/view-repository-file`,
      { file_key: fileKey }
    );
  }
}

