/**
 * SERVICE D'INITIALISATION DU SYSTÈME DE BLOCAGE
 * Démarre automatiquement le monitoring au démarrage de l'app
 */

import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { BlockageService } from './blocage.service';
import { EntrepriseAuthService } from './entreprise-auth.service';
import { AuthService } from './auth.service';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AppInitBlocageService {
  private monitoringStarted = false;

  constructor(
    private blocageService: BlockageService,
    private entrepriseAuth: EntrepriseAuthService,
    private conducteurAuth: AuthService,
    private router: Router
  ) {}

  /**
   * Initialiser le système de blocage
   * À appeler au démarrage de l'application
   */
  initialize(): void {
    console.log('🔧 Initialisation du système de blocage...');

    // Démarrer le monitoring si un utilisateur est connecté
    this.checkAndStartMonitoring();

    // Écouter les changements de navigation pour vérifier les blocages
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.onNavigationEnd(event as NavigationEnd);
      });

    // Écouter les changements d'authentification entreprise
    this.entrepriseAuth.onAuthStateChanged((isAuthenticated) => {
      if (isAuthenticated && !this.monitoringStarted) {
        console.log('🏢 Entreprise connectée, démarrage monitoring...');
        this.startMonitoring();
      } else if (!isAuthenticated && this.monitoringStarted) {
        // Vérifier si un conducteur est toujours connecté avant d'arrêter
        const conducteurId = this.conducteurAuth.getCurrentConducteurId();
        if (!conducteurId) {
          console.log('🏢 Entreprise déconnectée, arrêt monitoring...');
          this.stopMonitoring();
        }
      }
    });

    // Écouter les changements d'authentification conducteur
    this.conducteurAuth.currentConducteur$.subscribe(conducteur => {
      if (conducteur && !this.monitoringStarted) {
        console.log('🚗 Conducteur connecté, démarrage monitoring...', conducteur.nom);
        this.startMonitoring();
      } else if (!conducteur && this.monitoringStarted) {
        // Vérifier si une entreprise est toujours connectée avant d'arrêter
        const entrepriseId = this.entrepriseAuth.getCurrentEntrepriseId();
        if (!entrepriseId) {
          console.log('🚗 Conducteur déconnecté, arrêt monitoring...');
          this.stopMonitoring();
        }
      }
    });

    console.log('✅ Système de blocage initialisé');
  }

  /**
   * Vérifier et démarrer le monitoring si nécessaire
   */
  private checkAndStartMonitoring(): void {
    // Vérifier si un utilisateur est connecté (entreprise ou conducteur)
    const entrepriseId = this.entrepriseAuth.getCurrentEntrepriseId();
    const conducteurId = this.conducteurAuth.getCurrentConducteurId();

    if ((entrepriseId || conducteurId) && !this.monitoringStarted) {
      console.log('🔍 Utilisateur connecté détecté, démarrage du monitoring...', { entrepriseId, conducteurId });
      this.startMonitoring();
    }
  }

  /**
   * Démarrer le monitoring de blocage
   */
  private startMonitoring(): void {
    if (this.monitoringStarted) {
      return;
    }

    console.log('🔍 Démarrage du monitoring de blocage...');
    this.blocageService.startMonitoring();
    this.monitoringStarted = true;
  }

  /**
   * Arrêter le monitoring de blocage
   */
  private stopMonitoring(): void {
    if (!this.monitoringStarted) {
      return;
    }

    console.log('⏹️ Arrêt du monitoring de blocage...');
    this.blocageService.stopMonitoring();
    this.monitoringStarted = false;
  }

  /**
   * Gestionnaire de navigation
   */
  private onNavigationEnd(event: NavigationEnd): void {
    // Ne pas vérifier sur les pages de blocage pour éviter les boucles
    if (event.url.includes('/blocked') || event.url.includes('/block')) {
      return;
    }

    // Vérification ponctuelle lors de la navigation
    setTimeout(() => {
      this.blocageService.checkBlockageStatus();
    }, 1000);
  }

  /**
   * Vérification manuelle du statut de blocage
   */
  async checkStatus(): Promise<void> {
    await this.blocageService.checkBlockageStatus();
  }

  /**
   * Forcer le redémarrage du monitoring
   */
  restartMonitoring(): void {
    this.stopMonitoring();
    setTimeout(() => {
      this.startMonitoring();
    }, 1000);
  }

  /**
   * Obtenir l'état du monitoring
   */
  isMonitoringActive(): boolean {
    return this.monitoringStarted;
  }
}