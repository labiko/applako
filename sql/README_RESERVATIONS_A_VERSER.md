# Vue `reservations_a_verser` - Documentation

## 🎯 Objectif

Cette vue remplace la requête complexe dans `VersementService.getMontantsAVerser()` par une vue optimisée qui inclut la **détection automatique du mode de paiement** (Mobile Money vs Cash).

## 🚀 Installation

### 1. Créer la vue en base de données

1. Ouvrir **Supabase Dashboard** → **SQL Editor**
2. Copier-coller le contenu de `create_reservations_a_verser_view.sql`
3. Cliquer sur **"Run"** pour exécuter le script
4. Vérifier dans **Database** → **Views** que `reservations_a_verser` apparaît

### 2. Tester la vue (optionnel)

1. Exécuter les requêtes de `test_reservations_a_verser_view.sql`
2. Vérifier que les résultats sont cohérents

## 🔧 Fonctionnalités

### Détection automatique du paiement

```sql
-- La vue détecte automatiquement le mode de paiement :
CASE 
    WHEN EXISTS (
        SELECT 1 FROM lengopay_payments lp 
        WHERE lp.reservation_id = r.id 
        AND lp.status = 'SUCCESS'
    ) 
    THEN 'mobile_money'
    ELSE 'cash'
END as mode_paiement
```

### Champs disponibles

| Champ | Type | Description |
|-------|------|-------------|
| `id` | UUID | ID de la réservation |
| `client_phone` | Text | Téléphone du client |
| `prix_total` | Numeric | Montant de la course |
| `conducteur_nom` | Text | Nom du conducteur |
| `conducteur_prenom` | Text | Prénom du conducteur |
| `entreprise_id` | UUID | ID de l'entreprise |
| **`mode_paiement`** | Text | **🆕 'mobile_money' ou 'cash'** |
| ... | ... | Tous les autres champs de `reservations` |

## 💡 Utilisation dans le code

### Avant (requête complexe)
```typescript
// Requête complexe avec multiples JOINs et logique métier
const reservations = await this.complexQuery();
// + Détection manuelle du paiement
```

### Après (vue optimisée)
```typescript
// Simple appel à la vue optimisée
const { data: reservations } = await this.supabaseService.client
  .from('reservations_a_verser')  // 🎯 Vue optimisée
  .select('*')
  .eq('entreprise_id', entrepriseId);

// Le champ mode_paiement est déjà calculé !
console.log(reservations[0].mode_paiement); // 'mobile_money' ou 'cash'
```

## 🎯 Avantages

✅ **Performance** : Une seule requête au lieu de multiples JOINs  
✅ **Simplicité** : Plus de logique complexe dans le code TypeScript  
✅ **Fiabilité** : Détection automatique et consistante du paiement  
✅ **Maintenance** : Logique centralisée en base de données  
✅ **Évolutivité** : Facile d'ajouter de nouveaux champs  

## 📊 Impact sur l'application

### Page concernée
- **Entreprise → Versements → Onglet "À VERSER"**
- URL: `http://localhost:4200/entreprise/versements`

### Service modifié
- **`VersementService.getMontantsAVerser()`** 
- Fichier: `src/app/services/versement.service.ts:165`

### Résultat attendu
- ✅ Affichage correct des réservations à verser
- ✅ Détection automatique Mobile Money/Cash
- ✅ Performance améliorée
- ✅ Plus d'erreurs de détection de paiement

## 🔍 Diagnostic

Si la vue ne fonctionne pas :

```sql
-- Vérifier que la vue existe
SELECT * FROM information_schema.views 
WHERE table_name = 'reservations_a_verser';

-- Tester une requête simple
SELECT COUNT(*) FROM reservations_a_verser;

-- Vérifier les permissions
GRANT SELECT ON reservations_a_verser TO anon, authenticated;
```

## 🆙 Mise à jour

Pour modifier la vue :
1. Éditer `create_reservations_a_verser_view.sql`
2. Re-exécuter le script (CREATE OR REPLACE)
3. Redémarrer l'application Ionic si nécessaire

---

**✅ Vue créée et intégrée avec succès !**