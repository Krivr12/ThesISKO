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
import { AdminDepartments } from './admin/admin-departments/admin-departments';
import { AdminRequest } from './admin/admin-request/admin-request';
import { AdminTemplate } from './admin/admin-template/admin-template';
import { AdminSideBar } from './admin/admin-side-bar/admin-side-bar';
import { adminGuard } from './guards/admin-guard';
import { facultyGuard } from './guards/faculty-guard';
import { authGuard } from './guards/auth-guard';
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
    
    // Admin routes (role_id = 4 or 5 can access)
    {path: 'admin-dashboard', component: AdminDashboard, canActivate: [adminGuard]},
    {path: 'admin-block', component: AdminBlock, canActivate: [adminGuard]},
    {path: 'admin-documents', component: AdminDocuments, canActivate: [adminGuard]},
    {path: 'admin-faculties', component: AdminFaculties, canActivate: [adminGuard]},
    {path: 'admin-departments', component: AdminDepartments, canActivate: [adminGuard]},
    {path: 'admin-request', component: AdminRequest, canActivate: [adminGuard]},
    {path: 'admin-template', component: AdminTemplate, canActivate: [adminGuard]},
    {path: 'admin-side-bar', component: AdminSideBar, canActivate: [adminGuard]},
    
    // Redirect old superadmin routes to admin routes
    {path: 'superadmin-dashboard', redirectTo: '/admin-dashboard'},
    {path: 'dashboard', redirectTo: '/admin-dashboard'},
    {path: 'documents', redirectTo: '/admin-documents'},
    {path: 'departments', redirectTo: '/admin-faculties'},
    {path: 'chairperson', redirectTo: '/admin-faculties'},
    {path: 'documents-issues', redirectTo: '/admin-documents'},
    {path: 'documents-verify', redirectTo: '/admin-documents'},
    {path: 'super-admin-nav-bar', redirectTo: '/admin-dashboard'},
    
    {path: '', redirectTo: '/signup-choose', pathMatch: 'full'}
    {path: 'home', component: Home},
    {path: 'about-us', component: AboutUs},
    {path: 'search-thesis', component: SearchThesis},
    {path: 'search-result', component: SearchResult},
    {path: 'submission', component: Submission},
    {path: 'thank-you', component: ThankYou},
    {path: 'login-modal', component: LoginModal},
    {path: '', redirectTo: 'home', pathMatch: 'full'}
];
