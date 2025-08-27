import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'blocked',
    loadComponent: () => import('./pages/blocked/blocked.page').then(m => m.BlockedPage)
  },
  {
    path: '',
    loadComponent: () => import('./tabs/entreprise-tabs.page').then(m => m.EntrepriseTabsPage),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/dashboard.page').then(m => m.DashboardPage)
      },
      {
        path: 'conducteurs',
        loadComponent: () => import('./conducteurs/conducteurs.page').then(m => m.ConducteursPage)
      },
      {
        path: 'reservations',
        loadComponent: () => import('./reservations/reservations.page').then(m => m.EntrepriseReservationsPage)
      },
      {
        path: 'finances',
        loadComponent: () => import('./finances/finances.page').then(m => m.FinancesPage)
      },
      {
        path: 'versements',
        loadComponent: () => import('./versements/versements.page').then(m => m.VersementsPage)
      },
      {
        path: 'profile',
        loadComponent: () => import('./profile/profile.page').then(m => m.EntrepriseProfilePage)
      },
      {
        path: 'commissions-factures',
        loadComponent: () => import('./pages/commissions-factures/commissions-factures.page').then(m => m.CommissionsFacturesPage)
      },
      {
        path: 'mes-commissions',
        loadComponent: () => import('./pages/commissions/mes-commissions.page').then(m => m.MesCommissionsPage)
      },
      {
        path: 'financial-overview',
        loadComponent: () => import('./pages/financial-overview/financial-overview.page').then(m => m.FinancialOverviewPage)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  }
];