/**
 * Script pour créer des conducteurs pour l'entreprise et ajouter des réservations test
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nmwnibzgvwltipmtwhzo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupEnterpriseWithDrivers() {
  try {
    console.log('🎯 Configuration entreprise avec conducteurs et réservations test...\n');

    const entrepriseId = 'eae583ec-a751-47a7-8447-973c1850d593';

    // 1. Vérifier si l'entreprise existe
    const { data: entreprise } = await supabase
      .from('entreprises')
      .select('id, nom')
      .eq('id', entrepriseId)
      .single();

    if (!entreprise) {
      console.log('❌ Entreprise non trouvée. Création...');
      
      const { data: newEntreprise, error: entrepriseError } = await supabase
        .from('entreprises')
        .insert([{
          id: entrepriseId,
          nom: 'Taxi Express Test',
          telephone: '+224620000001',
          email: 'test@taxiexpress.gn',
          adresse: 'Conakry, Guinée'
        }])
        .select()
        .single();

      if (entrepriseError) {
        console.log('❌ Erreur création entreprise:', entrepriseError.message);
        return;
      }
      
      console.log('✅ Entreprise créée:', newEntreprise.nom);
    } else {
      console.log(`✅ Entreprise trouvée: ${entreprise.nom}`);
    }

    // 2. Ajouter 2 conducteurs pour cette entreprise
    const conducteurs = [
      {
        entreprise_id: entrepriseId,
        nom: 'Mamadou Diallo',
        telephone: '+224620111001',
        numero_permis: 'P123456789'
      },
      {
        entreprise_id: entrepriseId,
        nom: 'Alpha Bah',
        telephone: '+224620111002', 
        numero_permis: 'P987654321'
      }
    ];

    // Vérifier si les conducteurs existent déjà
    const { data: existingConducteurs } = await supabase
      .from('conducteurs')
      .select('id, nom')
      .eq('entreprise_id', entrepriseId);

    let conducteurActif;

    if (!existingConducteurs || existingConducteurs.length === 0) {
      console.log('👥 Ajout des conducteurs...');
      
      const { data: newConducteurs, error: conducteursError } = await supabase
        .from('conducteurs')
        .insert(conducteurs)
        .select('id, nom');

      if (conducteursError) {
        console.log('❌ Erreur ajout conducteurs:', conducteursError.message);
        return;
      }

      console.log('✅ Conducteurs ajoutés:');
      newConducteurs?.forEach(c => {
        console.log(`   - ${c.nom} (${c.id.slice(0, 8)}...)`);
      });
      
      conducteurActif = newConducteurs[0];
    } else {
      console.log('✅ Conducteurs existants trouvés:');
      existingConducteurs.forEach(c => {
        console.log(`   - ${c.nom} (${c.id.slice(0, 8)}...)`);
      });
      
      conducteurActif = existingConducteurs[0];
    }

    // 3. Récupérer la période en cours
    const { data: periodeEnCours } = await supabase
      .from('facturation_periodes')
      .select('*')
      .eq('statut', 'en_cours')
      .order('periode_debut', { ascending: false })
      .limit(1)
      .single();

    if (!periodeEnCours) {
      console.log('❌ Aucune période en cours trouvée');
      return;
    }

    console.log(`\n📅 Période en cours: ${new Date(periodeEnCours.periode_debut).toLocaleDateString('fr-FR')} - ${new Date(periodeEnCours.periode_fin).toLocaleDateString('fr-FR')}`);

    // 4. Créer 3 réservations validées
    const baseDate = new Date(periodeEnCours.periode_debut);
    baseDate.setDate(baseDate.getDate() + 1); // Un jour après le début de période

    const reservations = [
      {
        conducteur_id: conducteurActif.id,
        client_phone: '+224620123456',
        depart_nom: 'Hôpital Donka',
        destination_nom: 'Marché Madina',
        prix_total: 25000,
        distance_km: 8.5,
        statut: 'completed',
        code_validation: 'VAL001',
        date_code_validation: new Date(baseDate.getTime() + 1000 * 60 * 30).toISOString(),
        created_at: baseDate.toISOString(),
        commentaire: 'Course test 1 - Validée pour calcul commission'
      },
      {
        conducteur_id: conducteurActif.id,
        client_phone: '+224621234567',
        depart_nom: 'Aéroport Conakry',
        destination_nom: 'Centre ville',
        prix_total: 35000,
        distance_km: 15.2,
        statut: 'completed',
        code_validation: 'VAL002',
        date_code_validation: new Date(baseDate.getTime() + 1000 * 60 * 60 * 2).toISOString(),
        created_at: new Date(baseDate.getTime() + 1000 * 60 * 60).toISOString(),
        commentaire: 'Course test 2 - Validée pour calcul commission'
      },
      {
        conducteur_id: conducteurActif.id,
        client_phone: '+224622345678',
        depart_nom: 'Université Gamal',
        destination_nom: 'Kipé',
        prix_total: 18000,
        distance_km: 6.8,
        statut: 'completed',
        code_validation: 'VAL003',
        date_code_validation: new Date(baseDate.getTime() + 1000 * 60 * 60 * 4).toISOString(),
        created_at: new Date(baseDate.getTime() + 1000 * 60 * 60 * 3).toISOString(),
        commentaire: 'Course test 3 - Validée pour calcul commission'
      }
    ];

    // 5. Insérer les réservations
    console.log(`\n🚗 Ajout de 3 réservations pour ${conducteurActif.nom}...`);
    
    const { data: insertedReservations, error } = await supabase
      .from('reservations')
      .insert(reservations)
      .select('id, client_phone, prix_total, distance_km, date_code_validation');

    if (error) {
      console.log('❌ Erreur insertion réservations:', error.message);
      return;
    }

    console.log('\n✅ RÉSERVATIONS AJOUTÉES:');
    insertedReservations?.forEach((r, index) => {
      console.log(`   ${index + 1}. ${r.client_phone}`);
      console.log(`      Prix: ${formatPrice(r.prix_total)} • Distance: ${r.distance_km} km`);
      console.log(`      Code validé: ${new Date(r.date_code_validation).toLocaleString('fr-FR')}`);
      console.log(`      ID: ${r.id.slice(0, 8)}...`);
      console.log('');
    });

    // 6. Calculer le total pour vérification
    const totalCA = reservations.reduce((sum, r) => sum + r.prix_total, 0);
    const commissionAttendue = totalCA * 0.11; // 11% par défaut

    console.log('💰 PRÉVISION COMMISSION:');
    console.log(`   Entreprise: ${entreprise?.nom || 'Taxi Express Test'}`);
    console.log(`   Conducteur: ${conducteurActif.nom}`);
    console.log(`   Chiffre d'affaires: ${formatPrice(totalCA)}`);
    console.log(`   Commission attendue (11%): ${formatPrice(commissionAttendue)}`);

    // 7. Vérifier structure périodes pour date clôture
    console.log('\n🔍 VÉRIFICATION CHAMPS DATE CLÔTURE:');
    const periodeFields = Object.keys(periodeEnCours);
    const dateFields = periodeFields.filter(f => 
      f.includes('date') || f.includes('cloture') || f.includes('updated')
    );
    
    console.log('📋 Champs de date disponibles:');
    dateFields.forEach(field => {
      const value = periodeEnCours[field];
      console.log(`   • ${field}: ${value ? new Date(value).toLocaleString('fr-FR') : 'null'}`);
    });

    console.log('\n🚀 PRÊT POUR TEST CLÔTURE !');
    console.log('   1. Aller dans Super-Admin > Gestion Financière');
    console.log('   2. Cliquer sur "Clôturer" pour la période en cours');
    console.log('   3. Vérifier que la commission est calculée pour ces 3 réservations');
    console.log(`   4. Voir les détails: http://localhost:4200/super-admin/financial/periode/${periodeEnCours.id}`);

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

setupEnterpriseWithDrivers();