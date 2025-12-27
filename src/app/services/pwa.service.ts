import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PwaService {
  private deferredPrompt: any = null;
  private installableSubject = new BehaviorSubject<boolean>(false);
  public installable$ = this.installableSubject.asObservable();

  private installedSubject = new BehaviorSubject<boolean>(false);
  public installed$ = this.installedSubject.asObservable();

  constructor() {
    this.initPwaPrompt();
    this.checkIfInstalled();
  }

  private initPwaPrompt() {
    window.addEventListener('beforeinstallprompt', (event: Event) => {
      event.preventDefault();
      this.deferredPrompt = event;
      this.installableSubject.next(true);
      console.log('PWA: beforeinstallprompt event fired');
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.installableSubject.next(false);
      this.installedSubject.next(true);
      console.log('PWA: App installed successfully');
    });
  }

  private checkIfInstalled(): boolean {
    // Check if app is running in standalone mode (installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true;

    if (isStandalone) {
      this.installedSubject.next(true);
      this.installableSubject.next(false);
    }

    return isStandalone;
  }

  async installApp(): Promise<boolean> {
    if (!this.deferredPrompt) {
      console.log('PWA: No deferred prompt available');
      return false;
    }

    try {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;

      console.log('PWA: User choice:', outcome);

      if (outcome === 'accepted') {
        this.deferredPrompt = null;
        this.installableSubject.next(false);
        return true;
      }

      return false;
    } catch (error) {
      console.error('PWA: Error during install:', error);
      return false;
    }
  }

  isInstallable(): boolean {
    return this.deferredPrompt !== null;
  }

  isInstalled(): boolean {
    return this.checkIfInstalled();
  }

  dismissInstallBanner() {
    this.installableSubject.next(false);
    // Store in localStorage to not show again for 7 days
    localStorage.setItem('pwa_banner_dismissed', Date.now().toString());
  }

  shouldShowBanner(): boolean {
    const dismissed = localStorage.getItem('pwa_banner_dismissed');
    if (!dismissed) return true;

    const dismissedTime = parseInt(dismissed, 10);
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    return Date.now() - dismissedTime > sevenDays;
  }
}
