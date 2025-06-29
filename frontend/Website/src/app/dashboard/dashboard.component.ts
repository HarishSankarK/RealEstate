import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  template: `<h2>Dashboard</h2><p>Welcome to your dashboard!</p>`,
  standalone: true,
  imports: [CommonModule]
})
export class DashboardComponent {}