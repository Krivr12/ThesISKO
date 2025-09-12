import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { Signup } from './components/signup/signup';
import { Home } from './components/home/home';
import { AboutUs } from './components/about-us/about-us';
import { SearchThesis } from './components/search-thesis/search-thesis';
import { SearchResult } from './components/search-result/search-result';
import { Submission } from './components/submission/submission';
import { ThankYou } from './components/thank-you/thank-you';
import { LoginModal } from './components/login-modal/login-modal';

export const routes: Routes = [
    {path: 'login', component: Login},
    {path: 'signup', component: Signup},
    {path: 'home', component: Home},
    {path: 'about-us', component: AboutUs},
    {path: 'search-thesis', component: SearchThesis},
    {path: 'search-result', component: SearchResult},
    {path: 'submission', component: Submission},
    {path: 'thank-you', component: ThankYou},
    {path: 'login-modal', component: LoginModal},
    {path: '', redirectTo: 'home', pathMatch: 'full'}
];
