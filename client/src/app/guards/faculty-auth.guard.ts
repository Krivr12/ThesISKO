import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class FacultyAuthGuard implements CanActivate {
  
  constructor(private router: Router) {}

  canActivate(): boolean {
    // Check if user is still logged in
    const user = sessionStorage.getItem('user');
    const role = sessionStorage.getItem('role');
    
    if (!user || !role || role.toLowerCase() !== 'faculty') {
      // User is not logged in or not a faculty member
      alert('You are not logged in. Please login first.');
      window.location.href = '/signup-choose';
      return false;
    }
    
    return true;
  }
}
