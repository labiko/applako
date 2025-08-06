/**
 * Script pour setup complet du test d'annulation
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nmwnibzgvwltipmtwhzo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupCompleteTest() {
  try {
    console.log('🔧 Setup complet du test d\'annulation...\n');

    // 1. Vérifier l'état actuel
    const { data: periodes, error: periodesError } = await supabase
      .from('facturation_periodes')
      .select('*');

    console.log('📋 État actuel:');
    if (periodes && periodes.length > 0) {
      periodes.forEach((p, index) => {
        const debut = new Date(p.periode_debut).toLocaleDateString('fr-FR');
        const fin = new Date(p.periode_fin).toLocaleDateString('fr-FR');
        console.log(`   ${index + 1}. ${debut} - ${fin}: ${p.statut} (${formatPrice(p.total_commissions)})`);
      });
    } else {
      console.log('   Aucune période trouvée');
    }

    // 2. S'assurer qu'on a une période en cours
    let periodeEnCours = periodes?.find(p => p.statut === 'en_cours');
    
    if (!periodeEnCours) {
      console.log('\n🔄 Création d\'une période en cours...');
      
      const { data: nouvellePeriode, error: createError } = await supabase
        .from('facturation_periodes')
        .insert([{
          periode_debut: '2025-08-01',
          periode_fin: '2025-08-31',
          statut: 'en_cours',
          total_commissions: 0,
          total_facture: 0,
          nombre_entreprises: 0
        }])
        .select()
        .single();

      if (createError) {
        console.log('❌ Erreur création période:', createError.message);
        return;
      }

      periodeEnCours = nouvellePeriode;
      console.log('✅ Période en cours créée');
    }

    // 3. Nettoyer les anciennes commissions
    console.log('\n🧹 Nettoyage des anciennes commissions...');
    await supabase
      .from('commissions_detail')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
      
    console.log('✅ Commissions nettoyées');

    // 4. Créer une clôture de test
    console.log('\n🧪 Création d\'une clôture de test...');
    
    // Récupérer une vraie entreprise
    const { data: entreprises } = await supabase
      .from('entreprises')
      .select('id, nom')
      .limit(1);

    const entrepriseId = entreprises && entreprises.length > 0 ? entreprises[0].id : '7f2e1234-5678-9abc-def0-123456789012';
    const entrepriseNom = entreprises && entreprises.length > 0 ? entreprises[0].nom : 'Taxi Express Conakry';

    // Créer le détail de commission
    const commissionDetail = {
      periode_id: periodeEnCours.id,
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

    // 5. Clôturer la période
    const { error: clotureError } = await supabase
      .from('facturation_periodes')
      .update({
        statut: 'cloturee',
        total_commissions: 36477100,
        nombre_entreprises: 1
      })
      .eq('id', periodeEnCours.id);

    if (clotureError) {
      console.log('❌ Erreur clôture:', clotureError.message);
      return;
    }

    console.log('✅ Période clôturée avec succès');

    // 6. Vérification finale
    const { data: verification } = await supabase
      .from('facturation_periodes')
      .select('*')
      .eq('id', periodeEnCours.id)
      .single();

    const { data: commissionsVerif } = await supabase
      .from('commissions_detail')
      .select('*')
      .eq('periode_id', periodeEnCours.id);

    console.log('\n🎯 SETUP TERMINÉ - PRÊT POUR LES TESTS !');
    console.log(`   📅 Période: ${new Date(verification.periode_debut).toLocaleDateString('fr-FR')} - ${new Date(verification.periode_fin).toLocaleDateString('fr-FR')}`);
    console.log(`   📊 Statut: ${verification.statut}`);
    console.log(`   💰 Commissions: ${formatPrice(verification.total_commissions)}`);
    console.log(`   🏢 Entreprises: ${verification.nombre_entreprises}`);
    console.log(`   📋 Détails: ${commissionsVerif?.length || 0} commission(s)`);

    console.log('\n🧪 COMMENT TESTER:');
    console.log('   1. Va sur http://localhost:4201/super-admin/financial');
    console.log('   2. Tu verras la période avec statut "Clôturée"');
    console.log('   3. Clique sur l\'œil 👁️ pour voir les détails');
    console.log('   4. Clique sur la flèche ↶ pour annuler la clôture');
    console.log('   5. La période repassera en "En Cours"');
    console.log('   6. Clique sur ✓ pour re-clôturer');
    console.log('   7. Répète le cycle autant de fois que tu veux !');

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

setupCompleteTest();