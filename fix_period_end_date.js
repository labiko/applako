/**
 * Script pour corriger la date de fin de période : 31/07/2025
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nmwnibzgvwltipmtwhzo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixPeriodEndDate() {
  try {
    console.log('📅 Correction de la date de fin de période...\n');

    // Dates correctes : 1er juillet - 31 juillet 2025
    const periodeDebut = new Date('2025-07-01T00:00:00.000Z');
    const periodeFin = new Date('2025-07-31T23:59:59.999Z');

    // Mettre à jour la période la plus récente
    const { data: periodeUpdated, error: updateError } = await supabase
      .from('facturation_periodes')
      .update({
        periode_debut: periodeDebut.toISOString(),
        periode_fin: periodeFin.toISOString()
      })
      .order('created_at', { ascending: false })
      .limit(1)
      .select()
      .single();

    if (updateError) {
      console.log('❌ Erreur:', updateError.message);
      return;
    }

    console.log('✅ Période corrigée !');
    console.log(`   Début: ${new Date(periodeUpdated.periode_debut).toLocaleDateString('fr-FR')}`);
    console.log(`   Fin: ${new Date(periodeUpdated.periode_fin).toLocaleDateString('fr-FR')}`);
    console.log(`   Statut: ${periodeUpdated.statut}`);

    console.log('\n🎯 PÉRIODE JUILLET 2025 FINALISÉE !');
    console.log('\n📋 RÉSUMÉ COMPLET:');
    console.log('   📅 Période: 1er juillet - 31 juillet 2025');
    console.log('   🏢 Entreprise: Moto Rapide Guinée');
    console.log('   👤 Conducteur: Mamadou Diallo');
    console.log('   🟢 3 réservations validées: 65 000 GNF');
    console.log('   🔴 1 réservation non validée: 25 000 GNF');
    console.log('   💰 Commission attendue: 7 150 GNF (11% sur validées)');

    console.log('\n🚀 PRÊT POUR LE TEST DE CLÔTURE !');

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

fixPeriodEndDate();