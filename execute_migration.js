/**
 * Script pour exécuter la migration 006 du système financier
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://nmwnibzgvwltipmtwhzo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeMigration() {
  try {
    console.log('🚀 Début de la migration 006: Système financier');
    
    // Lire le fichier de migration
    const migrationSQL = fs.readFileSync('./migrations/006_financial_commission_system.sql', 'utf8');
    
    // Exécuter la migration
    console.log('📝 Exécution de la migration...');
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: migrationSQL
    });
    
    if (error) {
      console.error('❌ Erreur lors de l\'exécution:', error);
      process.exit(1);
    }
    
    console.log('✅ Migration 006 exécutée avec succès');
    console.log('📊 Tables créées:');
    console.log('  - facturation_periodes');
    console.log('  - commissions_detail');
    console.log('  - paiements_commissions');
    console.log('  - relances_paiement');
    console.log('  - audit_financier');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

executeMigration();