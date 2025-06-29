import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Added for ngModel
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit {
onKeydown($event: KeyboardEvent,_t10: any) {
throw new Error('Method not implemented.');
}
  currentUserEmail: string | null = localStorage.getItem('currentUserEmail');
  propertyId: string | null = null;
  propertyAgent: { name: string | null; email: string | null } = { name: null, email: null };
  chats: any[] = [];
  selectedChat: any | null = null;
  newMessage: string = '';
  error: string | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly http: HttpClient,
    private readonly router: Router
  ) {}

  ngOnInit() {
    if (!this.currentUserEmail) {
      this.error = 'Please sign in to chat.';
      this.router.navigate(['/signin']);
      return;
    }

    this.propertyId = this.route.snapshot.paramMap.get('id');
    if (!this.propertyId) {
      this.error = 'Invalid property ID.';
      return;
    }

    this.loadPropertyDetails();
    this.loadChats();
  }

  loadPropertyDetails() {
    this.http.get<any>(`http://localhost:3000/api/properties/${this.propertyId}`).subscribe({
      next: (data) => {
        this.propertyAgent = {
          name: data.postedBy ?? 'Unknown',
          email: data.postedByEmail ?? null
        };
        this.checkOrInitiateChat();
      },
      error: (error) => {
        console.error('Failed to load property details:', error);
        this.error = 'Failed to load property details.';
        this.propertyAgent = { name: 'Unknown', email: null };
      }
    });
  }

  loadChats() {
    this.http.get<any[]>(`http://localhost:3000/api/chats/${this.currentUserEmail}`).subscribe({
      next: (data) => {
        const uniqueChats = [];
        const seen = new Set();
        for (const chat of data) {
          const key = `${chat.propertyId}-${chat.participants.sort().join('-')}`;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueChats.push(chat);
          }
        }
        this.chats = uniqueChats;
        if (this.propertyAgent.email) {
          this.checkOrInitiateChat();
        }
      },
      error: (error) => {
        console.error('Failed to load chats:', error);
        this.error = 'Failed to load chats.';
        this.chats = [];
      }
    });
  }

  checkOrInitiateChat() {
    if (!this.propertyAgent.email) {
      this.error = 'Property agent email not found.';
      return;
    }

    const existingChat = this.chats.find(chat =>
      chat.participants.includes(this.propertyAgent.email) && chat.propertyId === this.propertyId
    );

    if (existingChat) {
      this.selectChat(existingChat);
    } else {
      this.initiateChat();
    }
  }

  initiateChat() {
    if (!this.propertyAgent.email || !this.currentUserEmail) {
      this.error = 'Cannot initiate chat: Missing user or agent email.';
      return;
    }

    const chatData = {
      participants: [this.currentUserEmail, this.propertyAgent.email],
      propertyId: this.propertyId,
      messages: []
    };

    this.http.post<any>('http://localhost:3000/api/chats', chatData).subscribe({
      next: (newChat) => {
        this.loadChats();
        this.selectChat(newChat);
      },
      error: (error) => {
        console.error('Failed to initiate chat:', error);
        this.error = 'Failed to initiate chat.';
      }
    });
  }

  selectChat(chat: any) {
    this.selectedChat = { ...chat };
    this.loadMessages();
  }

  loadMessages() {
    if (!this.selectedChat?._id) return;
    this.http.get<any>(`http://localhost:3000/api/chats/${this.selectedChat._id}/messages`).subscribe({
      next: (data) => {
        this.selectedChat.messages = data.messages || [];
      },
      error: (error) => {
        console.error('Failed to load messages:', error);
        this.error = 'Failed to load messages.';
        this.selectedChat.messages = [];
      }
    });
  }

  sendMessage() {
    if (!this.newMessage.trim() || !this.selectedChat?._id) return;

    const messageData = {
      sender: this.currentUserEmail,
      text: this.newMessage,
      createdAt: new Date().toISOString()
    };

    this.http.post<any>(`http://localhost:3000/api/chats/${this.selectedChat._id}/message`, messageData).subscribe({
      next: (updatedChat) => {
        this.selectedChat.messages = updatedChat.messages;
        this.newMessage = '';
        const textarea = document.querySelector('textarea');
        if (textarea) textarea.style.height = 'auto';
      },
      error: (error) => {
        console.error('Failed to send message:', error);
        this.error = 'Failed to send message.';
      }
    });
  }

  getOtherParticipant(chat: any): string {
    const otherParticipantEmail = chat.participants.find((email: string) => email !== this.currentUserEmail);
    if (otherParticipantEmail === this.propertyAgent.email) {
      return this.propertyAgent.name || otherParticipantEmail;
    }
    return otherParticipantEmail;
  }

  autoResize(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  navigateHome() {
    this.router.navigate(['/homepage1']);
  }
}