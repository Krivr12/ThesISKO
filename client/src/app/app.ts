import { Component, signal, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import {MatToolbarModule} from '@angular/material/toolbar';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';
import { GlobalModal } from './components/global-modal/global-modal';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    ButtonModule,
    ToastModule,
    MatToolbarModule,
    GlobalModal
  ],
  providers: [MessageService],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('ThesISKO');
  private http = inject(HttpClient);

  ngOnInit() {
    this.checkSessionMismatch();
  }

  private checkSessionMismatch() {
    const currentUser = sessionStorage.getItem('currentUser');
    
    // If no user in sessionStorage, clear any lingering backend cookies
    if (!currentUser) {
      // Call logout to clear any existing cookies
      this.http.post(`${environment.authApiUrl}/auth/logout`, { reason: 'session_mismatch' }, { withCredentials: true })
        .subscribe({
          next: () => {
          },
          error: (err) => {
            // Ignore errors - cookie might not exist
          }
        });
    }
  }
}
