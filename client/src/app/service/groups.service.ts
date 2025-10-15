import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface GroupItem {
  _id: string;
  group_id: string;
  title?: string;
  abstract?: string;
  created_at: string;
  milestones: any[];
  leader: any;
  members: any[];
  tags: string[];
  forApproval: number;
}

@Injectable({ providedIn: 'root' })
export class GroupsService {
  constructor(private http: HttpClient) {}

  getPendingGroupApprovals(email: string): Observable<GroupItem[]> {
    return this.http.get<{ success: boolean, data: GroupItem[] }>(`/api/groups/by-chairperson/${email}`)
      .pipe(map((result: { success: boolean, data: GroupItem[] }) => result.data));
  }

  approveGroup(groupId: string, userName: string): Observable<any> {
    return this.http.patch(`/api/groups/${groupId}/chairperson-approve-final`, { name: userName });
  }

  rejectGroup(groupId: string, userName: string, reason: string, milestone: string): Observable<any> {
    return this.http.patch(`/api/groups/${groupId}/chairperson-reject`, { name: userName, reason, milestone });
  }

  deleteGroup(_id: string): Observable<any> {
    return this.http.delete(`/api/groups/${_id}`);
  }
}
