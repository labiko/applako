import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  IonList,
  IonBadge,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonChip,
  IonButtons,
  RefresherCustomEvent
} from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { SupabaseService } from '../../../services/supabase.service';
import { FluxFinancierService } from '../../services/flux-financier.service';

export interface ReservationDetail {
  id: string;
  client_phone: string;
  depart_nom: string;
  destination_nom: string;
  prix_total: number;
  created_at: string;
  date_code_validation: string | null;
  conducteur_nom: string;
  entreprise_nom: string;
  entreprise_id: string;
  
  // Statut de paiement
  type_paiement: 'mobile_money' | 'cash';
  mobile_money_status?: 'SUCCESS' | 'PENDING' | 'FAILED';
  mobile_money_amount?: number;
  
  // Impact sur les commissions
  inclus_dans_calcul: boolean;
  raison_exclusion?: string;
}

export interface EntrepriseDetailStats {
  entreprise_id: string;
  entreprise_nom: string;
  
  // Réservations totales
  nb_reservations_total: number;
  ca_total: number;
  
  // Réservations validées (pour commission)
  nb_reservations_validees: number;
  ca_validees: number;
  
  // Mobile Money validé
  nb_mobile_money_validees: number;
  ca_mobile_money_validees: number;
  
  // Cash validé
  nb_cash_validees: number;
  ca_cash_validees: number;
  
  // Mobile Money non validé
  nb_mobile_money_non_validees: number;
  ca_mobile_money_non_validees: number;
  
  // Cash non validé
  nb_cash_non_validees: number;
  ca_cash_non_validees: number;
  
  // Commission calculée
  commission_due: number;
  taux_commission: number;
}

@Component({
  selector: 'app-financial-detail',
  templateUrl: './financial-detail.page.html',
  styleUrls: ['./financial-detail.page.scss'],
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
    IonList,
    IonBadge,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
    IonSearchbar,
    IonSegment,
    IonSegmentButton,
    IonChip,
    IonButtons
  ]
})
export class FinancialDetailPage implements OnInit {

  periodeId: string = '';
  periode: any = null;
  isLoading = true;
  
  // Données détaillées
  reservationsDetail: ReservationDetail[] = [];
  entreprisesStats: EntrepriseDetailStats[] = [];
  
  // Filtres
  selectedEntreprise = 'all';
  searchTerm = '';
  viewMode: 'all' | 'validees' | 'mobile_money' | 'cash' = 'all';
  
  // Stats globales
  statsGlobales = {
    nb_reservations_total: 0,
    nb_reservations_validees: 0,
    ca_total: 0,
    ca_validees: 0,
    ca_mobile_money: 0,
    ca_cash: 0,
    commission_totale: 0
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supabase: SupabaseService,
    private fluxFinancierService: FluxFinancierService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    this.periodeId = this.route.snapshot.paramMap.get('periodeId') || '';
    
    if (!this.periodeId) {
      this.router.navigate(['/super-admin/financial']);
      return;
    }

    await this.loadPeriodeDetail();
  }

  async loadPeriodeDetail() {
    try {
      this.isLoading = true;

      // 1. Charger les infos de la période
      await this.loadPeriodeInfo();

      // 2. Charger toutes les réservations de la période
      await this.loadReservationsDetail();

      // 3. Calculer les statistiques par entreprise
      this.calculateEntreprisesStats();

      // 4. Calculer les stats globales
      this.calculateStatsGlobales();

    } catch (error) {
      console.error('❌ Erreur loadPeriodeDetail:', error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  private async loadPeriodeInfo() {
    const { data, error } = await this.supabase.client
      .from('facturation_periodes')
      .select('*')
      .eq('id', this.periodeId)
      .single();

    if (error) throw error;
    this.periode = data;
  }

  private async loadReservationsDetail() {
    // Charger toutes les réservations de la période (validées ET non validées)
    const { data: reservations, error } = await this.supabase.client
      .from('reservations')
      .select(`
        id,
        client_phone,
        depart_nom,
        destination_nom,
        prix_total,
        created_at,
        date_code_validation,
        conducteurs!inner(
          nom,
          entreprise_id,
          entreprises!inner(nom)
        )
      `)
      .gte('created_at', this.periode.periode_debut)
      .lt('created_at', new Date(this.periode.periode_fin + 'T23:59:59.999Z').toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Enrichir avec les données de paiement
    for (const reservation of reservations || []) {
      const reservationDetail = await this.enrichReservationWithPayment(reservation);
      this.reservationsDetail.push(reservationDetail);
    }
  }

  private async enrichReservationWithPayment(reservation: any): Promise<ReservationDetail> {
    // Vérifier s'il y a un paiement Mobile Money
    const { data: payments } = await this.supabase.client
      .from('lengopay_payments')
      .select('status, amount')
      .eq('reservation_id', reservation.id)
      .eq('status', 'SUCCESS');

    const hasSuccessPayment = payments && payments.length > 0;
    
    return {
      id: reservation.id,
      client_phone: reservation.client_phone,
      depart_nom: reservation.depart_nom,
      destination_nom: reservation.destination_nom,
      prix_total: reservation.prix_total,
      created_at: reservation.created_at,
      date_code_validation: reservation.date_code_validation,
      conducteur_nom: reservation.conducteurs?.nom || 'N/A',
      entreprise_nom: reservation.conducteurs?.entreprises?.nom || 'N/A',
      entreprise_id: reservation.conducteurs?.entreprise_id || '',
      
      // Type de paiement
      type_paiement: hasSuccessPayment ? 'mobile_money' : 'cash',
      mobile_money_status: hasSuccessPayment ? 'SUCCESS' : undefined,
      mobile_money_amount: hasSuccessPayment ? payments[0].amount : undefined,
      
      // Impact sur les commissions
      inclus_dans_calcul: !!reservation.date_code_validation,
      raison_exclusion: !reservation.date_code_validation ? 'Réservation non validée par le conducteur' : undefined
    };
  }

  private calculateEntreprisesStats() {
    const entreprisesMap = new Map<string, EntrepriseDetailStats>();

    // Initialiser les stats par entreprise
    for (const reservation of this.reservationsDetail) {
      if (!entreprisesMap.has(reservation.entreprise_id)) {
        entreprisesMap.set(reservation.entreprise_id, {
          entreprise_id: reservation.entreprise_id,
          entreprise_nom: reservation.entreprise_nom,
          nb_reservations_total: 0,
          ca_total: 0,
          nb_reservations_validees: 0,
          ca_validees: 0,
          nb_mobile_money_validees: 0,
          ca_mobile_money_validees: 0,
          nb_cash_validees: 0,
          ca_cash_validees: 0,
          nb_mobile_money_non_validees: 0,
          ca_mobile_money_non_validees: 0,
          nb_cash_non_validees: 0,
          ca_cash_non_validees: 0,
          commission_due: 0,
          taux_commission: 11 // Valeur par défaut
        });
      }
    }

    // Calculer les stats
    for (const reservation of this.reservationsDetail) {
      const stats = entreprisesMap.get(reservation.entreprise_id)!;
      
      // Stats totales
      stats.nb_reservations_total++;
      stats.ca_total += reservation.prix_total;

      if (reservation.inclus_dans_calcul) {
        // Réservations validées
        stats.nb_reservations_validees++;
        stats.ca_validees += reservation.prix_total;
        
        if (reservation.type_paiement === 'mobile_money') {
          stats.nb_mobile_money_validees++;
          stats.ca_mobile_money_validees += reservation.prix_total;
        } else {
          stats.nb_cash_validees++;
          stats.ca_cash_validees += reservation.prix_total;
        }
        
        // Commission sur toutes les réservations validées
        stats.commission_due += reservation.prix_total * (stats.taux_commission / 100);
        
      } else {
        // Réservations non validées
        if (reservation.type_paiement === 'mobile_money') {
          stats.nb_mobile_money_non_validees++;
          stats.ca_mobile_money_non_validees += reservation.prix_total;
        } else {
          stats.nb_cash_non_validees++;
          stats.ca_cash_non_validees += reservation.prix_total;
        }
      }
    }

    this.entreprisesStats = Array.from(entreprisesMap.values())
      .sort((a, b) => a.entreprise_nom.localeCompare(b.entreprise_nom));
  }

  private calculateStatsGlobales() {
    this.statsGlobales = {
      nb_reservations_total: this.reservationsDetail.length,
      nb_reservations_validees: this.reservationsDetail.filter(r => r.inclus_dans_calcul).length,
      ca_total: this.reservationsDetail.reduce((sum, r) => sum + r.prix_total, 0),
      ca_validees: this.reservationsDetail.filter(r => r.inclus_dans_calcul).reduce((sum, r) => sum + r.prix_total, 0),
      ca_mobile_money: this.reservationsDetail.filter(r => r.type_paiement === 'mobile_money' && r.inclus_dans_calcul).reduce((sum, r) => sum + r.prix_total, 0),
      ca_cash: this.reservationsDetail.filter(r => r.type_paiement === 'cash' && r.inclus_dans_calcul).reduce((sum, r) => sum + r.prix_total, 0),
      commission_totale: this.entreprisesStats.reduce((sum, e) => sum + e.commission_due, 0)
    };
  }

  // Filtrage des réservations
  get filteredReservations(): ReservationDetail[] {
    let filtered = [...this.reservationsDetail];

    // Filtre par entreprise sélectionnée
    if (this.selectedEntreprise !== 'all') {
      filtered = filtered.filter(r => r.entreprise_id === this.selectedEntreprise);
    }

    // Filtre par mode de vue (segments)
    if (this.viewMode === 'validees') {
      filtered = filtered.filter(r => r.inclus_dans_calcul);
    } else if (this.viewMode === 'mobile_money') {
      filtered = filtered.filter(r => r.type_paiement === 'mobile_money');
    } else if (this.viewMode === 'cash') {
      filtered = filtered.filter(r => r.type_paiement === 'cash');
    }

    // Filtre par recherche
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.client_phone.toLowerCase().includes(term) ||
        r.conducteur_nom.toLowerCase().includes(term) ||
        r.entreprise_nom.toLowerCase().includes(term) ||
        r.depart_nom.toLowerCase().includes(term) ||
        r.destination_nom.toLowerCase().includes(term) ||
        r.id.toLowerCase().includes(term)
      );
    }

    return filtered;
  }

  // Formatage des montants
  formatMontant(montant: number): string {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(montant) + ' GNF';
  }

  // Formatage des dates
  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    
    // Créer la date et ajuster pour le timezone GMT+0 (Conakry)
    const date = new Date(dateStr);
    
    // Si c'est juste une date (YYYY-MM-DD), ne pas ajouter d'heure
    if (dateStr.includes('T') || dateStr.includes(' ')) {
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC' // Afficher en GMT+0
      });
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'UTC' // Afficher en GMT+0
      });
    }
  }

  // Sélection d'entreprise
  selectEntreprise(entrepriseId: string) {
    if (this.selectedEntreprise === entrepriseId) {
      this.selectedEntreprise = 'all'; // Désélectionner si déjà sélectionné
    } else {
      this.selectedEntreprise = entrepriseId;
    }
    this.cdr.detectChanges();
  }

  // Changement de mode de vue
  onViewModeChange() {
    this.cdr.detectChanges();
  }

  // Filtrage des réservations par recherche
  filterReservations() {
    this.cdr.detectChanges();
  }

  // Réinitialiser les filtres
  resetFilters() {
    this.selectedEntreprise = 'all';
    this.searchTerm = '';
    this.viewMode = 'all';
    this.cdr.detectChanges();
  }

  // Refresh des données
  async onRefresh(event?: any) {
    await this.loadPeriodeDetail();
    if (event) {
      event.target.complete();
    }
  }

  // Utilitaires pour les statuts
  getStatutColor(statut: string): string {
    switch (statut) {
      case 'en_cours': return 'warning';
      case 'cloturee': return 'success';
      case 'facturee': return 'primary';
      default: return 'medium';
    }
  }

  getStatutText(statut: string): string {
    switch (statut) {
      case 'en_cours': return 'En Cours';
      case 'cloturee': return 'Clôturée';
      case 'facturee': return 'Facturée';
      default: return statut;
    }
  }

  // Copier l'ID dans le presse-papier
  async copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      console.log('ID copié:', text.substring(0, 8) + '...');
    } catch (error) {
      // Fallback pour navigateurs non compatibles
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      console.log('ID copié (fallback):', text.substring(0, 8) + '...');
    }
  }

  // Navigation
  goBack() {
    this.router.navigate(['/super-admin/financial']);
  }
}