import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { EntrepriseAuthService } from '../services/entreprise-auth.service';

@Injectable({
  providedIn: 'root'
})
export class RedirectGuard implements CanActivate {
  
  constructor(
    private authService: AuthService,
    private entrepriseAuthService: EntrepriseAuthService,
    private router: Router
  ) {}

  canActivate(): boolean {
    const isConducteurLoggedIn = this.authService.isLoggedIn();
    const isEntrepriseLoggedIn = this.entrepriseAuthService.isLoggedIn();
    
    console.log('RedirectGuard - Conducteur logged in:', isConducteurLoggedIn);
    console.log('RedirectGuard - Entreprise logged in:', isEntrepriseLoggedIn);
    console.log('RedirectGuard - Current entreprise:', this.entrepriseAuthService.getCurrentEntreprise());
    
    if (isConducteurLoggedIn) {
      // Si un conducteur est connecté, rediriger vers l'espace conducteur
      console.log('Redirecting to conducteur tabs');
      this.router.navigate(['/tabs']);
      return false;
    } else if (isEntrepriseLoggedIn) {
      // Si une entreprise est connectée, rediriger vers l'espace entreprise
      console.log('Redirecting to entreprise dashboard');
      this.router.navigate(['/entreprise/dashboard']);
      return false;
    } else {
      // Si personne n'est connecté, permettre l'accès à la page de sélection
      console.log('No one logged in, allowing access to user-type-selection');
      return true;
    }
  }
}