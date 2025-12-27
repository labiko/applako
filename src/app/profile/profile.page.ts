import { Component, OnInit } from '@angular/core';
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
  IonItem,
  IonLabel,
  IonIcon,
  IonText,
  IonAvatar,
  IonList,
  IonListHeader,
  IonRange,
  IonChip,
  IonButton,
  IonModal,
  IonInput,
  IonButtons,
  ToastController,
  LoadingController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  person, call, mail, car, star, settings, logOut, personCircleOutline,
  business, colorPalette, idCard, speedometer, location, navigateCircle,
  informationCircle, bug, lockClosedOutline, keyOutline, closeCircleOutline,
  eyeOutline, eyeOffOutline, checkmarkCircleOutline
} from 'ionicons/icons';
import { AuthService } from '../services/auth.service';
import { APP_VERSION } from '../constants/version';
import { SupabaseService } from '../services/supabase.service';
import { OneSignalService } from '../services/onesignal.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonIcon,
    IonText,
    IonAvatar,
    IonList,
    IonListHeader,
    IonRange,
    IonChip,
    IonButton,
    IonModal,
    IonInput,
    IonButtons,
    CommonModule,
    FormsModule,
  ],
})
export class ProfilePage implements OnInit {
  testMode = false;
  appVersion = APP_VERSION;

  // Modal changement mot de passe
  isPasswordModalOpen = false;
  passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  showCurrentPassword = false;
  showNewPassword = false;
  isSavingPassword = false;

  driver: any = {
    id: '',
    name: '',
    phone: '',
    email: '',
    vehicle_type: '',
    vehicle_marque: '',
    vehicle_modele: '',
    vehicle_couleur: '',
    vehicle_plaque: '',
    rating: 0,
    totalRides: 0,
    memberSince: '',
    rayon_km_reservation: 5,
    entreprise_nom: ''
  };

  constructor(
    private authService: AuthService,
    private supabaseService: SupabaseService,
    private oneSignalService: OneSignalService,
    private router: Router,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {
    addIcons({
      person, call, mail, car, star, settings, logOut, personCircleOutline,
      business, colorPalette, idCard, speedometer, location, navigateCircle,
      informationCircle, bug, lockClosedOutline, keyOutline, closeCircleOutline,
      eyeOutline, eyeOffOutline, checkmarkCircleOutline
    });
  }

  ngOnInit() {
    // ✅ Charger l'état du mode test depuis localStorage
    try {
      if (typeof Storage !== 'undefined') {
        const savedTestMode = localStorage.getItem('testMode');
        if (savedTestMode) {
          this.testMode = JSON.parse(savedTestMode);
        }
      }
    } catch (error) {
      console.warn('Erreur chargement testMode:', error);
    }

    // ✅ S'abonner aux changements de conducteur
    this.authService.currentConducteur$.subscribe(conducteur => {
      if (conducteur) {
        this.loadDriverProfile(conducteur);
      }
    });
  }

  async loadDriverProfile(conducteur: any) {
    if (conducteur) {
      // Récupérer le nombre total de courses
      const totalRides = await this.supabaseService.getConducteurTotalRides(conducteur.id);
      
      // Extraire l'année d'inscription
      let memberSince = '2023'; // Valeur par défaut
      if (conducteur.date_inscription) {
        const inscriptionDate = new Date(conducteur.date_inscription);
        memberSince = inscriptionDate.getFullYear().toString();
      }

      this.driver = {
        id: conducteur.id || '',
        name: `${conducteur.prenom || ''} ${conducteur.nom || ''}`.trim() || 'Conducteur',
        phone: conducteur.telephone || '',
        email: conducteur.email || '',
        vehicle_type: conducteur.vehicle_type || '',
        vehicle_marque: conducteur.vehicle_marque || '',
        vehicle_modele: conducteur.vehicle_modele || '',
        vehicle_couleur: conducteur.vehicle_couleur || '',
        vehicle_plaque: conducteur.vehicle_plaque || '',
        rating: conducteur.note_moyenne || 5.0,
        totalRides: totalRides,
        memberSince: memberSince,
        rayon_km_reservation: conducteur.rayon_km_reservation,
        entreprise_nom: conducteur.entreprise_nom || ''
      };
    }
  }

  getVehicleTypeLabel(vehicleType: string): string {
    switch (vehicleType) {
      case 'moto': return 'Moto';
      case 'voiture': return 'Voiture';
      default: return vehicleType || 'Non spécifié';
    }
  }

  async onLogout() {
    // ✅ NOUVEAU : Désactiver OneSignal avant déconnexion
    await this.oneSignalService.disableConducteurOneSignal();
    
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // Méthodes pour la gestion du rayon de réservation
  getCurrentRayonLabel(): string {
    const rayon = this.driver.rayon_km_reservation || 5;
    return `${rayon}km (${rayon === 5 ? 'par défaut' : 'personnalisé'})`;
  }

  async onRayonChange(event: any) {
    const newRayon = event.detail.value;
    await this.updateRayon(newRayon);
  }

  async setRayon(rayon: number) {
    await this.updateRayon(rayon);
  }

  private async updateRayon(rayon: number) {
    const conducteur = this.authService.getCurrentConducteur();
    if (!conducteur) {
      console.error('Aucun conducteur connecté');
      return;
    }

    try {
      // Mettre à jour en base de données
      const success = await this.supabaseService.updateConducteurRayon(conducteur.id, rayon);
      
      if (success) {
        // Mettre à jour localement
        this.driver.rayon_km_reservation = rayon;
        
        // Mettre à jour le conducteur dans AuthService
        conducteur.rayon_km_reservation = rayon;
        (this.authService as any).currentConducteurSubject.next(conducteur);
        
        // 🔧 NOUVEAU : Synchroniser le localStorage avec les nouvelles données
        try {
          if (typeof Storage !== 'undefined') {
            localStorage.setItem('currentConducteur', JSON.stringify(conducteur));
            console.log('✅ localStorage synchronisé avec nouveau rayon:', rayon);
          }
        } catch (storageError) {
          console.warn('Erreur synchronisation localStorage:', storageError);
        }
        
        // Afficher toast de confirmation
        await this.showToast(`Rayon mis à jour : ${rayon}km`, 'success');
        
        console.log(`✅ Rayon de réservation mis à jour : ${rayon}km`);
      } else {
        await this.showToast('Erreur lors de la mise à jour', 'danger');
      }
    } catch (error) {
      console.error('Erreur updateRayon:', error);
      await this.showToast('Erreur lors de la mise à jour', 'danger');
    }
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'top',
      color: color,
      buttons: [{
        text: 'OK',
        role: 'cancel'
      }]
    });
    await toast.present();
  }

  // ========== GESTION MOT DE PASSE ==========
  openPasswordModal() {
    this.passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
    this.showCurrentPassword = false;
    this.showNewPassword = false;
    this.isPasswordModalOpen = true;
  }

  closePasswordModal() {
    this.isPasswordModalOpen = false;
    this.passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
  }

  toggleCurrentPasswordVisibility() {
    this.showCurrentPassword = !this.showCurrentPassword;
  }

  toggleNewPasswordVisibility() {
    this.showNewPassword = !this.showNewPassword;
  }

  isPasswordFormValid(): boolean {
    return !!(
      this.passwordForm.currentPassword &&
      this.passwordForm.newPassword &&
      this.passwordForm.newPassword.length >= 6 &&
      this.passwordForm.newPassword === this.passwordForm.confirmPassword
    );
  }

  async onSavePassword() {
    if (!this.isPasswordFormValid()) {
      await this.showToast('Veuillez vérifier les champs', 'warning');
      return;
    }

    if (!this.driver.id) {
      await this.showToast('Erreur: conducteur non identifié', 'danger');
      return;
    }

    this.isSavingPassword = true;
    const loading = await this.loadingController.create({
      message: 'Mise à jour...'
    });
    await loading.present();

    try {
      const result = await this.authService.updatePassword(
        this.driver.id,
        this.passwordForm.currentPassword,
        this.passwordForm.newPassword
      );

      if (result.success) {
        await this.showToast('Mot de passe mis à jour avec succès', 'success');
        this.closePasswordModal();
      } else {
        await this.showToast(result.error || 'Erreur lors de la mise à jour', 'danger');
      }
    } catch (error) {
      console.error('Erreur mise à jour mot de passe:', error);
      await this.showToast('Erreur technique', 'danger');
    } finally {
      this.isSavingPassword = false;
      await loading.dismiss();
    }
  }

  // Toggle du mode test
  async toggleTestMode() {
    this.testMode = !this.testMode;
    
    // Sauvegarder l'état dans localStorage (RadiusChangeDetectionService le détectera automatiquement)
    try {
      if (typeof Storage !== 'undefined') {
        localStorage.setItem('testMode', JSON.stringify(this.testMode));
        console.log('✅ Mode test:', this.testMode ? 'ACTIVÉ' : 'DÉSACTIVÉ');
        console.log('🔄 RadiusChangeDetectionService détectera le changement au prochain ionViewWillEnter');
      }
    } catch (error) {
      console.warn('Erreur sauvegarde testMode:', error);
    }
    
    // Afficher toast de confirmation
    await this.showToast(
      this.testMode ? 
        '🐛 Mode test activé - retournez aux réservations pour voir l\'effet' : 
        '✅ Mode test désactivé - filtrage normal restauré', 
      this.testMode ? 'warning' : 'success'
    );
  }
}