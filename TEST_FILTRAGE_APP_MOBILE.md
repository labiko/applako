# 📱 PHASE 3 - TEST APP MOBILE FILTRAGE 5KM

## ✅ **MODIFICATIONS TERMINÉES**

### **PHASE 1** ✅ Fonction PostgreSQL créée
- `get_reservations_nearby_conducteur()` opérationnelle
- Tests SQL validés

### **PHASE 2** ✅ Service Ionic modifié  
- `SupabaseService.getPendingReservations()` utilise filtrage 5km
- Injection `AuthService` pour récupérer conducteur connecté
- Fallback vers ancienne méthode si erreur
- Logs détaillés pour debug

---

## 🧪 **PHASE 3 - TESTS APP MOBILE**

### **TEST 1: Vérification fonctionnement de base**
1. **Ouvrir app mobile** 
2. **Se connecter** avec conducteur balde (`69e0cde9-14a0-4dde-86c1-1fe9a306f2fa`)
3. **Aller page Réservations**
4. **Vérifier logs console** :
   ```
   🔍 Filtrage réservations 5km pour conducteur: 69e0cde9-14a0-4dde-86c1-1fe9a306f2fa
   ✅ X réservation(s) dans 5km trouvée(s)
   ```

### **TEST 2: Créer réservation proche (DOIT apparaître)**
```sql
-- Réservation à 2km de balde (DOIT être visible)
INSERT INTO reservations (
    client_phone, 
    depart_nom, 
    destination_nom,
    position_depart, 
    vehicle_type,
    statut,
    prix_total
) VALUES (
    '+33123456789', 
    'TEST PROCHE - Lieusaint Centre', 
    'TEST PROCHE - Melun',
    ST_GeomFromText('POINT(2.5820000 48.6280000)', 4326),
    'moto',
    'pending',
    25.00
);
```
**Résultat attendu** : Réservation apparaît dans la liste

### **TEST 3: Créer réservation lointaine (NE DOIT PAS apparaître)**
```sql
-- Réservation à 35km de balde (NE DOIT PAS être visible)
INSERT INTO reservations (
    client_phone, 
    depart_nom, 
    destination_nom,
    position_depart, 
    vehicle_type,
    statut,
    prix_total
) VALUES (
    '+33987654321', 
    'TEST LOIN - Gare de Lyon Paris', 
    'TEST LOIN - Aéroport CDG',
    ST_GeomFromText('POINT(2.3734 48.8443)', 4326),
    'moto',
    'pending',
    85.00
);
```
**Résultat attendu** : Réservation N'apparaît PAS dans la liste

### **TEST 4: Comparaison AVANT/APRÈS**
```sql
-- Vérifier différence
SELECT 
    'AVANT (toutes)' as mode,
    COUNT(*) as nb_reservations
FROM reservations 
WHERE statut = 'pending' 
  AND conducteur_id IS NULL
  AND vehicle_type = 'moto'

UNION ALL

SELECT 
    'APRÈS (< 5km)' as mode,
    COUNT(*) as nb_reservations
FROM get_reservations_nearby_conducteur(
    '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa',
    5
);
```

---

## 🔍 **DEBUG SI PROBLÈME**

### **Vérifier logs console app :**
- `🔍 Filtrage réservations 5km pour conducteur: XXX` ✅
- `✅ X réservation(s) dans 5km trouvée(s)` ✅
- `Erreur fonction filtrage 5km:` ❌ = Problème PostgreSQL
- `Aucun conducteur connecté` ❌ = Problème AuthService

### **Fallback activé ?**
Si logs montrent `Error fetching reservations (legacy)` = Fonction PostgreSQL échoue

### **Conducteur connecté ?**
Vérifier dans DevTools : `localStorage.getItem('currentConducteur')`

---

## ✅ **CRITÈRES DE RÉUSSITE**

1. **App fonctionne** : Page réservations se charge normalement
2. **Logs corrects** : Filtrage 5km affiché dans console
3. **Réservation proche** : Visible dans liste
4. **Réservation lointaine** : Invisible dans liste
5. **Performance** : Chargement < 3 secondes

---

## 🎯 **RÉSULTAT ATTENDU**

**Le conducteur ne voit QUE les réservations dans son rayon de 5km !**
- Plus de réservations à 50km+
- Interface identique (transparent)
- Performance améliorée (moins de données)