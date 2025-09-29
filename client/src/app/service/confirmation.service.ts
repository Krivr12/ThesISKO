import { Injectable } from '@angular/core';
import { ConfirmationService } from 'primeng/api';

@Injectable({
  providedIn: 'root'
})
export class AppConfirmationService {

  constructor(private confirmationService: ConfirmationService) {}

  showRestrictedAreaConfirmation(
    userRole: string, 
    onConfirm: () => void, 
    onReject: () => void
  ): void {
    const roleMessages = {
      'faculty': 'You are trying to access a restricted area outside your faculty permissions.',
      'student': 'You are trying to access a restricted area.',
      'guest': 'You are trying to access a restricted area.',
      'admin': 'You are trying to access a restricted area outside your admin permissions.'
    };

    const message = roleMessages[userRole as keyof typeof roleMessages] || 'You are trying to access a restricted area.';

    this.confirmationService.confirm({
      message: `${message}\n\nThis will log you out. Do you want to continue and logout?`,
      header: 'Restricted Area Access',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes, Logout',
      rejectLabel: 'Cancel',
      accept: onConfirm,
      reject: onReject
    });
  }
}
