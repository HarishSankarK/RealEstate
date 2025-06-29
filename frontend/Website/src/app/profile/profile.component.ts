import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

interface Preferences {
  notifications: boolean;
}

interface User {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  address: Address;
  preferences: Preferences;
  profileImage: string; // This will store the Base64 string
}

interface Property {
  _id: string;
  title: string;
  category: string;
  price: number;
  location: string;
  image: string;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  furnishing: string;
  availability: string;
  postedBy: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  currentUserEmail: string | null = localStorage.getItem('currentUserEmail');
  user: User | null = null;
  properties: Property[] = [];
  error: string | null = null;
  isEditing: boolean = false;
  selectedFile: File | null = null;

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router
  ) {}

  ngOnInit() {
    if (!this.currentUserEmail) {
      this.router.navigate(['/signin']);
      return;
    }
    this.loadUserDetails();
    this.loadUserProperties();
  }

  loadUserDetails() {
    this.http.get<any>(`http://localhost:3000/api/auth/user/${this.currentUserEmail}`).subscribe({
      next: (data) => {
        this.user = {
          firstName: data.firstName ?? 'Unknown',
          lastName: data.lastName ?? 'Unknown',
          email: data.email ?? this.currentUserEmail ?? 'Unknown',
          phone: data.phone ?? 'Unknown',
          role: data.role ?? 'user',
          address: {
            street: data.address?.street ?? 'Unknown',
            city: data.address?.city ?? 'Unknown',
            state: data.address?.state ?? 'Unknown',
            zip: data.address?.zip ?? 'Unknown',
            country: data.address?.country ?? 'Unknown'
          },
          preferences: {
            notifications: data.preferences?.notifications ?? true
          },
          profileImage: data.profileImage ?? ''
        };
      },
      error: (error) => {
        console.error('Failed to load user details:', error);
        this.error = 'Unable to load profile. Please try again.';
        this.user = {
          firstName: 'Unknown',
          lastName: 'Unknown',
          email: this.currentUserEmail ?? 'user@example.com',
          phone: '123-456-7890',
          role: 'user',
          address: {
            street: 'Unknown',
            city: 'Unknown',
            state: 'Unknown',
            zip: 'Unknown',
            country: 'Unknown'
          },
          preferences: {
            notifications: true
          },
          profileImage: ''
        };
      }
    });
  }

  loadUserProperties() {
    this.http.get<Property[]>(`http://localhost:3000/api/properties/user/${this.currentUserEmail}`).subscribe({
      next: (data) => {
        this.properties = data;
      },
      error: (error) => {
        console.error('Failed to load properties:', error);
        this.error = 'Unable to load properties. Please try again.';
      }
    });
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
    this.error = null;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        this.error = 'Image size must be less than 10MB';
        return;
      }
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        if (this.user) {
          this.user.profileImage = reader.result as string; // Store Base64 string for preview
        }
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  saveProfile() {
    if (!this.user || !this.currentUserEmail) return;

    const userData = {
      firstName: this.user.firstName,
      lastName: this.user.lastName,
      phone: this.user.phone,
      address: this.user.address,
      preferences: this.user.preferences,
      profileImage: this.user.profileImage // Base64 string already set in onFileSelected
    };

    this.http.put(`http://localhost:3000/api/auth/user/${this.currentUserEmail}`, userData).subscribe({
      next: (response: any) => {
        this.isEditing = false;
        this.error = null;
        this.user = response.user;
        this.selectedFile = null; // Clear selected file after successful upload
        alert('Profile updated successfully!');
      },
      error: (error) => {
        console.error('Failed to update profile:', error);
        this.error = 'Failed to update profile. Please try again.';
      }
    });
  }

  navigateHome() {
    this.router.navigate(['/homepage1']);
  }
}