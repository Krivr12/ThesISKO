import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login-modal.html',
  styleUrls: ['./login-modal.css']
})
export class LoginModal {
  // true = visible modal
  @Input() isVisible: boolean = false;

  // notifies parent component/page to close the modal
  @Output() close = new EventEmitter<void>();

  constructor(private router: Router) {}

  onClose(): void {
    this.close.emit();
  }

  // sends user to the login page
  onLogin(): void {
    console.log('Navigating to login pageeee...');
    this.onClose();
    this.router.navigate(['/login']);
  }
}