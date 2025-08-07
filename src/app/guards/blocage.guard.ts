/**
 * GUARD DE BLOCAGE
 * Vérifie si l'utilisateur n'est pas bloqué avant d'accéder aux routes
 */

import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { BlockageService } from '../services/blocage.service';
import { EntrepriseAuthService } from '../services/entreprise-auth.service';

@Injectable({
  providedIn: 'root'
})
export class BlocageGuard implements CanActivate {

  constructor(
    private blocageService: BlockageService,
    private entrepriseAuth: EntrepriseAuthService,
    private router: Router
  ) {}

  async canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Promise<boolean> {
    
    try {
      console.log('🛡️ BlocageGuard: Vérification du statut de blocage...');

      // Vérifier entreprise connectée
      const entrepriseId = this.entrepriseAuth.getCurrentEntrepriseId();
      if (entrepriseId) {
        const entrepriseStatus = await this.blocageService.getEntrepriseStatus(entrepriseId);
        
        if (entrepriseStatus && !entrepriseStatus.actif) {
          console.log('🚫 BlocageGuard: Entreprise bloquée détectée');
          
          // Stocker les informations de blocage
          localStorage.setItem('blocage_motif', entrepriseStatus.motif_desactivation || 'Non spécifié');
          localStorage.setItem('blocage_type', 'entreprise');
          localStorage.setItem('blocage_date', entrepriseStatus.date_desactivation || '');
          
          // Nettoyer les données de session
          localStorage.removeItem('entreprise_session');
          sessionStorage.clear();
          
          // Rediriger vers la page de blocage
          await this.router.navigate(['/entreprise/blocked'], { 
            queryParams: { 
              motif: entrepriseStatus.motif_desactivation,
              type: 'entreprise'
            } 
          });
          
          return false;
        }
      }

      // TODO: Vérifier conducteur connecté si applicable
      // const conducteurId = this.conducteurAuth.getCurrentConducteurId();
      // if (conducteurId) {
      //   const conducteurStatus = await this.blocageService.getConducteurStatus(conducteurId);
      //   
      //   if (conducteurStatus && !conducteurStatus.actif) {
      //     console.log('🚫 BlocageGuard: Conducteur bloqué détecté');
      //     
      //     // Afficher la modal de blocage
      //     await this.blocageService.showBlockedModal(
      //       conducteurStatus.motif_blocage || 'Non spécifié',
      //       conducteurStatus.bloque_par,
      //       conducteurStatus.date_blocage
      //     );
      //     
      //     return false;
      //   }
      // }

      console.log('✅ BlocageGuard: Accès autorisé');
      return true;

    } catch (error) {
      console.error('❌ BlocageGuard: Erreur lors de la vérification:', error);
      
      // En cas d'erreur, autoriser l'accès mais démarrer le monitoring
      this.blocageService.startMonitoring();
      return true;
    }
  }
}