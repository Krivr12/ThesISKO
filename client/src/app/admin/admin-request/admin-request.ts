import { Component, OnInit, ViewChild, AfterViewInit, TemplateRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

/* Angular Material (standalone) */
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';

import { AdminSideBar } from '../admin-side-bar/admin-side-bar';

interface RequestItem {
  requestor_name: string;
  date: string;             // "YYYY-MM-DD"
  time: string;             // "HH:mm"
  selected_chapter: string; // "1" | "2" | "3" | "4" | "5" | "all"
  purpose: string;
  email: string;
  title?: string;
 
}

@Component({
  selector: 'app-admin-request',
  standalone: true,
  imports: [
    AdminSideBar, CommonModule, RouterModule, HttpClientModule,
    MatSidenavModule, MatToolbarModule, MatButtonModule, MatIconModule,
    MatTableModule, MatPaginatorModule, MatSortModule, MatInputModule,
    MatDialogModule, MatFormFieldModule, FormsModule
  ],
  templateUrl: './admin-request.html',
  styleUrl: './admin-request.css'
})
export class AdminRequest implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['requestor', 'time', 'title', 'chapters', 'purpose', 'actions'];
  dataSource = new MatTableDataSource<RequestItem>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('verifyDialog') verifyTpl!: TemplateRef<any>;

  verifyNote = '';
  private dialog = inject(MatDialog);

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.http.get<RequestItem[]>('requestsample.json').subscribe({
      next: rows => this.dataSource.data = rows ?? [],
      error: () => this.dataSource.data = []
    });

    this.dataSource.filterPredicate = (d, f) => (
      [d.requestor_name, d.purpose, d.title, d.selected_chapter, d.date, d.time]
        .filter(Boolean).join(' ').toLowerCase()
    ).includes(f);
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  goBack(): void {
    this.router.navigate(['/admin-dashboard']);
  }

  formatChapters(sel: string): string {
    if (!sel) return '—';
    return sel === 'all' ? 'All Chapters' : `Chapter ${sel}`;
  }

  private computeMissingFields(row: RequestItem): string[] {
    const req: Array<keyof RequestItem> = ['requestor_name','date','time','selected_chapter','purpose','email','title'];
    const label: Record<string,string> = {
      requestor_name:'Requestor', date:'Date', time:'Time',
      selected_chapter:'Chapters', purpose:'Purpose', email:'Email', title:'Title'
    };
    return req.filter(k => !(row as any)[k] || String((row as any)[k]).trim()==='')
              .map(k => label[k as string]);
  }

  openVerifyDialog(row: RequestItem): void {
    this.verifyNote = '';
    const missingFields = this.computeMissingFields(row);

    this.dialog.open(this.verifyTpl, {
      panelClass: 'thesisko-dialog',              // <<< important
      width: 'min(1100px, 96vw)',
      maxWidth: '96vw',
      maxHeight: '90vh',
      autoFocus: false,
      restoreFocus: false,
      data: { row, missingFields }
    }).afterClosed().subscribe(res => {
     
    });
  }

  approveRequest(): void {
    
  }

  rejectRequest(): void {
   
  }

  applyFilter(value: string) {
    this.dataSource.filter = (value || '').trim().toLowerCase();
  }
}
