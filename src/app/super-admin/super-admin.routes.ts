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
  }
];