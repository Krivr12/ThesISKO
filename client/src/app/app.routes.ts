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
import { LoginFaculty } from './components/login-faculty/login-faculty';
import { LoginAdmin } from './components/login-admin/login-admin';
import { StudentProfile } from './components/student-profile/student-profile';
import { GuestProfile } from './components/guest-profile/guest-profile';
import { GoogleCallbackComponent } from './components/google-callback/google-callback';
import { AdminDashboard } from './admin/admin-dashboard/admin-dashboard';
import { AdminBlock } from './admin/admin-block/admin-block';
import { AdminDocuments } from './admin/admin-documents/admin-documents';
import { AdminFaculties } from './admin/admin-faculties/admin-faculties';
import { AdminRequest } from './admin/admin-request/admin-request';
import { AdminTemplate } from './admin/admin-template/admin-template';
import { AdminSideBar } from './admin/admin-side-bar/admin-side-bar';
import { adminGuard } from './guards/admin-guard';
import { superadminGuard } from './guards/superadmin-guard';
import { facultyGuard } from './guards/faculty-guard';
import { authGuard } from './guards/auth-guard';
import { Programs } from './superAdmin/programs/programs';
import { Dashboard as SuperAdminDashboard } from './superAdmin/dashboard/dashboard';
import { Documents as SuperAdminDocuments } from './superAdmin/documents/documents';
import { Request } from './superAdmin/request/request';
import { Templates } from './superAdmin/templates/templates';
import { Faculties } from './superAdmin/faculties/faculties';
import { RoleTestComponent } from './components/role-test/role-test';
import { FacultyHome } from './facultySide/faculty-home/faculty-home';
import { FICHistoryPage } from './facultySide/fichistory-page/fichistory-page';
import { ForFIC } from './facultySide/for-fic/for-fic';
import { ForFICLanding } from './facultySide/for-ficlanding/for-ficlanding';
import { ForPanel } from './facultySide/for-panel/for-panel';
import { ForPanellanding } from './facultySide/for-panellanding/for-panellanding';
import { PanelistApprovalPage } from './facultySide/panelist-approval-page/panelist-approval-page';
import { FacultyProfile } from './facultySide/faculty-profile/faculty-profile';
import { LoginModal } from './components/login-modal/login-modal';

export const routes: Routes = [
    {path: 'signup-choose', component: SignupChoose},
    {path: 'login', component: Login, canActivate: [authGuard]},
    {path: 'login-faculty', component: LoginFaculty},
    {path: 'login-admin', component: LoginAdmin},
    {path: 'signup', component: Signup},
    {path: 'home', component: Home, canActivate: [authGuard]},
    {path: 'about-us', component: AboutUs, canActivate: [authGuard]},
    {path: 'search-thesis', component: SearchThesis, canActivate: [authGuard]},
    {path: 'search-result', component: SearchResult, canActivate: [authGuard]},
    {path: 'submission', component: Submission, canActivate: [authGuard]},
    {path: 'thank-you', component: ThankYou, canActivate: [authGuard]},
    {path: 'student-profile', component: StudentProfile, canActivate: [authGuard]},
    {path: 'guest-profile', component: GuestProfile, canActivate: [authGuard]},
    {path: 'google-callback', component: GoogleCallbackComponent},
    {path: 'role-test', component: RoleTestComponent},
    
    // Faculty routes (only role_id = 3 can access)
    {path: 'faculty-home', component: FacultyHome, canActivate: [facultyGuard]},
    {path: 'faculty-change-password', component: FacultyProfile, canActivate: [facultyGuard]},
    {path: 'fichistory-page', component: FICHistoryPage, canActivate: [facultyGuard]},
    {path: 'fichistory-page/:id', component: FICHistoryPage, canActivate: [facultyGuard]},
    {path: 'for-fic', component: ForFIC, canActivate: [facultyGuard]},
    {path: 'for-ficlanding', component: ForFICLanding, canActivate: [facultyGuard]},
    {path: 'for-panel', component: ForPanel, canActivate: [facultyGuard]},
    {path: 'for-panellanding', component: ForPanellanding, canActivate: [facultyGuard]},
    {path: 'panelist-approval-page', component: PanelistApprovalPage, canActivate: [facultyGuard]},
    {path: 'panelist-approval-page/:id', component: PanelistApprovalPage, canActivate: [facultyGuard]},
    
    // Admin routes (role_id = 4, 7 can access)
    {path: 'admin-dashboard', component: AdminDashboard, canActivate: [adminGuard]},
    {path: 'admin-block', component: AdminBlock, canActivate: [adminGuard]},
    {path: 'admin-documents', component: AdminDocuments, canActivate: [adminGuard]},
    {path: 'admin-faculties', component: AdminFaculties, canActivate: [adminGuard]},
    {path: 'admin-request', component: AdminRequest, canActivate: [adminGuard]},
    {path: 'admin-template', component: AdminTemplate, canActivate: [adminGuard]},
    {path: 'admin-side-bar', component: AdminSideBar, canActivate: [adminGuard]},
    
    // SuperAdmin routes (role_id = 5, 8 can access)
    {path: 'superadmin-dashboard', component: SuperAdminDashboard, canActivate: [superadminGuard]},
    {path: 'superadmin-documents', component: SuperAdminDocuments, canActivate: [superadminGuard]},
    {path: 'superadmin-programs', component: Programs, canActivate: [superadminGuard]},
    {path: 'superadmin-request', component: Request, canActivate: [superadminGuard]},
    {path: 'superadmin-templates', component: Templates, canActivate: [superadminGuard]},
    {path: 'superadmin-faculties', component: Faculties, canActivate: [superadminGuard]},
    
    // Backwards compatibility redirects
    {path: 'admin-programs', redirectTo: '/superadmin-programs', pathMatch: 'full'},
    {path: 'admin-departments', redirectTo: '/superadmin-programs', pathMatch: 'full'},
    {path: 'dashboard', redirectTo: '/superadmin-dashboard', pathMatch: 'full'},
    {path: 'documents', redirectTo: '/admin-documents'},
    {path: 'departments', redirectTo: '/superadmin-programs'},
    {path: 'chairperson', redirectTo: '/admin-faculties'},
    {path: 'documents-issues', redirectTo: '/admin-documents'},
    {path: 'documents-verify', redirectTo: '/admin-documents'},
    {path: 'super-admin-nav-bar', redirectTo: '/superadmin-dashboard'},
    
    {path: '', redirectTo: '/signup-choose', pathMatch: 'full'},
    {path: 'login-modal', component: LoginModal},
    {path: '**', redirectTo: '/signup-choose'} // Catch-all route
];