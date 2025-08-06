import { Component } from '@angular/core';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [HttpClientModule, FormsModule, CommonModule],
  templateUrl: './app.component.html',
})
export class AppComponent {
  query = '';
  results: any[] = [];

  constructor(private http: HttpClient) {}

  search() {
    this.http.post<any>('http://localhost:8000/search', { text: this.query }).subscribe({
      next: res => this.results = res.results,
      error: err => alert('Search failed. Please try again.')
    });
  }
}
