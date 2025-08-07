import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { SplashScreenComponent } from './shared/components/splash-screen/splash-screen.component';
import { GeolocationService } from './services/geolocation.service';
import { AuthService } from './services/auth.service';
import { AppInitBlocageService } from './services/app-init-blocage.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true,
  imports: [IonApp, IonRouterOutlet, CommonModule, SplashScreenComponent],
})
export class AppComponent implements OnInit, OnDestroy {
  showSplash = true;

  constructor(
    private geolocationService: GeolocationService,
    private authService: AuthService,
    private blocageInitService: AppInitBlocageService
  ) {}

  ngOnInit() {
    // Initialiser le système de blocage
    console.log('🚀 Initialisation du système de blocage...');
    this.blocageInitService.initialize();
    
    // Démarrer le tracking de position si un conducteur est connecté
    this.authService.currentConducteur$.subscribe(conducteur => {
      if (conducteur) {
        console.log('Conducteur connecté, démarrage du tracking GPS');
        this.geolocationService.startLocationTracking();
      } else {
        console.log('Conducteur déconnecté, arrêt du tracking GPS');
        this.geolocationService.stopLocationTracking();
      }
    });
  }

  ngOnDestroy() {
    // Nettoyer le tracking à la fermeture
    this.geolocationService.stopLocationTracking();
  }

  hideSplash() {
    this.showSplash = false;
  }
}