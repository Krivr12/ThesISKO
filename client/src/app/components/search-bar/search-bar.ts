import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-bar.html',
  styleUrls: ['./search-bar.css']
})
export class SearchBar {
  @Input() placeholder: string = 'Search...';
  @Input() value: string = '';
  @Output() search = new EventEmitter<string>();
  @Output() valueChange = new EventEmitter<string>();

  searchQuery: string = '';

  ngOnInit() {
    this.searchQuery = this.value;
  }

  ngOnChanges() {
    this.searchQuery = this.value;
  }

  onSearch(): void {
    this.valueChange.emit(this.searchQuery);
    this.search.emit(this.searchQuery);
  }
}

