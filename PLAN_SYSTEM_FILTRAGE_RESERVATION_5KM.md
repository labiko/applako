# 📍 PLAN SYSTÈME FILTRAGE RÉSERVATIONS 5KM

## 🎯 **OBJECTIF**
Afficher **UNIQUEMENT** les réservations dans un rayon de **5km** du conducteur connecté dans l'app mobile Ionic

---

## 📊 **ANALYSE STRUCTURE DATABASE**

### **Table `reservations` (Structure réelle):**
```sql
- id: UUID PRIMARY KEY
- client_phone: TEXT NOT NULL
- vehicle_type: TEXT ('moto', 'voiture')
- position_depart: TEXT (format WKB)
- statut: TEXT ('pending', 'accepted', 'refused', etc.)
- conducteur_id: UUID (NULL si non assigné)
- depart_nom: TEXT
- destination_nom: CHARACTER VARYING
- prix_total: NUMERIC
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
- commentaire: TEXT
```

### **Table `conducteurs`:**
```sql
- id: UUID PRIMARY KEY
- position_actuelle: GEOGRAPHY (position temps réel)
```

---

## 🏗️ **ARCHITECTURE ACTUELLE**

### **Service Supabase actuel:**
```typescript
async getPendingReservations(conducteurId?: string) {
  // Récupère TOUTES les réservations pending
  // Pas de filtrage géographique
}
```

### **Page Réservations:**
```typescript
// Affiche toutes les réservations reçues du service
// Conducteur voit réservations à 100km+
```

---

## 🛠️ **PLAN D'IMPLÉMENTATION**

### **PHASE 1: DATABASE (PostgreSQL)**

#### **1.1 Créer fonction filtrage 5km**
```sql
CREATE FUNCTION get_reservations_nearby_conducteur(
    p_conducteur_id UUID,
    p_max_distance_km INTEGER DEFAULT 5
) RETURNS TABLE(...) AS $$
```

#### **1.2 Test fonction avec données réelles**
- Vérifier distance conducteur balde vs réservations
- Valider que seules réservations < 5km sont retournées

### **PHASE 2: SERVICE IONIC**

#### **2.1 Méthode getCurrentConducteur()**
```typescript
// Récupérer conducteur connecté avec sa position
async getCurrentConducteur(): Promise<any> {
  // Return conducteur avec position_actuelle
}
```

#### **2.2 Modifier getPendingReservations()**
```typescript
// Utiliser fonction PostgreSQL au lieu de requête directe
// Passer ID conducteur connecté
```

### **PHASE 3: TESTS**

#### **3.1 Test réservations proches**
- Créer réservation à 2km de balde
- Vérifier affichage dans app

#### **3.2 Test réservations lointaines**
- Créer réservation à 10km de balde
- Vérifier que NOT affiché dans app

#### **3.3 Test changement position**
- Simuler déplacement conducteur
- Vérifier mise à jour liste

---

## 📋 **DÉTAIL IMPLÉMENTATION**

### **ÉTAPE 1: Fonction PostgreSQL**
```sql
CREATE OR REPLACE FUNCTION get_reservations_nearby_conducteur(
    p_conducteur_id UUID,
    p_max_distance_km INTEGER DEFAULT 5
)
RETURNS TABLE(
    id UUID,
    client_phone TEXT,
    vehicle_type TEXT,
    depart_nom TEXT,
    destination_nom CHARACTER VARYING,
    prix_total NUMERIC,
    created_at TIMESTAMP,
    commentaire TEXT,
    distance_km NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.client_phone,
        r.vehicle_type,
        r.depart_nom,
        r.destination_nom,
        r.prix_total,
        r.created_at,
        r.commentaire,
        ROUND((ST_Distance(
            c.position_actuelle,  -- GEOGRAPHY du conducteur
            r.position_depart::geography  -- TEXT vers GEOGRAPHY
        ) / 1000)::numeric, 2) as distance_km
    FROM reservations r
    CROSS JOIN conducteurs c
    WHERE r.statut = 'pending'
      AND r.conducteur_id IS NULL  -- Non assignées
      AND c.id = p_conducteur_id
      AND r.vehicle_type = c.vehicle_type  -- Matching véhicule
      AND ST_DWithin(
          c.position_actuelle,
          r.position_depart::geography,
          p_max_distance_km * 1000
      )
    ORDER BY ST_Distance(c.position_actuelle, r.position_depart::geography);
END;
$$ LANGUAGE plpgsql;
```

### **ÉTAPE 2: Service Ionic**
```typescript
// Ajouter méthode getCurrentConducteur
async getCurrentConducteur(): Promise<any> {
  const user = this.currentUser;
  if (!user?.id) return null;
  
  const { data } = await this.supabase
    .from('conducteurs')
    .select('id, position_actuelle, vehicle_type')
    .eq('id', user.id)
    .single();
  
  return data;
}

// Modifier getPendingReservations
async getPendingReservations(): Promise<any[]> {
  const conducteur = await this.getCurrentConducteur();
  if (!conducteur) return [];

  const { data } = await this.supabase
    .rpc('get_reservations_nearby_conducteur', {
      p_conducteur_id: conducteur.id,
      p_max_distance_km: 5
    });

  return data || [];
}
```

### **ÉTAPE 3: Tests SQL**
```sql
-- Test avec balde
SELECT * FROM get_reservations_nearby_conducteur(
  '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa',
  5
);

-- Comparaison avant/après
SELECT 'AVANT' as mode, COUNT(*) as nb_reservations
FROM reservations WHERE statut = 'pending'
UNION ALL
SELECT 'APRÈS' as mode, COUNT(*) as nb_reservations
FROM get_reservations_nearby_conducteur(
  '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa', 5
);
```

---

## ✅ **CRITÈRES DE RÉUSSITE**

1. **Fonction PostgreSQL** : Retourne uniquement réservations < 5km
2. **Service Ionic** : Utilise fonction au lieu de requête directe
3. **App Mobile** : Affiche seulement réservations proches
4. **Performance** : Temps réponse < 2s
5. **Transparence** : Aucun changement UI nécessaire

---

## 🚀 **ORDRE D'EXÉCUTION**

1. **Créer fonction PostgreSQL** + tests
2. **Modifier SupabaseService.getCurrentConducteur()**
3. **Modifier SupabaseService.getPendingReservations()**
4. **Test app mobile** avec réservations variées
5. **Validation** performance et UX

---

## 📝 **FICHIERS À CRÉER/MODIFIER**

- `CREATE_FUNCTION_FILTRAGE_5KM_FINAL.sql`
- `src/app/services/supabase.service.ts`
- `TEST_FILTRAGE_RESERVATIONS.sql`

---

**🎯 RÉSULTAT : Conducteurs voient uniquement réservations dans leur zone de 5km**