/**
 * Script pour créer les tables du système financier
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nmwnibzgvwltipmtwhzo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createFinancialTables() {
  try {
    console.log('🚀 Création des tables du système financier');
    
    // 1. Table facturation_periodes
    console.log('📝 Création de la table facturation_periodes...');
    const { error: error1 } = await supabase.rpc('create_table_facturation_periodes');
    if (error1 && !error1.message.includes('already exists')) {
      console.log('⚠️  Table facturation_periodes déjà existe, on continue...');
    }
    
    // 2. Vérifier que les tables de base existent
    console.log('🔍 Vérification des tables existantes...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['entreprises', 'reservations', 'commission_config']);
    
    if (tablesError) {
      console.log('Information schema non accessible, on continue...');
    } else {
      console.log('📊 Tables trouvées:', tables?.map(t => t.table_name));
    }
    
    // 3. Test de création d'une période simple
    console.log('🧪 Test d\'insertion d\'une période...');
    const { data: periodeTest, error: periodeError } = await supabase
      .from('facturation_periodes')
      .upsert({
        periode_debut: '2025-01-01',
        periode_fin: '2025-01-31',
        statut: 'en_cours'
      })
      .select();
    
    if (periodeError) {
      console.log('❌ Erreur test période:', periodeError);
      
      // Tenter de créer la table manuellement
      console.log('🔧 Tentative de création manuelle...');
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS facturation_periodes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          periode_debut DATE NOT NULL,
          periode_fin DATE NOT NULL,
          statut VARCHAR(20) NOT NULL DEFAULT 'en_cours',
          total_commissions DECIMAL(15,2) DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;
      
      // On ne peut pas exécuter du SQL arbitraire avec le client standard
      console.log('⚠️  Impossible de créer la table via le client Supabase');
      console.log('📋 Veuillez exécuter ce SQL dans l\'interface Supabase:');
      console.log(createTableSQL);
      
    } else {
      console.log('✅ Test période réussi:', periodeTest);
    }
    
    console.log('🎉 Script terminé - vérifiez l\'interface Supabase pour les détails');
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

createFinancialTables();