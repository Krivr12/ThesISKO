import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { Signup } from './components/signup/signup';
import { Home } from './components/home/home';
import { AboutUs } from './components/about-us/about-us';
import { SearchThesis } from './components/search-thesis/search-thesis';
import { SearchResult } from './components/search-result/search-result';
import { Submission } from './components/submission/submission';
import { NewSubmission } from './components/new-submission/new-submission';
import { ThankYou } from './components/thank-you/thank-you';
import { SignupChoose } from './components/signup-choose/signup-choose';
import { LoginAdmin } from './components/login-admin/login-admin';
import { StudentProfile } from './components/student-profile/student-profile';
import { GuestProfile } from './components/guest-profile/guest-profile';
import { PrivacyPolicy } from './components/privacy-policy/privacy-policy';
import { TermsAndConditions } from './components/terms-and-conditions/terms-and-conditions';
import { GoogleCallbackComponent } from './components/google-callback/google-callback';
import { AdminDashboard } from './admin/admin-dashboard/admin-dashboard';
import { AdminBlock } from './admin/admin-block/admin-block';
import { AdminDocuments as OldAdminDocuments } from './admin/admin-documents/admin-documents';
import { AdminFaculties } from './admin/admin-faculties/admin-faculties';
import { AdminRequest } from './admin/admin-request/admin-request';
import { AdminTemplate } from './admin/admin-template/admin-template';
import { AdminSideBar } from './admin/admin-side-bar/admin-side-bar';
import { AdminChairpersonApproval } from './admin/admin-chairperson-approval/admin-chairperson-approval';
import { AdminChairpersonDetails } from './admin/admin-chairperson-details/admin-chairperson-details';
import { adminGuard } from './guards/admin-guard';
import { superadminGuard } from './guards/superadmin-guard';
import { authGuard } from './guards/auth-guard';
import { adminSideGuard } from './guards/admin-side-guard';
import { deanOnlyGuard } from './guards/dean-only-guard';
import { Programs } from './superAdmin/programs/programs';
import { Dashboard as SuperAdminDashboard } from './superAdmin/dashboard/dashboard';
import { Documents as SuperAdminDocuments } from './superAdmin/documents/documents';
import { Request } from './superAdmin/request/request';
import { Templates } from './superAdmin/templates/templates';
import { Faculties } from './superAdmin/faculties/faculties';
import { DeanApproval } from './superAdmin/dean-approval/dean-approval';
import { DeanDetails } from './superAdmin/dean-details/dean-details';
import { RoleTestComponent } from './components/role-test/role-test';
import { LoginModal } from './components/login-modal/login-modal';
import { DocumentTypes } from './adminSide/document-types/document-types';
import { AdminSideDashboard } from './adminSide/dashboard/dashboard';
import { Approvals } from './adminSide/approvals/approvals';
import { ApprovalDetails } from './adminSide/approvals/approval-details';
import { AdminDocuments } from './adminSide/documents/documents';
import { DocumentEdit } from './adminSide/documents/document-edit';
import { AdminPrograms } from './adminSide/programs/programs';
import { AdminFaculties as AdminSideFaculties } from './adminSide/faculties/faculties';
import { AdminRequests } from './adminSide/requests/requests';
import { AdminTemplates } from './adminSide/templates/templates';
import { Requirements } from './adminSide/requirements/requirements';

export const routes: Routes = [
    {path: 'signup-choose', component: SignupChoose},
    {path: 'login', component: Login, canActivate: [authGuard]},
    {path: 'login-admin', component: LoginAdmin},
    {path: 'signup', component: Signup},
    {path: 'home', component: Home, canActivate: [authGuard]},
    {path: 'about-us', component: AboutUs, canActivate: [authGuard]},
    {path: 'search-thesis', component: SearchThesis, canActivate: [authGuard]},
    {path: 'search-result', component: SearchResult, canActivate: [authGuard]},
    {path: 'submission', component: NewSubmission, canActivate: [authGuard]},
    {path: 'submission-old', component: Submission, canActivate: [authGuard]},
    {path: 'thank-you', component: ThankYou, canActivate: [authGuard]},
    {path: 'student-profile', component: StudentProfile, canActivate: [authGuard]},
    {path: 'guest-profile', component: GuestProfile, canActivate: [authGuard]},
    {path: 'privacy-policy', component: PrivacyPolicy},
    {path: 'terms-and-conditions', component: TermsAndConditions},
    {path: 'google-callback', component: GoogleCallbackComponent},
    {path: 'role-test', component: RoleTestComponent},
    
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
    
    // Admin routes (role_id = 4, 7 can access)
    {path: 'admin-dashboard', component: AdminDashboard, canActivate: [adminGuard]},
    {path: 'admin-block', component: AdminBlock, canActivate: [adminGuard]},
    {path: 'admin-documents-old', component: OldAdminDocuments, canActivate: [adminGuard]},
    {path: 'admin-faculties', component: AdminFaculties, canActivate: [adminGuard]},
    {path: 'admin-request', component: AdminRequest, canActivate: [adminGuard]},
    {path: 'admin-template', component: AdminTemplate, canActivate: [adminGuard]},
    {path: 'admin-side-bar', component: AdminSideBar, canActivate: [adminGuard]},
    {path: 'admin-chairperson-approval', component: AdminChairpersonApproval, canActivate: [adminGuard]},
    {path: 'admin-chairperson-approval/:group_id', component: AdminChairpersonDetails, canActivate: [adminGuard]},
    
    // SuperAdmin routes (role_id = 5, 8 can access)
    {path: 'superadmin-dashboard', component: SuperAdminDashboard, canActivate: [superadminGuard]},
    {path: 'superadmin-documents', component: SuperAdminDocuments, canActivate: [superadminGuard]},
    {path: 'superadmin-programs', component: Programs, canActivate: [superadminGuard]},
    {path: 'superadmin-request', component: Request, canActivate: [superadminGuard]},
    {path: 'superadmin-templates', component: Templates, canActivate: [superadminGuard]},
    {path: 'superadmin-faculties', component: Faculties, canActivate: [superadminGuard]},
    {path: 'dean-approval', component: DeanApproval, canActivate: [superadminGuard]},
    {path: 'dean-approval/:group_id', component: DeanDetails, canActivate: [superadminGuard]},
    
    // AdminSide routes (NEW - unified for both chairperson and dean)
    {path: 'adminSide/dashboard', component: AdminSideDashboard, canActivate: [adminSideGuard]},
    {path: 'adminSide/approvals', component: Approvals, canActivate: [adminSideGuard]},
    {path: 'adminSide/approvals/:id', component: ApprovalDetails, canActivate: [adminSideGuard]},
    {path: 'adminSide/documents', component: AdminDocuments, canActivate: [adminSideGuard]},
    {path: 'adminSide/documents/edit/:id', component: DocumentEdit, canActivate: [adminSideGuard]},
    {path: 'adminSide/programs', component: AdminPrograms, canActivate: [deanOnlyGuard]},
    {path: 'adminSide/faculties', component: AdminSideFaculties, canActivate: [deanOnlyGuard]},
    {path: 'adminSide/requests', component: AdminRequests, canActivate: [adminSideGuard]},
    {path: 'adminSide/templates', component: AdminTemplates, canActivate: [adminSideGuard]},
    {path: 'adminSide/document-types', component: DocumentTypes, canActivate: [deanOnlyGuard]},
    {path: 'adminSide/requirements', component: Requirements, canActivate: [deanOnlyGuard]},
    
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
    
    {path: '', redirectTo: '/signup-choose', pathMatch: 'full'},
    {path: 'login-modal', component: LoginModal},
    {path: '**', redirectTo: '/signup-choose'} // Catch-all route
];
