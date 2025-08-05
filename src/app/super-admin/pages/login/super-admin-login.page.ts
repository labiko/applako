/**
 * PAGE LOGIN SUPER-ADMIN
 * Interface sécurisée pour connexion administrateur global
 */

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
  IonInput,
  IonButton,
  IonIcon,
  IonText,
  IonSpinner,
  IonGrid,
  IonRow,
  IonCol,
  LoadingController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  lockClosedOutline, 
  personOutline, 
  eyeOutline, 
  eyeOffOutline, 
  shieldCheckmarkOutline,
  alertCircleOutline,
  checkmarkCircleOutline
} from 'ionicons/icons';

import { SuperAdminAuthService } from '../../services/super-admin-auth.service';

@Component({
  selector: 'app-super-admin-login',
  templateUrl: './super-admin-login.page.html',
  styleUrls: ['./super-admin-login.page.scss'],
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
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonIcon,
    IonText,
    IonSpinner,
    IonGrid,
    IonRow,
    IonCol
  ]
})
export class SuperAdminLoginPage implements OnInit {

  // Données du formulaire
  email: string = '';
  password: string = '';
  showPassword: boolean = false;

  // États de l'interface
  isLoading: boolean = false;
  loginAttempts: number = 0;
  maxAttempts: number = 3;
  errorMessage: string = '';

  constructor(
    private superAdminAuthService: SuperAdminAuthService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    // Ajouter les icônes
    addIcons({
      lockClosedOutline,
      personOutline,
      eyeOutline,
      eyeOffOutline,
      shieldCheckmarkOutline,
      alertCircleOutline,
      checkmarkCircleOutline
    });
  }

  ngOnInit() {
    // Vérifier si déjà connecté
    this.checkExistingSession();
  }

  private async checkExistingSession() {
    if (this.superAdminAuthService.isSuperAdmin()) {
      console.log('🔐 Session super-admin active, redirection...');
      await this.router.navigate(['/super-admin/dashboard']);
    }
  }

  async onLogin() {
    // Validation des champs
    if (!this.email || !this.password) {
      this.showError('Veuillez saisir votre email et mot de passe');
      return;
    }

    if (!this.email.includes('@')) {
      this.showError('Format d\'email invalide');
      return;
    }

    // Vérifier limite tentatives
    if (this.loginAttempts >= this.maxAttempts) {
      this.showError('Trop de tentatives de connexion. Veuillez attendre quelques minutes.');
      return;
    }

    await this.performLogin();
  }

  private async performLogin() {
    const loading = await this.loadingController.create({
      message: 'Connexion sécurisée en cours...',
      spinner: 'crescent'
    });
    await loading.present();

    this.isLoading = true;
    this.errorMessage = '';

    try {
      console.log('🔐 Tentative de connexion super-admin:', { email: this.email });

      const result = await this.superAdminAuthService.loginSuperAdmin(
        this.email.trim().toLowerCase(),
        this.password
      );

      if (result.success && result.data) {
        // Succès - Rediriger vers dashboard
        console.log('✅ Connexion super-admin réussie');
        
        await this.showSuccess('Connexion réussie ! Bienvenue administrateur.');
        await this.router.navigate(['/super-admin/dashboard']);
        
        // Reset form
        this.resetForm();
      } else {
        // Échec de connexion
        this.loginAttempts++;
        console.warn('❌ Échec connexion super-admin:', result.error);
        
        let errorMsg = result.error || 'Erreur de connexion';
        
        // Messages spécifiques selon le type d'erreur
        if (errorMsg.includes('Email ou mot de passe incorrect')) {
          errorMsg = `Identifiants incorrects (Tentative ${this.loginAttempts}/${this.maxAttempts})`;
        } else if (errorMsg.includes('Accès non autorisé')) {
          errorMsg = 'Accès refusé - Droits super-administrateur requis';
        } else if (errorMsg.includes('Trop de tentatives')) {
          this.loginAttempts = this.maxAttempts; // Block future attempts
        }
        
        this.showError(errorMsg);
      }

    } catch (error) {
      console.error('💥 Erreur inattendue lors de la connexion:', error);
      this.loginAttempts++;
      this.showError('Erreur système - Veuillez réessayer plus tard');
    } finally {
      this.isLoading = false;
      await loading.dismiss();
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  private resetForm() {
    this.email = '';
    this.password = '';
    this.showPassword = false;
    this.loginAttempts = 0;
    this.errorMessage = '';
  }

  private async showError(message: string) {
    this.errorMessage = message;
    
    const toast = await this.toastController.create({
      message: message,
      duration: 4000,
      color: 'danger',
      position: 'top',
      icon: 'alert-circle-outline'
    });
    await toast.present();
  }

  private async showSuccess(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      color: 'success',
      position: 'top',
      icon: 'checkmark-circle-outline'
    });
    await toast.present();
  }

  // Getters pour la template
  get isFormValid(): boolean {
    return this.email.length > 0 && 
           this.password.length > 0 && 
           this.email.includes('@') &&
           this.loginAttempts < this.maxAttempts;
  }

  get attemptsRemaining(): number {
    return Math.max(0, this.maxAttempts - this.loginAttempts);
  }

  get showAttemptsWarning(): boolean {
    return this.loginAttempts > 0 && this.loginAttempts < this.maxAttempts;
  }

  get isBlocked(): boolean {
    return this.loginAttempts >= this.maxAttempts;
  }
}