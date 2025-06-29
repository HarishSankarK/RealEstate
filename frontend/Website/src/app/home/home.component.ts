import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { trigger, transition, style, animate } from '@angular/animations';
import { PropertyService } from '../services/property.service';
import { NotificationComponent } from '../notification/notification.component';
import { catchError, finalize, map } from 'rxjs/operators';
import { of, Subscription } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ActivatedRoute } from '@angular/router';

interface Notification {
  propertyId: string;
  userEmail: string;
  recipientEmail: string;
  message: string;
  createdAt: string;
  status?: 'pending' | 'accepted' | 'rejected';
  brochure?: string;
  paymentCompleted?: boolean;
  shown?: boolean;
  responded?: boolean;
  isResponse?: boolean;
  response?: { message: string; respondedAt: string; action: 'accept' | 'reject' };
  propertyDetails?: any;
}

interface Property {
  _id: string;
  title: string;
  price: number;
  location: string;
  postedByEmail: string;
  ownerName?: string;
  ownerPhone?: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  category: string;
  viewCount?: number;
  propertyType?: string;
  image?: string;
  isFavorite?: boolean;
  availability?: string;
  bookedByEmail?: string | null | undefined;
  status?: string;
  isResidential?: boolean;
}

interface User {
  email: string;
  username: string;
  profileImage: string;
}

interface Chat {
  _id: string;
  participants: string[];
  propertyId: string;
  messages: any[];
  propertyDetails: any;
  participantsDetails?: { [email: string]: User };
  lastReadTimestamp?: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NotificationComponent],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('600ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
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
    ]),
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('500ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        style({ transform: 'translateX(0)', opacity: 1 }),
        animate('500ms ease-in', style({ transform: 'translateX(100%)', opacity: 0 }))
      ])
    ]),
    trigger('popupFade', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.8)' }),
        animate('400ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
      ]),
      transition(':leave', [
        style({ opacity: 1, transform: 'scale(1)' }),
        animate('400ms ease-in', style({ opacity: 0, transform: 'scale(0.8)' }))
      ])
    ]),
    trigger('brochurePulse', [
      transition(':enter', [
        style({ transform: 'scale(1)' }),
        animate('1s ease-in-out', style({ transform: 'scale(1.05)' })),
        animate('1s ease-in-out', style({ transform: 'scale(1)' }))
      ])
    ]),
    trigger('verifyAlertFade', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.9)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
      ]),
      transition(':leave', [
        style({ opacity: 1, transform: 'scale(1)' }),
        animate('300ms ease-in', style({ opacity: 0, transform: 'scale(0.9)' }))
      ])
    ])
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit, OnDestroy {
  properties: Property[] = [];
  filteredProperties: Property[] = [];
  loading = true;
  searchQuery: string = '';
  filters: { propertyType: string; priceRange: string; bedrooms: string; purpose: string; minPrice: number; maxPrice: number } = {
    propertyType: '',
    priceRange: '',
    bedrooms: '',
    purpose: '',
    minPrice: 0,
    maxPrice: Infinity
  };
  propertyTypes = ['Single Family Home', 'Condo/Townhouse', 'Apartment', 'Commercial', 'Land', 'Multi-Family'];
  priceRanges: { label: string; min: number; max: number }[] = [
    { label: '', min: 0, max: Infinity },
    { label: 'Under ₹200K', min: 0, max: 200000 },
    { label: '₹200K - ₹500K', min: 200000, max: 500000 },
    { label: '₹500K - ₹1M', min: 500000, max: 1000000 },
    { label: '> ₹1M', min: 1000000, max: Infinity },
    { label: 'Under ₹200K - ₹600K', min: 0, max: 600000 },
  ];
  bedroomOptions = ['', '1 Bedroom', '2 Bedrooms', '3 Bedrooms', '4+ Bedrooms'];
  purposeOptions = ['', 'Buy', 'Rental'];
  currentUserEmail: string | null = null;
  showChatPanel = false;
  chats: Chat[] = [];
  selectedChat: Chat | null = null;
  newMessage: string = '';
  favorites: string[] = [];
  compareProperties: Property[] = [];
  showComparePanel = false;
  showBookingPopup = false;
  selectedProperty: Property | null = null;
  selectedPropertyId: string | null = null;
  selectedPropertyDetails: Property | null = null;
  isBookingRequest: boolean = false;
  showNotificationPanel = false;
  notifications: Notification[] = [];
  showBrochurePopup = false;
  brochureContent: string | null = null;
  currentNotification: Notification | null = null;
  showVerifyAlert: boolean = false;
  unreadNotificationsCount: number = 0;
  unreadMessagesCount: number = 0;
  private lastReadNotifications: string[] = [];
  private lastReadMessages: { [chatId: string]: string } = {};
  private emailSubscription: Subscription | null = null;

  constructor(
    private propertyService: PropertyService,
    private http: HttpClient,
    private route: ActivatedRoute,
    public router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    private authService: AuthService
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.currentUserEmail = localStorage.getItem('currentUserEmail');
      console.log('HomeComponent - Constructor - Initial currentUserEmail from localStorage:', this.currentUserEmail);
    }

    this.emailSubscription = this.authService.currentUserEmail$.subscribe(email => {
      console.log('HomeComponent - Subscription - currentUserEmail updated:', email);
      this.currentUserEmail = email;
      if (!email) {
        console.warn('HomeComponent - currentUserEmail is null, redirecting to sign-in');
        this.notifications = [];
        this.showNotificationPanel = false;
        this.router.navigate(['/signin']);
        return;
      }
      if (isPlatformBrowser(this.platformId)) {
        this.favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        this.lastReadNotifications = JSON.parse(localStorage.getItem(`lastReadNotifications_${this.currentUserEmail}`) || '[]');
        this.lastReadMessages = JSON.parse(localStorage.getItem(`lastReadMessages_${this.currentUserEmail}`) || '{}');
      }
      this.loadNotifications();
      this.loadProperties();
      this.loadChats();
      console.log('HomeComponent - Updated currentUserEmail from AuthService:', this.currentUserEmail);
    });

    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd && isPlatformBrowser(this.platformId)) {
        const updatedEmail = this.authService?.getUserEmail() ?? null;
        if (this.currentUserEmail !== updatedEmail) {
          this.currentUserEmail = updatedEmail;
          if (!this.currentUserEmail) {
            console.warn('HomeComponent - currentUserEmail became null after NavigationEnd, redirecting to sign-in');
            this.notifications = [];
            this.showNotificationPanel = false;
            this.router.navigate(['/signin']);
            return;
          }
          this.loadNotifications();
          this.loadProperties();
          this.loadChats();
          console.log('HomeComponent - Updated currentUserEmail from NavigationEnd:', this.currentUserEmail);
        }
      }
    });
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      if (!this.currentUserEmail) {
        this.currentUserEmail = this.authService?.getUserEmail() ?? localStorage.getItem('currentUserEmail');
      }
      if (!this.currentUserEmail) {
        console.warn('User email not found in ngOnInit. Redirecting to sign-in.');
        this.router.navigate(['/signin']);
        return;
      }
      this.favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      this.lastReadNotifications = JSON.parse(localStorage.getItem(`lastReadNotifications_${this.currentUserEmail}`) || '[]');
      this.lastReadMessages = JSON.parse(localStorage.getItem(`lastReadMessages_${this.currentUserEmail}`) || '{}');
      console.log('HomeComponent ngOnInit - currentUserEmail:', this.currentUserEmail);
    } else {
      if (!this.currentUserEmail) {
        console.warn('User email not found in ngOnInit (non-browser). Redirecting to sign-in.');
        this.router.navigate(['/signin']);
        return;
      }
    }

    this.route.queryParams.subscribe(params => {
      const paymentStatus = params['paymentStatus'];
      const propertyId = params['propertyId'];
      if (paymentStatus === 'success' && propertyId) {
        this.onPaymentCompleted(propertyId);
      }
    });

    this.loadProperties();
    this.loadNotifications();
    this.loadChats();
  }

  ngOnDestroy() {
    if (this.emailSubscription) {
      this.emailSubscription.unsubscribe();
    }
  }

  loadNotifications() {
    if (isPlatformBrowser(this.platformId)) {
      if (!this.currentUserEmail) {
        console.warn('HomeComponent - loadNotifications - No current user email, skipping notification load');
        this.notifications = [];
        this.unreadNotificationsCount = 0;
        return;
      }

      let storedNotifications = JSON.parse(localStorage.getItem('notifications') || '[]');

      this.notifications = storedNotifications
        .filter((n: Notification) => 
          (n.recipientEmail === this.currentUserEmail || n.userEmail === this.currentUserEmail) &&
          (n.status === 'pending' || n.status === 'accepted' || n.status === 'rejected')
        )
        .sort((a: Notification, b: Notification) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      console.log('HomeComponent - loadNotifications - Loaded notifications for user', this.currentUserEmail, ':', this.notifications);

      this.updateUnreadNotificationsCount();
    }
  }

  updateUnreadNotificationsCount() {
    if (!this.currentUserEmail) {
      this.unreadNotificationsCount = 0;
      return;
    }
    this.unreadNotificationsCount = this.notifications.filter(n => 
      !n.shown && 
      !this.lastReadNotifications.includes(`${n.propertyId}-${n.createdAt}`) &&
      (n.status === 'pending' || n.status === 'accepted')
    ).length;
  }

  updateUnreadMessagesCount() {
    if (!this.currentUserEmail) {
      this.unreadMessagesCount = 0;
      return;
    }
    let totalUnread = 0;
    this.chats.forEach(chat => {
      const lastRead = this.lastReadMessages[chat._id] || '1970-01-01T00:00:00.000Z';
      const unread = chat.messages.filter(msg => msg.sender !== this.currentUserEmail && new Date(msg.createdAt) > new Date(lastRead)).length;
      totalUnread += unread;
    });
    this.unreadMessagesCount = totalUnread;
  }

  updateFilters(): void {
    if (this.filters.priceRange && this.priceRanges) {
      const range = this.priceRanges.find(r => r.label === this.filters.priceRange);
      this.filters.minPrice = range?.min || 0;
      this.filters.maxPrice = range?.max || Infinity;
    }
  }

  resetFilters(): void {
    this.filters = {
      propertyType: '',
      priceRange: '',
      bedrooms: '',
      purpose: '',
      minPrice: 0,
      maxPrice: Infinity
    };
    this.onPurposeChange();
    this.filterProperties();
  }

  loadProperties(category: string = '') {
    this.loading = true;
    const observable = category
      ? this.propertyService.getProperties().pipe(
          map((properties: Property[]) => properties.filter((prop: Property) => prop.category === category)),
          catchError((error) => {
            console.error('Error fetching properties:', error);
            this.loading = false;
            return of([]);
          }),
          finalize(() => (this.loading = false))
        )
      : this.propertyService.getProperties().pipe(
          catchError((error) => {
            console.error('Error fetching properties:', error);
            this.loading = false;
            return of([]);
          }),
          finalize(() => (this.loading = false))
        );

    observable.subscribe(
      (response: Property[]) => {
        this.properties = response.map((property: Property) => ({
          ...property,
          viewCount: property.viewCount || 0,
          isFavorite: this.favorites.includes(property._id),
          availability: property.availability || 'available'
        }));
        this.filterProperties();
      },
      (error: any) => {
        console.error('Failed to load properties', error);
        this.properties = [];
        this.filterProperties();
      }
    );
  }

  filterProperties() {
    this.updateFilters();
    this.filteredProperties = this.properties.filter((property) => {
      const matchesSearch =
        !this.searchQuery ||
        property.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        property.location.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesPropertyType =
        !this.filters.propertyType || property.propertyType === this.filters.propertyType;
      const matchesPrice =
        property.price >= this.filters.minPrice && property.price <= this.filters.maxPrice;
      const matchesBedrooms =
        !this.filters.bedrooms || this.checkBedrooms(property.bedrooms, this.filters.bedrooms);
      const matchesPurpose =
        !this.filters.purpose ||
        (this.filters.purpose === 'Rental'
          ? property.category === 'Rent' && property.availability === 'available'
          : property.category === this.filters.purpose);
      return matchesSearch && matchesPropertyType && matchesPrice && matchesBedrooms && matchesPurpose;
    });
  }

  onPurposeChange() {
    const category = this.filters.purpose === 'Rental' ? 'Rent' : this.filters.purpose;
    this.loadProperties(category);
  }

  checkBedrooms(bedrooms: number, range: string): boolean {
    switch (range) {
      case '1 Bedroom': return bedrooms === 1;
      case '2 Bedrooms': return bedrooms === 2;
      case '3 Bedrooms': return bedrooms === 3;
      case '4+ Bedrooms': return bedrooms >= 4;
      default: return true;
    }
  }

  onImageError(event: Event, property: any) {
    (event.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200';
  }

  viewDetails(property: Property) {
    if (!property._id) return;
    this.router.navigate(['/property', property._id]);
  }

  bookNow(property: Property) {
    if (!property._id || !this.currentUserEmail || property.availability !== 'available' || property.category !== 'Rent') {
      if (!this.currentUserEmail) this.router.navigate(['/signin']);
      return;
    }
    if (this.currentUserEmail === property.postedByEmail) {
      alert('You cannot book your own property.');
      return;
    }
    this.selectedPropertyId = property._id;
    this.selectedPropertyDetails = property;
    this.isBookingRequest = true;
    this.showNotificationPanel = true;
  }

  confirmBooking() {
    if (!this.selectedProperty || !this.currentUserEmail) return;
    this.showBookingPopup = false;
    this.selectedProperty = null;
  }

  cancelBooking() {
    this.showBookingPopup = false;
    this.selectedProperty = null;
  }

  chatWithAgent(property: Property) {
    if (!property._id || !this.currentUserEmail) {
      if (!this.currentUserEmail) this.router.navigate(['/signin']);
      return;
    }
    if (this.currentUserEmail === property.postedByEmail) {
      alert('You cannot chat about your own property.');
      return;
    }
    this.showChatPanel = true;
    this.loadChats(property);
  }

  signOut() {
    if (isPlatformBrowser(this.platformId)) {
      this.authService.signOut();
      this.notifications = [];
      this.showNotificationPanel = false;
      this.router.navigate(['/signin']);
    }
  }

  navigateToLandlord() {
    if (!this.currentUserEmail) {
      this.router.navigate(['/signin']);
      return;
    }
    this.router.navigate(['/landlord']);
  }

  navigateToMyProperties() {
    if (!this.currentUserEmail) {
      this.router.navigate(['/signin']);
      return;
    }
    this.router.navigate(['/my-properties']);
  }

  saveSearch() {
    if (!this.currentUserEmail) {
      this.router.navigate(['/signin']);
      return;
    }
    alert('Search saved!');
  }

  goToProfile() {
    if (!this.currentUserEmail) {
      this.router.navigate(['/signin']);
      return;
    }
    this.router.navigate(['/profile']);
  }

  toggleChatPanel() {
    if (!this.currentUserEmail) {
      this.router.navigate(['/signin']);
      return;
    }
    this.showChatPanel = !this.showChatPanel;
    if (this.showChatPanel) {
      this.loadChats();
    } else {
      if (this.selectedChat) {
        const lastMessage = this.selectedChat.messages.length > 0 ? this.selectedChat.messages[this.selectedChat.messages.length - 1] : null;
        if (lastMessage) {
          this.lastReadMessages[this.selectedChat._id] = lastMessage.createdAt;
          localStorage.setItem(`lastReadMessages_${this.currentUserEmail}`, JSON.stringify(this.lastReadMessages));
          this.updateUnreadMessagesCount();
        }
      }
    }
  }

  loadChats(propertyToSelect?: Property) {
    if (!this.currentUserEmail) {
      this.router.navigate(['/signin']);
      return;
    }
    this.http.get<Chat[]>(`http://localhost:3000/api/chats/${this.currentUserEmail}`).subscribe({
      next: (data) => {
        const uniqueChats: Chat[] = [];
        const seen = new Set();
        for (const chat of data) {
          const key = `${chat.propertyId}-${chat.participants.sort().join('-')}`;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueChats.push(chat);
          }
        }
        uniqueChats.sort((a, b) => {
          const latestA = a.messages.length > 0 ? new Date(a.messages[a.messages.length - 1].createdAt).getTime() : 0;
          const latestB = b.messages.length > 0 ? new Date(b.messages[b.messages.length - 1].createdAt).getTime() : 0;
          return latestB - latestA || (b._id ? new Date(b._id).getTime() : 0) - (a._id ? new Date(a._id).getTime() : 0);
        });

        const participantEmails = new Set<string>();
        uniqueChats.forEach(chat => {
          chat.participants.forEach(email => {
            if (email !== this.currentUserEmail) participantEmails.add(email);
          });
        });

        const userRequests = Array.from(participantEmails).map(email =>
          this.http.get<{ email: string; firstName: string; lastName: string; profileImage: string }>(`http://localhost:3000/api/auth/user/${email}`).toPromise()
        );

        Promise.all(userRequests).then(users => {
          const userMap: { [email: string]: User } = {};
          users.forEach(user => {
            if (user) {
              const firstName = user.firstName || '';
              const lastName = user.lastName || '';
              const username = (firstName || lastName) ? `${firstName} ${lastName}`.trim() : 'Unknown';
              userMap[user.email] = {
                email: user.email,
                username: username,
                profileImage: user.profileImage || 'https://via.placeholder.com/45'
              };
            }
          });

          this.chats = uniqueChats.map(chat => ({
            ...chat,
            participantsDetails: chat.participants.reduce((acc: { [email: string]: User }, email) => {
              acc[email] = userMap[email] || { email, username: 'Unknown', profileImage: 'https://via.placeholder.com/45' };
              return acc;
            }, {})
          }));

          this.updateUnreadMessagesCount();

          if (propertyToSelect) {
            const existingChat = this.chats.find(
              (chat) => chat.participants.includes(propertyToSelect.postedByEmail) && chat.propertyId === propertyToSelect._id
            );
            if (existingChat) this.selectChat(existingChat);
            else this.initiateChat(propertyToSelect);
          }
        }).catch(error => {
          console.error('Error fetching user details:', error);
          this.chats = uniqueChats.map(chat => ({
            ...chat,
            participantsDetails: chat.participants.reduce((acc: { [email: string]: User }, email) => {
              acc[email] = { email, username: 'Unknown', profileImage: 'https://via.placeholder.com/45' };
              return acc;
            }, {})
          }));
          this.updateUnreadMessagesCount();
        });
      },
      error: (error) => console.error('Error fetching chats:', error),
    });
  }

  getOtherParticipant(chat: Chat): string {
    const otherParticipantEmail = chat.participants.find((email: string) => email !== this.currentUserEmail);
    return (chat.participantsDetails && otherParticipantEmail && chat.participantsDetails[otherParticipantEmail])
      ? chat.participantsDetails[otherParticipantEmail].username || 'Unknown'
      : 'Unknown';
  }

  getOtherParticipantImage(chat: Chat): string {
    const otherParticipantEmail = chat.participants.find((email: string) => email !== this.currentUserEmail);
    return (chat.participantsDetails && otherParticipantEmail && chat.participantsDetails[otherParticipantEmail])
      ? chat.participantsDetails[otherParticipantEmail].profileImage || 'https://via.placeholder.com/45'
      : 'https://via.placeholder.com/45';
  }

  initiateChat(property: Property) {
    if (!this.currentUserEmail || !property.postedByEmail) return;
    const chatData = {
      participants: [this.currentUserEmail, property.postedByEmail],
      propertyId: property._id,
      messages: [],
      propertyDetails: {
        title: property.title,
        price: property.price,
        location: property.location,
        category: property.category,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        area: property.area,
        image: property.image || 'https://via.placeholder.com/300x200',
      },
    };
    this.http.post<any>('http://localhost:3000/api/chats', chatData).subscribe({
      next: (newChat) => {
        this.loadChats();
        this.selectChat(newChat);
      },
      error: (error) => console.error('Error initiating chat:', error),
    });
  }

  selectChat(chat: Chat) {
    this.selectedChat = { ...chat };
    if (this.selectedChat && !this.selectedChat.propertyDetails && this.selectedChat._id) {
      const property = this.properties.find((p) => p._id === this.selectedChat!.propertyId);
      if (property) {
        this.selectedChat.propertyDetails = {
          title: property.title,
          price: property.price,
          location: property.location,
          category: property.category,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          area: property.area,
          image: property.image || 'https://via.placeholder.com/300x200',
        };
      } else {
        this.http.get<any>(`http://localhost:3000/api/properties/${this.selectedChat.propertyId}`).subscribe({
          next: (propertyData) => {
            if (this.selectedChat) {
              this.selectedChat.propertyDetails = {
                title: propertyData.title,
                price: propertyData.price,
                location: propertyData.location,
                category: propertyData.category,
                bedrooms: propertyData.bedrooms,
                bathrooms: propertyData.bathrooms,
                area: propertyData.area,
                image: propertyData.image || 'https://via.placeholder.com/300x200',
              };
            }
          },
          error: (error) => console.error('Failed to load property details:', error),
        });
      }
    }
    this.loadMessages();
    if (this.selectedChat && this.selectedChat.messages.length > 0) {
      const lastMessage = this.selectedChat.messages[this.selectedChat.messages.length - 1];
      this.lastReadMessages[this.selectedChat._id] = lastMessage.createdAt;
      localStorage.setItem(`lastReadMessages_${this.currentUserEmail}`, JSON.stringify(this.lastReadMessages));
      this.updateUnreadMessagesCount();
    }
  }

  loadMessages() {
    if (!this.selectedChat || !this.selectedChat._id) return;
    this.http.get<any>(`http://localhost:3000/api/chats/${this.selectedChat._id}/messages`).subscribe({
      next: (data) => {
        if (this.selectedChat) {
          this.selectedChat.messages = data.messages || [];
          this.updateUnreadMessagesCount();
        }
      },
      error: (error) => console.error('Failed to load messages:', error),
    });
  }

  sendMessage() {
    if (!this.newMessage.trim() || !this.selectedChat || !this.selectedChat._id) return;
    const messageData = {
      sender: this.currentUserEmail,
      text: this.newMessage,
      createdAt: new Date().toISOString(),
    };
    this.http.post<any>(`http://localhost:3000/api/chats/${this.selectedChat._id}/message`, messageData).subscribe({
      next: (updatedChat) => {
        if (this.selectedChat) {
          this.selectedChat.messages = updatedChat.messages;
          this.lastReadMessages[this.selectedChat._id] = messageData.createdAt;
          localStorage.setItem(`lastReadMessages_${this.currentUserEmail}`, JSON.stringify(this.lastReadMessages));
          this.updateUnreadMessagesCount();
        }
        this.newMessage = '';
        const textarea = document.querySelector('textarea');
        if (textarea) textarea.style.height = 'auto';
      },
      error: (error) => console.error('Failed to send message:', error),
    });
  }

  autoResize(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  toggleFavorite(property: Property) {
    if (isPlatformBrowser(this.platformId)) {
      const propertyId = property._id;
      if (this.favorites.includes(propertyId)) {
        this.favorites = this.favorites.filter(id => id !== propertyId);
      } else {
        this.favorites.push(propertyId);
      }
      localStorage.setItem('favorites', JSON.stringify(this.favorites));
      property.isFavorite = !property.isFavorite;
      this.filterProperties();
    }
  }

  toggleCompare(property: Property) {
    const propertyId = property._id;
    const isInCompare = this.compareProperties.some(p => p._id === propertyId);

    if (isInCompare) {
      this.compareProperties = this.compareProperties.filter(p => p._id !== propertyId);
      if (this.compareProperties.length === 0) this.showComparePanel = false;
    } else {
      if (this.compareProperties.length >= 3) {
        alert('You can compare up to 3 properties at a time.');
        return;
      }
      this.compareProperties.push(property);
      this.showComparePanel = true;
    }
  }

  removeFromCompare(propertyId: string) {
    this.compareProperties = this.compareProperties.filter(p => p._id !== propertyId);
    if (this.compareProperties.length === 0) this.showComparePanel = false;
  }

  clearCompare() {
    this.compareProperties = [];
    this.showComparePanel = false;
  }

  isInCompare(propertyId: string): boolean {
    return this.compareProperties.some(p => p._id === propertyId);
  }

  toggleNotificationPanel() {
    if (!this.currentUserEmail) {
      this.router.navigate(['/signin']);
      return;
    }
    this.showNotificationPanel = !this.showNotificationPanel;
    if (!this.showNotificationPanel) {
      this.isBookingRequest = false;
      this.selectedPropertyId = null;
      this.selectedPropertyDetails = null;
      this.notifications.forEach(n => {
        if (!n.shown && !this.lastReadNotifications.includes(`${n.propertyId}-${n.createdAt}`)) {
          this.lastReadNotifications.push(`${n.propertyId}-${n.createdAt}`);
        }
      });
      localStorage.setItem(`lastReadNotifications_${this.currentUserEmail}`, JSON.stringify(this.lastReadNotifications));
      this.updateUnreadNotificationsCount();
    }
  }

  onNotificationSent(sent: boolean) {
    if (sent) {
      this.loadNotifications();
      this.loadProperties();
    }
    this.showNotificationPanel = false;
    this.isBookingRequest = false;
    this.selectedPropertyId = null;
    this.selectedPropertyDetails = null;
    this.notifications.forEach(n => {
      if (!n.shown && !this.lastReadNotifications.includes(`${n.propertyId}-${n.createdAt}`)) {
        this.lastReadNotifications.push(`${n.propertyId}-${n.createdAt}`);
      }
    });
    localStorage.setItem(`lastReadNotifications_${this.currentUserEmail}`, JSON.stringify(this.lastReadNotifications));
    this.updateUnreadNotificationsCount();
  }

  onOwnerAction(event: { notification: Notification; action: 'accept' | 'reject' }) {
    const { notification, action } = event;
    const index = this.notifications.findIndex(n => n.propertyId === notification.propertyId && n.userEmail === notification.userEmail && n.createdAt === notification.createdAt);
    if (index === -1) return;

    if (notification.responded) {
      console.log('Notification already responded to:', notification);
      return;
    }

    this.http.get<Property>(`http://localhost:3000/api/properties/${notification.propertyId}`).subscribe({
      next: (property) => {
        if (action === 'accept') {
          notification.status = 'accepted';
          notification.shown = false;
          notification.responded = true;

          this.http.post('http://localhost:3000/api/send-email', {
            to: notification.userEmail,
            subject: 'Booking Request Accepted - RealEstateHub',
            text: `Dear ${notification.userEmail.split('@')[0]}! Your booking request for property ${notification.propertyId} has been accepted.\n\n` +
                  `Property Details:\n` +
                  `- Title: ${property.title || 'N/A'}\n` +
                  `- Price: ₹${property.price || 'N/A'}\n` +
                  `- Location: ${property.location || 'N/A'}\n` +
                  `- Bedrooms: ${property.bedrooms || 'N/A'}\n` +
                  `- Bathrooms: ${property.bathrooms || 'N/A'}\n` +
                  `- Area: ${property.area || 'N/A'} m²\n` +
                  `- Owner: ${property.ownerName || 'Unknown'} (${property.postedByEmail || 'N/A'})\n\n` +
                  `Please proceed with the payment to confirm your booking.\n\nBest regards,\nRealEstateHub Team`
          }).subscribe(
            () => console.log('Booking accepted email sent to:', notification.userEmail),
            (error) => console.error('Failed to send booking accepted email to', notification.userEmail, ':', error.message)
          );

          this.http.put<Property>(`http://localhost:3000/api/properties/${notification.propertyId}`, {
            availability: 'pending',
            bookedByEmail: notification.userEmail
          }).subscribe(
            () => {
              console.log('Property marked as pending');
              this.rejectOtherRequests(notification.propertyId, notification.userEmail);
              this.sendBrochure(notification);
              this.loadProperties();
            },
            (error) => console.error('Failed to update property:', error)
          );
        } else {
          notification.status = 'rejected';
          notification.shown = false;
          notification.responded = true;
          this.http.post('http://localhost:3000/api/send-email', {
            to: notification.userEmail,
            subject: 'Booking Request Rejected - RealEstateHub',
            text: `Dear User,\n\nYour booking request for property (ID: ${notification.propertyId}) has been rejected.\n\nBest regards,\nRealEstateHub Team`
          }).subscribe(
            () => console.log('Rejection email sent to:', notification.userEmail),
            (error) => console.error('Failed to send rejection email to', notification.userEmail, ':', error.message)
          );
        }
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('notifications', JSON.stringify(this.notifications));
        }
        this.loadNotifications();
        if (notification.userEmail === this.currentUserEmail) {
          this.showNotificationPanel = true;
        }
      },
      error: (error) => {
        console.error('Failed to fetch property details for email:', error);
        notification.status = action === 'accept' ? 'accepted' : 'rejected';
        notification.shown = false;
        notification.responded = true;
        this.http.post('http://localhost:3000/api/send-email', {
          to: notification.userEmail,
          subject: action === 'accept' ? 'Booking Request Accepted - RealEstateHub' : 'Booking Request Rejected - RealEstateHub',
          text: `Dear ${notification.userEmail.split('@')[0]}! Your booking request for property ${notification.propertyId} has been ${action === 'accept' ? 'accepted' : 'rejected'}.\n\n` +
                (action === 'accept' ? 'Property details could not be retrieved at time.\nPlease proceed with the payment to confirm your booking.\n\n' : '') +
                `Best regards,\nRealEstateHub Team`
        }).subscribe(
          () => console.log(`${action} email sent (fallback) to:`, notification.userEmail),
          (err) => console.error(`Failed to send ${action} email (fallback) to`, notification.userEmail, ':', err.message)
        );
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('notifications', JSON.stringify(this.notifications));
        }
        this.loadNotifications();
        if (notification.userEmail === this.currentUserEmail) {
          this.showNotificationPanel = true;
        }
      }
    });
  }

  handlePayNow(notification: Notification) {
    if (!notification) {
      console.error('HomeComponent - handlePayNow: No notification provided for payment');
      alert('Unable to initiate payment. Notification data is missing.');
      return;
    }
    if (!this.currentUserEmail) {
      console.warn('HomeComponent - handlePayNow: User not logged in, redirecting to sign-in');
      this.router.navigate(['/signin']);
      return;
    }
    if (notification.recipientEmail !== this.currentUserEmail) {
      console.warn('HomeComponent - handlePayNow: Notification is not for the current user', {
        currentUser: this.currentUserEmail,
        notificationRecipient: notification.recipientEmail
      });
      alert('This notification is not for you.');
      return;
    }
    console.log('HomeComponent - handlePayNow: Pay Now event received for notification:', notification);
    this.payNow(notification);
  }

  rejectOtherRequests(propertyId: string, acceptedUserEmail: string) {
    const otherNotifications = this.notifications.filter(n => n.propertyId === propertyId && n.userEmail !== acceptedUserEmail && n.status === 'pending' && !n.responded);
    otherNotifications.forEach(n => {
      n.status = 'rejected';
      n.shown = false;
      n.responded = true;
      this.http.post('http://localhost:3000/api/send-email', {
        to: n.userEmail,
        subject: 'Booking Request Rejected - RealEstateHub',
        text: `Dear User,\n\nYour booking request for property (ID: ${propertyId}) has been rejected as another request was accepted.\n\nBest regards,\nRealEstateHub Team`
      }).subscribe(
        () => console.log('Other request rejection email sent to:', n.userEmail),
        (error) => console.error('Failed to send other rejection email to', n.userEmail, ':', error.message)
      );
    });
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('notifications', JSON.stringify(this.notifications));
    }
    this.loadNotifications();
    if (otherNotifications.some(n => n.userEmail === this.currentUserEmail)) {
      this.showNotificationPanel = true;
    }
  }

  sendBrochure(notification: Notification) {
    let property = this.properties.find(p => p._id === notification.propertyId);
    if (!property) {
      this.http.get<Property>(`http://localhost:3000/api/properties/${notification.propertyId}`).subscribe({
        next: (propertyData) => {
          property = propertyData;
          this.sendBrochureEmail(notification, property);
          this.loadProperties();
        },
        error: (error) => {
          console.error('Failed to fetch property for brochure:', error);
          const fallbackBrochure = `No property details available for ID: ${notification.propertyId}`;
          notification.brochure = fallbackBrochure;
          this.http.post('http://localhost:3000/api/send-email', {
            to: notification.userEmail,
            subject: 'Property Brochure - RealEstateHub',
            text: `Dear User,\n\nYour booking for property (ID: ${notification.propertyId}) has been accepted. Please find the brochure below:\n\n${fallbackBrochure}\n\nBest regards,\nRealEstateHub Team`
          }).subscribe(
            () => console.log('Fallback brochure email sent to:', notification.userEmail),
            (error) => console.error('Failed to send fallback brochure email to', notification.userEmail, ':', error.message)
          );
          if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('notifications', JSON.stringify(this.notifications));
          }
          this.loadNotifications();
        }
      });
    } else {
      this.sendBrochureEmail(notification, property);
    }
  }

  sendBrochureEmail(notification: Notification, property: Property) {
    const brochure = `
      **Property Brochure - RealEstateHub**
      - **Title**: ${property.title || 'Unknown'}
      - **Price**: ₹${property.price || 'N/A'}
      - **Location**: ${property.location || 'Unknown'}
      - **Bedrooms**: ${property.bedrooms || 'N/A'}
      - **Bathrooms**: ${property.bathrooms || 'N/A'}
      - **Area**: ${property.area || 'N/A'} m²
      - **Image**: ${property.image || 'https://via.placeholder.com/300x200'}
      - **Owner**: ${property.ownerName || 'Unknown'} (${property.postedByEmail || 'N/A'})
    `;
    notification.brochure = brochure;

    this.http.post('http://localhost:3000/api/send-email', {
      to: notification.userEmail,
      subject: 'Property Brochure - RealEstateHub',
      text: `Dear User,\n\nYour booking for "${property.title || 'property'}" (ID: ${property._id}) has been accepted. Please find the brochure below:\n\n${brochure}\n\nBest regards,\nRealEstateHub Team`
    }).subscribe(
      () => console.log('Brochure email sent to:', notification.userEmail),
      (error) => console.error('Failed to send brochure email to', notification.userEmail, ':', error.message)
    );
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('notifications', JSON.stringify(this.notifications));
    }
    this.loadNotifications();
  }

  viewBrochure(notification: Notification) {
    if (!this.currentUserEmail) {
      this.router.navigate(['/signin']);
      return;
    }
    if (notification.recipientEmail !== this.currentUserEmail) {
      console.warn('HomeComponent - viewBrochure: Notification is not for the current user', {
        currentUser: this.currentUserEmail,
        notificationRecipient: notification.recipientEmail
      });
      alert('This notification is not for you.');
      return;
    }
    this.currentNotification = notification;
    this.brochureContent = notification.brochure || 'No brochure available.';
    this.showBrochurePopup = true;
    notification.shown = true;
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('notifications', JSON.stringify(this.notifications));
    }
    this.updateUnreadNotificationsCount();
  }

  payNow(notification: Notification) {
    if (!this.currentUserEmail) {
      console.warn('HomeComponent - payNow: User not logged in, redirecting to sign-in');
      this.router.navigate(['/signin']);
      return;
    }

    if (notification.recipientEmail !== this.currentUserEmail) {
      console.warn('HomeComponent - payNow: Notification is not for the current user', {
        currentUser: this.currentUserEmail,
        notificationRecipient: notification.recipientEmail
      });
      alert('This notification is not for you.');
      return;
    }

    console.log('HomeComponent - payNow: Processing payment for notification:', notification);

    let property = this.properties.find(p => p._id === notification.propertyId);

    if (property && property.price) {
      console.log('HomeComponent - payNow: Property found in local state:', property);
      this.router.navigate(['/payment'], {
        queryParams: {
          propertyId: notification.propertyId,
          userEmail: this.currentUserEmail,
          amount: property.price,
          title: property.title || 'Unknown',
          location: property.location || 'N/A',
          bedrooms: property.bedrooms || 'N/A',
          bathrooms: property.bathrooms || 'N/A',
          area: property.area || 0,
          ownerName: property.ownerName || 'Unknown',
          ownerEmail: property.postedByEmail || 'N/A'
        }
      });
    } else {
      console.log('HomeComponent - payNow: Property not found in local state, fetching from API');
      this.http.get<Property>(`http://localhost:3000/api/properties/${notification.propertyId}`).subscribe({
        next: (propertyData) => {
          if (!propertyData || !propertyData.price) {
            console.error('HomeComponent - payNow: Property details not found or invalid:', propertyData);
            alert('Property details not found or invalid. Please try again later.');
            this.loadProperties();
            return;
          }
          console.log('HomeComponent - payNow: Property fetched from API:', propertyData);
          this.router.navigate(['/payment'], {
            queryParams: {
              propertyId: notification.propertyId,
              userEmail: this.currentUserEmail,
              amount: propertyData.price,
              title: propertyData.title || 'Unknown',
              location: propertyData.location || 'N/A',
              bedrooms: propertyData.bedrooms || 'N/A',
              bathrooms: propertyData.bathrooms || 'N/A',
              area: propertyData.area || 0,
              ownerName: propertyData.ownerName || 'Unknown',
              ownerEmail: propertyData.postedByEmail || 'N/A'
            }
          });
        },
        error: (error) => {
          console.error('HomeComponent - payNow: Failed to fetch property for payment:', error);
          alert('Failed to retrieve property details. Please try again later.');
          this.loadProperties();
        }
      });
    }
  }

  onPaymentCompleted(propertyId: string) {
    if (!this.currentUserEmail) {
      console.warn('HomeComponent - onPaymentCompleted: No current user email, redirecting to sign-in');
      this.router.navigate(['/signin']);
      return;
    }

    this.http.get<Property>(`http://localhost:3000/api/properties/${propertyId}`).subscribe({
      next: (property) => {
        if (!property) {
          console.error('Property not found:', propertyId);
          alert('Property not found. Please try again later.');
          return;
        }

        this.http.put<Property>(`http://localhost:3000/api/properties/${propertyId}`, {
          availability: 'booked',
          status: 'booked',
          bookedByEmail: this.currentUserEmail!,
          isResidential: true
        }).subscribe({
          next: (updatedProperty: Property) => {
            console.log('Property availability and status updated to booked:', updatedProperty);

            const propertyIndex = this.properties.findIndex(p => p._id === propertyId);
            if (propertyIndex !== -1) {
              this.properties[propertyIndex] = {
                ...this.properties[propertyIndex],
                availability: 'booked',
                status: 'booked',
                bookedByEmail: this.currentUserEmail,
                isResidential: true
              };
            }
            this.filterProperties();

            this.http.post('http://localhost:3000/api/send-email', {
              to: this.currentUserEmail,
              subject: 'Payment Success - RealEstateHub',
              text: `Dear User,\n\nYour payment of ₹${property.price} for "${property.title}" (ID: ${propertyId}) has been successfully processed. The property is now yours!\n\nBest regards,\nRealEstateHub Team`
            }).subscribe({
              next: () => console.log('Payment success email sent to:', this.currentUserEmail),
              error: (error) => console.error('Failed to send payment success email to', this.currentUserEmail, ':', error.message)
            });

            this.notifications = this.notifications.map(n => {
              if (n.propertyId === propertyId && n.status === 'accepted') {
                return { ...n, paymentCompleted: true, shown: false };
              }
              return n;
            });
            if (isPlatformBrowser(this.platformId)) {
              localStorage.setItem('notifications', JSON.stringify(this.notifications));
            }

            this.addToMyProperties(property);
          },
          error: (error) => {
            console.error('Failed to update property availability and status:', error);
            alert('Failed to update property status. Please try again later.');
          }
        });
      },
      error: (error) => {
        console.error('Failed to fetch property:', error);
        alert('Failed to retrieve property details. Please try again later.');
      }
    });

    this.showBrochurePopup = false;
    this.currentNotification = null;
    this.loadNotifications();
    const event = new CustomEvent('paymentCompleted', { detail: { propertyId } });
    window.dispatchEvent(event);
  }

  addToMyProperties(property: Property) {
    if (!this.currentUserEmail || !isPlatformBrowser(this.platformId)) return;

    const myProperties = JSON.parse(localStorage.getItem('myProperties') || '[]');
    const propertyWithResidential = {
      ...property,
      isResidential: true,
      bookedByEmail: this.currentUserEmail,
      availability: 'booked',
      status: 'booked'
    };

    const existingPropertyIndex = myProperties.findIndex((p: any) => p._id === property._id);
    if (existingPropertyIndex === -1) {
      myProperties.push(propertyWithResidential);
    } else {
      myProperties[existingPropertyIndex] = propertyWithResidential;
    }
    localStorage.setItem('myProperties', JSON.stringify(myProperties));
    console.log('Property added/updated in myProperties:', propertyWithResidential);

    this.loadProperties();
  }

  verifyProperty(property: Property) {
    if (!property._id) return;
    if (isPlatformBrowser(this.platformId)) {
      // Copy property ID to clipboard
      navigator.clipboard.writeText(property._id).then(() => {
        console.log('Property ID copied to clipboard:', property._id);
        // Show the alert
        this.showVerifyAlert = true;
        // Redirect after a delay to allow the user to see the alert
        setTimeout(() => {
          this.showVerifyAlert = false;
          window.open('https://eservices.tn.gov.in/eservicesnew/home.html', '_blank');
        }, 3000); // 2 seconds delay
      }).catch(err => {
        console.error('Failed to copy property ID to clipboard:', err);
        alert('Failed to copy Property ID. Please copy it manually: ' + property._id);
      });
    }
  }
}