import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../services/auth.service'; // Adjust the path as needed
import { Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

interface SigninResponse {
  message: string;
  user: {
    email: string;
    role: string;
    phone: string;
  };
}

@Component({
  selector: 'app-signin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './signin.component.html',
  styleUrls: ['./signin.component.css']
})
export class SigninComponent {
  user = {
    email: '',
    password: ''
  };
  submitted = false;
  isSubmitting = false; // Added for loading state
  successMessage: string | null = null;
  errorMessage: string | null = null;

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  onSubmit(signinForm: NgForm) {
    this.submitted = true;
    this.isSubmitting = true; // Set loading state
    this.successMessage = null; // Clear previous messages
    this.errorMessage = null;

    if (this.validateForm() && signinForm.valid) {
      const payload = { email: this.user.email, password: this.user.password };
      console.log('Sending sign-in request with payload:', payload);
      this.http.post<SigninResponse>('http://localhost:3000/api/auth/signin', payload).subscribe({
        next: (response) => {
          console.log('Sign-in response status:', response);
          console.log('User email from response:', response.user?.email);
          if (response.user && response.user.email) {
            this.successMessage = 'Sign-in successful!';
            if (isPlatformBrowser(this.platformId)) {
              this.authService.setUserEmail(response.user.email);
              console.log('AuthService currentUserEmail after sign-in:', this.authService.getUserEmail());
              localStorage.setItem('currentUserRole', response.user.role); // Store role
              localStorage.setItem('currentUserPhone', response.user.phone || '');
              console.log('Stored in localStorage:', {
                currentUserEmail: this.authService.getUserEmail(),
                currentUserRole: localStorage.getItem('currentUserRole'),
                currentUserPhone: localStorage.getItem('currentUserPhone')
              });
            }

            // Redirect based on role
            const redirectPath = response.user.role === 'admin' ? '/admin' : '/homepage1';
            this.router.navigate([redirectPath]).then(success => {
              console.log(`Navigation to ${redirectPath} successful:`, success);
            }).catch(err => {
              console.error(`Navigation to ${redirectPath} failed:`, err);
              this.errorMessage = 'Navigation failed. Please try again.';
            });
          } else {
            this.errorMessage = 'Sign-in response invalid. Missing user email.';
          }
        },
        error: (error) => {
          console.error('Sign-in error status:', error.status);
          console.error('Sign-in error message:', error.error?.message);
          this.errorMessage = error.error?.message || 'Sign-in failed. Please try again.';
        },
        complete: () => {
          this.isSubmitting = false; // Reset loading state
        }
      });
    } else {
      this.errorMessage = 'Please fill all required fields or correct the email format.';
      this.isSubmitting = false; // Reset loading state
    }
  }

  validateForm(): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return !!this.user.email && !!this.user.password && emailRegex.test(this.user.email);
  }

  goToSignup() {
    this.router.navigate(['/signup']);
  }

  goToForgotPassword() {
    this.router.navigate(['/forgot-password']);
  }
}