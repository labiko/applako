/**
 * UTILITAIRES BLOCAGE
 * Fonctions utilitaires pour le système de blocage sans dépendances
 */

export class BlocageUtils {
  
  static getBlockedByLabel(bloquePar: string): string {
    switch (bloquePar) {
      case 'super-admin':
        return 'Administrateur système';
      case 'super-admin-entreprise':
        return 'Administrateur (désactivation entreprise)';
      case 'entreprise':
        return 'Votre entreprise';
      default:
        return 'Non spécifié';
    }
  }

  static getRaisonBlocageOptions(): { value: string; label: string }[] {
    return [
      { value: 'comportement', label: 'Comportement inapproprié' },
      { value: 'documents', label: 'Documents expirés ou invalides' },
      { value: 'demande_entreprise', label: 'Demande de l\'entreprise' },
      { value: 'absence', label: 'Absence non justifiée' },
      { value: 'temporaire', label: 'Blocage temporaire' },
      { value: 'autre', label: 'Autre raison' }
    ];
  }

  static getMotifBlocage(conducteur: any): string {
    if (conducteur.actif) return 'Actif';
    
    const bloquePar = this.getBlockedByLabel(conducteur.bloque_par || '');
    return `Bloqué (${bloquePar})`;
  }

  static canDebloquerConducteur(conducteur: any): boolean {
    return !conducteur.actif && conducteur.bloque_par;
  }

  static canEntrepriseUnblock(conducteur: any): boolean {
    // L'entreprise peut débloquer seulement si elle a bloqué
    return conducteur.bloque_par === 'entreprise';
  }

  static canSuperAdminUnblock(conducteur: any): boolean {
    // Super-admin peut tout débloquer
    return true;
  }
}