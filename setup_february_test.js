/**
 * Script pour préparer le test février 2025
 * 3 réservations pour eae583ec-a751-47a7-8447-973c1850d593
 * 2 réservations pour 1df3d11b-978f-4018-9383-590c3ed65598
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nmwnibzgvwltipmtwhzo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupFebruaryTest() {
  try {
    console.log('🗓️  Préparation du test février 2025...\n');

    const entreprise1Id = 'eae583ec-a751-47a7-8447-973c1850d593'; // Moto Rapide Guinée
    const entreprise2Id = '1df3d11b-978f-4018-9383-590c3ed65598'; // Autre entreprise

    // 1. Vérifier/créer la période février 2025
    const periodeDebutFevrier = new Date('2025-02-01T00:00:00.000Z');
    const periodeFinFevrier = new Date('2025-02-28T23:59:59.999Z');

    console.log('📅 Création période février 2025...');

    const { data: periodeFevrier, error: periodeError } = await supabase
      .from('facturation_periodes')
      .insert([{
        periode_debut: periodeDebutFevrier.toISOString(),
        periode_fin: periodeFinFevrier.toISOString(),
        statut: 'en_cours',
        total_commissions: 0,
        total_facture: 0,
        nombre_entreprises: 0
      }])
      .select()
      .single();

    if (periodeError) {
      console.log('❌ Erreur période:', periodeError.message);
      return;
    }

    console.log('✅ Période février créée/mise à jour');
    console.log(`   Dates: ${new Date(periodeFevrier.periode_debut).toLocaleDateString('fr-FR')} - ${new Date(periodeFevrier.periode_fin).toLocaleDateString('fr-FR')}`);

    // 2. Récupérer les conducteurs des deux entreprises
    const { data: conducteursEntreprise1 } = await supabase
      .from('conducteurs')
      .select('id, nom, prenom')
      .eq('entreprise_id', entreprise1Id)
      .limit(1);

    const { data: conducteursEntreprise2 } = await supabase
      .from('conducteurs')
      .select('id, nom, prenom')
      .eq('entreprise_id', entreprise2Id)
      .limit(1);

    if (!conducteursEntreprise1 || conducteursEntreprise1.length === 0) {
      console.log('❌ Aucun conducteur trouvé pour entreprise 1');
      return;
    }

    let conducteur2 = null;
    if (!conducteursEntreprise2 || conducteursEntreprise2.length === 0) {
      console.log('⚠️  Aucun conducteur pour entreprise 2, création...');
      
      // Créer un conducteur pour la 2ème entreprise
      const { data: nouveauConducteur } = await supabase
        .from('conducteurs')
        .insert([{
          entreprise_id: entreprise2Id,
          nom: 'Camara',
          prenom: 'Ibrahim',
          telephone: '+224620888999',
          vehicle_type: 'voiture',
          vehicle_marque: 'Nissan',
          vehicle_modele: 'Almera',
          vehicle_couleur: 'Rouge',
          vehicle_plaque: 'CV-456-CD',
          statut: 'disponible',
          actif: true
        }])
        .select('id, nom, prenom')
        .single();

      if (nouveauConducteur) {
        conducteur2 = nouveauConducteur;
        console.log(`✅ Conducteur créé: ${conducteur2.prenom} ${conducteur2.nom}`);
      }
    } else {
      conducteur2 = conducteursEntreprise2[0];
    }

    const conducteur1 = conducteursEntreprise1[0];
    console.log(`\n👥 CONDUCTEURS:`);
    console.log(`   Entreprise 1: ${conducteur1.prenom} ${conducteur1.nom}`);
    console.log(`   Entreprise 2: ${conducteur2?.prenom} ${conducteur2?.nom}`);

    // 3. Créer les réservations février
    const baseDateFevrier = new Date('2025-02-10T09:00:00.000Z'); // 10 février à 9h

    // 3 réservations pour entreprise 1 (2 validées + 1 non validée)
    const reservationsEntreprise1 = [
      {
        conducteur_id: conducteur1.id,
        client_phone: '+224630111111',
        depart_nom: 'Ratoma',
        destination_nom: 'Kaporo',
        prix_total: 30000,
        distance_km: 12.3,
        statut: 'completed',
        code_validation: 'FEV001',
        date_code_validation: new Date(baseDateFevrier.getTime() + 1000 * 60 * 45).toISOString(),
        created_at: baseDateFevrier.toISOString()
      },
      {
        conducteur_id: conducteur1.id,
        client_phone: '+224630222222',
        depart_nom: 'Bambeto',
        destination_nom: 'Miniere',
        prix_total: 22000,
        distance_km: 8.7,
        statut: 'completed',
        code_validation: 'FEV002',
        date_code_validation: new Date(baseDateFevrier.getTime() + 1000 * 60 * 60 * 3).toISOString(),
        created_at: new Date(baseDateFevrier.getTime() + 1000 * 60 * 60 * 2).toISOString()
      },
      {
        conducteur_id: conducteur1.id,
        client_phone: '+224630333333',
        depart_nom: 'Cosa',
        destination_nom: 'Tombo',
        prix_total: 45000,
        distance_km: 18.5,
        statut: 'completed',
        code_validation: null, // NON VALIDÉE
        date_code_validation: null,
        created_at: new Date(baseDateFevrier.getTime() + 1000 * 60 * 60 * 4).toISOString()
      }
    ];

    // 2 réservations pour entreprise 2 (toutes validées)
    const reservationsEntreprise2 = [
      {
        conducteur_id: conducteur2?.id,
        client_phone: '+224640111111',
        depart_nom: 'Camayenne',
        destination_nom: 'Dixinn',
        prix_total: 18000,
        distance_km: 6.2,
        statut: 'completed',
        code_validation: 'FEV101',
        date_code_validation: new Date(baseDateFevrier.getTime() + 1000 * 60 * 60 * 6).toISOString(),
        created_at: new Date(baseDateFevrier.getTime() + 1000 * 60 * 60 * 5).toISOString()
      },
      {
        conducteur_id: conducteur2?.id,
        client_phone: '+224640222222',
        depart_nom: 'Taouyah',
        destination_nom: 'Sangoya',
        prix_total: 28000,
        distance_km: 11.4,
        statut: 'completed',
        code_validation: 'FEV102',
        date_code_validation: new Date(baseDateFevrier.getTime() + 1000 * 60 * 60 * 8).toISOString(),
        created_at: new Date(baseDateFevrier.getTime() + 1000 * 60 * 60 * 7).toISOString()
      }
    ];

    // 4. Insérer les réservations
    console.log('\n🚗 Création des réservations...');

    const { data: insertedEnt1, error: errorEnt1 } = await supabase
      .from('reservations')
      .insert(reservationsEntreprise1)
      .select('client_phone, prix_total, code_validation');

    if (errorEnt1) {
      console.log('❌ Erreur entreprise 1:', errorEnt1.message);
      return;
    }

    const { data: insertedEnt2, error: errorEnt2 } = await supabase
      .from('reservations')
      .insert(reservationsEntreprise2)
      .select('client_phone, prix_total, code_validation');

    if (errorEnt2) {
      console.log('❌ Erreur entreprise 2:', errorEnt2.message);
      return;
    }

    console.log('✅ RÉSERVATIONS CRÉÉES POUR FÉVRIER:');
    
    console.log('\n🏢 ENTREPRISE 1 (Moto Rapide Guinée):');
    insertedEnt1?.forEach((r, i) => {
      const status = r.code_validation ? '✅' : '❌';
      console.log(`   ${i + 1}. ${r.client_phone} - ${formatPrice(r.prix_total)} ${status}`);
    });

    console.log('\n🏢 ENTREPRISE 2:');
    insertedEnt2?.forEach((r, i) => {
      const status = r.code_validation ? '✅' : '❌';
      console.log(`   ${i + 1}. ${r.client_phone} - ${formatPrice(r.prix_total)} ${status}`);
    });

    // 5. Calculs prévisionnels
    const totalEnt1Validees = reservationsEntreprise1
      .filter(r => r.code_validation)
      .reduce((sum, r) => sum + r.prix_total, 0);
    
    const totalEnt2Validees = reservationsEntreprise2
      .reduce((sum, r) => sum + r.prix_total, 0); // Toutes validées

    const commissionEnt1 = totalEnt1Validees * 0.11;
    const commissionEnt2 = totalEnt2Validees * 0.11;
    const totalCommissions = commissionEnt1 + commissionEnt2;

    console.log('\n💰 PRÉVISIONS COMMISSIONS FÉVRIER:');
    console.log(`   🏢 Entreprise 1: ${formatPrice(totalEnt1Validees)} → ${formatPrice(commissionEnt1)}`);
    console.log(`   🏢 Entreprise 2: ${formatPrice(totalEnt2Validees)} → ${formatPrice(commissionEnt2)}`);
    console.log(`   💰 TOTAL ATTENDU: ${formatPrice(totalCommissions)}`);

    console.log('\n🚀 PÉRIODE FÉVRIER PRÊTE !');
    console.log('\n📋 POUR TESTER:');
    console.log('   1. Aller dans Super-Admin > Gestion Financière');
    console.log('   2. Clôturer la période "1er févr. 2025 - 28 févr. 2025"');
    console.log(`   3. Vérifier commission totale = ${formatPrice(totalCommissions)}`);
    console.log('   4. Voir détails : 2 entreprises avec leurs commissions');
    console.log('   5. Dans détails période : vérifier onglets validées/non validées');

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

setupFebruaryTest();