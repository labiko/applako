import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject, Subscription, timer, of } from 'rxjs';
import { switchMap, catchError, tap, filter, takeUntil } from 'rxjs/operators';

export interface RefreshState {
  isRefreshing: boolean;
  lastRefreshTime: Date | null;
  errorCount: number;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AutoRefreshService implements OnDestroy {
  private readonly REFRESH_INTERVAL_MS = 120000; // 2 minutes
  private readonly MAX_ERROR_COUNT = 3; // Arrêt après 3 erreurs consécutives
  
  private destroy$ = new Subject<void>();
  private refreshSubscription: Subscription | null = null;
  
  // État observable du rafraîchissement
  private refreshStateSubject = new BehaviorSubject<RefreshState>({
    isRefreshing: false,
    lastRefreshTime: null,
    errorCount: 0,
    isActive: false
  });
  
  public refreshState$ = this.refreshStateSubject.asObservable();
  
  // Callback de rafraîchissement
  private refreshCallback: (() => Promise<any>) | null = null;
  
  constructor() {
    console.log('🔄 AutoRefreshService initialisé');
  }
  
  /**
   * Démarre le rafraîchissement automatique
   * @param callback Fonction à exécuter pour rafraîchir les données
   * @param immediate Exécuter immédiatement la première fois
   */
  startAutoRefresh(callback: () => Promise<any>, immediate: boolean = false): void {
    // Éviter les démarrages multiples
    if (this.refreshStateSubject.value.isActive) {
      console.log('⚠️ Auto-refresh déjà actif, skip');
      return;
    }
    
    console.log('🚀 Démarrage auto-refresh (interval: 2 min)');
    this.refreshCallback = callback;
    
    // Mettre à jour l'état avec temps initial
    this.updateState({ 
      isActive: true, 
      errorCount: 0,
      lastRefreshTime: new Date() // Initialiser avec le temps de démarrage
    });
    
    // Créer l'observable de rafraîchissement
    const refresh$ = timer(immediate ? 0 : this.REFRESH_INTERVAL_MS, this.REFRESH_INTERVAL_MS)
      .pipe(
        takeUntil(this.destroy$),
        // Filtrer si déjà en cours de rafraîchissement
        filter(() => !this.refreshStateSubject.value.isRefreshing),
        // Filtrer si trop d'erreurs
        filter(() => this.refreshStateSubject.value.errorCount < this.MAX_ERROR_COUNT),
        tap(() => {
          console.log('🔄 Début rafraîchissement automatique');
          this.updateState({ isRefreshing: true });
        }),
        // Exécuter le callback de manière non-bloquante
        switchMap(() => 
          // Wrapper Promise en Observable avec gestion d'erreur
          of(null).pipe(
            switchMap(() => this.executeRefresh()),
            catchError(error => {
              console.error('❌ Erreur rafraîchissement:', error);
              this.handleRefreshError();
              return of(null); // Continue malgré l'erreur
            })
          )
        ),
        tap(() => {
          console.log('✅ Rafraîchissement terminé');
          this.updateState({ 
            isRefreshing: false, 
            lastRefreshTime: new Date(),
            errorCount: 0 // Reset erreurs après succès
          });
        })
      );
    
    // Souscrire au flux de rafraîchissement
    this.refreshSubscription = refresh$.subscribe();
  }
  
  /**
   * Arrête le rafraîchissement automatique
   */
  stopAutoRefresh(): void {
    console.log('🛑 Arrêt auto-refresh');
    
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
      this.refreshSubscription = null;
    }
    
    this.updateState({ 
      isActive: false, 
      isRefreshing: false,
      errorCount: 0 
    });
  }
  
  /**
   * Force un rafraîchissement immédiat (non-bloquant)
   */
  async forceRefresh(): Promise<void> {
    if (this.refreshStateSubject.value.isRefreshing) {
      console.log('⏳ Rafraîchissement déjà en cours, skip');
      return;
    }
    
    if (!this.refreshCallback) {
      console.warn('⚠️ Pas de callback de rafraîchissement défini');
      return;
    }
    
    console.log('💪 Force rafraîchissement manuel');
    this.updateState({ isRefreshing: true });
    
    try {
      await this.executeRefresh();
      this.updateState({ 
        isRefreshing: false, 
        lastRefreshTime: new Date(),
        errorCount: 0
      });
    } catch (error) {
      console.error('❌ Erreur force refresh:', error);
      this.handleRefreshError();
    }
  }
  
  /**
   * Exécute le callback de rafraîchissement avec timeout
   */
  private async executeRefresh(): Promise<any> {
    if (!this.refreshCallback) {
      throw new Error('Pas de callback défini');
    }
    
    // Timeout de sécurité (30 secondes)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout rafraîchissement')), 30000)
    );
    
    try {
      // Course entre le callback et le timeout
      const result = await Promise.race([
        this.refreshCallback(),
        timeoutPromise
      ]);
      return result;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Gère les erreurs de rafraîchissement
   */
  private handleRefreshError(): void {
    const currentState = this.refreshStateSubject.value;
    const newErrorCount = currentState.errorCount + 1;
    
    this.updateState({ 
      isRefreshing: false, 
      errorCount: newErrorCount 
    });
    
    // Arrêt automatique après trop d'erreurs
    if (newErrorCount >= this.MAX_ERROR_COUNT) {
      console.error('🔴 Trop d\'erreurs, arrêt auto-refresh');
      this.stopAutoRefresh();
    }
  }
  
  /**
   * Met à jour l'état du service
   */
  private updateState(partialState: Partial<RefreshState>): void {
    this.refreshStateSubject.next({
      ...this.refreshStateSubject.value,
      ...partialState
    });
  }
  
  /**
   * Obtient le temps écoulé depuis le dernier rafraîchissement
   */
  getTimeSinceLastRefresh(): string {
    const lastRefresh = this.refreshStateSubject.value.lastRefreshTime;
    if (!lastRefresh) return 'jamais';
    
    const now = new Date();
    const diffMs = now.getTime() - lastRefresh.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    
    if (diffSeconds < 5) return 'à l\'instant';
    if (diffSeconds < 60) return `il y a ${diffSeconds}s`;
    if (diffMinutes === 1) return 'il y a 1 minute';
    if (diffMinutes < 60) return `il y a ${diffMinutes} minutes`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours === 1) return 'il y a 1 heure';
    return `il y a ${diffHours} heures`;
  }
  
  /**
   * Vérifie si le service est actif
   */
  isActive(): boolean {
    return this.refreshStateSubject.value.isActive;
  }
  
  /**
   * Nettoyage des ressources
   */
  ngOnDestroy(): void {
    console.log('🧹 Nettoyage AutoRefreshService');
    this.stopAutoRefresh();
    this.destroy$.next();
    this.destroy$.complete();
    this.refreshStateSubject.complete();
  }
}