/**
 * Script pour vérifier nos réservations de janvier
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nmwnibzgvwltipmtwhzo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkJanuaryReservations() {
  try {
    console.log('🔍 Vérification des réservations de janvier 2025...\n');

    const entrepriseId = 'eae583ec-a751-47a7-8447-973c1850d593';
    
    // 1. Vérifier la période janvier
    const { data: periodeJanvier } = await supabase
      .from('facturation_periodes')
      .select('*')
      .gte('periode_debut', '2025-01-01')
      .lte('periode_debut', '2025-01-31')
      .single();

    if (!periodeJanvier) {
      console.log('❌ Période janvier non trouvée');
      return;
    }

    console.log('📅 PÉRIODE JANVIER:');
    console.log(`   Début: ${new Date(periodeJanvier.periode_debut).toLocaleDateString('fr-FR')}`);
    console.log(`   Fin: ${new Date(periodeJanvier.periode_fin).toLocaleDateString('fr-FR')}`);
    console.log(`   Statut: ${periodeJanvier.statut}`);

    // 2. Récupérer TOUTES les réservations de janvier (comme le fait le service)
    const { data: toutesReservationsJanvier } = await supabase
      .from('reservations')
      .select(`
        id,
        conducteur_id,
        client_phone,
        depart_nom,
        destination_nom,
        prix_total,
        distance_km,
        statut,
        created_at,
        code_validation,
        date_code_validation,
        conducteurs!inner(
          nom,
          telephone,
          entreprise_id,
          entreprises!inner(id, nom)
        )
      `)
      .gte('created_at', periodeJanvier.periode_debut)
      .lte('created_at', periodeJanvier.periode_fin)
      .in('statut', ['completed', 'accepted'])
      .order('created_at', { ascending: false });

    console.log(`\n🚗 TOUTES LES RÉSERVATIONS DE JANVIER: ${toutesReservationsJanvier?.length || 0}`);
    
    if (toutesReservationsJanvier) {
      toutesReservationsJanvier.forEach((r, index) => {
        const conducteur = Array.isArray(r.conducteurs) ? r.conducteurs[0] : r.conducteurs;
        const entreprise = Array.isArray(conducteur?.entreprises) 
          ? conducteur.entreprises[0] 
          : conducteur?.entreprises;
        
        const isOurTest = entreprise?.id === entrepriseId;
        const status = r.date_code_validation ? '✅ Validée' : '❌ Non validée';
        const marker = isOurTest ? '🎯' : '  ';
        
        console.log(`${marker} ${index + 1}. ${r.client_phone} - ${formatPrice(r.prix_total)} ${status}`);
        console.log(`     Entreprise: ${entreprise?.nom} (${isOurTest ? 'NOS TESTS' : 'Autre'})`);
        console.log(`     Créée: ${new Date(r.created_at).toLocaleString('fr-FR')}`);
        console.log('');
      });
    }

    // 3. Filtrer uniquement NOS réservations de test
    const nosReservations = toutesReservationsJanvier?.filter(r => {
      const conducteur = Array.isArray(r.conducteurs) ? r.conducteurs[0] : r.conducteurs;
      const entreprise = Array.isArray(conducteur?.entreprises) 
        ? conducteur.entreprises[0] 
        : conducteur?.entreprises;
      return entreprise?.id === entrepriseId;
    }) || [];

    console.log('\n🎯 NOS RÉSERVATIONS DE TEST:');
    console.log(`   Total: ${nosReservations.length}`);
    
    const nosValidees = nosReservations.filter(r => r.date_code_validation !== null);
    const nosNonValidees = nosReservations.filter(r => r.date_code_validation === null);
    
    console.log(`   Validées: ${nosValidees.length}`);
    console.log(`   Non validées: ${nosNonValidees.length}`);

    nosReservations.forEach(r => {
      const status = r.date_code_validation ? '✅' : '❌';
      console.log(`   • ${r.client_phone} - ${formatPrice(r.prix_total)} ${status}`);
    });

    // 4. Diagnostic
    console.log('\n🔧 DIAGNOSTIC:');
    if (nosReservations.length !== 4) {
      console.log(`   ⚠️  Problème: On devrait avoir 4 réservations, on en a ${nosReservations.length}`);
    }
    if (nosValidees.length !== 3) {
      console.log(`   ⚠️  Problème: On devrait avoir 3 validées, on en a ${nosValidees.length}`);
    }
    if (nosNonValidees.length !== 1) {
      console.log(`   ⚠️  Problème: On devrait avoir 1 non validée, on en a ${nosNonValidees.length}`);
    }

    if (nosReservations.length === 4 && nosValidees.length === 3 && nosNonValidees.length === 1) {
      console.log('   ✅ Configuration correcte !');
      
      // Peut-être un problème avec le service qui ne récupère pas toutes
      console.log('\n💡 Si vous ne voyez que 2 validées dans l\'interface,');
      console.log('   cela peut être dû à un filtrage supplémentaire côté service.');
    }

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

checkJanuaryReservations();