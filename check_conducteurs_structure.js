/**
 * Script pour vérifier la structure de la table conducteurs
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nmwnibzgvwltipmtwhzo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConducteursStructure() {
  try {
    console.log('🔍 Vérification structure table conducteurs...\n');

    // 1. Récupérer un conducteur exemple pour voir la structure
    const { data: conducteur } = await supabase
      .from('conducteurs')
      .select('*')
      .limit(1)
      .single();

    if (conducteur) {
      console.log('📋 COLONNES DISPONIBLES DANS conducteurs:');
      Object.keys(conducteur).forEach(col => {
        const value = conducteur[col];
        console.log(`   - ${col}: ${typeof value} (ex: ${value})`);
      });
    } else {
      console.log('❌ Aucun conducteur trouvé');
    }

    // 2. Créer un conducteur simple avec seulement les colonnes de base
    const entrepriseId = 'eae583ec-a751-47a7-8447-973c1850d593';
    
    console.log('\n🚗 Tentative ajout conducteur simple...');
    const { data: newConducteur, error } = await supabase
      .from('conducteurs')
      .insert([{
        entreprise_id: entrepriseId,
        nom: 'Test Conducteur',
        telephone: '+224620999999'
      }])
      .select()
      .single();

    if (error) {
      console.log('❌ Erreur:', error.message);
      console.log('💡 Colonnes requises probablement manquantes');
    } else {
      console.log('✅ Conducteur créé:', newConducteur);
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

checkConducteursStructure();