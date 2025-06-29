import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

export interface Property {
  _id: string;
  propertyID: string; // Added propertyID field
  title: string;
  category: string;
  price: number;
  location: string;
  image?: string;
  propertyDocument?: string;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  furnishing: string;
  availability: string;
  ownerName?: string;
  ownerPhone?: string;
  leaseDuration?: string;
  deposit?: number;
  petPolicy?: string;
  maintenanceFee?: number;
  yearBuilt?: number;
  parkingSpaces?: number;
  amenities?: string;
  postedByEmail: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

@Component({
  selector: 'app-landlord',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './landlord.component.html',
  styleUrls: ['./landlord.component.css']
})
export class LandlordComponent {
  showPopup = true;
  selectedCategory: string = '';
  loading = false;

  property: Property = {
    _id: '',
    propertyID: '', // Initialize propertyID
    title: '',
    category: '',
    price: 0,
    location: '',
    propertyType: '',
    bedrooms: 0,
    bathrooms: 0,
    area: 0,
    furnishing: '',
    availability: '',
    ownerName: '',
    ownerPhone: '',
    leaseDuration: '',
    deposit: 0,
    petPolicy: '',
    maintenanceFee: 0,
    yearBuilt: 0,
    parkingSpaces: 0,
    amenities: '',
    postedByEmail: '',
    status: 'available',
    createdAt: new Date(),
    updatedAt: new Date(),
    propertyDocument: ''
  };

  selectedFile: File | null = null;
  selectedDocument: File | null = null;
  previewImage: string | null = null;
  successMessage: string | null = null;
  errorMessage: string | null = null;
  currentUserEmail: string | null = localStorage.getItem('currentUserEmail');

  constructor(private http: HttpClient, private router: Router) {
    if (!this.currentUserEmail) {
      console.error('No user logged in. Redirecting to sign-in.');
      window.location.href = '/signin';
    } else {
      this.property.postedByEmail = this.currentUserEmail;
    }
  }

  selectCategory(category: string) {
    this.selectedCategory = category;
    this.property.category = category;
    this.showPopup = false;
    console.log('Category selected:', category);
  }

  onFileChange(event: Event, field: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          this.errorMessage = `${field === 'image' ? 'Image' : 'Document'} size exceeds 5MB limit.`;
          reject(new Error(`${field} size exceeds 5MB limit.`));
          return;
        }

        if (field === 'image') {
          this.selectedFile = file;
          const reader = new FileReader();
          reader.onload = (e) => {
            this.previewImage = e.target?.result as string;
            console.log('File preview generated (first 50 chars):', this.previewImage.substring(0, 50));
            resolve();
          };
          reader.onerror = (e) => {
            console.error('Error reading file for preview:', e);
            this.errorMessage = 'Failed to read the image file.';
            reject(e);
          };
          reader.readAsDataURL(file);
        } else {
          this.selectedDocument = file;
          resolve();
        }
        console.log(`${field} selected:`, file.name);
      } else {
        this.errorMessage = `No ${field.toLowerCase()} selected.`;
        reject(new Error(`No ${field.toLowerCase()} selected`));
      }
    });
  }

  async onSubmit() {
    console.log('Form submitted. Validating...');
    this.successMessage = null;
    this.errorMessage = null;

    if (!this.currentUserEmail) {
      this.errorMessage = 'You must be logged in to post a property.';
      console.error('No user logged in.');
      window.location.href = '/signin';
      return;
    }

    if (this.loading) {
      console.warn('Submission in progress, please wait.');
      return;
    }

    if (this.validateForm()) {
      this.loading = true;
      console.log('Validation passed. Preparing data:', this.property);

      const formData = new FormData();
      formData.append('propertyID', this.property.propertyID); // Add propertyID to formData
      formData.append('title', this.property.title);
      formData.append('category', this.property.category);
      formData.append('price', this.property.price.toString());
      formData.append('location', this.property.location);
      formData.append('propertyType', this.property.propertyType);
      formData.append('bedrooms', this.property.bedrooms.toString());
      formData.append('bathrooms', this.property.bathrooms.toString());
      formData.append('area', this.property.area.toString());
      formData.append('furnishing', this.property.furnishing);
      formData.append('availability', this.property.availability);
      formData.append('postedByEmail', this.property.postedByEmail);
      formData.append('ownerName', this.property.ownerName || '');
      formData.append('ownerPhone', this.property.ownerPhone || '');

      if (this.property.category === 'Rent') {
        formData.append('leaseDuration', this.property.leaseDuration || '');
        formData.append('deposit', (this.property.deposit || 0).toString());
        formData.append('petPolicy', this.property.petPolicy || '');
        formData.append('maintenanceFee', (this.property.maintenanceFee || 0).toString());
      } else if (this.property.category === 'Buy') {
        formData.append('yearBuilt', (this.property.yearBuilt || 0).toString());
        formData.append('parkingSpaces', (this.property.parkingSpaces || 0).toString());
        formData.append('amenities', this.property.amenities || '');
      }

      if (this.selectedFile) {
        formData.append('image', this.selectedFile, this.selectedFile.name);
      }

      if (this.selectedDocument) {
        formData.append('propertyDocument', this.selectedDocument, this.selectedDocument.name);
      }

      console.log('Sending POST request with FormData');
      this.http.post('http://localhost:3000/api/properties', formData).subscribe(
        (response) => {
          console.log('Property posted successfully:', response);
          this.successMessage = 'Property posted successfully!';
          this.resetForm();
          this.loading = false;
          setTimeout(() => {
            this.router.navigate(['/home']);
          }, 1000);
        },
        (error) => {
          console.error('Failed to post property:', error);
          this.errorMessage = 'Failed to post property. Please try again.';
          if (error.status === 413) {
            this.errorMessage = 'Payload too large. Please upload smaller files.';
          } else if (error.status === 500) {
            this.errorMessage = 'Server error occurred. Please check the server logs.';
          } else if (error.status === 400 && error.error.message.includes('Property ID')) {
            this.errorMessage = error.error.message; // Handle duplicate propertyID error
          } else {
            this.errorMessage += ` (Status: ${error.status}, Message: ${error.message})`;
          }
          this.loading = false;
        }
      );
    } else {
      console.log('Validation failed. Property data:', this.property);
      this.errorMessage = 'Please fill all required fields.';
    }
  }

  validateForm(): boolean {
    console.log('Validating form with data:', this.property);
    const hasImage = !!this.selectedFile;
    const hasDocument = !!this.selectedDocument;
    const isRent = this.property.category === 'Rent';
    const requiredFieldsValid = !!this.property.propertyID && // Validate propertyID
                               !!this.property.title &&
                               !!this.property.location &&
                               this.property.price >= 0 &&
                               !!this.property.propertyType &&
                               this.property.bedrooms >= 0 &&
                               this.property.bathrooms >= 0 &&
                               this.property.area > 0 &&
                               !!this.property.furnishing &&
                               !!this.property.availability &&
                               hasImage &&
                               hasDocument;

    if (isRent) {
      return requiredFieldsValid &&
             !!this.property.leaseDuration &&
             (this.property.deposit || 0) >= 0 &&
             !!this.property.petPolicy &&
             (this.property.maintenanceFee || 0) >= 0;
    } else {
      return requiredFieldsValid &&
             (this.property.yearBuilt || 0) >= 0 &&
             (this.property.parkingSpaces || 0) >= 0 &&
             !!this.property.amenities;
    }
  }

  resetForm() {
    this.property = {
      _id: '',
      propertyID: '', // Reset propertyID
      title: '',
      category: '',
      price: 0,
      location: '',
      propertyType: '',
      bedrooms: 0,
      bathrooms: 0,
      area: 0,
      furnishing: '',
      availability: '',
      ownerName: '',
      ownerPhone: '',
      leaseDuration: '',
      deposit: 0,
      petPolicy: '',
      maintenanceFee: 0,
      yearBuilt: 0,
      parkingSpaces: 0,
      amenities: '',
      postedByEmail: this.currentUserEmail || '',
      status: 'available',
      createdAt: new Date(),
      updatedAt: new Date(),
      propertyDocument: ''
    };
    this.selectedFile = null;
    this.selectedDocument = null;
    this.previewImage = null;
    this.showPopup = true;
    this.selectedCategory = '';
    this.successMessage = null;
    this.errorMessage = null;
    console.log('Form reset');
  }

  goBack() {
    window.history.back();
  }
}