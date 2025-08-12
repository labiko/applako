# Système de Filtrage par Rayon Personnalisé

## 📍 Vue d'ensemble

Le système de filtrage par rayon permet à chaque conducteur de personnaliser la distance maximale des réservations qu'il souhaite recevoir. Ce système combine la géolocalisation GPS du conducteur avec un rayon de recherche configurable pour optimiser l'attribution des courses.

## 🏗️ Architecture

### 1. Base de données

**Table `conducteurs` :**
```sql
ALTER TABLE conducteurs ADD COLUMN rayon_km_reservation INTEGER DEFAULT NULL;
```

- `rayon_km_reservation` : Rayon personnalisé en km (NULL = 5km par défaut)
- Valeurs acceptées : 1-50km
- Gestion via interface utilisateur dans la page Profile

### 2. Fonction RPC PostgreSQL

**`get_reservations_within_radius()`**
```sql
CREATE OR REPLACE FUNCTION get_reservations_within_radius(
  conducteur_position TEXT,    -- Position WKB hex du conducteur
  radius_meters INTEGER,       -- Rayon en mètres
  vehicle_type_filter TEXT,    -- Type véhicule ('moto' ou 'voiture')
  statut_filter TEXT          -- Statut réservation ('pending' ou 'scheduled')
)
RETURNS SETOF reservations
```

**Logique de filtrage :**
- Filtre par statut (pending/scheduled)
- Filtre par type de véhicule
- Filtre par distance géographique (PostGIS ST_DWithin)
- Exclut les réservations déjà assignées (conducteur_id IS NULL)

### 3. Gestion des formats géométriques

**Problème identifié :** Incohérence des types de données
- `position_depart` : TEXT (WKB hexadécimal)
- `position_arrivee` : GEOMETRY PostGIS natif
- `position_actuelle` : GEOMETRY PostGIS natif

**Solution implémentée :**
```sql
-- Conversion WKB hex vers GEOMETRY
ST_GeomFromWKB(decode(r.position_depart, 'hex'))::geography
-- Position conducteur déjà en GEOMETRY
conducteur_position::geometry::geography
```

## 💻 Implémentation côté application

### 1. Service SupabaseService

**Méthode `getPendingReservations()` :**
```typescript
// Récupération du rayon personnalisé
const rayonKm = conducteurData.rayon_km_reservation || 5;
const rayonMetres = rayonKm * 1000;

// Appel RPC avec filtrage distance
const { data: pendingData } = await this.supabase
  .rpc('get_reservations_within_radius', {
    conducteur_position: conducteurData.position_actuelle,
    radius_meters: rayonMetres,
    vehicle_type_filter: currentConducteur.vehicle_type,
    statut_filter: 'pending'
  });
```

**Gestion d'erreur avec fallback :**
```typescript
if (pendingError || scheduledError) {
  console.error('Erreur RPC filtrage distance:', { pendingError, scheduledError });
  return this.getPendingAndScheduledReservationsLegacy();
}
```

**Nouvelle méthode `updateConducteurRayon()` :**
```typescript
async updateConducteurRayon(conducteurId: string, rayonKm: number | null): Promise<boolean>
```

### 2. Interface utilisateur - Page Profile

**Composants ajoutés :**
- `ion-range` : Slider 1-50km
- `ion-chip` : Sélection rapide (5, 10, 20, 50km)
- Toast de confirmation
- Affichage temps réel du rayon sélectionné

**Méthodes clés :**
```typescript
// Gestion changement slider
async onRayonChange(event: any) {
  const newRayon = event.detail.value;
  await this.updateRayon(newRayon);
}

// Sélection rapide via chips
async setRayon(rayon: number) {
  await this.updateRayon(rayon);
}

// Mise à jour en base et local
private async updateRayon(rayon: number) {
  const success = await this.supabaseService.updateConducteurRayon(conducteurId, rayon);
  if (success) {
    this.driver.rayon_km_reservation = rayon;
    // Mise à jour AuthService
    conducteur.rayon_km_reservation = rayon;
    await this.showToast(`Rayon mis à jour : ${rayon}km`, 'success');
  }
}
```

## 🔄 Intégration avec le système GPS

### 1. Déclenchement automatique

**Dans `reservations.page.ts` :**
```typescript
async ionViewWillEnter() {
  await this.syncConducteurStatus();
  
  // Démarrage GPS si conducteur en ligne
  if (this.isOnline) {
    await this.geolocationService.startLocationTracking();
  }
}
```

### 2. Mise à jour position conducteur

**Cycle de mise à jour toutes les 5 minutes :**
1. Capture GPS (GeolocationService)
2. Conversion en WKB (createWKBPoint)
3. Sauvegarde base de données (updateConducteurPosition)
4. Rafraîchissement réservations avec nouveau rayon

## 📊 Exemples de fonctionnement

### Cas d'usage typique

**Conducteur Balde (Évry) :**
- Position : 48.6277, 2.5890
- Rayon par défaut : 5km (NULL en base)
- Type véhicule : moto

**Réservation Paris Gare du Nord :**
- Position : 48.880048, 2.355323
- Distance : ~35km
- Type : moto

**Résultat :** ❌ Réservation NON affichée (35km > 5km)

**Si Balde change son rayon à 50km :**
- **Résultat :** ✅ Réservation affichée (35km < 50km)

### Configuration rayon

| Rayon | Zone couverte | Utilisation recommandée |
|-------|---------------|------------------------|
| 5km   | Hypercentre   | Zone urbaine dense |
| 10km  | Centre étendu | Banlieue proche |
| 20km  | Agglomération | Zone périurbaine |
| 50km  | Région        | Zone rurale/longue distance |

## 🐛 Gestion d'erreur

### 1. Erreurs RPC communes

**Erreur 500 - Invalid geometry :**
- Cause : Format WKB incorrect
- Solution : Vérifier décodage hex

**Position conducteur manquante :**
- Fallback automatique vers méthode legacy
- Log d'avertissement
- Pas de filtrage distance

### 2. Logs de débogage

```typescript
console.log(`📍 Filtrage réservations avec rayon: ${rayonKm}km`);
console.log('🔍 DEBUG RPC Paramètres:', {
  conducteur_position: conducteurData.position_actuelle,
  radius_meters: rayonMetres,
  vehicle_type_filter: currentConducteur.vehicle_type,
  statut_filter: 'pending'
});
```

## ⚡ Performance

### Optimisations

1. **Index spatial PostGIS** sur les colonnes position
2. **Cache des rayons** dans AuthService
3. **Fallback rapide** en cas d'erreur RPC
4. **Requêtes parallèles** pending + scheduled

### Métriques

- **Temps de réponse RPC :** < 100ms typique
- **Précision GPS :** 5-50m selon conditions
- **Mise à jour position :** Toutes les 5 minutes
- **Filtrage temps réel :** Instantané côté base

## 🚀 Évolutions futures

### Améliorations possibles

1. **Normalisation structure BDD :** Convertir `position_depart` en GEOMETRY
2. **Cache intelligent :** Mise en cache des résultats par zone
3. **Rayon dynamique :** Ajustement automatique selon la demande
4. **Analytics :** Statistiques d'utilisation par rayon
5. **Géofencing :** Zones prédéfinies populaires

### Extensions

1. **Filtres additionnels :** Prix, horaires, type client
2. **Priorités :** Scoring des réservations par distance/prix
3. **Historique :** Tracking des changements de rayon
4. **Notifications :** Alertes pour courses hors rayon

## 📝 Notes techniques

- **Système de coordonnées :** WGS84 (SRID 4326)
- **Calcul distance :** Méthode géodésique (ST_DWithin)
- **Format stockage :** WKB hexadécimal + GEOMETRY natif
- **Thread safety :** Atomicité garantie par PostgreSQL
- **Fallback :** Méthode legacy sans filtrage distance