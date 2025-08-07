import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { carSport, call, eye, eyeOff, logIn, alertCircle, business, mail, arrowBack, ban } from 'ionicons/icons';
import { AuthService } from '../services/auth.service';
import { EntrepriseAuthService } from '../services/entreprise-auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class LoginPage implements OnInit {
  userType: 'conducteur' | 'entreprise' = 'conducteur';
  
  credentials = {
    phone: '',
    email: '',
    password: ''
  };
  
  isLoading = false;
  errorMessage = '';
  showPassword = false;
  blockedInfo: any = null;

  constructor(
    private authService: AuthService,
    private entrepriseAuthService: EntrepriseAuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    addIcons({ carSport, call, eye, eyeOff, logIn, alertCircle, business, mail, arrowBack, ban });
  }

  ngOnInit() {
    // Récupérer le type d'utilisateur depuis les paramètres de route
    this.route.queryParams.subscribe(params => {
      if (params['type']) {
        this.userType = params['type'];
        // Effacer le message de blocage si on change de type d'utilisateur
        if (this.userType !== 'conducteur') {
          this.blockedInfo = null;
        }
      }
    });
    
    // Vérifier si un conducteur a été bloqué (seulement si conducteur)
    if (this.userType === 'conducteur') {
      this.checkBlockedInfo();
    }
  }
  
  private checkBlockedInfo() {
    const blockedInfoStr = localStorage.getItem('conducteur_bloque_info');
    if (blockedInfoStr) {
      try {
        this.blockedInfo = JSON.parse(blockedInfoStr);
        // Supprimer l'info après l'avoir récupérée pour ne l'afficher qu'une fois
        localStorage.removeItem('conducteur_bloque_info');
      } catch (error) {
        console.error('Erreur parsing blocked info:', error);
      }
    }
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  async onLogin() {
    // Validation des champs selon le type d'utilisateur
    if (this.userType === 'conducteur') {
      if (!this.credentials.phone || !this.credentials.password) {
        this.errorMessage = 'Veuillez remplir tous les champs';
        return;
      }
    } else {
      // Pour l'entreprise, seul l'email est requis initialement
      if (!this.credentials.email) {
        this.errorMessage = 'Veuillez remplir votre email';
        return;
      }
    }

    this.isLoading = true;
    this.errorMessage = '';
    // Effacer le message de blocage précédent
    this.blockedInfo = null;

    try {
      if (this.userType === 'conducteur') {
        const result = await this.authService.login(this.credentials.phone, this.credentials.password);
        
        if (result === true) {
          // Connexion réussie
          this.router.navigate(['/tabs']);
        } else if (typeof result === 'object' && result.blocked) {
          // Conducteur bloqué - afficher le message
          console.log('🚫 Données de blocage reçues:', result);
          this.blockedInfo = {
            motif: result.motif || 'Motif non spécifié',
            bloque_par: result.bloque_par || 'Administration',
            date_blocage: new Date().toISOString()
          };
          this.errorMessage = '';
          console.log('🚫 BlockedInfo assigné:', this.blockedInfo);
        } else {
          this.errorMessage = 'Numéro de téléphone ou mot de passe incorrect';
        }
      } else {
        // Gestion entreprise avec première connexion
        const result = await this.entrepriseAuthService.login(this.credentials.email, this.credentials.password);
        
        if (result.success) {
          this.router.navigate(['/entreprise/dashboard']);
        } else if (result.needsPassword && result.entreprise) {
          // Rediriger vers la page de création de mot de passe
          this.router.navigate(['/create-password'], {
            state: { entreprise: result.entreprise }
          });
        } else {
          this.errorMessage = 'Email ou mot de passe incorrect';
        }
      }
    } catch (error) {
      this.errorMessage = 'Erreur de connexion. Veuillez réessayer.';
      console.error('Login error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  goBack() {
    this.router.navigate(['/user-type-selection']);
  }
}