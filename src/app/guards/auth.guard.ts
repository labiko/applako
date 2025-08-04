import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { EntrepriseAuthService } from '../services/entreprise-auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  
  constructor(
    private authService: AuthService,
    private entrepriseAuthService: EntrepriseAuthService,
    private router: Router
  ) {}

  canActivate(): boolean {
    const isConducteurLoggedIn = this.authService.isLoggedIn();
    const isEntrepriseLoggedIn = this.entrepriseAuthService.isLoggedIn();
    
    // Si au moins un utilisateur est connecté, permettre l'accès
    if (isConducteurLoggedIn || isEntrepriseLoggedIn) {
      return true;
    } else {
      // Si aucun utilisateur n'est connecté, rediriger vers la page de sélection
      this.router.navigate(['/user-type-selection']);
      return false;
    }
  }
}