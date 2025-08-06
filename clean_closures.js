/**
 * Script pour nettoyer toutes les clôtures de périodes
 * Permet de refaire des tests propres
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nmwnibzgvwltipmtwhzo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanClosures() {
  try {
    console.log('🧹 Nettoyage des clôtures de périodes...\n');

    // 1. Supprimer tous les détails de commissions
    console.log('1️⃣ Suppression des détails de commissions...');
    const { error: deleteCommissionsError } = await supabase
      .from('commissions_detail')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Supprimer tout

    if (deleteCommissionsError) {
      console.log('❌ Erreur suppression commissions:', deleteCommissionsError.message);
    } else {
      console.log('✅ Détails de commissions supprimés');
    }

    // 2. Remettre toutes les périodes en statut 'en_cours'
    console.log('\n2️⃣ Remise à zéro des périodes...');
    const { data: periodes, error: getPeriodesError } = await supabase
      .from('facturation_periodes')
      .select('*');

    if (getPeriodesError) {
      console.log('❌ Erreur récupération périodes:', getPeriodesError.message);
      return;
    }

    console.log(`📋 ${periodes?.length || 0} période(s) trouvée(s)`);

    if (periodes && periodes.length > 0) {
      // Remettre toutes les périodes à zéro
      const { error: updateError } = await supabase
        .from('facturation_periodes')
        .update({
          statut: 'en_cours',
          total_commissions: 0,
          total_facture: 0,
          nombre_entreprises: 0
        })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (updateError) {
        console.log('❌ Erreur mise à jour périodes:', updateError.message);
      } else {
        console.log('✅ Toutes les périodes remises en statut "en_cours"');
      }
    }

    // 3. Vérifier l'état final
    console.log('\n3️⃣ Vérification de l\'état final...');
    const { data: periodesFinales } = await supabase
      .from('facturation_periodes')
      .select('*')
      .order('periode_debut', { ascending: false });

    if (periodesFinales && periodesFinales.length > 0) {
      console.log('📊 État des périodes après nettoyage:');
      periodesFinales.forEach((p, index) => {
        const debut = new Date(p.periode_debut).toLocaleDateString('fr-FR');
        const fin = new Date(p.periode_fin).toLocaleDateString('fr-FR');
        console.log(`  ${index + 1}. ${debut} - ${fin}: ${p.statut} (${formatPrice(p.total_commissions)})`);
      });
    }

    console.log('\n✅ Nettoyage terminé ! Vous pouvez maintenant refaire vos tests de clôture.');

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

cleanClosures();