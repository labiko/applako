/**
 * GUARD DE PROTECTION SUPER-ADMIN
 * Sécurité renforcée avec vérifications multiples
 * Architecture isolée - Pas de dépendance autres modules
 */

import { Injectable } from '@angular/core';
import { 
  CanActivate, 
  CanActivateChild,
  ActivatedRouteSnapshot, 
  RouterStateSnapshot, 
  Router 
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { SuperAdminAuthService } from '../services/super-admin-auth.service';

@Injectable({
  providedIn: 'root'
})
export class SuperAdminGuard implements CanActivate, CanActivateChild {

  constructor(
    private superAdminAuth: SuperAdminAuthService,
    private router: Router
  ) {}

  // ============================================================================
  // PROTECTION ROUTE PRINCIPALE
  // ============================================================================

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.checkSuperAdminAccess(state.url);
  }

  canActivateChild(
    childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.checkSuperAdminAccess(state.url);
  }

  // ============================================================================
  // VÉRIFICATIONS SÉCURISÉES
  // ============================================================================

  private async checkSuperAdminAccess(url: string): Promise<boolean> {
    try {
      console.log(`🔒 Vérification accès super-admin pour: ${url}`);

      // 1. Vérifier session active
      const currentUser = this.superAdminAuth.getCurrentSuperAdmin();
      if (!currentUser) {
        console.warn('🚫 Aucune session super-admin active');
        await this.redirectToLogin(url);
        return false;
      }

      // 2. Vérifier droits super-admin
      if (!currentUser.is_admin || !currentUser.actif) {
        console.warn('🚫 Utilisateur sans droits super-admin ou compte inactif');
        await this.handleUnauthorizedAccess(currentUser.id, url, 'INSUFFICIENT_PRIVILEGES');
        return false;
      }

      // 3. Vérifier validité session
      const session = this.superAdminAuth.getCurrentSession();
      if (!session) {
        console.warn('🚫 Session super-admin invalide');
        await this.redirectToLogin(url);
        return false;
      }

      // 4. Vérifier timeout session
      const timeRemaining = this.superAdminAuth.getSessionTimeRemaining();
      if (timeRemaining <= 0) {
        console.warn('🚫 Session super-admin expirée');
        await this.handleSessionExpired(session.session_id, url);
        return false;
      }

      // 5. Vérifier autorisation en temps réel (sécurité renforcée)
      const stillAuthorized = await this.superAdminAuth.checkUserStillAuthorized();
      if (!stillAuthorized) {
        console.warn('🚫 Droits super-admin révoqués');
        await this.handleUnauthorizedAccess(currentUser.id, url, 'PRIVILEGES_REVOKED');
        return false;
      }

      // 6. Mettre à jour activité session
      await this.superAdminAuth.updateSessionActivity();

      // 7. Vérifications spécifiques par route (optionnel)
      const routeAccess = this.checkRouteSpecificAccess(url, currentUser);
      if (!routeAccess.allowed) {
        console.warn(`🚫 Accès route refusé: ${routeAccess.reason}`);
        await this.handleUnauthorizedAccess(currentUser.id, url, 'ROUTE_SPECIFIC_DENIAL');
        return false;
      }

      // 8. Log accès réussi (audit trail)
      await this.logSuccessfulAccess(currentUser.id, session.session_id, url);

      console.log(`✅ Accès super-admin autorisé pour: ${url}`);
      return true;

    } catch (error) {
      console.error('❌ Erreur vérification accès super-admin:', error);
      await this.handleSystemError(url, error);
      return false;
    }
  }

  // ============================================================================
  // VÉRIFICATIONS SPÉCIFIQUES PAR ROUTE
  // ============================================================================

  private checkRouteSpecificAccess(
    url: string, 
    user: any
  ): { allowed: boolean; reason?: string } {
    
    // Routes ultra-sensibles nécessitant des vérifications supplémentaires
    const sensitiveRoutes = [
      '/super-admin/commissions/global',
      '/super-admin/enterprises/suspend',
      '/super-admin/backup/restore',
      '/super-admin/maintenance'
    ];

    // Pour les routes sensibles, vérifier critères additionnels
    if (sensitiveRoutes.some(route => url.includes(route))) {
      
      // Exemple: vérifier âge du compte super-admin
      const accountAge = this.calculateAccountAge(user.created_at);
      if (accountAge < 30) { // Moins de 30 jours
        return {
          allowed: false,
          reason: 'Compte super-admin trop récent pour actions sensibles'
        };
      }

      // Exemple: vérifier dernière activité récente
      const session = this.superAdminAuth.getCurrentSession();
      if (session) {
        const timeSinceLogin = Date.now() - new Date(session.login_time).getTime();
        if (timeSinceLogin > 1800000) { // Plus de 30 minutes
          return {
            allowed: false,
            reason: 'Ré-authentification requise pour actions sensibles'
          };
        }
      }
    }

    // Routes de lecture seule - moins restrictives
    const readOnlyRoutes = [
      '/super-admin/dashboard',
      '/super-admin/enterprises/view',
      '/super-admin/reservations/view'
    ];

    if (readOnlyRoutes.some(route => url.includes(route))) {
      // Accès plus permissif pour consultation
      return { allowed: true };
    }

    // Par défaut, autoriser l'accès
    return { allowed: true };
  }

  // ============================================================================
  // GESTION DES ERREURS ET REDIRECTIONS
  // ============================================================================

  private async redirectToLogin(attemptedUrl: string): Promise<void> {
    try {
      // Sauvegarder URL tentée pour redirection post-login
      sessionStorage.setItem('super_admin_redirect_url', attemptedUrl);
      
      // Rediriger vers login super-admin
      await this.router.navigate(['/super-admin/login']);
      
      console.log(`🔄 Redirection vers login super-admin (URL tentée: ${attemptedUrl})`);
    } catch (error) {
      console.error('❌ Erreur redirection login:', error);
      // Fallback vers page d'accueil
      await this.router.navigate(['/']);
    }
  }

  private async handleUnauthorizedAccess(
    userId: string, 
    attemptedUrl: string, 
    reason: string
  ): Promise<void> {
    try {
      // Log événement sécurité
      console.warn(`🚨 Tentative accès non autorisé: ${reason}`, {
        userId,
        attemptedUrl,
        timestamp: new Date().toISOString()
      });

      // En production, envoyer alerte sécurité
      // await this.sendSecurityAlert('UNAUTHORIZED_ACCESS', { userId, attemptedUrl, reason });

      // Déconnecter l'utilisateur par sécurité
      await this.superAdminAuth.logoutSuperAdmin();
      
      // Rediriger vers page d'erreur ou login
      await this.router.navigate(['/super-admin/login'], {
        queryParams: { 
          error: 'unauthorized',
          reason: reason
        }
      });

    } catch (error) {
      console.error('❌ Erreur gestion accès non autorisé:', error);
    }
  }

  private async handleSessionExpired(
    sessionId: string, 
    attemptedUrl: string
  ): Promise<void> {
    try {
      console.warn(`⏰ Session super-admin expirée: ${sessionId}`);

      // Log expiration session
      // await this.logSessionExpired(sessionId, attemptedUrl);

      // Nettoyer session expirée
      await this.superAdminAuth.logoutSuperAdmin();

      // Rediriger avec message d'expiration
      await this.router.navigate(['/super-admin/login'], {
        queryParams: { 
          expired: 'true',
          redirect: attemptedUrl
        }
      });

    } catch (error) {
      console.error('❌ Erreur gestion session expirée:', error);
    }
  }

  private async handleSystemError(
    attemptedUrl: string, 
    error: any
  ): Promise<void> {
    try {
      console.error('🚨 Erreur système lors vérification accès:', error);

      // Log erreur système
      // await this.logSystemError('GUARD_ERROR', error, attemptedUrl);

      // Rediriger vers page d'erreur
      await this.router.navigate(['/super-admin/login'], {
        queryParams: { 
          error: 'system',
          message: 'Erreur système - Veuillez réessayer'
        }
      });

    } catch (redirectError) {
      console.error('❌ Erreur redirection après erreur système:', redirectError);
      // Fallback ultime
      window.location.href = '/';
    }
  }

  // ============================================================================
  // UTILITAIRES ET HELPERS
  // ============================================================================

  private calculateAccountAge(createdAt: string): number {
    try {
      const created = new Date(createdAt);
      const now = new Date();
      const diffTime = now.getTime() - created.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch (error) {
      return 0;
    }
  }

  private async logSuccessfulAccess(
    userId: string, 
    sessionId: string, 
    url: string
  ): Promise<void> {
    try {
      // Log audit d'accès réussi (niveau LOW pour ne pas polluer)
      const auditData = {
        user_id: userId,
        session_id: sessionId,
        url: url,
        timestamp: new Date().toISOString(),
        ip: await this.getClientIp(),
        user_agent: navigator.userAgent
      };

      console.log('📝 Accès super-admin enregistré:', auditData);

      // En production, envoyer vers service d'audit
      // await this.auditService.logAccess(auditData);

    } catch (error) {
      console.error('❌ Erreur log accès:', error);
      // Ne pas bloquer l'accès pour erreur de logging
    }
  }

  private async getClientIp(): Promise<string> {
    try {
      // En production, utiliser service de géolocalisation IP
      return 'localhost'; // Fallback développement
    } catch (error) {
      return 'unknown';
    }
  }

  // ============================================================================
  // MÉTHODES PUBLIQUES UTILITAIRES
  // ============================================================================

  /**
   * Vérifier rapidement si l'utilisateur a accès super-admin
   * Utilisé par composants pour afficher/masquer fonctionnalités
   */
  public hasSupaAdminAccess(): boolean {
    try {
      const user = this.superAdminAuth.getCurrentSuperAdmin();
      const session = this.superAdminAuth.getCurrentSession();
      const timeRemaining = this.superAdminAuth.getSessionTimeRemaining();

      return !!(
        user && 
        user.is_admin && 
        user.actif && 
        session && 
        timeRemaining > 0
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Vérifier accès à une route spécifique sans redirection
   * Utilisé pour désactiver boutons/liens conditionnellement
   */
  public canAccessRoute(url: string): boolean {
    try {
      if (!this.hasSupaAdminAccess()) return false;

      const user = this.superAdminAuth.getCurrentSuperAdmin();
      if (!user) return false;

      const routeCheck = this.checkRouteSpecificAccess(url, user);
      return routeCheck.allowed;
    } catch (error) {
      return false;
    }
  }

  /**
   * Obtenir le temps restant de session en format lisible
   */
  public getSessionTimeRemainingFormatted(): string {
    try {
      const timeMs = this.superAdminAuth.getSessionTimeRemaining();
      const minutes = Math.floor(timeMs / 60000);
      const seconds = Math.floor((timeMs % 60000) / 1000);
      
      if (minutes > 0) {
        return `${minutes}min ${seconds}s`;
      } else {
        return `${seconds}s`;
      }
    } catch (error) {
      return '0s';
    }
  }
}