import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api/auth';
  private currentUserEmailSubject = new BehaviorSubject<string | null>(null);
  currentUserEmail$ = this.currentUserEmailSubject.asObservable();
  private currentUserRoleSubject = new BehaviorSubject<string | null>(null);
  currentUserRole$ = this.currentUserRoleSubject.asObservable();
  private currentUserPhoneSubject = new BehaviorSubject<string | null>(null);
  currentUserPhone$ = this.currentUserPhoneSubject.asObservable();

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      const storedEmail = localStorage.getItem('currentUserEmail');
      const storedRole = localStorage.getItem('currentUserRole');
      const storedPhone = localStorage.getItem('currentUserPhone');

      if (storedEmail) {
        this.currentUserEmailSubject.next(storedEmail);
        console.log('AuthService - Constructor - Loaded email from localStorage:', storedEmail);
      } else {
        console.log('AuthService - Constructor - No email found in localStorage');
        this.currentUserEmailSubject.next(null); // Ensure the BehaviorSubject emits null if no email is found
      }

      if (storedRole) {
        this.currentUserRoleSubject.next(storedRole);
        console.log('AuthService - Constructor - Loaded role from localStorage:', storedRole);
      }
      if (storedPhone) {
        this.currentUserPhoneSubject.next(storedPhone);
        console.log('AuthService - Constructor - Loaded phone from localStorage:', storedPhone);
      }
    }
  }

  signin(user: { email: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/signin`, user);
  }

  signup(user: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/signup`, user);
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/forgot-password`, { email });
  }

  verifyOtp(email: string, otp: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/verify-otp`, { email, otp });
  }

  resetPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password`, { email });
  }

  setUserEmail(email: string | null) {
    if (isPlatformBrowser(this.platformId)) {
      if (email) {
        localStorage.setItem('currentUserEmail', email);
        this.currentUserEmailSubject.next(email);
        console.log('AuthService - setUserEmail - Set user email:', email);
      } else {
        localStorage.removeItem('currentUserEmail');
        this.currentUserEmailSubject.next(null);
        console.log('AuthService - setUserEmail - Cleared user email');
      }
    } else {
      this.currentUserEmailSubject.next(email);
      console.log('AuthService - setUserEmail - Not in browser, set email:', email);
    }
  }

  getUserEmail(): string | null {
    return this.currentUserEmailSubject.value;
  }

  setUserRole(role: string | null) {
    if (isPlatformBrowser(this.platformId)) {
      if (role) {
        localStorage.setItem('currentUserRole', role);
      } else {
        localStorage.removeItem('currentUserRole');
      }
      console.log('AuthService - setUserRole - Set user role:', role);
    }
    this.currentUserRoleSubject.next(role);
  }

  getUserRole(): string | null {
    return this.currentUserRoleSubject.value;
  }

  setUserPhone(phone: string | null) {
    if (isPlatformBrowser(this.platformId)) {
      if (phone) {
        localStorage.setItem('currentUserPhone', phone);
      } else {
        localStorage.removeItem('currentUserPhone');
      }
      console.log('AuthService - setUserPhone - Set user phone:', phone);
    }
    this.currentUserPhoneSubject.next(phone);
  }

  getUserPhone(): string | null {
    return this.currentUserPhoneSubject.value;
  }

  signOut() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('currentUserEmail');
      localStorage.removeItem('currentUserRole');
      localStorage.removeItem('currentUserPhone');
      console.log('AuthService - signOut - Cleared email, role, and phone from localStorage');
    }
    
    this.currentUserEmailSubject.next(null);
    this.currentUserRoleSubject.next(null);
    this.currentUserPhoneSubject.next(null);
    console.log('AuthService - signOut - Cleared email, role, and phone subjects');
  }
}