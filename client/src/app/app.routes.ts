import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { Signup } from './components/signup/signup';
import { ForgotPassword } from './components/forgot-password/forgot-password';
import { ResetPassword } from './components/reset-password/reset-password';
import { Home } from './components/home/home';
import { Homepage } from './components/homepage/homepage';
import { AboutUs } from './components/about-us/about-us';
import { SearchThesis } from './components/search-thesis/search-thesis';
import { SearchResult } from './components/search-result/search-result';
import { NewSubmission } from './components/new-submission/new-submission';
import { ThankYou } from './components/thank-you/thank-you';
import { LoginAdmin } from './components/login-admin/login-admin';
import { StudentProfile } from './components/student-profile/student-profile';
import { GuestProfile } from './components/guest-profile/guest-profile';
import { PrivacyPolicy } from './components/privacy-policy/privacy-policy';
import { TermsAndConditions } from './components/terms-and-conditions/terms-and-conditions';
import { GoogleCallbackComponent } from './components/google-callback/google-callback';
import { authGuard } from './guards/auth-guard';
import { LoginModal } from './components/login-modal/login-modal';
export const routes: Routes = [
    {path: 'login', component: Login, canActivate: [authGuard]},
    {path: 'login-admin', component: LoginAdmin},
    {path: 'signup', component: Signup},
    {path: 'forgot-password', component: ForgotPassword},
    {path: 'reset-password', component: ResetPassword},
    {path: 'home', component: Homepage},
    {path: 'homepage', component: Home},
    {path: 'about-us', component: AboutUs, canActivate: [authGuard]},
    {path: 'search-thesis', component: SearchThesis, canActivate: [authGuard]},
    {path: 'search-result', component: SearchResult, canActivate: [authGuard]},
    {path: 'submission', component: NewSubmission, canActivate: [authGuard]},
    {path: 'thank-you', component: ThankYou, canActivate: [authGuard]},
    {path: 'student-profile', component: StudentProfile, canActivate: [authGuard]},
    {path: 'guest-profile', component: GuestProfile, canActivate: [authGuard]},
    {path: 'privacy-policy', component: PrivacyPolicy},
    {path: 'terms-and-conditions', component: TermsAndConditions},
    {path: 'google-callback', component: GoogleCallbackComponent},
    
    // Faculty routes - DEPRECATED (Role 3 removed from system)
    // These routes kept for backwards compatibility but redirect to home
    {path: 'faculty-home', redirectTo: '/home', pathMatch: 'full'},
    {path: 'faculty-change-password', redirectTo: '/home', pathMatch: 'full'},
    {path: 'fichistory-page', redirectTo: '/home', pathMatch: 'full'},
    {path: 'fichistory-page/:id', redirectTo: '/home', pathMatch: 'full'},
    {path: 'for-fic', redirectTo: '/home', pathMatch: 'full'},
    {path: 'for-ficlanding', redirectTo: '/home', pathMatch: 'full'},
    {path: 'for-panel', redirectTo: '/home', pathMatch: 'full'},
    {path: 'for-panellanding', redirectTo: '/home', pathMatch: 'full'},
    {path: 'panelist-approval-page', redirectTo: '/home', pathMatch: 'full'},
    {path: 'panelist-approval-page/:id', redirectTo: '/home', pathMatch: 'full'},
    
    // AdminSide routes (lazy-loaded; unified for both chairperson and dean)
    {
      path: 'adminSide',
      loadChildren: () => import('./adminSide/admin-side.routes').then((m) => m.routes),
    },

    // Backwards compatibility redirects - OLD ROUTES → NEW adminSide routes
    {path: 'admin-dashboard', redirectTo: '/adminSide/dashboard', pathMatch: 'full'},
    {path: 'admin-documents', redirectTo: '/adminSide/documents', pathMatch: 'full'},
    {path: 'admin-request', redirectTo: '/adminSide/requests', pathMatch: 'full'},
    {path: 'admin-template', redirectTo: '/adminSide/templates', pathMatch: 'full'},
    {path: 'admin-chairperson-approval', redirectTo: '/adminSide/approvals', pathMatch: 'full'},
    {path: 'admin-chairperson-approval/:id', redirectTo: '/adminSide/approvals/:id'},
    {path: 'admin-block', redirectTo: '/adminSide/dashboard', pathMatch: 'full'},
    {path: 'admin-faculties', redirectTo: '/adminSide/dashboard', pathMatch: 'full'},
    {path: 'admin-programs', redirectTo: '/adminSide/programs', pathMatch: 'full'},
    {path: 'admin-departments', redirectTo: '/adminSide/programs', pathMatch: 'full'},
    {path: 'superadmin-dashboard', redirectTo: '/adminSide/dashboard', pathMatch: 'full'},
    {path: 'superadmin-documents', redirectTo: '/adminSide/documents', pathMatch: 'full'},
    {path: 'superadmin-programs', redirectTo: '/adminSide/programs', pathMatch: 'full'},
    {path: 'superadmin-request', redirectTo: '/adminSide/requests', pathMatch: 'full'},
    {path: 'superadmin-templates', redirectTo: '/adminSide/templates', pathMatch: 'full'},
    {path: 'dean-approval', redirectTo: '/adminSide/approvals', pathMatch: 'full'},
    {path: 'dean-approval/:id', redirectTo: '/adminSide/approvals/:id'},
    {path: 'dashboard', redirectTo: '/adminSide/dashboard', pathMatch: 'full'},
    {path: 'documents', redirectTo: '/adminSide/documents', pathMatch: 'full'},
    
    {path: '', redirectTo: '/home', pathMatch: 'full'},
    {path: 'login-modal', component: LoginModal},
    {path: '**', redirectTo: '/home'} // Catch-all route
];
