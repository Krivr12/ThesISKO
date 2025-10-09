import { Component, inject} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../service/auth';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-login-faculty',
  imports: [ FormsModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
  ],
  templateUrl: './login-faculty.html',
  styleUrl: './login-faculty.css'
})
export class LoginFaculty {
  login = {
    email: '',
    password: '',
  }
  
  private authService = inject(Auth);
  private router = inject(Router);
  private messageService = inject(MessageService);
  onLogin() {
    const {email, password} = this.login;
    this.authService.getUserDetails(email, password).subscribe({
      next: (response) => {
        if (response.length >= 1) {
          sessionStorage.setItem('email', email);
          this.router.navigate(['home']);
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'error',
            detail: 'Wrong password or email.', 
          });
        }
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'error',
          detail: 'Something went wrong', 
        });
      }
    })
  }
}
