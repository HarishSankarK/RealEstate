import { Routes } from '@angular/router';
import { SigninComponent } from './signin/signin.component';
import { SignupComponent } from './signup/signup.component';
import { HomeComponent } from './home/home.component';
import { Homepage1Component } from './homepage1/homepage1.component';
import { LandlordComponent } from './landlord/landlord.component';
import { PropertyDetailsComponent } from './property-details/property-details.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { ChatComponent } from './chat/chat.component';
import { ProfileComponent } from './profile/profile.component';
import { authGuard } from './guards/auth.guard';
import { MyPropertiesComponent } from './my-properties/my-properties.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { AdminGuard } from './guards/admin-guard.service';
import { PaymentComponent } from './payment/payment.component';

export const routes: Routes = [
  { path: '', redirectTo: '/signin', pathMatch: 'full' },
  { path: 'signin', component: SigninComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'home', component: HomeComponent, canActivate: [authGuard], data: { alwaysRefresh: true } },
  { path: 'homepage1', component: Homepage1Component, canActivate: [authGuard] },
  { path: 'landlord', component: LandlordComponent, canActivate: [authGuard] },
  { path: 'property/:id', component: PropertyDetailsComponent, canActivate: [authGuard] },
  { path: 'chat/:id', component: ChatComponent, canActivate: [authGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  { path: 'my-properties', component: MyPropertiesComponent, canActivate: [authGuard] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'admin', component: AdminDashboardComponent, canActivate: [AdminGuard] },
  { path: 'payment', component: PaymentComponent, canActivate: [authGuard] }, // Added payment route
  { path: '**', redirectTo: '/signin' }
];