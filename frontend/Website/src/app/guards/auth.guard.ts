import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (isPlatformBrowser(platformId)) {
    const userEmail = localStorage.getItem('currentUserEmail');
    console.log('Auth Guard: userEmail=', userEmail);
    if (userEmail) {
      return true;
    } else {
      router.navigate(['/signin']);
      return false;
    }
  }

  return true; // Allow on server-side (SSR) and handle on client-side
};