import { Component, OnInit, OnDestroy } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  statsChart, 
  people, 
  document, 
  wallet,
  cash,
  business,
  logOut
} from 'ionicons/icons';
import { Router, NavigationEnd } from '@angular/router';
import { EntrepriseAuthService } from '../../services/entreprise-auth.service';
import { TabStateService } from '../../services/tab-state.service';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-entreprise-tabs',
  templateUrl: 'entreprise-tabs.page.html',
  styleUrls: ['entreprise-tabs.page.scss'],
  standalone: true,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
})
export class EntrepriseTabsPage implements OnInit, OnDestroy {
  selectedTab = 'dashboard';
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private entrepriseAuthService: EntrepriseAuthService,
    private tabStateService: TabStateService
  ) {
    addIcons({ 
      statsChart, 
      people, 
      document, 
      wallet,
      cash,
      business,
      logOut
    });
  }

  ngOnInit() {
    // S'abonner aux changements d'état des tabs
    this.tabStateService.currentTab$
      .pipe(takeUntil(this.destroy$))
      .subscribe(tab => {
        this.selectedTab = tab;
      });

    // Détecter les changements de route pour maintenir le tab actif
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: NavigationEnd) => {
        this.updateSelectedTab(event.url);
      });

    // Définir le tab initial basé sur l'URL actuelle
    this.updateSelectedTab(this.router.url);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateSelectedTab(url: string) {
    let newTab = this.selectedTab;
    
    if (url.includes('/entreprise/dashboard')) {
      newTab = 'dashboard';
    } else if (url.includes('/entreprise/conducteurs')) {
      newTab = 'conducteurs';
    } else if (url.includes('/entreprise/reservations')) {
      newTab = 'reservations';
    } else if (url.includes('/entreprise/finances')) {
      newTab = 'finances';
    } else if (url.includes('/entreprise/versements')) {
      newTab = 'versements';
    } else if (url.includes('/entreprise/profile')) {
      newTab = 'profile';
    }

    // Ne mettre à jour que si le tab a changé
    if (newTab !== this.selectedTab) {
      this.tabStateService.setCurrentTab(newTab);
      console.log(`Tab updated to: ${newTab}`);
    }
  }

  // Méthode pour la navigation explicite des tabs
  navigateToTab(tab: string) {
    this.tabStateService.setCurrentTab(tab);
    this.router.navigate([`/entreprise/${tab}`]);
  }

  logout() {
    this.tabStateService.clearTabState();
    this.entrepriseAuthService.logout();
    this.router.navigate(['/user-type-selection']);
  }
}