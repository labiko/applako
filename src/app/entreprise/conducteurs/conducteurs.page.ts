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
  closeOutline,
  create,
  documentText,
  cash,
  chatbubbleEllipses,
  save,
  addCircle,
  personAdd,
  calendar,
  lockClosed,
  lockOpen
} from 'ionicons/icons';
import { AlertController, ToastController } from '@ionic/angular/standalone';
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

  constructor(
    private entrepriseService: EntrepriseService,
    private alertController: AlertController,
    private toastController: ToastController
  ) {
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
      closeOutline,
      create,
      documentText,
      cash,
      chatbubbleEllipses,
      save,
      addCircle,
      personAdd,
      calendar,
      lockClosed,
      lockOpen
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

  formatDateCreation(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
      vehicle_type: 'voiture', // Valeur par défaut conforme à la DB
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
    if (!this.createForm.nom || !this.createForm.prenom || !this.createForm.telephone || !this.createForm.vehicle_type) {
      console.error('Veuillez remplir tous les champs obligatoires (nom, prénom, téléphone, type de véhicule)');
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

  formatDateUpdatePosition(dateString: string): string {
    if (!dateString) return 'Position inconnue';

    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMinutes < 1) {
        return 'À l\'instant';
      } else if (diffMinutes < 60) {
        return `Il y a ${diffMinutes}min`;
      } else if (diffHours < 24) {
        return `Il y a ${diffHours}h`;
      } else if (diffDays < 7) {
        return `Il y a ${diffDays}j`;
      } else {
        return date.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      }
    } catch (error) {
      console.error('Erreur formatage date position:', error);
      return 'Date invalide';
    }
  }

  formatDerniereActivite(dateString: string): string {
    if (!dateString) return '';

    try {
      const date = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z');
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMinutes < 1) {
        return 'Actif maintenant';
      } else if (diffMinutes < 60) {
        return `Actif il y a ${diffMinutes}min`;
      } else if (diffHours < 24) {
        return `Actif il y a ${diffHours}h`;
      } else if (diffDays === 1) {
        return 'Actif hier';
      } else if (diffDays < 7) {
        return `Actif il y a ${diffDays}j`;
      } else {
        return `Dernier: ${date.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit'
        })}`;
      }
    } catch (error) {
      console.error('Erreur formatage derniere activite:', error);
      return '';
    }
  }

  openPositionInMaps(position: string) {
    const mapsUrl = this.formatGPSToMapsLink(position, true);
    console.log('🗺️ Opening navigation to position:', { position, url: mapsUrl });
    window.open(mapsUrl, '_system');
  }

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
        return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=driving`;
      } else {
        return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
      }
    }
    
    // Vérifier si c'est un format WKB
    if (position.length >= 50 && 
        position.match(/^[0-9A-F]+$/i) && 
        position.toUpperCase().startsWith('0101000020E6100000')) {
      
      console.log('📍 WKB format detected, decoding...');
      const coords = this.decodeWKB(position);
      
      if (coords) {
        console.log('📍 WKB decoded coordinates:', coords);
        
        if (useNavigation) {
          return `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}&travelmode=driving`;
        } else {
          return `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
        }
      }
    }
    
    // Si c'est déjà une adresse texte
    console.log('📍 Text format detected, using as address');
    const encodedAddress = encodeURIComponent(position + ', Conakry, Guinée');
    
    if (useNavigation) {
      return `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}&travelmode=driving`;
    } else {
      return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    }
  }

  decodeWKB(wkbHex: string): {lat: number, lng: number} | null {
    try {
      console.log('🔍 Decoding WKB:', wkbHex);
      
      if (wkbHex.length >= 50) {
        const geometryType = wkbHex.substring(2, 10);
        const srid = wkbHex.substring(10, 18);
        
        if (geometryType.toUpperCase() === '01000020' && srid.toUpperCase() === 'E6100000') {
          const xHex = wkbHex.substring(18, 34);
          const yHex = wkbHex.substring(34, 50);
          
          const lng = this.hexToFloat64LittleEndian(xHex);
          const lat = this.hexToFloat64LittleEndian(yHex);
          
          if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            return { lat, lng };
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error decoding WKB:', error);
      return null;
    }
  }

  hexToFloat64LittleEndian(hexStr: string): number {
    try {
      const buffer = new ArrayBuffer(8);
      const view = new DataView(buffer);

      for (let i = 0; i < 8; i++) {
        const byte = parseInt(hexStr.substr(i * 2, 2), 16);
        view.setUint8(i, byte);
      }

      return view.getFloat64(0, true);
    } catch (error) {
      console.error('Error converting hex to float64:', error);
      return 0;
    }
  }

  // ============================================================================
  // BLOCAGE / DÉBLOCAGE CONDUCTEUR
  // ============================================================================

  async onToggleConducteurActif(conducteur: ConducteurStats) {
    const action = conducteur.actif !== false ? 'bloquer' : 'débloquer';
    const newStatus = conducteur.actif === false; // Inverser le statut

    const alert = await this.alertController.create({
      header: `Confirmer ${action}`,
      message: `Voulez-vous vraiment ${action} le conducteur ${conducteur.prenom} ${conducteur.nom} ?${
        !newStatus ? '\n\nLe conducteur ne pourra plus se connecter ni recevoir de courses.' : ''
      }`,
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Confirmer',
          handler: async () => {
            await this.executeToggleConducteur(conducteur, newStatus);
          }
        }
      ]
    });

    await alert.present();
  }

  private async executeToggleConducteur(conducteur: ConducteurStats, newStatus: boolean) {
    try {
      const { success, error } = await this.entrepriseService.toggleConducteurActif(
        conducteur.id,
        newStatus
      );

      if (success) {
        await this.showSuccess(`Conducteur ${newStatus ? 'débloqué' : 'bloqué'} avec succès`);
        await this.loadConducteurs(false);
      } else {
        console.error('Erreur toggle conducteur:', error);
        await this.showError(`Erreur lors du ${newStatus ? 'déblocage' : 'blocage'} du conducteur`);
      }
    } catch (error) {
      console.error('Erreur toggle conducteur:', error);
      await this.showError('Une erreur est survenue');
    }
  }

  // ============================================================================
  // HELPERS - TOASTS
  // ============================================================================

  private async showSuccess(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color: 'success',
      position: 'top'
    });
    await toast.present();
  }

  private async showError(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color: 'danger',
      position: 'top'
    });
    await toast.present();
  }
}