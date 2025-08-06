/**
 * Script pour déplacer nos réservations de test en janvier 2025
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nmwnibzgvwltipmtwhzo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function moveToJanuary() {
  try {
    console.log('🗓️  Déplacement des réservations de test en janvier 2025...\n');

    const entrepriseId = 'eae583ec-a751-47a7-8447-973c1850d593';
    
    // 1. Récupérer le conducteur
    const { data: conducteur } = await supabase
      .from('conducteurs')
      .select('id, nom, prenom')
      .eq('entreprise_id', entrepriseId)
      .limit(1)
      .single();

    if (!conducteur) {
      console.log('❌ Conducteur non trouvé');
      return;
    }

    console.log(`👤 Conducteur: ${conducteur.prenom} ${conducteur.nom}`);

    // 2. Récupérer nos 4 réservations de test (les plus récentes de ce conducteur)
    const { data: reservationsTest } = await supabase
      .from('reservations')
      .select('id, client_phone, prix_total, distance_km, code_validation, date_code_validation')
      .eq('conducteur_id', conducteur.id)
      .order('created_at', { ascending: false })
      .limit(4);

    if (!reservationsTest || reservationsTest.length < 4) {
      console.log('❌ Pas assez de réservations de test trouvées');
      return;
    }

    console.log(`\n🚗 Trouvé ${reservationsTest.length} réservations à déplacer`);

    // 3. Nouvelles dates en janvier 2025
    const baseDateJanuary = new Date('2025-01-15T10:00:00.000Z'); // 15 janvier à 10h
    const nouvellesDatesJanvier = [
      baseDateJanuary,
      new Date(baseDateJanuary.getTime() + 1000 * 60 * 60 * 2), // +2h
      new Date(baseDateJanuary.getTime() + 1000 * 60 * 60 * 4), // +4h
      new Date(baseDateJanuary.getTime() + 1000 * 60 * 60 * 6)  // +6h
    ];

    // 4. Mettre à jour chaque réservation
    console.log('\n📅 Déplacement vers janvier 2025...');
    
    for (let i = 0; i < reservationsTest.length; i++) {
      const reservation = reservationsTest[i];
      const nouvelleDateJanvier = nouvellesDatesJanvier[i];
      
      // Pour les réservations validées, ajuster la date de validation
      let nouvelleDateValidation = null;
      if (reservation.date_code_validation) {
        nouvelleDateValidation = new Date(nouvelleDateJanvier.getTime() + 1000 * 60 * 30).toISOString();
      }

      const { error: updateError } = await supabase
        .from('reservations')
        .update({
          created_at: nouvelleDateJanvier.toISOString(),
          date_code_validation: nouvelleDateValidation
        })
        .eq('id', reservation.id);

      if (updateError) {
        console.log(`❌ Erreur réservation ${reservation.client_phone}:`, updateError.message);
      } else {
        const status = reservation.code_validation ? '✅' : '❌';
        console.log(`   ${i + 1}. ${reservation.client_phone} - ${formatPrice(reservation.prix_total)} ${status}`);
        console.log(`      Déplacée au: ${nouvelleDateJanvier.toLocaleString('fr-FR')}`);
      }
    }

    // 5. Créer ou mettre à jour la période janvier 2025
    const periodeDebutJanvier = new Date('2025-01-01T00:00:00.000Z');
    const periodeFinJanvier = new Date('2025-01-31T23:59:59.999Z');

    console.log('\n📅 Création/Mise à jour période janvier 2025...');

    // Vérifier si la période janvier existe
    const { data: periodeJanvierExistante } = await supabase
      .from('facturation_periodes')
      .select('*')
      .gte('periode_debut', periodeDebutJanvier.toISOString())
      .lte('periode_debut', periodeFinJanvier.toISOString())
      .single();

    if (periodeJanvierExistante) {
      // Mettre à jour la période existante
      await supabase
        .from('facturation_periodes')
        .update({
          statut: 'en_cours',
          total_commissions: 0,
          total_facture: 0,
          nombre_entreprises: 0
        })
        .eq('id', periodeJanvierExistante.id);
      
      console.log('✅ Période janvier mise à jour');
      var periodeJanvier = periodeJanvierExistante;
    } else {
      // Créer nouvelle période janvier
      const { data: nouvellePeriodeJanvier } = await supabase
        .from('facturation_periodes')
        .insert([{
          periode_debut: periodeDebutJanvier.toISOString(),
          periode_fin: periodeFinJanvier.toISOString(),
          statut: 'en_cours',
          total_commissions: 0,
          total_facture: 0,
          nombre_entreprises: 0
        }])
        .select()
        .single();
      
      console.log('✅ Période janvier créée');
      var periodeJanvier = nouvellePeriodeJanvier;
    }

    // 6. Résumé final
    const reservationsValidees = reservationsTest.filter(r => r.code_validation);
    const reservationsNonValidees = reservationsTest.filter(r => !r.code_validation);
    const totalValidees = reservationsValidees.reduce((sum, r) => sum + r.prix_total, 0);
    const totalNonValidees = reservationsNonValidees.reduce((sum, r) => sum + r.prix_total, 0);
    const commissionAttendue = totalValidees * 0.11;

    console.log('\n💰 RÉSUMÉ PÉRIODE JANVIER 2025:');
    console.log(`   📅 Période: 1er janvier - 31 janvier 2025`);
    console.log(`   🏢 Entreprise: Moto Rapide Guinée`);
    console.log(`   👤 Conducteur: ${conducteur.prenom} ${conducteur.nom}`);
    console.log(`   🟢 ${reservationsValidees.length} réservations validées: ${formatPrice(totalValidees)}`);
    console.log(`   🔴 ${reservationsNonValidees.length} réservation non validée: ${formatPrice(totalNonValidees)}`);
    console.log(`   💰 Commission attendue: ${formatPrice(commissionAttendue)}`);

    console.log('\n🎯 PÉRIODE JANVIER PRÊTE POUR LE TEST !');
    console.log('\n📋 PROCÉDURE:');
    console.log('   1. Aller dans Super-Admin > Gestion Financière');
    console.log('   2. Voir la période "1er janv. 2025 - 31 janv. 2025"');
    console.log('   3. Cliquer "Clôturer" pour cette période');
    console.log(`   4. Vérifier commission = ${formatPrice(commissionAttendue)}`);
    console.log('   5. Voir détails avec uniquement nos 4 réservations');
    console.log(`   6. URL détails: http://localhost:4200/super-admin/financial/periode/${periodeJanvier?.id}`);

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

moveToJanuary();