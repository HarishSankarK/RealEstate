import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-property-details',
  standalone: true,
  imports: [CommonModule, RouterModule], // Add RouterModule
  templateUrl: './property-details.component.html',
  styleUrls: ['./property-details.component.css']
})
export class PropertyDetailsComponent implements OnInit {
  property: any = null;
  errorMessage: string | null = null;

  constructor(private route: ActivatedRoute, private http: HttpClient) {}

  ngOnInit(): void {
    const propertyId = this.route.snapshot.paramMap.get('id');
    if (propertyId) {
      this.fetchPropertyDetails(propertyId);
    } else {
      this.errorMessage = 'Property ID not found.';
    }
  }

  fetchPropertyDetails(id: string): void {
    this.http.get<any>(`http://localhost:3000/api/properties/${id}`).subscribe(
      (response) => {
        this.property = response;
        console.log('Property details:', this.property);
      },
      (error) => {
        console.error('Error fetching property details:', error);
        this.errorMessage = 'Failed to load property details. Please try again later.';
      }
    );
  }
}