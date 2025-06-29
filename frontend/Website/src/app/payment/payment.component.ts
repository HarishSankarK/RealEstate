import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { RestrictInputDirective } from '../restrict-input.directive';
import { CapitalizePipe } from '../capitalize.pipe';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RestrictInputDirective, CapitalizePipe],
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.css'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-in', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-out', style({ opacity: 0 }))
      ])
    ]),
    trigger('buttonHover', [
      transition(':enter', [
        style({ transform: 'scale(1)', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)' }),
        animate('300ms ease-out', style({ transform: 'scale(1.05)', boxShadow: '0 6px 20px rgba(0, 0, 0, 0.2)' }))
      ]),
      transition(':leave', [
        style({ transform: 'scale(1.05)', boxShadow: '0 6px 20px rgba(0, 0, 0, 0.2)' }),
        animate('300ms ease-in', style({ transform: 'scale(1)', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)' }))
      ])
    ])
  ]
})
export class PaymentComponent implements OnInit {
  @Input() amount: number | undefined;
  @Input() userEmail: string | null = null;
  @Input() propertyId: string | null = null;
  @Output() paymentCompleted = new EventEmitter<boolean>();

  // Property details
  title: string | null = null;
  location: string | null = null;
  bedrooms: string | null = null;
  bathrooms: string | null = null;
  area: number | null = null;
  ownerName: string | null = null;
  ownerEmail: string | null = null;

  // Form-related properties
  paymentForm: FormGroup;
  showPaymentForm: boolean = true;
  processing: boolean = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder
  ) {
    this.paymentForm = this.fb.group({
      cardNumber: ['', [Validators.required, Validators.pattern(/^\d{4}\s\d{4}\s\d{4}\s\d{4}$/)]],
      expiryDate: ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/)]],
      cvv: ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]],
      cardHolderName: ['', [Validators.required, Validators.pattern(/^[a-zA-Z\s]+$/), Validators.minLength(2)]]
    });
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.amount = params['amount'] ? Number(params['amount']) : this.amount;
      this.userEmail = params['userEmail'] || this.userEmail;
      this.propertyId = params['propertyId'] || this.propertyId;
      this.title = params['title'] || 'N/A';
      this.location = params['location'] || 'N/A';
      this.bedrooms = params['bedrooms'] || 'N/A';
      this.bathrooms = params['bathrooms'] || 'N/A';
      this.area = params['area'] ? Number(params['area']) : 0;
      this.ownerName = params['ownerName'] || 'Unknown';
      this.ownerEmail = params['ownerEmail'] || 'N/A';

      if (!this.propertyId || !this.userEmail || !this.amount) {
        console.error('Missing required query parameters:', {
          propertyId: this.propertyId,
          userEmail: this.userEmail,
          amount: this.amount
        });
        this.errorMessage = 'Invalid payment request. Redirecting...';
        setTimeout(() => this.router.navigate(['/home']), 2000);
      }
    });
  }

  // Luhn Algorithm for card number validation with detailed feedback
  private validateLuhn(cardNumber: string): { isValid: boolean; message?: string; suggestion?: string } {
    const digits = cardNumber.replace(/\s/g, '').split('').map(Number);
    let sum = 0;
    let isEven = false;

    // Double every second digit from the right
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = digits[i];
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      isEven = !isEven;
    }

    // Check if the sum is divisible by 10
    if (sum % 10 === 0) {
      return { isValid: true };
    }

    // Calculate what the last digit should be to make the sum divisible by 10
    const currentLastDigit = digits[digits.length - 1];
    const sumWithoutLastDigit = sum - currentLastDigit;
    const targetSum = Math.ceil(sum / 10) * 10;
    const requiredLastDigit = (targetSum - sumWithoutLastDigit) % 10;

    // Generate a corrected card number
    const correctedCardNumber = cardNumber.slice(0, -1) + requiredLastDigit;

    return {
      isValid: false,
      message: `Invalid card number. The Luhn checksum (${sum}) is not divisible by 10.`,
      suggestion: `Try changing the last digit to ${requiredLastDigit}: ${correctedCardNumber}`
    };
  }

  processPayment() {
    if (this.paymentForm.invalid) {
      this.errorMessage = 'Please correct the errors in the form.';
      this.paymentForm.markAllAsTouched();
      return;
    }

    this.processing = true;
    this.errorMessage = null;
    this.successMessage = null;

    const { cardNumber, expiryDate, cvv, cardHolderName } = this.paymentForm.value;

    // Validate card number with Luhn algorithm
    const luhnResult = this.validateLuhn(cardNumber);
    if (!luhnResult.isValid) {
      this.errorMessage = `${luhnResult.message} ${luhnResult.suggestion || ''}`;
      this.processing = false;
      return;
    }

    // Validate expiry date
    const [month, year] = expiryDate.split('/');
    const expiryDateObj = new Date(parseInt(`20${year}`), parseInt(month), 0); // Last day of the month
    const currentDate = new Date();
    currentDate.setDate(1); // Compare at the start of the month
    if (expiryDateObj < currentDate) {
      this.errorMessage = 'Card has expired.';
      this.processing = false;
      return;
    }

    setTimeout(() => {
      this.successMessage = `Payment successful for ${cardHolderName}!`;
      this.processing = false;
      this.http.post('http://localhost:3000/api/send-email', {
        to: this.userEmail,
        subject: 'Payment Confirmation - RealEstateHub',
        text: `Dear ${cardHolderName},\n\nYour payment of ₹${this.amount} for property (ID: ${this.propertyId}) has been successfully processed.\n\nThank you for your booking!\n\nBest regards,\nRealEstateHub Team`
      }).subscribe(
        () => console.log('Payment confirmation email sent'),
        (error) => console.error('Failed to send payment confirmation email:', error)
      );
      this.paymentCompleted.emit(true);
      this.router.navigate(['/home'], { queryParams: { paymentStatus: 'success', propertyId: this.propertyId } });
    }, 2000);
  }

  cancelPayment() {
    this.showPaymentForm = false;
    this.paymentCompleted.emit(false);
    this.router.navigate(['/home'], { queryParams: { paymentStatus: 'cancelled' } });
  }
}