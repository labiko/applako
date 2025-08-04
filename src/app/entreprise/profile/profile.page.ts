import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { 
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar,
  IonCard,
  IonCardContent,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { business, logOut, settings, mail, call, location } from 'ionicons/icons';
import { EntrepriseAuthService } from '../../services/entreprise-auth.service';

@Component({
  selector: 'app-entreprise-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
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
    IonList,
    IonItem,
    IonLabel
  ]
})
export class EntrepriseProfilePage implements OnInit {
  entreprise: any = null;

  constructor(
    private entrepriseAuthService: EntrepriseAuthService,
    private router: Router
  ) {
    addIcons({ business, logOut, settings, mail, call, location });
  }

  ngOnInit() {
    this.entreprise = this.entrepriseAuthService.getCurrentEntreprise();
  }

  logout() {
    this.entrepriseAuthService.logout();
    this.router.navigate(['/user-type-selection']);
  }
}