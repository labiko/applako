/**
 * Script pour créer une clôture de test
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nmwnibzgvwltipmtwhzo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestClosure() {
  try {
    console.log('🧪 Création d\'une clôture de test...\n');

    // 1. Récupérer la période courante
    const { data: periode, error: periodeError } = await supabase
      .from('facturation_periodes')
      .select('*')
      .eq('statut', 'en_cours')
      .single();

    if (periodeError || !periode) {
      console.log('❌ Aucune période en cours trouvée');
      return;
    }

    console.log(`📅 Période trouvée: ${new Date(periode.periode_debut).toLocaleDateString('fr-FR')} - ${new Date(periode.periode_fin).toLocaleDateString('fr-FR')}`);

    // 2. Créer un détail de commission test
    const commissionDetail = {
      periode_id: periode.id,
      entreprise_id: '7f2e1234-5678-9abc-def0-123456789012', // ID fictif mais cohérent
      nombre_reservations: 29,
      chiffre_affaire_brut: 331610000,
      taux_commission_moyen: 11,
      montant_commission: 36477100,
      taux_global_utilise: 11,
      jours_taux_global: 30,
      jours_taux_specifique: 0,
      statut: 'calcule',
      metadata: {
        test: true,
        entreprise_nom: 'Taxi Express Conakry',
        calcul_date: new Date().toISOString()
      }
    };

    const { error: insertError } = await supabase
      .from('commissions_detail')
      .insert([commissionDetail]);

    if (insertError) {
      console.log('❌ Erreur insertion commission:', insertError.message);
      return;
    }

    console.log('✅ Détail de commission créé');

    // 3. Mettre à jour la période en "cloturee"
    const { error: updateError } = await supabase
      .from('facturation_periodes')
      .update({
        statut: 'cloturee',
        total_commissions: 36477100,
        nombre_entreprises: 1
      })
      .eq('id', periode.id);

    if (updateError) {
      console.log('❌ Erreur mise à jour période:', updateError.message);
      return;
    }

    console.log('✅ Période clôturée avec succès');

    // 4. Vérifier le résultat
    const { data: periodeFinal } = await supabase
      .from('facturation_periodes')
      .select('*')
      .eq('id', periode.id)
      .single();

    if (periodeFinal) {
      console.log('\n🎯 PÉRIODE DE TEST PRÊTE:');
      console.log(`   Statut: ${periodeFinal.statut}`);
      console.log(`   Commissions: ${formatPrice(periodeFinal.total_commissions)}`);
      console.log(`   Entreprises: ${periodeFinal.nombre_entreprises}`);
      console.log('\n💡 Tu peux maintenant:');
      console.log('   1. Aller sur http://localhost:4201/super-admin/financial');
      console.log('   2. Voir la période clôturée');
      console.log('   3. Cliquer sur l\'œil pour voir les détails');
      console.log('   4. Cliquer sur la flèche de retour ↶ pour annuler la clôture');
      console.log('   5. Refaire une clôture avec le bouton ✓');
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

createTestClosure();