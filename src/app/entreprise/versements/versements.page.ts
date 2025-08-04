import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastController } from '@ionic/angular';
import { 
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonList,
  IonItem,
  IonAvatar,
  IonBadge,
  IonButton,
  IonIcon,
  IonChip,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonModal,
  IonInput,
  IonTextarea,
  IonCheckbox,
  IonGrid,
  IonRow,
  IonCol,
  IonText,
  IonProgressBar,
  IonToast
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  wallet,
  cash,
  people,
  time,
  checkmarkCircle,
  alertCircle,
  eye,
  key,
  close,
  refresh,
  warning,
  star,
  documentText,
  camera,
  create,
  send,
  analytics,
  hourglass,
  checkmark,
  ellipse,
  location,
  call,
  speedometer,
  chatbubbleEllipses,
  car,
  statsChart,
  download
} from 'ionicons/icons';
import { VersementService } from '../../services/versement.service';
import { 
  ConducteurVersement, 
  Versement, 
  VersementDashboard,
  FileAttenteEntry 
} from '../../models/versement.model';

@Component({
  selector: 'app-versements',
  templateUrl: './versements.page.html',
  styleUrls: ['./versements.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonList,
    IonItem,
    IonAvatar,
    IonBadge,
    IonButton,
    IonIcon,
    IonChip,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
    IonModal,
    IonInput,
    IonTextarea,
    IonCheckbox,
    IonGrid,
    IonRow,
    IonCol,
    IonText,
    IonProgressBar,
    IonToast
  ]
})
export class VersementsPage implements OnInit {
  
  // Onglets
  selectedSegment: string = 'a-verser';
  
  // Données
  conducteursVersements: ConducteurVersement[] = [];
  reservationsEnAttente: any[] = [];
  historiqueVersements: Versement[] = [];
  fileAttente: FileAttenteEntry[] = [];
  dashboardData: VersementDashboard = {
    montantTotalJour: 0,
    nombreConducteursPresents: 0,
    nombreVersementsEnCours: 0,
    tempsAttenteMoyen: 0,
    tauxSuccesOTP: 0,
    nombreAnomaliesDetectees: 0,
    montantMoyenParVersement: 0,
    tendanceHoraire: []
  };
  
  // États
  isLoading = false;
  
  // Modales
  isOTPModalOpen = false;
  isDetailsModalOpen = false;
  
  // Versement sélectionné
  selectedVersement: any = null;
  selectedConducteurVersement: ConducteurVersement | null = null;
  
  // OTP
  otpDigits: string[] = ['', '', '', ''];
  otpError = '';
  
  // Options de versement
  commentaireVersement = '';

  constructor(
    private versementService: VersementService,
    private toastController: ToastController
  ) {
    addIcons({
      wallet,
      cash,
      people,
      time,
      checkmarkCircle,
      alertCircle,
      eye,
      key,
      close,
      refresh,
      warning,
      star,
      documentText,
      camera,
      create,
      send,
      analytics,
      hourglass,
      checkmark,
      ellipse,
      location,
      call,
      speedometer,
      chatbubbleEllipses,
      car,
      statsChart,
      download
    });
  }

  ngOnInit() {
    this.loadData();
  }

  async loadData(showLoading = true) {
    if (showLoading) this.isLoading = true;
    
    try {
      // Charger selon l'onglet sélectionné
      switch (this.selectedSegment) {
        case 'a-verser':
          this.conducteursVersements = await this.versementService.getMontantsAVerser();
          break;
        case 'en-attente':
          this.reservationsEnAttente = await this.versementService.getReservationsEnAttente();
          break;
        case 'historique':
          this.historiqueVersements = await this.versementService.getHistoriqueVersements();
          break;
        case 'file-attente':
          // TODO: Implémenter getFileAttente
          this.fileAttente = [];
          break;
        case 'dashboard':
          this.dashboardData = await this.versementService.getDashboardMetrics();
          break;
      }
    } catch (error) {
      console.error('Erreur chargement données:', error);
    }
    
    this.isLoading = false;
  }

  onSegmentChanged(event: any) {
    this.selectedSegment = event.detail.value;
    this.loadData();
  }

  async onRefresh(event: any) {
    await this.loadData(false);
    event.target.complete();
  }

  // ==================== ACTIONS VERSEMENT ====================

  async traiterVersement(conducteurVersement: ConducteurVersement) {
    try {
      this.selectedConducteurVersement = conducteurVersement;
      
      const reservationIds = conducteurVersement.reservations.map(r => r.id);
      const options = {
        montant: conducteurVersement.montantTotal,
        reservationIds,
        commentaire: this.commentaireVersement
      };

      const result = await this.versementService.initierVersement(
        conducteurVersement.conducteur.id,
        reservationIds,
        options
      );

      if (result.success && result.versementId) {
        // Récupérer le versement créé pour le modal OTP
        this.selectedVersement = {
          id: result.versementId,
          conducteur: conducteurVersement.conducteur,
          montant: conducteurVersement.montantTotal,
          otp_attempts: 0,
          statut: 'otp_envoye'
        };
        
        this.isOTPModalOpen = true;
        this.resetOTP();
      } else {
        console.error('Erreur initiation versement:', result.message);
      }

    } catch (error) {
      console.error('Erreur traitement versement:', error);
    }
  }

  async validerVersement() {
    if (!this.selectedVersement || !this.isOTPComplete()) return;

    try {
      const otpCode = this.otpDigits.join('');
      const options = {};

      const result = await this.versementService.validerVersementAvecOTP(
        this.selectedVersement.id,
        otpCode,
        options
      );

      if (result.success) {
        this.closeOTPModal();
        // Afficher le message de succès
        await this.afficherMessageSucces(this.selectedVersement);
        // Basculer automatiquement vers l'onglet Historique
        this.selectedSegment = 'historique';
        await this.loadData(); // Recharger les données
        console.log('✅ Versement validé avec succès - Redirection vers Historique');
      } else {
        this.otpError = result.message;
        this.selectedVersement.otp_attempts = (this.selectedVersement.otp_attempts || 0) + 1;
      }

    } catch (error) {
      console.error('Erreur validation versement:', error);
      this.otpError = 'Erreur lors de la validation';
    }
  }

  async renvoyerOTP() {
    if (!this.selectedVersement) return;

    try {
      const success = await this.versementService.renvoyerOTP(this.selectedVersement.id);
      if (success) {
        this.resetOTP();
        this.otpError = '';
        console.log('📱 Nouveau code OTP envoyé');
      } else {
        this.otpError = 'Erreur lors du renvoi du code';
      }
    } catch (error) {
      console.error('Erreur renvoi OTP:', error);
      this.otpError = 'Erreur lors du renvoi du code';
    }
  }

  async annulerVersement() {
    // TODO: Implémenter annulation versement
    this.closeOTPModal();
  }

  // ==================== GESTION OTP ====================

  onOTPDigitInput(index: number, event: any) {
    const value = event.target.value;
    if (value && /^\d$/.test(value)) {
      this.otpDigits[index] = value;
      
      // Auto-focus sur le champ suivant
      if (index < 3) {
        const nextInput = document.querySelector(`#otp-${index + 1}`) as HTMLInputElement;
        if (nextInput) {
          nextInput.focus();
        }
      }
    } else {
      this.otpDigits[index] = '';
    }
    
    this.otpError = ''; // Reset l'erreur
  }

  isOTPComplete(): boolean {
    return this.otpDigits.every(digit => digit !== '');
  }

  resetOTP() {
    this.otpDigits = ['', '', '', ''];
    this.otpError = '';
  }

  // ==================== MODALES ====================

  closeOTPModal() {
    this.isOTPModalOpen = false;
    this.selectedVersement = null;
    this.selectedConducteurVersement = null;
    this.resetOTP();
    this.commentaireVersement = '';
  }

  voirDetails(item: any) {
    this.selectedVersement = item;
    this.isDetailsModalOpen = true;
  }

  async voirDetailsHistorique(versement: Versement) {
    console.log('📋 Consultation historique versement:', versement.id);
    
    try {
      // Récupérer les réservations liées à ce versement
      const reservations = await this.versementService.getReservationsByVersementId(versement.id);
      
      // Préparer les données pour la modal
      this.selectedVersement = {
        conducteur: versement.conducteur,
        montant: versement.montant,
        reservations: reservations,
        nombreCourses: reservations.length,
        date_versement: versement.date_versement
      };
      
      this.isDetailsModalOpen = true;
    } catch (error) {
      console.error('Erreur chargement détails historique:', error);
    }
  }

  voirDetailsReservations(conducteurVersement: ConducteurVersement) {
    console.log('📋 Détails des réservations pour:', conducteurVersement.conducteur.nom);
    
    // Préparer les données pour la modal
    this.selectedConducteurVersement = conducteurVersement;
    this.selectedVersement = {
      conducteur: conducteurVersement.conducteur,
      montant: conducteurVersement.montantTotal,
      reservations: conducteurVersement.reservations,
      nombreCourses: conducteurVersement.nombreCourses
    };
    
    this.isDetailsModalOpen = true;
  }

  closeDetailsModal() {
    this.isDetailsModalOpen = false;
    this.selectedVersement = null;
  }

  // ==================== UTILITAIRES ====================

  getStatusColor(statut: string): string {
    switch (statut) {
      case 'verse': return 'success';
      case 'otp_envoye': return 'warning';
      case 'en_attente': return 'medium';
      case 'bloque': return 'danger';
      case 'annule': return 'dark';
      default: return 'medium';
    }
  }

  getStatusText(statut: string): string {
    switch (statut) {
      case 'verse': return 'Versé';
      case 'otp_envoye': return 'En cours';
      case 'en_attente': return 'En attente';
      case 'bloque': return 'Bloqué';
      case 'annule': return 'Annulé';
      default: return statut;
    }
  }

  getAnomalieColor(severity: string): string {
    switch (severity) {
      case 'high': return 'danger';
      case 'medium': return 'warning';
      case 'low': return 'tertiary';
      default: return 'medium';
    }
  }

  formatCurrency(amount: number): string {
    // Format : 289 887 GNF (espaces comme séparateurs de milliers)
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' GNF';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatTime(dateString: string): string {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getMoyennePrix(): string {
    if (!this.selectedVersement?.reservations?.length) return '0';
    const moyenne = this.selectedVersement.montant / this.selectedVersement.reservations.length;
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(moyenne);
  }

  exporterReservations() {
    // TODO: Implémenter l'export CSV/Excel
    console.log('📊 Export des réservations en cours...');
  }

  async afficherMessageSucces(versement: any) {
    const toast = await this.toastController.create({
      message: `
        <div class="success-toast-content">
          <div class="success-header">
            <ion-icon name="checkmarkCircle" class="success-icon"></ion-icon>
            <strong>Versement validé avec succès !</strong>
          </div>
          <div class="success-details">
            <p><strong>${versement.conducteur.prenom} ${versement.conducteur.nom}</strong></p>
            <p>Montant : <strong>${this.formatCurrency(versement.montant)}</strong></p>
            <p>Le conducteur a été notifié par SMS</p>
          </div>
        </div>
      `,
      duration: 5000,
      position: 'top',
      color: 'success',
      cssClass: 'success-versement-toast',
      buttons: [
        {
          text: 'Voir l\'historique',
          role: 'info',
          handler: () => {
            this.selectedSegment = 'historique';
            this.loadData();
          }
        },
        {
          text: 'Fermer',
          role: 'cancel'
        }
      ]
    });

    await toast.present();
  }

  trackByConducteur(index: number, item: ConducteurVersement): string {
    return item.conducteur.id;
  }

  trackByVersement(index: number, item: Versement): string {
    return item.id;
  }
}