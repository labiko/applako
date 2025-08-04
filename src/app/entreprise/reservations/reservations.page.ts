import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
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
  IonText,
  IonDatetime,
  IonButtons,
  IonSelect,
  IonSelectOption
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
  call,
  calendarOutline,
  todayOutline,
  filterOutline,
  close,
  checkmark
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
    DatePipe,
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
    IonText,
    IonDatetime,
    IonButtons,
    IonSelect,
    IonSelectOption
  ]
})

export class EntrepriseReservationsPage implements OnInit {
  reservations: any[] = [];
  filteredReservations: any[] = [];
  conducteurGroups: ConducteurGroup[] = [];
  isLoading = true;
  selectedFilter = 'all';
  searchTerm = '';
  
  // Filtres de date
  dateFilter = 'all'; // 'all', 'today', 'custom'
  startDate: string = '';
  endDate: string = '';
  isDatePickerOpen = false;
  
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
      call,
      calendarOutline,
      todayOutline,
      filterOutline,
      close,
      checkmark
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

  // Gestion des filtres de date
  onDateFilterChange(event: any) {
    this.dateFilter = event.detail.value;
    
    if (this.dateFilter === 'today') {
      // Définir automatiquement la date d'aujourd'hui
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      this.startDate = todayStr;
      this.endDate = todayStr;
    } else if (this.dateFilter === 'all') {
      // Réinitialiser les dates
      this.startDate = '';
      this.endDate = '';
    }
    
    this.groupByConducteur();
  }

  onDateRangeChange() {
    // Appelé quand les dates personnalisées changent
    console.log('📅 Date range changed:', { startDate: this.startDate, endDate: this.endDate });
    
    if (this.startDate && this.endDate) {
      // Valider que la date de début n'est pas après la date de fin
      if (new Date(this.startDate) > new Date(this.endDate)) {
        this.endDate = this.startDate;
      }
      
      this.dateFilter = 'custom';
      this.groupByConducteur();
    }
  }

  applyDateFilter(reservations: any[]): any[] {
    console.log('🔍 Applying date filter:', { 
      dateFilter: this.dateFilter, 
      startDate: this.startDate, 
      endDate: this.endDate,
      totalReservations: reservations.length 
    });

    if (this.dateFilter === 'all') {
      return reservations;
    }

    if (this.dateFilter === 'today') {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      
      console.log('📅 Today filter:', { todayStart, todayEnd });
      
      const filtered = reservations.filter(reservation => {
        const createdAt = new Date(reservation.created_at);
        const isInRange = createdAt >= todayStart && createdAt <= todayEnd;
        if (isInRange) {
          console.log('✅ Reservation matches today:', { 
            id: reservation.id, 
            created_at: reservation.created_at, 
            createdAt 
          });
        }
        return isInRange;
      });
      
      console.log(`📊 Today filter result: ${filtered.length}/${reservations.length} reservations`);
      return filtered;
    }

    if (this.dateFilter === 'custom' && this.startDate && this.endDate) {
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      end.setHours(23, 59, 59); // Inclure toute la journée de fin
      
      console.log('📅 Custom range filter:', { start, end });
      
      const filtered = reservations.filter(reservation => {
        const createdAt = new Date(reservation.created_at);
        const isInRange = createdAt >= start && createdAt <= end;
        if (isInRange) {
          console.log('✅ Reservation matches custom range:', { 
            id: reservation.id, 
            created_at: reservation.created_at, 
            createdAt 
          });
        }
        return isInRange;
      });
      
      console.log(`📊 Custom filter result: ${filtered.length}/${reservations.length} reservations`);
      return filtered;
    }

    return reservations;
  }

  openDatePicker() {
    this.isDatePickerOpen = true;
  }

  closeDatePicker() {
    this.isDatePickerOpen = false;
  }

  // Méthodes utilitaires pour l'affichage des dates
  formatDateForDisplay(dateString: string): string {
    if (!dateString) return 'Sélectionner';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
      });
    } catch (error) {
      return 'Sélectionner';
    }
  }

  getTodayFormatted(): string {
    const today = new Date();
    return today.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
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

    // Filtrer par date
    filteredReservations = this.applyDateFilter(filteredReservations);

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

  formatGPSToMapsLink(position: string, useNavigation: boolean = true): string {
    if (!position) return '';
    
    // Vérifier si c'est un format POINT(lon lat)
    const pointMatch = position.match(/POINT\(([\-\d\.]+)\s+([\-\d\.]+)\)/);
    if (pointMatch) {
      const lon = pointMatch[1];
      const lat = pointMatch[2];
      
      if (useNavigation) {
        // Navigation directe vers les coordonnées
        return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=driving`;
      } else {
        // Simple recherche
        return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
      }
    }
    
    // Si c'est déjà une adresse texte
    const encodedAddress = encodeURIComponent(position + ', Conakry, Guinée');
    
    if (useNavigation) {
      // Navigation directe vers l'adresse
      return `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}&travelmode=driving`;
    } else {
      // Simple recherche
      return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    }
  }

  openPositionInMaps(position: string) {
    const mapsUrl = this.formatGPSToMapsLink(position, true); // true pour navigation directe
    console.log('🗺️ Opening navigation from current location to:', { position, url: mapsUrl });
    window.open(mapsUrl, '_system');
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