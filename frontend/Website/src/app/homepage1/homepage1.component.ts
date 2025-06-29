import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { trigger, style, animate, transition } from '@angular/animations';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { interval, Subscription } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

interface Chat {
  _id: string;
  participants: string[];
  propertyId: string;
  messages: { sender: string; text: string; createdAt: Date; read?: boolean }[];
  propertyDetails?: Property;
  participantsDetails?: { [email: string]: { email: string; username: string; profileImage: string } };
  unreadMessages?: number;
}

interface Property {
  _id: string;
  title: string;
  price: number;
  location: string;
  category: string;
  image: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  availability?: 'available' | 'booked';
  postedByEmail: string;
  ownerName?: string;
  ownerPhone?: string;
}

interface Notification {
  message: string;
  createdAt: Date;
  type?: string;
  propertyId?: string;
  userEmail?: string;
  recipientEmail?: string;
  status?: 'pending' | 'accepted' | 'rejected';
  shown?: boolean;
}

@Component({
  selector: 'app-homepage1',
  templateUrl: './homepage1.component.html',
  styleUrls: ['./homepage1.component.css'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('600ms ease-in', style({ opacity: 1 }))
      ])
    ]),
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateY(50px)', opacity: 0 }),
        animate('800ms ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
      ])
    ])
  ],
  standalone: true,
  imports: [FormsModule, CommonModule, ReactiveFormsModule]
})
export class Homepage1Component implements OnInit, OnDestroy {
  currentUserEmail: string | null = null;
  showChatPanel: boolean = false;
  showNotificationPanel: boolean = false;
  showComparePanel: boolean = false;
  showBookingPopup: boolean = false;
  chats: Chat[] = [];
  selectedChat: Chat | null = null;
  newMessage: string = '';
  notifications: Notification[] = [];
  searchQuery: string = '';
  filters = {
    propertyType: '',
    minPrice: 0,
    maxPrice: Infinity
  };
  propertyTypes: string[] = ['Flat', 'House', 'Villa', 'Apartment'];
  priceRanges: { label: string; min: number; max: number }[] = [
    { label: 'Any', min: 0, max: Infinity },
    { label: '0 - 500,000', min: 0, max: 500000 },
    { label: '500,000 - 1,000,000', min: 500000, max: 1000000 },
    { label: '1,000,000 - 5,000,000', min: 1000000, max: 5000000 },
    { label: '5,000,000+', min: 5000000, max: Infinity }
  ];
  properties: Property[] = [];
  filteredProperties: Property[] = [];
  favoriteProperties: Property[] = [];
  compareProperties: Property[] = [];
  selectedProperty: Property | null = null;
  unreadNotificationsCount: number = 0;
  newMessagesCount: number = 0;
  private pollingSubscription: Subscription | null = null;
  private favorites: string[] = [];
  private lastReadNotifications: string[] = [];

  // Contact Form Properties
  contactForm: FormGroup;
  isSubmitting: boolean = false;
  submitMessage: string = '';
  submitSuccess: boolean = false;

  constructor(
    private router: Router,
    private http: HttpClient,
    private fb: FormBuilder,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Initialize the contact form with validation
    this.contactForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      message: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.currentUserEmail = localStorage.getItem('currentUserEmail');
      this.lastReadNotifications = JSON.parse(localStorage.getItem(`lastReadNotifications_${this.currentUserEmail}`) || '[]');
    }

    if (!this.currentUserEmail) {
      this.router.navigate(['/signin']);
      return;
    }

    this.loadProperties();
    this.loadChats();
    this.loadNotifications();
    this.startPolling();
  }

  ngOnDestroy(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
  }

  private loadFavorites(): void {
    if (isPlatformBrowser(this.platformId)) {
      const storedFavorites = localStorage.getItem('favorites');
      this.favorites = storedFavorites ? JSON.parse(storedFavorites) : [];
      console.log('Loaded favorites:', this.favorites);
    }
  }

  private saveFavorites(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('favorites', JSON.stringify(this.favorites));
      console.log('Saved favorites:', this.favorites);
    }
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  navigateToProfile(): void {
    this.router.navigate(['/profile']);
  }

  goToMyProperties(): void {
    this.router.navigate(['/my-properties']);
  }

  signOut(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('currentUserEmail');
      localStorage.removeItem('currentUserPhone');
      localStorage.removeItem('favorites');
      this.notifications = [];
      this.showNotificationPanel = false;
    }
    this.currentUserEmail = null;
    this.favorites = [];
    this.favoriteProperties = [];
    this.router.navigate(['/signin']);
  }

  toggleChatPanel(): void {
    this.showChatPanel = !this.showChatPanel;
    if (this.showChatPanel) {
      this.newMessagesCount = 0;
      this.loadChats();
    } else {
      this.selectedChat = null;
    }
  }

  toggleNotificationPanel(): void {
    this.showNotificationPanel = !this.showNotificationPanel;
    if (!this.showNotificationPanel) {
      this.notifications.forEach(n => {
        if (!n.shown && !this.lastReadNotifications.includes(`${n.propertyId}-${n.createdAt}`)) {
          this.lastReadNotifications.push(`${n.propertyId}-${n.createdAt}`);
        }
      });
      localStorage.setItem(`lastReadNotifications_${this.currentUserEmail}`, JSON.stringify(this.lastReadNotifications));
      this.updateUnreadNotificationsCount();
    }
  }

  loadProperties(): void {
    this.http.get<Property[]>('http://localhost:3000/api/properties').subscribe({
      next: (data) => {
        this.properties = data.map(property => ({
          ...property,
          availability: property.availability || 'available'
        }));
        this.filteredProperties = [...this.properties];
        console.log('Loaded properties:', this.properties.map(p => p._id));
        this.loadFavorites();
        this.updateFavoriteProperties();
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error fetching properties:', error);
        this.addNotification(`Failed to load properties: ${error.message}`, 'error');
      }
    });
  }

  loadChats(propertyToSelect?: Property): void {
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
            if (email !== this.currentUserEmail) {
              participantEmails.add(email);
            }
          });
        });

        const userRequests = Array.from(participantEmails).map(email =>
          this.http.get<{ email: string; firstName: string; lastName: string; profileImage: string }>(`http://localhost:3000/api/auth/user/${email}`).toPromise()
        );

        Promise.all(userRequests).then(users => {
          const userMap: { [email: string]: { email: string; username: string; profileImage: string } } = {};
          users.forEach(user => {
            if (user) {
              const username = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown';
              userMap[user.email] = { email: user.email, username, profileImage: user.profileImage || 'https://via.placeholder.com/45' };
            }
          });

          this.chats = uniqueChats.map(chat => ({
            ...chat,
            participantsDetails: chat.participants.reduce((acc: { [email: string]: { email: string; username: string; profileImage: string } }, email) => {
              acc[email] = userMap[email] || { email, username: 'Unknown', profileImage: 'https://via.placeholder.com/45' };
              return acc;
            }, {}),
            unreadMessages: chat.messages.filter(m => m.sender !== this.currentUserEmail && !m.read).length
          }));

          this.newMessagesCount = this.chats.reduce((sum, chat) => sum + (chat.unreadMessages || 0), 0);
          if (propertyToSelect) {
            const existingChat = this.chats.find(
              chat => chat.participants.includes(propertyToSelect.postedByEmail) && chat.propertyId === propertyToSelect._id
            );
            if (existingChat) {
              this.selectChat(existingChat);
            } else {
              this.initiateChat(propertyToSelect);
            }
          }
        }).catch(error => {
          console.error('Error fetching user details:', error);
          this.addNotification('Failed to load user details for chats', 'error');
        });
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error fetching chats:', error);
        this.addNotification(`Failed to load chats: ${error.message}`, 'error');
      }
    });
  }

  isBookingAccepted(property: Property): boolean {
    if (!property || !this.notifications) return false;
    return this.notifications.some(n =>
      n.message.includes('accepted') && n.message.includes(property.title) && n.message.includes(this.currentUserEmail!)
    );
  }

  initiateChat(property: Property): void {
    const participants = [this.currentUserEmail!, property.postedByEmail];
    const newChat = { participants, propertyId: property._id };
    this.http.post<Chat>('http://localhost:3000/api/chats', newChat).subscribe({
      next: (chat) => {
        this.http.get<Property>(`http://localhost:3000/api/properties/${property._id}`).subscribe({
          next: (propertyDetails) => {
            chat.propertyDetails = propertyDetails;
            this.chats.push(chat);
            this.selectChat(chat);
            this.addNotification('Chat initiated successfully', 'success');
          },
          error: (error: HttpErrorResponse) => {
            console.error('Error fetching property details:', error);
            this.addNotification(`Failed to load property details: ${error.message}`, 'error');
          }
        });
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error initiating chat:', error);
        this.addNotification(`Failed to initiate chat: ${error.message}`, 'error');
      }
    });
  }

  selectChat(chat: Chat): void {
    this.selectedChat = chat;
    if (!chat.propertyDetails) {
      this.http.get<Property>(`http://localhost:3000/api/properties/${chat.propertyId}`).subscribe({
        next: (propertyDetails) => {
          chat.propertyDetails = propertyDetails;
          this.markMessagesAsRead(chat);
        },
        error: (error: HttpErrorResponse) => {
          console.error('Error fetching property details:', error);
          this.addNotification(`Failed to load property details: ${error.message}`, 'error');
        }
      });
    } else {
      this.markMessagesAsRead(chat);
    }
  }

  private markMessagesAsRead(chat: Chat): void {
    chat.unreadMessages = 0;
    this.newMessagesCount = this.chats.reduce((sum, c) => sum + (c.unreadMessages || 0), 0);
    this.http.put(`http://localhost:3000/api/chats/${chat._id}/messages/read`, { userEmail: this.currentUserEmail }).subscribe({
      next: () => console.log('Messages marked as read'),
      error: (error: HttpErrorResponse) => console.error('Error marking messages as read:', error)
    });
  }

  deleteChat(chatId: string): void {
    if (confirm('Are you sure you want to delete this chat?')) {
      this.http.delete(`http://localhost:3000/api/chats/${chatId}`).subscribe({
        next: () => {
          this.chats = this.chats.filter(chat => chat._id !== chatId);
          if (this.selectedChat?._id === chatId) {
            this.selectedChat = null;
          }
          this.addNotification('Chat deleted successfully', 'success');
        },
        error: (error: HttpErrorResponse) => {
          console.error('Error deleting chat:', error);
          this.addNotification(`Failed to delete chat: ${error.message}`, 'error');
        }
      });
    }
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || !this.selectedChat) return;
    const message = {
      sender: this.currentUserEmail!,
      text: this.newMessage,
      createdAt: new Date()
    };
    this.http.post<Chat>(`http://localhost:3000/api/chats/${this.selectedChat._id}/message`, message).subscribe({
      next: (updatedChat) => {
        this.selectedChat = updatedChat;
        const chatIndex = this.chats.findIndex(chat => chat._id === updatedChat._id);
        if (chatIndex !== -1) {
          this.chats[chatIndex] = updatedChat;
        }
        this.newMessage = '';
        this.addNotification('Message sent', 'success');
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error sending message:', error);
        this.addNotification(`Failed to send message: ${error.message}`, 'error');
      }
    });
  }

  getOtherParticipant(chat: Chat): string {
    const otherParticipantEmail = chat.participants.find(email => email !== this.currentUserEmail);
    if (!otherParticipantEmail || !chat.participantsDetails || !chat.participantsDetails[otherParticipantEmail]) {
      return 'Unknown';
    }
    return chat.participantsDetails[otherParticipantEmail].username || 'Unknown';
  }

  updateFilters(): void {
    const range = this.priceRanges.find(r => r.min === Number(this.filters.minPrice));
    this.filters.maxPrice = range?.max || Infinity;
    this.filterProperties();
  }

  getAvatarGradient(chat: Chat): string {
    const otherParticipantEmail = chat.participants.find(email => email !== this.currentUserEmail);
    if (!otherParticipantEmail || !chat.participantsDetails || !chat.participantsDetails[otherParticipantEmail]) {
      return `url('https://via.placeholder.com/45')`;
    }
    const image = chat.participantsDetails[otherParticipantEmail].profileImage || 'https://via.placeholder.com/45';
    return `url('${image}')`;
  }

  autoResize(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  loadNotifications(): void {
    if (isPlatformBrowser(this.platformId)) {
      if (!this.currentUserEmail) {
        console.warn('Homepage1Component - loadNotifications - No current user email, skipping notification load');
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

      if (!this.notifications.some(n => n.type === 'welcome')) {
        this.notifications.unshift({ message: 'Welcome to RealEstateHub!', createdAt: new Date(), type: 'welcome' });
      }

      console.log('Homepage1Component - loadNotifications - Loaded notifications for user', this.currentUserEmail, ':', this.notifications);

      this.updateUnreadNotificationsCount();
    }
  }

  updateUnreadNotificationsCount(): void {
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

  addNotification(message: string, type: string = 'info', propertyId?: string, status?: 'pending' | 'accepted' | 'rejected'): void {
    const notification: Notification = { 
      message, 
      createdAt: new Date(), 
      type, 
      propertyId, 
      userEmail: this.currentUserEmail || undefined, 
      recipientEmail: this.currentUserEmail || undefined, 
      status, 
      shown: false 
    };
    this.notifications.push(notification);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('notifications', JSON.stringify(this.notifications));
    }
    this.loadNotifications();
  }

  filterProperties(): void {
    this.filteredProperties = this.properties.filter(property => {
      const matchesSearch = this.searchQuery
        ? property.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
          property.location.toLowerCase().includes(this.searchQuery.toLowerCase())
        : true;
      const matchesType = !this.filters.propertyType || property.category === this.filters.propertyType;
      const matchesPrice = property.price >= Number(this.filters.minPrice) && (this.filters.maxPrice === Infinity || property.price <= this.filters.maxPrice);
      return matchesSearch && matchesType && matchesPrice;
    });
    this.updateFavoriteProperties();
  }

  private updateFavoriteProperties(): void {
    this.favoriteProperties = this.filteredProperties.filter(property => this.favorites.includes(property._id));
    console.log('Favorite properties:', this.favoriteProperties);
  }

  onImageError(event: Event, item: any): void {
    (event.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200';
  }

  toggleFavorite(property: Property): void {
    const index = this.favorites.indexOf(property._id);
    if (index === -1) {
      this.favorites.push(property._id);
      this.addNotification(`${property.title} added to favorites`, 'info');
    } else {
      this.favorites.splice(index, 1);
      this.addNotification(`${property.title} removed from favorites`, 'info');
    }
    this.saveFavorites();
    this.updateFavoriteProperties();
  }

  isFavorited(propertyId: string): boolean {
    return this.favorites.includes(propertyId);
  }

  toggleCompare(property: Property): void {
    const index = this.compareProperties.findIndex(p => p._id === property._id);
    if (index === -1) {
      if (this.compareProperties.length < 3) {
        this.compareProperties.push(property);
        this.showComparePanel = true;
        this.addNotification(`${property.title} added to compare`, 'info');
      } else {
        this.addNotification('You can only compare up to 3 properties', 'error');
      }
    } else {
      this.compareProperties.splice(index, 1);
      this.addNotification(`${property.title} removed from compare`, 'info');
      if (this.compareProperties.length === 0) {
        this.showComparePanel = false;
      }
    }
  }

  removeFromCompare(propertyId: string): void {
    const property = this.compareProperties.find(p => p._id === propertyId);
    this.compareProperties = this.compareProperties.filter(p => p._id !== propertyId);
    if (this.compareProperties.length === 0) {
      this.showComparePanel = false;
    }
    this.addNotification(`${property?.title} removed from compare`, 'info');
  }

  clearCompare(): void {
    this.compareProperties = [];
    this.showComparePanel = false;
    this.addNotification('Compare list cleared', 'info');
  }

  isInCompare(propertyId: string): boolean {
    return this.compareProperties.some(p => p._id === propertyId);
  }

  bookNow(property: Property): void {
    this.selectedProperty = property;
    this.showBookingPopup = true;
    this.addNotification(`Booking requested for ${property.title}`, 'info', property._id, 'pending');
    this.loadChats(property);
  }

  confirmBooking(): void {
    if (this.selectedProperty) {
      this.http.put(`http://localhost:3000/api/properties/${this.selectedProperty._id}/request-booking`, { userEmail: this.currentUserEmail }).subscribe({
        next: () => {
          this.addNotification(`Booking confirmed for ${this.selectedProperty!.title}! Waiting for landlord acceptance.`, 'booking', this.selectedProperty!._id, 'pending');
          this.showBookingPopup = false;
          this.selectedProperty = null;
          this.simulateLandlordAcceptance();
        },
        error: (error: HttpErrorResponse) => {
          console.error('Error sending booking request:', error);
          this.addNotification(`Failed to confirm booking: ${error.message}`, 'error');
        }
      });
    }
  }

  cancelBooking(): void {
    this.showBookingPopup = false;
    this.selectedProperty = null;
    this.addNotification('Booking cancelled', 'info');
  }

  payNow(property: Property): void {
    this.selectedProperty = property;
    this.router.navigate(['/payment'], { queryParams: { amount: property.price, propertyId: property._id, userEmail: this.currentUserEmail } });
  }

  private startPolling(): void {
    this.pollingSubscription = interval(5000).subscribe(() => {
      this.checkNewNotifications();
      this.checkNewMessages();
    });
  }

  private checkNewNotifications(): void {
    this.loadNotifications();
  }

  private checkNewMessages(): void {
    this.http.get<Chat[]>(`http://localhost:3000/api/chats/${this.currentUserEmail}`).subscribe({
      next: (data) => {
        data.forEach(updatedChat => {
          const existingChat = this.chats.find(c => c._id === updatedChat._id);
          if (existingChat) {
            const newMessages = updatedChat.messages.filter(m => !existingChat.messages.some(em => em.createdAt === m.createdAt && em.text === m.text));
            if (newMessages.length > 0) {
              existingChat.messages.push(...newMessages);
              existingChat.unreadMessages = (existingChat.unreadMessages || 0) + newMessages.filter(m => m.sender !== this.currentUserEmail && !m.read).length;
            }
          } else {
            this.loadChats();
          }
        });
        this.newMessagesCount = this.chats.reduce((sum, chat) => sum + (chat.unreadMessages || 0), 0);
      },
      error: (error: HttpErrorResponse) => console.error('Error checking new messages:', error)
    });
  }

  private simulateLandlordAcceptance(): void {
    setTimeout(() => {
      const pendingBooking = this.notifications.find(n => n.message.includes('Booking confirmed') && !n.message.includes('accepted'));
      if (pendingBooking) {
        const propertyTitle = pendingBooking.message.match(/Booking confirmed for (.+)!/)?.[1];
        if (propertyTitle) {
          this.selectedProperty = this.properties.find(p => p.title === propertyTitle) || null;
          this.addNotification(`Booking accepted for ${propertyTitle}!`, 'booking', pendingBooking.propertyId, 'accepted');
          this.sendBrochureNotification(propertyTitle);
          this.loadProperties();
        }
      }
    }, 10000);
  }

  private sendBrochureNotification(propertyTitle: string): void {
    const property = this.properties.find(p => p.title === propertyTitle);
    if (property) {
      const brochureMessage = `🎉 Your booking for ${propertyTitle} has been accepted! Here's your property brochure:\n` +
                             `📍 Location: ${property.location}\n` +
                             `💰 Price: ₹${property.price}\n` +
                             `🏠 Type: ${property.category}\n` +
                             `🛏️ Bedrooms: ${property.bedrooms}\n` +
                             `🛁 Bathrooms: ${property.bathrooms}\n` +
                             `📐 Area: ${property.area} m²\n` +
                             `Please proceed with the payment to finalize your booking.`;
      this.addNotification(brochureMessage, 'booking', property._id, 'accepted');
    }
  }

  // Send Contact Message to Backend
  sendContactMessage(): void {
    if (this.contactForm.invalid) return;

    this.isSubmitting = true;
    this.submitMessage = '';
    this.submitSuccess = false;

    const formData = this.contactForm.value;
    this.http.post<{ message: string }>('http://localhost:3000/api/contact', formData).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        this.submitSuccess = true;
        this.submitMessage = response.message;
        this.contactForm.reset();
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting = false;
        this.submitSuccess = false;
        this.submitMessage = error.error.message || 'Failed to send message';
        console.error('Error sending contact message:', error);
      }
    });
  }
}