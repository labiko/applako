/**
 * Script pour vérifier la vraie structure de la table reservations
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nmwnibzgvwltipmtwhzo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkReservationsStructure() {
  try {
    console.log('🔍 Vérification structure table reservations...\n');

    // 1. Récupérer quelques réservations pour voir la structure
    const { data: reservations, error } = await supabase
      .from('reservations')
      .select('*')
      .limit(2);

    if (error) {
      console.log('❌ Erreur:', error.message);
      return;
    }

    if (reservations && reservations.length > 0) {
      console.log('📋 COLONNES DISPONIBLES:');
      Object.keys(reservations[0]).forEach(col => {
        const value = reservations[0][col];
        console.log(`   - ${col}: ${typeof value} (ex: ${value})`);
      });

      console.log('\n📊 EXEMPLE RÉSERVATION:');
      const res = reservations[0];
      console.log(`   ID: ${res.id}`);
      console.log(`   Conducteur ID: ${res.conducteur_id}`);
      console.log(`   Statut: ${res.statut}`);
      console.log(`   Prix: ${res.prix_total}`);
      console.log(`   Créé: ${res.created_at}`);
    }

    // 2. Test avec jointure conducteurs
    console.log('\n🔗 TEST JOINTURE CONDUCTEURS:');
    const { data: withConducteurs, error: joinError } = await supabase
      .from('reservations')
      .select(`
        id,
        statut,
        prix_total,
        created_at,
        conducteurs!inner(
          nom,
          telephone,
          entreprise_id,
          entreprises!inner(id, nom)
        )
      `)
      .eq('statut', 'completed')
      .limit(2);

    if (joinError) {
      console.log('❌ Erreur jointure:', joinError.message);
    } else if (withConducteurs && withConducteurs.length > 0) {
      console.log('✅ Jointure réussie !');
      console.log('\n📋 STRUCTURE AVEC JOINTURE:');
      const res = withConducteurs[0];
      console.log(`   ID: ${res.id}`);
      console.log(`   Statut: ${res.statut}`);
      console.log(`   Prix: ${formatPrice(res.prix_total)}`);
      
      console.log('\n👤 CONDUCTEUR:');
      const conducteur = Array.isArray(res.conducteurs) ? res.conducteurs[0] : res.conducteurs;
      console.log(`   Type: ${Array.isArray(res.conducteurs) ? 'Array' : 'Object'}`);
      console.log(`   Nom: ${conducteur?.nom}`);
      console.log(`   Téléphone: ${conducteur?.telephone}`);
      
      console.log('\n🏢 ENTREPRISE:');
      const entreprise = Array.isArray(conducteur?.entreprises) 
        ? conducteur.entreprises[0] 
        : conducteur?.entreprises;
      console.log(`   Type: ${Array.isArray(conducteur?.entreprises) ? 'Array' : 'Object'}`);
      console.log(`   ID: ${entreprise?.id}`);
      console.log(`   Nom: ${entreprise?.nom}`);
    }

    // 3. Proposer les bonnes colonnes
    console.log('\n💡 COLONNES À UTILISER DANS LE SERVICE:');
    console.log(`
    const { data, error } = await this.supabase.client
      .from('reservations')
      .select(\`
        id,
        conducteur_id,
        statut,
        prix_total,
        created_at,
        // Ajouter d'autres colonnes selon ce qui existe:
        // nom_client?, telephone_client?, lieu_depart?, lieu_arrivee?, date_course?, heure_course?
        conducteurs!inner(
          nom,
          telephone,
          entreprise_id,
          entreprises!inner(id, nom)
        )
      \`)
      .gte('created_at', periodeDebut)
      .lte('created_at', periodeFin)
      .in('statut', ['completed', 'accepted']);
    `);

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

checkReservationsStructure();