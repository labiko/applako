import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { carSport, call, eye, eyeOff, logIn, alertCircle, business, mail, arrowBack } from 'ionicons/icons';
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

  constructor(
    private authService: AuthService,
    private entrepriseAuthService: EntrepriseAuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    addIcons({ carSport, call, eye, eyeOff, logIn, alertCircle, business, mail, arrowBack });
  }

  ngOnInit() {
    // Récupérer le type d'utilisateur depuis les paramètres de route
    this.route.queryParams.subscribe(params => {
      if (params['type']) {
        this.userType = params['type'];
      }
    });
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

    try {
      if (this.userType === 'conducteur') {
        const success = await this.authService.login(this.credentials.phone, this.credentials.password);
        if (success) {
          this.router.navigate(['/tabs']);
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