import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Navbar } from '../navbar/navbar';

@Component({
  selector: 'app-about-us',
  imports: [FormsModule, Navbar],
  templateUrl: './about-us.html',
  styleUrl: './about-us.css'
})
export class AboutUs {
search() {
throw new Error('Method not implemented.');
}
query: any;
}
