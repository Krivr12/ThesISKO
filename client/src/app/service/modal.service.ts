import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ModalConfig {
  title: string;
  message: string;
  primaryButtonText?: string;
  secondaryButtonText?: string;
  icon?: 'lock' | 'info' | 'warning' | 'success' | 'error';
  isVisible?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private modalConfig$ = new BehaviorSubject<ModalConfig | null>(null);
  private primaryAction$ = new BehaviorSubject<void | null>(null);
  private secondaryAction$ = new BehaviorSubject<void | null>(null);

  getModalConfig(): Observable<ModalConfig | null> {
    return this.modalConfig$.asObservable();
  }

  getPrimaryAction(): Observable<void | null> {
    return this.primaryAction$.asObservable();
  }

  getSecondaryAction(): Observable<void | null> {
    return this.secondaryAction$.asObservable();
  }

  /**
   * Show a modal with the given configuration
   */
  showModal(config: ModalConfig): void {
    this.modalConfig$.next({
      ...config,
      isVisible: true
    });
  }

  /**
   * Show login required modal
   */
  showLoginRequired(message: string = 'To access this feature, you must be logged in with your official account.'): void {
    this.showModal({
      title: 'Account Required',
      message,
      primaryButtonText: 'Login',
      secondaryButtonText: 'Cancel',
      icon: 'lock'
    });
  }

  /**
   * Emit primary button action
   */
  emitPrimaryAction(): void {
    this.primaryAction$.next();
  }

  /**
   * Emit secondary button action
   */
  emitSecondaryAction(): void {
    this.secondaryAction$.next();
  }

  /**
   * Close the modal
   */
  closeModal(): void {
    this.modalConfig$.next(null);
  }
}
