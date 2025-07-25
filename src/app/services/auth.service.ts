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
    const stored = localStorage.getItem('currentConducteur');
    if (stored) {
      try {
        const conducteur = JSON.parse(stored);
        this.currentConducteurSubject.next(conducteur);
      } catch (error) {
        console.error('Error parsing stored conducteur:', error);
        localStorage.removeItem('currentConducteur');
      }
    }
  }

  async login(telephone: string, password: string): Promise<boolean> {
    try {
      const conducteur = await this.supabaseService.authenticateConducteur(telephone, password);
      
      if (conducteur) {
        this.currentConducteurSubject.next(conducteur);
        localStorage.setItem('currentConducteur', JSON.stringify(conducteur));
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
    localStorage.removeItem('currentConducteur');
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
}