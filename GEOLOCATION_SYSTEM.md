# Système de Géolocalisation et Calcul de Durée - AppLakoChauffeur

## Vue d'ensemble

Le système de géolocalisation d'AppLakoChauffeur combine un tracking automatique des positions et un calcul optimisé des durées de trajet. Il utilise les technologies Capacitor Geolocation et PostGIS pour offrir une expérience précise aux chauffeurs.

## Architecture du Système

### 1. Services Principaux

#### GeolocationService (`src/app/services/geolocation.service.ts`)
- **Responsabilité** : Tracking automatique de la position GPS
- **Fréquence** : Mise à jour toutes les 5 minutes (300 000 ms)
- **Plateforme** : Mobile uniquement (désactivé sur web/Vercel)

#### SupabaseService (`src/app/services/supabase.service.ts`)
- **Responsabilité** : Stockage des positions en format WKB PostGIS
- **Base de données** : Table `conducteurs` avec colonne `position_actuelle`

### 2. Formats de Coordonnées

Le système gère deux formats différents :

#### Format WKB (Well-Known Binary) - PostGIS
- **Utilisation** : Positions des conducteurs
- **Exemple** : `0101000020E6100000BC96900F7AB604401C7C613255504840`
- **Structure** :
  - 1 byte : Endian (01)
  - 4 bytes : Type géométrie (01000020)
  - 4 bytes : SRID (E6100000 = 4326)
  - 8 bytes : Longitude (little-endian)
  - 8 bytes : Latitude (little-endian)

#### Format POINT - PostgreSQL Standard
- **Utilisation** : Positions des réservations
- **Exemple** : `POINT(2.5847236 48.6273519)`
- **Structure** : `POINT(longitude latitude)`

## Système de Tracking GPS (5 minutes)

### Configuration et Démarrage

```typescript
// Démarrage automatique du tracking
async startLocationTracking() {
  // Vérification plateforme (mobile uniquement)
  if (Capacitor.getPlatform() === 'web') {
    console.log('GPS tracking disabled on web - mobile only feature');
    return;
  }

  // Demande de permissions
  const permissions = await Geolocation.requestPermissions();
  
  // Mise à jour immédiate puis interval de 5 minutes
  await this.updateLocation();
  this.locationInterval = setInterval(async () => {
    if (this.isTracking) {
      await this.updateLocation();
    }
  }, 300000); // 5 minutes = 300 000 ms
}
```

### Acquisition GPS Multi-tentatives

Le système utilise une stratégie d'acquisition GPS optimisée :

```typescript
private async getBestPosition(): Promise<any> {
  const maxRetries = 3;
  const desiredAccuracy = 50; // mètres
  let bestPosition: any = null;
  let bestAccuracy = Infinity;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const config = {
      enableHighAccuracy: true,
      timeout: attempt === 1 ? 15000 : 25000,
      maximumAge: attempt === 1 ? 0 : 30000
    };

    const position = await Geolocation.getCurrentPosition(config);
    
    // Garder la meilleure précision
    if (position.coords.accuracy < bestAccuracy) {
      bestPosition = position;
      bestAccuracy = position.coords.accuracy;
    }
    
    // Arrêter si précision suffisante
    if (position.coords.accuracy <= desiredAccuracy) {
      break;
    }
  }

  return bestPosition;
}
```

#### Stratégie d'Acquisition
1. **Tentative 1** : Haute précision, pas de cache (timeout 15s)
2. **Tentative 2** : Haute précision, cache 30s (timeout 25s)
3. **Tentative 3** : Haute précision, cache 30s (timeout 25s)
4. **Fallback** : Précision normale, cache 5min (timeout 30s)

### Gestion du Statut En Ligne/Hors Ligne

```typescript
// Le tracking s'arrête automatiquement si le conducteur passe hors ligne
if (conducteur?.hors_ligne) {
  console.log('Conductor is offline, skipping location update');
  return;
}
```

### Stockage en Base de Données

```typescript
async updateConducteurPosition(
  conducteurId: string, 
  longitude: number, 
  latitude: number, 
  accuracy?: number
): Promise<boolean> {
  const wkbHex = this.createWKBPoint(longitude, latitude);
  const updateData: any = {
    position_actuelle: wkbHex,
    date_update_position: new Date().toISOString()
  };
  
  if (accuracy !== undefined) {
    updateData.accuracy = accuracy;
  }
  
  const { error } = await this.supabase
    .from('conducteurs')
    .update(updateData)
    .eq('id', conducteurId);
    
  return !error;
}
```

## Système de Calcul de Durée Optimisé

### Algorithme de Calcul

Le système utilise la **formule de Haversine** pour calculer la distance réelle entre deux points GPS, puis applique un facteur de vitesse optimisé.

#### Formule de Haversine

```typescript
private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = this.toRad(lat2 - lat1);
  const dLng = this.toRad(lng2 - lng1);
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
            
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance en km
}
```

#### Facteur de Vitesse Optimisé

```typescript
// Calcul optimisé : 1.8 min/km = 33 km/h moyenne
const duration = Math.round(distance * 1.8);
```

**Justification du facteur 1.8 min/km :**
- **Vitesse moyenne** : 33 km/h en milieu urbain
- **Prise en compte** : Embouteillages, feux de circulation, arrêts
- **Comparaison** :
  - Ancien système : 3 min/km (20 km/h) - trop conservateur
  - Nouveau système : 1.8 min/km (33 km/h) - plus réaliste

### Exemples de Calcul

| Distance | Ancien Calcul | Nouveau Calcul | Différence |
|----------|---------------|----------------|------------|
| 10 km    | 30 min        | 18 min         | -40%       |
| 25 km    | 75 min        | 45 min         | -40%       |
| 31.5 km  | 95 min        | 57 min         | -40%       |

## Décodage des Coordonnées

### Fonction d'Extraction Universelle

```typescript
private extractCoordinates(pointString: string): {lat: number, lng: number} | null {
  // Format POINT : POINT(2.5847236 48.6273519)
  if (pointString.startsWith('POINT(')) {
    const coords = pointString.replace('POINT(', '').replace(')', '').split(' ');
    return {
      lng: parseFloat(coords[0]),
      lat: parseFloat(coords[1])
    };
  }
  
  // Format WKB : 0101000020E6100000...
  if (pointString.length >= 50 && 
      pointString.match(/^[0-9A-F]+$/i) && 
      pointString.toUpperCase().startsWith('0101000020E6100000')) {
    return this.decodeWKB(pointString);
  }
  
  return null;
}
```

### Décodage WKB Avancé

```typescript
private decodeWKB(wkbHex: string): {lat: number, lng: number} | null {
  // Vérification format et SRID
  const geometryType = wkbHex.substring(2, 10); // 01000020
  const srid = wkbHex.substring(10, 18); // E6100000
  
  if (geometryType.toUpperCase() === '01000020' && 
      srid.toUpperCase() === 'E6100000') {
    
    // Extraction coordonnées (little-endian)
    const xHex = wkbHex.substring(18, 34); // Longitude
    const yHex = wkbHex.substring(34, 50); // Latitude
    
    const lng = this.hexToFloat64LittleEndian(xHex);
    const lat = this.hexToFloat64LittleEndian(yHex);
    
    // Validation des coordonnées
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }
  
  return null;
}
```

## Configuration Technique

### Variables Clés

```typescript
// Intervalle de mise à jour GPS
const GPS_UPDATE_INTERVAL = 300000; // 5 minutes

// Facteur de calcul de durée
const DURATION_FACTOR = 1.8; // minutes par km

// Précision GPS désirée
const DESIRED_GPS_ACCURACY = 50; // mètres

// Nombre de tentatives GPS
const MAX_GPS_RETRIES = 3;
```

### Permissions Requises

```json
// capacitor.config.ts
{
  "plugins": {
    "Geolocation": {
      "permissions": ["location"]
    }
  }
}
```

### Base de Données

#### Table `conducteurs`
- `position_actuelle` : TEXT (format WKB PostGIS)
- `date_update_position` : TIMESTAMP
- `accuracy` : NUMERIC (précision GPS en mètres)
- `hors_ligne` : BOOLEAN (contrôle le tracking)

#### Table `reservations`
- `position_depart` : TEXT (format POINT)
- `position_arrivee` : TEXT (format POINT)

## Optimisations de Performance

### 1. Gestion de la Mémoire
- Nettoyage automatique des intervals
- Arrêt du tracking hors ligne
- Désactivation sur plateforme web

### 2. Stratégie de Cache
- Utilisation du cache GPS pour les tentatives multiples
- Mise à jour locale immédiate des données conducteur

### 3. Gestion d'Erreurs
```typescript
try {
  const position = await this.getBestPosition();
  // Traitement...
} catch (error) {
  console.error('GPS acquisition failed:', error);
  // Fallback vers position réseau
}
```

## Monitoring et Debug

### Logs de Développement

```typescript
console.log(`Position attempt ${attempt}/${maxRetries}`);
console.log(`Accuracy: ${accuracy}m`);
console.log(`Distance calculée: ${distance.toFixed(1)} km`);
console.log(`Durée estimée: ${duration} min`);
```

### Métriques de Performance
- Précision GPS moyenne
- Temps d'acquisition GPS
- Succès/échecs des mises à jour
- Fréquence réelle des updates

## Cas d'Usage

### 1. Chauffeur en Course
- Position mise à jour toutes les 5 minutes
- Calcul automatique des distances vers nouvelles réservations
- Estimation temps d'arrivée en temps réel

### 2. Chauffeur en Attente
- Tracking GPS actif si en ligne
- Calcul de proximité vers réservations disponibles
- Optimisation des affectations

### 3. Chauffeur Hors Ligne
- Arrêt automatique du tracking GPS
- Conservation de la dernière position connue
- Reprise automatique du tracking au retour en ligne

## Évolutions Futures

### Optimisations Possibles
1. **Machine Learning** : Adaptation du facteur vitesse selon l'historique
2. **Traffic API** : Intégration données trafic en temps réel
3. **Géofencing** : Zones de vitesse différenciées
4. **Prédiction** : Estimation basée sur l'historique des trajets

### Améliorations Techniques
1. **WebSockets** : Mise à jour temps réel des positions
2. **Background Sync** : Synchronisation hors ligne
3. **Battery Optimization** : Gestion intelligente de la consommation
4. **Clustering** : Regroupement des réservations proches

---

**Version** : 1.0  
**Dernière MAJ** : 31/07/2025  
**Responsable** : Système de géolocalisation AppLakoChauffeur