import { bootstrapApplication } from '@angular/platform-browser';
import { importProvidersFrom, APP_INITIALIZER } from '@angular/core';
import { RouteReuseStrategy } from '@angular/router';
import { IonicRouteStrategy, IonicModule } from '@ionic/angular';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideAuth, getAuth } from '@angular/fire/auth';

import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

import { AppRoutingModule } from './app/app-routing.module';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';

import { AppInitService } from './app/core/init/app-init.service';

// 🚀 APP INIT FUNCTION
function initializeApplication(appInit: AppInitService) {
  return () => appInit.init();
}

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(
      BrowserModule,
      IonicModule.forRoot({
        mode: 'md',
        animated: true,
        hardwareBackButton: true,
        swipeBackEnabled: true
      }),
      AppRoutingModule,
      FormsModule,
      MatDatepickerModule,
      MatNativeDateModule,
      MatInputModule,
      MatFormFieldModule
    ),

    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },

    provideHttpClient(withInterceptorsFromDi()),

    // 🔥 Firebase
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    provideFirestore(() => getFirestore()),
    provideAuth(() => getAuth()),

    // 🚀 APP INITIALIZER
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApplication,
      deps: [AppInitService],
      multi: true
    }
  ]
}).catch(err => console.error(err));