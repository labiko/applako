/**
 * Script pour analyser le potentiel financier avec la vraie structure
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nmwnibzgvwltipmtwhzo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyserPotentielFinancier() {
  try {
    console.log('💰 ANALYSE DU POTENTIEL FINANCIER');
    console.log('================================\n');

    // 1. Réservations complétées
    const { data: reservationsCompletes, error: completesError } = await supabase
      .from('reservations')
      .select('*')
      .eq('statut', 'completed')
      .not('prix_total', 'is', null);

    if (completesError) {
      console.log('❌ Erreur:', completesError.message);
      return;
    }

    console.log(`🎯 Réservations complètes: ${reservationsCompletes.length}`);

    if (reservationsCompletes.length === 0) {
      console.log('⚠️  Aucune réservation complète trouvée');
      return;
    }

    // 2. Calcul CA total
    const caTotal = reservationsCompletes.reduce((sum, r) => sum + (r.prix_total || 0), 0);
    console.log(`💳 CA TOTAL: ${formatPrice(caTotal)}`);

    // 3. Calcul des commissions potentielles
    const tauxCommissionDefaut = 15; // %
    const commissionsTheoriques = caTotal * (tauxCommissionDefaut / 100);
    console.log(`🏦 Commissions théoriques (15%): ${formatPrice(commissionsTheoriques)}`);

    // 4. Répartition par conducteur/entreprise
    const caParConducteur = {};
    reservationsCompletes.forEach(r => {
      if (r.conducteur_id) {
        caParConducteur[r.conducteur_id] = (caParConducteur[r.conducteur_id] || 0) + (r.prix_total || 0);
      }
    });

    console.log(`\n👨‍💼 Répartition par conducteur (${Object.keys(caParConducteur).length} conducteurs):`);
    const sortedConducteurs = Object.entries(caParConducteur)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10); // Top 10

    sortedConducteurs.forEach(([conducteurId, ca], index) => {
      const commission = ca * 0.15;
      console.log(`  ${index + 1}. ${conducteurId.substring(0, 8)}... - CA: ${formatPrice(ca)} - Commission: ${formatPrice(commission)}`);
    });

    // 5. Analyse temporelle
    console.log('\n📅 Analyse temporelle:');
    const reservationsParMois = {};
    reservationsCompletes.forEach(r => {
      const mois = r.created_at.substring(0, 7); // YYYY-MM
      if (!reservationsParMois[mois]) {
        reservationsParMois[mois] = { count: 0, ca: 0 };
      }
      reservationsParMois[mois].count++;
      reservationsParMois[mois].ca += r.prix_total || 0;
    });

    Object.entries(reservationsParMois)
      .sort()
      .forEach(([mois, data]) => {
        const commission = data.ca * 0.15;
        console.log(`  ${mois}: ${data.count} courses - CA: ${formatPrice(data.ca)} - Commission: ${formatPrice(commission)}`);
      });

    // 6. Test de clôture de période
    console.log('\n🔧 RECOMMANDATIONS POUR TESTER:');
    console.log('1. Ces 29 réservations complètes génèrent du CA réel');
    console.log('2. Clôturez la période actuelle dans le super-admin');
    console.log('3. Le système calculera automatiquement les commissions');
    console.log('4. Vous verrez les KPI se mettre à jour en temps réel');

    // 7. Vérifier commission_config
    const { data: commissionConfig, error: configError } = await supabase
      .from('commission_config')
      .select('*');

    if (configError) {
      console.log('\n⚠️  Table commission_config non accessible');
    } else {
      console.log(`\n⚙️  Configuration commission: ${commissionConfig.length} entrées`);
      if (commissionConfig.length > 0) {
        commissionConfig.forEach(config => {
          const type = config.entreprise_id ? 'Spécifique' : 'Global';
          console.log(`  - ${type}: ${config.taux_commission}% (${config.actif ? 'Actif' : 'Inactif'})`);
        });
      }
    }

    // 8. Test immédiat possible
    console.log('\n🚀 ÉTAPES DE TEST IMMÉDIATES:');
    console.log('1. Allez sur http://localhost:8100/super-admin/financial');
    console.log('2. Cliquez "Clôturer Période" sur la période en cours');
    console.log('3. Confirmez la clôture');
    console.log(`4. Vous devriez voir apparaître ${formatPrice(commissionsTheoriques)} de commissions`);
    console.log('5. Les KPI passeront de 0 GNF aux vraies valeurs');

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
  }).format(amount);
}

analyserPotentielFinancier();