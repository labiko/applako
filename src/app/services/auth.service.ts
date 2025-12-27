import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SupabaseService } from './supabase.service';
import * as bcrypt from 'bcryptjs';

export interface Conducteur {
  id: string;
  telephone: string;
  nom?: string;
  prenom?: string;
  email?: string;
  vehicule_type?: string; // Nom legacy pour compatibilité
  vehicle_type?: string;
  vehicle_marque?: string;
  vehicle_modele?: string;
  vehicle_couleur?: string;
  vehicle_plaque?: string;
  note_moyenne?: number;
  statut?: string;
  position_actuelle?: string; // Position GPS du conducteur
  date_update_position?: string; // Date de dernière mise à jour position
  
  // Champs de blocage (système de blocage)
  actif?: boolean;
  motif_blocage?: string;
  date_blocage?: string;
  bloque_par?: 'entreprise' | 'super-admin' | 'super-admin-entreprise';
  derniere_activite?: string; // Dernière activité (timezone)
  hors_ligne?: boolean; // Statut en ligne/hors ligne
  accuracy?: number; // Précision GPS en mètres
  date_inscription?: string; // Date d'inscription du conducteur
  rayon_km_reservation?: number; // Rayon de recherche personnalisé en km
  first_login?: boolean; // Indicateur de première connexion (réinitialisation password)
  password?: string; // Mot de passe
  entreprise_id?: string; // ID de l'entreprise du conducteur
  entreprise_nom?: string; // Nom de l'entreprise du conducteur
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
    console.log('🔄 loadStoredConducteur() - Vérification cache au démarrage...');
    try {
      if (typeof Storage !== 'undefined') {
        const stored = localStorage.getItem('currentConducteur');
        console.log('🗂️ localStorage currentConducteur:', stored ? 'TROUVÉ' : 'VIDE');
        if (stored) {
          const conducteur = JSON.parse(stored);
          console.log('👤 Conducteur rechargé depuis cache:', conducteur.prenom, conducteur.nom, conducteur.id);
          this.currentConducteurSubject.next(conducteur);
          console.log('✅ currentConducteurSubject restauré depuis cache');
        } else {
          console.log('✅ Aucun cache trouvé - démarrage propre');
        }
      }
    } catch (error) {
      console.error('❌ Erreur chargement cache conducteur:', error);
      try {
        localStorage.removeItem('currentConducteur');
        console.log('🧹 Cache corrompu supprimé');
      } catch (e) {
        console.error('❌ Impossible de supprimer cache corrompu:', e);
      }
    }
  }

  async login(telephone: string, password: string): Promise<boolean | { blocked: true, motif: string, bloque_par: string } | { requirePasswordReset: true, conducteurId: string, message: string }> {
    try {
      // Récupérer le conducteur avec ses infos de connexion
      const { data: conducteur, error } = await this.supabaseService.client
        .from('conducteurs')
        .select('*')
        .eq('telephone', telephone)
        .single();

      if (error || !conducteur) {
        console.log('❌ Conducteur non trouvé:', telephone);
        return false;
      }

      // Vérifier si c'est une première connexion après réinitialisation
      if (conducteur.first_login || !conducteur.password) {
        console.log('🔒 Première connexion détectée pour:', telephone);
        return {
          requirePasswordReset: true,
          conducteurId: conducteur.id,
          message: conducteur.first_login 
            ? 'Votre mot de passe a été réinitialisé. Veuillez créer un nouveau mot de passe.'
            : 'Veuillez définir votre mot de passe pour votre première connexion.'
        };
      }

      // Authentification normale avec le mot de passe
      console.log('🔐 Tentative authentification pour:', telephone);
      const authenticatedConducteur = await this.supabaseService.authenticateConducteur(telephone, password);
      console.log('👤 Conducteur authentifié:', authenticatedConducteur);
      
      if (authenticatedConducteur) {
        // Vérifier si le conducteur est bloqué AVANT de l'authentifier
        if (!authenticatedConducteur.actif) {
          console.log('🚫 Tentative de connexion conducteur bloqué:', authenticatedConducteur);
          console.log('🔍 Motif de blocage:', authenticatedConducteur.motif_blocage);
          console.log('🔍 Bloqué par:', authenticatedConducteur.bloque_par);
          
          // Retourner les informations de blocage pour affichage
          return {
            blocked: true,
            motif: authenticatedConducteur.motif_blocage || 'Non spécifié',
            bloque_par: authenticatedConducteur.bloque_par || 'Administration'
          };
        }
        
        console.log('💾 Sauvegarde nouveau conducteur dans cache...');
        this.currentConducteurSubject.next(authenticatedConducteur);
        console.log('✅ currentConducteurSubject mis à jour');
        
        try {
          if (typeof Storage !== 'undefined') {
            localStorage.setItem('currentConducteur', JSON.stringify(authenticatedConducteur));
            console.log('✅ localStorage mis à jour avec nouveau conducteur');
          }
        } catch (storageError) {
          console.warn('❌ Erreur sauvegarde localStorage:', storageError);
        }
        
        console.log('✅ LOGIN RÉUSSI pour:', authenticatedConducteur.prenom, authenticatedConducteur.nom);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }

  async logout() {
    console.log('🚪 DÉBUT LOGOUT - Conducteur actuel:', this.currentConducteurSubject.value);
    console.log('🗂️ localStorage AVANT clear:', Object.keys(localStorage));
    
    // 1. Vider le cache Observable
    this.currentConducteurSubject.next(null);
    console.log('✅ currentConducteurSubject vidé');
    
    // 2. Vider localStorage complètement
    localStorage.clear();
    console.log('✅ localStorage vidé');
    console.log('🗂️ localStorage APRÈS clear:', Object.keys(localStorage));
    
    // 3. Déconnexion Supabase
    try {
      await this.supabaseService.client.auth.signOut();
      console.log('✅ Session Supabase fermée');
    } catch (error) {
      console.error('❌ Erreur fermeture session Supabase:', error);
    }
    
    console.log('🚪 FIN LOGOUT - Conducteur actuel:', this.currentConducteurSubject.value);
    console.log('🔍 isLoggedIn():', this.isLoggedIn());
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

  // Mettre à jour le mot de passe (changement depuis profil) avec bcrypt
  async updatePassword(conducteurId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Récupérer le conducteur pour vérifier l'ancien mot de passe
      const { data: conducteur, error: fetchError } = await this.supabaseService.client
        .from('conducteurs')
        .select('id, password, telephone')
        .eq('id', conducteurId)
        .single();

      if (fetchError || !conducteur) {
        return { success: false, error: 'Conducteur non trouvé' };
      }

      // Vérifier que l'ancien mot de passe est correct avec bcrypt
      if (!conducteur.password || !bcrypt.compareSync(currentPassword, conducteur.password)) {
        return { success: false, error: 'Mot de passe actuel incorrect' };
      }

      // Hasher le nouveau mot de passe avec bcrypt
      const hashedPassword = bcrypt.hashSync(newPassword, 10);

      // Mettre à jour avec le nouveau mot de passe hashé
      const { error: updateError } = await this.supabaseService.client
        .from('conducteurs')
        .update({
          password: hashedPassword,
          derniere_activite: new Date().toISOString()
        })
        .eq('id', conducteurId);

      if (updateError) {
        return { success: false, error: 'Erreur lors de la mise à jour' };
      }

      console.log('✅ Mot de passe mis à jour avec succès pour conducteur:', conducteurId);
      return { success: true };

    } catch (error) {
      console.error('❌ Erreur mise à jour mot de passe:', error);
      return { success: false, error: 'Erreur technique' };
    }
  }

  // Créer un nouveau mot de passe après réinitialisation
  async createNewPassword(conducteurId: string, newPassword: string): Promise<{ success: boolean; error?: any }> {
    try {
      // Récupérer le conducteur pour vérifier qu'il est en first_login
      const { data: conducteur, error: fetchError } = await this.supabaseService.client
        .from('conducteurs')
        .select('*')
        .eq('id', conducteurId)
        .single();

      if (fetchError || !conducteur) {
        throw new Error('Conducteur non trouvé');
      }

      if (!conducteur.first_login && conducteur.password) {
        throw new Error('Ce conducteur n\'est pas en première connexion');
      }

      // Mettre à jour le conducteur avec le nouveau mot de passe
      const { error: updateError } = await this.supabaseService.client
        .from('conducteurs')
        .update({
          password: newPassword,
          first_login: false,
          derniere_activite: new Date().toISOString()
        })
        .eq('id', conducteurId);

      if (updateError) {
        throw updateError;
      }

      console.log('✅ Nouveau mot de passe créé avec succès pour:', conducteur.telephone);
      return { success: true };

    } catch (error) {
      console.error('❌ Erreur création nouveau mot de passe:', error);
      return { success: false, error };
    }
  }
}