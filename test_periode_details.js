/**
 * Script pour tester les données de la page détails période
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nmwnibzgvwltipmtwhzo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPeriodeDetails() {
  try {
    console.log('🧪 Test des données pour la page détails période...\n');

    // 1. Récupérer la période courante
    const { data: periode, error: periodeError } = await supabase
      .from('facturation_periodes')
      .select('*')
      .limit(1)
      .single();

    if (periodeError || !periode) {
      console.log('❌ Aucune période trouvée');
      return;
    }

    console.log('📅 PÉRIODE TROUVÉE:');
    console.log(`   ID: ${periode.id}`);
    console.log(`   Dates: ${new Date(periode.periode_debut).toLocaleDateString('fr-FR')} - ${new Date(periode.periode_fin).toLocaleDateString('fr-FR')}`);
    console.log(`   Statut: ${periode.statut}`);
    console.log(`   Commissions: ${formatPrice(periode.total_commissions)}`);

    // 2. Test de la requête réservations (comme dans le service)
    console.log('\n🔍 TEST REQUÊTE RÉSERVATIONS:');
    const { data: reservations, error: reservationsError } = await supabase
      .from('reservations')
      .select(`
        id,
        customer_name,
        customer_phone,
        pickup_location,
        destination,
        pickup_date,
        pickup_time,
        prix_total,
        statut,
        created_at,
        updated_at,
        conducteurs!inner(
          nom,
          telephone,
          entreprise_id,
          entreprises!inner(
            id,
            nom
          )
        )
      `)
      .gte('created_at', periode.periode_debut)
      .lte('created_at', periode.periode_fin)
      .in('statut', ['completed', 'accepted'])
      .order('created_at', { ascending: false });

    if (reservationsError) {
      console.log('❌ Erreur requête réservations:', reservationsError.message);
      return;
    }

    console.log(`✅ ${reservations?.length || 0} réservations trouvées`);

    // 3. Analyser la structure des données
    if (reservations && reservations.length > 0) {
      const firstReservation = reservations[0];
      console.log('\n📊 STRUCTURE PREMIÈRE RÉSERVATION:');
      console.log(`   ID: ${firstReservation.id}`);
      console.log(`   Client: ${firstReservation.customer_name}`);
      console.log(`   Trajet: ${firstReservation.pickup_location} → ${firstReservation.destination}`);
      console.log(`   Prix: ${formatPrice(firstReservation.prix_total)}`);
      console.log(`   Statut: ${firstReservation.statut}`);
      
      // Analyser la structure conducteurs
      console.log('\n👤 STRUCTURE CONDUCTEUR:');
      console.log(`   Type conducteurs: ${Array.isArray(firstReservation.conducteurs) ? 'Array' : 'Object'}`);
      
      if (firstReservation.conducteurs) {
        const conducteur = Array.isArray(firstReservation.conducteurs) 
          ? firstReservation.conducteurs[0] 
          : firstReservation.conducteurs;
          
        console.log(`   Nom: ${conducteur?.nom || 'N/A'}`);
        console.log(`   Téléphone: ${conducteur?.telephone || 'N/A'}`);
        
        // Analyser la structure entreprises
        console.log('\n🏢 STRUCTURE ENTREPRISE:');
        console.log(`   Type entreprises: ${Array.isArray(conducteur?.entreprises) ? 'Array' : 'Object'}`);
        
        const entreprise = Array.isArray(conducteur?.entreprises)
          ? conducteur.entreprises[0]
          : conducteur?.entreprises;
          
        console.log(`   ID: ${entreprise?.id || 'N/A'}`);
        console.log(`   Nom: ${entreprise?.nom || 'N/A'}`);
      }

      // 4. Traitement comme dans le service
      console.log('\n🔄 TRAITEMENT DONNÉES (comme service):');
      const enrichedData = reservations.map((reservation) => {
        const conducteur = Array.isArray(reservation.conducteurs) 
          ? reservation.conducteurs[0] 
          : reservation.conducteurs;
        
        const entreprise = Array.isArray(conducteur?.entreprises)
          ? conducteur.entreprises[0]
          : conducteur?.entreprises;

        return {
          ...reservation,
          conducteur: {
            nom: conducteur?.nom || 'Conducteur inconnu',
            telephone: conducteur?.telephone || '',
            entreprise: {
              id: entreprise?.id || '',
              nom: entreprise?.nom || 'Entreprise inconnue'
            }
          }
        };
      });

      console.log('✅ Données enrichies avec succès');
      
      // Compter par entreprise
      const parEntreprise = {};
      enrichedData.forEach(r => {
        const nom = r.conducteur.entreprise.nom;
        if (!parEntreprise[nom]) {
          parEntreprise[nom] = [];
        }
        parEntreprise[nom].push(r);
      });

      console.log('\n📈 RÉPARTITION PAR ENTREPRISE:');
      Object.entries(parEntreprise).forEach(([nom, reservations]) => {
        const ca = reservations.reduce((sum, r) => sum + (r.prix_total || 0), 0);
        console.log(`   - ${nom}: ${reservations.length} courses, CA ${formatPrice(ca)}`);
      });
    }

    // 5. Test commissions
    console.log('\n💰 TEST COMMISSIONS:');
    const { data: commissions, error: commissionsError } = await supabase
      .from('commissions_detail')
      .select(`
        *,
        entreprises!inner(nom)
      `)
      .eq('periode_id', periode.id)
      .order('montant_commission', { ascending: false });

    if (commissionsError) {
      console.log('❌ Erreur commissions:', commissionsError.message);
    } else {
      console.log(`✅ ${commissions?.length || 0} commission(s) trouvée(s)`);
      
      commissions?.forEach((c, index) => {
        console.log(`   ${index + 1}. ${c.entreprises?.nom}: ${formatPrice(c.montant_commission)} (${c.taux_commission_moyen}%)`);
      });
    }

    console.log('\n🎯 DONNÉES PRÊTES POUR LA PAGE !');
    console.log(`   URL à tester: http://localhost:4201/super-admin/financial/periode/${periode.id}`);

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

testPeriodeDetails();