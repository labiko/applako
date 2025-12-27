/**
 * MODALE POUR LE CHANGEMENT DE MOT DE PASSE
 * Style identique à la modale Notifications
 */

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonInput,
  ModalController,
  ToastController,
  LoadingController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  lockClosedOutline,
  eyeOutline,
  eyeOffOutline,
  keyOutline,
  checkmarkCircleOutline
} from 'ionicons/icons';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-password-modal',
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Changer mot de passe</ion-title>
        <ion-button
          slot="end"
          fill="clear"
          color="light"
          (click)="close()">
          <ion-icon name="close-outline" slot="icon-only"></ion-icon>
        </ion-button>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="modal-content">

        <!-- Mot de passe actuel -->
        <div class="form-group">
          <ion-label class="field-label">
            <ion-icon name="lock-closed-outline"></ion-icon>
            Mot de passe actuel *
          </ion-label>
          <div class="input-wrapper">
            <ion-input
              [type]="showCurrentPassword ? 'text' : 'password'"
              [(ngModel)]="passwordForm.currentPassword"
              placeholder="Entrez votre mot de passe actuel"
              class="password-input">
            </ion-input>
            <ion-button fill="clear" size="small" (click)="toggleCurrentPasswordVisibility()">
              <ion-icon [name]="showCurrentPassword ? 'eye-off-outline' : 'eye-outline'" slot="icon-only"></ion-icon>
            </ion-button>
          </div>
        </div>

        <!-- Nouveau mot de passe -->
        <div class="form-group">
          <ion-label class="field-label">
            <ion-icon name="key-outline"></ion-icon>
            Nouveau mot de passe * (min. 6 caractères)
          </ion-label>
          <div class="input-wrapper">
            <ion-input
              [type]="showNewPassword ? 'text' : 'password'"
              [(ngModel)]="passwordForm.newPassword"
              placeholder="Entrez le nouveau mot de passe"
              class="password-input">
            </ion-input>
            <ion-button fill="clear" size="small" (click)="toggleNewPasswordVisibility()">
              <ion-icon [name]="showNewPassword ? 'eye-off-outline' : 'eye-outline'" slot="icon-only"></ion-icon>
            </ion-button>
          </div>
        </div>

        <!-- Confirmer mot de passe -->
        <div class="form-group">
          <ion-label class="field-label">
            <ion-icon name="checkmark-circle-outline"></ion-icon>
            Confirmer le nouveau mot de passe *
          </ion-label>
          <div class="input-wrapper">
            <ion-input
              [type]="showNewPassword ? 'text' : 'password'"
              [(ngModel)]="passwordForm.confirmPassword"
              placeholder="Confirmez le nouveau mot de passe"
              class="password-input">
            </ion-input>
          </div>
        </div>

        <!-- Message d'erreur -->
        <div
          *ngIf="passwordForm.newPassword && passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword"
          class="error-message">
          Les mots de passe ne correspondent pas
        </div>

        <!-- Boutons d'action -->
        <div class="actions-footer">
          <ion-button
            expand="block"
            color="primary"
            (click)="onSavePassword()"
            [disabled]="isSaving || !isFormValid()">
            {{ isSaving ? 'Enregistrement...' : 'Enregistrer' }}
          </ion-button>
          <ion-button
            expand="block"
            fill="outline"
            (click)="close()">
            Annuler
          </ion-button>
        </div>

      </div>
    </ion-content>
  `,
  styleUrls: ['./password-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonItem,
    IonLabel,
    IonInput
  ]
})
export class PasswordModalComponent {

  @Input() conducteurId: string = '';

  passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  showCurrentPassword = false;
  showNewPassword = false;
  isSaving = false;

  constructor(
    private modalController: ModalController,
    private authService: AuthService,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {
    addIcons({
      closeOutline,
      lockClosedOutline,
      eyeOutline,
      eyeOffOutline,
      keyOutline,
      checkmarkCircleOutline
    });
  }

  async close() {
    await this.modalController.dismiss();
  }

  toggleCurrentPasswordVisibility() {
    this.showCurrentPassword = !this.showCurrentPassword;
  }

  toggleNewPasswordVisibility() {
    this.showNewPassword = !this.showNewPassword;
  }

  isFormValid(): boolean {
    return !!(
      this.passwordForm.currentPassword &&
      this.passwordForm.newPassword &&
      this.passwordForm.newPassword.length >= 6 &&
      this.passwordForm.newPassword === this.passwordForm.confirmPassword
    );
  }

  async onSavePassword() {
    if (!this.isFormValid()) {
      await this.showToast('Veuillez vérifier les champs', 'warning');
      return;
    }

    if (!this.conducteurId) {
      await this.showToast('Erreur: conducteur non identifié', 'danger');
      return;
    }

    this.isSaving = true;
    const loading = await this.loadingController.create({
      message: 'Mise à jour...'
    });
    await loading.present();

    try {
      const result = await this.authService.updatePassword(
        this.conducteurId,
        this.passwordForm.currentPassword,
        this.passwordForm.newPassword
      );

      if (result.success) {
        await this.showToast('Mot de passe mis à jour avec succès', 'success');
        await this.modalController.dismiss({ success: true });
      } else {
        await this.showToast(result.error || 'Erreur lors de la mise à jour', 'danger');
      }
    } catch (error) {
      console.error('Erreur mise à jour mot de passe:', error);
      await this.showToast('Erreur technique', 'danger');
    } finally {
      this.isSaving = false;
      await loading.dismiss();
    }
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'top',
      color
    });
    await toast.present();
  }
}
