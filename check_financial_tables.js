/**
 * Script pour vérifier l'existence des tables financières
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nmwnibzgvwltipmtwhzo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFinancialTables() {
  try {
    console.log('🔍 Vérification des tables financières...\n');

    // 1. Tester facturation_periodes
    console.log('1️⃣ Test table facturation_periodes...');
    const { data: periodes, error: periodesError } = await supabase
      .from('facturation_periodes')
      .select('*')
      .limit(1);

    if (periodesError) {
      console.log('❌ Table facturation_periodes introuvable:', periodesError.message);
      console.log('   Code:', periodesError.code);
    } else {
      console.log('✅ Table facturation_periodes OK');
      console.log('   Nombre de records:', periodes?.length || 0);
    }

    // 2. Tester commissions_detail
    console.log('\n2️⃣ Test table commissions_detail...');
    const { data: commissions, error: commissionsError } = await supabase
      .from('commissions_detail')
      .select('*')
      .limit(1);

    if (commissionsError) {
      console.log('❌ Table commissions_detail introuvable:', commissionsError.message);
      console.log('   Code:', commissionsError.code);
    } else {
      console.log('✅ Table commissions_detail OK');
      console.log('   Nombre de records:', commissions?.length || 0);
    }

    // 3. Tester commission_config
    console.log('\n3️⃣ Test table commission_config...');
    const { data: config, error: configError } = await supabase
      .from('commission_config')
      .select('*')
      .limit(1);

    if (configError) {
      console.log('❌ Table commission_config introuvable:', configError.message);
      console.log('   Code:', configError.code);
    } else {
      console.log('✅ Table commission_config OK');
      console.log('   Nombre de records:', config?.length || 0);
    }

    // 4. Vérifier les tables de base
    console.log('\n4️⃣ Vérification tables de base...');
    
    const { data: reservations, error: resError } = await supabase
      .from('reservations')
      .select('id, statut, prix_total')
      .eq('statut', 'completed')
      .limit(1);

    if (resError) {
      console.log('❌ Problème avec reservations:', resError.message);
    } else {
      console.log(`✅ Reservations OK (${reservations?.length || 0} completed trouvée)`);
    }

    const { data: entreprises, error: entError } = await supabase
      .from('entreprises')
      .select('id, nom')
      .limit(1);

    if (entError) {
      console.log('❌ Problème avec entreprises:', entError.message);
    } else {
      console.log(`✅ Entreprises OK (${entreprises?.length || 0} trouvée)`);
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

checkFinancialTables();