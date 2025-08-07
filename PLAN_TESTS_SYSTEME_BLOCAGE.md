# Plan de Tests - Système de Blocage

## 📋 Vue d'ensemble

Ce plan de tests couvre tous les aspects du système de blocage à 3 niveaux :
- **Super-Admin** → Désactivation entreprises + Blocage conducteurs
- **Entreprise** → Blocage de ses propres conducteurs  
- **Monitoring** → Détection automatique et déconnexion

## 🎯 Objectifs des tests

1. Vérifier le fonctionnement de chaque niveau de blocage
2. Tester les permissions et sécurité
3. Valider les interfaces utilisateur
4. Contrôler la persistance des données
5. Vérifier le monitoring automatique

---

## 📊 Tests de Base de Données

### Test DB-1 : Structure des tables
**Objectif :** Vérifier que les colonnes de blocage sont créées
```sql
-- Vérifier colonnes entreprises
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'entreprises' 
AND column_name IN ('motif_desactivation', 'date_desactivation', 'desactive_par');

-- Vérifier colonnes conducteurs  
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'conducteurs'
AND column_name IN ('motif_blocage', 'date_blocage', 'bloque_par');

-- Vérifier table historique
SELECT * FROM information_schema.tables WHERE table_name = 'historique_blocages';
```

**Résultat attendu :** Toutes les colonnes et table doivent exister

### Test DB-2 : Triggers de blocage en cascade
**Objectif :** Tester le trigger de blocage automatique des conducteurs
```sql
-- 1. Créer une entreprise de test
INSERT INTO entreprises (nom, email, actif) 
VALUES ('Test Entreprise', 'test@test.com', true);

-- 2. Créer des conducteurs de test
INSERT INTO conducteurs (nom, prenom, entreprise_id, actif)
VALUES 
('Conducteur1', 'Test1', (SELECT id FROM entreprises WHERE email = 'test@test.com'), true),
('Conducteur2', 'Test2', (SELECT id FROM entreprises WHERE email = 'test@test.com'), true);

-- 3. Désactiver l'entreprise
UPDATE entreprises 
SET actif = false, 
    motif_desactivation = 'Test désactivation',
    desactive_par = 'test'
WHERE email = 'test@test.com';

-- 4. Vérifier que les conducteurs sont bloqués
SELECT nom, actif, bloque_par FROM conducteurs 
WHERE entreprise_id = (SELECT id FROM entreprises WHERE email = 'test@test.com');
```

**Résultat attendu :** Tous les conducteurs doivent avoir `actif = false` et `bloque_par = 'super-admin-entreprise'`

### Test DB-3 : Historique des actions
**Objectif :** Vérifier que l'historique est correctement enregistré
```sql
SELECT * FROM historique_blocages 
WHERE entite_id = (SELECT id FROM entreprises WHERE email = 'test@test.com')
ORDER BY date DESC;
```

**Résultat attendu :** Entrée dans l'historique pour l'action de blocage

---

## 🔐 Tests Super-Admin

### Test SA-1 : Désactivation d'entreprise
**Prérequis :**
- Entreprise avec 2-3 conducteurs actifs
- Connexion super-admin

**Étapes :**
1. Aller dans "Gestion des Entreprises"
2. Cliquer sur l'icône de désactivation (🔒) d'une entreprise active
3. Saisir un motif : "Test de désactivation"
4. Confirmer la désactivation
5. Vérifier la notification de succès
6. Actualiser la page

**Résultats attendus :**
- ✅ Modal s'affiche correctement sans code HTML visible
- ✅ Entreprise passe en statut "inactif"
- ✅ Icône change pour réactivation (🔓)
- ✅ Tous les conducteurs de l'entreprise sont bloqués
- ✅ Statistiques mises à jour

### Test SA-2 : Réactivation d'entreprise
**Prérequis :** Entreprise désactivée (Test SA-1)

**Étapes :**
1. Cliquer sur l'icône de réactivation (🔓)
2. Confirmer la réactivation
3. Vérifier les changements

**Résultats attendus :**
- ✅ Entreprise redevient active
- ✅ Conducteurs avec `bloque_par = 'super-admin-entreprise'` sont débloqués
- ✅ Conducteurs bloqués individuellement restent bloqués

### Test SA-3 : Blocage conducteur individuel
**Prérequis :** Conducteur actif d'une entreprise active

**Étapes :**
1. Dans la liste des conducteurs d'une entreprise
2. Cliquer sur l'icône de blocage (🚫) d'un conducteur
3. Sélectionner une raison : "Comportement inapproprié"
4. Saisir un motif détaillé
5. Confirmer le blocage

**Résultats attendus :**
- ✅ Modal sans code HTML visible
- ✅ Radio buttons fonctionnels
- ✅ Conducteur bloqué avec `bloque_par = 'super-admin'`
- ✅ Badge statut mis à jour

### Test SA-4 : Déblocage conducteur
**Prérequis :** Conducteur bloqué

**Étapes :**
1. Cliquer sur l'icône de déblocage (🛡️)
2. Confirmer le déblocage
3. Vérifier le changement

**Résultats attendus :**
- ✅ Conducteur redevient actif
- ✅ Badge statut mis à jour

---

## 🏢 Tests Entreprise

### Test ENT-1 : Accès après désactivation
**Prérequis :** Entreprise désactivée par super-admin

**Étapes :**
1. Tenter de se connecter avec le compte entreprise désactivé
2. Si déjà connecté, naviguer dans l'application

**Résultats attendus :**
- ✅ Redirection automatique vers `/entreprise/blocked`
- ✅ Page de blocage s'affiche avec motif
- ✅ Impossible d'accéder aux autres pages
- ✅ Session nettoyée

### Test ENT-2 : Page de blocage entreprise
**Prérequis :** Accès à `/entreprise/blocked`

**Vérifications :**
- ✅ Design moderne et responsive
- ✅ Motif de désactivation affiché
- ✅ Date de désactivation visible
- ✅ Bouton "Contacter le support" fonctionnel
- ✅ Informations de contact correctes
- ✅ Impossible de naviguer ailleurs

### Test ENT-3 : Blocage de conducteurs par entreprise
**Prérequis :** Entreprise active avec conducteurs

**Note :** Ce test nécessite l'implémentation de l'interface entreprise pour le blocage de conducteurs (non encore développée dans le code actuel)

**Étapes prévues :**
1. Aller dans la gestion des conducteurs entreprise
2. Bloquer un conducteur avec motif
3. Vérifier que `bloque_par = 'entreprise'`
4. Tester les permissions (ne peut bloquer que ses conducteurs)

---

## 🚗 Tests Conducteur

### Test COND-1 : Modal de blocage conducteur
**Prérequis :** Intégration dans l'app conducteur (simulation)

**Test simulation :**
```typescript
// Dans la console du navigateur
const blocageService = document.querySelector('[ng-reflect-name="app-root"]').__ng_context__[0].injector.get('BlockageService');
await blocageService.showBlockedModal(
  "Test de blocage pour démonstration", 
  "super-admin", 
  new Date().toISOString()
);
```

**Résultats attendus :**
- ✅ Modal non-fermable s'affiche
- ✅ Design moderne avec informations complètes
- ✅ Motif, date et origine du blocage visible
- ✅ Bouton "Contacter Support" fonctionne
- ✅ Bouton "Fermer Application" fonctionne
- ✅ Impossible de fermer autrement

---

## 🔄 Tests Monitoring et AuthGuard

### Test MON-1 : AuthGuard
**Objectif :** Tester la protection des routes

**Étapes :**
1. Se connecter avec une entreprise active
2. Faire désactiver l'entreprise par un super-admin
3. Tenter de naviguer vers une page protégée

**Résultats attendus :**
- ✅ Redirection automatique vers `/entreprise/blocked`
- ✅ Route protégée inaccessible

### Test MON-2 : Monitoring automatique
**Objectif :** Tester la vérification périodique (30 secondes)

**Étapes :**
1. Se connecter et rester sur une page
2. Faire désactiver l'entreprise par un autre utilisateur
3. Attendre maximum 30 secondes

**Résultats attendus :**
- ✅ Détection automatique du blocage
- ✅ Redirection vers la page de blocage
- ✅ Session nettoyée

### Test MON-3 : Interceptor HTTP
**Objectif :** Tester la détection via réponses serveur

**Simulation :**
```typescript
// Simuler une réponse 403 avec code de blocage
const error = {
  status: 403,
  error: {
    code: 'ENTREPRISE_BLOCKED',
    motif: 'Test interceptor',
    type: 'entreprise'
  }
};
```

**Résultats attendus :**
- ✅ Interceptor détecte l'erreur
- ✅ Gestion appropriée du blocage

---

## 🔒 Tests de Sécurité

### Test SEC-1 : Permissions entreprise
**Objectif :** Vérifier qu'une entreprise ne peut pas bloquer d'autres conducteurs

**Test :** Tenter de modifier un conducteur d'une autre entreprise via l'API
```sql
-- Simuler une tentative de blocage cross-entreprise
UPDATE conducteurs 
SET actif = false 
WHERE entreprise_id != 'current_entreprise_id';
```

**Résultat attendu :** ✅ Échec avec erreur de permission

### Test SEC-2 : Vérification cascade de permissions
**Objectif :** Tester la hiérarchie de déblocage

**Scénarios :**
1. Entreprise tente de débloquer un conducteur bloqué par super-admin
2. Entreprise débloquer son propre blocage
3. Super-admin débloque tout type de blocage

**Résultats attendus :**
- ❌ Entreprise ne peut pas débloquer les blocages super-admin
- ✅ Entreprise peut débloquer ses propres blocages
- ✅ Super-admin peut tout débloquer

---

## 📱 Tests Interface Utilisateur

### Test UI-1 : Modals Super-Admin
**Vérifications :**
- ✅ Headers en couleur primary
- ✅ Pas de code HTML affiché
- ✅ SubHeaders informatifs
- ✅ Messages bien formatés
- ✅ Boutons cohérents

### Test UI-2 : Icônes et états
**Vérifications :**
- ✅ Icônes changent selon l'état (🔒/🔓, 🚫/🛡️)
- ✅ Badges de statut corrects
- ✅ Tooltips informatifs
- ✅ Couleurs cohérentes

### Test UI-3 : Responsive design
**Tester sur :**
- Desktop (1920px)
- Tablet (768px)  
- Mobile (375px)

**Vérifications :**
- ✅ Modals adaptées
- ✅ Boutons accessibles
- ✅ Textes lisibles
- ✅ Navigation fluide

---

## ⚡ Tests de Performance

### Test PERF-1 : Monitoring impact
**Objectif :** Vérifier que le polling 30s n'impacte pas les performances

**Métriques à surveiller :**
- CPU usage
- Memory usage  
- Network requests
- UI responsiveness

### Test PERF-2 : Chargement des modals
**Objectif :** Temps d'affichage des modals
**Cible :** < 200ms

---

## 🔧 Tests d'Intégration

### Test INT-1 : Workflow complet
**Scénario :** Cycle de vie complet d'un blocage

1. Créer entreprise + conducteurs
2. Super-admin désactive l'entreprise
3. Vérifier blocage automatique des conducteurs
4. Tenter connexion entreprise → Blocage
5. Réactiver entreprise
6. Vérifier déblocage des conducteurs
7. Bloquer un conducteur individuellement
8. Réactiver entreprise → Conducteur reste bloqué
9. Débloquer le conducteur

**Durée estimée :** 15 minutes

### Test INT-2 : Multi-utilisateurs
**Objectif :** Tester avec plusieurs utilisateurs simultanés

**Scénarios :**
- Super-admin bloque pendant qu'une entreprise est connectée
- Plusieurs super-admins travaillent simultanément
- Entreprise et super-admin modifient les mêmes données

---

## 📋 Checklist de Tests

### ✅ Tests Critiques (Obligatoires)
- [ ] DB-1 : Structure base de données
- [ ] DB-2 : Triggers de cascade  
- [ ] SA-1 : Désactivation entreprise
- [ ] SA-2 : Réactivation entreprise
- [ ] ENT-1 : Blocage accès entreprise
- [ ] ENT-2 : Page de blocage
- [ ] MON-1 : AuthGuard protection
- [ ] SEC-1 : Permissions sécurisées
- [ ] UI-1 : Modals sans HTML

### ⚠️ Tests Importants (Recommandés)
- [ ] SA-3 : Blocage conducteur individuel
- [ ] SA-4 : Déblocage conducteur
- [ ] COND-1 : Modal conducteur bloqué
- [ ] MON-2 : Monitoring automatique
- [ ] SEC-2 : Hiérarchie permissions
- [ ] UI-2 : États et icônes
- [ ] INT-1 : Workflow complet

### 🔧 Tests Optionnels (Amélioration)
- [ ] DB-3 : Historique des actions
- [ ] MON-3 : Interceptor HTTP  
- [ ] PERF-1 : Impact monitoring
- [ ] UI-3 : Responsive design
- [ ] INT-2 : Multi-utilisateurs

---

## 📊 Rapport de Tests

### Template de rapport par test :
```
Test ID: [DB-1]
Statut: ✅ PASS / ❌ FAIL / ⚠️ PARTIAL
Durée: [X] minutes
Testeur: [Nom]
Date: [Date]
Détails: [Observations]
Bugs trouvés: [Liste]
```

### Critères de validation globale :
- **🟢 Vert (Prêt)** : Tous les tests critiques PASS
- **🟡 Jaune (Attention)** : Tests critiques OK, quelques tests importants FAIL
- **🔴 Rouge (Bloquant)** : Un ou plusieurs tests critiques FAIL

---

## 🚀 Actions post-tests

### Si tests réussis :
1. Documenter la version testée
2. Former les administrateurs
3. Planifier le déploiement production
4. Mettre à jour la documentation utilisateur

### Si tests échoués :
1. Logger tous les bugs détectés
2. Prioriser les corrections
3. Refaire les tests après correction
4. Valider les régressions

**Durée totale estimée des tests : 2-3 heures**