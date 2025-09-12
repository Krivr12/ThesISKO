import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { signupPostData, User, LoginResponse } from '../interface/auth';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Auth {
  private baseUrl = 'http://localhost:5050'
  constructor(private http: HttpClient) {}

  signupUser(postData: signupPostData) {
    return this.http.post(`${this.baseUrl}/api/users`, postData);
  }

  getUserDetails(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/api/users/login`, {
      email: email,
      password: password
    });
  }

  // Backend-side logout
  logoutUser(): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/auth/logout`, {});
  }
}
