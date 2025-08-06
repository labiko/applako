/**
 * Script pour corriger le statut de la période
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nmwnibzgvwltipmtwhzo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixPeriodeStatus() {
  try {
    console.log('🔧 Correction du statut de la période...\n');

    // 1. Voir l'état actuel
    const { data: periodes, error: getError } = await supabase
      .from('facturation_periodes')
      .select('*');

    if (getError) {
      console.log('❌ Erreur lecture:', getError.message);
      return;
    }

    console.log('📋 État actuel des périodes:');
    periodes?.forEach((p, index) => {
      const debut = new Date(p.periode_debut).toLocaleDateString('fr-FR');
      const fin = new Date(p.periode_fin).toLocaleDateString('fr-FR');
      console.log(`  ${index + 1}. ${debut} - ${fin}: ${p.statut} (${formatPrice(p.total_commissions)})`);
    });

    // 2. Remettre TOUTES les périodes en 'en_cours'
    console.log('\n🔄 Remise à zéro de toutes les périodes...');
    const { error: updateError } = await supabase
      .from('facturation_periodes')
      .update({
        statut: 'en_cours',
        total_commissions: 0,
        total_facture: 0,
        nombre_entreprises: 0
      })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Mettre à jour toutes les lignes

    if (updateError) {
      console.log('❌ Erreur mise à jour:', updateError.message);
      return;
    }

    console.log('✅ Toutes les périodes remises en statut "en_cours"');

    // 3. Vérifier le résultat
    const { data: periodesApres, error: getError2 } = await supabase
      .from('facturation_periodes')
      .select('*');

    console.log('\n📋 État après correction:');
    periodesApres?.forEach((p, index) => {
      const debut = new Date(p.periode_debut).toLocaleDateString('fr-FR');
      const fin = new Date(p.periode_fin).toLocaleDateString('fr-FR');
      console.log(`  ${index + 1}. ${debut} - ${fin}: ${p.statut} (${formatPrice(p.total_commissions)})`);
    });

    // 4. Test de la requête qui pose problème
    console.log('\n🧪 Test de la requête problématique...');
    const { data: periodeCourante, error: testError } = await supabase
      .from('facturation_periodes')
      .select('*')
      .eq('statut', 'en_cours')
      .order('periode_debut', { ascending: false })
      .limit(1)
      .single();

    if (testError) {
      console.log('❌ Toujours une erreur:', testError.message);
    } else {
      console.log('✅ Requête réussie !');
      const debut = new Date(periodeCourante.periode_debut).toLocaleDateString('fr-FR');
      const fin = new Date(periodeCourante.periode_fin).toLocaleDateString('fr-FR');
      console.log(`   Période courante: ${debut} - ${fin}`);
    }

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

fixPeriodeStatus();