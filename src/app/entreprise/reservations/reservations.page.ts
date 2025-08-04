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
  IonCardHeader,
  IonCardTitle,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonButton,
  IonIcon,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonModal,
  IonInput,
  IonAlert,
  IonSegment,
  IonSegmentButton,
  IonChip,
  IonSearchbar,
  IonAccordion,
  IonAccordionGroup,
  IonAvatar,
  IonText
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  document, 
  checkmarkCircle, 
  time, 
  car,
  person,
  location,
  wallet,
  keypad,
  refresh,
  search,
  chevronDown,
  chevronForward,
  map,
  star,
  calendar,
  call
} from 'ionicons/icons';
import { EntrepriseService } from '../../services/entreprise.service';

interface ConducteurGroup {
  conducteur: any;
  reservations: any[];
  totalReservations: number;
  totalRevenue: number;
  isExpanded: boolean;
}

@Component({
  selector: 'app-entreprise-reservations',
  templateUrl: './reservations.page.html',
  styleUrls: ['./reservations.page.scss'],
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
    IonCardHeader,
    IonCardTitle,
    IonList,
    IonItem,
    IonLabel,
    IonBadge,
    IonButton,
    IonIcon,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
    IonModal,
    IonInput,
    IonAlert,
    IonSegment,
    IonSegmentButton,
    IonChip,
    IonSearchbar,
    IonAccordion,
    IonAccordionGroup,
    IonAvatar,
    IonText
  ]
})

export class EntrepriseReservationsPage implements OnInit {
  reservations: any[] = [];
  filteredReservations: any[] = [];
  conducteurGroups: ConducteurGroup[] = [];
  isLoading = true;
  selectedFilter = 'all';
  searchTerm = '';
  
  // Modal de validation
  isValidationModalOpen = false;
  selectedReservation: any = null;
  validationCode = '';
  isValidating = false;
  
  // Modal de détails
  isDetailsModalOpen = false;
  selectedReservationDetails: any = null;

  constructor(private entrepriseService: EntrepriseService) {
    addIcons({ 
      document, 
      checkmarkCircle, 
      time, 
      car,
      person,
      location,
      wallet,
      keypad,
      refresh,
      search,
      chevronDown,
      chevronForward,
      map,
      star,
      calendar,
      call
    });
  }

  ngOnInit() {
    this.loadReservations();
  }

  async loadReservations(showLoading = true) {
    if (showLoading) {
      this.isLoading = true;
    }
    
    try {
      this.reservations = await this.entrepriseService.getReservationsEntreprise();
      this.groupByConducteur();
    } catch (error) {
      console.error('Error loading reservations:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async doRefresh(event: any) {
    await this.loadReservations(false);
    event.target.complete();
  }

  onFilterChange(event: any) {
    this.selectedFilter = event.detail.value;
    this.groupByConducteur();
  }

  onSearchChange(event: any) {
    this.searchTerm = event.detail.value.toLowerCase();
    this.groupByConducteur();
  }

  groupByConducteur() {
    // Filtrer d'abord par statut
    let filteredReservations;
    
    if (this.selectedFilter === 'all') {
      // Afficher toutes les réservations peu importe leur statut
      filteredReservations = this.reservations;
    } else if (this.selectedFilter === 'completed') {
      // Section TERMINÉES : filtrer avec date_code_validation
      filteredReservations = this.reservations.filter(r => 
        r.statut === 'completed' && r.date_code_validation != null
      );
    } else {
      // Autres filtres
      filteredReservations = this.reservations.filter(r => r.statut === this.selectedFilter);
    }

    // Puis par terme de recherche
    if (this.searchTerm) {
      filteredReservations = filteredReservations.filter(r =>
        r.conducteurs?.nom?.toLowerCase().includes(this.searchTerm) ||
        r.conducteurs?.prenom?.toLowerCase().includes(this.searchTerm) ||
        r.destination_nom?.toLowerCase().includes(this.searchTerm) ||
        r.position_depart?.toLowerCase().includes(this.searchTerm) ||
        r.client_phone?.toLowerCase().includes(this.searchTerm)
      );
    }

    // Grouper par conducteur
    const groups = new Map<string, ConducteurGroup>();

    filteredReservations.forEach(reservation => {
      const conducteurId = reservation.conducteur_id || 'unknown';
      
      if (!groups.has(conducteurId)) {
        // Utiliser 'conducteurs' au lieu de 'conducteur' (c'est le nom de la relation dans la requête)
        const conducteurInfo = reservation.conducteurs || { nom: 'Conducteur inconnu', prenom: '' };
        groups.set(conducteurId, {
          conducteur: conducteurInfo,
          reservations: [],
          totalReservations: 0,
          totalRevenue: 0,
          isExpanded: false
        });
      }

      const group = groups.get(conducteurId)!;
      group.reservations.push(reservation);
      group.totalReservations++;
      if (reservation.prix_total && reservation.statut === 'completed') {
        group.totalRevenue += reservation.prix_total;
      }
    });

    // S'assurer que tous les conducteurs avec au moins une réservation sont affichés
    this.conducteurGroups = Array.from(groups.values())
      .filter(group => group.totalReservations > 0) // Ne garder que les conducteurs avec des réservations
      .sort((a, b) => b.totalReservations - a.totalReservations);
  }

  toggleAccordion(group: ConducteurGroup) {
    group.isExpanded = !group.isExpanded;
  }

  openInMaps(position: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.openPositionInMaps(position);
  }

  getStatusColor(statut: string): string {
    switch (statut) {
      case 'completed': return 'success';
      case 'accepted': return 'warning';
      case 'pending': return 'primary';
      case 'refused': return 'danger';
      case 'canceled': return 'medium';
      default: return 'medium';
    }
  }

  getStatusText(statut: string): string {
    switch (statut) {
      case 'completed': return 'Terminée';
      case 'accepted': return 'Acceptée';
      case 'pending': return 'En attente';
      case 'refused': return 'Refusée';
      case 'canceled': return 'Annulée';
      default: return statut;
    }
  }

  openValidationModal(reservation: any) {
    this.selectedReservation = reservation;
    this.validationCode = '';
    this.isValidationModalOpen = true;
  }

  closeValidationModal() {
    this.isValidationModalOpen = false;
    this.selectedReservation = null;
    this.validationCode = '';
  }

  async validateCourse() {
    if (!this.validationCode || !this.selectedReservation) return;

    this.isValidating = true;
    
    try {
      const success = await this.entrepriseService.validateCourse(
        this.selectedReservation.id, 
        this.validationCode
      );
      
      if (success) {
        // Actualiser la liste
        await this.loadReservations(false);
        this.closeValidationModal();
        
        // TODO: Afficher un toast de succès
        console.log('Course validée avec succès');
      } else {
        // TODO: Afficher un toast d'erreur
        console.error('Code de validation incorrect');
      }
    } catch (error) {
      console.error('Error validating course:', error);
    } finally {
      this.isValidating = false;
    }
  }

  formatCurrency(amount: number): string {
    if (!amount) return '0 GNF';
    return new Intl.NumberFormat('fr-GN', {
      style: 'currency',
      currency: 'GNF',
      minimumFractionDigits: 0
    }).format(amount);
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  canValidate(reservation: any): boolean {
    return reservation.statut === 'accepted' && 
           reservation.code_validation && 
           !reservation.date_code_validation;
  }

  trackByConducteur(index: number, group: ConducteurGroup): string {
    return group.conducteur.id || index.toString();
  }

  trackByReservation(index: number, reservation: any): string {
    return reservation.id || index.toString();
  }

  openReservationDetails(reservation: any) {
    this.selectedReservationDetails = reservation;
    this.isDetailsModalOpen = true;
  }

  closeDetailsModal() {
    this.isDetailsModalOpen = false;
    this.selectedReservationDetails = null;
  }

  truncateText(text: string, maxLength: number): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  formatGPSToMapsLink(position: string): string {
    if (!position) return '';
    
    // Vérifier si c'est un format POINT(lon lat)
    const pointMatch = position.match(/POINT\(([\-\d\.]+)\s+([\-\d\.]+)\)/);
    if (pointMatch) {
      const lon = pointMatch[1];
      const lat = pointMatch[2];
      return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
    }
    
    // Si c'est déjà une adresse texte
    const encodedAddress = encodeURIComponent(position + ', Conakry, Guinée');
    return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
  }

  openPositionInMaps(position: string) {
    const mapsUrl = this.formatGPSToMapsLink(position);
    window.open(mapsUrl, '_blank');
  }

  formatDistance(distance: number): string {
    if (!distance) return 'N/A';
    return `${distance.toFixed(2)} km`;
  }

  getRatingStars(note: number): number[] {
    if (!note) return [];
    return Array(Math.floor(note)).fill(0);
  }
}