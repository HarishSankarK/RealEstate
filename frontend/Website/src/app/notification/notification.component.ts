import { Component, OnInit, Input, Output, EventEmitter, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { trigger, transition, style, animate } from '@angular/animations';

interface Notification {
  propertyId: string;
  userEmail: string;
  recipientEmail: string;
  message: string;
  createdAt: string;
  isResponse?: boolean;
  response?: { message: string; respondedAt: string; action: 'accept' | 'reject' };
  propertyDetails?: any;
  shown?: boolean;
  status?: 'pending' | 'accepted' | 'rejected';
  brochure?: string;
  responded?: boolean;
  paymentCompleted?: boolean;
}

interface NotificationActionEvent {
  notification: Notification;
  action: 'accept' | 'reject';
}

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.css'],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(100%)' }),
        animate('300ms ease-out', style({ transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateX(100%)' }))
      ])
    ]),
    trigger('popupFade', [
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
export class NotificationComponent implements OnInit, OnDestroy {
  @Input() showPanel: boolean = false;
  @Input() propertyId: string | null = null;
  @Input() userEmail: string | null = null;
  @Input() isBookingRequest: boolean = false;
  @Input() propertyDetails: any = null;
  @Input() notifications: Notification[] = [];
  @Output() notificationSent = new EventEmitter<boolean>();
  @Output() notificationAction = new EventEmitter<NotificationActionEvent>();
  @Output() viewBrochure = new EventEmitter<Notification>();
  @Output() payNow = new EventEmitter<Notification>();

  userNotifications: Notification[] = [];
  requests: Notification[] = [];
  errorMessage: string | null = null;
  successMessage: string | null = null;
  sending: boolean = false;
  popupMessage: string | null = null;
  showPopup: boolean = false;
  showPayment: boolean = false;
  selectedNotification: Notification | null = null;
  bookingMessage: string = '';
  private lastCheckedTimestamp: string | null = null;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadNotifications();
    this.loadRequests();
    this.checkPostSignupNotifications();
    window.addEventListener('notificationResponse', this.handleNotificationEvent.bind(this));
    window.addEventListener('storage', this.handleStorageEvent.bind(this));
    window.addEventListener('paymentCompleted', this.handlePaymentCompleted.bind(this));
  }

  ngOnDestroy() {
    window.removeEventListener('notificationResponse', this.handleNotificationEvent.bind(this));
    window.removeEventListener('storage', this.handleStorageEvent.bind(this));
    window.removeEventListener('paymentCompleted', this.handlePaymentCompleted.bind(this));
  }

  handlePaymentCompleted(event: Event) {
    const { propertyId } = (event as CustomEvent).detail;
    this.userNotifications = this.userNotifications.map(n =>
      n.propertyId === propertyId ? { ...n, paymentCompleted: true } : n
    );
    this.cdr.detectChanges();
  }

  loadNotifications() {
    this.userNotifications = this.notifications
      .filter((n: Notification) =>
        n.recipientEmail === this.userEmail || (n.isResponse && n.recipientEmail === this.userEmail)
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    this.lastCheckedTimestamp = this.userNotifications.length > 0 ? this.userNotifications[0].createdAt : null;
    console.log('Loaded notifications:', this.userNotifications);
    this.cdr.detectChanges();
  }

  loadRequests() {
    this.requests = this.notifications
      .filter((n: Notification) =>
        n.recipientEmail === this.userEmail && !n.response && n.status === 'pending' && !n.responded
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    console.log('Loaded requests:', this.requests);
    this.cdr.detectChanges();
  }

  sendBookingRequest() {
    if (!this.propertyId || !this.userEmail || !this.bookingMessage.trim()) {
      this.errorMessage = 'Please provide all required information and a message.';
      this.successMessage = null;
      return;
    }

    this.sending = true;
    this.errorMessage = null;
    this.successMessage = null;

    const notification: Notification = {
      propertyId: this.propertyId,
      userEmail: this.userEmail,
      recipientEmail: this.propertyDetails?.postedByEmail ?? 'unknown',
      message: this.bookingMessage,
      createdAt: new Date().toISOString(),
      status: 'pending',
      responded: false,
      paymentCompleted: false
    };

    const existingNotifications = JSON.parse(localStorage.getItem('notifications') ?? '[]');
    existingNotifications.push(notification);
    localStorage.setItem('notifications', JSON.stringify(existingNotifications));

    this.http.post('http://localhost:3000/api/send-email', {
      to: this.propertyDetails?.postedByEmail,
      subject: 'New Booking Request',
      text: `A new booking request has been made for your property (ID: ${this.propertyId}).\n\nMessage: ${notification.message}\n\nFrom: ${this.userEmail}`,
    }).subscribe({
      next: () => console.log('Booking request email sent successfully'),
      error: (error) => console.error('Failed to send booking request email:', error)
    });

    this.successMessage = 'Booking request sent successfully!';
    this.sending = false;
    this.notificationSent.emit(true);

    setTimeout(() => {
      this.showPanel = false;
      this.bookingMessage = '';
    }, 2000);
  }

  handleResponse(request: Notification, action: 'accept' | 'reject') {
    if (this.userEmail !== request.recipientEmail) {
      this.errorMessage = 'Only the property owner can accept or reject this request.';
      return;
    }

    if (request.responded) {
      console.log('Notification already responded to:', request);
      return;
    }

    request.responded = true;
    request.paymentCompleted = false;
    this.notificationAction.emit({ notification: request, action });

    const requesterName = request.userEmail?.split('@')[0] ?? 'User';
    const greeting = `Hello ${requesterName}! `;
    const responseMessage = action === 'accept'
      ? `${greeting}Your booking request for property ${request.propertyId} has been accepted.`
      : `${greeting}Your booking request for property ${request.propertyId} has been rejected.`;
    const response = {
      message: responseMessage,
      respondedAt: new Date().toISOString(),
      action: action
    };
    request.response = response;
    request.status = action === 'accept' ? 'accepted' : 'rejected';

    let propertyDetails = this.propertyDetails || {};
    if (action === 'accept') {
      if (!propertyDetails.title) {
        this.http.get(`http://localhost:3000/api/properties/${request.propertyId}`).subscribe({
          next: (property: any) => {
            propertyDetails = {
              title: property.title || 'Unknown Property',
              price: property.price || 0,
              location: property.location || 'Not Specified',
              bedrooms: property.bedrooms || 'N/A',
              bathrooms: property.bathrooms || 'N/A',
              area: property.area || 0,
              ownerName: property.ownerName || 'Unknown',
              postedByEmail: property.postedByEmail || 'Not Provided',
              image: property.image || 'https://via.placeholder.com/300x200'
            };
            request.propertyDetails = propertyDetails;
            this.sendResponseNotification(request, response, propertyDetails, action);
            this.updateNotifications();
          },
          error: (error) => {
            console.error('Failed to fetch property details:', error);
            propertyDetails = {
              title: 'Unknown Property',
              price: 0,
              location: 'Not Specified',
              bedrooms: 'N/A',
              bathrooms: 'N/A',
              area: 0,
              ownerName: 'Unknown',
              postedByEmail: 'Not Provided',
              image: 'https://via.placeholder.com/300x200'
            };
            request.propertyDetails = propertyDetails;
            this.sendResponseNotification(request, response, propertyDetails, action);
            this.updateNotifications();
          }
        });
      } else {
        request.propertyDetails = propertyDetails;
        this.sendResponseNotification(request, response, propertyDetails, action);
        this.updateNotifications();
      }
    } else {
      this.sendResponseNotification(request, response, null, action);
      this.updateNotifications();
    }

    this.loadNotifications();
    this.loadRequests();
    this.notificationSent.emit(true);
  }

  sendResponseNotification(request: Notification, response: any, propertyDetails: any, action: string) {
    const responseNotification: Notification = {
      propertyId: request.propertyId,
      userEmail: request.recipientEmail,
      recipientEmail: request.userEmail,
      message: response.message,
      createdAt: new Date().toISOString(),
      isResponse: true,
      response: response,
      propertyDetails: action === 'accept' ? propertyDetails : null,
      shown: false,
      status: action === 'accept' ? 'accepted' : 'rejected',
      paymentCompleted: false,
      responded: true
    };

    console.log('Created response notification:', responseNotification);

    const existingNotifications = JSON.parse(localStorage.getItem('notifications') ?? '[]');
    const updatedNotifications = existingNotifications.map((n: Notification) =>
      n.propertyId === request.propertyId && n.userEmail === request.userEmail && n.createdAt === request.createdAt ? request : n
    );
    updatedNotifications.push(responseNotification);
    localStorage.setItem('notifications', JSON.stringify(updatedNotifications));

    this.http.post('http://localhost:3000/api/send-email', {
      to: request.userEmail,
      subject: `Booking ${action === 'accept' ? 'Accepted' : 'Rejected'} for Property ${request.propertyId}`,
      text: action === 'accept'
        ? `${response.message}\n\nProperty Details:\n- Title: ${propertyDetails?.title}\n- Price: ₹${propertyDetails?.price}\n- Location: ${propertyDetails?.location}\n- Bedrooms: ${propertyDetails?.bedrooms}\n- Bathrooms: ${propertyDetails?.bathrooms}\n- Area: ${propertyDetails?.area} m²\n- Owner: ${propertyDetails?.ownerName} (${propertyDetails?.postedByEmail})\n\nPlease proceed with the payment to confirm your booking.`
        : response.message,
    }).subscribe({
      next: () => console.log('Response email sent successfully'),
      error: (error) => console.error('Failed to send response email:', error)
    });

    const event = new CustomEvent('notificationResponse', { detail: responseNotification });
    window.dispatchEvent(event);
  }

  handleNotificationEvent(event: Event) {
    const notification = (event as CustomEvent).detail as Notification;
    console.log('Received notification event:', notification);
    if (notification.recipientEmail === this.userEmail && notification.isResponse && !notification.shown) {
      this.showResponse(notification);
    }
  }

  handleStorageEvent(event: StorageEvent) {
    if (event.key === 'notifications' && event.newValue) {
      this.loadNotifications();
      const newNotifications = this.userNotifications.filter(n =>
        !this.lastCheckedTimestamp || new Date(n.createdAt) > new Date(this.lastCheckedTimestamp)
      );
      newNotifications.forEach(notification => {
        if (notification.isResponse && !notification.shown) {
          this.showResponse(notification);
        }
      });
    }
  }

  showResponse(notification: Notification) {
    this.popupMessage = notification.message;
    this.showPopup = true;
    this.selectedNotification = notification;
    this.showPayment = Boolean(
      (notification.isResponse ?? false) &&
      notification.response?.action === 'accept' &&
      !(notification.paymentCompleted ?? false)
    );
    console.log('showResponse - Notification:', notification);
    console.log('showPayment:', this.showPayment);
    notification.shown = true;

    const existingNotifications = JSON.parse(localStorage.getItem('notifications') ?? '[]');
    const updatedNotifications = existingNotifications.map((n: Notification) =>
      n.propertyId === notification.propertyId && n.createdAt === notification.createdAt && n.recipientEmail === notification.recipientEmail ? notification : n
    );
    localStorage.setItem('notifications', JSON.stringify(updatedNotifications));

    this.loadNotifications();
    this.cdr.detectChanges();
  }

  checkPostSignupNotifications() {
    this.loadNotifications();
    const newNotifications = this.userNotifications.filter(n => !n.shown);
    newNotifications.forEach(notification => {
      if (notification.isResponse) {
        this.showResponse(notification);
      }
    });
  }

  closePopup() {
    this.showPopup = false;
    this.popupMessage = null;
    this.showPayment = false;
    this.selectedNotification = null;
    this.cdr.detectChanges();
  }

  updateNotifications() {
    const allNotifications = JSON.parse(localStorage.getItem('notifications') ?? '[]');
    const updatedNotifications = allNotifications.map((n: Notification) =>
      this.userNotifications.find(un => un.propertyId === n.propertyId && un.recipientEmail === n.recipientEmail && un.createdAt === n.createdAt) ?? n
    );
    localStorage.setItem('notifications', JSON.stringify(updatedNotifications));
    this.loadNotifications();
  }

  closePanel() {
    this.showPanel = false;
    this.notificationSent.emit(false);
  }

  initiatePayment(notification: Notification) {
    console.log('NotificationComponent - initiatePayment - userEmail:', this.userEmail);
    console.log('NotificationComponent - initiatePayment - notification.recipientEmail:', notification.recipientEmail);
    console.log('Initiating payment for notification:', notification);
    this.payNow.emit(notification);
    this.closePopup();
  }

  onViewBrochure(notification: Notification) {
    this.viewBrochure.emit(notification);
  }

  needsSignIn(notification: Notification): boolean {
    return notification.recipientEmail !== this.userEmail && notification.status === 'accepted';
  }
}