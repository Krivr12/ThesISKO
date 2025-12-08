import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

export interface ConfirmConfig {
  message: string;
  header: string;
  acceptCallback?: () => void | Promise<void>;
  rejectCallback?: () => void;
  acceptLabel?: string;
  rejectLabel?: string;
}

export interface ConfirmState {
  visible: boolean;
  config: ConfirmConfig | null;
}

@Injectable({
  providedIn: 'root'
})
export class CustomConfirmService {
  private confirmSubject = new Subject<ConfirmState>();
  public confirmState$: Observable<ConfirmState> = this.confirmSubject.asObservable();

  /**
   * Show the confirmation dialog
   * @param config Configuration object for the dialog
   */
  confirm(config: ConfirmConfig): void {
    this.confirmSubject.next({
      visible: true,
      config: {
        acceptLabel: config.acceptLabel || 'Yes',
        rejectLabel: config.rejectLabel || 'Cancel',
        ...config
      }
    });
  }

  /**
   * Hide the confirmation dialog
   */
  hide(): void {
    this.confirmSubject.next({
      visible: false,
      config: null
    });
  }

  /**
   * Accept the confirmation (user clicked Yes)
   */
  async accept(config: ConfirmConfig): Promise<void> {
    if (config.acceptCallback) {
      await config.acceptCallback();
    }
    this.hide();
  }

  /**
   * Reject the confirmation (user clicked Cancel)
   */
  reject(config: ConfirmConfig): void {
    if (config.rejectCallback) {
      config.rejectCallback();
    }
    this.hide();
  }
}

