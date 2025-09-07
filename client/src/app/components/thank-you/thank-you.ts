import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Navbar } from "../navbar/navbar";
import { Footer } from "../footer/footer";

@Component({
  selector: 'app-thank-you',
  imports: [Navbar, Footer],
  templateUrl: './thank-you.html',
  styleUrl: './thank-you.css'
})
export class ThankYou {
  constructor(private router: Router) {}
    
    goToHome() {
      this.router.navigate(['/home']); // leads back to home page
    }
}
