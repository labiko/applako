import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { 
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar, 
  IonCard, 
  IonCardContent, 
  IonButton, 
  IonIcon, 
  IonGrid, 
  IonRow, 
  IonCol 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { carSport, business, person, arrowForward, location } from 'ionicons/icons';
import { APP_VERSION } from '../constants/version';

@Component({
  selector: 'app-user-type-selection',
  templateUrl: './user-type-selection.page.html',
  styleUrls: ['./user-type-selection.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonCard,
    IonCardContent,
    IonButton,
    IonIcon,
    IonGrid,
    IonRow,
    IonCol
  ]
})
export class UserTypeSelectionPage {
  appVersion = APP_VERSION;

  constructor(private router: Router) {
    addIcons({ carSport, business, person, arrowForward, location });
  }

  selectConducteur() {
    this.router.navigate(['/login'], { queryParams: { type: 'conducteur' } });
  }

  selectEntreprise() {
    this.router.navigate(['/login'], { queryParams: { type: 'entreprise' } });
  }
}