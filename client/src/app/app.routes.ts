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

export const routes: Routes = [
   // login
    {path: 'signup-choose', component: SignupChoose},
    {path: 'login-faculty', component: LoginFaculty},
    {path: 'login-admin', component: LoginAdmin},
    {path: 'login', component: Login},
    {path: 'signup', component: Signup},
    {path: 'google-callback', component: GoogleCallbackComponent},

    // repository - protected by role guard
    {path: 'home', component: Home, canActivate: [roleGuard]},
    {path: 'about-us', component: AboutUs, canActivate: [roleGuard]},
    {path: 'search-thesis', component: SearchThesis, canActivate: [roleGuard]},
    {path: 'search-result', component: SearchResult, canActivate: [roleGuard]},
    {path: 'submission', component: Submission, canActivate: [roleGuard]},
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


];
