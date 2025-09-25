import { Component, OnInit, ViewChild, AfterViewInit, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

/* Angular Material (standalone) */
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';

import { AdminSideBar } from '../admin-side-bar/admin-side-bar';

export interface GroupJson {
  block_id: string;
  faculty_in_charge?: string;
  // other fields may exist in groups.json; not used here
}

export interface BlockRow {
  block_id: string;
  faculty_in_charge: string;
}

interface NewBlockForm {
  academic_year: string;      // "2425"
  program: string;            // "IT"
  code: string;               // "3A"
  faculty_in_charge: string;  // "Ryan Garcia"
}

@Component({
  selector: 'app-admin-block',
  standalone: true,
  imports: [
    AdminSideBar, CommonModule, RouterModule, HttpClientModule, FormsModule,
    MatSidenavModule, MatToolbarModule, MatButtonModule, MatIconModule,
    MatTableModule, MatFormFieldModule, MatSelectModule, MatOptionModule,
    MatPaginatorModule, MatSortModule, MatInputModule, MatDialogModule
  ],
  templateUrl: './admin-block.html',
  styleUrl: './admin-block.css'
})
export class AdminBlock implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['block_id', 'faculty_in_charge', 'actions'];
  dataSource = new MatTableDataSource<BlockRow>([]);

  // Add dialog form model
  newForm: NewBlockForm = { academic_year: '', program: '', code: '', faculty_in_charge: '' };

  // Edit dialog row model
  editRow: BlockRow = { block_id: '', faculty_in_charge: '' };

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Dialog templates
  @ViewChild('addFacultyDialog') addFacultyDialogTpl!: TemplateRef<any>;
  @ViewChild('editFacultyDialog') editFacultyDialogTpl!: TemplateRef<any>;

  constructor(
    private http: HttpClient,
    private dialog: MatDialog,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Adjust path if your file is in /assets:
    // this.http.get<GroupJson[]>('assets/groups.json')
    this.http.get<GroupJson[]>('groups.json').subscribe({
      next: (rows) => {
        const tableRows = this.toBlockRows(rows ?? []);
        this.dataSource.data = tableRows;
      },
      error: (err) => {
        console.error('Failed to load groups.json:', err);
        this.dataSource.data = [];
      }
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  goBack(): void {
    this.router.navigate(['/admin-dashboard']);
  }

  /** Convert raw groups into unique Block rows (one row per block_id). */
  private toBlockRows(groups: GroupJson[]): BlockRow[] {
    const byBlock = new Map<string, string>();

    for (const g of groups) {
      if (!g?.block_id) continue;
      // Keep the first seen faculty_in_charge for each block_id
      if (!byBlock.has(g.block_id)) {
        byBlock.set(g.block_id, g.faculty_in_charge ?? '');
      }
    }

    return Array.from(byBlock.entries()).map(([block_id, faculty_in_charge]) => ({
      block_id,
      faculty_in_charge: faculty_in_charge || ''
    }));
  }

  /** ---------------- Add ---------------- */
  openAddDialog(): void {
    this.newForm = { academic_year: '', program: '', code: '', faculty_in_charge: '' };

    const ref = this.dialog.open(this.addFacultyDialogTpl, {
      width: '560px',
      autoFocus: false,
      panelClass: 'add-group-dialog'
    });

    // We close via confirmAdd(); no need to handle afterClosed here.
    ref.afterClosed().subscribe();
  }

  confirmAdd(dialogRef: any) {
    // Form-level guard; template already disables ADD when invalid
    if (!this.newForm.academic_year || !this.newForm.program || !this.newForm.code) return;

    const block_id = this.composeBlockId(this.newForm);
    const newRow: BlockRow = {
      block_id,
      faculty_in_charge: this.newForm.faculty_in_charge || ''
    };

    const existsIdx = this.dataSource.data.findIndex(r => r.block_id === newRow.block_id);
    const copy = [...this.dataSource.data];

    if (existsIdx > -1) {
      copy[existsIdx] = { ...copy[existsIdx], faculty_in_charge: newRow.faculty_in_charge };
    } else {
      copy.push(newRow);
    }

    this.dataSource.data = copy;
    dialogRef.close();
  }

  private composeBlockId(form: NewBlockForm): string {
    const year = (form.academic_year || '').trim();
    const prog = (form.program || '').trim().toUpperCase().replace(/\s+/g, '');
    const code = (form.code || '').trim().toUpperCase().replace(/\s+/g, '');
    return `${year}-${prog}-${code}`;
  }

  /** ---------------- Edit ---------------- */
  openEditDialog(row: BlockRow): void {
    this.editRow = { ...row };

    const ref = this.dialog.open(this.editFacultyDialogTpl, {
      width: '560px',
      autoFocus: false,
      panelClass: 'add-group-dialog'
    });

    ref.afterClosed().subscribe((updated?: BlockRow) => {
      if (!updated) return;
      const idx = this.dataSource.data.findIndex(r => r.block_id === row.block_id);
      if (idx > -1) {
        const copy = [...this.dataSource.data];
        // keep block_id stable; only update faculty_in_charge (or any returned fields)
        copy[idx] = { ...copy[idx], ...updated, block_id: row.block_id };
        this.dataSource.data = copy;
      }
    });
  }

  /** Optional: simple client-side filter hook if you add a search box later */
  applyFilter(value: string) {
    this.dataSource.filter = value.trim().toLowerCase();
  }
}
