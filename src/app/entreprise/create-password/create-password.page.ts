import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar, 
  IonButton, 
  IonIcon, 
  IonSpinner,
  AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  arrowBack, 
  eye, 
  eyeOff, 
  lockClosed, 
  checkmarkCircle,
  business,
  shieldCheckmark
} from 'ionicons/icons';
import { EntrepriseAuthService, Entreprise } from '../../services/entreprise-auth.service';

@Component({
  selector: 'app-create-password',
  templateUrl: './create-password.page.html',
  styleUrls: ['./create-password.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButton,
    IonIcon,
    IonSpinner
  ]
})
export class CreatePasswordPage implements OnInit {
  entreprise: Entreprise | null = null;
  password = '';
  confirmPassword = '';
  showPassword = false;
  showConfirmPassword = false;
  isLoading = false;
  errorMessage = '';

  passwordValidation = {
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private entrepriseAuthService: EntrepriseAuthService,
    private alertController: AlertController
  ) {
    addIcons({ 
      arrowBack, 
      eye, 
      eyeOff, 
      lockClosed, 
      checkmarkCircle,
      business,
      shieldCheckmark
    });
  }

  ngOnInit() {
    // Récupérer les données d'entreprise depuis les paramètres de navigation
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state?.['entreprise']) {
      this.entreprise = navigation.extras.state['entreprise'];
      console.log('Entreprise from navigation state:', this.entreprise);
    } else {
      // Essayer de récupérer depuis le service
      this.entreprise = this.entrepriseAuthService.getCurrentEntreprise();
      console.log('Entreprise from service:', this.entreprise);
      
      if (!this.entreprise) {
        // Si pas de données, retourner au login
        console.log('No entreprise found, redirecting to login');
        this.router.navigate(['/login'], { queryParams: { type: 'entreprise' } });
        return;
      }
    }
    
    console.log('Final entreprise in ngOnInit:', this.entreprise);
  }

  goBack() {
    this.router.navigate(['/login'], { queryParams: { type: 'entreprise' } });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onPasswordChange() {
    this.validatePassword();
    this.clearError();
  }

  validatePassword() {
    this.passwordValidation = {
      minLength: this.password.length >= 8,
      hasUppercase: /[A-Z]/.test(this.password),
      hasLowercase: /[a-z]/.test(this.password),
      hasNumber: /\d/.test(this.password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(this.password)
    };
  }

  isPasswordValid(): boolean {
    return Object.values(this.passwordValidation).every(valid => valid);
  }

  passwordsMatch(): boolean {
    return this.password === this.confirmPassword && this.confirmPassword.length > 0;
  }

  canSubmit(): boolean {
    const isValid = this.isPasswordValid();
    const matches = this.passwordsMatch();
    const notLoading = !this.isLoading;
    
    console.log('Debug canSubmit:', {
      isPasswordValid: isValid,
      passwordsMatch: matches,
      notLoading: notLoading,
      passwordValidation: this.passwordValidation,
      password: this.password,
      confirmPassword: this.confirmPassword
    });
    
    return isValid && matches && notLoading;
  }

  clearError() {
    this.errorMessage = '';
  }

  async onCreatePassword() {
    console.log('=== onCreatePassword called ===');
    console.log('canSubmit:', this.canSubmit());
    console.log('this.entreprise:', this.entreprise);
    console.log('entreprise from service:', this.entrepriseAuthService.getCurrentEntreprise());
    
    // Essayer de récupérer l'entreprise du service si elle est null
    if (!this.entreprise) {
      this.entreprise = this.entrepriseAuthService.getCurrentEntreprise();
      console.log('Récupérée du service:', this.entreprise);
    }
    
    if (!this.canSubmit() || !this.entreprise) {
      console.log('Stopping: canSubmit or entreprise failed');
      return;
    }

    console.log('Starting password creation...');
    this.isLoading = true;
    this.clearError();

    try {
      console.log('Calling createPassword with:', this.entreprise.id, this.password);
      const success = await this.entrepriseAuthService.createPassword(
        this.entreprise.id, 
        this.password
      );
      console.log('createPassword result:', success);

      if (success) {
        // Vérifier que l'entreprise est bien connectée
        const isLoggedIn = this.entrepriseAuthService.isLoggedIn();
        const currentEntreprise = this.entrepriseAuthService.getCurrentEntreprise();
        
        console.log('After password creation:');
        console.log('- Is logged in:', isLoggedIn);
        console.log('- Current entreprise:', currentEntreprise);
        
        if (!isLoggedIn || !currentEntreprise) {
          console.error('Entreprise not properly logged in after password creation');
          this.errorMessage = 'Erreur de connexion après création du mot de passe. Veuillez vous reconnecter.';
          return;
        }

        // Afficher un message de succès
        const alert = await this.alertController.create({
          header: 'Mot de passe créé',
          message: 'Votre mot de passe a été créé avec succès. Vous êtes maintenant connecté.',
          buttons: ['OK']
        });

        await alert.present();
        await alert.onDidDismiss();

        // Rediriger vers le dashboard entreprise avec replaceUrl pour éviter le back
        const navigationSuccess = await this.router.navigate(['/entreprise/dashboard'], { replaceUrl: true });
        
        if (!navigationSuccess) {
          console.error('Navigation failed, trying alternative approach');
          // Alternative: redirection forcée
          window.location.href = '/entreprise/dashboard';
        }
      } else {
        this.errorMessage = 'Erreur lors de la création du mot de passe. Veuillez réessayer.';
      }
    } catch (error) {
      console.error('Create password error:', error);
      this.errorMessage = 'Une erreur inattendue s\'est produite. Veuillez réessayer.';
    } finally {
      this.isLoading = false;
    }
  }
}