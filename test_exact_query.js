/**
 * Test de la requête exacte qui pose problème
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nmwnibzgvwltipmtwhzo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testExactQuery() {
  try {
    console.log('🧪 Test de la requête exacte qui échoue...\n');

    // Cette requête échoue dans le navigateur
    console.log('1️⃣ Test: select=*&statut=eq.en_cours&order=periode_debut.desc&limit=1');
    const { data: test1, error: error1 } = await supabase
      .from('facturation_periodes')
      .select('*')
      .eq('statut', 'en_cours')
      .order('periode_debut', { ascending: false })
      .limit(1);

    if (error1) {
      console.log('❌ Erreur:', error1.message);
      console.log('   Code:', error1.code);
      console.log('   Details:', error1.details);
    } else {
      console.log('✅ Succès:', test1);
    }

    // Test plus simple
    console.log('\n2️⃣ Test simple: select=*');
    const { data: test2, error: error2 } = await supabase
      .from('facturation_periodes')
      .select('*');

    if (error2) {
      console.log('❌ Erreur:', error2.message);
    } else {
      console.log('✅ Succès - Nombre de périodes:', test2?.length || 0);
      if (test2 && test2.length > 0) {
        console.log('   Structure de la première période:');
        Object.keys(test2[0]).forEach(key => {
          console.log(`     ${key}: ${typeof test2[0][key]} = ${test2[0][key]}`);
        });
      }
    }

    // Test avec .single()
    console.log('\n3️⃣ Test avec .single():');
    const { data: test3, error: error3 } = await supabase
      .from('facturation_periodes')
      .select('*')
      .eq('statut', 'en_cours')
      .order('periode_debut', { ascending: false })
      .limit(1)
      .single();

    if (error3) {
      console.log('❌ Erreur single:', error3.message);
      console.log('   Code:', error3.code);
    } else {
      console.log('✅ Succès single:', test3);
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

testExactQuery();