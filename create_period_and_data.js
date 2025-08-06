/**
 * Script pour créer une période en cours et les données de test
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nmwnibzgvwltipmtwhzo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createPeriodAndData() {
  try {
    console.log('🎯 Création période et données de test...\n');

    // 1. Créer une nouvelle période en cours
    const now = new Date();
    const periodeDebut = new Date(now.getFullYear(), now.getMonth(), 1); // Début du mois
    const periodeFin = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Fin du mois

    console.log('📅 Création de la période en cours...');
    
    const { data: nouvellePeriode, error: periodeError } = await supabase
      .from('facturation_periodes')
      .insert([{
        periode_debut: periodeDebut.toISOString(),
        periode_fin: periodeFin.toISOString(),
        statut: 'en_cours',
        total_commissions: 0,
        total_facture: 0,
        nombre_entreprises: 0
      }])
      .select()
      .single();

    if (periodeError) {
      console.log('❌ Erreur création période:', periodeError.message);
      
      // Essayer de récupérer une période existante
      const { data: existingPeriode } = await supabase
        .from('facturation_periodes')
        .select('*')
        .order('periode_debut', { ascending: false })
        .limit(1)
        .single();
      
      if (existingPeriode) {
        // Remettre en statut en_cours si nécessaire
        await supabase
          .from('facturation_periodes')
          .update({ statut: 'en_cours' })
          .eq('id', existingPeriode.id);
        
        console.log(`✅ Utilisation période existante: ${new Date(existingPeriode.periode_debut).toLocaleDateString('fr-FR')}`);
        var periodeEnCours = { ...existingPeriode, statut: 'en_cours' };
      } else {
        console.log('❌ Impossible de créer ou trouver une période');
        return;
      }
    } else {
      console.log(`✅ Période créée: ${new Date(nouvellePeriode.periode_debut).toLocaleDateString('fr-FR')} - ${new Date(nouvellePeriode.periode_fin).toLocaleDateString('fr-FR')}`);
      var periodeEnCours = nouvellePeriode;
    }

    // 2. Récupérer le conducteur créé précédemment
    const entrepriseId = 'eae583ec-a751-47a7-8447-973c1850d593';
    
    const { data: conducteur } = await supabase
      .from('conducteurs')
      .select('id, nom, prenom')
      .eq('entreprise_id', entrepriseId)
      .order('date_inscription', { ascending: false })
      .limit(1)
      .single();

    if (!conducteur) {
      console.log('❌ Aucun conducteur trouvé pour cette entreprise');
      return;
    }

    console.log(`👤 Conducteur: ${conducteur.prenom} ${conducteur.nom}`);

    // 3. Créer 3 réservations validées dans cette période
    const baseDate = new Date(periodeEnCours.periode_debut);
    baseDate.setDate(baseDate.getDate() + 2); // 2 jours après le début

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
        date_code_validation: new Date(baseDate.getTime() + 1000 * 60 * 30).toISOString(),
        created_at: baseDate.toISOString(),
        commentaire: 'Test1'
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
        date_code_validation: new Date(baseDate.getTime() + 1000 * 60 * 60 * 2).toISOString(),
        created_at: new Date(baseDate.getTime() + 1000 * 60 * 60).toISOString(),
        commentaire: 'Test2'
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
        date_code_validation: new Date(baseDate.getTime() + 1000 * 60 * 60 * 4).toISOString(),
        created_at: new Date(baseDate.getTime() + 1000 * 60 * 60 * 3).toISOString(),
        commentaire: 'Test3'
      }
    ];

    console.log('\n🚗 Ajout de 3 réservations validées...');
    
    const { data: insertedReservations, error: reservationError } = await supabase
      .from('reservations')
      .insert(reservations)
      .select('id, client_phone, prix_total, distance_km, date_code_validation, created_at');

    if (reservationError) {
      console.log('❌ Erreur insertion réservations:', reservationError.message);
      return;
    }

    console.log('\n✅ RÉSERVATIONS VALIDÉES CRÉÉES:');
    insertedReservations?.forEach((r, index) => {
      console.log(`   ${index + 1}. ${r.client_phone}`);
      console.log(`      Prix: ${formatPrice(r.prix_total)} • Distance: ${r.distance_km} km`);
      console.log(`      Code validé: ${new Date(r.date_code_validation).toLocaleString('fr-FR')}`);
      console.log(`      ID: ${r.id.slice(0, 8)}...`);
      console.log('');
    });

    // 4. Ajouter une réservation NON validée pour tester la séparation
    const reservationNonValidee = {
      conducteur_id: conducteur.id,
      client_phone: '+224623456789',
      depart_nom: 'Gare Voiture',
      destination_nom: 'Coronthie',
      prix_total: 12000,
      distance_km: 4.2,
      statut: 'completed',
      code_validation: null, // Pas de code
      date_code_validation: null, // Pas validée
      created_at: new Date(baseDate.getTime() + 1000 * 60 * 60 * 5).toISOString(),
      commentaire: 'Test'
    };

    const { data: reservationNonValideeInserted } = await supabase
      .from('reservations')
      .insert([reservationNonValidee])
      .select('id, client_phone, prix_total, distance_km')
      .single();

    console.log('⚠️  RÉSERVATION NON VALIDÉE (test séparation):');
    console.log(`   ${reservationNonValideeInserted.client_phone}`);
    console.log(`   Prix: ${formatPrice(reservationNonValideeInserted.prix_total)} • Distance: ${reservationNonValideeInserted.distance_km} km`);
    console.log(`   ❌ Code NON validé - ne comptera PAS dans les commissions\n`);

    // 5. Calculs prévisionnels
    const totalCA = reservations.reduce((sum, r) => sum + r.prix_total, 0);
    const totalCaAvecNonValidee = totalCA + reservationNonValidee.prix_total;
    const commissionAttendue = totalCA * 0.11; // Seulement sur les validées

    console.log('💰 PRÉVISIONS COMMISSION:');
    console.log(`   Entreprise: Moto Rapide Guinée`);
    console.log(`   Conducteur: ${conducteur.prenom} ${conducteur.nom}`);
    console.log(`   CA validé (3 réservations): ${formatPrice(totalCA)}`);
    console.log(`   CA total (4 réservations): ${formatPrice(totalCaAvecNonValidee)}`);
    console.log(`   ✅ Commission calculée sur: ${formatPrice(totalCA)} (uniquement validées)`);
    console.log(`   💰 Commission attendue (11%): ${formatPrice(commissionAttendue)}`);

    console.log('\n🔍 CHAMPS DATE DE CLÔTURE:');
    console.log('   • created_at: Date de création de la période');
    console.log('   • updated_at: Date de dernière modification (= date clôture)');
    console.log('   📅 Après clôture, "updated_at" sera mis à jour automatiquement');

    console.log('\n🚀 PRÊT POUR LE TEST !');
    console.log('\n📋 PROCÉDURE DE TEST:');
    console.log('   1. Aller dans Super-Admin > Gestion Financière');
    console.log('   2. Cliquer sur "Clôturer" pour la période en cours');
    console.log('   3. Vérifier que la commission = ' + formatPrice(commissionAttendue));
    console.log(`   4. Voir détails: http://localhost:4200/super-admin/financial/periode/${periodeEnCours.id}`);
    console.log('\n🎯 DANS LA PAGE DÉTAILS:');
    console.log('   • Onglet "Validées (3)" : Les 3 réservations avec codes');
    console.log('   • Onglet "En attente (1)" : La réservation sans code');
    console.log('   • Prix et distance affichés pour chaque réservation');
    console.log('   • Commission calculée uniquement sur les 3 validées');

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

createPeriodAndData();