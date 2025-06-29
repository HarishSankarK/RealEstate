import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
})
export class SignupComponent {
  submitted = false;
  errorMessage: string | null = null;

  user = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zip: '',
      country: ''
    },
    preferences: {
      notifications: true
    }
  };

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit() {
    console.log('[Frontend] Form submitted'); // Log to confirm method is called
    this.submitted = true;
    this.errorMessage = null;
  
    console.log('[Frontend] User data:', JSON.stringify(this.user, null, 2)); // Log full user object
    if (this.isFormValid()) {
      console.log('[Frontend] Form is valid');
      const { confirmPassword, ...signupData } = this.user;
      console.log('[Frontend] Sending signup request:', JSON.stringify(signupData, null, 2));
      this.authService.signup(signupData).subscribe({
        next: (response) => {
          console.log('[Frontend] Signup response:', response);
          alert('Sign up successful! Redirecting to Sign In.');
          this.router.navigate(['/signin']);
        },
        error: (error) => {
          this.errorMessage = `Sign up failed: ${error.status === 400 ? 'Email already exists' : 'Server error'}`;
          console.error('[Frontend] Signup error:', error);
          alert(this.errorMessage);
        }
      });
    } else {
      this.errorMessage = 'Please fill all required fields correctly.';
      console.warn('[Frontend] Form invalid:', JSON.stringify(this.user, null, 2));
      alert(this.errorMessage);
    }
  }
  isFormValid(): boolean {
    console.log('[Frontend] Validating form:', this.user);
    return (
      !!this.user.firstName &&
      !!this.user.lastName &&
      !!this.user.email &&
      !!this.user.password &&
      this.user.password === this.user.confirmPassword &&
      !!this.user.phone &&
      !!this.user.address.street &&
      !!this.user.address.city &&
      !!this.user.address.state &&
      !!this.user.address.zip &&
      !!this.user.address.country
    );
  }
}