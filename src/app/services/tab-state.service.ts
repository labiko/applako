import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TabStateService {
  private currentTabSubject = new BehaviorSubject<string>('dashboard');
  public currentTab$ = this.currentTabSubject.asObservable();

  constructor() {
    // Récupérer l'état du tab depuis le localStorage si disponible
    const savedTab = localStorage.getItem('entreprise_current_tab');
    if (savedTab) {
      this.currentTabSubject.next(savedTab);
    }
  }

  setCurrentTab(tab: string) {
    this.currentTabSubject.next(tab);
    localStorage.setItem('entreprise_current_tab', tab);
  }

  getCurrentTab(): string {
    return this.currentTabSubject.value;
  }

  clearTabState() {
    localStorage.removeItem('entreprise_current_tab');
    this.currentTabSubject.next('dashboard');
  }
}