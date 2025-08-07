import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SupabaseService } from './supabase.service';

export interface Entreprise {
  id: string;
  nom: string;
  siret?: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  responsable?: string;
  password_hash?: string;
  first_login?: boolean;
  actif?: boolean;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EntrepriseAuthService {
  private currentEntrepriseSubject = new BehaviorSubject<Entreprise | null>(null);
  public currentEntreprise$ = this.currentEntrepriseSubject.asObservable();

  constructor(private supabaseService: SupabaseService) {
    this.loadStoredEntreprise();
  }

  private loadStoredEntreprise() {
    try {
      if (typeof Storage !== 'undefined') {
        const stored = localStorage.getItem('currentEntreprise');
        if (stored) {
          const entreprise = JSON.parse(stored);
          this.currentEntrepriseSubject.next(entreprise);
        }
      }
    } catch (error) {
      console.error('Error loading stored entreprise:', error);
      try {
        localStorage.removeItem('currentEntreprise');
      } catch (e) {
        // Ignore localStorage errors
      }
    }
  }

  async login(email: string, password?: string): Promise<{ success: boolean; needsPassword?: boolean; entreprise?: Entreprise }> {
    try {
      // Vérifier d'abord si c'est une première connexion
      const firstLoginCheck = await this.supabaseService.checkFirstLogin(email);
      
      if (firstLoginCheck.needsPassword) {
        // Stocker temporairement l'entreprise pour la création de mot de passe
        this.currentEntrepriseSubject.next(firstLoginCheck.entreprise!);
        
        return { 
          success: false, 
          needsPassword: true, 
          entreprise: firstLoginCheck.entreprise 
        };
      }

      // Procéder à l'authentification normale
      const entreprise = await this.supabaseService.authenticateEntreprise(email, password);
      
      if (entreprise) {
        this.currentEntrepriseSubject.next(entreprise);
        
        try {
          if (typeof Storage !== 'undefined') {
            localStorage.setItem('currentEntreprise', JSON.stringify(entreprise));
          }
        } catch (storageError) {
          console.warn('Could not save to localStorage:', storageError);
        }
        
        return { success: true };
      }
      
      return { success: false };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false };
    }
  }

  async createPassword(entrepriseId: string, newPassword: string): Promise<boolean> {
    try {
      const success = await this.supabaseService.createEntreprisePassword(entrepriseId, newPassword);
      
      if (success) {
        // Récupérer l'entreprise mise à jour
        const currentEntreprise = this.currentEntrepriseSubject.value;
        console.log('Current entreprise before update:', currentEntreprise);
        
        const loginIdentifier = currentEntreprise?.email || '';
        console.log('Login identifier for re-auth:', loginIdentifier);
        
        const entreprise = await this.supabaseService.authenticateEntreprise(
          loginIdentifier,
          newPassword
        );
        
        console.log('Re-authenticated entreprise:', entreprise);
        
        if (entreprise) {
          this.currentEntrepriseSubject.next(entreprise);
          
          try {
            if (typeof Storage !== 'undefined') {
              localStorage.setItem('currentEntreprise', JSON.stringify(entreprise));
              console.log('Entreprise saved to localStorage');
            }
          } catch (storageError) {
            console.warn('Could not save to localStorage:', storageError);
          }
        } else {
          console.error('Failed to re-authenticate after password creation');
        }
      }
      
      return success;
    } catch (error) {
      console.error('Create password error:', error);
      return false;
    }
  }

  logout() {
    this.currentEntrepriseSubject.next(null);
    try {
      if (typeof Storage !== 'undefined') {
        localStorage.removeItem('currentEntreprise');
      }
    } catch (error) {
      console.warn('Could not clear localStorage:', error);
    }
  }

  isLoggedIn(): boolean {
    return this.currentEntrepriseSubject.value !== null;
  }

  getCurrentEntreprise(): Entreprise | null {
    return this.currentEntrepriseSubject.value;
  }

  getCurrentEntrepriseId(): string | null {
    const entreprise = this.getCurrentEntreprise();
    return entreprise ? entreprise.id : null;
  }

  /**
   * Écouter les changements d'état d'authentification
   */
  onAuthStateChanged(callback: (isAuthenticated: boolean) => void): void {
    this.currentEntreprise$.subscribe(entreprise => {
      callback(entreprise !== null);
    });
  }
}