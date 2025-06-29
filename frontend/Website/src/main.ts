import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes'; // your routes

bootstrapApplication(AppComponent, {
  providers: [appConfig.providers, provideAnimations(), provideRouter(routes),
    provideHttpClient(withFetch()) ]
}).catch(err => console.error(err));