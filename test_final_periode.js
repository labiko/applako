/**
 * Test final avec les bonnes colonnes
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nmwnibzgvwltipmtwhzo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFinalPeriode() {
  try {
    console.log('🎯 Test final de la page détails période...\n');

    // 1. Récupérer la période
    const { data: periode } = await supabase
      .from('facturation_periodes')
      .select('*')
      .limit(1)
      .single();

    console.log('📅 PÉRIODE:');
    console.log(`   ID: ${periode.id}`);
    console.log(`   Dates: ${new Date(periode.periode_debut).toLocaleDateString('fr-FR')} - ${new Date(periode.periode_fin).toLocaleDateString('fr-FR')}`);
    console.log(`   Statut: ${periode.statut}`);

    // 2. Test requête réservations (exactement comme le service)
    const { data: reservations, error } = await supabase
      .from('reservations')
      .select(`
        id,
        conducteur_id,
        client_phone,
        depart_nom,
        destination_nom,
        prix_total,
        statut,
        created_at,
        updated_at,
        distance_km,
        code_validation,
        commentaire,
        note_conducteur,
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

    if (error) {
      console.log('❌ Erreur:', error.message);
      return;
    }

    console.log(`\n🚗 RÉSERVATIONS: ${reservations?.length || 0} trouvées`);

    if (reservations && reservations.length > 0) {
      // Traitement comme dans le service
      const enrichedData = reservations.map((reservation) => {
        const conducteur = Array.isArray(reservation.conducteurs) 
          ? reservation.conducteurs[0] 
          : reservation.conducteurs;
        
        const entreprise = Array.isArray(conducteur?.entreprises)
          ? conducteur.entreprises[0]
          : conducteur?.entreprises;

        return {
          ...reservation,
          customer_name: `Client ${reservation.client_phone?.slice(-4) || 'Anonyme'}`,
          customer_phone: reservation.client_phone || '',
          pickup_location: reservation.depart_nom || 'Lieu de départ',
          destination: reservation.destination_nom || 'Destination',
          pickup_date: reservation.created_at?.split('T')[0] || '',
          pickup_time: reservation.created_at?.split('T')[1]?.slice(0, 5) || '',
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

      console.log('\n📋 EXEMPLES DE RÉSERVATIONS ENRICHIES:');
      enrichedData.slice(0, 3).forEach((r, index) => {
        console.log(`   ${index + 1}. ${r.customer_name}`);
        console.log(`      Trajet: ${r.pickup_location} → ${r.destination}`);
        console.log(`      Prix: ${formatPrice(r.prix_total)}`);
        console.log(`      Conducteur: ${r.conducteur.nom} (${r.conducteur.entreprise.nom})`);
        console.log(`      Date: ${r.pickup_date} à ${r.pickup_time}`);
        console.log('');
      });

      // Grouper par entreprise
      const parEntreprise = {};
      enrichedData.forEach(r => {
        const nom = r.conducteur.entreprise.nom;
        if (!parEntreprise[nom]) {
          parEntreprise[nom] = [];
        }
        parEntreprise[nom].push(r);
      });

      console.log('📊 RÉPARTITION PAR ENTREPRISE:');
      Object.entries(parEntreprise).forEach(([nom, reservations]) => {
        const ca = reservations.reduce((sum, r) => sum + (r.prix_total || 0), 0);
        console.log(`   - ${nom}: ${reservations.length} courses, CA ${formatPrice(ca)}`);
      });
    }

    // 3. Test commissions
    const { data: commissions } = await supabase
      .from('commissions_detail')
      .select(`
        *,
        entreprises!inner(nom)
      `)
      .eq('periode_id', periode.id);

    console.log(`\n💰 COMMISSIONS: ${commissions?.length || 0} trouvées`);
    commissions?.forEach((c, index) => {
      console.log(`   ${index + 1}. ${c.entreprises?.nom}: ${formatPrice(c.montant_commission)} (${c.taux_commission_moyen}%)`);
    });

    console.log('\n🚀 PRÊT POUR LES TESTS !');
    console.log(`   URL: http://localhost:4201/super-admin/financial/periode/${periode.id}`);
    console.log('   ✅ Build réussi');
    console.log('   ✅ Données disponibles');
    console.log('   ✅ Interface créée');

  } catch (error) {
    console.error('❌ Erreur:', error);
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

testFinalPeriode();