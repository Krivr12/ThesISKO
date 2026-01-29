import { Routes } from '@angular/router';
import { adminSideGuard } from '../guards/admin-side-guard';
import { deanOnlyGuard } from '../guards/dean-only-guard';

/**
 * Lazy-loaded adminSide routes. Loaded when user first navigates to /adminSide/...
 * Same paths and guards as before; only loading strategy changes.
 */
export const routes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard').then((m) => m.AdminSideDashboard),
    canActivate: [adminSideGuard],
  },
  {
    path: 'approvals',
    loadComponent: () => import('./approvals/approvals').then((m) => m.Approvals),
    canActivate: [adminSideGuard],
  },
  {
    path: 'approvals/:id',
    loadComponent: () => import('./approvals/approval-details').then((m) => m.ApprovalDetails),
    canActivate: [adminSideGuard],
  },
  {
    path: 'documents',
    loadComponent: () => import('./documents/documents').then((m) => m.AdminDocuments),
    canActivate: [adminSideGuard],
  },
  {
    path: 'documents/edit/:id',
    loadComponent: () => import('./documents/document-edit').then((m) => m.DocumentEdit),
    canActivate: [adminSideGuard],
  },
  {
    path: 'programs',
    loadComponent: () => import('./programs/programs').then((m) => m.AdminPrograms),
    canActivate: [deanOnlyGuard],
  },
  {
    path: 'faculties',
    loadComponent: () => import('./faculties/faculties').then((m) => m.AdminFaculties),
    canActivate: [deanOnlyGuard],
  },
  {
    path: 'requests',
    loadComponent: () => import('./requests/requests').then((m) => m.AdminRequests),
    canActivate: [adminSideGuard],
  },
  {
    path: 'templates',
    loadComponent: () => import('./templates/templates').then((m) => m.AdminTemplates),
    canActivate: [adminSideGuard],
  },
  {
    path: 'document-types',
    loadComponent: () => import('./document-types/document-types').then((m) => m.DocumentTypes),
    canActivate: [deanOnlyGuard],
  },
  {
    path: 'requirements',
    loadComponent: () => import('./requirements/requirements').then((m) => m.Requirements),
    canActivate: [deanOnlyGuard],
  },
];
