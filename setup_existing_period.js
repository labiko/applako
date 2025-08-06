/**
 * Script pour utiliser la période existante et créer le test
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nmwnibzgvwltipmtwhzo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupExistingPeriod() {
  try {
    console.log('🔧 Setup avec la période existante...\n');

    // 1. Récupérer la période existante
    const { data: periodes, error: periodesError } = await supabase
      .from('facturation_periodes')
      .select('*');

    if (!periodes || periodes.length === 0) {
      console.log('❌ Aucune période trouvée');
      return;
    }

    const periode = periodes[0];
    console.log(`📅 Période existante: ${new Date(periode.periode_debut).toLocaleDateString('fr-FR')} - ${new Date(periode.periode_fin).toLocaleDateString('fr-FR')}`);
    console.log(`   Statut actuel: ${periode.statut}`);

    // 2. Nettoyer les commissions existantes
    console.log('\n🧹 Nettoyage des commissions...');
    await supabase
      .from('commissions_detail')
      .delete()
      .eq('periode_id', periode.id);
    console.log('✅ Commissions nettoyées');

    // 3. Récupérer une vraie entreprise
    const { data: entreprises } = await supabase
      .from('entreprises')
      .select('id, nom')
      .limit(1);

    const entrepriseId = entreprises && entreprises.length > 0 ? entreprises[0].id : null;
    const entrepriseNom = entreprises && entreprises.length > 0 ? entreprises[0].nom : 'Entreprise Test';

    if (!entrepriseId) {
      console.log('❌ Aucune entreprise trouvée dans la base');
      return;
    }

    console.log(`🏢 Entreprise trouvée: ${entrepriseNom}`);

    // 4. Créer une commission de test
    console.log('\n💰 Création de la commission...');
    const commissionDetail = {
      periode_id: periode.id,
      entreprise_id: entrepriseId,
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
        entreprise_nom: entrepriseNom,
        calcul_date: new Date().toISOString(),
        reservations_ids: []
      }
    };

    const { error: insertError } = await supabase
      .from('commissions_detail')
      .insert([commissionDetail]);

    if (insertError) {
      console.log('❌ Erreur insertion commission:', insertError.message);
      return;
    }

    console.log('✅ Commission créée');

    // 5. Mettre la période en statut "cloturee"
    console.log('\n🔒 Clôture de la période...');
    const { error: clotureError } = await supabase
      .from('facturation_periodes')
      .update({
        statut: 'cloturee',
        total_commissions: 36477100,
        nombre_entreprises: 1
      })
      .eq('id', periode.id);

    if (clotureError) {
      console.log('❌ Erreur clôture:', clotureError.message);
      return;
    }

    console.log('✅ Période clôturée');

    // 6. Vérification finale
    const { data: verification } = await supabase
      .from('facturation_periodes')
      .select('*')
      .eq('id', periode.id)
      .single();

    const { data: commissionsVerif } = await supabase
      .from('commissions_detail')
      .select(`
        *,
        entreprises!inner(nom)
      `)
      .eq('periode_id', periode.id);

    console.log('\n🎯 SETUP TERMINÉ - PÉRIODE PRÊTE POUR LES TESTS !');
    console.log(`   📅 Période: ${new Date(verification.periode_debut).toLocaleDateString('fr-FR')} - ${new Date(verification.periode_fin).toLocaleDateString('fr-FR')}`);
    console.log(`   📊 Statut: ${verification.statut}`);
    console.log(`   💰 Total commissions: ${formatPrice(verification.total_commissions)}`);
    console.log(`   🏢 Entreprises: ${verification.nombre_entreprises}`);

    if (commissionsVerif && commissionsVerif.length > 0) {
      console.log('\n💼 Détails commission:');
      commissionsVerif.forEach((c, index) => {
        console.log(`   ${index + 1}. ${c.entreprises?.nom || 'Entreprise'}: ${formatPrice(c.montant_commission)} (${c.taux_commission_moyen}%)`);
      });
    }

    console.log('\n🧪 COMMENT TESTER MAINTENANT:');
    console.log('   1. Actualise http://localhost:4201/super-admin/financial');
    console.log('   2. Tu verras la période avec badge "Clôturée" 🟡');
    console.log('   3. Clique sur l\'œil 👁️ pour voir les détails dans le modal');
    console.log('   4. Clique sur la flèche ↶ (bouton orange) pour annuler la clôture');
    console.log('   5. La période repassera en "En Cours" 🔵');
    console.log('   6. Clique sur ✓ (bouton vert) pour re-clôturer');
    console.log('   7. Tu peux répéter le cycle autant de fois que tu veux !');
    console.log('\n🎮 CYCLE DE TEST INFINI DISPONIBLE !');

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

setupExistingPeriod();