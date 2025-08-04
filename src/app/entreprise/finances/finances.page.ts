import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar,
  IonCard,
  IonCardContent,
  IonIcon
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { wallet } from 'ionicons/icons';

@Component({
  selector: 'app-finances',
  templateUrl: './finances.page.html',
  styleUrls: ['./finances.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent, 
    IonHeader, 
    IonTitle, 
    IonToolbar,
    IonCard,
    IonCardContent,
    IonIcon
  ]
})
export class FinancesPage {
  constructor() {
    addIcons({ wallet });
  }
}