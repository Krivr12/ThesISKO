import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SignedUrlResponse {
  uploadUrl: string;
  key: string;
}

export interface SignedUrlsResponse {
  urls: Array<{
    uploadUrl: string;
    key: string;
  }>;
}

export interface FileToUpload {
  filename: string;
  contentType: string;
}

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

  /**
   * Get signed URL for uploading a single file
   * @param groupId - Group ID (e.g., "2425-BSIT-5_1")
   * @param filename - File name (e.g., "manuscript.pdf")
   * @param contentType - MIME type (e.g., "application/pdf")
   * @returns Observable with uploadUrl and key
   */
  getSignedUrl(groupId: string, filename: string, contentType: string): Observable<SignedUrlResponse> {
    return this.http.post<SignedUrlResponse>(
      `${this.apiUrl}/s3/signed-url`,
      { group_id: groupId, filename, contentType }
    );
  }

  /**
   * Get signed URLs for uploading multiple files
   * @param groupId - Group ID
   * @param files - Array of files with filename and contentType
   * @returns Observable with array of uploadUrls and keys
   */
  getSignedUrls(groupId: string, files: FileToUpload[]): Observable<SignedUrlsResponse> {
    return this.http.post<SignedUrlsResponse>(
      `${this.apiUrl}/s3/signed-urls`,
      { group_id: groupId, files }
    );
  }

  /**
   * Upload file directly to S3 using signed URL
   * @param signedUrl - Pre-signed URL from S3
   * @param file - File to upload
   * @param contentType - MIME type
   * @returns Observable that completes when upload is done
   */
  uploadToS3(signedUrl: string, file: File, contentType: string): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': contentType
    });

    // Use fetch API wrapped in Observable for direct S3 upload
    return from(
      fetch(signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType
        },
        body: file
      }).then(response => {
        if (!response.ok) {
          throw new Error(`S3 upload failed: ${response.statusText}`);
        }
        return response;
      })
    );
  }
}

