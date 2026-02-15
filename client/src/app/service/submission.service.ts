import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface MilestoneFilesRequest {
  action: 'add' | 'remove' | 'replace';
  files: string[]; // Array of S3 keys
}

export interface GroupResponse {
  message: string;
  group: any;
}

@Injectable({
  providedIn: 'root'
})
export class SubmissionService {
  private apiUrl = `${environment.authApiUrl}/groups`;

  constructor(private http: HttpClient) {}

  /**
   * Add files to a milestone
   * @param groupId - Group ID (e.g., "2425-BSIT-5_1")
   * @param milestoneType - Milestone type (e.g., "upload_manuscript")
   * @param s3Keys - Array of S3 keys to add
   * @returns Observable with response
   */
  addMilestoneFiles(groupId: string, milestoneType: string, s3Keys: string[]): Observable<GroupResponse> {
    return this.http.patch<GroupResponse>(
      `${this.apiUrl}/${groupId}/milestones/${milestoneType}/files`,
      { action: 'add', files: s3Keys }
    );
  }

  /**
   * Remove files from a milestone
   * @param groupId - Group ID
   * @param milestoneType - Milestone type
   * @param s3Keys - Array of S3 keys to remove
   * @returns Observable with response
   */
  removeMilestoneFiles(groupId: string, milestoneType: string, s3Keys: string[]): Observable<GroupResponse> {
    return this.http.patch<GroupResponse>(
      `${this.apiUrl}/${groupId}/milestones/${milestoneType}/files`,
      { action: 'remove', files: s3Keys }
    );
  }

  /**
   * Get group details including milestone status
   * @param groupId - Group ID
   * @returns Observable with group data
   */
  getGroupStatus(groupId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${groupId}`);
  }

  /**
   * Update group with title, abstract, tags, access level (Step 5 data)
   * @param groupId - Group ID
   * @param data - Group data to update
   * @returns Observable with response
   */
  updateGroupMetadata(groupId: string, data: {
    title?: string;
    abstract?: string;
    tags?: string[];
    access_level?: 'Full' | 'Partial' | 'Restricted';
  }): Observable<GroupResponse> {
    return this.http.patch<GroupResponse>(
      `${this.apiUrl}/${groupId}`,
      data
    );
  }

  /**
   * Update milestone status to true/false
   * Used for describe_work milestone which doesn't have files
   * @param groupId - Group ID
   * @param milestoneType - Milestone type
   * @param status - Status value (true/false)
   * @returns Observable with response
   */
  updateMilestoneStatus(groupId: string, milestoneType: string, status: boolean): Observable<GroupResponse> {
    return this.http.patch<GroupResponse>(
      `${this.apiUrl}/${groupId}`,
      { 
        milestones: {
          [milestoneType]: {
            status: status,
            updated_at: new Date()
          }
        }
      }
    );
  }
}
