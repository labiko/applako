/**
 * SERVICE CONFIGURATION LENGOPAY
 * Gestion des constantes et configuration par défaut
 */

import { Injectable } from '@angular/core';

export interface LengoPayConfigData {
  id?: string;
  entreprise_id: string;
  provider_name: string;
  is_active: boolean;
  api_url: string;
  license_key: string;
  website_id: string;
  callback_url: string;
  telephone_marchand: string;
  green_api_instance_id: string;
  green_api_token: string;
  green_api_base_url: string;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LengoPayConfigService {

  // Constantes Green API (préremplies et non modifiables)
  private readonly GREEN_API_CONSTANTS = {
    instance_id: '7105303512',
    token: '022e5da3d2e641ab99a3f70539270b187fbfa80635c44b71ad',
    base_url: 'https://7105.api.greenapi.com'
  };

  // Configuration par défaut pour création (champs vides)
  private readonly DEFAULT_LENGOPAY_CONFIG = {
    api_url: 'https://sandbox.lengopay.com/api/v1/payments',
    callback_url: '',  // Vide pour mode création
    telephone_marchand: ''  // Vide pour mode création
  };

  constructor() {}

  /**
   * Récupérer la configuration par défaut pour création
   * Seuls Green API et URL API sont préremplis
   */
  getDefaultCreationConfig(): Partial<LengoPayConfigData> {
    return {
      api_url: this.DEFAULT_LENGOPAY_CONFIG.api_url,
      license_key: '',  // Vide - à remplir par l'utilisateur
      website_id: '',   // Vide - à remplir par l'utilisateur
      callback_url: '', // Vide - à remplir par l'utilisateur
      telephone_marchand: '', // Vide - à remplir par l'utilisateur
      green_api_instance_id: this.GREEN_API_CONSTANTS.instance_id,
      green_api_token: this.GREEN_API_CONSTANTS.token,
      green_api_base_url: this.GREEN_API_CONSTANTS.base_url
    };
  }

  /**
   * Récupérer les constantes Green API
   */
  getGreenApiConstants() {
    return this.GREEN_API_CONSTANTS;
  }

  /**
   * Vérifier si la configuration est en mode création
   * @param config Configuration existante ou null
   */
  isCreationMode(config: any): boolean {
    return !config || !config.id;
  }

  /**
   * Préparer les données pour sauvegarde
   */
  prepareConfigForSave(formData: any, entrepriseId: string, isActive: boolean = false): any {
    return {
      entreprise_id: entrepriseId,
      provider_name: 'lengopay',
      is_active: isActive, // Par défaut false en mode création
      api_url: formData.api_url,
      license_key: formData.license_key,
      website_id: formData.website_id,
      callback_url: formData.callback_url,
      telephone_marchand: formData.telephone_marchand,
      green_api_instance_id: this.GREEN_API_CONSTANTS.instance_id,
      green_api_token: this.GREEN_API_CONSTANTS.token,
      green_api_base_url: this.GREEN_API_CONSTANTS.base_url,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }
}