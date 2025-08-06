/**
 * Script pour corriger la période juillet et ajuster les réservations
 * Période correcte : 01 juillet 2025 - 31 juillet 2025
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nmwnibzgvwltipmtwhzo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixJulyPeriod() {
  try {
    console.log('🛠️  Correction de la période juillet 2025...\n');

    // 1. Dates correctes pour juillet 2025
    const periodeDebut = new Date('2025-07-01T00:00:00.000Z');
    const periodeFin = new Date('2025-07-31T23:59:59.999Z');

    console.log(`📅 Période corrigée : ${periodeDebut.toLocaleDateString('fr-FR')} - ${periodeFin.toLocaleDateString('fr-FR')}`);

    // 2. Mettre à jour la période la plus récente
    const { data: periodeUpdated, error: updateError } = await supabase
      .from('facturation_periodes')
      .update({
        periode_debut: periodeDebut.toISOString(),
        periode_fin: periodeFin.toISOString(),
        statut: 'en_cours'
      })
      .order('created_at', { ascending: false })
      .limit(1)
      .select()
      .single();

    if (updateError) {
      console.log('❌ Erreur mise à jour période:', updateError.message);
      return;
    }

    console.log('✅ Période mise à jour avec succès');
    console.log(`   ID: ${periodeUpdated.id}`);
    console.log(`   Dates: ${new Date(periodeUpdated.periode_debut).toLocaleDateString('fr-FR')} - ${new Date(periodeUpdated.periode_fin).toLocaleDateString('fr-FR')}`);

    // 3. Récupérer les réservations de test créées précédemment
    const entrepriseId = 'eae583ec-a751-47a7-8447-973c1850d593';
    
    const { data: conducteur } = await supabase
      .from('conducteurs')
      .select('id')
      .eq('entreprise_id', entrepriseId)
      .limit(1)
      .single();

    if (!conducteur) {
      console.log('❌ Conducteur non trouvé');
      return;
    }

    // 4. Récupérer les réservations de test (les 4 dernières de ce conducteur)
    const { data: reservationsTest } = await supabase
      .from('reservations')
      .select('id, client_phone, prix_total, distance_km, code_validation, date_code_validation')
      .eq('conducteur_id', conducteur.id)
      .order('created_at', { ascending: false })
      .limit(4);

    if (!reservationsTest || reservationsTest.length === 0) {
      console.log('❌ Aucune réservation de test trouvée');
      return;
    }

    console.log(`\n🚗 Trouvé ${reservationsTest.length} réservations de test à déplacer`);

    // 5. Nouvelles dates dans la période juillet
    const baseDate = new Date('2025-07-15T10:00:00.000Z'); // 15 juillet à 10h
    const nouvelleDatesPourReservations = [
      baseDate,
      new Date(baseDate.getTime() + 1000 * 60 * 60 * 2), // +2h
      new Date(baseDate.getTime() + 1000 * 60 * 60 * 4), // +4h
      new Date(baseDate.getTime() + 1000 * 60 * 60 * 6)  // +6h
    ];

    // 6. Mettre à jour chaque réservation avec les nouvelles dates
    for (let i = 0; i < reservationsTest.length; i++) {
      const reservation = reservationsTest[i];
      const nouvelleDate = nouvelleDatesPourReservations[i];
      
      // Pour les réservations validées, ajuster aussi la date de validation
      let nouvelleDateValidation = null;
      if (reservation.date_code_validation) {
        nouvelleDateValidation = new Date(nouvelleDate.getTime() + 1000 * 60 * 30).toISOString(); // 30min après création
      }

      const { error: updateReservationError } = await supabase
        .from('reservations')
        .update({
          created_at: nouvelleDate.toISOString(),
          date_code_validation: nouvelleDateValidation
        })
        .eq('id', reservation.id);

      if (updateReservationError) {
        console.log(`❌ Erreur mise à jour réservation ${reservation.client_phone}:`, updateReservationError.message);
      } else {
        const status = reservation.code_validation ? '✅' : '❌';
        console.log(`   ${i + 1}. ${reservation.client_phone} - ${formatPrice(reservation.prix_total)} ${status}`);
        console.log(`      Nouvelle date: ${nouvelleDate.toLocaleString('fr-FR')}`);
      }
    }

    // 7. Résumé final
    const totalValidees = reservationsTest
      .filter(r => r.code_validation)
      .reduce((sum, r) => sum + r.prix_total, 0);
    
    const commissionAttendue = totalValidees * 0.11;

    console.log('\n💰 RÉSUMÉ FINAL:');
    console.log(`   Période: 1er juillet - 31 juillet 2025`);
    console.log(`   Entreprise: Moto Rapide Guinée`);
    console.log(`   Réservations validées: ${reservationsTest.filter(r => r.code_validation).length}`);
    console.log(`   Réservations en attente: ${reservationsTest.filter(r => !r.code_validation).length}`);
    console.log(`   CA validé: ${formatPrice(totalValidees)}`);
    console.log(`   Commission attendue: ${formatPrice(commissionAttendue)}`);

    console.log('\n🚀 PÉRIODE JUILLET PRÊTE POUR LE TEST !');
    console.log('\n📋 PROCÉDURE:');
    console.log('   1. Aller dans Super-Admin > Gestion Financière');
    console.log('   2. Voir la période "1er juil. 2025 - 31 juil. 2025"');
    console.log('   3. Cliquer "Clôturer" pour calculer les commissions');
    console.log(`   4. Vérifier commission = ${formatPrice(commissionAttendue)}`);
    console.log('   5. Voir détails avec onglets Validées/En attente');

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

fixJulyPeriod();