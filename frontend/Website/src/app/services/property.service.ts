import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root' // Ensures the service is available app-wide
})
export class PropertyService {
  private apiUrl = 'http://localhost:3000/api/properties';

  constructor(private http: HttpClient) {}

  getProperties() {
    return this.http.get<any[]>(this.apiUrl).pipe(
      map((properties: any[]) => properties.map(property => ({
        ...property,
        image: property.image || 'https://via.placeholder.com/300x200'
      })))
    );
  }
}