import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ActivityLogEntry {
  log_id?: number;
  user_id?: number;
  session_id?: string;
  action_type: string;
  action_description: string;
  resource_type?: string;
  resource_id?: string;
  ip_address?: string;
  user_agent?: string;
  request_method?: string;
  request_url?: string;
  request_body?: any;
  response_status?: number;
  created_at?: string;
  additional_data?: any;
}

export interface ActivityLogOptions {
  limit?: number;
  offset?: number;
  actionType?: string;
  startDate?: Date;
  endDate?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ActivityLoggerService {
  private baseUrl = 'http://localhost:5050';

  constructor(private http: HttpClient) {}

  /**
   * Manually log a client-side activity
   * This is useful for actions that don't involve HTTP requests
   */
  logActivity(activityData: {
    actionType: string;
    actionDescription: string;
    resourceType?: string;
    resourceId?: string;
    additionalData?: any;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/activity/log`, {
      action_type: activityData.actionType,
      action_description: activityData.actionDescription,
      resource_type: activityData.resourceType,
      resource_id: activityData.resourceId,
      additional_data: activityData.additionalData,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log page view activity
   */
  logPageView(pageName: string, pageUrl: string, additionalData?: any): Observable<any> {
    return this.logActivity({
      actionType: 'page_view',
      actionDescription: `User viewed ${pageName} page`,
      resourceType: 'page',
      resourceId: pageUrl,
      additionalData: {
        page_name: pageName,
        page_url: pageUrl,
        timestamp: new Date().toISOString(),
        ...additionalData
      }
    });
  }

  /**
   * Log search activity
   */
  logSearch(searchQuery: string, searchType: string = 'thesis', resultsCount?: number): Observable<any> {
    return this.logActivity({
      actionType: 'search',
      actionDescription: `User searched for "${searchQuery}" in ${searchType}`,
      resourceType: 'search',
      resourceId: searchQuery,
      additionalData: {
        search_query: searchQuery,
        search_type: searchType,
        results_count: resultsCount,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log thesis interaction with role-specific handling
   */
  logThesisInteraction(
    thesisId: string, 
    actionType: 'view' | 'download' | 'request' | 'submit', 
    thesisTitle?: string
  ): Observable<any> {
    const userRole = this.getCurrentUserRole();
    const isGuest = !this.getCurrentUserId() || this.getCurrentUserId() === 'unknown';
    
    const actionDescriptions = {
      view: 'viewed thesis details',
      download: 'downloaded thesis document',
      request: 'requested access to thesis',
      submit: 'submitted thesis'
    };

    // Determine role-specific action type
    let roleSpecificActionType = `${actionType}_thesis`;
    if (isGuest && (actionType === 'view' || actionType === 'request')) {
      roleSpecificActionType = `guest_${actionType}_thesis`;
    }

    return this.logActivity({
      actionType: roleSpecificActionType,
      actionDescription: `${isGuest ? 'Guest user' : 'User'} ${actionDescriptions[actionType]} - ${thesisTitle || 'Unknown thesis'}`,
      resourceType: 'thesis',
      resourceId: thesisId,
      additionalData: {
        thesis_id: thesisId,
        thesis_title: thesisTitle,
        interaction_type: actionType,
        user_role: userRole,
        is_guest: isGuest,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log user profile interactions
   */
  logProfileInteraction(actionType: 'view' | 'edit' | 'update', additionalData?: any): Observable<any> {
    const actionDescriptions = {
      view: 'viewed profile',
      edit: 'started editing profile',
      update: 'updated profile information'
    };

    return this.logActivity({
      actionType: `profile_${actionType}`,
      actionDescription: `User ${actionDescriptions[actionType]}`,
      resourceType: 'profile',
      resourceId: this.getCurrentUserId(),
      additionalData: {
        interaction_type: actionType,
        timestamp: new Date().toISOString(),
        ...additionalData
      }
    });
  }

  /**
   * Log form submissions
   */
  logFormSubmission(formName: string, formData?: any, success: boolean = true): Observable<any> {
    return this.logActivity({
      actionType: 'form_submission',
      actionDescription: `User submitted ${formName} form - ${success ? 'Success' : 'Failed'}`,
      resourceType: 'form',
      resourceId: formName,
      additionalData: {
        form_name: formName,
        form_data: this.sanitizeFormData(formData),
        submission_success: success,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log navigation events
   */
  logNavigation(fromPage: string, toPage: string, navigationMethod: string = 'click'): Observable<any> {
    return this.logActivity({
      actionType: 'navigation',
      actionDescription: `User navigated from ${fromPage} to ${toPage}`,
      resourceType: 'navigation',
      resourceId: `${fromPage}->${toPage}`,
      additionalData: {
        from_page: fromPage,
        to_page: toPage,
        navigation_method: navigationMethod,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Get user's activity logs
   */
  getUserActivityLogs(options?: ActivityLogOptions): Observable<ActivityLogEntry[]> {
    const params: any = {};
    if (options?.limit) params.limit = options.limit;
    if (options?.offset) params.offset = options.offset;
    if (options?.actionType) params.actionType = options.actionType;
    if (options?.startDate) params.startDate = options.startDate.toISOString();
    if (options?.endDate) params.endDate = options.endDate.toISOString();

    return this.http.get<ActivityLogEntry[]>(`${this.baseUrl}/activity/user`, { params });
  }

  /**
   * Get activity statistics for current user
   */
  getUserActivityStats(): Observable<any> {
    return this.http.get(`${this.baseUrl}/activity/user/stats`);
  }

  /**
   * Get session activity logs
   */
  getSessionActivityLogs(): Observable<ActivityLogEntry[]> {
    return this.http.get<ActivityLogEntry[]>(`${this.baseUrl}/activity/session`);
  }

  /**
   * Helper method to get current user ID from session storage
   */
  private getCurrentUserId(): string {
    try {
      const user = JSON.parse(sessionStorage.getItem('user') || '{}');
      return user.id || user.StudentID || user.user_id || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Helper method to get current user role from session storage
   */
  private getCurrentUserRole(): string {
    try {
      const user = JSON.parse(sessionStorage.getItem('user') || '{}');
      return user.Status || sessionStorage.getItem('role') || 'guest';
    } catch {
      return 'guest';
    }
  }

  /**
   * Sanitize form data to remove sensitive information
   */
  private sanitizeFormData(formData: any): any {
    if (!formData || typeof formData !== 'object') return formData;

    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    const sanitized = { ...formData };

    Object.keys(sanitized).forEach(key => {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Batch log multiple activities (useful for complex user flows)
   */
  logBatchActivities(activities: Array<{
    actionType: string;
    actionDescription: string;
    resourceType?: string;
    resourceId?: string;
    additionalData?: any;
  }>): Observable<any> {
    return this.http.post(`${this.baseUrl}/activity/batch`, {
      activities: activities.map(activity => ({
        action_type: activity.actionType,
        action_description: activity.actionDescription,
        resource_type: activity.resourceType,
        resource_id: activity.resourceId,
        additional_data: activity.additionalData,
        timestamp: new Date().toISOString()
      }))
    });
  }

  // ===== ROLE-SPECIFIC ACTIVITY LOGGING METHODS =====

  /**
   * Student-specific activity logging methods
   */
  logStudentSignup(email: string, additionalData?: any): Observable<any> {
    return this.logActivity({
      actionType: 'student_signup',
      actionDescription: `New student registered: ${email}`,
      resourceType: 'user',
      resourceId: email,
      additionalData: { signup_method: 'email', ...additionalData }
    });
  }

  logStudentLogin(email: string, additionalData?: any): Observable<any> {
    return this.logActivity({
      actionType: 'student_login',
      actionDescription: `Student ${email} logged into the system`,
      resourceType: 'user',
      resourceId: email,
      additionalData: { login_method: 'email_password', ...additionalData }
    });
  }

  logStudentLogout(): Observable<any> {
    const userEmail = this.getCurrentUserEmail();
    return this.logActivity({
      actionType: 'student_logout',
      actionDescription: `Student ${userEmail} logged out of the system`,
      resourceType: 'user',
      resourceId: userEmail
    });
  }

  logThesisSubmission(thesisTitle: string, thesisId?: string): Observable<any> {
    return this.logActivity({
      actionType: 'submit_thesis',
      actionDescription: `Student submitted thesis: ${thesisTitle}`,
      resourceType: 'thesis',
      resourceId: thesisId || 'new_submission',
      additionalData: { thesis_title: thesisTitle, submission_type: 'student' }
    });
  }

  /**
   * Guest-specific activity logging methods
   */
  logGuestGoogleSignin(): Observable<any> {
    return this.logActivity({
      actionType: 'guest_google_signin',
      actionDescription: 'Guest user signed in with Google OAuth',
      resourceType: 'auth',
      resourceId: 'google_oauth',
      additionalData: { login_method: 'google_oauth', user_type: 'guest' }
    });
  }

  logGuestSearch(searchQuery: string, resultsCount?: number): Observable<any> {
    return this.logActivity({
      actionType: 'guest_search',
      actionDescription: `Guest user searched for: ${searchQuery}`,
      resourceType: 'search',
      resourceId: searchQuery,
      additionalData: { 
        search_query: searchQuery, 
        results_count: resultsCount,
        user_type: 'guest'
      }
    });
  }

  logGuestLogout(): Observable<any> {
    return this.logActivity({
      actionType: 'guest_logout',
      actionDescription: 'Guest user logged out',
      resourceType: 'session',
      resourceId: 'guest_session'
    });
  }

  /**
   * Faculty-specific activity logging methods
   */
  logFICLogin(email: string): Observable<any> {
    return this.logActivity({
      actionType: 'fic_login',
      actionDescription: `FIC ${email} logged into the system`,
      resourceType: 'user',
      resourceId: email,
      additionalData: { faculty_type: 'FIC', login_method: 'email_password' }
    });
  }

  logFICLogout(): Observable<any> {
    const userEmail = this.getCurrentUserEmail();
    return this.logActivity({
      actionType: 'fic_logout',
      actionDescription: `FIC ${userEmail} logged out of the system`,
      resourceType: 'user',
      resourceId: userEmail,
      additionalData: { faculty_type: 'FIC' }
    });
  }

  logFICApproveRequest(requestId: string, requestDetails?: string): Observable<any> {
    return this.logActivity({
      actionType: 'fic_approve_request',
      actionDescription: `FIC approved request: ${requestDetails || requestId}`,
      resourceType: 'request',
      resourceId: requestId,
      additionalData: { action: 'approve', faculty_type: 'FIC', request_details: requestDetails }
    });
  }

  logFICRejectRequest(requestId: string, reason?: string): Observable<any> {
    return this.logActivity({
      actionType: 'fic_reject_request',
      actionDescription: `FIC rejected request: ${requestId}`,
      resourceType: 'request',
      resourceId: requestId,
      additionalData: { action: 'reject', faculty_type: 'FIC', rejection_reason: reason }
    });
  }

  logFICAddGroups(groupData: any): Observable<any> {
    return this.logActivity({
      actionType: 'fic_add_groups',
      actionDescription: `FIC added new groups`,
      resourceType: 'groups',
      resourceId: 'new_groups',
      additionalData: { faculty_type: 'FIC', group_data: groupData }
    });
  }

  logPanelistLogin(email: string): Observable<any> {
    return this.logActivity({
      actionType: 'panelist_login',
      actionDescription: `Panelist ${email} logged into the system`,
      resourceType: 'user',
      resourceId: email,
      additionalData: { faculty_type: 'Panelist', login_method: 'email_password' }
    });
  }

  logPanelistLogout(): Observable<any> {
    const userEmail = this.getCurrentUserEmail();
    return this.logActivity({
      actionType: 'panelist_logout',
      actionDescription: `Panelist ${userEmail} logged out of the system`,
      resourceType: 'user',
      resourceId: userEmail,
      additionalData: { faculty_type: 'Panelist' }
    });
  }

  logPanelistApproveRequest(requestId: string, requestDetails?: string): Observable<any> {
    return this.logActivity({
      actionType: 'panelist_approve_request',
      actionDescription: `Panelist approved request: ${requestDetails || requestId}`,
      resourceType: 'request',
      resourceId: requestId,
      additionalData: { action: 'approve', faculty_type: 'Panelist', request_details: requestDetails }
    });
  }

  logPanelistRejectRequest(requestId: string, reason?: string): Observable<any> {
    return this.logActivity({
      actionType: 'panelist_reject_request',
      actionDescription: `Panelist rejected request: ${requestId}`,
      resourceType: 'request',
      resourceId: requestId,
      additionalData: { action: 'reject', faculty_type: 'Panelist', rejection_reason: reason }
    });
  }

  logPanelistComment(targetId: string, comment: string): Observable<any> {
    return this.logActivity({
      actionType: 'panelist_comment',
      actionDescription: `Panelist added a comment`,
      resourceType: 'comment',
      resourceId: targetId,
      additionalData: { 
        faculty_type: 'Panelist', 
        comment_length: comment.length,
        target_id: targetId
      }
    });
  }

  /**
   * Admin-specific activity logging methods
   */
  logAdminLogin(email: string): Observable<any> {
    return this.logActivity({
      actionType: 'admin_login',
      actionDescription: `Admin ${email} logged into the system`,
      resourceType: 'user',
      resourceId: email,
      additionalData: { user_type: 'admin', login_method: 'email_password' }
    });
  }

  logAdminLogout(): Observable<any> {
    const userEmail = this.getCurrentUserEmail();
    return this.logActivity({
      actionType: 'admin_logout',
      actionDescription: `Admin ${userEmail} logged out of the system`,
      resourceType: 'user',
      resourceId: userEmail,
      additionalData: { user_type: 'admin' }
    });
  }

  logAdminCreateFaculty(facultyEmail: string, facultyType: string): Observable<any> {
    return this.logActivity({
      actionType: 'admin_create_faculty',
      actionDescription: `Admin created new faculty account: ${facultyEmail}`,
      resourceType: 'user',
      resourceId: facultyEmail,
      additionalData: { 
        user_type: 'admin', 
        created_faculty_type: facultyType,
        created_faculty_email: facultyEmail
      }
    });
  }

  logAdminApproveCapstone(capstoneId: string, capstoneTitle?: string): Observable<any> {
    return this.logActivity({
      actionType: 'admin_approve_capstone',
      actionDescription: `Admin approved capstone: ${capstoneTitle || capstoneId}`,
      resourceType: 'capstone',
      resourceId: capstoneId,
      additionalData: { 
        user_type: 'admin', 
        action: 'approve',
        capstone_title: capstoneTitle
      }
    });
  }

  logAdminRejectCapstone(capstoneId: string, reason?: string): Observable<any> {
    return this.logActivity({
      actionType: 'admin_reject_capstone',
      actionDescription: `Admin rejected capstone: ${capstoneId}`,
      resourceType: 'capstone',
      resourceId: capstoneId,
      additionalData: { 
        user_type: 'admin', 
        action: 'reject',
        rejection_reason: reason
      }
    });
  }

  logAdminApproveRequest(requestId: string, requestType?: string): Observable<any> {
    return this.logActivity({
      actionType: 'admin_approve_request',
      actionDescription: `Admin approved request: ${requestId}`,
      resourceType: 'request',
      resourceId: requestId,
      additionalData: { 
        user_type: 'admin', 
        action: 'approve',
        request_type: requestType
      }
    });
  }

  logAdminRejectRequest(requestId: string, reason?: string): Observable<any> {
    return this.logActivity({
      actionType: 'admin_reject_request',
      actionDescription: `Admin rejected request: ${requestId}`,
      resourceType: 'request',
      resourceId: requestId,
      additionalData: { 
        user_type: 'admin', 
        action: 'reject',
        rejection_reason: reason
      }
    });
  }

  /**
   * Helper method to get current user email
   */
  private getCurrentUserEmail(): string {
    try {
      const user = JSON.parse(sessionStorage.getItem('user') || '{}');
      return user.email || user.Email || sessionStorage.getItem('email') || 'unknown';
    } catch {
      return 'unknown';
    }
  }
}
