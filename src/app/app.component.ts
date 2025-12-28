import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { IonApp, IonRouterOutlet, IonButton, IonIcon } from '@ionic/angular/standalone';
import { SplashScreenComponent } from './shared/components/splash-screen/splash-screen.component';
import { GeolocationService } from './services/geolocation.service';
import { AuthService } from './services/auth.service';
import { AppInitBlocageService } from './services/app-init-blocage.service';
import { PwaService } from './services/pwa.service';
import { Capacitor } from '@capacitor/core';
import { addIcons } from 'ionicons';
import { downloadOutline, closeOutline, shareOutline, addOutline } from 'ionicons/icons';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true,
  imports: [IonApp, IonRouterOutlet, IonButton, IonIcon, CommonModule, SplashScreenComponent],
})
export class AppComponent implements OnInit, OnDestroy {
  showSplash = true;
  showInstallBanner = false;
  showForceInstallModal = false;

  constructor(
    private geolocationService: GeolocationService,
    private authService: AuthService,
    private blocageInitService: AppInitBlocageService,
    public pwaService: PwaService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {
    addIcons({ downloadOutline, closeOutline, shareOutline, addOutline });
  }

  ngOnInit() {
    // Initialiser le système de blocage
    console.log('🚀 Initialisation du système de blocage...');
    this.blocageInitService.initialize();

    // PWA Install Banner - avec forçage de détection des changements
    this.pwaService.installable$.subscribe(installable => {
      this.showInstallBanner = installable && this.pwaService.shouldShowBanner();
      console.log('📲 PWA Banner state:', this.showInstallBanner, 'installable:', installable);
      this.cdr.detectChanges();
    });

    // Vérifier si on doit forcer l'installation (conducteurs uniquement)
    this.checkForceInstall(this.router.url);

    // Écouter les changements de route
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event) => {
      this.checkForceInstall(event.urlAfterRedirects);
    });
    
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

  async installPwa() {
    const installed = await this.pwaService.installApp();
    if (installed) {
      this.showInstallBanner = false;
    }
  }

  dismissInstallBanner() {
    this.pwaService.dismissInstallBanner();
    this.showInstallBanner = false;
  }

  /**
   * Vérifie si on doit forcer l'installation PWA (conducteurs uniquement)
   */
  private checkForceInstall(currentPath: string) {
    this.showForceInstallModal = this.pwaService.shouldForceInstall(currentPath);
    console.log('🔒 Force install modal:', this.showForceInstallModal, 'path:', currentPath);
    this.cdr.detectChanges();
  }

  /**
   * Tente d'installer l'app depuis le modal bloquant
   */
  async forceInstallPwa() {
    const installed = await this.pwaService.installApp();
    if (installed) {
      this.showForceInstallModal = false;
      this.showInstallBanner = false;
    }
  }

}