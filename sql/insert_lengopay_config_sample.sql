-- Insertion d'un exemple de configuration LengoPay pour l'entreprise
-- Basé sur les données restaurant fournies

INSERT INTO public.lengopay_config (
    id,
    reservation_id,  -- entreprise_id (nommé reservation_id pour compatibilité)
    provider_name,
    is_active,
    api_url,
    license_key,
    website_id,
    callback_url,
    green_api_instance_id,
    green_api_token,
    green_api_base_url,
    telephone_marchand,
    created_at,
    updated_at
) VALUES (
    uuid_generate_v4(),
    '1df3d11b-978f-4018-9383-590c3ed65598',  -- ID de l'entreprise
    'lengopay',
    true,
    'https://sandbox.lengopay.com/api/v1/payments',
    'VmVHNGZud2h1YVdUUnBSYnZ1R3BlNmtMTFhHN1NDNGpaU3plMENtQ1drZ084Y280S2J5ODZPWXJQVWZRT05OWg==',
    'wyp6J7uN3pVG2Pjn',
    'https://www.labico.net/api/RestaurantLengoPayCallback',
    '7105313693',
    '994e56511a43455693d2c4c1e4be86384a27eb921c394d5693',
    'https://7105.api.greenapi.com',
    '628406028',
    NOW(),
    NOW()
);

-- Vérification de l'insertion
SELECT * FROM public.lengopay_config WHERE reservation_id = '1df3d11b-978f-4018-9383-590c3ed65598';