import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CustomConfirmService, ConfirmState } from '../../service/custom-confirm.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-custom-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './custom-confirm-dialog.html',
  styleUrls: ['./custom-confirm-dialog.scss']
})
export class CustomConfirmDialog implements OnInit, OnDestroy {
  private confirmService = inject(CustomConfirmService);
  private subscription?: Subscription;

  visible = false;
  message = '';
  header = '';
  acceptLabel = 'Yes';
  rejectLabel = 'Cancel';
  private acceptCallback?: () => void | Promise<void>;
  private rejectCallback?: () => void;

  ngOnInit(): void {
    this.subscription = this.confirmService.confirmState$.subscribe((state: ConfirmState) => {
      this.visible = state.visible;
      if (state.config) {
        this.message = state.config.message;
        this.header = state.config.header;
        this.acceptLabel = state.config.acceptLabel || 'Yes';
        this.rejectLabel = state.config.rejectLabel || 'Cancel';
        this.acceptCallback = state.config.acceptCallback;
        this.rejectCallback = state.config.rejectCallback;
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  onAccept(): void {
    if (this.acceptCallback) {
      this.confirmService.accept({
        message: this.message,
        header: this.header,
        acceptCallback: this.acceptCallback,
        rejectCallback: this.rejectCallback,
        acceptLabel: this.acceptLabel,
        rejectLabel: this.rejectLabel
      });
    } else {
      this.confirmService.hide();
    }
  }

  onReject(): void {
    if (this.rejectCallback) {
      this.confirmService.reject({
        message: this.message,
        header: this.header,
        acceptCallback: this.acceptCallback,
        rejectCallback: this.rejectCallback,
        acceptLabel: this.acceptLabel,
        rejectLabel: this.rejectLabel
      });
    } else {
      this.confirmService.hide();
    }
  }

  onOverlayClick(event: MouseEvent): void {
    // Close dialog when clicking on the overlay (backdrop)
    if (event.target === event.currentTarget) {
      this.onReject();
    }
  }

  onCloseClick(): void {
    this.onReject();
  }
}

