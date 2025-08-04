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
import { person, call, mail, car, star, settings, logOut, personCircleOutline, business, colorPalette, idCard, speedometer } from 'ionicons/icons';
import { AuthService } from '../services/auth.service';
import { SupabaseService } from '../services/supabase.service';

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

  driver: any = {
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
    private supabaseService: SupabaseService,
    private router: Router
  ) {
    addIcons({ person, call, mail, car, star, settings, logOut, personCircleOutline, business, colorPalette, idCard, speedometer });
  }

  ngOnInit() {
    this.loadDriverProfile();
  }

  async loadDriverProfile() {
    const conducteur = this.authService.getCurrentConducteur();
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
        memberSince: memberSince
      };
    }
  }

  onSettings() {
    // TODO: Implement settings navigation
    console.log('Navigate to settings');
  }

  getVehicleTypeLabel(vehicleType: string): string {
    switch (vehicleType) {
      case 'moto': return 'Moto';
      case 'voiture': return 'Voiture';
      default: return vehicleType || 'Non spécifié';
    }
  }

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}