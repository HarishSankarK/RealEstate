import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent implements OnInit {
  forgotPasswordForm!: FormGroup;
  otpForm!: FormGroup;
  successMessage = '';
  errorMessage = '';
  loading = false;
  step: 'email' | 'otp' | 'success' = 'email';
  email = '';
  mockOtp = ''; // Mock OTP for demo (not used with backend)
  private apiBaseUrl = 'http://localhost:3000/api/auth';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    this.otpForm = this.fb.group({
      otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
    });
  }

  onSubmitEmail() {
    if (this.forgotPasswordForm.invalid) return;
    this.successMessage = '';
    this.errorMessage = '';
    this.loading = true;
    this.email = this.forgotPasswordForm.value.email;
    console.log(`[Frontend] Sending forgot-password request for email: ${this.email}`);
    this.http.post<any>(`${this.apiBaseUrl}/forgot-password`, { email: this.email }).subscribe({
      next: (res) => {
        console.log(`[Frontend] Forgot-password response:`, res);
        this.successMessage = res.message || 'OTP sent to your email.';
        this.step = 'otp';
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        console.error('[Frontend] Forgot-password error:', err);
        this.errorMessage = err.error?.message || 'Failed to send OTP. Please check the server.';
        this.loading = false;
      }
    });
  }

  onSubmitOtp() {
    if (this.otpForm.invalid) return;
    this.successMessage = '';
    this.errorMessage = '';
    this.loading = true;
    const otp = this.otpForm.value.otp;
    console.log(`[Frontend] Sending verify-otp request: email=${this.email}, otp=${otp}`);
    this.http.post<any>(`${this.apiBaseUrl}/verify-otp`, { email: this.email, otp }).subscribe({
      next: (res) => {
        console.log(`[Frontend] Verify-otp response:`, res);
        if (res.valid) {
          console.log(`[Frontend] OTP verified, requesting password reset for ${this.email}`);
          this.http.post<any>(`${this.apiBaseUrl}/reset-password`, { email: this.email }).subscribe({
            next: (resetRes) => {
              console.log(`[Frontend] Reset-password response:`, resetRes);
              this.successMessage = resetRes.message || 'Password sent to your email.';
              this.step = 'success';
              this.loading = false;
            },
            error: (resetErr: HttpErrorResponse) => {
              console.error('[Frontend] Reset-password error:', resetErr);
              this.errorMessage = resetErr.error?.message || 'Failed to send password.';
              this.loading = false;
            }
          });
        } else {
          console.log(`[Frontend] Invalid OTP received for ${this.email}`);
          this.errorMessage = 'Invalid OTP. Please try again.';
          this.loading = false;
        }
      },
      error: (err: HttpErrorResponse) => {
        console.error('[Frontend] Verify-otp error:', err);
        this.errorMessage = err.error?.message || 'Failed to verify OTP.';
        this.loading = false;
      }
    });
  }

  goBackToEmail() {
    this.step = 'email';
    this.successMessage = '';
    this.errorMessage = '';
    this.otpForm.reset();
  }

  goToSignin() {
    this.router.navigate(['/signin']);
  }
}