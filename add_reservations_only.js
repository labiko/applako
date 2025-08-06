/**
 * Script pour ajouter uniquement les réservations de test
 * Vous pourrez ensuite annuler et re-clôturer la période
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nmwnibzgvwltipmtwhzo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addReservationsOnly() {
  try {
    console.log('🚗 Ajout des réservations de test...\n');

    const entrepriseId = 'eae583ec-a751-47a7-8447-973c1850d593';

    // 1. Récupérer le conducteur de cette entreprise
    const { data: conducteur } = await supabase
      .from('conducteurs')
      .select('id, nom, prenom')
      .eq('entreprise_id', entrepriseId)
      .limit(1)
      .single();

    if (!conducteur) {
      console.log('❌ Aucun conducteur trouvé pour cette entreprise');
      return;
    }

    console.log(`👤 Conducteur: ${conducteur.prenom} ${conducteur.nom}`);

    // 2. Utiliser une date récente pour que les réservations soient dans la période courante
    const now = new Date();
    const baseDate = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2); // Il y a 2 jours

    // 3. Créer 3 réservations VALIDÉES
    const reservationsValidees = [
      {
        conducteur_id: conducteur.id,
        client_phone: '+224620123456',
        depart_nom: 'Donka',
        destination_nom: 'Madina',
        prix_total: 25000,
        distance_km: 8.5,
        statut: 'completed',
        code_validation: 'VAL1',
        date_code_validation: new Date(baseDate.getTime() + 1000 * 60 * 30).toISOString(),
        created_at: baseDate.toISOString()
      },
      {
        conducteur_id: conducteur.id,
        client_phone: '+224621234567',
        depart_nom: 'Aéroport',
        destination_nom: 'Centre',
        prix_total: 35000,
        distance_km: 15.2,
        statut: 'completed',
        code_validation: 'VAL2',
        date_code_validation: new Date(baseDate.getTime() + 1000 * 60 * 60 * 2).toISOString(),
        created_at: new Date(baseDate.getTime() + 1000 * 60 * 60).toISOString()
      },
      {
        conducteur_id: conducteur.id,
        client_phone: '+224622345678',
        depart_nom: 'Gamal',
        destination_nom: 'Kipé',
        prix_total: 18000,
        distance_km: 6.8,
        statut: 'completed',
        code_validation: 'VAL3',
        date_code_validation: new Date(baseDate.getTime() + 1000 * 60 * 60 * 4).toISOString(),
        created_at: new Date(baseDate.getTime() + 1000 * 60 * 60 * 3).toISOString()
      }
    ];

    console.log('✅ Ajout de 3 réservations VALIDÉES...');
    
    const { data: validees, error: errorValidees } = await supabase
      .from('reservations')
      .insert(reservationsValidees)
      .select('id, client_phone, prix_total, distance_km, date_code_validation');

    if (errorValidees) {
      console.log('❌ Erreur réservations validées:', errorValidees.message);
      return;
    }

    validees?.forEach((r, index) => {
      console.log(`   ${index + 1}. ${r.client_phone} - ${formatPrice(r.prix_total)} • ${r.distance_km} km ✅`);
    });

    // 4. Créer 1 réservation NON VALIDÉE (pour tester la séparation)
    const reservationNonValidee = {
      conducteur_id: conducteur.id,
      client_phone: '+224623456789',
      depart_nom: 'Gare',
      destination_nom: 'Coron',
      prix_total: 12000,
      distance_km: 4.2,
      statut: 'completed',
      code_validation: null, // PAS DE CODE
      date_code_validation: null, // PAS VALIDÉE
      created_at: new Date(baseDate.getTime() + 1000 * 60 * 60 * 5).toISOString()
    };

    console.log('\n⚠️  Ajout de 1 réservation NON VALIDÉE...');
    
    const { data: nonValidee, error: errorNonValidee } = await supabase
      .from('reservations')
      .insert([reservationNonValidee])
      .select('id, client_phone, prix_total, distance_km')
      .single();

    if (errorNonValidee) {
      console.log('❌ Erreur réservation non validée:', errorNonValidee.message);
    } else {
      console.log(`   1. ${nonValidee.client_phone} - ${formatPrice(nonValidee.prix_total)} • ${nonValidee.distance_km} km ❌`);
    }

    // 5. Résumé des calculs
    const totalValidees = reservationsValidees.reduce((sum, r) => sum + r.prix_total, 0);
    const totalToutes = totalValidees + reservationNonValidee.prix_total;
    const commissionAttendue = totalValidees * 0.11;

    console.log('\n💰 RÉSUMÉ POUR LE TEST:');
    console.log(`   Entreprise: Moto Rapide Guinée`);
    console.log(`   Conducteur: ${conducteur.prenom} ${conducteur.nom}`);
    console.log(`   
   🟢 3 réservations VALIDÉES: ${formatPrice(totalValidees)}
   🔴 1 réservation NON validée: ${formatPrice(reservationNonValidee.prix_total)}
   📊 Total toutes réservations: ${formatPrice(totalToutes)}
   
   💡 COMMISSION CALCULÉE SUR: ${formatPrice(totalValidees)} (uniquement validées)
   💰 Commission attendue (11%): ${formatPrice(commissionAttendue)}`);

    console.log('\n🚀 PRÊT POUR LE TEST DE CLÔTURE !');
    console.log('\n📋 PROCÉDURE:');
    console.log('   1. Aller dans Super-Admin > Gestion Financière');
    console.log('   2. Si période déjà clôturée : Cliquer "Annuler la clôture"');
    console.log('   3. Cliquer "Clôturer" pour recalculer');
    console.log('   4. Vérifier la commission = ' + formatPrice(commissionAttendue));
    console.log('   5. Voir les détails avec onglets Validées/En attente');

    console.log('\n🔍 DANS LA PAGE DÉTAILS, VOUS DEVRIEZ VOIR:');
    console.log('   • Onglet "Validées (3)" avec les réservations à codes');
    console.log('   • Onglet "En attente (1)" avec la réservation sans code');  
    console.log('   • Prix et distance affichés pour chaque réservation');
    console.log('   • Badge info: "Ces réservations sont comptées dans les commissions"');

    // 6. Vérifier si il y a un champ date_code_validation pour affichage
    console.log('\n📅 CHAMP DATE DE CLÔTURE:');
    console.log('   Dans facturation_periodes, le champ "updated_at" indique la date de clôture');
    console.log('   Il sera mis à jour automatiquement quand vous clôturerez la période');

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

addReservationsOnly();