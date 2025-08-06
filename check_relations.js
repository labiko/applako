/**
 * Script pour vérifier les relations entre tables
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nmwnibzgvwltipmtwhzo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifierRelations() {
  try {
    console.log('🔍 Vérification des relations entre tables\n');

    // 1. Structure table conducteurs
    const { data: conducteurs, error: conducteursError } = await supabase
      .from('conducteurs')
      .select('*')
      .limit(2);

    if (conducteursError) {
      console.log('❌ Erreur table conducteurs:', conducteursError.message);
    } else {
      console.log('📋 STRUCTURE TABLE CONDUCTEURS:');
      if (conducteurs && conducteurs.length > 0) {
        Object.keys(conducteurs[0]).forEach(col => {
          const valeur = conducteurs[0][col];
          console.log(`  - ${col}: ${typeof valeur} (ex: ${valeur})`);
        });
      }
    }

    // 2. Structure table entreprises
    const { data: entreprises, error: entreprisesError } = await supabase
      .from('entreprises')
      .select('*')
      .limit(2);

    if (entreprisesError) {
      console.log('\n❌ Erreur table entreprises:', entreprisesError.message);
    } else {
      console.log('\n📋 STRUCTURE TABLE ENTREPRISES:');
      if (entreprises && entreprises.length > 0) {
        Object.keys(entreprises[0]).forEach(col => {
          const valeur = entreprises[0][col];
          console.log(`  - ${col}: ${typeof valeur} (ex: ${valeur})`);
        });
      }
    }

    // 3. Vérifier la relation conducteur → entreprise
    console.log('\n🔗 VÉRIFICATION DES RELATIONS:');
    
    if (conducteurs && conducteurs.length > 0) {
      const conducteur = conducteurs[0];
      
      // Vérifier si conducteur a entreprise_id
      if (conducteur.entreprise_id) {
        console.log(`✅ Conducteur ${conducteur.id.substring(0, 8)}... → entreprise_id: ${conducteur.entreprise_id.substring(0, 8)}...`);
        
        // Récupérer l'entreprise correspondante
        const { data: entreprise, error: entrepriseError } = await supabase
          .from('entreprises')
          .select('*')
          .eq('id', conducteur.entreprise_id)
          .single();
          
        if (!entrepriseError && entreprise) {
          console.log(`✅ Entreprise trouvée: "${entreprise.nom}"`);
        }
      } else {
        console.log('❌ Pas de entreprise_id dans conducteurs');
      }
    }

    // 4. Test de la requête de jointure
    console.log('\n🧪 TEST REQUÊTE AVEC JOINTURE:');
    
    const { data: reservationsAvecEntreprise, error: joinError } = await supabase
      .from('reservations')
      .select(`
        id,
        conducteur_id,
        statut,
        prix_total,
        created_at,
        conducteurs!inner(
          id,
          entreprise_id,
          entreprises!inner(
            id,
            nom
          )
        )
      `)
      .eq('statut', 'completed')
      .limit(3);

    if (joinError) {
      console.log('❌ Erreur jointure:', joinError.message);
    } else if (reservationsAvecEntreprise && reservationsAvecEntreprise.length > 0) {
      console.log('✅ Jointure réussie ! Exemples:');
      reservationsAvecEntreprise.forEach((r, index) => {
        const entreprise = r.conducteurs?.entreprises;
        console.log(`  ${index + 1}. Réservation ${r.id.substring(0, 8)}... → Entreprise: "${entreprise?.nom}" (${formatPrice(r.prix_total)})`);
      });
      
      // 5. Calculer CA par entreprise avec la bonne jointure
      console.log('\n💰 CA PAR ENTREPRISE (avec jointure):');
      const caParEntreprise = {};
      
      reservationsAvecEntreprise.forEach(r => {
        const entrepriseNom = r.conducteurs?.entreprises?.nom || 'Inconnue';
        const entrepriseId = r.conducteurs?.entreprises?.id || 'unknown';
        
        if (!caParEntreprise[entrepriseId]) {
          caParEntreprise[entrepriseId] = {
            nom: entrepriseNom,
            ca: 0,
            count: 0
          };
        }
        
        caParEntreprise[entrepriseId].ca += r.prix_total || 0;
        caParEntreprise[entrepriseId].count++;
      });
      
      Object.entries(caParEntreprise).forEach(([entrepriseId, data]) => {
        const commission = data.ca * 0.11; // Taux actuel 11%
        console.log(`  - ${data.nom}: ${data.count} courses - CA: ${formatPrice(data.ca)} - Commission: ${formatPrice(commission)}`);
      });
    }

    // 6. Recommandation pour corriger le service
    console.log('\n🔧 CORRECTION NÉCESSAIRE DANS LE SERVICE:');
    console.log('Le service doit utiliser une jointure pour accéder à entreprise_id:');
    console.log(`
    const { data: reservations } = await supabase
      .from('reservations')
      .select(\`
        *,
        conducteurs!inner(
          entreprise_id,
          entreprises!inner(id, nom)
        )
      \`)
      .eq('statut', 'completed')
      .gte('created_at', periodeDebut)
      .lte('created_at', periodeFin);
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
  }).format(amount);
}

verifierRelations();