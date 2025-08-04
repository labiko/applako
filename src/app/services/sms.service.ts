import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface SMSResult {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class SMSService {

  constructor(private supabaseService: SupabaseService) { }

  async envoyerOTPVersement(telephone: string, otpCode: string, montant: number): Promise<SMSResult> {
    const message = `Code versement: ${otpCode}\nMontant à verser: ${montant.toLocaleString()} GNF\nLokoTaxi`;
    
    // Simulation visuelle du SMS OTP
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║ 📱 SMS OTP ENVOYÉ AU CONDUCTEUR              ║');
    console.log('╠══════════════════════════════════════════════╣');
    console.log(`║ Destinataire: ${telephone.padEnd(31)} ║`);
    console.log('╠══════════════════════════════════════════════╣');
    console.log('║ Message:                                      ║');
    console.log(`║ Code versement: ${otpCode.padEnd(29)} ║`);
    console.log(`║ Montant à verser: ${(montant.toLocaleString() + ' GNF').padEnd(27)} ║`);
    console.log('║ LokoTaxi                                      ║');
    console.log('╚══════════════════════════════════════════════╝');
    
    await this.logSMS(telephone, message, 'versement_otp');
    
    // Simuler succès (95% du temps)
    const success = Math.random() > 0.05;
    return {
      success,
      message: success ? 'SMS envoyé avec succès' : 'Échec envoi SMS'
    };
  }
  
  async envoyerConfirmationVersement(telephone: string, montant: number, reference: string): Promise<boolean> {
    const message = `✅ VERSEMENT CONFIRMÉ\nMontant reçu: ${montant.toLocaleString()} GNF\nRéférence: ${reference}\nMerci pour votre versement du jour.\nLokoTaxi`;
    
    // Simulation visuelle du SMS
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║ 📱 SMS ENVOYÉ AU CONDUCTEUR                  ║');
    console.log('╠══════════════════════════════════════════════╣');
    console.log(`║ Destinataire: ${telephone.padEnd(31)} ║`);
    console.log('╠══════════════════════════════════════════════╣');
    console.log('║ Message:                                      ║');
    console.log('║ ✅ VERSEMENT CONFIRMÉ                        ║');
    console.log(`║ Montant reçu: ${(montant.toLocaleString() + ' GNF').padEnd(31)} ║`);
    console.log(`║ Référence: ${reference.padEnd(34)} ║`);
    console.log('║ Merci pour votre versement du jour.          ║');
    console.log('║ LokoTaxi                                      ║');
    console.log('╚══════════════════════════════════════════════╝');
    
    await this.logSMS(telephone, message, 'confirmation_versement');
    return Math.random() > 0.02; // 98% succès
  }
  
  async envoyerNotificationArrivee(telephone: string, position: number, tempsAttente: number): Promise<boolean> {
    const message = `Position file: ${position}. Attente estimée: ${tempsAttente}min. LokoTaxi`;
    console.log(`📱 SMS ARRIVEE: ${telephone} - ${message}`);
    await this.logSMS(telephone, message, 'notification_arrivee');
    return true;
  }
  
  async envoyerNotificationTour(telephone: string): Promise<boolean> {
    const message = `C'est votre tour! Présentez-vous au guichet versement. LokoTaxi`;
    console.log(`📱 SMS TOUR: ${telephone} - ${message}`);
    await this.logSMS(telephone, message, 'notification_tour');
    return true;
  }
  
  async envoyerAlerteAnomalie(telephone: string, type: string, details: string): Promise<boolean> {
    const message = `Alerte ${type}: ${details}. Contactez l'admin. LokoTaxi`;
    console.log(`📱 SMS ALERTE: ${telephone} - ${message}`);
    await this.logSMS(telephone, message, 'alerte_anomalie');
    return true;
  }
  
  async envoyerSMS(telephone: string, message: string, type: string, referenceId?: string): Promise<boolean> {
    console.log(`📱 SMS GENERIC: ${telephone} - ${message}`);
    await this.logSMS(telephone, message, type, referenceId);
    return Math.random() > 0.05; // 95% succès
  }
  
  private async logSMS(telephone: string, message: string, type: string, referenceId?: string): Promise<void> {
    try {
      const { error } = await this.supabaseService.client
        .from('sms_logs')
        .insert({
          telephone,
          message,
          type_sms: type,
          reference_id: referenceId,
          statut: 'simule'
        });
      
      if (error) {
        console.error('Erreur log SMS:', error);
      }
    } catch (error) {
      console.error('Erreur lors du logging SMS:', error);
    }
  }
}