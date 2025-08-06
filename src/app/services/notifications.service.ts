/**
 * SERVICE DE GESTION DES NOTIFICATIONS
 * Gère les notifications pour les changements de commission et autres alertes
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SupabaseService } from './supabase.service';

export interface Notification {
  id: string;
  entreprise_id: string;
  titre: string;
  message: string;
  type_notification: 'commission_change' | 'commission_specific_set' | 'commission_specific_removed' | 'system_info' | 'alert';
  metadata: any;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  lu: boolean;
  date_lecture?: string;
  archived: boolean;
  action_required: boolean;
  action_url?: string;
  action_label?: string;
  created_at: string;
  expires_at?: string;
}

export interface NotificationStats {
  total: number;
  non_lues: number;
  urgentes: number;
  actions_requises: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {
  
  private notifications$ = new BehaviorSubject<Notification[]>([]);
  private unreadCount$ = new BehaviorSubject<number>(0);
  private notificationStats$ = new BehaviorSubject<NotificationStats>({
    total: 0,
    non_lues: 0,
    urgentes: 0,
    actions_requises: 0
  });

  constructor(private supabaseService: SupabaseService) {
    // Initialiser le service
    this.initializeNotifications();
  }

  /**
   * Initialise les notifications et configure les listeners
   */
  private async initializeNotifications() {
    // Charger les notifications initiales
    await this.loadNotifications();
    
    // Configurer le realtime pour les nouvelles notifications
    this.setupRealtimeSubscription();
  }

  /**
   * Configure l'écoute en temps réel des nouvelles notifications
   */
  private setupRealtimeSubscription() {
    // Écouter les insertions dans la table notifications
    this.supabaseService.client
      .channel('notifications-channel')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications' 
        }, 
        (payload) => {
          console.log('📬 Nouvelle notification reçue:', payload);
          this.handleNewNotification(payload.new as Notification);
        }
      )
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          console.log('📝 Notification mise à jour:', payload);
          this.handleUpdatedNotification(payload.new as Notification);
        }
      )
      .subscribe();
  }

  /**
   * Charge toutes les notifications pour une entreprise
   */
  async loadNotifications(entrepriseId?: string): Promise<void> {
    try {
      let query = this.supabaseService.client
        .from('notifications')
        .select('*')
        .eq('archived', false)
        .order('created_at', { ascending: false });

      // Filtrer par entreprise si spécifié
      if (entrepriseId) {
        query = query.eq('entreprise_id', entrepriseId);
      }

      // Filtrer les notifications expirées
      query = query.or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

      const { data, error } = await query;

      if (error) {
        console.error('❌ Erreur chargement notifications:', error);
        return;
      }

      this.notifications$.next(data || []);
      this.updateStats(data || []);
      
    } catch (error) {
      console.error('❌ Erreur chargement notifications:', error);
    }
  }

  /**
   * Récupère les notifications pour une entreprise spécifique
   */
  async getNotificationsForEnterprise(entrepriseId: string): Promise<Notification[]> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('notifications')
        .select('*')
        .eq('entreprise_id', entrepriseId)
        .eq('archived', false)
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('❌ Erreur récupération notifications entreprise:', error);
      return [];
    }
  }

  /**
   * Marque une ou plusieurs notifications comme lues
   */
  async markAsRead(entrepriseId: string, notificationIds?: string[]): Promise<number> {
    try {
      let query = this.supabaseService.client
        .from('notifications')
        .update({ 
          lu: true, 
          date_lecture: new Date().toISOString() 
        })
        .eq('entreprise_id', entrepriseId)
        .eq('lu', false);

      // Si des IDs spécifiques sont fournis
      if (notificationIds && notificationIds.length > 0) {
        query = query.in('id', notificationIds);
      }

      const { data, error } = await query.select();

      if (error) throw error;

      // Recharger les notifications
      await this.loadNotifications(entrepriseId);

      return data?.length || 0;
    } catch (error) {
      console.error('❌ Erreur marquage notifications:', error);
      return 0;
    }
  }

  /**
   * Archive une notification
   */
  async archiveNotification(notificationId: string): Promise<boolean> {
    try {
      const { error } = await this.supabaseService.client
        .from('notifications')
        .update({ archived: true })
        .eq('id', notificationId);

      if (error) throw error;

      // Mettre à jour la liste locale
      const currentNotifications = this.notifications$.value;
      const updatedNotifications = currentNotifications.filter(n => n.id !== notificationId);
      this.notifications$.next(updatedNotifications);
      this.updateStats(updatedNotifications);

      return true;
    } catch (error) {
      console.error('❌ Erreur archivage notification:', error);
      return false;
    }
  }

  /**
   * Récupère le nombre de notifications non lues
   */
  async getUnreadCount(entrepriseId: string): Promise<number> {
    try {
      const { data, error } = await this.supabaseService.client
        .rpc('get_unread_notifications_count', { p_entreprise_id: entrepriseId });

      if (error) throw error;

      const count = data || 0;
      this.unreadCount$.next(count);
      return count;
    } catch (error) {
      console.error('❌ Erreur comptage notifications non lues:', error);
      return 0;
    }
  }

  /**
   * Crée une notification de changement de commission
   */
  async createCommissionChangeNotification(
    entrepriseId: string,
    ancienTaux: number,
    nouveauTaux: number,
    typeChange: 'global' | 'specific_set' | 'specific_removed',
    motif?: string
  ): Promise<string | null> {
    try {
      const { data, error } = await this.supabaseService.client
        .rpc('create_commission_notification', {
          p_entreprise_id: entrepriseId,
          p_ancien_taux: ancienTaux,
          p_nouveau_taux: nouveauTaux,
          p_type_change: typeChange,
          p_motif: motif
        });

      if (error) throw error;

      console.log(`✅ Notification créée pour entreprise ${entrepriseId}`);
      return data;
    } catch (error) {
      console.error('❌ Erreur création notification:', error);
      return null;
    }
  }

  /**
   * Notifie toutes les entreprises d'un changement global
   */
  async notifyAllEnterprisesOfGlobalChange(
    ancienTaux: number,
    nouveauTaux: number,
    motif?: string
  ): Promise<number> {
    try {
      const { data, error } = await this.supabaseService.client
        .rpc('notify_all_enterprises_commission_change', {
          p_ancien_taux: ancienTaux,
          p_nouveau_taux: nouveauTaux,
          p_motif: motif
        });

      if (error) throw error;

      const count = data || 0;
      console.log(`✅ ${count} entreprises notifiées du changement global`);
      return count;
    } catch (error) {
      console.error('❌ Erreur notification globale:', error);
      return 0;
    }
  }

  /**
   * Gère une nouvelle notification reçue en temps réel
   */
  private handleNewNotification(notification: Notification) {
    const currentNotifications = this.notifications$.value;
    const updatedNotifications = [notification, ...currentNotifications];
    this.notifications$.next(updatedNotifications);
    this.updateStats(updatedNotifications);

    // Afficher une notification toast ou alert si urgent
    if (notification.priority === 'urgent' || notification.priority === 'high') {
      this.showNotificationAlert(notification);
    }
  }

  /**
   * Gère une notification mise à jour
   */
  private handleUpdatedNotification(updatedNotification: Notification) {
    const currentNotifications = this.notifications$.value;
    const index = currentNotifications.findIndex(n => n.id === updatedNotification.id);
    
    if (index !== -1) {
      currentNotifications[index] = updatedNotification;
      this.notifications$.next([...currentNotifications]);
      this.updateStats(currentNotifications);
    }
  }

  /**
   * Met à jour les statistiques des notifications
   */
  private updateStats(notifications: Notification[]) {
    const stats: NotificationStats = {
      total: notifications.length,
      non_lues: notifications.filter(n => !n.lu).length,
      urgentes: notifications.filter(n => n.priority === 'urgent' || n.priority === 'high').length,
      actions_requises: notifications.filter(n => n.action_required && !n.lu).length
    };

    this.notificationStats$.next(stats);
    this.unreadCount$.next(stats.non_lues);
  }

  /**
   * Affiche une alerte pour une notification importante
   */
  private showNotificationAlert(notification: Notification) {
    // Cette méthode peut être implémentée pour afficher
    // une notification système ou un toast
    console.log('🔔 Notification importante:', notification.titre);
  }

  /**
   * Récupère les notifications récentes de commission
   */
  async getRecentCommissionNotifications(
    entrepriseId: string, 
    limit: number = 5
  ): Promise<Notification[]> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('notifications')
        .select('*')
        .eq('entreprise_id', entrepriseId)
        .in('type_notification', ['commission_change', 'commission_specific_set', 'commission_specific_removed'])
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('❌ Erreur récupération notifications commission:', error);
      return [];
    }
  }

  // Observables pour les composants
  getNotifications(): Observable<Notification[]> {
    return this.notifications$.asObservable();
  }

  getUnreadCountObservable(): Observable<number> {
    return this.unreadCount$.asObservable();
  }

  getNotificationStats(): Observable<NotificationStats> {
    return this.notificationStats$.asObservable();
  }

  /**
   * Nettoie les subscriptions
   */
  cleanup() {
    this.supabaseService.client.removeAllChannels();
  }
}