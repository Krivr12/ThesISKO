import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource } from '@angular/material/table';
import { MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AdminSideBar } from '../admin-side-bar/admin-side-bar';
import { Router, RouterModule } from '@angular/router';

type TemplateRow = { id: string; name: string };

@Component({
  selector: 'app-admin-template',
  imports: [CommonModule,
    AdminSideBar,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,],
  templateUrl: './admin-template.html',
  styleUrl: './admin-template.css'
})
export class AdminTemplate implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['template', 'actions'];
  dataSource = new MatTableDataSource<TemplateRow>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private router: Router,
   
  ) {}

  ngOnInit(): void {
    // seed with the items from your screenshot; replace with API data if you have one
    this.dataSource.data = [
      { id: 'chap-1-3', name: 'Chapter 1-3' },
      { id: 'loi', name: 'Letter of Intent' },
      { id: 'form9', name: 'Form 9 - Application Form' },
      { id: 'form10', name: 'Form 10 - Research Protocol' },
      { id: 'form11', name: 'Form 11 - Informed Consent Form' },
      { id: 'form12', name: 'Form 12 - For Minor Respondents Only' },
      { id: 'form13', name: 'Form 13 - MOA' },
      { id: 'ri', name: 'Research Instrument' },
      { id: 'cvr', name: 'Certificate of Validity or Reliability' },
    ];
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  goBack(): void {
    this.router.navigate(['/admin-dashboard']);
  }

  openAddTemplateDialog(): void {
    // TODO: open dialog for uploading/creating a new template
  }

  openUpdateTemplateDialog(row: TemplateRow): void {
    // TODO: open dialog to update selected template
    // e.g., this.dialog.open(UpdateTemplateDialog, { data: row });
    console.log('Update clicked for', row);
  }

}