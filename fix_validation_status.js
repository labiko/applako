/**
 * Script pour corriger le statut de validation 
 * 3 validées + 1 non validée pour tester la séparation
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nmwnibzgvwltipmtwhzo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixValidationStatus() {
  try {
    console.log('🛠️  Correction du statut de validation...\n');

    const entrepriseId = 'eae583ec-a751-47a7-8447-973c1850d593';
    
    const { data: conducteur } = await supabase
      .from('conducteurs')
      .select('id')
      .eq('entreprise_id', entrepriseId)
      .limit(1)
      .single();

    // Récupérer les 4 réservations de test
    const { data: reservations } = await supabase
      .from('reservations')
      .select('id, client_phone, prix_total, code_validation, date_code_validation')
      .eq('conducteur_id', conducteur.id)
      .order('created_at', { ascending: false })
      .limit(4);

    if (!reservations || reservations.length < 4) {
      console.log('❌ Pas assez de réservations trouvées');
      return;
    }

    // La première réservation (la plus récente) sera NON validée
    const reservationNonValidee = reservations[0];
    
    console.log('⚠️  Mise à jour du statut de validation...');
    
    // Retirer la validation de la première réservation
    const { error: updateError } = await supabase
      .from('reservations')
      .update({
        code_validation: null,
        date_code_validation: null
      })
      .eq('id', reservationNonValidee.id);

    if (updateError) {
      console.log('❌ Erreur:', updateError.message);
      return;
    }

    console.log('✅ Statut de validation corrigé !');
    
    // Vérification finale
    const { data: reservationsFinales } = await supabase
      .from('reservations')
      .select('id, client_phone, prix_total, code_validation, date_code_validation')
      .eq('conducteur_id', conducteur.id)
      .order('created_at', { ascending: false })
      .limit(4);

    console.log('\n📋 RÉPARTITION FINALE:');
    
    let totalValidees = 0;
    let totalNonValidees = 0;
    let countValidees = 0;
    let countNonValidees = 0;

    reservationsFinales?.forEach((r, index) => {
      const status = r.code_validation ? '✅ Validée' : '❌ Non validée';
      console.log(`   ${index + 1}. ${r.client_phone} - ${formatPrice(r.prix_total)} ${status}`);
      
      if (r.code_validation) {
        totalValidees += r.prix_total;
        countValidees++;
      } else {
        totalNonValidees += r.prix_total;
        countNonValidees++;
      }
    });

    const commissionAttendue = totalValidees * 0.11;

    console.log('\n💰 CALCUL COMMISSION FINAL:');
    console.log(`   🟢 ${countValidees} réservations validées: ${formatPrice(totalValidees)}`);
    console.log(`   🔴 ${countNonValidees} réservation non validée: ${formatPrice(totalNonValidees)}`);
    console.log(`   📊 Total toutes réservations: ${formatPrice(totalValidees + totalNonValidees)}`);
    console.log(`   💰 Commission calculée sur: ${formatPrice(totalValidees)} (uniquement validées)`);
    console.log(`   ✅ Commission attendue (11%): ${formatPrice(commissionAttendue)}`);

    console.log('\n🎯 PARFAIT POUR LE TEST !');
    console.log('\n📋 DANS LA PAGE DÉTAILS PÉRIODE:');
    console.log(`   • Onglet "Validées (${countValidees})" avec les réservations à codes`);
    console.log(`   • Onglet "En attente (${countNonValidees})" avec la réservation sans code`);
    console.log('   • Prix et distance affichés pour chaque réservation');
    console.log('   • Commission calculée uniquement sur les validées');

  } catch (error) {
    console.error('❌ Erreur:', error);
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

fixValidationStatus();