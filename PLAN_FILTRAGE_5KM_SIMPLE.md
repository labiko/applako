# 📍 PLAN SIMPLE - FILTRAGE RÉSERVATIONS 5KM

## 🎯 **OBJECTIF**
Afficher **UNIQUEMENT** les réservations dans un rayon de **5km** du conducteur connecté

---

## 📊 **SITUATION ACTUELLE**
- **Conducteur** : `position_actuelle` (geography)
- **Réservation** : `position_depart` (text/WKB)
- **Besoin** : Filtrer côté database avant envoi à l'app

---

## 🛠️ **PLAN D'IMPLÉMENTATION SIMPLE**

### **ÉTAPE 1️⃣ : REQUÊTE SQL DE BASE**
```sql
-- Test de base pour vérifier le filtrage
SELECT 
    r.id,
    r.depart_nom,
    r.destination_nom,
    r.statut,
    ROUND((ST_Distance(
        '0101000020E61000000E2DB29DEFA70440AAF1D24D62504840'::geography, -- Position conducteur
        r.position_depart::geography
    ) / 1000)::numeric, 2) as distance_km
FROM reservations r
WHERE r.statut = 'pending'
  AND ST_DWithin(
      '0101000020E61000000E2DB29DEFA70440AAF1D24D62504840'::geography,
      r.position_depart::geography,
      5000  -- 5km en mètres
  )
ORDER BY distance_km;
```

### **ÉTAPE 2️⃣ : FONCTION POSTGRESQL**
```sql
CREATE OR REPLACE FUNCTION get_reservations_nearby(
    p_conducteur_position TEXT,
    p_max_distance_km INTEGER DEFAULT 5
)
RETURNS TABLE(
    id UUID,
    customer_name TEXT,
    customer_phone TEXT,
    pickup_location TEXT,
    destination TEXT,
    pickup_date DATE,
    pickup_time TIME,
    status TEXT,
    price NUMERIC,
    notes TEXT,
    distance_km NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.customer_name,
        r.customer_phone,
        r.depart_nom as pickup_location,
        r.destination_nom as destination,
        r.pickup_date,
        r.pickup_time,
        r.statut as status,
        r.prix_total as price,
        r.notes,
        ROUND((ST_Distance(
            p_conducteur_position::geography,
            r.position_depart::geography
        ) / 1000)::numeric, 2) as distance_km
    FROM reservations r
    WHERE r.statut = 'pending'
      AND ST_DWithin(
          p_conducteur_position::geography,
          r.position_depart::geography,
          p_max_distance_km * 1000
      )
    ORDER BY ST_Distance(
        p_conducteur_position::geography,
        r.position_depart::geography
    );
END;
$$ LANGUAGE plpgsql;
```

### **ÉTAPE 3️⃣ : MODIFICATION SUPABASE SERVICE (Ionic)**
```typescript
// src/app/services/supabase.service.ts

async getPendingReservations(): Promise<any[]> {
  try {
    // Récupérer position du conducteur connecté
    const conducteur = await this.getCurrentConducteur();
    if (!conducteur?.position_actuelle) {
      return [];
    }

    // Appeler fonction PostgreSQL avec position
    const { data, error } = await this.supabase
      .rpc('get_reservations_nearby', {
        p_conducteur_position: conducteur.position_actuelle,
        p_max_distance_km: 5
      });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erreur récupération réservations 5km:', error);
    return [];
  }
}
```

### **ÉTAPE 4️⃣ : PAGE RÉSERVATIONS (Ionic)**
```typescript
// src/app/reservations/reservations.page.ts

async loadReservations() {
  this.isLoading = true;
  try {
    // Récupère uniquement réservations < 5km
    this.reservations = await this.supabaseService.getPendingReservations();
    
    // Optionnel: Afficher distance
    this.reservations.forEach(r => {
      console.log(`${r.pickup_location}: ${r.distance_km}km`);
    });
  } catch (error) {
    console.error('Erreur chargement:', error);
  } finally {
    this.isLoading = false;
  }
}
```

---

## 📝 **FICHIERS À MODIFIER**

1. **Database** : Créer fonction `get_reservations_nearby()`
2. **SupabaseService** : Modifier `getPendingReservations()`
3. **ReservationsPage** : Aucun changement (transparent)

---

## 🧪 **TESTS**

### **Test 1: Réservations proches**
```sql
-- Créer réservation à 2km
INSERT INTO reservations (position_depart, ...) 
VALUES ('POINT proche du conducteur'::geography, ...);
-- DOIT apparaître
```

### **Test 2: Réservations lointaines**
```sql
-- Créer réservation à 10km
INSERT INTO reservations (position_depart, ...) 
VALUES ('POINT loin du conducteur'::geography, ...);
-- NE DOIT PAS apparaître
```

---

## ✅ **RÉSULTAT ATTENDU**
- Conducteur voit **UNIQUEMENT** réservations < 5km
- Performance optimisée (filtrage database)
- Transparent pour l'utilisateur

---

## 🚀 **IMPLÉMENTATION RAPIDE**
```bash
# 1. Créer fonction PostgreSQL
# 2. Modifier SupabaseService.getPendingReservations()
# 3. Tester avec positions variées
# Temps estimé: 30 minutes
```