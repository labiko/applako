# 📋 PLAN COMPLET - SYSTÈME DE COMMISSIONS ET FLUX FINANCIER

## 🎯 1. RÈGLES DE BASE

### 1.1 Commission
- **Taux dynamique** : Récupéré depuis `commission_config` en base de données
  - Taux spécifique par entreprise si défini
  - Sinon taux global par défaut
  - Historisation des taux pour traçabilité
- **Critère unique** : `date_code_validation NOT NULL` = Commission due
- **Indépendant du mode de paiement** : Mobile Money ou Cash

### 1.2 Validation
- **Validation OTP = Course effectuée = Commission due**
- Peu importe le statut de la réservation (completed, accepted, etc.)
- Peu importe le mode de paiement final

## 💰 2. FLUX FINANCIER - DEUX CIRCUITS

### 2.1 Circuit A : MOBILE MONEY
```
CLIENT → Mobile Money → COMPTE ADMIN (100%) → Retient 11% → Reverse 89% à l'entreprise
```

**Caractéristiques :**
- **Identification** : `lengopay_payments.status = 'SUCCESS'` avec `reservation_id`
- **Admin encaisse** : 100% du montant de la course
- **Admin garde** : 11% de commission
- **Admin reverse** : 89% à l'entreprise
- **Traçabilité** : Complète via lengopay_payments

### 2.2 Circuit B : CASH (ESPÈCES)
```
CLIENT → Cash → CONDUCTEUR (100%) → Entreprise doit 11% à l'Admin
```

**Caractéristiques :**
- **Identification** : Absence dans `lengopay_payments` OU status ≠ 'SUCCESS'
- **Conducteur encaisse** : 100% directement en liquide
- **Entreprise doit** : 11% de commission à l'Admin
- **Collecte** : L'entreprise doit verser la commission ultérieurement

## 📊 3. EXEMPLE PRATIQUE - JAKARTA TAXI EXPRESS

### 3.1 Données de Base
- **Période** : 01-31 août 2025
- **Réservations validées** : 6
- **CA Total** : 27,769,000 GNF
- **Commission totale (11%)** : 3,054,590 GNF

### 3.2 Répartition par Mode de Paiement

| **Mode** | **Nb Courses** | **Montant Total** | **Admin Reçoit** | **Commission (11%)** | **À Reverser** | **À Collecter** |
|----------|---------------|-------------------|------------------|---------------------|----------------|-----------------|
| Mobile Money | 2 | 10,000,000 GNF | 10,000,000 GNF | 1,100,000 GNF | 8,900,000 GNF | 0 GNF |
| Cash | 4 | 17,769,000 GNF | 0 GNF | 1,954,590 GNF | 0 GNF | 1,954,590 GNF |
| **TOTAL** | **6** | **27,769,000 GNF** | **10,000,000 GNF** | **3,054,590 GNF** | **8,900,000 GNF** | **1,954,590 GNF** |

### 3.3 Bilan Financier Jakarta
- **Commission totale due** : 3,054,590 GNF ✅
- **Commission déjà prélevée** (sur Mobile Money) : 1,100,000 GNF
- **Commission à collecter** (sur Cash) : 1,954,590 GNF
- **Montant net à reverser à Jakarta** : 8,900,000 GNF

## 📈 4. TABLEAU DE BORD REQUIS

### 4.1 Vue ENCAISSEMENTS MOBILE MONEY
**Objectif** : Tracker tous les paiements Mobile Money reçus

**Métriques clés :**
- Total encaissé par période
- Répartition par entreprise
- Nombre de transactions
- Montant moyen par transaction

**Requête SQL type :**
```sql
SELECT 
    e.nom as entreprise,
    COUNT(lp.id) as nb_paiements,
    SUM(lp.amount) as total_encaisse,
    SUM(lp.amount * 0.11) as commission_prelevee,
    SUM(lp.amount * 0.89) as a_reverser
FROM lengopay_payments lp
JOIN reservations r ON lp.reservation_id = r.id
JOIN conducteurs c ON r.conducteur_id = c.id
JOIN entreprises e ON c.entreprise_id = e.id
WHERE lp.status = 'SUCCESS'
    AND r.date_code_validation IS NOT NULL
GROUP BY e.nom
```

### 4.2 Vue REVERSEMENTS ENTREPRISES
**Objectif** : Gérer les montants à reverser aux entreprises

**Colonnes tableau :**
- Entreprise
- Période
- Total Mobile Money encaissé
- Commission retenue (11%)
- Montant à reverser (89%)
- Statut reversement (En attente/Payé)
- Date de reversement

**États possibles :**
- `en_attente` : Montant calculé, pas encore versé
- `programme` : Versement planifié
- `verse` : Versement effectué
- `confirme` : Entreprise a confirmé réception

### 4.3 Vue COMMISSIONS CASH À COLLECTER
**Objectif** : Tracker les commissions dues par les entreprises sur paiements cash

**Métriques clés :**
- Commission totale à collecter par entreprise
- Ancienneté de la dette
- Historique des paiements
- Balance courante

**Requête SQL type :**
```sql
SELECT 
    e.nom as entreprise,
    COUNT(r.id) as nb_courses_cash,
    SUM(r.prix_total) as ca_cash_total,
    SUM(r.prix_total * 0.11) as commission_a_collecter
FROM reservations r
JOIN conducteurs c ON r.conducteur_id = c.id
JOIN entreprises e ON c.entreprise_id = e.id
LEFT JOIN lengopay_payments lp ON r.id = lp.reservation_id AND lp.status = 'SUCCESS'
WHERE r.date_code_validation IS NOT NULL
    AND lp.id IS NULL  -- Pas de paiement Mobile Money SUCCESS
GROUP BY e.nom
```

## 💼 5. GESTION DE LA BALANCE ENTREPRISE

### 5.1 Concept de Balance
Chaque entreprise a une **balance nette** avec l'Admin :

```
Balance = Montants à reverser (Mobile Money) - Commissions à collecter (Cash)
```

### 5.2 Exemples de Balance

| **Entreprise** | **À recevoir (89% MM)** | **À payer (11% Cash)** | **Balance Nette** | **Action** |
|----------------|------------------------|----------------------|-------------------|------------|
| Jakarta Taxi | 8,900,000 GNF | 1,954,590 GNF | +6,945,410 GNF | Admin doit verser |
| Taxi Express | 0 GNF | 500,000 GNF | -500,000 GNF | Entreprise doit payer |
| Lako Taxi | 2,000,000 GNF | 2,000,000 GNF | 0 GNF | Compensation parfaite |

### 5.3 Options de Règlement
1. **Balance positive** : Admin verse la différence
2. **Balance négative** : Entreprise paie la différence
3. **Balance nulle** : Compensation automatique

## 🔄 6. WORKFLOW INTÉGRÉ À LA CLÔTURE

### 6.1 Processus de Clôture Enrichi
Lors de l'appel à `cloturerPeriode(periodeId)`, le système effectue :

1. **Calcul des commissions de base** (existant)
   - Identification réservations validées
   - Application taux commission depuis `commission_config`
   - Calcul montant total commission

2. **NOUVEAU - Séparation Mobile Money vs Cash**
   ```sql
   -- Pour chaque entreprise
   SELECT 
     COUNT(CASE WHEN lp.status = 'SUCCESS' THEN 1 END) as nb_mobile_money,
     COUNT(CASE WHEN lp.id IS NULL THEN 1 END) as nb_cash,
     SUM(CASE WHEN lp.status = 'SUCCESS' THEN r.prix_total ELSE 0 END) as ca_mobile_money,
     SUM(CASE WHEN lp.id IS NULL THEN r.prix_total ELSE 0 END) as ca_cash
   FROM reservations r
   LEFT JOIN lengopay_payments lp ON r.id = lp.reservation_id
   WHERE date_code_validation IS NOT NULL
   ```

3. **NOUVEAU - Calcul Balance**
   - Montant encaissé = ca_mobile_money
   - Montant à reverser = ca_mobile_money × (1 - taux_commission)
   - Commission cash à collecter = ca_cash × taux_commission
   - Balance nette = à reverser - à collecter

4. **NOUVEAU - Génération enregistrements**
   - INSERT dans `reversements_entreprises` si balance > 0
   - INSERT dans `collectes_commissions_cash` si commission cash > 0
   - UPDATE `balance_entreprises` avec nouvelle position

### 6.2 Notification (Jour 2-3)
1. Email/SMS aux entreprises avec :
   - Détail des commissions
   - Montants à reverser/collecter
   - Balance nette
2. Mise à disposition des factures

### 6.3 Règlement (Jour 5-10)
1. **Si balance positive** : Virement Admin → Entreprise
2. **Si balance négative** : 
   - Rappel de paiement
   - Collecte commission cash
   - Mise à jour balance

### 6.4 Réconciliation (Jour 15)
1. Vérification tous paiements effectués
2. Relances si nécessaire
3. Rapport de clôture

## 📱 7. INTERFACES REQUISES

### 7.1 Interface SUPER-ADMIN
- Dashboard global tous flux financiers
- Détail par entreprise
- Actions de reversement
- Historique complet
- Export comptable

### 7.2 Interface ENTREPRISE
- Visualisation de sa balance
- Détail commissions période
- Historique des versements
- Téléchargement factures
- Contestation si nécessaire

## ✅ 8. FORMULE RÉCAPITULATIVE

```
Pour chaque entreprise sur une période :

1. IDENTIFIER les réservations validées (date_code_validation NOT NULL)
2. CALCULER commission totale = CA_total × 11%
3. SÉPARER :
   - Mobile Money SUCCESS → Admin a déjà l'argent
   - Cash/Autre → Entreprise a l'argent
4. DÉTERMINER :
   - À reverser = Total_Mobile_Money × 89%
   - À collecter = Total_Cash × 11%
5. BALANCE NETTE = À reverser - À collecter
6. RÈGLEMENT selon le signe de la balance
```

## 🗄️ 9. MODIFICATIONS STRUCTURE BASE DE DONNÉES

### 9.1 Table `commissions_detail` - Colonnes à ajouter
```sql
ALTER TABLE commissions_detail ADD COLUMN IF NOT EXISTS
  ca_mobile_money NUMERIC DEFAULT 0,
  ca_cash NUMERIC DEFAULT 0,
  nombre_reservations_mobile INTEGER DEFAULT 0,
  nombre_reservations_cash INTEGER DEFAULT 0,
  montant_encaisse NUMERIC DEFAULT 0,
  montant_a_reverser NUMERIC DEFAULT 0,
  montant_commission_cash NUMERIC DEFAULT 0,
  balance_nette NUMERIC DEFAULT 0,
  statut_balance VARCHAR;
```

### 9.2 Nouvelles Tables à créer
- `reversements_entreprises` : Historique des reversements Mobile Money
- `collectes_commissions_cash` : Suivi des commissions cash à collecter
- `balance_entreprises` : Position temps réel par entreprise

## 🚀 10. PROCHAINES ÉTAPES TECHNIQUES

1. **Base de données**
   - Exécuter les ALTER TABLE pour `commissions_detail`
   - Créer les 3 nouvelles tables
   - Migrer les données existantes

2. **Services Backend**
   - Service calcul automatique Mobile Money vs Cash
   - Service génération balance entreprise
   - Service notification automatique

3. **Interfaces**
   - Dashboard financier Super-Admin
   - Page balance Entreprise
   - Système de notifications

4. **Rapports**
   - Export Excel détaillé
   - Génération PDF factures
   - Rapport de réconciliation

---

📅 **Date de création** : 27/08/2025
👤 **Auteur** : Plan détaillé du système de commissions
🎯 **Objectif** : Automatiser et clarifier la gestion des flux financiers