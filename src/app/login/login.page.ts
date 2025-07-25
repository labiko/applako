import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { carSport, call, eye, eyeOff, logIn, alertCircle } from 'ionicons/icons';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class LoginPage {
  credentials = {
    phone: '',
    password: ''
  };
  
  isLoading = false;
  errorMessage = '';
  showPassword = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    addIcons({ carSport, call, eye, eyeOff, logIn, alertCircle });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  async onLogin() {
    if (!this.credentials.phone || !this.credentials.password) {
      this.errorMessage = 'Veuillez remplir tous les champs';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const success = await this.authService.login(this.credentials.phone, this.credentials.password);
      
      if (success) {
        this.router.navigate(['/tabs']);
      } else {
        this.errorMessage = 'Numéro de téléphone ou mot de passe incorrect';
      }
    } catch (error) {
      this.errorMessage = 'Erreur de connexion. Veuillez réessayer.';
      console.error('Login error:', error);
    } finally {
      this.isLoading = false;
    }
  }
}