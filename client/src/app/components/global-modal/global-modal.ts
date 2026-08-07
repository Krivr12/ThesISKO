import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ModalService, ModalConfig } from '../../service/modal.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-global-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './global-modal.html',
  styleUrls: ['./global-modal.css']
})
export class GlobalModal implements OnInit, OnDestroy {
  private modalService = inject(ModalService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  currentConfig: ModalConfig | null = null;

  ngOnInit(): void {
    this.modalService.getModalConfig()
      .pipe(takeUntil(this.destroy$))
      .subscribe(config => {
        this.currentConfig = config;
      });

    this.modalService.getPrimaryAction()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.currentConfig?.title === 'Account Required') {
          this.handleLoginAction();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onClose(): void {
    this.modalService.emitSecondaryAction();
    this.modalService.closeModal();
  }

  onPrimaryAction(): void {
    this.modalService.emitPrimaryAction();
  }

  private handleLoginAction(): void {
    this.onClose();
    this.router.navigate(['/login']);
  }

  getIconSvg(): string {
    switch (this.currentConfig?.icon) {
      case 'lock':
        return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>`;
      case 'info':
        return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 .063.736.75.75 0 0 0 .652.318h.905c.505 0 .904-.481.737-.932l-.708-2.836a.75.75 0 0 1 .041-.852.75.75 0 0 1 1.063-.853a.75.75 0 0 0 1.335-.75A2.25 2.25 0 0 0 12.75 9a.75.75 0 0 0-.75.75v.008zm0 2.25h.008v.008H11.25V13.5z" />
        </svg>`;
      case 'warning':
        return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c.866-1.5 2.945-5.259 5.303-5.259m0 0c2.359 0 4.437 3.757 5.303 5.259m0 0c.035.052.692 1.221 1.5 1.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
        </svg>`;
      case 'success':
        return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
        </svg>`;
      case 'error':
        return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>`;
      default:
        return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>`;
    }
  }
}
