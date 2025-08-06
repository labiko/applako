/**
 * Script pour corriger définitivement : 3 validées + 1 non validée
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nmwnibzgvwltipmtwhzo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixFinalValidation() {
  try {
    console.log('🛠️  Correction finale : 3 validées + 1 non validée...\n');

    const entrepriseId = 'eae583ec-a751-47a7-8447-973c1850d593';
    
    // Récupérer nos 4 réservations
    const { data: conducteur } = await supabase
      .from('conducteurs')
      .select('id')
      .eq('entreprise_id', entrepriseId)
      .limit(1)
      .single();

    const { data: nosReservations } = await supabase
      .from('reservations')
      .select('id, client_phone, prix_total, created_at')
      .eq('conducteur_id', conducteur.id)
      .gte('created_at', '2025-01-01')
      .lte('created_at', '2025-01-31')
      .order('created_at', { ascending: true }); // Ordre croissant pour traiter dans l'ordre de création

    if (!nosReservations || nosReservations.length !== 4) {
      console.log('❌ Problème avec les réservations trouvées');
      return;
    }

    console.log('📋 CORRECTION EN COURS...');

    // Appliquer la validation : 3 premières validées, dernière non validée
    for (let i = 0; i < nosReservations.length; i++) {
      const reservation = nosReservations[i];
      
      if (i < 3) {
        // Les 3 premières : VALIDÉES
        const dateValidation = new Date(reservation.created_at);
        dateValidation.setMinutes(dateValidation.getMinutes() + 30); // 30min après création

        await supabase
          .from('reservations')
          .update({
            code_validation: `VAL${i + 1}`,
            date_code_validation: dateValidation.toISOString()
          })
          .eq('id', reservation.id);

        console.log(`   ✅ ${reservation.client_phone} - ${formatPrice(reservation.prix_total)} - VALIDÉE`);
      } else {
        // La dernière : NON VALIDÉE
        await supabase
          .from('reservations')
          .update({
            code_validation: null,
            date_code_validation: null
          })
          .eq('id', reservation.id);

        console.log(`   ❌ ${reservation.client_phone} - ${formatPrice(reservation.prix_total)} - NON VALIDÉE`);
      }
    }

    // Vérification finale
    const { data: verification } = await supabase
      .from('reservations')
      .select('client_phone, prix_total, code_validation, date_code_validation')
      .eq('conducteur_id', conducteur.id)
      .gte('created_at', '2025-01-01')
      .lte('created_at', '2025-01-31')
      .order('created_at', { ascending: true });

    console.log('\n✅ VÉRIFICATION FINALE:');
    let validees = 0;
    let nonValidees = 0;
    let totalValidees = 0;

    verification?.forEach((r, index) => {
      const status = r.date_code_validation ? '✅' : '❌';
      console.log(`   ${index + 1}. ${r.client_phone} - ${formatPrice(r.prix_total)} ${status}`);
      
      if (r.date_code_validation) {
        validees++;
        totalValidees += r.prix_total;
      } else {
        nonValidees++;
      }
    });

    const commissionAttendue = totalValidees * 0.11;

    console.log('\n💰 RÉSUMÉ FINAL:');
    console.log(`   🟢 Validées: ${validees}`);
    console.log(`   🔴 Non validées: ${nonValidees}`);
    console.log(`   💰 CA validé: ${formatPrice(totalValidees)}`);
    console.log(`   ✅ Commission attendue: ${formatPrice(commissionAttendue)}`);

    if (validees === 3 && nonValidees === 1) {
      console.log('\n🎉 PARFAIT ! Configuration correcte');
      console.log('\n📱 Maintenant rafraîchissez la page pour voir :');
      console.log('   • Onglet "Validées (3)"');
      console.log('   • Onglet "En attente (1)"');
      console.log(`   • Commission de ${formatPrice(commissionAttendue)} après clôture`);
    }

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

fixFinalValidation();