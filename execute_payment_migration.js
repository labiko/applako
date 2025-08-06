/**
 * Script pour ajouter les champs de paiement
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nmwnibzgvwltipmtwhzo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U';

async function addPaymentFields() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('🔄 Vérification structure table commissions_detail...\n');
    
    // Test avec insertion d'un enregistrement factice pour voir les colonnes
    const { data: existingData, error: checkError } = await supabase
      .from('commissions_detail')
      .select('*')
      .limit(1);
      
    if (existingData && existingData.length > 0) {
      const columns = Object.keys(existingData[0]);
      console.log('✓ Colonnes actuelles:', columns);
      
      const hasDateVersement = columns.includes('date_versement_commission');
      const hasStatutPaiement = columns.includes('statut_paiement');
      
      console.log(`✓ date_versement_commission: ${hasDateVersement ? '✅' : '❌'}`);
      console.log(`✓ statut_paiement: ${hasStatutPaiement ? '✅' : '❌'}`);
      
      if (hasDateVersement && hasStatutPaiement) {
        console.log('\n🎉 COLONNES DÉJÀ PRÉSENTES !');
        
        // Mettre à jour les statuts existants
        console.log('➤ Mise à jour des statuts existants...');
        const { error: updateError } = await supabase
          .from('commissions_detail')
          .update({ statut_paiement: 'non_paye' })
          .is('statut_paiement', null);
          
        if (!updateError) {
          console.log('✅ Statuts mis à jour');
        }
        
      } else {
        console.log('\n⚠️  COLONNES MANQUANTES');
        console.log('   → Utilisation de la console Supabase recommandée');
        console.log('   → Ou création manuelle via interface admin');
      }
    } else {
      console.log('ℹ️  Aucune commission trouvée pour vérification');
    }

    console.log('\n✅ VÉRIFICATION TERMINÉE');
    console.log('\n📋 SI COLONNES MANQUANTES, EXÉCUTER DANS SUPABASE SQL EDITOR:');
    console.log(`
ALTER TABLE commissions_detail 
ADD COLUMN IF NOT EXISTS date_versement_commission TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS statut_paiement VARCHAR(20) DEFAULT 'non_paye';

UPDATE commissions_detail 
SET statut_paiement = 'non_paye' 
WHERE statut_paiement IS NULL;
    `);

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

addPaymentFields();