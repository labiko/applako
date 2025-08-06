/**
 * Script pour ajouter 3 réservations validées pour tester la clôture
 * Entreprise: eae583ec-a751-47a7-8447-973c1850d593
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nmwnibzgvwltipmtwhzo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addTestReservations() {
  try {
    console.log('🎯 Ajout de 3 réservations validées pour test...\n');

    const entrepriseId = 'eae583ec-a751-47a7-8447-973c1850d593';

    // 1. Récupérer un conducteur de cette entreprise
    const { data: conducteurs } = await supabase
      .from('conducteurs')
      .select('id, nom, telephone')
      .eq('entreprise_id', entrepriseId)
      .limit(1);

    if (!conducteurs || conducteurs.length === 0) {
      console.log('❌ Aucun conducteur trouvé pour cette entreprise');
      return;
    }

    const conducteur = conducteurs[0];
    console.log(`👤 Conducteur trouvé: ${conducteur.nom} (${conducteur.id})`);

    // 2. Récupérer la période en cours
    const { data: periodeEnCours } = await supabase
      .from('facturation_periodes')
      .select('*')
      .eq('statut', 'en_cours')
      .order('periode_debut', { ascending: false })
      .limit(1)
      .single();

    if (!periodeEnCours) {
      console.log('❌ Aucune période en cours trouvée');
      return;
    }

    console.log(`📅 Période en cours: ${new Date(periodeEnCours.periode_debut).toLocaleDateString('fr-FR')} - ${new Date(periodeEnCours.periode_fin).toLocaleDateString('fr-FR')}`);

    // 3. Créer 3 réservations validées
    const now = new Date();
    const baseDate = new Date(periodeEnCours.periode_debut);
    // S'assurer que la date est dans la période
    baseDate.setDate(baseDate.getDate() + 1);

    const reservations = [
      {
        conducteur_id: conducteur.id,
        client_phone: '+224620123456',
        depart_nom: 'Hôpital Donka',
        destination_nom: 'Marché Madina',
        prix_total: 25000,
        distance_km: 8.5,
        statut: 'completed',
        code_validation: 'VAL001',
        date_code_validation: new Date(baseDate.getTime() + 1000 * 60 * 30).toISOString(), // 30min après création
        created_at: baseDate.toISOString(),
        commentaire: 'Course test 1 - Validée pour calcul commission'
      },
      {
        conducteur_id: conducteur.id,
        client_phone: '+224621234567',
        depart_nom: 'Aéroport Conakry',
        destination_nom: 'Centre ville',
        prix_total: 35000,
        distance_km: 15.2,
        statut: 'completed',
        code_validation: 'VAL002',
        date_code_validation: new Date(baseDate.getTime() + 1000 * 60 * 60 * 2).toISOString(), // 2h après création
        created_at: new Date(baseDate.getTime() + 1000 * 60 * 60).toISOString(), // 1h après la première
        commentaire: 'Course test 2 - Validée pour calcul commission'
      },
      {
        conducteur_id: conducteur.id,
        client_phone: '+224622345678',
        depart_nom: 'Université Gamal',
        destination_nom: 'Kipé',
        prix_total: 18000,
        distance_km: 6.8,
        statut: 'completed',
        code_validation: 'VAL003',
        date_code_validation: new Date(baseDate.getTime() + 1000 * 60 * 60 * 4).toISOString(), // 4h après création
        created_at: new Date(baseDate.getTime() + 1000 * 60 * 60 * 3).toISOString(), // 3h après la première
        commentaire: 'Course test 3 - Validée pour calcul commission'
      }
    ];

    // 4. Insérer les réservations
    const { data: insertedReservations, error } = await supabase
      .from('reservations')
      .insert(reservations)
      .select('id, client_phone, prix_total, distance_km, date_code_validation');

    if (error) {
      console.log('❌ Erreur insertion:', error.message);
      return;
    }

    console.log('\n✅ RÉSERVATIONS AJOUTÉES:');
    insertedReservations?.forEach((r, index) => {
      console.log(`   ${index + 1}. ${r.client_phone}`);
      console.log(`      Prix: ${formatPrice(r.prix_total)} • Distance: ${r.distance_km} km`);
      console.log(`      Code validé: ${new Date(r.date_code_validation).toLocaleString('fr-FR')}`);
      console.log(`      ID: ${r.id.slice(0, 8)}...`);
      console.log('');
    });

    // 5. Calculer le total pour vérification
    const totalCA = reservations.reduce((sum, r) => sum + r.prix_total, 0);
    const commissionAttendue = totalCA * 0.11; // 11% par défaut

    console.log('💰 PRÉVISION COMMISSION:');
    console.log(`   Chiffre d'affaires: ${formatPrice(totalCA)}`);
    console.log(`   Commission attendue (11%): ${formatPrice(commissionAttendue)}`);

    console.log('\n🚀 PRÊT POUR TEST CLÔTURE !');
    console.log('   1. Aller dans Super-Admin > Gestion Financière');
    console.log('   2. Cliquer sur "Clôturer" pour la période en cours');
    console.log('   3. Vérifier que la commission est calculée pour ces 3 réservations');
    console.log(`   4. Voir les détails: http://localhost:4200/super-admin/financial/periode/${periodeEnCours.id}`);

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

function formatPrice(amount) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'GNF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0);
}

addTestReservations();