import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar,
  IonCard,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonButton,
  IonButtons,
  IonIcon,
  IonGrid,
  IonRow,
  IonCol,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonChip,
  IonAvatar,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonText,
  IonProgressBar,
  IonModal,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonCheckbox
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  people, 
  car, 
  call, 
  star, 
  checkmarkCircle, 
  ellipse,
  refresh,
  person,
  search,
  wallet,
  trophy,
  time,
  location,
  map,
  speedometer,
  analytics,
  bicycle,
  close,
  create,
  documentText,
  cash,
  chatbubbleEllipses,
  save,
  addCircle,
  personAdd
} from 'ionicons/icons';
import { EntrepriseService, ConducteurStats } from '../../services/entreprise.service';

@Component({
  selector: 'app-conducteurs',
  templateUrl: './conducteurs.page.html',
  styleUrls: ['./conducteurs.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent, 
    IonHeader, 
    IonTitle, 
    IonToolbar,
    IonCard,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonBadge,
    IonButton,
    IonButtons,
    IonIcon,
    IonGrid,
    IonRow,
    IonCol,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
    IonChip,
    IonAvatar,
    IonSearchbar,
    IonSegment,
    IonSegmentButton,
    IonText,
    IonProgressBar,
    IonModal,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonCheckbox
  ]
})
export class ConducteursPage implements OnInit {
  conducteurs: ConducteurStats[] = [];
  filteredConducteurs: ConducteurStats[] = [];
  isLoading = true;
  searchTerm = '';
  selectedFilter = 'all';
  
  // Modal d'édition
  isEditModalOpen = false;
  isCreateModalOpen = false;
  selectedConducteur: ConducteurStats | null = null;
  editForm: any = {};
  createForm: any = {};
  isSaving = false;
  isCreating = false;
  
  // Modal réservations
  isReservationsModalOpen = false;
  conducteurReservations: any[] = [];
  isLoadingReservations = false;

  constructor(private entrepriseService: EntrepriseService) {
    addIcons({ 
      people, 
      car, 
      call, 
      star, 
      checkmarkCircle, 
      ellipse,
      refresh,
      person,
      search,
      wallet,
      trophy,
      time,
      location,
      map,
      speedometer,
      analytics,
      bicycle,
      close,
      create,
      documentText,
      cash,
      chatbubbleEllipses,
      save,
      addCircle,
      personAdd
    });
  }

  ngOnInit() {
    this.loadConducteurs();
  }

  async loadConducteurs(showLoading = true) {
    if (showLoading) {
      this.isLoading = true;
    }
    
    try {
      this.conducteurs = await this.entrepriseService.getConducteursEntreprise();
      this.applyFilters();
    } catch (error) {
      console.error('Error loading conducteurs:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async doRefresh(event: any) {
    await this.loadConducteurs(false);
    event.target.complete();
  }

  onSearchChange(event: any) {
    this.searchTerm = event.detail.value.toLowerCase();
    this.applyFilters();
  }

  onFilterChange(event: any) {
    this.selectedFilter = event.detail.value;
    this.applyFilters();
  }

  applyFilters() {
    let filtered = [...this.conducteurs];

    // Filtrer par statut
    if (this.selectedFilter !== 'all') {
      if (this.selectedFilter === 'online') {
        filtered = filtered.filter(c => !c.hors_ligne && c.statut !== 'inactif');
      } else if (this.selectedFilter === 'offline') {
        filtered = filtered.filter(c => c.hors_ligne || c.statut === 'inactif');
      }
    }

    // Filtrer par terme de recherche
    if (this.searchTerm) {
      filtered = filtered.filter(c =>
        c.nom?.toLowerCase().includes(this.searchTerm) ||
        c.prenom?.toLowerCase().includes(this.searchTerm) ||
        c.telephone?.toLowerCase().includes(this.searchTerm) ||
        c.vehicle_marque?.toLowerCase().includes(this.searchTerm) ||
        c.vehicle_modele?.toLowerCase().includes(this.searchTerm) ||
        c.vehicle_plaque?.toLowerCase().includes(this.searchTerm)
      );
    }

    this.filteredConducteurs = filtered;
  }

  getStatusColor(statut: string, hors_ligne: boolean): string {
    if (hors_ligne) return 'medium';
    
    switch (statut) {
      case 'disponible': return 'success';
      case 'occupe': return 'warning';
      case 'hors_service': return 'danger';
      case 'inactif': return 'medium';
      default: return 'medium';
    }
  }

  getStatusText(statut: string, hors_ligne: boolean): string {
    if (hors_ligne) return 'Hors ligne';
    
    switch (statut) {
      case 'disponible': return 'Disponible';
      case 'occupe': return 'En course';
      case 'hors_service': return 'Hors service';
      case 'inactif': return 'Inactif';
      default: return statut;
    }
  }

  getVehicleIcon(vehicleType: string): string {
    return vehicleType === 'moto' ? 'bicycle' : 'car';
  }

  getConducteursEnLigne(): number {
    return this.conducteurs.filter(c => !c.hors_ligne && c.statut !== 'inactif').length;
  }

  getConducteursDisponibles(): number {
    return this.conducteurs.filter(c => c.statut === 'disponible' && !c.hors_ligne).length;
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'Jamais';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'À l\'instant';
    if (diffMinutes < 60) return `Il y a ${diffMinutes}min`;
    if (diffMinutes < 1440) return `Il y a ${Math.floor(diffMinutes / 60)}h`;
    return `Il y a ${Math.floor(diffMinutes / 1440)}j`;
  }

  callConducteur(telephone: string) {
    window.open(`tel:${telephone}`, '_system');
  }

  formatCurrency(amount: number): string {
    if (!amount) return '0 GNF';
    return new Intl.NumberFormat('fr-GN', {
      style: 'currency',
      currency: 'GNF',
      minimumFractionDigits: 0
    }).format(amount);
  }

  getPerformanceColor(percentage: number): string {
    if (percentage >= 90) return 'success';
    if (percentage >= 70) return 'warning';
    return 'danger';
  }

  trackByConducteur(index: number, conducteur: ConducteurStats): string {
    return conducteur.id || index.toString();
  }

  // Méthodes pour le modal d'édition
  editConducteur(conducteur: ConducteurStats) {
    this.selectedConducteur = conducteur;
    this.editForm = {
      id: conducteur.id,
      nom: conducteur.nom,
      prenom: conducteur.prenom,
      telephone: conducteur.telephone,
      vehicle_type: conducteur.vehicle_type,
      vehicle_marque: conducteur.vehicle_marque,
      vehicle_modele: conducteur.vehicle_modele,
      vehicle_plaque: conducteur.vehicle_plaque,
      statut: conducteur.statut,
      hors_ligne: conducteur.hors_ligne
    };
    this.isEditModalOpen = true;
  }

  closeEditModal() {
    this.isEditModalOpen = false;
    this.selectedConducteur = null;
    this.editForm = {};
  }

  async saveConducteur() {
    if (!this.selectedConducteur) return;
    
    this.isSaving = true;
    try {
      // TODO: Implémenter la sauvegarde via le service
      await this.updateConducteurInService();
      
      // Actualiser la liste
      await this.loadConducteurs(false);
      this.closeEditModal();
      
      // TODO: Afficher toast de succès
      console.log('Conducteur mis à jour avec succès');
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      // TODO: Afficher toast d'erreur
    } finally {
      this.isSaving = false;
    }
  }

  private async updateConducteurInService() {
    if (!this.selectedConducteur || !this.editForm) return;
    
    const success = await this.entrepriseService.updateConducteur(
      this.selectedConducteur.id,
      this.editForm
    );
    
    if (!success) {
      throw new Error('Échec de la mise à jour');
    }
  }

  // Méthodes pour le modal de réservations
  async viewConducteurReservations(conducteur: ConducteurStats) {
    this.selectedConducteur = conducteur;
    this.isReservationsModalOpen = true;
    this.isLoadingReservations = true;
    
    try {
      // Récupérer les réservations du conducteur
      this.conducteurReservations = await this.entrepriseService.getReservationsByConducteur(conducteur.id);
    } catch (error) {
      console.error('Erreur lors du chargement des réservations:', error);
      this.conducteurReservations = [];
    } finally {
      this.isLoadingReservations = false;
    }
  }

  closeReservationsModal() {
    this.isReservationsModalOpen = false;
    this.selectedConducteur = null;
    this.conducteurReservations = [];
  }

  // Méthodes pour la création de conducteur
  openCreateModal() {
    this.createForm = {
      nom: '',
      prenom: '',
      telephone: '',
      vehicle_type: 'berline',
      vehicle_marque: '',
      vehicle_modele: '',
      vehicle_plaque: ''
    };
    this.isCreateModalOpen = true;
  }

  closeCreateModal() {
    this.isCreateModalOpen = false;
    this.createForm = {};
  }

  async createConducteur() {
    // Validation basique
    if (!this.createForm.nom || !this.createForm.prenom || !this.createForm.telephone) {
      console.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    this.isCreating = true;
    try {
      const success = await this.entrepriseService.createConducteur(this.createForm);
      
      if (success) {
        // Actualiser la liste
        await this.loadConducteurs(false);
        this.closeCreateModal();
        console.log('✅ Conducteur créé avec succès');
      } else {
        console.error('Erreur lors de la création du conducteur');
      }
    } catch (error) {
      console.error('Erreur lors de la création:', error);
    } finally {
      this.isCreating = false;
    }
  }

  getTotalRevenue(): number {
    return this.conducteurReservations
      .filter(r => r.statut === 'completed' && r.prix_total)
      .reduce((sum, r) => sum + r.prix_total, 0);
  }

  getCompletedReservationsCount(): number {
    return this.conducteurReservations.filter(r => r.statut === 'completed').length;
  }

  getPendingReservationsCount(): number {
    return this.conducteurReservations.filter(r => r.statut === 'pending').length;
  }

  getReservationStatusColor(statut: string): string {
    switch (statut) {
      case 'completed': return 'success';
      case 'accepted': return 'warning';
      case 'pending': return 'primary';
      case 'refused': return 'danger';
      case 'canceled': return 'medium';
      default: return 'medium';
    }
  }

  getReservationStatusText(statut: string): string {
    switch (statut) {
      case 'completed': return 'Terminée';
      case 'accepted': return 'Acceptée';
      case 'pending': return 'En attente';
      case 'refused': return 'Refusée';
      case 'canceled': return 'Annulée';
      default: return statut;
    }
  }

  trackByReservation(index: number, reservation: any): string {
    return reservation.id || index.toString();
  }
}