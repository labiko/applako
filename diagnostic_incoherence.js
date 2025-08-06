/**
 * SCRIPT DIAGNOSTIC - INCOHÉRENCE DONNÉES ENTREPRISE vs SUPER-ADMIN
 * Analyse les différences entre les vues pour Taxi Express Conakry
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nmwnibzgvwltipmtwhzo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnosticIncoherence() {
  try {
    console.log('🔍 DIAGNOSTIC INCOHÉRENCE ENTREPRISE vs SUPER-ADMIN\n');

    // Période analysée (février 2025)
    const periodeDebut = '2025-02-01T00:00:00.000Z';
    const periodeFin = '2025-02-28T23:59:59.999Z';

    // 1. Identifier toutes les entreprises
    console.log('1️⃣ Identification des entreprises...');
    const { data: entreprises } = await supabase
      .from('entreprises')
      .select('id, nom')
      .order('nom');

    console.log('   Entreprises trouvées:');
    entreprises?.forEach((ent, index) => {
      console.log(`     ${index + 1}. ${ent.nom} (${ent.id})`);
    });

    // 2. Trouver Taxi Express Conakry
    const taxiExpress = entreprises?.find(e => e.nom.includes('Taxi Express'));
    const motoRapide = entreprises?.find(e => e.nom.includes('Moto Rapide'));
    
    console.log(`\n   🎯 Taxi Express Conakry: ${taxiExpress?.id || 'NON TROUVÉ'}`);
    console.log(`   🎯 Moto Rapide Guinée: ${motoRapide?.id || 'NON TROUVÉ'}`);

    if (!taxiExpress) {
      console.log('❌ Taxi Express Conakry non trouvé !');
      return;
    }

    // 3. Analyser les réservations EXACTEMENT comme le service entreprise
    console.log('\n2️⃣ Requête SERVICE ENTREPRISE (comme dans le code)...');
    
    const { data: reservationsEntreprise, error: errEntreprise } = await supabase
      .from('reservations')
      .select(`
        id,
        client_phone,
        depart_nom,
        destination_nom,
        prix_total,
        distance_km,
        created_at,
        date_code_validation,
        code_validation,
        conducteurs!inner(
          nom,
          entreprise_id,
          entreprises!inner(id)
        )
      `)
      .eq('conducteurs.entreprise_id', taxiExpress.id)
      .not('date_code_validation', 'is', null) // Validées uniquement
      .gte('created_at', periodeDebut)
      .lte('created_at', periodeFin)
      .order('created_at', { ascending: false });

    if (errEntreprise) {
      console.log('❌ Erreur requête entreprise:', errEntreprise);
    } else {
      console.log(`   ✅ ${reservationsEntreprise?.length || 0} réservations trouvées`);
      
      if (reservationsEntreprise && reservationsEntreprise.length > 0) {
        let totalCA = 0;
        console.log('   Détails:');
        reservationsEntreprise.forEach((res, index) => {
          console.log(`     ${index + 1}. ${res.client_phone} | ${res.depart_nom} → ${res.destination_nom} | ${formatPrice(res.prix_total)} | ${res.code_validation}`);
          totalCA += res.prix_total;
        });
        console.log(`   💰 CA Total: ${formatPrice(totalCA)}`);
        console.log(`   💰 Commission (11%): ${formatPrice(totalCA * 0.11)}`);
      }
    }

    // 4. Analyser les réservations EXACTEMENT comme le service super-admin
    console.log('\n3️⃣ Requête SERVICE SUPER-ADMIN (comme dans le code)...');
    
    const { data: reservationsSuperAdmin, error: errSuperAdmin } = await supabase
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
          entreprises!inner(
            id,
            nom
          )
        )
      `)
      .gte('created_at', periodeDebut)
      .lte('created_at', periodeFin)
      .in('statut', ['completed', 'accepted'])
      .order('created_at', { ascending: false });

    if (errSuperAdmin) {
      console.log('❌ Erreur requête super-admin:', errSuperAdmin);
    } else {
      console.log(`   ✅ ${reservationsSuperAdmin?.length || 0} réservations trouvées`);
      
      // Filtrer pour Taxi Express Conakry
      const reservationsTaxiExpress = reservationsSuperAdmin?.filter(res => 
        res.conducteurs?.entreprise_id === taxiExpress.id
      ) || [];
      
      console.log(`   🎯 ${reservationsTaxiExpress.length} réservations pour Taxi Express Conakry:`);
      
      if (reservationsTaxiExpress.length > 0) {
        let totalCA = 0;
        reservationsTaxiExpress.forEach((res, index) => {
          console.log(`     ${index + 1}. ${res.client_phone} | ${res.depart_nom} → ${res.destination_nom} | ${formatPrice(res.prix_total)} | ${res.code_validation || 'N/A'} | Validé: ${res.date_code_validation ? '✅' : '❌'}`);
          totalCA += res.prix_total;
        });
        console.log(`   💰 CA Total: ${formatPrice(totalCA)}`);
        console.log(`   💰 Commission (11%): ${formatPrice(totalCA * 0.11)}`);
      }
    }

    // 5. Vérifier les commissions calculées dans la table
    console.log('\n4️⃣ Vérification table COMMISSIONS_DETAIL...');
    
    const { data: commissionsDetail } = await supabase
      .from('commissions_detail')
      .select(`
        id,
        entreprise_id,
        chiffre_affaire_brut,
        montant_commission,
        nombre_reservations,
        statut_paiement,
        date_versement_commission,
        facturation_periodes!inner(
          periode_debut,
          periode_fin
        ),
        entreprises!inner(nom)
      `)
      .eq('entreprise_id', taxiExpress.id)
      .gte('facturation_periodes.periode_debut', periodeDebut)
      .lte('facturation_periodes.periode_fin', periodeFin);

    console.log(`   ✅ ${commissionsDetail?.length || 0} commissions trouvées dans la table`);
    
    if (commissionsDetail && commissionsDetail.length > 0) {
      commissionsDetail.forEach((comm, index) => {
        console.log(`     ${index + 1}. CA: ${formatPrice(comm.chiffre_affaire_brut)} | Commission: ${formatPrice(comm.montant_commission)} | Courses: ${comm.nombre_reservations} | Payé: ${comm.statut_paiement}`);
      });
    }

    // 6. Vérifier l'ID hardcodé dans le service
    console.log('\n5️⃣ Vérification ID HARDCODÉ...');
    console.log(`   Service utilise: eae583ec-a751-47a7-8447-973c1850d593`);
    console.log(`   Moto Rapide:     ${motoRapide?.id}`);
    console.log(`   Taxi Express:    ${taxiExpress?.id}`);
    console.log(`   ✅ Match Moto Rapide: ${motoRapide?.id === 'eae583ec-a751-47a7-8447-973c1850d593'}`);

    console.log('\n📊 SYNTHÈSE:');
    console.log('   - Le service entreprise est configuré pour Moto Rapide Guinée');
    console.log('   - Mais les images montrent des données qui pourraient être mélangées');
    console.log('   - Il faut vérifier quelle entreprise se connecte réellement');

  } catch (error) {
    console.error('❌ Erreur diagnostic:', error);
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

diagnosticIncoherence();