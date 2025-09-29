import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import {MatToolbarModule} from '@angular/material/toolbar';
import { HttpClientModule } from '@angular/common/http';
import { NavigationGuardService } from './service/navigation-guard.service';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    ButtonModule,
    ToastModule,
    ConfirmDialogModule,
    MatToolbarModule],
  providers: [],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Azalea');
  
  // Initialize navigation guard service
  private navigationGuard = inject(NavigationGuardService);
}
