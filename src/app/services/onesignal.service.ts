// src/app/services/onesignal.service.ts
// Service dédié OneSignal pour gestion notifications push

import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

// Import OneSignal pour Capacitor (plugin Cordova v5.x)
import OneSignal from 'onesignal-cordova-plugin';

@Injectable({
  providedIn: 'root'
})
export class OneSignalService {
  
  private readonly ONESIGNAL_APP_ID = '867e880f-d486-482e-b7d8-d174db39f322';
  private isInitialized = false;
  private currentPlayerId: string | null = null;
  private currentExternalUserId: string | null = null;

  constructor(
    private router: Router,
    private authService: AuthService,
    private supabaseService: SupabaseService
  ) {}

  /**
   * Initialise OneSignal spécifiquement pour conducteur - À appeler depuis login.page.ts
   */
  async initializeConducteurOneSignal(): Promise<void> {
    // Vérifier qu'un conducteur est connecté
    const conducteur = this.authService.getCurrentConducteur();
    if (!conducteur) {
      console.log('⚠️ Pas de conducteur connecté - OneSignal non initialisé');
      return;
    }
    
    console.log('🔥 ========== DÉMARRAGE ONESIGNAL ==========');
    console.log('📱 Initialisation OneSignal pour conducteur:', {
      id: conducteur.id,
      nom: conducteur.nom,
      telephone: conducteur.telephone,
      vehicle_type: conducteur.vehicle_type
    });
    
    // IMPORTANT: Définir l'External User ID
    // Format: conducteur_123 où 123 est l'ID du conducteur
    const externalUserId = `conducteur_${conducteur.id}`;
    this.currentExternalUserId = externalUserId;
    console.log('🆔 External User ID préparé:', externalUserId);
    
    await this.initializeOneSignal();
    
    // Afficher infos après initialisation
    setTimeout(async () => {
      await this.displayOneSignalDebugInfo();
    }, 2000);
  }

  /**
   * Initialise OneSignal - Méthode interne (Web + Mobile)
   */
  private async initializeOneSignal(): Promise<void> {
    try {
      if (this.isInitialized) {
        console.log('📱 OneSignal déjà initialisé');
        return;
      }

      const platform = Capacitor.getPlatform();

      // ✅ MODE WEB (PWA) - Utilise OneSignal Web SDK
      if (platform === 'web') {
        await this.initializeOneSignalWeb();
        return;
      }

      // ✅ MODE MOBILE (Android/iOS) - Utilise OneSignal Cordova Plugin
      console.log('📱 Initialisation OneSignal mobile...');

      // Mode mobile avec API OneSignal v5.x
      // Initialisation avec OneSignal.initialize()
      OneSignal.initialize(this.ONESIGNAL_APP_ID);

      // IMPORTANT: Définir l'External User ID immédiatement après l'initialisation
      // Ceci remplace le besoin de Player IDs
      if (this.currentExternalUserId) {
        console.log('🆔 Définition External User ID:', this.currentExternalUserId);
        await OneSignal.login(this.currentExternalUserId);
        console.log('✅ External User ID défini avec succès');
      }

      // Activer logs pour debug (à retirer en production)
      OneSignal.Debug.setLogLevel(6);

      // Demander permissions push
      const accepted = await OneSignal.Notifications.requestPermission(false);
      console.log('📱 Permission notifications:', accepted ? 'acceptée' : 'refusée');

      // Debug permission et forcer l'abonnement avec méthodes alternatives
      console.log('🔔 Permission accepted:', accepted);
      console.log('🔔 Tentatives d\'abonnement multiples...');

      // Méthode 1: optIn()
      try {
        OneSignal.User.pushSubscription.optIn();
        console.log('✅ Méthode 1 (optIn) réussie');
      } catch (error) {
        console.error('❌ Méthode 1 échec:', error);
      }

      // Méthode 2: Réinitialiser permissions
      try {
        await OneSignal.Notifications.requestPermission(true); // Force permission
        console.log('✅ Méthode 2 (force permission) réussie');
      } catch (error) {
        console.error('❌ Méthode 2 échec:', error);
      }

      // Vérifier le statut push subscription plusieurs fois
      setTimeout(() => {
        const pushStatus = OneSignal.User.pushSubscription.optedIn;
        console.log('📊 Push Subscription Status après 2s:', pushStatus);

        // Essayer optIn encore une fois
        try {
          OneSignal.User.pushSubscription.optIn();
          console.log('🔄 Retry optIn après 2s');
        } catch (e) {
          console.error('❌ Retry optIn échec:', e);
        }
      }, 2000);

      setTimeout(() => {
        const pushStatus2 = OneSignal.User.pushSubscription.optedIn;
        console.log('📊 Push Subscription Status après 5s:', pushStatus2);
      }, 5000);

      // Gestion notification reçue (app ouverte)
      OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event: any) => {
        console.log('🔔 Notification reçue (app ouverte):', event);

        const notification = event.getNotification();
        this.handleNotificationReceived(notification);

        // Afficher la notification
        event.getNotification().display();
      });

      // Gestion notification ouverte/cliquée
      OneSignal.Notifications.addEventListener('click', (event: any) => {
        console.log('👆 Notification cliquée:', event);
        this.handleNotificationOpened(event);
      });

      // Écouter changements User ID (remplace subscription observer)
      OneSignal.User.addEventListener('change', (event: any) => {
        console.log('📱 User changed:', event);
        if (event.current && event.current.onesignalId && event.current.onesignalId !== this.currentPlayerId) {
          this.currentPlayerId = event.current.onesignalId;
          this.updateConducteurPlayerId();
        }
      });

      // Récupérer Player ID après initialisation
      setTimeout(async () => {
        try {
          // API v5.x pour récupérer OneSignal ID
          const onesignalId = await OneSignal.User.getOnesignalId();
          if (onesignalId) {
            this.currentPlayerId = onesignalId;
            console.log('🎯 ========== PLAYER ID RÉCUPÉRÉ ==========');
            console.log('📱 OneSignal Player ID:', this.currentPlayerId);
            console.log('🆔 External User ID actif:', this.currentExternalUserId);

            // Plus besoin d'enregistrer Player ID en base
            // L'External User ID suffit (conducteur_123)
            // await this.updateConducteurPlayerId(); // DÉSACTIVÉ - Utilise External ID

            this.isInitialized = true;
            console.log('✅ ========== ONESIGNAL INITIALISÉ ==========');
            console.log('✅ OneSignal initialisé avec succès');
            console.log('📊 État final:', {
              isInitialized: this.isInitialized,
              playerId: this.currentPlayerId,
              externalUserId: this.currentExternalUserId,
              platform: Capacitor.getPlatform(),
              appId: this.ONESIGNAL_APP_ID
            });
          } else {
            console.log('❌ Aucun Player ID trouvé');
          }
        } catch (error) {
          console.error('❌ Erreur récupération Player ID:', error);
        }
      }, 3000);

    } catch (error) {
      console.error('❌ ========== ERREUR INITIALISATION ==========');
      console.error('❌ Erreur initialisation OneSignal:', error);
      console.error('📊 État à l\'erreur:', {
        platform: Capacitor.getPlatform(),
        isInitialized: this.isInitialized,
        appId: this.ONESIGNAL_APP_ID
      });
    }
  }

  /**
   * Initialise OneSignal pour Web/PWA
   */
  private async initializeOneSignalWeb(): Promise<void> {
    try {
      console.log('🌐 ========== INITIALISATION ONESIGNAL WEB ==========');

      // Vérifier que le SDK Web est chargé
      const windowAny = window as any;
      if (!windowAny.OneSignal) {
        console.error('❌ OneSignal Web SDK non chargé');
        return;
      }

      const OneSignalWeb = windowAny.OneSignal;

      // Initialiser OneSignal Web (peut déjà être initialisé par le SDK auto-init)
      try {
        await OneSignalWeb.init({
          appId: this.ONESIGNAL_APP_ID,
          allowLocalhostAsSecureOrigin: true, // Pour dev local
          notifyButton: {
            enable: false // Désactiver le bouton flottant
          },
          welcomeNotification: {
            disable: true // Désactiver notification de bienvenue
          }
        });
        console.log('✅ OneSignal Web SDK initialisé');
      } catch (initError: any) {
        // Le SDK v16 s'auto-initialise parfois - on continue si déjà initialisé
        if (initError.message?.includes('already initialized')) {
          console.log('✅ OneSignal Web SDK déjà initialisé - continuation...');
        } else {
          throw initError;
        }
      }

      // Définir l'External User ID
      if (this.currentExternalUserId) {
        console.log('🆔 Définition External User ID (Web):', this.currentExternalUserId);
        await OneSignalWeb.login(this.currentExternalUserId);
        console.log('✅ External User ID défini avec succès (Web)');
      }

      // Demander permission pour les notifications
      const permission = await OneSignalWeb.Notifications.requestPermission();
      console.log('🔔 Permission notifications Web:', permission);

      // Récupérer le Subscription ID
      setTimeout(async () => {
        try {
          const subscriptionId = await OneSignalWeb.User.PushSubscription.id;
          if (subscriptionId) {
            this.currentPlayerId = subscriptionId;
            console.log('🎯 ========== SUBSCRIPTION ID WEB RÉCUPÉRÉ ==========');
            console.log('🌐 OneSignal Subscription ID:', this.currentPlayerId);
            console.log('🆔 External User ID actif:', this.currentExternalUserId);
          }

          this.isInitialized = true;
          console.log('✅ ========== ONESIGNAL WEB INITIALISÉ ==========');
          console.log('📊 État final (Web):', {
            isInitialized: this.isInitialized,
            subscriptionId: this.currentPlayerId,
            externalUserId: this.currentExternalUserId,
            platform: 'web',
            appId: this.ONESIGNAL_APP_ID
          });
        } catch (error) {
          console.error('❌ Erreur récupération Subscription ID Web:', error);
        }
      }, 2000);

      // Écouter les notifications (Web)
      OneSignalWeb.Notifications.addEventListener('foregroundWillDisplay', (event: any) => {
        console.log('🔔 Notification reçue (Web):', event);
        this.handleNotificationReceived(event.notification);
      });

      OneSignalWeb.Notifications.addEventListener('click', (event: any) => {
        console.log('👆 Notification cliquée (Web):', event);
        this.handleNotificationOpened({ notification: event.notification });
      });

    } catch (error) {
      console.error('❌ Erreur initialisation OneSignal Web:', error);
    }
  }

  /**
   * Met à jour le Player ID du conducteur connecté en base
   */
  private async updateConducteurPlayerId(): Promise<void> {
    try {
      if (!this.currentPlayerId) {
        console.log('⚠️ Pas de Player ID à enregistrer');
        return;
      }

      const conducteurId = this.authService.getCurrentConducteurId();
      if (!conducteurId) {
        console.log('⚠️ Pas de conducteur connecté pour enregistrer Player ID');
        return;
      }

      console.log('💾 ========== ENREGISTREMENT PLAYER ID ==========');
      console.log('💾 Enregistrement Player ID en base...', {
        conducteurId,
        playerId: this.currentPlayerId,
        playerIdLength: this.currentPlayerId.length
      });

      const success = await this.supabaseService.updateConducteurPlayerId(conducteurId, this.currentPlayerId);
      
      if (success) {
        console.log('✅ ========== PLAYER ID SAUVÉ EN BASE ==========');
        console.log('✅ Player ID enregistré avec succès pour conducteur:', conducteurId);
      } else {
        console.error('❌ ========== ÉCHEC SAUVEGARDE PLAYER ID ==========');
        console.error('❌ Échec enregistrement Player ID pour conducteur:', conducteurId);
      }

    } catch (error) {
      console.error('❌ ========== ERREUR PLAYER ID ==========');
      console.error('❌ Erreur lors de l\'enregistrement Player ID:', error);
    }
  }

  // Variables pour callback de la page réservations
  private reservationsPageCallback: (() => Promise<void>) | null = null;

  /**
   * Active les notifications pour la page réservations - Appelé depuis ionViewWillEnter
   */
  enableReservationsNotifications(): void {
    console.log('📱 Activation notifications pour page réservations');
    // La logique de notification est déjà configurée dans initializeOneSignal
    // Cette méthode sert juste à marquer que la page réservations est active
  }

  /**
   * Désactive les notifications pour la page réservations - Appelé depuis ionViewWillLeave
   */
  disableReservationsNotifications(): void {
    console.log('📱 Désactivation notifications pour page réservations');
    this.reservationsPageCallback = null;
  }

  /**
   * Enregistre le callback pour actualiser les réservations
   */
  setReservationsCallback(callback: () => Promise<void>): void {
    this.reservationsPageCallback = callback;
  }

  /**
   * Gère réception notification (app ouverte)
   */
  private handleNotificationReceived(notification: any): void {
    console.log('🔔 Traitement notification reçue:', notification);
    
    const additionalData = notification.additionalData;
    
    if (additionalData?.type === 'new_reservation') {
      console.log('🚗 Nouvelle réservation détectée via notification');
      
      // Appeler le callback de la page réservations si disponible
      if (this.reservationsPageCallback) {
        this.reservationsPageCallback().catch(error => {
          console.error('❌ Erreur callback réservations:', error);
        });
      }
    }
  }

  /**
   * Gère notification cliquée/ouverte
   */
  private handleNotificationOpened(result: any): void {
    console.log('👆 Traitement notification ouverte:', result);
    
    const notification = result.notification;
    const additionalData = notification.additionalData;
    
    if (additionalData?.type === 'new_reservation') {
      console.log('🚗 Navigation vers réservations suite à clic notification');
      
      // Naviguer vers page réservations
      this.router.navigate(['/tabs/reservations']);
    }
  }

  /**
   * Définit des tags pour le conducteur (optionnel)
   */
  async setTags(tags: { [key: string]: string }): Promise<void> {
    try {
      if (Capacitor.getPlatform() === 'web') {
        // Web: utiliser le SDK Web
        const windowAny = window as any;
        if (windowAny.OneSignal) {
          windowAny.OneSignal.User.addTags(tags);
          console.log('🏷️ Tags OneSignal Web mis à jour:', tags);
        }
        return;
      }

      // API v5.x pour tags (mobile)
      OneSignal.User.addTags(tags);
      console.log('🏷️ Tags OneSignal mis à jour:', tags);

    } catch (error) {
      console.error('❌ Erreur mise à jour tags OneSignal:', error);
    }
  }

  /**
   * Met à jour le statut en ligne/hors ligne du conducteur - Appelée depuis reservations.page.ts
   */
  updateConducteurOnlineStatus(isOnline: boolean): void {
    // Méthode async en arrière-plan sans attendre le résultat
    this.updateOnlineStatusInternal(isOnline).catch(error => {
      console.error('❌ Erreur mise à jour statut OneSignal:', error);
    });
  }

  /**
   * Méthode interne pour mise à jour statut
   */
  private async updateOnlineStatusInternal(isOnline: boolean): Promise<void> {
    const tags: { [key: string]: string } = {
      status: isOnline ? 'online' : 'offline',
      last_seen: new Date().toISOString()
    };
    
    if (isOnline) {
      // Informations additionnelles quand en ligne
      const conducteur = this.authService.getCurrentConducteur();
      if (conducteur) {
        tags['conducteur_id'] = conducteur.id;
        tags['vehicle_type'] = conducteur.vehicle_type || 'voiture';
        tags['zone'] = 'conakry'; // Peut être dynamique selon la position
      }
    }
    
    await this.setTags(tags);
    console.log(`📊 Statut OneSignal mis à jour: ${isOnline ? 'EN LIGNE' : 'HORS LIGNE'}`);
  }

  /**
   * Force actualisation Player ID (en cas de problème)
   */
  async refreshPlayerId(): Promise<string | null> {
    try {
      if (Capacitor.getPlatform() === 'web') {
        // Web: utiliser le SDK Web
        const windowAny = window as any;
        if (windowAny.OneSignal) {
          const subscriptionId = await windowAny.OneSignal.User.PushSubscription.id;
          if (subscriptionId) {
            this.currentPlayerId = subscriptionId;
            console.log('🔄 Subscription ID Web rafraîchi:', this.currentPlayerId);
            return this.currentPlayerId;
          }
        }
        return null;
      }

      // API v5.x pour récupérer OneSignal ID (mobile)
      const onesignalId = await OneSignal.User.getOnesignalId();
      if (onesignalId) {
        this.currentPlayerId = onesignalId;
        await this.updateConducteurPlayerId();
        return this.currentPlayerId;
      }

      return null;
    } catch (error) {
      console.error('❌ Erreur refresh Player ID:', error);
      return null;
    }
  }

  /**
   * Désactive OneSignal (déconnexion conducteur) - À appeler depuis AuthService.logout()
   */
  async disableConducteurOneSignal(): Promise<void> {
    try {
      // Marquer comme hors ligne et déconnecté
      await this.setTags({
        status: 'offline',
        logged_out: new Date().toISOString()
      });

      if (Capacitor.getPlatform() === 'web') {
        // Web: utiliser le SDK Web
        const windowAny = window as any;
        if (windowAny.OneSignal) {
          windowAny.OneSignal.logout();
          console.log('⏸️ OneSignal Web déconnecté');
        }
      } else {
        // Mobile: Supprimer les tags utilisateur
        OneSignal.User.removeTags(['status', 'conducteur_id', 'vehicle_type', 'zone']);
      }

      // Nettoyer les variables locales
      this.isInitialized = false;
      this.currentPlayerId = null;
      this.currentExternalUserId = null;

      console.log('⏸️ OneSignal désactivé (conducteur déconnecté)');

    } catch (error) {
      console.error('❌ Erreur désactivation OneSignal:', error);
    }
  }

  /**
   * Obtient le statut OneSignal actuel
   */
  async getOneSignalStatus(): Promise<any> {
    try {
      if (Capacitor.getPlatform() === 'web') {
        // Web: utiliser le SDK Web
        const windowAny = window as any;
        if (windowAny.OneSignal) {
          const subscriptionId = await windowAny.OneSignal.User.PushSubscription.id;
          return {
            platform: 'web',
            initialized: this.isInitialized,
            subscriptionId: subscriptionId,
            externalUserId: this.currentExternalUserId,
            pushDisabled: false
          };
        }
        return { platform: 'web', initialized: false, message: 'OneSignal Web non initialisé' };
      }

      // API v5.x pour statut (mobile)
      const onesignalId = await OneSignal.User.getOnesignalId();
      const pushSubscription = OneSignal.User.pushSubscription;

      return {
        initialized: this.isInitialized,
        playerId: this.currentPlayerId,
        externalUserId: this.currentExternalUserId,
        onesignalId: onesignalId,
        pushSubscribed: pushSubscription?.optedIn || false,
        hasNotificationPermission: await OneSignal.Notifications.hasPermission(),
        pushDisabled: false
      };

    } catch (error) {
      console.error('❌ Erreur récupération statut OneSignal:', error);
      return { error: error instanceof Error ? error.message : 'Erreur inconnue' };
    }
  }

  /**
   * Teste l'envoi d'une notification (développement uniquement)
   */
  async sendTestNotification(): Promise<void> {
    try {
      if (!this.currentPlayerId) {
        console.warn('⚠️ Pas de Player ID pour test notification');
        return;
      }

      // Utilise votre API pour envoyer une notification test
      const testData = {
        reservationId: 'test-' + Date.now(),
        playerId: this.currentPlayerId,
        departNom: 'Test Départ',
        destinationNom: 'Test Destination',
        prixTotal: 50000,
        distanceKm: 2.5,
        conducteurId: this.authService.getCurrentConducteurId(),
        vehicleType: 'voiture',
        createdAt: new Date().toISOString()
      };

      console.log('🧪 Envoi notification test...', testData);
      
      // Appel vers votre API de test (à implémenter si besoin)
      // await this.http.post('https://www.labico.net/Taxi/send', testData).toPromise();
      
    } catch (error) {
      console.error('❌ Erreur test notification:', error);
    }
  }

  /**
   * Nettoyage service
   */
  /**
   * Affiche des infos de debug détaillées (appelé après initialisation)
   */
  private async displayOneSignalDebugInfo(): Promise<void> {
    try {
      console.log('🔍 ========== DEBUG INFO ONESIGNAL ==========');

      const platform = Capacitor.getPlatform();
      console.log('📱 Plateforme:', platform);

      // Récupérer les infos OneSignal (fonctionne pour web et mobile)
      const status = await this.getOneSignalStatus();

      console.log('📊 Status OneSignal complet:', status);
      console.log('📱 Variables du service:', {
        isInitialized: this.isInitialized,
        currentPlayerId: this.currentPlayerId,
        externalUserId: this.currentExternalUserId,
        appId: this.ONESIGNAL_APP_ID
      });

      // Infos conducteur connecté
      const conducteur = this.authService.getCurrentConducteur();
      console.log('👤 Conducteur connecté:', {
        id: conducteur?.id,
        nom: conducteur?.nom,
        telephone: conducteur?.telephone,
        hors_ligne: conducteur?.hors_ligne
      });

      console.log('🔍 ========== FIN DEBUG INFO ==========');

    } catch (error) {
      console.error('❌ Erreur lors du debug OneSignal:', error);
    }
  }

  ngOnDestroy(): void {
    console.log('🧹 ========== NETTOYAGE ONESIGNAL ==========');
    console.log('🧹 Nettoyage OneSignal service...');
    console.log('📊 État avant nettoyage:', {
      isInitialized: this.isInitialized,
      playerId: this.currentPlayerId
    });
    this.isInitialized = false;
    this.currentPlayerId = null;
  }
}