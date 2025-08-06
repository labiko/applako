/**
 * Script pour vérifier les réservations en base
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nmwnibzgvwltipmtwhzo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifierReservations() {
  try {
    console.log('🔍 Vérification des réservations en base...\n');

    // 1. Compter toutes les réservations
    const { count: totalReservations, error: countError } = await supabase
      .from('reservations')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.log('❌ Erreur accès table reservations:', countError.message);
      return;
    }

    console.log(`📊 Total réservations: ${totalReservations}`);

    if (totalReservations === 0) {
      console.log('⚠️  Aucune réservation trouvée en base');
      console.log('💡 Pour tester le système financier, créez des réservations de test\n');
      await creerReservationsTest();
      return;
    }

    // 2. Réservations par statut
    const { data: reservationsParStatut, error: statutError } = await supabase
      .from('reservations')
      .select('status')
      .not('status', 'is', null);

    if (statutError) {
      console.log('❌ Erreur lecture statuts:', statutError.message);
      return;
    }

    const statsStatut = {};
    reservationsParStatut.forEach(r => {
      statsStatut[r.status] = (statsStatut[r.status] || 0) + 1;
    });

    console.log('\n📈 Répartition par statut:');
    Object.entries(statsStatut).forEach(([statut, count]) => {
      console.log(`  - ${statut}: ${count} réservations`);
    });

    // 3. Réservations complétées (génèrent du CA)
    const { data: reservationsCompletes, error: completesError } = await supabase
      .from('reservations')
      .select('*')
      .in('status', ['completed', 'accepted'])
      .not('price', 'is', null);

    if (completesError) {
      console.log('❌ Erreur réservations complètes:', completesError.message);
      return;
    }

    console.log(`\n💰 Réservations génératrices de CA: ${reservationsCompletes.length}`);

    if (reservationsCompletes.length > 0) {
      const totalCA = reservationsCompletes.reduce((sum, r) => sum + (r.price || 0), 0);
      console.log(`💳 Chiffre d'affaires total: ${formatPrice(totalCA)}`);
      
      // 4. CA par entreprise
      const caParEntreprise = {};
      reservationsCompletes.forEach(r => {
        if (r.entreprise_id) {
          caParEntreprise[r.entreprise_id] = (caParEntreprise[r.entreprise_id] || 0) + (r.price || 0);
        }
      });

      console.log('\n🏢 CA par entreprise:');
      Object.entries(caParEntreprise).forEach(([entrepriseId, ca]) => {
        console.log(`  - ${entrepriseId.substring(0, 8)}...: ${formatPrice(ca)}`);
      });

      // 5. Recommandations
      console.log('\n🚀 RECOMMANDATIONS:');
      console.log('1. Clôturez la période actuelle pour voir les commissions calculées');
      console.log('2. Les commissions seront basées sur ces réservations complètes');
      console.log('3. Vérifiez les taux de commission dans la table commission_config');
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

async function creerReservationsTest() {
  console.log('🧪 Création de réservations de test...');
  
  try {
    // Créer quelques réservations de test
    const reservationsTest = [
      {
        customer_name: 'Client Test 1',
        customer_phone: '+224123456789',
        pickup_location: 'Kaloum, Conakry',
        destination: 'Matam, Conakry',
        pickup_date: '2025-08-15',
        pickup_time: '14:30',
        status: 'completed',
        price: 50000,
        created_at: new Date().toISOString()
      },
      {
        customer_name: 'Client Test 2', 
        customer_phone: '+224987654321',
        pickup_location: 'Matam, Conakry',
        destination: 'Ratoma, Conakry',
        pickup_date: '2025-08-16',
        pickup_time: '09:15',
        status: 'completed',
        price: 35000,
        created_at: new Date().toISOString()
      },
      {
        customer_name: 'Client Test 3',
        customer_phone: '+224555666777',
        pickup_location: 'Dixinn, Conakry',
        destination: 'Kaloum, Conakry', 
        pickup_date: '2025-08-17',
        pickup_time: '16:45',
        status: 'completed',
        price: 42000,
        created_at: new Date().toISOString()
      }
    ];

    const { data, error } = await supabase
      .from('reservations')
      .insert(reservationsTest)
      .select();

    if (error) {
      console.log('❌ Erreur création réservations test:', error.message);
      return;
    }

    console.log(`✅ ${data.length} réservations de test créées`);
    console.log(`💰 CA de test: ${formatPrice(127000)} (50k + 35k + 42k)`);
    console.log('\n🎯 Maintenant vous pouvez:');
    console.log('1. Clôturer la période dans le super-admin');
    console.log('2. Voir les commissions calculées automatiquement');

  } catch (error) {
    console.error('❌ Erreur création test:', error);
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

verifierReservations();