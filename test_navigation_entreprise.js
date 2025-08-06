/**
 * SCRIPT DE TEST - NAVIGATION ENTREPRISE
 * Vérifie que toutes les routes et pages sont correctement configurées
 */

const fs = require('fs');
const path = require('path');

async function testEntrepriseNavigation() {
  try {
    console.log('🔄 TEST NAVIGATION ENTREPRISE\n');

    // 1. Vérifier que les routes sont correctement définies
    console.log('1️⃣ Vérification des routes...');
    
    const routesFile = path.join(__dirname, 'src/app/entreprise/entreprise.routes.ts');
    const routesContent = fs.readFileSync(routesFile, 'utf8');
    
    const expectedRoutes = [
      'dashboard',
      'conducteurs', 
      'reservations',
      'finances',
      'versements',
      'profile',
      'commissions-factures',
      'mes-commissions'
    ];
    
    let allRoutesFound = true;
    expectedRoutes.forEach(route => {
      if (routesContent.includes(`path: '${route}'`)) {
        console.log(`   ✅ Route '${route}' trouvée`);
      } else {
        console.log(`   ❌ Route '${route}' MANQUANTE`);
        allRoutesFound = false;
      }
    });
    
    if (allRoutesFound) {
      console.log('   ✅ Toutes les routes sont définies');
    } else {
      console.log('   ❌ Des routes sont manquantes');
      return;
    }

    // 2. Vérifier que les fichiers de composants existent
    console.log('\n2️⃣ Vérification des composants...');
    
    const componentChecks = [
      {
        name: 'dashboard',
        path: 'src/app/entreprise/dashboard/dashboard.page.ts'
      },
      {
        name: 'finances', 
        path: 'src/app/entreprise/finances/finances.page.ts'
      },
      {
        name: 'commissions-factures',
        path: 'src/app/entreprise/pages/commissions-factures/commissions-factures.page.ts'
      },
      {
        name: 'mes-commissions',
        path: 'src/app/entreprise/pages/commissions/mes-commissions.page.ts'
      }
    ];
    
    let allComponentsExist = true;
    componentChecks.forEach(comp => {
      const fullPath = path.join(__dirname, comp.path);
      if (fs.existsSync(fullPath)) {
        console.log(`   ✅ Composant '${comp.name}' existe`);
      } else {
        console.log(`   ❌ Composant '${comp.name}' MANQUANT: ${comp.path}`);
        allComponentsExist = false;
      }
    });

    if (allComponentsExist) {
      console.log('   ✅ Tous les composants existent');
    }

    // 3. Vérifier les méthodes de navigation dans le dashboard
    console.log('\n3️⃣ Vérification des méthodes de navigation...');
    
    const dashboardFile = path.join(__dirname, 'src/app/entreprise/dashboard/dashboard.page.ts');
    const dashboardContent = fs.readFileSync(dashboardFile, 'utf8');
    
    const expectedMethods = [
      'navigateToMesCommissions',
      'navigateToCommissionsFactures', 
      'navigateToFinances'
    ];
    
    let allMethodsFound = true;
    expectedMethods.forEach(method => {
      if (dashboardContent.includes(method)) {
        console.log(`   ✅ Méthode '${method}' trouvée`);
      } else {
        console.log(`   ❌ Méthode '${method}' MANQUANTE`);
        allMethodsFound = false;
      }
    });
    
    // Vérifier que Router est importé
    if (dashboardContent.includes("import { Router }")) {
      console.log('   ✅ Import Router trouvé');
    } else {
      console.log('   ❌ Import Router MANQUANT');
      allMethodsFound = false;
    }
    
    // Vérifier que Router est injecté
    if (dashboardContent.includes("private router: Router")) {
      console.log('   ✅ Injection Router trouvée');
    } else {
      console.log('   ❌ Injection Router MANQUANTE');
      allMethodsFound = false;
    }

    // 4. Vérifier les event handlers dans le template
    console.log('\n4️⃣ Vérification du template dashboard...');
    
    const dashboardTemplate = path.join(__dirname, 'src/app/entreprise/dashboard/dashboard.page.html');
    const templateContent = fs.readFileSync(dashboardTemplate, 'utf8');
    
    const expectedClicks = [
      '(click)="navigateToMesCommissions()"',
      '(click)="navigateToCommissionsFactures()"',
      '(click)="navigateToFinances()"'
    ];
    
    let allClicksFound = true;
    expectedClicks.forEach(click => {
      if (templateContent.includes(click)) {
        console.log(`   ✅ Event handler '${click}' trouvé`);
      } else {
        console.log(`   ❌ Event handler '${click}' MANQUANT`);
        allClicksFound = false;
      }
    });
    
    // Vérifier qu'il n'y a plus de routerLink
    if (templateContent.includes('routerLink="/entreprise/mes-commissions"') ||
        templateContent.includes('routerLink="/entreprise/commissions-factures"') ||
        templateContent.includes('routerLink="/entreprise/finances"')) {
      console.log('   ⚠️  Anciens routerLink détectés - ils peuvent causer des conflits');
    } else {
      console.log('   ✅ Aucun routerLink conflictuel trouvé');
    }

    // 5. Résumé final
    console.log('\n📊 RÉSUMÉ DU TEST:');
    if (allRoutesFound && allComponentsExist && allMethodsFound && allClicksFound) {
      console.log('✅ TOUS LES TESTS PASSÉS - Navigation entreprise opérationnelle !');
      
      console.log('\n🚀 FONCTIONNEMENT ATTENDU:');
      console.log('   1. Dashboard Entreprise s\'affiche');
      console.log('   2. Clic sur "Mes Commissions" → Page avec accordéons de périodes');
      console.log('   3. Clic sur "Factures Commission" → Page factures avec détails');
      console.log('   4. Clic sur "Finances" → Page finances de l\'entreprise');
      console.log('   5. Navigation de retour fonctionne');
      
      console.log('\n📱 POUR TESTER:');
      console.log('   • ionic serve');
      console.log('   • Aller sur /entreprise/dashboard');
      console.log('   • Cliquer sur chaque bouton d\'action rapide');
      console.log('   • Vérifier que les pages se chargent correctement');
      
    } else {
      console.log('❌ DES PROBLÈMES ONT ÉTÉ DÉTECTÉS');
      console.log('   → Vérifiez les erreurs ci-dessus et corrigez-les');
    }

  } catch (error) {
    console.error('❌ Erreur test navigation:', error.message);
  }
}

testEntrepriseNavigation();