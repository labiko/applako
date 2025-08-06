/**
 * Script pour vérifier la structure de la base de données
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nmwnibzgvwltipmtwhzo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifierStructure() {
  try {
    console.log('🔍 Vérification structure base de données...\n');

    // 1. Récupérer quelques réservations pour voir la structure
    const { data: sampleReservations, error: sampleError } = await supabase
      .from('reservations')
      .select('*')
      .limit(3);

    if (sampleError) {
      console.log('❌ Erreur lecture réservations:', sampleError.message);
      return;
    }

    if (sampleReservations && sampleReservations.length > 0) {
      console.log('📋 Structure table reservations:');
      const colonnes = Object.keys(sampleReservations[0]);
      colonnes.forEach(col => {
        const valeur = sampleReservations[0][col];
        const type = typeof valeur;
        console.log(`  - ${col}: ${type} (ex: ${valeur})`);
      });
    }

    // 2. Vérifier table entreprises
    const { data: entreprises, error: entreprisesError } = await supabase
      .from('entreprises')
      .select('*')
      .limit(1);

    if (entreprisesError) {
      console.log('\n❌ Table entreprises:', entreprisesError.message);
    } else {
      console.log('\n✅ Table entreprises accessible');
      if (entreprises && entreprises.length > 0) {
        console.log('📋 Colonnes entreprises:', Object.keys(entreprises[0]).join(', '));
      }
    }

    // 3. Vérifier tables financières
    const tablesFinancieres = [
      'facturation_periodes',
      'commissions_detail', 
      'paiements_commissions',
      'relances_paiement',
      'audit_financier'
    ];

    console.log('\n💰 Tables financières:');
    for (const table of tablesFinancieres) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`  ❌ ${table}: ${error.message}`);
        } else {
          console.log(`  ✅ ${table}: ${count} enregistrements`);
        }
      } catch (e) {
        console.log(`  ❌ ${table}: ${e.message}`);
      }
    }

    // 4. Analyser les réservations pour le calcul financier
    if (sampleReservations && sampleReservations.length > 0) {
      console.log('\n📊 Analyse des réservations:');
      
      // Compter par statut (en utilisant le bon nom de colonne)
      const colonnesStatut = ['status', 'statut', 'state', 'etat'];
      let colonneStatutTrouvee = null;
      
      for (const col of colonnesStatut) {
        if (sampleReservations[0].hasOwnProperty(col)) {
          colonneStatutTrouvee = col;
          break;
        }
      }
      
      if (colonneStatutTrouvee) {
        console.log(`  📋 Colonne statut: ${colonneStatutTrouvee}`);
        
        const { data: allReservations, error } = await supabase
          .from('reservations')
          .select(colonneStatutTrouvee);
          
        if (!error && allReservations) {
          const statsStatut = {};
          allReservations.forEach(r => {
            const statut = r[colonneStatutTrouvee] || 'null';
            statsStatut[statut] = (statsStatut[statut] || 0) + 1;
          });
          
          console.log('  📈 Répartition:');
          Object.entries(statsStatut).forEach(([statut, count]) => {
            console.log(`    - ${statut}: ${count}`);
          });
        }
      } else {
        console.log('  ⚠️  Aucune colonne de statut trouvée');
      }
      
      // Vérifier colonnes prix
      const colonnesPrix = ['price', 'prix', 'montant', 'amount'];
      let colonnePrixTrouvee = null;
      
      for (const col of colonnesPrix) {
        if (sampleReservations[0].hasOwnProperty(col)) {
          colonnePrixTrouvee = col;
          break;
        }
      }
      
      if (colonnePrixTrouvee) {
        console.log(`  💰 Colonne prix: ${colonnePrixTrouvee}`);
      } else {
        console.log('  ⚠️  Aucune colonne de prix trouvée');
      }
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

verifierStructure();