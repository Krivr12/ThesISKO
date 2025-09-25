import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { Signup } from './components/signup/signup';
import { Home } from './components/home/home';
import { AboutUs } from './components/about-us/about-us';
import { SearchThesis } from './components/search-thesis/search-thesis';
import { SearchResult } from './components/search-result/search-result';
import { Submission } from './components/submission/submission';
import { ThankYou } from './components/thank-you/thank-you';
import { SignupChoose } from './components/signup-choose/signup-choose';
import { FacultyHome } from './facultySide/faculty-home/faculty-home';
import { LoginFaculty } from './components/login-faculty/login-faculty';
import { LoginAdmin } from './components/login-admin/login-admin';
import { PanelistApprovalPage } from './facultySide/panelist-approval-page/panelist-approval-page';
import { ForPanel } from './facultySide/for-panel/for-panel';
import { ForFIC } from './facultySide/for-fic/for-fic';
import { FICHistoryPage } from './facultySide/fichistory-page/fichistory-page';
import { GoogleCallbackComponent } from './components/google-callback/google-callback';
import { authGuard, roleGuard } from './guards/auth-guard';
import { submissionGuard } from './guards/submission-guard';

// SuperAdmin components
import { Dashboard } from './superAdmin/dashboard/dashboard';
import { Chairperson } from './superAdmin/chairperson/chairperson';
import { Departments } from './superAdmin/departments/departments';
import { Documents } from './superAdmin/documents/documents';
import { DocumentsIssues } from './superAdmin/documents-issues/documents-issues';
import { DocumentsVerify } from './superAdmin/documents-verify/documents-verify';

// Admin components
import { AdminDashboard } from './admin/admin-dashboard/admin-dashboard';
import { AdminDocuments } from './admin/admin-documents/admin-documents';
import { AdminBlock } from './admin/admin-block/admin-block';
import { AdminFaculties } from './admin/admin-faculties/admin-faculties';
import { AdminRequest } from './admin/admin-request/admin-request';
import { AdminTemplate } from './admin/admin-template/admin-template';


export const routes: Routes = [
   // login - now protected by role guard to check admin restrictions
    {path: 'signup-choose', component: SignupChoose, canActivate: [roleGuard]},
    {path: 'login-faculty', component: LoginFaculty, canActivate: [roleGuard]},
    {path: 'login-admin', component: LoginAdmin, canActivate: [roleGuard]},
    {path: 'login', component: Login, canActivate: [roleGuard]},
    {path: 'signup', component: Signup, canActivate: [roleGuard]},
    {path: 'google-callback', component: GoogleCallbackComponent},

    // repository - protected by role guard
    {path: 'home', component: Home, canActivate: [roleGuard]},
    {path: 'about-us', component: AboutUs, canActivate: [roleGuard]},
    {path: 'search-thesis', component: SearchThesis, canActivate: [roleGuard]},
    {path: 'search-result', component: SearchResult, canActivate: [roleGuard]},
    {path: 'submission', component: Submission, canActivate: [submissionGuard]},
    {path: 'thank-you', component: ThankYou, canActivate: [roleGuard]},
    {path: '', redirectTo: 'signup-choose', pathMatch: 'full'},


    //faculty side - protected by role guard
    {path: 'faculty-home', component: FacultyHome, canActivate: [roleGuard]},

    {path: 'fichistory-page', component: FICHistoryPage, canActivate: [roleGuard]},
    {path: 'fichistory-page/:id', component: FICHistoryPage, canActivate: [roleGuard]},
    { path: 'fichistory-page/:id', redirectTo: 'fichistory-page/:id', pathMatch: 'full' },
    {path: 'for-fic', component: ForFIC, canActivate: [roleGuard]},

    {path: 'for-panel', component: ForPanel, canActivate: [roleGuard]},
    {path: 'panelist-approval-page', component: PanelistApprovalPage, canActivate: [roleGuard]},
    { path: 'panelist-approval-page/:id', component: PanelistApprovalPage, canActivate: [roleGuard] },
    { path: 'panelis-approval-page/:id', redirectTo: 'panelist-approval-page/:id', pathMatch: 'full' },

    // Admin routes - protected by role guard
    {path: 'admin-dashboard', component: AdminDashboard, canActivate: [roleGuard]},
    {path: 'admin-documents', component: AdminDocuments, canActivate: [roleGuard]},
    {path: 'admin-block', component: AdminBlock, canActivate: [roleGuard]},
    {path: 'admin-faculties', component: AdminFaculties, canActivate: [roleGuard]},
    {path: 'admin-request', component: AdminRequest, canActivate: [roleGuard]},
    {path: 'admin-template', component: AdminTemplate, canActivate: [roleGuard]},

    // SuperAdmin routes - protected by role guard
    {path: 'superAdmin/dashboard', component: Dashboard, canActivate: [roleGuard]},
    {path: 'superAdmin/chairperson', component: Chairperson, canActivate: [roleGuard]},
    {path: 'superAdmin/departments', component: Departments, canActivate: [roleGuard]},
    {path: 'superAdmin/documents', component: Documents, canActivate: [roleGuard]},
    {path: 'superAdmin/documents-issues', component: DocumentsIssues, canActivate: [roleGuard]},
    {path: 'superAdmin/documents-verify', component: DocumentsVerify, canActivate: [roleGuard]},

];
