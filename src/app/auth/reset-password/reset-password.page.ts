import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonCard,
  IonCardHeader, IonCardTitle, IonCardContent, IonItem,
  IonLabel, IonInput, IonButton, IonIcon, IonAlert,
  LoadingController, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  lockClosedOutline, eyeOutline, eyeOffOutline, checkmarkCircleOutline,
  alertCircleOutline, keyOutline, shieldCheckmarkOutline
} from 'ionicons/icons';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  template: `
<ion-header>
  <ion-toolbar color="primary">
    <ion-title>
      <ion-icon name="key-outline"></ion-icon>
      Nouveau Mot de Passe
    </ion-title>
  </ion-toolbar>
</ion-header>

<ion-content class="ion-padding">
  <div class="reset-container">
    
    <!-- Info de bienvenue -->
    <ion-card class="welcome-card">
      <ion-card-header>
        <ion-card-title>
          <ion-icon name="shield-checkmark-outline"></ion-icon>
          Créer votre nouveau mot de passe
        </ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <p>
          Votre mot de passe a été réinitialisé par l'administrateur.
          Veuillez définir un nouveau mot de passe sécurisé pour accéder à votre compte.
        </p>
      </ion-card-content>
    </ion-card>

    <!-- Formulaire de création mot de passe -->
    <ion-card class="form-card">
      <ion-card-content>
        
        <ion-item class="input-item">
          <ion-label position="stacked">
            <ion-icon name="lock-closed-outline"></ion-icon>
            Nouveau mot de passe *
          </ion-label>
          <ion-input
            type="password"
            [(ngModel)]="newPassword"
            placeholder="Entrez votre nouveau mot de passe"
            (ionInput)="validatePassword()"
            [class.error]="passwordError && newPassword">
          </ion-input>
        </ion-item>
        
        <ion-item class="input-item">
          <ion-label position="stacked">
            <ion-icon name="checkmark-circle-outline"></ion-icon>
            Confirmer le mot de passe *
          </ion-label>
          <ion-input
            type="password"
            [(ngModel)]="confirmPassword"
            placeholder="Confirmez votre nouveau mot de passe"
            (ionInput)="validateConfirmation()"
            [class.error]="confirmError && confirmPassword">
          </ion-input>
        </ion-item>

        <!-- Messages de validation -->
        <div class="validation-messages">
          <div *ngIf="passwordError && newPassword" class="error-message">
            <ion-icon name="alert-circle-outline"></ion-icon>
            {{ passwordError }}
          </div>
          
          <div *ngIf="confirmError && confirmPassword" class="error-message">
            <ion-icon name="alert-circle-outline"></ion-icon>
            {{ confirmError }}
          </div>
          
          <div *ngIf="isPasswordValid" class="success-message">
            <ion-icon name="checkmark-circle-outline"></ion-icon>
            Mot de passe valide
          </div>
        </div>

        <!-- Critères de validation -->
        <div class="password-criteria">
          <h4>Critères du mot de passe :</h4>
          <ul>
            <li [class.valid]="criteria.minLength">
              <ion-icon [name]="criteria.minLength ? 'checkmark-circle-outline' : 'alert-circle-outline'"></ion-icon>
              Au moins 8 caractères
            </li>
            <li [class.valid]="criteria.hasUpper">
              <ion-icon [name]="criteria.hasUpper ? 'checkmark-circle-outline' : 'alert-circle-outline'"></ion-icon>
              Une majuscule
            </li>
            <li [class.valid]="criteria.hasLower">
              <ion-icon [name]="criteria.hasLower ? 'checkmark-circle-outline' : 'alert-circle-outline'"></ion-icon>
              Une minuscule
            </li>
            <li [class.valid]="criteria.hasNumber">
              <ion-icon [name]="criteria.hasNumber ? 'checkmark-circle-outline' : 'alert-circle-outline'"></ion-icon>
              Un chiffre
            </li>
          </ul>
        </div>

        <!-- Bouton de validation -->
        <ion-button
          expand="block"
          color="primary"
          [disabled]="!canSubmit"
          (click)="onCreatePassword()"
          class="submit-button">
          <ion-icon name="key-outline" slot="start"></ion-icon>
          Créer le mot de passe
        </ion-button>

      </ion-card-content>
    </ion-card>
  </div>
</ion-content>
  `,
  styleUrls: ['./reset-password.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar, IonCard,
    IonCardHeader, IonCardTitle, IonCardContent, IonItem,
    IonLabel, IonInput, IonButton, IonIcon, IonAlert
  ]
})
export class ResetPasswordPage implements OnInit {
  
  conducteurId: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  
  passwordError: string = '';
  confirmError: string = '';
  
  criteria = {
    minLength: false,
    hasUpper: false,
    hasLower: false,
    hasNumber: false
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    addIcons({
      lockClosedOutline, eyeOutline, eyeOffOutline, checkmarkCircleOutline,
      alertCircleOutline, keyOutline, shieldCheckmarkOutline
    });
  }

  ngOnInit() {
    // Récupérer l'ID du conducteur depuis les paramètres de route
    this.conducteurId = this.route.snapshot.queryParams['conducteurId'] || '';
    
    if (!this.conducteurId) {
      this.showError('ID conducteur manquant');
      this.router.navigate(['/login']);
    }
  }

  validatePassword() {
    const password = this.newPassword;
    
    // Réinitialiser les critères
    this.criteria = {
      minLength: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumber: /\d/.test(password)
    };

    // Messages d'erreur
    if (password.length > 0 && password.length < 8) {
      this.passwordError = 'Le mot de passe doit contenir au moins 8 caractères';
    } else if (password.length >= 8 && !this.isPasswordValid) {
      this.passwordError = 'Le mot de passe doit respecter tous les critères';
    } else {
      this.passwordError = '';
    }

    // Revalider la confirmation si elle existe
    if (this.confirmPassword) {
      this.validateConfirmation();
    }
  }

  validateConfirmation() {
    if (this.confirmPassword && this.confirmPassword !== this.newPassword) {
      this.confirmError = 'Les mots de passe ne correspondent pas';
    } else {
      this.confirmError = '';
    }
  }

  get isPasswordValid(): boolean {
    return this.criteria.minLength && 
           this.criteria.hasUpper && 
           this.criteria.hasLower && 
           this.criteria.hasNumber;
  }

  get canSubmit(): boolean {
    return this.isPasswordValid && 
           this.confirmPassword === this.newPassword &&
           this.newPassword.length > 0 &&
           this.confirmPassword.length > 0;
  }

  async onCreatePassword() {
    if (!this.canSubmit) {
      this.showError('Veuillez corriger les erreurs avant de continuer');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Création du mot de passe...'
    });
    await loading.present();

    try {
      const result = await this.authService.createNewPassword(this.conducteurId, this.newPassword);
      
      if (result.success) {
        await this.showSuccess('Mot de passe créé avec succès !');
        
        // Rediriger vers la page de connexion après un délai
        setTimeout(() => {
          this.router.navigate(['/login'], { 
            queryParams: { message: 'Mot de passe créé. Vous pouvez maintenant vous connecter.' }
          });
        }, 2000);
      } else {
        throw result.error || new Error('Erreur lors de la création du mot de passe');
      }

    } catch (error: any) {
      console.error('Erreur création mot de passe:', error);
      this.showError(error.message || 'Erreur lors de la création du mot de passe');
    } finally {
      await loading.dismiss();
    }
  }

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
      duration: 4000,
      color: 'danger',
      position: 'top'
    });
    await toast.present();
  }
}