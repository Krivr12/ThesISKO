import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { signupPostData, User } from '../interface/auth';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Auth {
  private baseUrl = 'http://localhost:3000'
  constructor(private http: HttpClient) {}

  signupUser(postData: signupPostData) {
    return this.http.post(`${this.baseUrl}/users`, postData);
  }

  getUserDetails(email: string, password: string): Observable<User[]> {
    return this.http.get<User[]> 
    (`${this.baseUrl}/users?email=${email}&password=${password}`);
  }
  
}
