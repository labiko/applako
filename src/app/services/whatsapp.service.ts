import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface WhatsAppResponse {
  success: boolean;
  message?: string;
  messageId?: string;
  error?: string;
  idMessage?: string;
}

export interface VersementTemplateData {
  conducteurNom: string;
  montant: number;
  otpCode: string;
  entrepriseNom?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WhatsAppService {

  // Configuration Green API WhatsApp (depuis botResto)
  private readonly GREEN_API_INSTANCE_ID = '7105313693';
  private readonly GREEN_API_TOKEN = '994e56511a43455693d2c4c1e4be86384a27eb921c394d5693';
  private readonly baseUrl = 'https://7105.api.greenapi.com';
  
  constructor(private http: HttpClient) { }

  /**
   * Méthode générique pour envoyer un message WhatsApp via Green API
   * @param phoneNumber Numéro de téléphone (format: 224XXXXXXXXX ou +224XXXXXXXXX)
   * @param message Message à envoyer
   * @param orderNumber Identifiant pour logs (optionnel)
   * @returns Promise avec résultat d'envoi
   */
  async envoyerMessage(phoneNumber: string, message: string, orderNumber?: string): Promise<WhatsAppResponse> {
    try {
      console.log(`📱 Envoi WhatsApp vers ${phoneNumber}: ${message.substring(0, 50)}...`);

      // Nettoyer et formater le numéro de téléphone
      const cleanPhone = this.cleanPhoneNumber(phoneNumber);
      
      // Pas de validation - utiliser les numéros tels qu'ils sont en base
      const chatId = `${cleanPhone}@c.us`;
      const url = `${this.baseUrl}/waInstance${this.GREEN_API_INSTANCE_ID}/sendMessage/${this.GREEN_API_TOKEN}`;
      
      console.log(`📱 Sending WhatsApp message:`);
      console.log(`   URL: ${url}`);
      console.log(`   ChatId: ${chatId}`);
      console.log(`   Order: ${orderNumber || 'N/A'}`);
      console.log(`   Message preview: ${message.substring(0, 100)}...`);
      
      const payload = {
        chatId: chatId,
        message: message.trim()
      };
      
      console.log(`📦 Request payload:`, payload);
      
      const response = await this.http.post<any>(
        url,
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      ).toPromise();

      console.log(`📨 WhatsApp API response:`, response);

      if (response?.idMessage) {
        console.log(`✅ WhatsApp message sent successfully. Message ID: ${response.idMessage}`);
        return {
          success: true,
          messageId: response.idMessage,
          message: 'Message envoyé avec succès'
        };
      } else {
        console.error('❌ WhatsApp API response invalid:', response);
        return {
          success: false,
          error: 'Réponse API invalide'
        };
      }

    } catch (error: any) {
      console.error('❌ Error sending WhatsApp message:', error);
      
      if (error.status) {
        console.error(`HTTP Status: ${error.status}`);
      }
      if (error.error) {
        console.error(`Error body:`, error.error);
      }
      if (error.message) {
        console.error(`Error message: ${error.message}`);
      }
      
      return {
        success: false,
        error: 'Erreur technique lors de l\'envoi WhatsApp'
      };
    }
  }

  /**
   * Envoie une notification WhatsApp pour un versement avec OTP
   * @param phoneNumber Numéro du conducteur
   * @param conducteurNom Nom du conducteur
   * @param montant Montant du versement
   * @param otpCode Code OTP
   * @param entrepriseNom Nom de l'entreprise
   * @returns Promise avec résultat
   */
  async envoyerNotificationVersement(
    phoneNumber: string, 
    conducteurNom: string,
    montant: number, 
    otpCode: string, 
    entrepriseNom: string = 'LokoTaxi'
  ): Promise<WhatsAppResponse> {
    
    const montantFormate = this.formaterMontant(montant);
    
    const message = `💰 *VERSEMENT CASH - ${entrepriseNom}*

*${conducteurNom}*, versement à effectuer :
💵 *${montantFormate} GNF* (courses cash)
🔐 *Code : ${otpCode}*

👉 Rendez-vous au bureau avec l'argent
⏰ Code valide 15 minutes`;

    return this.envoyerMessage(phoneNumber, message, `VER-${otpCode}`);
  }

  /**
   * Envoie une notification de versement effectué
   * @param phoneNumber Numéro du conducteur
   * @param conducteurNom Nom du conducteur
   * @param montant Montant versé
   * @param entrepriseNom Nom de l'entreprise
   * @returns Promise avec résultat
   */
  async envoyerConfirmationVersement(
    phoneNumber: string,
    conducteurNom: string,
    montant: number,
    entrepriseNom: string = 'LokoTaxi'
  ): Promise<WhatsAppResponse> {
    
    const montantFormate = this.formaterMontant(montant);
    const dateHeure = new Date().toLocaleString('fr-FR', {
      timeZone: 'Africa/Conakry',
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const message = `
✅ *${entrepriseNom} - Versement Confirmé*

Bonjour *${conducteurNom}*,

🎉 Votre versement a été effectué avec succès !

💰 *Montant versé: ${montantFormate} GNF*
📅 *Date: ${dateHeure}*

📋 *Récapitulatif:*
• Versement traité et confirmé
• Montant crédité à votre compte
• Réception comptabilisée

Merci pour votre confiance !
${entrepriseNom} 🚕
    `.trim();

    return this.envoyerMessage(phoneNumber, message, `CONF-${montant}`);
  }

  // ==================== MÉTHODES PRIVÉES ====================

  /**
   * Nettoie et formate le numéro de téléphone pour Green API
   * @param phone Numéro brut
   * @returns Numéro formaté pour WhatsApp (sans le +)
   */
  private cleanPhoneNumber(phone: string): string {
    // Supprimer tous les caractères non numériques sauf le +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    console.log(`📱 Original phone: ${phone}, Cleaned: ${cleaned}`);
    
    // Si le numéro commence par +, enlever le + et garder le code pays
    if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1);
      console.log(`📱 Removed + prefix: ${cleaned}`);
      return cleaned;
    }
    
    // Si le numéro commence par 00, enlever les 00 
    if (cleaned.startsWith('00')) {
      cleaned = cleaned.substring(2);
      console.log(`📱 Removed 00 prefix: ${cleaned}`);
      return cleaned;
    }
    
    // Si c'est un numéro guinéen avec code pays
    if (cleaned.startsWith('224')) {
      console.log(`📱 Guinean number with country code: ${cleaned}`);
      return cleaned;
    }
    
    // Si c'est un numéro guinéen local (8 chiffres commençant par 6 ou 7)
    if (cleaned.length === 8 && (cleaned.startsWith('6') || cleaned.startsWith('7'))) {
      // Ajouter le code pays guinéen
      const formatted = `224${cleaned}`;
      console.log(`📱 Guinean local number, added country code: ${formatted}`);
      return formatted;
    }
    
    // Si c'est un numéro de 9 chiffres (déjà avec indicatif local)
    if (cleaned.length === 9) {
      const formatted = `224${cleaned}`;
      console.log(`📱 Adding Guinean country code: ${formatted}`);
      return formatted;
    }
    
    // Par défaut, retourner le numéro nettoyé tel quel
    console.log(`📱 Returning cleaned number as-is: ${cleaned}`);
    return cleaned;
  }

  /**
   * Teste la connexion à l'API Green API
   * @returns Promise<boolean>
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.http.get<any>(
        `${this.baseUrl}/waInstance${this.GREEN_API_INSTANCE_ID}/getStateInstance/${this.GREEN_API_TOKEN}`
      ).toPromise();
      
      const isConnected = response?.stateInstance === 'authorized';
      console.log(`🔗 Green API Connection: ${isConnected ? 'OK' : 'FAILED'}`, response);
      
      return isConnected;
    } catch (error) {
      console.error('❌ Failed to test Green API connection:', error);
      return false;
    }
  }


  /**
   * Formate le montant en GNF
   * @param montant Montant numérique
   * @returns Montant formaté avec espaces comme séparateurs
   */
  private formaterMontant(montant: number): string {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(montant);
  }

  /**
   * Envoie le mot de passe d'un nouveau conducteur par WhatsApp
   * @param phoneNumber Numéro de téléphone du conducteur
   * @param motDePasse Mot de passe généré (6 chiffres)
   * @param conducteurNom Nom complet du conducteur
   * @param entrepriseNom Nom de l'entreprise (optionnel)
   * @returns Promise avec résultat d'envoi
   */
  async envoyerMotDePasseConducteur(
    phoneNumber: string,
    motDePasse: string,
    conducteurNom: string,
    entrepriseNom: string = 'LokoTaxi'
  ): Promise<WhatsAppResponse> {
    const message = `🚕 *Bienvenue chez ${entrepriseNom}!*

Bonjour *${conducteurNom}*,

Votre compte conducteur a été créé avec succès.

📱 *Vos identifiants de connexion:*
• Téléphone: ${phoneNumber}
• Mot de passe: *${motDePasse}*

📲 Téléchargez l'application LokoTaxi Conducteur et connectez-vous pour commencer à recevoir des courses.

⚠️ Conservez ce mot de passe en lieu sûr.

Bonne route ! 🚗`;

    return this.envoyerMessage(phoneNumber, message, `NEW-COND-${phoneNumber}`);
  }

  /**
   * Envoie une notification de réinitialisation de mot de passe
   * @param phoneNumber Numéro de téléphone du conducteur
   * @param motDePasse Nouveau mot de passe
   * @param conducteurNom Nom du conducteur
   * @param entrepriseNom Nom de l'entreprise
   * @returns Promise avec résultat d'envoi
   */
  async envoyerReinitialisationMotDePasse(
    phoneNumber: string,
    motDePasse: string,
    conducteurNom: string,
    entrepriseNom: string = 'LokoTaxi'
  ): Promise<WhatsAppResponse> {
    const message = `🔐 *${entrepriseNom} - Réinitialisation mot de passe*

Bonjour *${conducteurNom}*,

Votre mot de passe a été réinitialisé.

📱 *Nouveau mot de passe: ${motDePasse}*

Connectez-vous avec ce nouveau mot de passe dans l'application.

⚠️ Conservez ce mot de passe en lieu sûr.

${entrepriseNom} 🚕`;

    return this.envoyerMessage(phoneNumber, message, `RESET-PWD-${phoneNumber}`);
  }
}