import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

export const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: 'reservations',
        loadComponent: () =>
          import('../reservations/reservations.page').then((m) => m.ReservationsPage),
      },
      {
        path: 'historique',
        loadComponent: () =>
          import('../historique/historique.page').then((m) => m.HistoriquePage),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('../profile/profile.page').then((m) => m.ProfilePage),
      },
      {
        path: '',
        redirectTo: 'reservations',
        pathMatch: 'full',
      },
    ],
  },
];