import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Chart from 'chart.js/auto';
import { isPlatformBrowser } from '@angular/common';

interface User {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  profileImage: string;
  lastLogin?: Date;
  status: string;
  createdAt: Date;
}

interface ActivityLog {
  message: string;
  timestamp: Date;
}

interface Property {
  _id: string;
  propertyID: string;
  title: string;
  category: 'Buy' | 'Rent';
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
  bookedByEmail?: string;
  isResidential: boolean;
  status: 'available' | 'sold' | 'rented';
  createdAt: Date;
  updatedAt: Date;
  isVerified?: boolean;
  isFavorite?: boolean;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('propertyChart') propertyChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('userRoleChart') userRoleChartRef!: ElementRef<HTMLCanvasElement>;

  activeTab: string = 'overview';
  users: User[] = [];
  properties: Property[] = [];
  activityLogs: ActivityLog[] = [];
  errorMessage: string | null = null;
  successMessage: string | null = null;
  currentUserEmail: string | null = null;
  currentUserRole: string | null = null;
  userSearchQuery: string = '';
  propertySearchQuery: string = '';
  selectedUser: User | null = null;
  selectedProperty: Property | null = null;
  selectedPropertyDocument: { isImage: boolean; content: string } | null = null;

  totalUsers: number = 0;
  totalProperties: number = 0;
  activeListings: number = 0;

  private propertyChart: Chart | undefined;
  private userRoleChart: Chart | undefined;

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.currentUserEmail = localStorage.getItem('currentUserEmail');
      this.currentUserRole = localStorage.getItem('currentUserRole');

      if (!this.currentUserEmail) {
        console.error('No user logged in. Redirecting to sign-in.');
        this.router.navigate(['/signin']);
      } else if (this.currentUserRole !== 'admin') {
        console.error('User is not an admin. Redirecting to home.');
        alert('Access denied. Admins only.');
        this.router.navigate(['/home']);
      }
    }
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'x-user-email': this.currentUserEmail || ''
    });
  }

  private logActivity(message: string) {
    this.activityLogs.unshift({
      message: `Admin ${this.currentUserEmail}: ${message}`,
      timestamp: new Date()
    });
    if (this.activityLogs.length > 50) {
      this.activityLogs.pop();
    }
  }

  // Helper method to validate if a string is a valid base64-encoded string
  private isValidBase64(str: string): boolean {
    try {
      // Remove any data URI prefix if present (e.g., "data:image/png;base64,")
      const base64Str = str.replace(/^data:image\/[a-z]+;base64,/, '');
      // Base64 regex: only allows valid base64 characters and checks for padding
      const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
      return base64Regex.test(base64Str) && (base64Str.length % 4 === 0);
    } catch (e) {
      return false;
    }
  }

  // Helper method to check if a string has a data URI prefix and is a valid image format
  private hasValidDataUriPrefix(str: string): boolean {
    return /^data:image\/(png|jpeg|jpg|webp|gif);base64,/.test(str);
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId) && this.currentUserRole === 'admin') {
      this.loadUsers();
      this.loadProperties();
      this.activityLogs = [];
      this.logActivity('Signed in to Admin Dashboard');
    }
  }

  ngAfterViewInit() {
    this.renderCharts();
  }

  loadUsers() {
    this.http.get<User[]>('http://localhost:3000/api/auth/users', { headers: this.getHeaders() }).subscribe(
      (data) => {
        this.users = data;
        this.totalUsers = this.users.length;
        this.renderCharts();
        this.logActivity('Loaded user data');
      },
      (error) => {
        this.errorMessage = 'Failed to load users: ' + (error.error?.error || 'Unknown error');
        this.logActivity('Failed to load users');
      }
    );
  }

  loadProperties() {
    this.http.get<Property[]>('http://localhost:3000/api/properties', { headers: this.getHeaders() }).subscribe(
      (data) => {
        this.properties = data.map(property => ({
          ...property,
          isVerified: property.isVerified || false,
          isFavorite: property.isFavorite || false
        }));
        this.totalProperties = this.properties.length;
        this.activeListings = this.properties.filter(p => p.status === 'available').length;
        this.renderCharts();
        this.logActivity('Loaded property data');
      },
      (error) => {
        this.errorMessage = 'Failed to load properties.';
        this.logActivity('Failed to load properties');
      }
    );
  }

  renderCharts() {
    if (!isPlatformBrowser(this.platformId)) return;

    if (this.propertyChart) this.propertyChart.destroy();
    if (this.userRoleChart) this.userRoleChart.destroy();

    const propertyCategories = {
      Buy: this.properties.filter(p => p.category === 'Buy').length,
      Rent: this.properties.filter(p => p.category === 'Rent').length
    };
    if (this.propertyChartRef) {
      this.propertyChart = new Chart(this.propertyChartRef.nativeElement, {
        type: 'bar',
        data: {
          labels: ['Buy', 'Rent'],
          datasets: [{
            label: 'Properties by Category',
            data: [propertyCategories.Buy, propertyCategories.Rent],
            backgroundColor: ['#4CAF50', '#2196F3'],
            borderColor: ['#388E3C', '#1976D2'],
            borderWidth: 1
          }]
        },
        options: {
          scales: {
            y: { beginAtZero: true }
          }
        }
      });
    }

    const userRoles = {
      admin: this.users.filter(u => u.role === 'admin').length,
      user: this.users.filter(u => u.role === 'user').length
    };
    if (this.userRoleChartRef) {
      this.userRoleChart = new Chart(this.userRoleChartRef.nativeElement, {
        type: 'pie',
        data: {
          labels: ['Admins', 'Users'],
          datasets: [{
            label: 'User Roles',
            data: [userRoles.admin, userRoles.user],
            backgroundColor: ['#FF9800', '#9C27B0'],
            borderColor: ['#F57C00', '#7B1FA2'],
            borderWidth: 1
          }]
        }
      });
    }
  }

  deleteUser(email: string) {
    if (isPlatformBrowser(this.platformId) && confirm(`Are you sure you want to delete user ${email}?`)) {
      this.http.delete(`http://localhost:3000/api/auth/user/${email}`, { headers: this.getHeaders() }).subscribe(
        () => {
          this.successMessage = 'User deleted successfully.';
          this.loadUsers();
          this.logActivity(`Deleted user ${email}`);
        },
        (error) => {
          this.errorMessage = 'Failed to delete user.';
          this.logActivity(`Failed to delete user ${email}`);
        }
      );
    }
  }

  deleteProperty(id: string) {
    if (isPlatformBrowser(this.platformId) && confirm(`Are you sure you want to delete property ${id}?`)) {
      this.http.delete(`http://localhost:3000/api/properties/${id}`, { headers: this.getHeaders() }).subscribe(
        () => {
          this.successMessage = 'Property deleted successfully.';
          this.loadProperties();
          this.logActivity(`Deleted property ${id}`);
        },
        (error) => {
          this.errorMessage = 'Failed to delete property.';
          this.logActivity(`Failed to delete property ${id}`);
        }
      );
    }
  }

  verifyProperty(property: Property) {
    if (!property._id) return;
    if (isPlatformBrowser(this.platformId)) {
      navigator.clipboard.writeText(property._id).then(() => {
        console.log('Property ID copied to clipboard:', property._id);
        this.logActivity(`Copied property ID ${property._id} to clipboard for verification`);
        window.open('https://eservices.tn.gov.in/eservicesnew/home.html', '_blank');
      }).catch(err => {
        console.error('Failed to copy property ID to clipboard:', err);
        alert('Failed to copy Property ID. Please copy it manually: ' + property._id);
        this.logActivity(`Failed to copy property ID ${property._id} to clipboard`);
        window.open('https://eservices.tn.gov.in/eservicesnew/home.html', '_blank');
      });
    }
  }

  viewPropertyDocument(property: Property) {
    if (property.propertyDocument) {
      // Check if the string already has a valid data URI prefix
      if (this.hasValidDataUriPrefix(property.propertyDocument)) {
        this.selectedPropertyDocument = {
          isImage: true,
          content: property.propertyDocument // Use as-is since it has the correct prefix
        };
      } else if (this.isValidBase64(property.propertyDocument)) {
        // If it's a valid base64 string but no prefix, assume PNG and add the prefix
        this.selectedPropertyDocument = {
          isImage: true,
          content: `data:image/png;base64,${property.propertyDocument}`
        };
      } else {
        console.warn(`Invalid base64 string for property document (ID: ${property._id}):`, property.propertyDocument);
        this.selectedPropertyDocument = {
          isImage: false,
          content: `Property Document for ${property.title}\n\nID: ${property._id}\nLocation: ${property.location}\nPrice: ${property.price}\nCategory: ${property.category}\nStatus: ${property.status}\n\n[Document content not available or invalid]`
        };
      }
    } else {
      this.selectedPropertyDocument = {
        isImage: false,
        content: `Property Document for ${property.title}\n\nID: ${property._id}\nLocation: ${property.location}\nPrice: ${property.price}\nCategory: ${property.category}\nStatus: ${property.status}\n\n[Document content not available]`
      };
    }
    this.logActivity(`Viewed document for property ${property._id}`);
  }

  updateUserRole(email: string, role: string) {
    this.http.put(`http://localhost:3000/api/auth/user/${email}/role`, { role }, { headers: this.getHeaders() }).subscribe(
      () => {
        this.successMessage = `User role updated to ${role}.`;
        this.loadUsers();
        this.closeModal();
        this.logActivity(`Updated role of user ${email} to ${role}`);
      },
      (error) => {
        this.errorMessage = 'Failed to update user role.';
        this.logActivity(`Failed to update role of user ${email}`);
      }
    );
  }

  updatePropertyStatus(id: string, status: string) {
    this.http.put(`http://localhost:3000/api/properties/${id}/status`, { status }, { headers: this.getHeaders() }).subscribe(
      () => {
        this.successMessage = `Property status updated to ${status}.`;
        this.loadProperties();
        this.closeModal();
        this.logActivity(`Updated status of property ${id} to ${status}`);
      },
      (error) => {
        this.errorMessage = 'Failed to update property status.';
        this.logActivity(`Failed to update status of property ${id}`);
      }
    );
  }

  exportUsersToCSV() {
    if (isPlatformBrowser(this.platformId)) {
      const headers = ['Email', 'First Name', 'Last Name', 'Phone', 'Role', 'Status', 'Created At', 'Last Login'];
      const csvRows = [
        headers.join(','),
        ...this.users.map(user => [
          user.email,
          user.firstName,
          user.lastName,
          user.phone,
          user.role,
          user.status,
          user.createdAt.toISOString(),
          user.lastLogin ? user.lastLogin.toISOString() : 'N/A'
        ].join(','))
      ];
      const csvContent = csvRows.join('\n');
      this.downloadCSV(csvContent, 'users_export.csv');
      this.logActivity('Exported users to CSV');
    }
  }

  exportPropertiesToCSV() {
    if (isPlatformBrowser(this.platformId)) {
      const headers = ['ID', 'Property ID', 'Title', 'Category', 'Price', 'Location', 'Status', 'Posted By', 'Created At', 'Updated At'];
      const csvRows = [
        headers.join(','),
        ...this.properties.map(property => [
          property._id,
          property.propertyID,
          property.title,
          property.category,
          property.price,
          property.location,
          property.status,
          property.postedByEmail,
          property.createdAt.toISOString(),
          property.updatedAt.toISOString()
        ].join(','))
      ];
      const csvContent = csvRows.join('\n');
      this.downloadCSV(csvContent, 'properties_export.csv');
      this.logActivity('Exported properties to CSV');
    }
  }

  downloadCSV(content: string, fileName: string) {
    if (isPlatformBrowser(this.platformId)) {
      const blob = new Blob([content], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
    this.errorMessage = null;
    this.successMessage = null;
    this.logActivity(`Switched to ${tab} tab`);
  }

  showUserDetails(user: User) {
    this.selectedUser = { ...user };
    this.logActivity(`Viewed details of user ${user.email}`);
  }

  showPropertyDetails(property: Property) {
    this.selectedProperty = { ...property };
    this.logActivity(`Viewed details of property ${property._id}`);
  }

  closeModal() {
    this.selectedUser = null;
    this.selectedProperty = null;
  }

  closeDocumentModal() {
    this.selectedPropertyDocument = null;
  }

  get filteredUsers() {
    return this.users.filter(user =>
      user.email.toLowerCase().includes(this.userSearchQuery.toLowerCase()) ||
      user.firstName.toLowerCase().includes(this.userSearchQuery.toLowerCase()) ||
      user.lastName.toLowerCase().includes(this.userSearchQuery.toLowerCase())
    );
  }

  get filteredProperties() {
    return this.properties.filter(property =>
      property.title.toLowerCase().includes(this.propertySearchQuery.toLowerCase()) ||
      property.location.toLowerCase().includes(this.propertySearchQuery.toLowerCase())
    );
  }

  ngOnDestroy() {
    if (isPlatformBrowser(this.platformId)) {
      if (this.propertyChart) this.propertyChart.destroy();
      if (this.userRoleChart) this.userRoleChart.destroy();
    }
  }
}