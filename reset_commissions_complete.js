/**
 * Script pour vider complètement toutes les commissions et remettre à zéro
 * Permet de refaire des tests propres depuis le début
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nmwnibzgvwltipmtwhzo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetCommissionsComplete() {
  try {
    console.log('🧹 REMISE À ZÉRO COMPLÈTE DES COMMISSIONS\n');

    // 1. Compter les données actuelles
    console.log('📊 État actuel:');
    
    const { data: periodesActuelles } = await supabase
      .from('facturation_periodes')
      .select('*');
    console.log(`   - Périodes: ${periodesActuelles?.length || 0}`);

    const { data: commissionsActuelles } = await supabase
      .from('commissions_detail')
      .select('*');
    console.log(`   - Détails commissions: ${commissionsActuelles?.length || 0}`);

    const { data: paiementsActuels } = await supabase
      .from('paiements_commissions')
      .select('*');
    if (paiementsActuels !== null) {
      console.log(`   - Paiements: ${paiementsActuels?.length || 0}`);
    }

    const { data: relancesActuelles } = await supabase
      .from('relances_paiement')
      .select('*');
    if (relancesActuelles !== null) {
      console.log(`   - Relances: ${relancesActuelles?.length || 0}`);
    }

    // 2. Supprimer tous les paiements (si la table existe)
    console.log('\n🗑️ Suppression des paiements...');
    const { error: deletePaiementsError } = await supabase
      .from('paiements_commissions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deletePaiementsError && deletePaiementsError.code !== '42P01') { // Ignorer si table n'existe pas
      console.log('❌ Erreur suppression paiements:', deletePaiementsError.message);
    } else {
      console.log('✅ Paiements supprimés (ou table inexistante)');
    }

    // 3. Supprimer toutes les relances (si la table existe)
    console.log('\n🗑️ Suppression des relances...');
    const { error: deleteRelancesError } = await supabase
      .from('relances_paiement')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteRelancesError && deleteRelancesError.code !== '42P01') { // Ignorer si table n'existe pas
      console.log('❌ Erreur suppression relances:', deleteRelancesError.message);
    } else {
      console.log('✅ Relances supprimées (ou table inexistante)');
    }

    // 4. Supprimer tous les détails de commissions
    console.log('\n🗑️ Suppression des détails de commissions...');
    const { error: deleteCommissionsError } = await supabase
      .from('commissions_detail')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteCommissionsError) {
      console.log('❌ Erreur suppression commissions:', deleteCommissionsError.message);
    } else {
      console.log('✅ Détails de commissions supprimés');
    }

    // 5. Remettre toutes les périodes à zéro
    console.log('\n🔄 Remise à zéro des périodes...');
    const { error: updatePeriodesError } = await supabase
      .from('facturation_periodes')
      .update({
        statut: 'en_cours',
        total_commissions: 0,
        total_facture: 0,
        nombre_entreprises: 0
      })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (updatePeriodesError) {
      console.log('❌ Erreur mise à jour périodes:', updatePeriodesError.message);
    } else {
      console.log('✅ Toutes les périodes remises à "en_cours" avec montants à 0');
    }

    // 6. Vérifier l'état final
    console.log('\n✅ ÉTAT FINAL:');
    
    const { data: periodesFinales } = await supabase
      .from('facturation_periodes')
      .select('*')
      .order('periode_debut', { ascending: false });

    console.log(`📋 Périodes (${periodesFinales?.length || 0}):`);
    periodesFinales?.forEach((p, index) => {
      const debut = new Date(p.periode_debut).toLocaleDateString('fr-FR');
      const fin = new Date(p.periode_fin).toLocaleDateString('fr-FR');
      console.log(`   ${index + 1}. ${debut} - ${fin}: ${p.statut} (${formatPrice(p.total_commissions)})`);
    });

    const { data: commissionsFinales } = await supabase
      .from('commissions_detail')
      .select('*');
    console.log(`💰 Détails commissions: ${commissionsFinales?.length || 0}`);

    console.log('\n🎯 PRÊT POUR LES TESTS !');
    console.log('   1. Va sur http://localhost:4201/super-admin/financial');
    console.log('   2. Clique sur "Clôturer Période"');
    console.log('   3. Après clôture, clique sur la période pour voir les détails');
    console.log('   4. Le modal affichera les commissions calculées par entreprise');

    // 7. Petit aperçu des données qui seront traitées
    console.log('\n📊 DONNÉES À TRAITER:');
    const { data: reservationsATraiter } = await supabase
      .from('reservations')
      .select(`
        id, prix_total, created_at,
        conducteurs!inner(
          entreprise_id,
          entreprises!inner(nom)
        )
      `)
      .eq('statut', 'completed');

    if (reservationsATraiter && reservationsATraiter.length > 0) {
      const totalCA = reservationsATraiter.reduce((sum, r) => sum + (r.prix_total || 0), 0);
      const commissionsEstimees = totalCA * 0.11; // Taux 11%
      
      console.log(`   - ${reservationsATraiter.length} réservations complétées`);
      console.log(`   - CA Total: ${formatPrice(totalCA)}`);
      console.log(`   - Commissions estimées (11%): ${formatPrice(commissionsEstimees)}`);
      
      // Grouper par entreprise
      const parEntreprise = {};
      reservationsATraiter.forEach(r => {
        const nom = r.conducteurs?.entreprises?.nom || 'Inconnue';
        if (!parEntreprise[nom]) {
          parEntreprise[nom] = [];
        }
        parEntreprise[nom].push(r);
      });
      
      console.log(`   - Répartition par entreprise:`);
      Object.entries(parEntreprise).forEach(([nom, reservations]) => {
        const ca = reservations.reduce((sum, r) => sum + (r.prix_total || 0), 0);
        const commission = ca * 0.11;
        console.log(`     * ${nom}: ${reservations.length} courses, CA ${formatPrice(ca)}, Commission ${formatPrice(commission)}`);
      });
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

resetCommissionsComplete();