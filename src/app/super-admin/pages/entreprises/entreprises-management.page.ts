/**
 * PAGE GESTION DES ENTREPRISES - SUPER-ADMIN
 * Création, modification et gestion des entreprises
 */

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonText,
  IonGrid,
  IonRow,
  IonCol,
  IonItem,
  IonLabel,
  IonInput,
  IonList,
  IonBadge,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonToggle,
  IonModal,
  IonButtons,
  IonAvatar,
  LoadingController,
  ToastController,
  AlertController,
  RefresherCustomEvent
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  arrowBackOutline,
  businessOutline,
  addOutline,
  eyeOutline,
  createOutline,
  trashOutline,
  refreshOutline,
  searchOutline,
  mailOutline,
  callOutline,
  locationOutline,
  location,
  statsChartOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  closeOutline,
  keyOutline,
  peopleOutline,
  cardOutline,
  timeOutline,
  personOutline,
  carOutline,
  downloadOutline,
  star,
  chevronDownOutline,
  flag,
  speedometerOutline,
  lockClosedOutline,
  lockOpenOutline,
  warningOutline,
  banOutline,
  shieldOutline,
  personAddOutline,
  colorPaletteOutline,
  checkmarkOutline
} from 'ionicons/icons';

import { 
  EntrepriseManagementService, 
  Entreprise, 
  CreateEntrepriseData, 
  EntrepriseStats 
} from '../../services/entreprise-management.service';
import { BlocageUtils } from '../../../utils/blocage.utils';
import { BlockageService } from '../../../services/blocage.service';
import { Injector } from '@angular/core';

@Component({
  selector: 'app-entreprises-management',
  templateUrl: './entreprises-management.page.html',
  styleUrls: ['./entreprises-management.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonIcon,
    IonText,
    IonGrid,
    IonRow,
    IonCol,
    IonItem,
    IonLabel,
    IonInput,
    IonList,
    IonBadge,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
    IonSearchbar,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonToggle,
    IonModal,
    IonButtons,
    IonAvatar
  ]
})
export class EntreprisesManagementPage implements OnInit {

  // Données
  entreprises: Entreprise[] = [];
  filteredEntreprises: Entreprise[] = [];
  stats: EntrepriseStats = {
    total_entreprises: 0,
    entreprises_actives: 0,
    entreprises_inactives: 0,
    nouveaux_ce_mois: 0,
    total_conducteurs: 0,
    total_reservations: 0,
    ca_total: 0
  };

  // Recherche
  searchQuery = '';

  // État de l'interface
  isLoading = true;
  
  // Modal de création/modification
  isCreateModalOpen = false;
  editingEntreprise: Entreprise | null = null;
  formData: CreateEntrepriseData = {
    nom: '',
    email: '',
    telephone: '',
    adresse: ''
  };

  // Modal conducteurs
  isConducteursModalOpen = false;
  selectedEntreprise: Entreprise | null = null;
  conducteursList: any[] = [];
  isLoadingConducteurs = false;
  expandedConducteurs: Set<string> = new Set();
  conducteursReservations: Map<string, any[]> = new Map();
  loadingReservations: Set<string> = new Set();

  // Modal ajout conducteur
  isAddConducteurModalOpen = false;
  selectedEntrepriseForAdd: Entreprise | null = null;
  isAddingConducteur = false;
  addConducteurForm = {
    nom: '',
    prenom: '',
    telephone: '',
    vehicle_type: 'voiture',
    vehicle_marque: '',
    vehicle_modele: '',
    vehicle_plaque: ''
  };

  // Modal détails réservation
  isDetailsModalOpen = false;
  selectedReservationDetails: any = null;

  constructor(
    private entrepriseService: EntrepriseManagementService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController,
    private blocageService: BlockageService,
    private changeDetectorRef: ChangeDetectorRef
  ) {
    // Ajouter les icônes
    addIcons({
      arrowBackOutline,
      businessOutline,
      addOutline,
      eyeOutline,
      createOutline,
      trashOutline,
      refreshOutline,
      searchOutline,
      mailOutline,
      callOutline,
      locationOutline,
      location,
      statsChartOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      closeOutline,
      keyOutline,
      peopleOutline,
      cardOutline,
      timeOutline,
      personOutline,
      carOutline,
      downloadOutline,
      star,
      chevronDownOutline,
      flag,
      speedometerOutline,
      lockClosedOutline,
      lockOpenOutline,
      warningOutline,
      banOutline,
      shieldOutline,
      personAddOutline,
      colorPaletteOutline,
      checkmarkOutline
    });
  }

  async ngOnInit() {
    await this.loadData();
  }

  private async loadData() {
    try {
      this.isLoading = true;
      
      // Charger entreprises et statistiques en parallèle
      await Promise.all([
        this.loadEntreprises(),
        this.loadStats()
      ]);
      
    } catch (error) {
      console.error('❌ Erreur chargement données:', error);
      this.showError('Erreur lors du chargement des données');
    } finally {
      this.isLoading = false;
    }
  }

  private async loadEntreprises() {
    const { data, error } = await this.entrepriseService.getAllEntreprises();
    
    if (error) {
      throw error;
    }
    
    this.entreprises = data || [];
    this.applyFilters();
  }

  private async loadStats() {
    const { data, error } = await this.entrepriseService.getEntreprisesStats();
    
    if (error) {
      console.error('❌ Erreur chargement stats:', error);
    } else {
      this.stats = data || this.stats;
    }
  }

  // Event handlers
  async onRefresh(event?: RefresherCustomEvent) {
    await this.loadData();
    if (event) {
      event.target.complete();
    }
  }

  onSearch() {
    this.applyFilters();
  }

  private applyFilters() {
    let filtered = [...this.entreprises];

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(e => 
        e.nom.toLowerCase().includes(query) ||
        e.email.toLowerCase().includes(query) ||
        e.telephone?.toLowerCase().includes(query)
      );
    }

    this.filteredEntreprises = filtered;
  }

  // Actions entreprises
  onCreateEntreprise() {
    this.editingEntreprise = null;
    this.formData = {
      nom: '',
      email: '',
      telephone: '',
      adresse: ''
    };
    this.isCreateModalOpen = true;
  }

  onEditEntreprise(entreprise: Entreprise) {
    this.editingEntreprise = entreprise;
    this.formData = {
      nom: entreprise.nom,
      email: entreprise.email,
      telephone: entreprise.telephone,
      adresse: entreprise.adresse,
      siret: entreprise.siret || undefined,
      responsable: entreprise.responsable || undefined
    };
    this.isCreateModalOpen = true;
  }

  async onSaveEntreprise() {
    if (!this.isFormValid()) {
      this.showError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const loading = await this.loadingController.create({
      message: this.editingEntreprise ? 'Modification...' : 'Création...'
    });
    await loading.present();

    try {
      if (this.editingEntreprise) {
        // Modification
        const { success, error } = await this.entrepriseService.updateEntreprise(
          this.editingEntreprise.id,
          this.formData
        );

        if (!success) {
          throw error;
        }

        this.showSuccess('Entreprise modifiée avec succès');
      } else {
        // Création
        const { data, error } = await this.entrepriseService.createEntreprise(this.formData);

        if (!data) {
          throw error;
        }

        this.showSuccess('Entreprise créée avec succès');
      }

      this.closeCreateModal();
      await this.loadEntreprises();

    } catch (error: any) {
      console.error('❌ Erreur sauvegarde:', error);
      this.showError(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      await loading.dismiss();
    }
  }

  closeCreateModal() {
    this.isCreateModalOpen = false;
    this.editingEntreprise = null;
  }

  async onToggleStatus(entreprise: Entreprise, event: any) {
    const newStatus = event.detail.checked;
    
    try {
      const { success, error } = await this.entrepriseService.toggleEntrepriseStatus(
        entreprise.id,
        newStatus
      );

      if (!success) {
        throw error;
      }

      // Mettre à jour localement
      entreprise.actif = newStatus;
      this.showSuccess(`Entreprise ${newStatus ? 'activée' : 'désactivée'}`);
      await this.loadStats();

    } catch (error: any) {
      console.error('❌ Erreur changement statut:', error);
      this.showError('Erreur lors du changement de statut');
      // Revenir à l'état précédent
      event.target.checked = !newStatus;
    }
  }

  // Reset de mot de passe simple
  async onResetPassword() {
    // Vérifier qu'il y a des entreprises
    if (this.entreprises.length === 0) {
      this.showError('Aucune entreprise disponible pour réinitialisation');
      return;
    }

    // Créer liste des entreprises pour sélection avec plus d'informations
    const inputs = this.entreprises.map(e => ({
      name: 'entreprise',
      type: 'radio' as const,
      label: `${e.nom}\n📧 ${e.email}\n📱 ${e.telephone}\n${e.password_hash ? '🔒 Mot de passe défini' : '⚠️ Aucun mot de passe'}`,
      value: e.id,
      checked: false
    }));

    const alert = await this.alertController.create({
      header: '🔐 Réinitialisation Mot de Passe',
      subHeader: 'Sélectionnez l\'entreprise à réinitialiser',
      message: `Cette action va:\n• Supprimer le mot de passe actuel\n• Forcer une nouvelle connexion\n• Permettre la définition d'un nouveau mot de passe`,
      inputs: inputs,
      cssClass: 'custom-alert-large',
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: '🔄 Réinitialiser',
          handler: async (entrepriseId) => {
            if (entrepriseId) {
              const entreprise = this.entreprises.find(e => e.id === entrepriseId);
              if (entreprise) {
                await this.confirmResetPassword(entreprise);
                return true;
              }
              return false;
            } else {
              this.showError('Veuillez sélectionner une entreprise');
              return false;
            }
          }
        }
      ]
    });

    await alert.present();
  }

  private async confirmResetPassword(entreprise: Entreprise) {
    const confirmAlert = await this.alertController.create({
      header: 'Confirmation Réinitialisation',
      subHeader: `${entreprise.nom} (${entreprise.email})`,
      message: `Statut: ${entreprise.password_hash ? 'Mot de passe défini' : 'Aucun mot de passe'}

Cette action va:
• Supprimer le mot de passe actuel
• Marquer le compte comme "première connexion" 
• L'entreprise devra créer un nouveau mot de passe`,
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: '✅ Confirmer la Réinitialisation',
          cssClass: 'danger',
          handler: async () => {
            await this.resetPasswordForEntreprise(entreprise.id);
          }
        }
      ]
    });

    await confirmAlert.present();
  }

  async onResetPasswordSpecific(entreprise: Entreprise) {
    await this.confirmResetPassword(entreprise);
  }

  private async resetPasswordForEntreprise(entrepriseId: string) {
    const loading = await this.loadingController.create({
      message: 'Réinitialisation...'
    });
    await loading.present();

    try {
      const { success, error } = await this.entrepriseService.resetEntreprisePassword(entrepriseId);

      if (!success) {
        throw error;
      }

      this.showSuccess('Mot de passe réinitialisé avec succès');
      await this.loadEntreprises();

    } catch (error: any) {
      console.error('❌ Erreur reset password:', error);
      this.showError('Erreur lors de la réinitialisation');
    } finally {
      await loading.dismiss();
    }
  }

  async onViewDetails(entreprise: Entreprise) {
    // TODO: Implémenter page détails entreprise
    this.showInfo('Page détails entreprise - À implémenter');
  }

  async onViewConducteurs(entreprise: Entreprise) {
    this.selectedEntreprise = entreprise;
    this.isConducteursModalOpen = true;
    this.isLoadingConducteurs = true;
    this.conducteursList = [];

    try {
      console.log(`👥 Chargement des conducteurs pour l'entreprise ${entreprise.nom}`);
      
      const { data, error } = await this.entrepriseService.getConducteursByEntreprise(entreprise.id);
      
      if (error) {
        throw error;
      }

      this.conducteursList = data || [];
      console.log(`✅ ${this.conducteursList.length} conducteur(s) trouvé(s)`);

    } catch (error) {
      console.error('❌ Erreur chargement conducteurs:', error);
      this.showError('Erreur lors du chargement des conducteurs');
    } finally {
      this.isLoadingConducteurs = false;
    }
  }

  onAddConducteur(entreprise: Entreprise) {
    this.selectedEntrepriseForAdd = entreprise;
    this.resetAddConducteurForm();
    this.isAddConducteurModalOpen = true;
  }


  async reloadConducteursCurrentEntreprise() {
    if (!this.selectedEntreprise) return;
    
    this.isLoadingConducteurs = true;
    
    try {
      console.log(`🔄 Rechargement des conducteurs pour l'entreprise ${this.selectedEntreprise.nom}`);
      
      const { data, error } = await this.entrepriseService.getConducteursByEntreprise(this.selectedEntreprise.id);
      
      if (error) {
        throw error;
      }

      this.conducteursList = data || [];
      console.log(`✅ ${this.conducteursList.length} conducteur(s) rechargé(s)`);

    } catch (error) {
      console.error('❌ Erreur rechargement conducteurs:', error);
      this.showError('Erreur lors du rechargement des conducteurs');
    } finally {
      this.isLoadingConducteurs = false;
    }
  }

  closeConducteursModal() {
    this.isConducteursModalOpen = false;
    this.selectedEntreprise = null;
    this.conducteursList = [];
    this.expandedConducteurs.clear();
    this.conducteursReservations.clear();
    this.loadingReservations.clear();
  }

  resetAddConducteurForm() {
    this.addConducteurForm = {
      nom: '',
      prenom: '',
      telephone: '',
      vehicle_type: 'voiture',
      vehicle_marque: '',
      vehicle_modele: '',
      vehicle_plaque: ''
    };
  }

  closeAddConducteurModal() {
    this.isAddConducteurModalOpen = false;
    this.selectedEntrepriseForAdd = null;
    this.resetAddConducteurForm();
  }

  addConducteurFormValid(): boolean {
    return !!(
      this.addConducteurForm.nom &&
      this.addConducteurForm.prenom &&
      this.addConducteurForm.telephone &&
      this.addConducteurForm.vehicle_type
    );
  }

  async onConducteurCreated() {
    if (!this.selectedEntrepriseForAdd) return;

    // Validation
    if (!this.addConducteurFormValid()) {
      this.showError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    this.isAddingConducteur = true;

    try {
      // Préparer les données du conducteur
      const conducteurData = {
        nom: this.addConducteurForm.nom.trim(),
        prenom: this.addConducteurForm.prenom.trim(),
        telephone: this.addConducteurForm.telephone.trim(),
        vehicle_type: this.addConducteurForm.vehicle_type,
        vehicle_marque: this.addConducteurForm.vehicle_marque?.trim() || null,
        vehicle_modele: this.addConducteurForm.vehicle_modele?.trim() || null,
        vehicle_plaque: this.addConducteurForm.vehicle_plaque?.trim() || null,
        entreprise_id: this.selectedEntrepriseForAdd.id,
        actif: true,
        first_login: true
      };

      console.log(`➕ Ajout conducteur pour l'entreprise ${this.selectedEntrepriseForAdd.nom}:`, conducteurData);

      const { success, error } = await this.entrepriseService.addConducteur(conducteurData);

      if (!success) {
        throw error || new Error('Erreur lors de l\'ajout du conducteur');
      }

      this.showSuccess(`Conducteur ${this.addConducteurForm.nom} ${this.addConducteurForm.prenom} ajouté avec succès`);
      this.closeAddConducteurModal();
      
      // Recharger les données
      await this.loadData();

    } catch (error: any) {
      console.error('❌ Erreur ajout conducteur:', error);
      this.showError(error.message || 'Erreur lors de l\'ajout du conducteur');
    } finally {
      this.isAddingConducteur = false;
    }
  }

  // Toggle collapse conducteur
  async toggleConducteur(conducteur: any) {
    const conducteurId = conducteur.id;
    
    if (this.expandedConducteurs.has(conducteurId)) {
      this.expandedConducteurs.delete(conducteurId);
    } else {
      this.expandedConducteurs.add(conducteurId);
      
      // Charger les réservations si pas déjà chargées
      if (!this.conducteursReservations.has(conducteurId)) {
        await this.loadConducteurReservations(conducteur);
      }
    }
  }

  // Charger les réservations d'un conducteur
  async loadConducteurReservations(conducteur: any) {
    const conducteurId = conducteur.id;
    this.loadingReservations.add(conducteurId);
    
    try {
      const { data, error } = await this.entrepriseService.getReservationsByConducteur(conducteurId);
      
      if (!error && data) {
        this.conducteursReservations.set(conducteurId, data);
      } else {
        this.conducteursReservations.set(conducteurId, []);
      }
    } catch (error) {
      console.error('Erreur chargement réservations:', error);
      this.conducteursReservations.set(conducteurId, []);
    } finally {
      this.loadingReservations.delete(conducteurId);
    }
  }

  // Vérifier si un conducteur est expanded
  isExpanded(conducteurId: string): boolean {
    return this.expandedConducteurs.has(conducteurId);
  }

  // Obtenir les réservations d'un conducteur
  getReservations(conducteurId: string): any[] {
    return this.conducteursReservations.get(conducteurId) || [];
  }

  // Obtenir le nombre de réservations
  getReservationsCount(conducteurId: string): number {
    return this.getReservations(conducteurId).length;
  }

  // Formater la devise
  formatCurrency(amount: number): string {
    if (!amount) return '0 GNF';
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' GNF';
  }

  // Obtenir le label du statut
  getStatusLabel(status: string): string {
    const labels: any = {
      'pending': 'En attente',
      'accepted': 'Acceptée',
      'refused': 'Refusée',
      'completed': 'Terminée',
      'canceled': 'Annulée'
    };
    return labels[status] || status;
  }

  // Formater le temps relatif
  formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `Il y a ${diffMins} min`;
    } else if (diffHours < 24) {
      return `Il y a ${diffHours}h`;
    } else if (diffDays < 7) {
      return `Il y a ${diffDays}j`;
    } else {
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    }
  }

  // Extraire le nom de lieu d'une position
  extractLocationName(position: string): string {
    if (!position) return '';
    
    // Si c'est une adresse texte simple
    if (!position.startsWith('POINT') && !position.match(/^[0-9A-F]+$/i)) {
      return position;
    }
    
    // Si c'est un format POINT ou WKB, retourner une description générique
    return 'Position GPS';
  }

  async exportConducteursList() {
    if (!this.selectedEntreprise) return;
    
    try {
      // Créer le CSV
      const csvContent = this.generateConducteursCSV();
      
      // Créer un blob et télécharger
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `conducteurs_${this.selectedEntreprise.nom}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      this.showSuccess('Liste exportée avec succès');
    } catch (error) {
      console.error('❌ Erreur export:', error);
      this.showError('Erreur lors de l\'export');
    }
  }

  private generateConducteursCSV(): string {
    const headers = ['Nom', 'Prénom', 'Téléphone', 'Type Véhicule', 'Marque', 'Plaque', 'Note', 'Courses', 'Actif', 'En ligne'];
    const rows = this.conducteursList.map(c => [
      c.nom || '',
      c.prenom || '',
      c.telephone || '',
      this.getVehicleTypeLabel(c.vehicle_type) || '',
      c.vehicle_marque || '',
      c.vehicle_plaque || '',
      c.note_moyenne || '5',
      c.nombre_courses || '0',
      c.actif ? 'Oui' : 'Non',
      !c.hors_ligne ? 'Oui' : 'Non'
    ]);
    
    const csvRows = [
      headers.join(','),
      ...rows.map(row => row.map(field => `"${field}"`).join(','))
    ];
    
    return csvRows.join('\n');
  }

  // Getters pour les stats conducteurs
  get conducteursActifs(): number {
    return this.conducteursList.filter(c => c.actif).length;
  }

  get conducteursInactifs(): number {
    return this.conducteursList.filter(c => !c.actif).length;
  }

  getInitials(conducteur: any): string {
    const prenom = conducteur.prenom || '';
    const nom = conducteur.nom || '';
    return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
  }

  getVehicleTypeLabel(type: string): string {
    switch(type) {
      case 'moto': return 'Moto';
      case 'voiture': return 'Voiture';
      default: return 'Non défini';
    }
  }

  async onExportData() {
    this.showInfo('Export données - Fonctionnalité en développement');
  }

  goBack() {
    this.router.navigate(['/super-admin/dashboard']);
  }

  // Utilitaires
  isFormValid(): boolean {
    return !!(
      this.formData.nom?.trim() &&
      this.formData.email?.trim() &&
      this.formData.telephone?.trim() &&
      this.formData.adresse?.trim()
    );
  }


  trackByEntreprise(index: number, entreprise: Entreprise): string {
    return entreprise.id;
  }

  private async showSuccess(message: string) {
    const toast = await this.toastController.create({
      message: `✅ ${message}`,
      duration: 3000,
      color: 'success',
      position: 'top'
    });
    await toast.present();
  }

  private async showError(message: string) {
    const toast = await this.toastController.create({
      message: `❌ ${message}`,
      duration: 4000,
      color: 'danger',
      position: 'top'
    });
    await toast.present();
  }

  private async showInfo(message: string) {
    const toast = await this.toastController.create({
      message: `ℹ️ ${message}`,
      duration: 3000,
      color: 'primary',
      position: 'top'
    });
    await toast.present();
  }

  // ==================== SYSTÈME DE BLOCAGE ====================

  async onDesactiverEntreprise(entreprise: Entreprise) {
    const alert = await this.alertController.create({
      cssClass: 'custom-alert-large',
      header: 'Désactivation Entreprise',
      subHeader: `Entreprise: ${entreprise.nom}`,
      message: `Conséquences de la désactivation:
      
• Tous les conducteurs seront automatiquement bloqués
• L'entreprise ne pourra plus se connecter  
• L'action peut être annulée en réactivant l'entreprise

Veuillez indiquer le motif de désactivation:`,
      inputs: [
        {
          name: 'motif',
          type: 'textarea',
          placeholder: 'Motif obligatoire (ex: non-paiement, comportement...)',
          attributes: {
            maxlength: 500,
            rows: 3
          }
        }
      ],
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Désactiver',
          cssClass: 'danger',
          handler: (data) => {
            if (!data.motif || data.motif.trim().length < 5) {
              this.showError('Le motif doit contenir au moins 5 caractères');
              return false;
            }
            this.confirmerDesactivationEntreprise(entreprise, data.motif.trim());
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  private async confirmerDesactivationEntreprise(entreprise: Entreprise, motif: string) {
    const loading = await this.loadingController.create({
      message: 'Désactivation en cours...'
    });
    await loading.present();

    try {
      const { success, error } = await this.entrepriseService.desactiverEntrepriseAvecMotif(
        entreprise.id,
        motif,
        'super-admin'
      );

      if (!success) {
        throw error;
      }

      // Mettre à jour localement
      entreprise.actif = false;
      this.showSuccess(`Entreprise "${entreprise.nom}" désactivée avec succès`);
      await this.loadStats();

    } catch (error: any) {
      console.error('❌ Erreur désactivation entreprise:', error);
      this.showError('Erreur lors de la désactivation de l\'entreprise');
    } finally {
      await loading.dismiss();
    }
  }

  async onReactiverEntreprise(entreprise: Entreprise) {
    const alert = await this.alertController.create({
      header: 'Réactivation Entreprise',
      subHeader: `Entreprise: ${entreprise.nom}`,
      message: `Les conducteurs bloqués lors de la désactivation seront automatiquement débloqués.`,
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Réactiver',
          cssClass: 'primary',
          handler: () => {
            this.confirmerReactivationEntreprise(entreprise);
          }
        }
      ]
    });

    await alert.present();
  }

  private async confirmerReactivationEntreprise(entreprise: Entreprise) {
    const loading = await this.loadingController.create({
      message: 'Réactivation en cours...'
    });
    await loading.present();

    try {
      const { success, error } = await this.entrepriseService.reactiverEntreprise(
        entreprise.id,
        'super-admin'
      );

      if (!success) {
        throw error;
      }

      // Mettre à jour localement
      entreprise.actif = true;
      this.showSuccess(`Entreprise "${entreprise.nom}" réactivée avec succès`);
      await this.loadStats();

    } catch (error: any) {
      console.error('❌ Erreur réactivation entreprise:', error);
      this.showError('Erreur lors de la réactivation de l\'entreprise');
    } finally {
      await loading.dismiss();
    }
  }

  async onBloquerConducteur(conducteur: any) {
    const raisonsOptions = BlocageUtils.getRaisonBlocageOptions();
    
    const alert = await this.alertController.create({
      cssClass: 'custom-alert-blocage-conducteur-moderne',
      header: 'Blocage Conducteur',
      subHeader: `${conducteur.nom} ${conducteur.prenom}`,
      message: `Cette action va suspendre définitivement l'accès de ce conducteur à l'application.

Sélectionnez la raison du blocage:`,
      inputs: raisonsOptions.map((option, index) => ({
        type: 'radio',
        label: `${this.getRaisonIcon(option.value)} ${option.label}`,
        value: option.value,
        checked: index === 0
      })),
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel',
          cssClass: 'button-cancel'
        },
        {
          text: 'Bloquer le Conducteur',
          cssClass: 'button-danger',
          handler: (selectedValue) => {
            console.log('🔍 Valeur sélectionnée directement:', selectedValue);
            
            const raisonOption = BlocageUtils.getRaisonBlocageOptions().find(r => r.value === selectedValue);
            const raisonLabel = raisonOption?.label || 'Autre raison';
            const motif = `${this.getRaisonIcon(selectedValue)} ${raisonLabel}`;
            
            console.log('🔍 Debug blocage:', { selectedValue, raisonOption, raisonLabel, motif });
            
            // Procéder directement au blocage avec la raison comme motif
            this.confirmerBlocageConducteur(conducteur, motif, selectedValue);
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  private getRaisonIcon(raison: string): string {
    const icons: { [key: string]: string } = {
      'comportement': '⚠️',
      'documents': '📋',
      'demande_entreprise': '🏢',
      'absence': '⏰',
      'temporaire': '🔄',
      'autre': '📝'
    };
    return icons[raison] || '📝';
  }

  private async confirmerBlocageConducteur(conducteur: any, motif: string, raison: string) {
    const loading = await this.loadingController.create({
      message: 'Blocage en cours...'
    });
    await loading.present();

    try {
      const { success, error } = await this.blocageService.bloquerConducteurParSuperAdmin({
        conducteurId: conducteur.id,
        motif: motif,
        raison: raison as any,
        bloquePar: 'super-admin',
        dateBlocage: new Date()
      });

      if (!success) {
        throw error;
      }

      // Mettre à jour localement
      conducteur.actif = false;
      this.showSuccess(`Conducteur "${conducteur.nom} ${conducteur.prenom}" bloqué avec succès`);
      
      // Recharger les données du conducteur si on est dans le détail
      if (this.expandedConducteurs.has(conducteur.id)) {
        await this.loadConducteurReservations(conducteur);
      }

    } catch (error: any) {
      console.error('❌ Erreur blocage conducteur:', error);
      this.showError('Erreur lors du blocage du conducteur');
    } finally {
      await loading.dismiss();
    }
  }

  async onDebloquerConducteur(conducteur: any) {
    let message = `Confirmez-vous le déblocage ?`;
    
    if (conducteur.bloque_par === 'super-admin-entreprise') {
      message += '\n\nNote: Ce conducteur a été bloqué suite à la désactivation de son entreprise.';
    }

    const alert = await this.alertController.create({
      header: 'Déblocage Conducteur',
      subHeader: `${conducteur.nom} ${conducteur.prenom}`,
      message,
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Débloquer',
          cssClass: 'primary',
          handler: () => {
            this.confirmerDeblocageConducteur(conducteur);
          }
        }
      ]
    });

    await alert.present();
  }

  private async confirmerDeblocageConducteur(conducteur: any) {
    const loading = await this.loadingController.create({
      message: 'Déblocage en cours...'
    });
    await loading.present();

    try {
      const { success, error } = await this.blocageService.debloquerConducteur(conducteur.id, 'super-admin');

      if (!success) {
        throw error;
      }

      // Mettre à jour localement
      conducteur.actif = true;
      this.showSuccess(`Conducteur "${conducteur.nom} ${conducteur.prenom}" débloqué avec succès`);
      
      // Recharger les données du conducteur si on est dans le détail
      if (this.expandedConducteurs.has(conducteur.id)) {
        await this.loadConducteurReservations(conducteur);
      }

    } catch (error: any) {
      console.error('❌ Erreur déblocage conducteur:', error);
      this.showError('Erreur lors du déblocage du conducteur');
    } finally {
      await loading.dismiss();
    }
  }

  getMotifBlocage(conducteur: any): string {
    return BlocageUtils.getMotifBlocage(conducteur);
  }

  async onSupprimerConducteur(conducteur: any) {
    const alert = await this.alertController.create({
      header: 'Supprimer Conducteur',
      subHeader: `${conducteur.nom} ${conducteur.prenom}`,
      message: `⚠️ Êtes-vous sûr de vouloir supprimer ce conducteur ?

Cette action va :
• Désactiver définitivement le conducteur
• L'empêcher de recevoir de nouvelles réservations
• Conserver l'historique de ses courses

Cette action est irréversible.`,
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel',
          cssClass: 'medium'
        },
        {
          text: 'Supprimer',
          cssClass: 'danger',
          handler: () => {
            this.confirmerSuppressionConducteur(conducteur);
          }
        }
      ]
    });

    await alert.present();
  }

  private async confirmerSuppressionConducteur(conducteur: any) {
    const loading = await this.loadingController.create({
      message: 'Suppression en cours...'
    });
    await loading.present();

    try {
      const { success, error } = await this.entrepriseService.supprimerConducteur(conducteur.id);

      if (!success) {
        throw error || new Error('Erreur lors de la suppression du conducteur');
      }

      this.showSuccess(`Conducteur "${conducteur.nom} ${conducteur.prenom}" supprimé avec succès`);
      
      // Fermer le détail du conducteur s'il était ouvert
      if (this.expandedConducteurs.has(conducteur.id)) {
        this.expandedConducteurs.delete(conducteur.id);
      }

      // Recharger la liste des conducteurs si la modal est ouverte
      if (this.isConducteursModalOpen && this.selectedEntreprise) {
        await this.reloadConducteursCurrentEntreprise();
      }

    } catch (error: any) {
      console.error('❌ Erreur suppression conducteur:', error);
      this.showError(error.message || 'Erreur lors de la suppression du conducteur');
    } finally {
      await loading.dismiss();
    }
  }

  canDebloquerConducteur(conducteur: any): boolean {
    // Super-admin peut débloquer tous les conducteurs inactifs
    return !conducteur.actif;
  }

  // Méthode pour ouvrir une position dans Google Maps
  openInMaps(position: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    
    if (!position) {
      console.warn('Position non définie');
      return;
    }
    
    // Si c'est une position GPS (format WKB ou coordonnées)
    if (position.startsWith('0x') || position.includes('POINT')) {
      const coords = this.extractCoordinates(position);
      if (coords) {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`;
        window.open(url, '_blank');
      }
    } else {
      // Si c'est une adresse textuelle
      const encodedAddress = encodeURIComponent(position);
      const url = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
      window.open(url, '_blank');
    }
  }

  // Extraire les coordonnées d'une position WKB
  extractCoordinates(position: string): {lat: number, lng: number} | null {
    try {
      // Logique pour extraire les coordonnées du format WKB
      // Cette méthode doit être adaptée selon le format exact
      console.log('Extraction des coordonnées de:', position);
      return null; // À implémenter selon le format
    } catch (error) {
      console.error('Erreur extraction coordonnées:', error);
      return null;
    }
  }

  // Appeler un client
  callClient(phone: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    
    if (!phone) {
      console.warn('Numéro de téléphone non défini');
      return;
    }
    
    // Ouvrir l'application téléphone avec le numéro
    window.location.href = `tel:${phone}`;
  }

  // Formater la date de validation
  formatValidationDate(dateString?: string): string {
    if (!dateString) return 'Non validée';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'GMT'
      });
    } catch (error) {
      return 'Date invalide';
    }
  }

  // Formater la date de réservation (style A77)
  formatReservationDate(dateString: string): string {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return '';
    }
  }

  // Formater la date de réservation planifiée
  formatScheduledDate(dateReservation: string, heureReservation: number, minuteReservation: number): string {
    if (!dateReservation) return '';
    
    try {
      const date = new Date(dateReservation);
      const heure = heureReservation || 0;
      const minute = minuteReservation || 0;
      
      // Formater la date
      const dateFormatted = date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
      // Formater l'heure avec zéros de remplissage
      const heureFormatted = heure.toString().padStart(2, '0');
      const minuteFormatted = minute.toString().padStart(2, '0');
      
      return `${dateFormatted} à ${heureFormatted}:${minuteFormatted}`;
    } catch (error) {
      console.error('Erreur formatage date planifiée:', error);
      return 'Date invalide';
    }
  }

  // Calculer la durée entre created_at et date_code_validation
  calculateDurationSinceAcceptation(createdAt: string, validationDate: string): string {
    if (!createdAt || !validationDate) return '';
    
    try {
      console.log('=== CALCUL DURÉE DEBUG ===');
      console.log('🕐 created_at BRUT:', createdAt);
      console.log('🕐 date_code_validation BRUT:', validationDate);
      
      // Parser les dates en forçant l'interprétation UTC pour éviter les problèmes de timezone
      // Si created_at n'a pas de timezone, on l'interprète comme UTC
      const createdAtUTC = createdAt.includes('T') && !createdAt.includes('+') && !createdAt.includes('Z') 
        ? createdAt + 'Z' 
        : createdAt;
      
      console.log('🕐 created_at CORRIGÉ (UTC):', createdAtUTC);
      
      const startDate = new Date(createdAtUTC);
      const endDate = new Date(validationDate);
      
      console.log('🕐 Start Date timestamp:', startDate.getTime());
      console.log('🕐 End Date timestamp:', endDate.getTime());
      console.log('🕐 Start Date ISO:', startDate.toISOString());
      console.log('🕐 End Date ISO:', endDate.toISOString());
      console.log('🕐 Start Date local:', startDate.toString());
      console.log('🕐 End Date local:', endDate.toString());
      
      // Vérifier que les dates sont valides
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.error('❌ Dates invalides:', { createdAt, validationDate });
        return 'Dates invalides';
      }
      
      // Calculer la différence en millisecondes
      const diffMs = endDate.getTime() - startDate.getTime();
      console.log('🕐 Différence en ms:', diffMs);
      console.log('🕐 Différence en secondes:', diffMs / 1000);
      console.log('🕐 Différence en minutes:', diffMs / (1000 * 60));
      console.log('🕐 Différence en heures:', diffMs / (1000 * 60 * 60));
      
      // Si la différence est négative, il y a un problème
      if (diffMs < 0) {
        console.error('❌ Durée négative:', diffMs);
        return 'Durée négative';
      }
      
      // Convertir en secondes et minutes
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      console.log('🕐 RÉSULTATS FLOOR:');
      console.log('  - Secondes:', diffSeconds);
      console.log('  - Minutes:', diffMinutes);
      console.log('  - Heures:', diffHours);
      console.log('  - Jours:', diffDays);
      
      // Test manuel pour votre exemple
      console.log('🧮 TEST MANUEL:');
      const manualStartMs = new Date('2025-08-17T21:12:11.439Z').getTime();
      const manualEndMs = new Date('2025-08-17T21:15:50.291Z').getTime();
      const manualDiffMs = manualEndMs - manualStartMs;
      const manualMinutes = Math.floor(manualDiffMs / (1000 * 60));
      console.log('  - Manual diff ms:', manualDiffMs);
      console.log('  - Manual minutes:', manualMinutes);
      
      // Retourner le format le plus approprié
      if (diffDays > 0) {
        const remainingHours = diffHours % 24;
        if (remainingHours > 0) {
          return `${diffDays}j ${remainingHours}h`;
        }
        return `${diffDays}j`;
      } else if (diffHours > 0) {
        const remainingMinutes = diffMinutes % 60;
        if (remainingMinutes > 0) {
          return `${diffHours}h ${remainingMinutes}min`;
        }
        return `${diffHours}h`;
      } else if (diffMinutes > 0) {
        const remainingSeconds = diffSeconds % 60;
        if (remainingSeconds > 30) {
          // Arrondir à la minute supérieure si plus de 30 secondes
          return `${diffMinutes + 1}min`;
        }
        return `${diffMinutes}min`;
      } else if (diffSeconds > 0) {
        return `${diffSeconds}s`;
      } else {
        return 'Instantané';
      }
    } catch (error) {
      console.error('❌ Erreur calcul durée:', error);
      return 'Erreur calcul';
    }
  }

  // Ouvrir les détails d'une réservation (réutilisation de la logique entreprise)
  openReservationDetails(reservation: any) {
    this.selectedReservationDetails = reservation;
    this.isDetailsModalOpen = true;
  }

  // Fermer le modal de détails
  closeDetailsModal() {
    this.isDetailsModalOpen = false;
    this.selectedReservationDetails = null;
  }

  // Formater la distance
  formatDistance(distance: number): string {
    if (!distance) return 'N/A';
    return `${distance.toFixed(2)} km`;
  }

  // Obtenir les étoiles de notation
  getRatingStars(note: number): number[] {
    if (!note) return [];
    return Array(Math.floor(note)).fill(0);
  }

  // Formater la date complète
  formatDate(dateString: string): string {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return '';
    }
  }

  // Obtenir la couleur du statut
  getStatusColor(status: string): string {
    switch (status) {
      case 'completed': return 'success';
      case 'accepted': return 'warning';
      case 'pending': return 'primary';
      case 'refused': return 'danger';
      case 'canceled': return 'medium';
      default: return 'medium';
    }
  }

  // Obtenir le texte du statut
  getStatusText(status: string): string {
    switch (status) {
      case 'completed': return 'Terminée';
      case 'accepted': return 'Acceptée';
      case 'pending': return 'En attente';
      case 'refused': return 'Refusée';
      case 'canceled': return 'Annulée';
      default: return status;
    }
  }

  // Ouvrir une position dans Google Maps (dupliqué depuis entreprise/reservations)
  openPositionInMaps(position: string) {
    const mapsUrl = this.formatGPSToMapsLink(position, true); // true pour navigation directe
    console.log('🗺️ Opening navigation from current location to:', { position, url: mapsUrl });
    window.open(mapsUrl, '_system');
  }

  // Formater GPS vers lien Maps (dupliqué depuis entreprise/reservations)
  formatGPSToMapsLink(position: string, useNavigation: boolean = true): string {
    if (!position) return '';
    
    console.log('🗺️ Formatting GPS link for position:', position);
    
    // Vérifier si c'est un format POINT(lon lat)
    const pointMatch = position.match(/POINT\(([\-\d\.]+)\s+([\-\d\.]+)\)/);
    if (pointMatch) {
      const lon = pointMatch[1];
      const lat = pointMatch[2];
      
      console.log('📍 POINT format detected:', { lat, lon });
      
      if (useNavigation) {
        // Navigation directe vers les coordonnées
        return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=driving`;
      } else {
        // Simple recherche
        return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
      }
    }
    
    // Vérifier si c'est un format WKB (commence par 0101000020E6100000)
    if (position.length >= 50 && 
        position.match(/^[0-9A-F]+$/i) && 
        position.toUpperCase().startsWith('0101000020E6100000')) {
      
      console.log('📍 WKB format detected, decoding...');
      const coords = this.decodeWKB(position);
      
      if (coords) {
        console.log('📍 WKB decoded coordinates:', coords);
        
        if (useNavigation) {
          // Navigation directe vers les coordonnées
          return `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}&travelmode=driving`;
        } else {
          // Simple recherche
          return `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
        }
      }
    }
    
    // Si ce n'est ni POINT ni WKB, traiter comme une adresse
    if (position && position.trim()) {
      const encodedAddress = encodeURIComponent(position.trim());
      
      if (useNavigation) {
        // Navigation directe vers l'adresse
        return `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}&travelmode=driving`;
      } else {
        // Simple recherche
        return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
      }
    }
    
    return '';
  }

  // Décoder WKB (dupliqué depuis entreprise/reservations)
  decodeWKB(wkbHex: string): {lat: number, lng: number} | null {
    try {
      console.log('🔍 Decoding WKB:', wkbHex);
      
      if (wkbHex.length >= 50) { // Au minimum 25 bytes = 50 caractères hex
        // Vérifier que c'est bien un POINT avec SRID 4326
        const geometryType = wkbHex.substring(2, 10); // 01000020
        const srid = wkbHex.substring(10, 18); // E6100000
        
        console.log('Geometry type:', geometryType);
        console.log('SRID:', srid);
        
        if (geometryType.toUpperCase() === '01000020' && srid.toUpperCase() === 'E6100000') {
          // Extraire les coordonnées (little-endian)
          const lonHex = wkbHex.substring(18, 34);
          const latHex = wkbHex.substring(34, 50);
          
          console.log('Lon hex:', lonHex);
          console.log('Lat hex:', latHex);
          
          // Convertir de little-endian hex vers double
          const lon = this.hexToDouble(lonHex);
          const lat = this.hexToDouble(latHex);
          
          console.log('Decoded coordinates:', { lat, lon });
          
          // Vérifier que les coordonnées sont valides
          if (!isNaN(lat) && !isNaN(lon) && 
              lat >= -90 && lat <= 90 && 
              lon >= -180 && lon <= 180) {
            return { lat, lng: lon };
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('❌ Erreur décodage WKB:', error);
      return null;
    }
  }

  // Convertir hex little-endian vers double (dupliqué depuis entreprise/reservations)
  private hexToDouble(hex: string): number {
    // Inverser les bytes (little-endian vers big-endian)
    const reversedHex = hex.match(/.{2}/g)?.reverse().join('') || '';
    
    // Convertir vers buffer et lire comme double
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    
    for (let i = 0; i < 8; i++) {
      const byte = parseInt(reversedHex.substr(i * 2, 2), 16);
      view.setUint8(i, byte);
    }
    
    return view.getFloat64(0, false); // false = big-endian
  }

  // ==================== VALIDATION ET MESSAGES ====================

  private async showValidationError(titre: string, message: string) {
    const toast = await this.toastController.create({
      header: titre,
      message: message,
      duration: 4000,
      color: 'warning',
      position: 'top',
      buttons: [
        {
          text: 'OK',
          role: 'cancel'
        }
      ],
      cssClass: 'validation-toast'
    });
    await toast.present();
  }
}
