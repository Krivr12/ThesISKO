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
import { SuperAdminNavBar } from './superAdmin/super-admin-nav-bar/super-admin-nav-bar';
import { Chairperson } from './superAdmin/chairperson/chairperson';
import { Dashboard } from './superAdmin/dashboard/dashboard';
import { Departments } from './superAdmin/departments/departments';
import { Documents } from './superAdmin/documents/documents';
import { ForPanellanding } from './facultySide/for-panellanding/for-panellanding';
import { ForFICLanding } from './facultySide/for-ficlanding/for-ficlanding';
import { DocumentsVerify } from './superAdmin/documents-verify/documents-verify';
import { AdminDashboard} from './admin/admin-dashboard/admin-dashboard';
import { AdminBlock } from './admin/admin-block/admin-block';
import { AdminFaculties } from './admin/admin-faculties/admin-faculties';
import { AdminTemplate } from './admin/admin-template/admin-template';
import { AdminDocuments } from './admin/admin-documents/admin-documents';
import { AdminRequest } from './admin/admin-request/admin-request';

export const routes: Routes = [
   // login
    {path: 'signup-choose', component: SignupChoose},
    {path: 'login-faculty', component: LoginFaculty},
    {path: 'login-admin', component: LoginAdmin},
    {path: 'login', component: Login},
    {path: 'signup', component: Signup},

    // repository
    {path: 'home', component: Home},
    {path: 'about-us', component: AboutUs},
    {path: 'search-thesis', component: SearchThesis},
    {path: 'search-result', component: SearchResult},
    {path: 'submission', component: Submission},
    {path: 'thank-you', component: ThankYou},
    {path: '', redirectTo: 'signup-choose', pathMatch: 'full'},


    //faculty side
    {path: 'faculty-home', component: FacultyHome},

    {path: 'fichistory-page', component: FICHistoryPage},
    {path: 'fichistory-page/:id', component: FICHistoryPage},
    { path: 'fichistory-page/:id', redirectTo: 'fichistory-page/:id', pathMatch: 'full' },
    {path: 'for-fic', component: ForFIC},
    {path: 'for-ficlanding', component: ForFICLanding},

    {path: 'for-panel', component: ForPanel},
    {path: 'for-panellanding', component: ForPanellanding},

    {path: 'panelist-approval-page', component: PanelistApprovalPage},
    { path: 'panelist-approval-page/:id', component: PanelistApprovalPage },
    { path: 'panelis-approval-page/:id', redirectTo: 'panelist-approval-page/:id', pathMatch: 'full' },

    //superadmin ni Yasmine
    {path: 'super-admin-nav-bar', component: SuperAdminNavBar},

    {path: 'chairperson', component: Chairperson},
    {path: 'dashboard', component: Dashboard},
    {path: 'departments', component: Departments},
    
    {path: 'documents', component: Documents},
    {path: 'documents-verify', component: Documents},
    { path: 'documents-verify/:id', component: DocumentsVerify },
    { path: 'documents-verify/:id', redirectTo: 'documents-verify/:id', pathMatch: 'full' },

    //admin
    {path: 'admin-block', component: AdminBlock},
    {path: 'admin-dashboard', component: AdminDashboard},
    {path: 'admin-documents', component: AdminDocuments},
    {path: 'admin-faculties', component: AdminFaculties},
    {path: 'admin-request', component: AdminRequest},
    {path: 'admin-template', component: AdminTemplate},



];
