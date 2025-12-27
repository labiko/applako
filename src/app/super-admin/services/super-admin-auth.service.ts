/**
 * SERVICE D'AUTHENTIFICATION SUPER-ADMIN
 * Sécurité enterprise-grade avec isolation complète
 * Pas de dépendance vers modules conducteur/entreprise
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SupabaseService } from '../../services/supabase.service';
import {
  SuperAdminUser,
  SuperAdminSession,
  AuditLog,
  SecurityEvent,
  ApiResponse
} from '../models/super-admin.model';
import * as bcrypt from 'bcryptjs';

@Injectable({
  providedIn: 'root'
})
export class SuperAdminAuthService {
  
  private currentUserSubject = new BehaviorSubject<SuperAdminUser | null>(null);
  private sessionSubject = new BehaviorSubject<SuperAdminSession | null>(null);
  
  // Observables publics
  public currentUser$ = this.currentUserSubject.asObservable();
  public session$ = this.sessionSubject.asObservable();
  
  // Sécurité
  private sessionTimeoutMs = 3600000; // 1 heure
  private maxLoginAttempts = 3;
  private sessionTimer?: NodeJS.Timeout;
  private loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
  
  constructor(private supabaseService: SupabaseService) {
    this.initializeSession();
  }

  // ============================================================================
  // INITIALISATION ET GESTION SESSION
  // ============================================================================

  private async initializeSession(): Promise<void> {
    try {
      const savedSession = localStorage.getItem('super_admin_session');
      if (savedSession) {
        const session: SuperAdminSession = JSON.parse(savedSession);
        
        // Vérifier validité session
        if (await this.validateSession(session)) {
          await this.loadUserData(session.user_id);
          this.sessionSubject.next(session);
          this.startSessionTimer();
        } else {
          await this.clearSession();
        }
      }
    } catch (error) {
      console.error('❌ Erreur initialisation session super-admin:', error);
      await this.clearSession();
    }
  }

  private async validateSession(session: SuperAdminSession): Promise<boolean> {
    try {
      const now = Date.now();
      const lastActivity = new Date(session.last_activity).getTime();
      
      // Vérifier timeout
      if (now - lastActivity > this.sessionTimeoutMs) {
        console.warn('⚠️ Session super-admin expirée (timeout)');
        return false;
      }

      // Vérifier utilisateur existe et est toujours super-admin
      const { data: userData, error } = await this.supabaseService.client
        .from('entreprises')
        .select('id, nom, email, is_admin, actif')
        .eq('id', session.user_id)
        .eq('is_admin', true)
        .eq('actif', true)
        .single();

      if (error || !userData) {
        console.warn('⚠️ Utilisateur super-admin non trouvé ou droits révoqués');
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Erreur validation session:', error);
      return false;
    }
  }

  private async loadUserData(userId: string): Promise<void> {
    try {
      const { data: userData, error } = await this.supabaseService.client
        .from('entreprises')
        .select('*')
        .eq('id', userId)
        .eq('is_admin', true)
        .eq('actif', true)
        .single();

      if (error || !userData) {
        throw new Error('Utilisateur super-admin non trouvé');
      }

      this.currentUserSubject.next(userData);
    } catch (error) {
      console.error('❌ Erreur chargement données utilisateur:', error);
      throw error;
    }
  }

  // ============================================================================
  // AUTHENTIFICATION
  // ============================================================================

  async loginSuperAdmin(email: string, password: string): Promise<ApiResponse<SuperAdminUser>> {
    try {
      // 1. Vérifier rate limiting
      const rateLimitCheck = this.checkLoginRateLimit(email);
      if (!rateLimitCheck.allowed) {
        return {
          success: false,
          error: rateLimitCheck.reason || 'Trop de tentatives de connexion'
        };
      }

      // 2. Log tentative de connexion
      await this.logSecurityEvent('FAILED_LOGIN', email, {
        step: 'attempt',
        ip: await this.getClientIp(),
        user_agent: navigator.userAgent
      }, 'MEDIUM');

      // 3. Authentification directe avec table entreprises (pas Supabase Auth)
      // D'abord récupérer l'utilisateur par email
      const { data: userData, error: userError } = await this.supabaseService.client
        .from('entreprises')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .eq('is_admin', true)
        .eq('actif', true)
        .single();

      if (userError || !userData) {
        this.recordFailedLogin(email);

        await this.logSecurityEvent('FAILED_LOGIN', email, {
          step: 'user_not_found',
          error: userError?.message || 'User not found',
          ip: await this.getClientIp()
        }, 'HIGH');

        return {
          success: false,
          error: 'Email ou mot de passe incorrect'
        };
      }

      // 4. Vérifier le mot de passe avec bcrypt
      const isPasswordValid = userData.password_hash && bcrypt.compareSync(password, userData.password_hash);

      if (!isPasswordValid) {
        this.recordFailedLogin(email);

        await this.logSecurityEvent('FAILED_LOGIN', email, {
          step: 'invalid_password',
          ip: await this.getClientIp()
        }, 'HIGH');

        return {
          success: false,
          error: 'Email ou mot de passe incorrect'
        };
      }

      console.log('✅ Super-admin trouvé dans la base:', {
        id: userData.id,
        nom: userData.nom,
        email: userData.email,
        is_admin: userData.is_admin
      });

      // 5. Créer session sécurisée
      const session = await this.createSecureSession(userData);
      
      // 6. Sauvegarder session
      localStorage.setItem('super_admin_session', JSON.stringify(session));
      this.currentUserSubject.next(userData);
      this.sessionSubject.next(session);
      
      // 7. Démarrer timer session
      this.startSessionTimer();

      // 8. Reset compteur échecs
      this.loginAttempts.delete(email);

      // 9. Log succès
      await this.logAuditAction('LOGIN', 'SESSION', session.session_id, {}, {
        user_id: userData.id,
        session_id: session.session_id,
        ip: session.ip_address,
        user_agent: session.user_agent
      }, 'MEDIUM');

      return {
        success: true,
        data: userData,
        message: 'Connexion super-admin réussie'
      };

    } catch (error) {
      console.error('❌ Erreur login super-admin:', error);
      
      await this.logSecurityEvent('FAILED_LOGIN', email, {
        step: 'system_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        ip: await this.getClientIp()
      }, 'HIGH');

      return {
        success: false,
        error: 'Erreur système - Veuillez réessayer'
      };
    }
  }

  private async createSecureSession(userData: SuperAdminUser): Promise<SuperAdminSession> {
    const now = new Date().toISOString();
    const sessionId = this.generateSecureSessionId();
    const clientIp = await this.getClientIp();

    return {
      user_id: userData.id,
      nom: userData.nom,
      email: userData.email,
      session_id: sessionId,
      login_time: now,
      last_activity: now,
      ip_address: clientIp,
      user_agent: navigator.userAgent
    };
  }

  private generateSecureSessionId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2);
    const userPart = Math.random().toString(36).substring(2);
    return `sa_${timestamp}_${randomPart}_${userPart}`;
  }

  // ============================================================================
  // DÉCONNEXION
  // ============================================================================

  async logoutSuperAdmin(): Promise<void> {
    try {
      const currentSession = this.sessionSubject.value;
      const currentUser = this.currentUserSubject.value;

      if (currentSession && currentUser) {
        // Log déconnexion
        await this.logAuditAction('LOGOUT', 'SESSION', currentSession.session_id, {
          session_id: currentSession.session_id,
          login_duration: Date.now() - new Date(currentSession.login_time).getTime()
        }, {
          logout_time: new Date().toISOString(),
          logout_type: 'manual'
        }, 'LOW');
      }

      // Nettoyer session
      await this.clearSession();
      
      // Pas de déconnexion Supabase Auth nécessaire (authentification directe)
      console.log('✅ Déconnexion super-admin réussie');
    } catch (error) {
      console.error('❌ Erreur déconnexion super-admin:', error);
      // Force le nettoyage même en cas d'erreur
      await this.clearSession();
    }
  }

  private async clearSession(): Promise<void> {
    // Arrêter timer
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = undefined;
    }

    // Nettoyer storage et subjects
    localStorage.removeItem('super_admin_session');
    this.currentUserSubject.next(null);
    this.sessionSubject.next(null);
  }

  // ============================================================================
  // GESTION SESSION ET SÉCURITÉ
  // ============================================================================

  private startSessionTimer(): void {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
    }

    this.sessionTimer = setTimeout(async () => {
      console.warn('⚠️ Session super-admin expirée automatiquement');
      
      const currentSession = this.sessionSubject.value;
      if (currentSession) {
        await this.logAuditAction('LOGOUT', 'SESSION', currentSession.session_id, {}, {
          logout_time: new Date().toISOString(),
          logout_type: 'timeout'
        }, 'MEDIUM');
      }

      await this.clearSession();
    }, this.sessionTimeoutMs);
  }

  async updateSessionActivity(): Promise<void> {
    try {
      const currentSession = this.sessionSubject.value;
      if (!currentSession) return;

      const now = new Date().toISOString();
      const updatedSession = {
        ...currentSession,
        last_activity: now
      };

      localStorage.setItem('super_admin_session', JSON.stringify(updatedSession));
      this.sessionSubject.next(updatedSession);

      // Redémarrer timer
      this.startSessionTimer();
    } catch (error) {
      console.error('❌ Erreur mise à jour activité session:', error);
    }
  }

  private checkLoginRateLimit(email: string): { allowed: boolean; reason?: string } {
    const now = Date.now();
    const attempts = this.loginAttempts.get(email);

    if (!attempts) return { allowed: true };

    // Reset si plus de 15 minutes
    if (now - attempts.lastAttempt > 900000) {
      this.loginAttempts.delete(email);
      return { allowed: true };
    }

    if (attempts.count >= this.maxLoginAttempts) {
      return {
        allowed: false,
        reason: `Trop de tentatives de connexion. Réessayez dans ${Math.ceil((900000 - (now - attempts.lastAttempt)) / 60000)} minutes.`
      };
    }

    return { allowed: true };
  }

  private recordFailedLogin(email: string): void {
    const now = Date.now();
    const current = this.loginAttempts.get(email) || { count: 0, lastAttempt: 0 };
    
    this.loginAttempts.set(email, {
      count: current.count + 1,
      lastAttempt: now
    });
  }

  // ============================================================================
  // UTILITAIRES ET HELPERS
  // ============================================================================

  isSuperAdmin(): boolean {
    const user = this.currentUserSubject.value;
    return user?.is_admin === true && user?.actif === true;
  }

  getCurrentSuperAdmin(): SuperAdminUser | null {
    return this.currentUserSubject.value;
  }

  getCurrentSession(): SuperAdminSession | null {
    return this.sessionSubject.value;
  }

  getSessionTimeRemaining(): number {
    const session = this.sessionSubject.value;
    if (!session) return 0;

    const lastActivity = new Date(session.last_activity).getTime();
    const remaining = this.sessionTimeoutMs - (Date.now() - lastActivity);
    return Math.max(0, remaining);
  }

  private async getClientIp(): Promise<string> {
    try {
      // En production, utiliser un service de géolocalisation IP
      return 'localhost'; // Fallback pour développement
    } catch (error) {
      return 'unknown';
    }
  }

  // ============================================================================
  // AUDIT ET LOGGING
  // ============================================================================

  private async logAuditAction(
    actionType: string,
    entityType: string,
    entityId: string,
    oldValues: any,
    newValues: any,
    impactLevel: string,
    businessImpactGnf: number = 0
  ): Promise<void> {
    try {
      const currentUser = this.currentUserSubject.value;
      const currentSession = this.sessionSubject.value;
      
      if (!currentUser || !currentSession) return;

      await this.supabaseService.client.from('audit_logs').insert({
        user_id: currentUser.id,
        session_id: currentSession.session_id,
        action_type: actionType,
        entity_type: entityType,
        entity_id: entityId,
        old_values: oldValues,
        new_values: newValues,
        ip_address: currentSession.ip_address,
        user_agent: currentSession.user_agent,
        request_method: 'POST',
        request_url: window.location.href,
        impact_level: impactLevel,
        business_impact_gnf: businessImpactGnf
      });

    } catch (error) {
      console.error('❌ Erreur logging audit:', error);
    }
  }

  private async logSecurityEvent(
    type: string,
    userId: string,
    details: any,
    severity: string
  ): Promise<void> {
    try {
      const event: SecurityEvent = {
        type: type as any,
        userId,
        ip: await this.getClientIp(),
        details,
        severity: severity as any,
        timestamp: Date.now()
      };

      console.warn('🔒 Événement sécurité:', event);

      // En production, envoyer à un système de monitoring
      // await this.sendToSecurityMonitoring(event);

    } catch (error) {
      console.error('❌ Erreur log sécurité:', error);
    }
  }

  // ============================================================================
  // VÉRIFICATIONS DE SÉCURITÉ
  // ============================================================================

  async checkUserStillAuthorized(): Promise<boolean> {
    try {
      const currentUser = this.currentUserSubject.value;
      if (!currentUser) return false;

      const { data, error } = await this.supabaseService.client
        .from('entreprises')
        .select('is_admin, actif')
        .eq('id', currentUser.id)
        .single();

      if (error || !data || !data.is_admin || !data.actif) {
        console.warn('⚠️ Droits super-admin révoqués ou compte désactivé');
        await this.logoutSuperAdmin();
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Erreur vérification autorisation:', error);
      return false;
    }
  }

  async refreshUserData(): Promise<SuperAdminUser | null> {
    try {
      const currentUser = this.currentUserSubject.value;
      if (!currentUser) return null;

      await this.loadUserData(currentUser.id);
      return this.currentUserSubject.value;
    } catch (error) {
      console.error('❌ Erreur refresh données utilisateur:', error);
      return null;
    }
  }

  // ============================================================================  
  // NETTOYAGE
  // ============================================================================

  destroy(): void {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
    }
    this.loginAttempts.clear();
  }
}