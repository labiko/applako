import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { SplashScreenComponent } from './shared/components/splash-screen/splash-screen.component';
import { GeolocationService } from './services/geolocation.service';
import { AuthService } from './services/auth.service';
import { AppInitBlocageService } from './services/app-init-blocage.service';
import { Capacitor } from '@capacitor/core';

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
    
    // Démarrer le tracking de position si un conducteur est connecté ET en ligne
    this.authService.currentConducteur$.subscribe(async conducteur => {
      if (conducteur) {
        // Vérifier le statut en ligne/hors ligne
        const isOnline = !conducteur.hors_ligne; // hors_ligne = false signifie en ligne
        
        console.log('Conducteur connecté:', {
          id: conducteur.id,
          hors_ligne: conducteur.hors_ligne,
          isOnline: isOnline
        });
        
        
        if (isOnline) {
          // Conducteur EN LIGNE : démarrer le tracking
          console.log('✅ Conducteur en ligne, démarrage du tracking GPS');
          this.geolocationService.startLocationTracking();
        } else {
          // Conducteur HORS LIGNE : ne pas démarrer le tracking
          console.log('⏸️ Conducteur hors ligne, tracking GPS non démarré');
          this.geolocationService.stopLocationTracking();
        }
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