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
  IonListHeader
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { person, call, mail, car, star, settings, logOut } from 'ionicons/icons';
import { AuthService } from '../services/auth.service';

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
    CommonModule,
    FormsModule,
  ],
})
export class ProfilePage implements OnInit {

  driver = {
    name: 'Jean Dupont',
    phone: '+33 6 12 34 56 78',
    email: 'jean.dupont@email.com',
    vehicle: 'Mercedes Classe E',
    rating: 4.8,
    totalRides: 142,
    memberSince: '2023'
  };

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    addIcons({ person, call, mail, car, star, settings, logOut });
  }

  ngOnInit() {
    this.loadDriverProfile();
  }

  loadDriverProfile() {
    const conducteur = this.authService.getCurrentConducteur();
    if (conducteur) {
      this.driver = {
        name: `${conducteur.prenom || ''} ${conducteur.nom || ''}`.trim() || 'Conducteur',
        phone: conducteur.telephone || '',
        email: conducteur.email || '',
        vehicle: conducteur.vehicule_type || 'Non spécifié',
        rating: 4.8,
        totalRides: 142,
        memberSince: '2023'
      };
    }
  }

  onSettings() {
    // TODO: Implement settings navigation
    console.log('Navigate to settings');
  }

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}