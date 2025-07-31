import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SupabaseService } from './supabase.service';

export interface Conducteur {
  id: string;
  telephone: string;
  nom?: string;
  prenom?: string;
  email?: string;
  vehicule_type?: string;
  statut?: string;
  position_actuelle?: string; // Position GPS du conducteur
  date_update_position?: string; // Date de dernière mise à jour position
  derniere_activite?: string; // Dernière activité (timezone)
  hors_ligne?: boolean; // Statut en ligne/hors ligne
  accuracy?: number; // Précision GPS en mètres
  date_inscription?: string; // Date d'inscription du conducteur
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentConducteurSubject = new BehaviorSubject<Conducteur | null>(null);
  public currentConducteur$ = this.currentConducteurSubject.asObservable();

  constructor(private supabaseService: SupabaseService) {
    this.loadStoredConducteur();
  }

  private loadStoredConducteur() {
    try {
      if (typeof Storage !== 'undefined') {
        const stored = localStorage.getItem('currentConducteur');
        if (stored) {
          const conducteur = JSON.parse(stored);
          this.currentConducteurSubject.next(conducteur);
        }
      }
    } catch (error) {
      console.error('Error loading stored conducteur:', error);
      try {
        localStorage.removeItem('currentConducteur');
      } catch (e) {
        // Ignore localStorage errors
      }
    }
  }

  async login(telephone: string, password: string): Promise<boolean> {
    try {
      const conducteur = await this.supabaseService.authenticateConducteur(telephone, password);
      
      if (conducteur) {
        this.currentConducteurSubject.next(conducteur);
        
        try {
          if (typeof Storage !== 'undefined') {
            localStorage.setItem('currentConducteur', JSON.stringify(conducteur));
          }
        } catch (storageError) {
          console.warn('Could not save to localStorage:', storageError);
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }

  logout() {
    this.currentConducteurSubject.next(null);
    try {
      if (typeof Storage !== 'undefined') {
        localStorage.removeItem('currentConducteur');
      }
    } catch (error) {
      console.warn('Could not clear localStorage:', error);
    }
  }

  isLoggedIn(): boolean {
    return this.currentConducteurSubject.value !== null;
  }

  getCurrentConducteur(): Conducteur | null {
    return this.currentConducteurSubject.value;
  }

  getCurrentConducteurId(): string | null {
    const conducteur = this.getCurrentConducteur();
    return conducteur ? conducteur.id : null;
  }

  getCurrentConducteurPosition(): string | null {
    const conducteur = this.getCurrentConducteur();
    return conducteur ? conducteur.position_actuelle || null : null;
  }
}