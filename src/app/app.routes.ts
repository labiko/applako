import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { RedirectGuard } from './guards/redirect.guard';

export const routes: Routes = [
  {
    path: 'user-type-selection',
    loadComponent: () => import('./user-type-selection/user-type-selection.page').then(m => m.UserTypeSelectionPage),
    canActivate: [RedirectGuard]
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'create-password',
    loadComponent: () => import('./entreprise/create-password/create-password.page').then(m => m.CreatePasswordPage)
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./auth/reset-password/reset-password.page').then(m => m.ResetPasswordPage)
  },
  {
    path: '',
    redirectTo: '/user-type-selection',
    pathMatch: 'full'
  },
  {
    path: 'tabs',
    loadChildren: () => import('./tabs/tabs.routes').then((m) => m.routes),
    canActivate: [AuthGuard]
  },
  {
    path: 'entreprise',
    loadChildren: () => import('./entreprise/entreprise.routes').then((m) => m.routes),
    canActivate: [AuthGuard]
  },
  {
    path: 'super-admin',
    loadChildren: () => import('./super-admin/super-admin.routes').then((m) => m.SUPER_ADMIN_ROUTES)
  },
];