/**
 * INTERCEPTOR DE BLOCAGE
 * Intercepte les réponses HTTP pour détecter les blocages côté serveur
 */

import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { BlockageService } from '../services/blocage.service';

export interface BlockageError {
  code: 'ENTREPRISE_BLOCKED' | 'CONDUCTEUR_BLOCKED';
  motif: string;
  type: 'entreprise' | 'conducteur';
  bloque_par?: string;
  date_blocage?: string;
}

@Injectable()
export class BlocageInterceptor implements HttpInterceptor {

  constructor(
    private router: Router,
    private blocageService: BlockageService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        
        // Vérifier si c'est une erreur de blocage
        if (error.status === 403 && this.isBlockageError(error.error)) {
          console.log('🚫 Interceptor: Blocage détecté dans la réponse HTTP');
          this.handleBlockageError(error.error);
        }

        // Vérifier d'autres codes d'erreur potentiels
        if (error.status === 401 && this.isBlockageRelated(error.error)) {
          console.log('🚫 Interceptor: Possible blocage détecté (401)');
          // Déclencher une vérification manuelle
          this.blocageService.checkBlockageStatus();
        }

        return throwError(() => error);
      })
    );
  }

  private isBlockageError(errorBody: any): errorBody is BlockageError {
    return errorBody && 
           (errorBody.code === 'ENTREPRISE_BLOCKED' || errorBody.code === 'CONDUCTEUR_BLOCKED');
  }

  private isBlockageRelated(errorBody: any): boolean {
    if (!errorBody || typeof errorBody.message !== 'string') {
      return false;
    }

    const message = errorBody.message.toLowerCase();
    return message.includes('bloqué') || 
           message.includes('désactivé') || 
           message.includes('suspendu') ||
           message.includes('blocked') ||
           message.includes('disabled') ||
           message.includes('suspended');
  }

  private async handleBlockageError(error: BlockageError): Promise<void> {
    try {
      console.log('🔧 Interceptor: Traitement de l\'erreur de blocage:', error);

      if (error.code === 'ENTREPRISE_BLOCKED') {
        // Nettoyer les données de session
        localStorage.clear();
        sessionStorage.clear();
        
        // Stocker les informations de blocage
        localStorage.setItem('blocage_motif', error.motif);
        localStorage.setItem('blocage_type', 'entreprise');
        localStorage.setItem('blocage_date', error.date_blocage || '');
        
        // Rediriger vers la page de blocage entreprise
        await this.router.navigate(['/entreprise/blocked'], { 
          queryParams: { 
            motif: error.motif,
            type: 'entreprise'
          } 
        });
        
      } else if (error.code === 'CONDUCTEUR_BLOCKED') {
        // Afficher la modal de blocage pour conducteur
        await this.blocageService.showBlockedModal(
          error.motif,
          error.bloque_par,
          error.date_blocage
        );
      }

    } catch (handlerError) {
      console.error('❌ Interceptor: Erreur lors du traitement du blocage:', handlerError);
    }
  }
}

// Configuration de l'interceptor pour l'injection
export const blocageInterceptorProvider = {
  provide: HTTP_INTERCEPTORS,
  useClass: BlocageInterceptor,
  multi: true
};

// Import nécessaire pour le provider
import { HTTP_INTERCEPTORS } from '@angular/common/http';