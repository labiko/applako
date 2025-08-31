-- Table de configuration LengoPay par entreprise
-- Adaptée du modèle restaurant existant

CREATE TABLE public.lengopay_config (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  reservation_id uuid NOT NULL,  -- Changé de restaurant_id → reservation_id (entreprise_id)
  provider_name character varying NOT NULL DEFAULT 'lengopay',
  is_active boolean NOT NULL DEFAULT true,
  api_url character varying NOT NULL,
  license_key text NOT NULL,  -- Clé encodée Base64
  website_id character varying NOT NULL,
  callback_url character varying NOT NULL,
  green_api_instance_id character varying,
  green_api_token text,
  green_api_base_url character varying DEFAULT 'https://7105.api.greenapi.com',
  telephone_marchand character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT lengopay_config_pkey PRIMARY KEY (id),
  CONSTRAINT lengopay_config_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES entreprises(id),
  CONSTRAINT lengopay_config_reservation_id_unique UNIQUE (reservation_id)
);

-- Index pour optimiser les recherches par entreprise
CREATE INDEX idx_lengopay_config_reservation_id_active ON lengopay_config(reservation_id, is_active);

-- Commentaires pour la documentation
COMMENT ON TABLE lengopay_config IS 'Configuration LengoPay par entreprise - permet à chaque entreprise d''avoir ses propres paramètres de paiement';
COMMENT ON COLUMN lengopay_config.reservation_id IS 'ID de l''entreprise (nommé reservation_id pour compatibilité avec le modèle restaurant)';
COMMENT ON COLUMN lengopay_config.license_key IS 'Clé API LengoPay encodée en Base64';
COMMENT ON COLUMN lengopay_config.website_id IS 'Identifiant unique du site marchand LengoPay';
COMMENT ON COLUMN lengopay_config.callback_url IS 'URL de callback pour les notifications de paiement';