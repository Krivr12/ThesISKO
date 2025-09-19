import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { signupPostData, User } from '../interface/auth';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Auth {
  private baseUrl = 'http://localhost:5050'
  constructor(private http: HttpClient) {}

  signupUser(postData: signupPostData) {
    return this.http.post(`${this.baseUrl}/users`, postData);
  }

  loginUser(email: string, password: string): Observable<{message: string, user: User}> {
    return this.http.post<{message: string, user: User}>(`${this.baseUrl}/auth/login`, {
      email,
      password
    });
  }
  
}
