/**
 * Script simple pour février 2025
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nmwnibzgvwltipmtwhzo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createFebruarySimple() {
  try {
    console.log('🗓️  Création test février 2025...\n');

    // 1. Créer période février
    const periodeDebut = new Date('2025-02-01T00:00:00.000Z');
    const periodeFin = new Date('2025-02-28T23:59:59.999Z');

    const { data: periodeFevrier } = await supabase
      .from('facturation_periodes')
      .insert([{
        periode_debut: periodeDebut.toISOString(),
        periode_fin: periodeFin.toISOString(),
        statut: 'en_cours',
        total_commissions: 0,
        total_facture: 0,
        nombre_entreprises: 0
      }])
      .select()
      .single();

    console.log('✅ Période février créée');

    // 2. Récupérer conducteurs
    const entreprise1Id = 'eae583ec-a751-47a7-8447-973c1850d593';
    const entreprise2Id = '1df3d11b-978f-4018-9383-590c3ed65598';

    const { data: conducteur1 } = await supabase
      .from('conducteurs')
      .select('id')
      .eq('entreprise_id', entreprise1Id)
      .limit(1)
      .single();

    // Créer conducteur pour entreprise 2 si nécessaire
    let { data: conducteur2 } = await supabase
      .from('conducteurs')
      .select('id')
      .eq('entreprise_id', entreprise2Id)
      .limit(1)
      .single();

    if (!conducteur2) {
      const { data: newConducteur2 } = await supabase
        .from('conducteurs')
        .insert([{
          entreprise_id: entreprise2Id,
          nom: 'Bah',
          prenom: 'Saliou',
          telephone: '+224620777888',
          vehicle_type: 'voiture',
          statut: 'disponible'
        }])
        .select('id')
        .single();
      conducteur2 = newConducteur2;
      console.log('✅ Conducteur entreprise 2 créé');
    }

    // 3. Créer réservations février
    const baseDate = new Date('2025-02-10T10:00:00.000Z');
    
    // 3 réservations entreprise 1
    const reservations1 = [
      {
        conducteur_id: conducteur1.id,
        client_phone: '+224630111111',
        depart_nom: 'Ratoma',
        destination_nom: 'Kaporo',
        prix_total: 30000,
        distance_km: 12.3,
        statut: 'completed',
        code_validation: 'F001',
        date_code_validation: new Date(baseDate.getTime() + 1000 * 60 * 30).toISOString(),
        created_at: baseDate.toISOString()
      },
      {
        conducteur_id: conducteur1.id,
        client_phone: '+224630222222',
        depart_nom: 'Bambeto',
        destination_nom: 'Miniere',
        prix_total: 22000,
        distance_km: 8.7,
        statut: 'completed',
        code_validation: 'F002',
        date_code_validation: new Date(baseDate.getTime() + 1000 * 60 * 60 * 3).toISOString(),
        created_at: new Date(baseDate.getTime() + 1000 * 60 * 60 * 2).toISOString()
      },
      {
        conducteur_id: conducteur1.id,
        client_phone: '+224630333333',
        depart_nom: 'Cosa',
        destination_nom: 'Tombo',
        prix_total: 45000,
        distance_km: 18.5,
        statut: 'completed',
        code_validation: null,
        date_code_validation: null,
        created_at: new Date(baseDate.getTime() + 1000 * 60 * 60 * 4).toISOString()
      }
    ];

    // 2 réservations entreprise 2
    const reservations2 = [
      {
        conducteur_id: conducteur2.id,
        client_phone: '+224640111111',
        depart_nom: 'Camayenne',
        destination_nom: 'Dixinn',
        prix_total: 18000,
        distance_km: 6.2,
        statut: 'completed',
        code_validation: 'F101',
        date_code_validation: new Date(baseDate.getTime() + 1000 * 60 * 60 * 6).toISOString(),
        created_at: new Date(baseDate.getTime() + 1000 * 60 * 60 * 5).toISOString()
      },
      {
        conducteur_id: conducteur2.id,
        client_phone: '+224640222222',
        depart_nom: 'Taouyah',
        destination_nom: 'Sangoya',
        prix_total: 28000,
        distance_km: 11.4,
        statut: 'completed',
        code_validation: 'F102',
        date_code_validation: new Date(baseDate.getTime() + 1000 * 60 * 60 * 8).toISOString(),
        created_at: new Date(baseDate.getTime() + 1000 * 60 * 60 * 7).toISOString()
      }
    ];

    // 4. Insérer réservations
    await supabase.from('reservations').insert(reservations1);
    await supabase.from('reservations').insert(reservations2);

    console.log('✅ Réservations février créées');

    // 5. Calculs
    const totalEnt1 = (30000 + 22000); // 2 validées sur 3
    const totalEnt2 = (18000 + 28000); // 2 validées
    const commissionEnt1 = totalEnt1 * 0.11;
    const commissionEnt2 = totalEnt2 * 0.11;
    const totalCommissions = commissionEnt1 + commissionEnt2;

    console.log('\n💰 FÉVRIER 2025 - RÉSUMÉ:');
    console.log(`   🏢 Entreprise 1: 3 réservations (2 validées) = ${formatPrice(commissionEnt1)}`);
    console.log(`   🏢 Entreprise 2: 2 réservations (2 validées) = ${formatPrice(commissionEnt2)}`);
    console.log(`   💰 COMMISSION TOTALE ATTENDUE: ${formatPrice(totalCommissions)}`);

    console.log('\n🚀 PRÊT POUR CLÔTURE FÉVRIER !');
    console.log(`   📅 Période: 1er févr. - 28 févr. 2025`);
    console.log(`   💰 Attendu: ${formatPrice(totalCommissions)}`);
    console.log('   🏢 2 entreprises avec commissions calculées');

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

createFebruarySimple();