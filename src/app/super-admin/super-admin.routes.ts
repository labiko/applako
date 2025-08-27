/**
 * ROUTES SUPER-ADMIN
 * Configuration sécurisée avec guards
 */

import { Routes } from '@angular/router';
import { SuperAdminGuard } from './guards/super-admin.guard';

export const SUPER_ADMIN_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/super-admin-login.page').then(m => m.SuperAdminLoginPage),
    title: 'Super Admin - Connexion'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/super-admin-dashboard.page').then(m => m.SuperAdminDashboardPage),
    canActivate: [SuperAdminGuard],
    title: 'Super Admin - Dashboard'
  },
  {
    path: 'reservations',
    loadComponent: () => import('./pages/reservations/global-reservations.page').then(m => m.GlobalReservationsPage),
    canActivate: [SuperAdminGuard],
    title: 'Super Admin - Vue Globale Réservations'
  },
  {
    path: 'commissions',
    loadComponent: () => import('./pages/commissions/commission-management.page').then(m => m.CommissionManagementPage),
    canActivate: [SuperAdminGuard],
    title: 'Super Admin - Gestion Commissions'
  },
  {
    path: 'audit',
    loadComponent: () => import('./pages/audit/commission-audit.page').then(m => m.CommissionAuditPage),
    canActivate: [SuperAdminGuard],
    title: 'Super Admin - Audit Commissions'
  },
  {
    path: 'financial',
    loadComponent: () => import('./pages/financial/financial-dashboard.page').then(m => m.FinancialDashboardPage),
    canActivate: [SuperAdminGuard],
    title: 'Super Admin - Gestion Financière'
  },
  {
    path: 'financial/periode/:id',
    loadComponent: () => import('./pages/financial/periode-details.page').then(m => m.PeriodeDetailsPage),
    canActivate: [SuperAdminGuard],
    title: 'Super Admin - Détails Période'
  },
  {
    path: 'financial-detail/:periodeId',
    loadComponent: () => import('./pages/financial-detail/financial-detail.page').then(m => m.FinancialDetailPage),
    canActivate: [SuperAdminGuard],
    title: 'Super Admin - Détail Financier'
  },
  {
    path: 'paiements-history',
    loadComponent: () => import('./pages/paiements-history/paiements-history.page').then(m => m.PaiementsHistoryPage),
    canActivate: [SuperAdminGuard],
    title: 'Super Admin - Historique Paiements'
  },
  {
    path: 'entreprises',
    loadComponent: () => import('./pages/entreprises/entreprises-management.page').then(m => m.EntreprisesManagementPage),
    canActivate: [SuperAdminGuard],
    title: 'Super Admin - Gestion Entreprises'
  },
  {
    path: 'conducteurs',
    loadComponent: () => import('./pages/conducteurs/conducteurs-management.page').then(m => m.ConducteursManagementPage),
    canActivate: [SuperAdminGuard],
    title: 'Super Admin - Gestion Conducteurs'
  }
];