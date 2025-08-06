/**
 * Script pour vérifier les entreprises et leurs conducteurs
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nmwnibzgvwltipmtwhzo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEntreprises() {
  try {
    console.log('🔍 Vérification des entreprises et conducteurs...\n');

    // 1. Lister toutes les entreprises
    const { data: entreprises } = await supabase
      .from('entreprises')
      .select('id, nom, telephone, email')
      .order('nom');

    if (!entreprises || entreprises.length === 0) {
      console.log('❌ Aucune entreprise trouvée');
      return;
    }

    console.log('🏢 ENTREPRISES DISPONIBLES:');
    for (const entreprise of entreprises) {
      console.log(`   - ${entreprise.nom}`);
      console.log(`     ID: ${entreprise.id}`);
      console.log(`     Contact: ${entreprise.telephone || 'N/A'}`);

      // Compter les conducteurs de cette entreprise
      const { data: conducteurs } = await supabase
        .from('conducteurs')
        .select('id, nom, telephone')
        .eq('entreprise_id', entreprise.id);

      console.log(`     Conducteurs: ${conducteurs?.length || 0}`);
      
      if (conducteurs && conducteurs.length > 0) {
        conducteurs.slice(0, 2).forEach(c => {
          console.log(`       • ${c.nom} (${c.id.slice(0, 8)}...)`);
        });
        if (conducteurs.length > 2) {
          console.log(`       ... et ${conducteurs.length - 2} autres`);
        }
      }
      console.log('');
    }

    // 2. Vérifier l'entreprise spécifiée
    const targetId = 'eae583ec-a751-47a7-8447-973c1850d593';
    const targetEntreprise = entreprises.find(e => e.id === targetId);
    
    if (targetEntreprise) {
      console.log('🎯 ENTREPRISE CIBLÉE TROUVÉE:');
      console.log(`   Nom: ${targetEntreprise.nom}`);
      console.log(`   ID: ${targetEntreprise.id}`);
    } else {
      console.log('⚠️  ENTREPRISE CIBLÉE NON TROUVÉE');
      console.log(`   ID recherché: ${targetId}`);
      console.log('   Utiliser un ID d\\'entreprise valide ci-dessus');
    }

    // 3. Vérifier s'il y a des champs date de clôture
    console.log('\n🔍 VÉRIFICATION STRUCTURE TABLE facturation_periodes:');
    const { data: samplePeriode } = await supabase
      .from('facturation_periodes')
      .select('*')
      .limit(1)
      .single();

    if (samplePeriode) {
      console.log('📋 COLONNES DISPONIBLES:');
      Object.keys(samplePeriode).forEach(col => {
        const value = samplePeriode[col];
        const isDate = col.includes('date') || col.includes('created') || col.includes('updated');
        if (isDate) {
          console.log(`   ✅ ${col}: ${typeof value} (${value ? new Date(value).toLocaleString('fr-FR') : 'null'})`);
        } else {
          console.log(`   - ${col}: ${typeof value} (${value})`);
        }
      });

      // Chercher spécifiquement des champs de date de clôture
      const dateFields = Object.keys(samplePeriode).filter(col => 
        col.includes('date') && 
        (col.includes('cloture') || col.includes('close') || col.includes('end'))
      );
      
      if (dateFields.length > 0) {
        console.log('\n📅 CHAMPS DATE DE CLÔTURE TROUVÉS:');
        dateFields.forEach(field => {
          console.log(`   • ${field}: ${samplePeriode[field]}`);
        });
      } else {
        console.log('\n⚠️  Aucun champ spécifique "date de clôture" trouvé');
        console.log('   Mais "updated_at" peut indiquer quand la période a été clôturée');
      }
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

checkEntreprises();