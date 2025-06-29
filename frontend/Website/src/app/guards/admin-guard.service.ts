import { Injectable, Inject, PLATFORM_ID } from '@angular/core'; // Added Inject
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(private router: Router, @Inject(PLATFORM_ID) private platformId: Object) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> | Promise<boolean> | boolean {
    if (isPlatformBrowser(this.platformId)) {
      const role = localStorage.getItem('currentUserRole');
      const email = localStorage.getItem('currentUserEmail');

      if (!email) {
        this.router.navigate(['/signin']);
        return false;
      }

      if (role !== 'admin') {
        alert('Access denied. Admins only.');
        this.router.navigate(['/home']);
        return false;
      }

      return true;
    }
    return true; // Allow on server-side (SSR) and handle on client-side
  }
}