import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { trigger, style, animate, transition } from '@angular/animations';

@Component({
  selector: 'app-my-properties',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './my-properties.component.html',
  styleUrls: ['./my-properties.component.css'],
  animations: [
    trigger('modalAnimation', [
      transition(':enter', [
        style({ transform: 'scale(0.9)', opacity: 0 }),
        animate('400ms ease-out', style({ transform: 'scale(1)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'scale(0.9)', opacity: 0 }))
      ])
    ]),
    trigger('cardAnimation', [
      transition(':enter', [
        style({ transform: 'translateY(20px)', opacity: 0 }),
        animate('500ms ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
      ])
    ])
  ]
})
export class MyPropertiesComponent implements OnInit {
  myProperties: any[] = [];
  residentialProperties: any[] = [];
  currentUserEmail: string | null = localStorage.getItem('currentUserEmail');
  loading = true;
  errorMessage: string | null = null;
  showEditModal = false;
  selectedProperty: any = null;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.loadMyProperties();
  }

  loadMyProperties() {
    if (!this.currentUserEmail) {
      this.errorMessage = 'Please log in to view your properties.';
      this.myProperties = [];
      this.residentialProperties = [];
      this.loading = false;
      return;
    }

    // Fetch properties from localStorage
    const localProperties = JSON.parse(localStorage.getItem('myProperties') || '[]');
    this.residentialProperties = localProperties
      .filter((property: any) => property.bookedByEmail === this.currentUserEmail && property.availability === 'booked' && property.isResidential)
      .map((property: any) => ({
        ...property,
        id: property._id ? property._id.toString() : null,
        isResidential: true
      }));

    // Fetch properties posted by the user from the backend
    this.http.get<any[]>(`http://localhost:3000/api/properties/user/${this.currentUserEmail}`, { withCredentials: true })
      .subscribe(
        (data) => {
          if (Array.isArray(data) && data.length > 0) {
            this.myProperties = data
              .filter(property => property.postedByEmail === this.currentUserEmail)
              .map((property) => ({
                ...property,
                id: property._id ? property._id.toString() : null,
              }));

            // Merge backend residential properties with localStorage
            const backendResidential = data
              .filter(property => property.bookedByEmail === this.currentUserEmail && property.availability === 'booked' && property.isResidential)
              .map((property) => ({
                ...property,
                id: property._id ? property._id.toString() : null,
                isResidential: true
              }));

            // Combine and deduplicate residential properties
            const allResidential = [...this.residentialProperties, ...backendResidential];
            const uniqueResidential = Array.from(
              new Map(allResidential.map(p => [p.id, p])).values()
            );
            this.residentialProperties = uniqueResidential;

            this.errorMessage = null;
          } else {
            this.myProperties = [];
            if (this.residentialProperties.length === 0) {
              this.errorMessage = 'No properties found for this user.';
            }
          }
          this.loading = false;
        },
        (error) => {
          console.error('Failed to load my properties:', error);
          this.errorMessage = 'Failed to load properties from server. Showing local data.';
          this.myProperties = [];
          this.loading = false;
        }
      );
  }

  viewDetails(property: any) {
    if (property.id) this.router.navigate([`/property/${property.id}`]);
  }

  deleteProperty(property: any) {
    if (property.id && confirm('Are you sure you want to delete this property?')) {
      this.http.delete(`http://localhost:3000/api/properties/${property.id}`).subscribe(
        () => {
          this.myProperties = this.myProperties.filter(p => p.id !== property.id);
          this.residentialProperties = this.residentialProperties.filter(p => p.id !== property.id);

          // Update localStorage
          const localProperties = JSON.parse(localStorage.getItem('myProperties') || '[]');
          const updatedLocal = localProperties.filter((p: any) => p._id !== property.id);
          localStorage.setItem('myProperties', JSON.stringify(updatedLocal));
        },
        (error) => {
          console.error('Failed to delete property:', error);
          this.errorMessage = 'Failed to delete property. Please try again.';
        }
      );
    }
  }

  openEditModal(property: any) {
    this.selectedProperty = { ...property };
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
    this.selectedProperty = null;
  }

  navigateToHomepage(): void {
    this.router.navigate(['/homepage1']);
  }

  updateProperty() {
    if (this.selectedProperty && this.selectedProperty.id) {
      this.http.put(`http://localhost:3000/api/properties/${this.selectedProperty.id}`, this.selectedProperty).subscribe(
        () => {
          const index = this.myProperties.findIndex(p => p.id === this.selectedProperty.id);
          if (index !== -1) this.myProperties[index] = { ...this.selectedProperty };
          const resIndex = this.residentialProperties.findIndex(p => p.id === this.selectedProperty.id);
          if (resIndex !== -1) this.residentialProperties[resIndex] = { ...this.selectedProperty };

          // Update localStorage
          const localProperties = JSON.parse(localStorage.getItem('myProperties') || '[]');
          const localIndex = localProperties.findIndex((p: any) => p._id === this.selectedProperty.id);
          if (localIndex !== -1) {
            localProperties[localIndex] = this.selectedProperty;
            localStorage.setItem('myProperties', JSON.stringify(localProperties));
          }

          this.closeEditModal();
        },
        (error) => {
          console.error('Failed to update property:', error);
          this.errorMessage = 'Failed to update property. Please try again.';
        }
      );
    }
  }
}