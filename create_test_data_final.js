/**
 * Script final pour créer conducteurs et réservations test
 * Basé sur la vraie structure de la base de données
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nmwnibzgvwltipmtwhzo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestData() {
  try {
    console.log('🎯 Création des données de test pour clôture...\n');

    const entrepriseId = 'eae583ec-a751-47a7-8447-973c1850d593';

    // 1. Vérifier si l'entreprise existe
    const { data: entreprise } = await supabase
      .from('entreprises')
      .select('id, nom')
      .eq('id', entrepriseId)
      .single();

    console.log(`🏢 Entreprise: ${entreprise?.nom || 'Non trouvée'}`);

    // 2. Créer un conducteur avec la bonne structure
    console.log('\n👥 Création du conducteur...');
    
    const { data: newConducteur, error: conducteurError } = await supabase
      .from('conducteurs')
      .insert([{
        entreprise_id: entrepriseId,
        nom: 'Diallo',
        prenom: 'Mamadou',
        telephone: '+224620999001',
        vehicle_type: 'voiture',
        vehicle_marque: 'Toyota',
        vehicle_modele: 'Corolla',
        vehicle_couleur: 'Blanc',
        vehicle_plaque: 'CV-123-AB',
        statut: 'disponible',
        actif: true
      }])
      .select('id, nom, prenom')
      .single();

    if (conducteurError) {
      console.log('❌ Erreur création conducteur:', conducteurError.message);
      
      // Essayer de récupérer un conducteur existant
      const { data: existingConducteur } = await supabase
        .from('conducteurs')
        .select('id, nom, prenom')
        .eq('entreprise_id', entrepriseId)
        .limit(1)
        .single();
      
      if (existingConducteur) {
        console.log(`✅ Utilisation conducteur existant: ${existingConducteur.prenom} ${existingConducteur.nom}`);
        var conducteurActif = existingConducteur;
      } else {
        console.log('❌ Impossible de créer ou trouver un conducteur');
        return;
      }
    } else {
      console.log(`✅ Conducteur créé: ${newConducteur.prenom} ${newConducteur.nom}`);
      var conducteurActif = newConducteur;
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
    baseDate.setDate(baseDate.getDate() + 1); // Un jour après le début

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

    console.log('\n🚗 Ajout des 3 réservations validées...');
    
    const { data: insertedReservations, error: reservationError } = await supabase
      .from('reservations')
      .insert(reservations)
      .select('id, client_phone, prix_total, distance_km, date_code_validation, created_at');

    if (reservationError) {
      console.log('❌ Erreur insertion réservations:', reservationError.message);
      return;
    }

    console.log('\n✅ RÉSERVATIONS CRÉÉES:');
    insertedReservations?.forEach((r, index) => {
      console.log(`   ${index + 1}. ${r.client_phone}`);
      console.log(`      Prix: ${formatPrice(r.prix_total)} • Distance: ${r.distance_km} km`);
      console.log(`      Code validé: ${new Date(r.date_code_validation).toLocaleString('fr-FR')}`);
      console.log(`      Créée: ${new Date(r.created_at).toLocaleString('fr-FR')}`);
      console.log(`      ID: ${r.id.slice(0, 8)}...`);
      console.log('');
    });

    // 5. Calculs prévisionnels
    const totalCA = reservations.reduce((sum, r) => sum + r.prix_total, 0);
    const commissionAttendue = totalCA * 0.11; // 11% par défaut

    console.log('💰 PRÉVISION COMMISSION:');
    console.log(`   Entreprise: ${entreprise?.nom}`);
    console.log(`   Conducteur: ${conducteurActif.prenom} ${conducteurActif.nom}`);
    console.log(`   Chiffre d'affaires: ${formatPrice(totalCA)}`);
    console.log(`   Commission attendue (11%): ${formatPrice(commissionAttendue)}`);

    // 6. Vérifier les champs de date dans facturation_periodes
    console.log('\n🔍 CHAMPS DE DATE DANS facturation_periodes:');
    const dateFields = Object.keys(periodeEnCours).filter(f => 
      f.includes('date') || f.includes('created') || f.includes('updated')
    );
    
    dateFields.forEach(field => {
      const value = periodeEnCours[field];
      console.log(`   • ${field}: ${value ? new Date(value).toLocaleString('fr-FR') : 'null'}`);
    });

    console.log('\n🚀 DONNÉES DE TEST PRÊTES !');
    console.log('\n📋 ÉTAPES SUIVANTES:');
    console.log('   1. Aller dans Super-Admin > Gestion Financière');
    console.log('   2. Cliquer sur "Clôturer" pour la période en cours');
    console.log('   3. Vérifier que la commission est calculée');
    console.log(`   4. Voir détails: http://localhost:4200/super-admin/financial/periode/${periodeEnCours.id}`);
    console.log('\n💡 APRÈS CLÔTURE:');
    console.log('   - Le champ "updated_at" sera mis à jour avec la date de clôture');
    console.log('   - Le statut passera de "en_cours" à "cloturee"');
    console.log('   - Les 3 réservations validées apparaîtront dans l\'onglet "Validées"');

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

createTestData();