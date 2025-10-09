import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';


@Component({
  selector: 'app-signup-choose',
  imports: [
    ButtonModule,
    RouterLink,
  ],
  templateUrl: './signup-choose.html',
  styleUrl: './signup-choose.css'
})
export class SignupChoose {

}
