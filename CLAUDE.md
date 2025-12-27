# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Information

**Project Path**: `C:\Users\diall\Documents\IonicProjects\Claude\AppLakoChauffeur`

This is an Ionic + Angular + Capacitor application for a chauffeur service (AppLakoChauffeur).

**IMPORTANT - Timezone Configuration**: 
- The application operates in **GMT+0 (Conakry, Guinea timezone)**
- All timestamps in database are stored in UTC
- All date/time displays must be converted to GMT+0 for correct local time
- When calculating time differences (e.g., "Il y a 2h"), always use GMT+0 timezone

## Development Commands

**⚠️ IMPORTANT: NE JAMAIS LANCER L'APPLICATION AUTOMATIQUEMENT**
L'application est déjà en cours d'exécution. Ne pas exécuter `npm start`, `ionic serve` ou toute commande de démarrage du serveur de développement.

- `npm install` - Install dependencies
- `npm start` or `ionic serve` - Start development server (**NE PAS EXÉCUTER - Déjà en cours**)
- `npm run build` or `ionic build` - Build for production
- `npm test` - Run unit tests
- `npm run lint` - Run linting

## Project Architecture

### Technology Stack
- **Framework**: Ionic 7 with Angular 17 (Standalone Components)
- **Mobile**: Capacitor 5 for native functionality
- **Database**: Supabase (PostgreSQL)
- **Styling**: Custom CSS variables with Lako brand colors

### Theme Colors
The application uses a custom color scheme:
- Primary: #C1F11D (Lako Green)
- Secondary: #797979 (Gray)
- Tertiary: #FFFEE9 (Cream)
- Dark: #151515 (Almost Black)
- White: #FFFFFF

### Application Structure
- **Tab-based navigation** with 3 main sections:
  - **Reservations**: Displays pending reservations with accept/refuse actions
  - **Historique**: Shows processed reservations (accepted/refused/completed)
  - **Profile**: Driver profile and statistics

### Key Services
- **SupabaseService** (`src/app/services/supabase.service.ts`): Handles all database operations
  - `getPendingReservations()`: Fetches reservations with custom radius filtering via RPC
  - `updateReservationStatus()`: Updates reservation status to 'accepted' or 'refused'
  - `getReservationHistory()`: Fetches processed reservations
  - `updateConducteurRayon()`: Updates driver's search radius preference (1-50km)

- **GeolocationService** (`src/app/services/geolocation.service.ts`): GPS tracking with Wake Lock
  - `startLocationTracking()`: Starts GPS tracking every 5 minutes + activates Wake Lock
  - `stopLocationTracking()`: Stops GPS tracking + deactivates Wake Lock
  - `getFullTrackingStatus()`: Returns tracking and Wake Lock status

- **WakeLockService** (`src/app/services/wake-lock.service.ts`): Screen wake management
  - `enable()`: Keeps screen awake while conductor is ONLINE
  - `disable()`: Allows phone to lock when conductor goes OFFLINE
  - `getStatus()`: Returns Wake Lock active/supported status

- **AutoRefreshService** (`src/app/services/auto-refresh.service.ts`): ⭐ **NEW** - Non-blocking auto-refresh system
  - `startAutoRefresh(callback, immediate)`: Starts 2-minute interval refresh with memory-safe management
  - `stopAutoRefresh()`: Stops auto-refresh and cleans up resources
  - `forceRefresh()`: Manual immediate refresh without blocking UI
  - `refreshState$`: Observable for real-time refresh status (isRefreshing, lastRefreshTime, errorCount)
  - `getTimeSinceLastRefresh()`: Returns human-readable time since last refresh
  - Built with RxJS for proper subscription management and memory leak prevention

### Data Models
- **Reservation** (`src/app/models/reservation.model.ts`): Main data model with fields like customer_name, pickup_location, destination, status, etc.

### Environment Configuration
- Update `src/environments/environment.ts` and `src/environments/environment.prod.ts` with actual Supabase credentials:
  - `supabaseUrl`: Your Supabase project URL
  - `supabaseKey`: Your Supabase anon key

### Database Requirements
The application expects a `reservations` table in Supabase with these columns (structure réelle vérifiée):

**IMPORTANT:** The database now includes a custom search radius system for drivers.
- `id`: UUID (Primary key, auto-generated avec uuid_generate_v4())
- `client_phone`: Text NOT NULL (pas customer_phone)
- `vehicle_type`: Text ('moto' ou 'voiture')
- `position_depart`: Text (format WKT pour position GPS)
- `position_arrivee`: Geography/Geometry (point GPS arrivée)
- `depart_nom`: Text (nom du lieu de départ)
- `destination_nom`: Varchar (nom du lieu destination) 
- `statut`: Text ('pending', 'confirmee', 'accepted', 'refused', 'completed', 'canceled')
- `conducteur_id`: UUID (FK vers conducteurs)
- `distance_km`: Numeric
- `prix_total`: Numeric
- `date_reservation`: Date
- `heure_reservation`: Integer (0-23)
- `minute_reservation`: Integer (0-59)
- `created_at`: Timestamp (auto)
- `updated_at`: Timestamp (auto)

**NOUVELLES COLONNES AJOUTÉES:**
- ✅ `rayon_km_reservation`: Integer (conducteurs table) - Rayon de recherche personnalisé (NULL = 5km défaut)

**COLONNES QUI N'EXISTENT PAS** (erreurs courantes):
- ❌ `customer_name` → utiliser `client_phone`
- ❌ `customer_phone` → utiliser `client_phone`
- ❌ `pickup_location` → utiliser `depart_nom`
- ❌ `destination` → utiliser `destination_nom`
- ❌ `pickup_date` → utiliser `date_reservation`
- ❌ `pickup_time` → utiliser `heure_reservation` + `minute_reservation`
- ❌ `price` → utiliser `prix_total`
- ❌ `notes` → utiliser `commentaire`
- ❌ `status` → utiliser `statut`
- ❌ `notified_at` → n'existe pas, ajouter si nécessaire

### SQL INSERT Format for Geographic Data

**IMPORTANT:** Always use ST_MakePoint() for geographic coordinates to avoid WKB encoding errors.

**Correct format for reservation INSERT:**
```sql
INSERT INTO reservations (
  id,
  client_phone,
  vehicle_type,
  position_depart,
  position_arrivee,
  depart_nom,
  destination_nom,
  distance_km,
  prix_total,
  statut,
  date_reservation,
  heure_reservation,
  minute_reservation,
  created_at,
  updated_at
) VALUES (
  uuid_generate_v4(),
  '+33600123456',
  'moto',
  ST_SetSRID(ST_MakePoint(2.6596, 48.5392), 4326), -- ALWAYS use ST_MakePoint for coordinates
  ST_SetSRID(ST_MakePoint(2.35, 48.85), 4326), -- PostgreSQL handles WKB conversion
  'Location Name',
  'Destination Name',
  30.0,
  15000,
  'scheduled',
  CURRENT_DATE + INTERVAL '1 day',
  21,
  0,
  NOW(),
  NOW()
);
```

**❌ NEVER manually encode WKB format** - it leads to coordinate errors and incorrect distances.
**✅ ALWAYS verify coordinates** with real GPS locations before insertion.

### Database Structure Reference
For complete database structure analysis and schema details, refer to:
`C:\Users\diall\Documents\LABICOTAXI\SCRIPT\db_structure.sql`

This file contains the complete database schema including all tables, columns, relationships, and constraints. Always consult this file when analyzing database structure or implementing new features that require database modifications.

### Required PostgreSQL Functions

**`get_reservations_within_radius()`** - Custom RPC function for distance-based filtering:
```sql
CREATE OR REPLACE FUNCTION get_reservations_within_radius(
  conducteur_position TEXT,    -- Driver position as WKB hex
  radius_meters INTEGER,       -- Search radius in meters
  vehicle_type_filter TEXT,    -- Vehicle type ('moto' or 'voiture')
  statut_filter TEXT          -- Status filter ('pending' or 'scheduled')
)
RETURNS SETOF reservations
```

This function handles the complex geometry operations for filtering reservations by distance while managing the mixed data types (TEXT WKB vs GEOMETRY PostGIS).

### Modal Creation Pattern (TESTED & WORKING)

**⚠️ IMPORTANT:** Use this exact pattern for all modal creation in this project. This structure has been tested and works perfectly.

**Template Structure:**
```html
<!-- Modal [Description] -->
<ion-modal [isOpen]="isModalOpen" (didDismiss)="closeModal()">
  <ng-template>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Modal Title</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="closeModal()">
            <ion-icon name="close-circle-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      
      <ion-item>
        <ion-label position="stacked">Field Label *</ion-label>
        <ion-input
          [(ngModel)]="formData.field"
          placeholder="Placeholder text">
        </ion-input>
      </ion-item>

      <ion-item>
        <ion-label position="stacked">Select Field *</ion-label>
        <ion-select
          [(ngModel)]="formData.selectField"
          placeholder="Select option">
          <ion-select-option value="option1">Option 1</ion-select-option>
          <ion-select-option value="option2">Option 2</ion-select-option>
        </ion-select>
      </ion-item>

      <ion-item>
        <ion-label position="stacked">Textarea Field</ion-label>
        <ion-textarea
          [(ngModel)]="formData.textareaField"
          placeholder="Long text"
          rows="3">
        </ion-textarea>
      </ion-item>

      <div class="modal-actions">
        <ion-button 
          expand="block" 
          (click)="onSave()"
          [disabled]="isSaving">
          {{ isSaving ? 'Saving...' : 'Save' }}
        </ion-button>
        <ion-button 
          expand="block" 
          fill="outline" 
          (click)="closeModal()">
          Cancel
        </ion-button>
      </div>
    </ion-content>
  </ng-template>
</ion-modal>
```

**Key Rules:**
1. **Always use `<ng-template>`** inside `<ion-modal>`
2. **Use `color="primary"`** for toolbar
3. **Use `close-circle-outline`** icon for close button
4. **Use `class="ion-padding"`** on ion-content
5. **Place form fields directly** in ion-content (no wrapper divs)
6. **Use `position="stacked"`** for all ion-label
7. **Use `[(ngModel)]="object.property"`** for bindings
8. **Place `modal-actions` div at the end**
9. **Primary button first, cancel button second**
10. **Test with simple content first** if having issues

**Tested Examples:**
- Entreprise creation modal (working perfectly)
- Conducteur creation modal (working perfectly)

**Common Issues to Avoid:**
- ❌ Don't use complex wrapper divs
- ❌ Don't use form tags with ngModel issues  
- ❌ Don't place modals inside `<ion-content>`
- ❌ Don't use different icon names for close button
- ✅ Always test with simple content first before adding complex bindings

## 🔋 GPS Tracking & Wake Lock System

### Overview
The application implements an intelligent GPS tracking system with Wake Lock management that automatically controls screen wake based on conductor online/offline status.

### How it works
- **ONLINE Status**: GPS tracking active (every 5 minutes) + Screen stays awake
- **OFFLINE Status**: GPS tracking stopped + Phone can lock normally
- **User Control**: Single button controls both GPS and power management

### Key Features
- ✅ **Smart Wake Lock**: Screen stays awake only when needed
- ✅ **Battery Management**: Automatic power saving when offline
- ✅ **GPS Precision**: 5-minute intervals for accurate tracking
- ✅ **User Friendly**: Simple online/offline toggle

### Documentation
For complete technical details, see: 
- `SYSTEME_GPS_WAKE_LOCK.md`
- `SYSTEME_FILTRAGE_RAYON.md` - **NEW:** Custom radius filtering system

## 🔄 Auto-Refresh System

### Overview
⭐ **NEW FEATURE**: The application now includes an intelligent auto-refresh system that automatically updates reservations every 2 minutes when the conductor is ONLINE, without blocking the user interface.

### Key Features
- ✅ **Non-Blocking**: Background refresh without spinners or UI freezing
- ✅ **Memory Safe**: Proper subscription management prevents memory leaks
- ✅ **Smart Scheduling**: Only refreshes when conductor is ONLINE
- ✅ **Error Resilient**: Automatic retry with progressive backoff
- ✅ **Visual Indicator**: Discrete pulse animation shows refresh status
- ✅ **Performance Optimized**: Parallel data loading and timeout protection

### Architecture

#### AutoRefreshService (`src/app/services/auto-refresh.service.ts`)
**Core service managing the refresh lifecycle:**

```typescript
// Start auto-refresh with callback
autoRefreshService.startAutoRefresh(refreshCallback, immediate);

// Stop auto-refresh (cleans all resources)
autoRefreshService.stopAutoRefresh();

// Subscribe to refresh state
autoRefreshService.refreshState$.subscribe(state => {
  console.log('Refreshing:', state.isRefreshing);
  console.log('Last refresh:', state.lastRefreshTime);
  console.log('Error count:', state.errorCount);
});
```

#### Integration in ReservationsPage
**Automatic lifecycle management:**

```typescript
ngOnInit() {
  // Subscribe to refresh state for UI updates
  this.refreshStateSubscription = this.autoRefreshService.refreshState$.subscribe(
    state => {
      this.refreshState = state;
      this.cdr.detectChanges(); // Update visual indicator
    }
  );
  
  // Start auto-refresh if conductor is online
  if (this.isOnline) {
    this.startAutoRefresh();
  }
}

async onStatusToggle(event: any) {
  const newStatus = event.detail.checked;
  
  if (newStatus) {
    // EN LIGNE: Start auto-refresh + GPS tracking
    this.startAutoRefresh();
    await this.geolocationService.startLocationTracking();
  } else {
    // HORS LIGNE: Stop everything
    this.autoRefreshService.stopAutoRefresh();
    this.geolocationService.stopLocationTracking();
  }
}
```

### How It Works

#### 1. **Intelligent Timing**
- **Interval**: Exactly 2 minutes between refreshes
- **Skip Logic**: Prevents duplicate calls if already refreshing
- **Timeout**: 30-second maximum per refresh operation

#### 2. **Memory Management**
```typescript
ngOnDestroy() {
  // Stop auto-refresh service
  this.autoRefreshService.stopAutoRefresh();
  
  // Unsubscribe from all observables
  if (this.refreshStateSubscription) {
    this.refreshStateSubscription.unsubscribe();
  }
  
  // Clear data arrays
  this.reservations = [];
  this.allReservations = [];
  this.scheduledReservations = [];
}
```

#### 3. **Parallel Data Loading**
```typescript
// Load all data simultaneously (non-blocking)
await Promise.all([
  this.supabaseService.getPendingReservations(),
  this.loadScheduledReservations()
]);

// Calculate durations in parallel
const durationPromises = this.reservations.map(async (reservation) => {
  reservation.duration = await this.calculateDuration(reservation.position_depart);
  reservation.calculatedDistance = await this.calculateDistanceToReservation(reservation.position_depart);
});
await Promise.all(durationPromises);
```

### Visual Indicator

#### HTML Template
```html
<!-- Auto-refresh indicator (only shown when online) -->
<div class="auto-refresh-indicator" *ngIf="isOnline && refreshState">
  <div class="refresh-info">
    <div class="refresh-status">
      <ion-icon 
        [name]="refreshState.isRefreshing ? 'sync' : 'checkmark-circle'"
        [class.spinning]="refreshState.isRefreshing"
        [color]="refreshState.isRefreshing ? 'warning' : 'success'">
      </ion-icon>
      <span>{{ refreshState.isRefreshing ? 'Actualisation...' : 'Auto-refresh actif' }}</span>
    </div>
    <div class="last-refresh" *ngIf="!refreshState.isRefreshing">
      <small>{{ getTimeSinceLastRefresh() }}</small>
    </div>
  </div>
</div>
```

#### CSS Styles
```scss
.auto-refresh-indicator {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 8px;
  margin: 8px 16px;
  padding: 8px 12px;
  
  .refresh-icon.spinning {
    animation: spin-refresh 2s linear infinite;
  }
}
```

### Error Handling

#### Progressive Backoff
- **Normal**: 2-minute intervals
- **After Error**: Automatic retry
- **After 3 Errors**: Auto-stop to prevent battery drain
- **Network Issues**: Graceful degradation

#### Timeout Protection
```typescript
// 30-second timeout for each refresh
const timeoutPromise = new Promise((_, reject) => 
  setTimeout(() => reject(new Error('Timeout')), 30000)
);

const result = await Promise.race([
  this.refreshCallback(),
  timeoutPromise
]);
```

### Performance Benefits

#### Before (Old System)
- ❌ Manual refresh only
- ❌ Blocking UI during refresh
- ❌ Memory leaks with setInterval
- ❌ No error handling

#### After (New System)
- ✅ Automatic background refresh
- ✅ Non-blocking parallel loading
- ✅ Memory-safe with RxJS
- ✅ Robust error handling
- ✅ Real-time visual feedback

### Developer Usage

#### For New Pages
```typescript
import { AutoRefreshService } from '../services/auto-refresh.service';

constructor(private autoRefreshService: AutoRefreshService) {}

startMyRefresh() {
  const callback = async () => {
    // Your refresh logic here
    return await this.loadData();
  };
  
  this.autoRefreshService.startAutoRefresh(callback, false);
}
```

#### Best Practices
1. **Always unsubscribe** in ngOnDestroy
2. **Use parallel loading** for better performance  
3. **Handle errors gracefully** in your callback
4. **Test memory usage** in long-running sessions
5. **Respect user's online/offline status**

## Git Repository & Deployment

### Repository Information
- **Git Repository**: https://github.com/labiko/applako.git
- **Deployment Platform**: Vercel

### IMPORTANT: Commit Strategy
⚠️ **CRITICAL**: When committing this project to Git, you MUST commit ALL files including configuration files. 

**Files that MUST be committed:**
- `src/environments/environment.ts`
- `src/environments/environment.prod.ts`
- All configuration files (angular.json, ionic.config.json, capacitor.config.ts, etc.)
- Package files (package.json, package-lock.json)
- All source code and assets

**Why this is critical:**
- Vercel deployment requires environment configuration files
- Missing config files will cause deployment failures
- The application won't function without proper Supabase credentials
- Build process depends on all configuration files being present

### Git Commands for Deployment
```bash
# Initialize git (if not already done)
git init

# Add remote repository
git remote add origin https://github.com/labiko/applako.git

# Add ALL files (including configs)
git add .

# Commit with descriptive message
git commit -m "Initial commit: Complete Ionic Angular app with Supabase integration"

# Push to main branch
git push -u origin main
```

### Vercel Deployment Notes
- Ensure environment variables are properly configured in Vercel dashboard
- Build command: `npm run build`
- Output directory: `dist/`
- Node.js version: Use latest LTS (18.x or 20.x)

## ⚠️ IMPORTANT: Git Workflow Instructions

### Commit Policy
**NEVER commit automatically without explicit user request.**

- ✅ **DO**: Work on code, create files, make modifications
- ✅ **DO**: Build, test, and verify functionality
- ❌ **DON'T**: Run `git add`, `git commit`, or `git push` unless specifically asked
- ❌ **DON'T**: Auto-commit after completing tasks

### When to Commit
Only commit when the user explicitly requests it with commands like:
- "commit"
- "commit and push" 
- "git commit"
- "save changes to git"
- "push to repository"

### ⚠️ CRITICAL: Complete Project Commit Rule
**MANDATORY**: When committing, you MUST ALWAYS commit ALL modifications in the project without exception.

**Required workflow for commits:**
```bash
# 1. Check ALL pending changes
git status

# 2. Add ALL files (never selective add)
git add .

# 3. Commit everything
git commit -m "Descriptive message"

# 4. Push to remote
git push
```

**NEVER use selective file commits like:**
- ❌ `git add src/app/specific/file.ts` 
- ❌ `git add folder1/ folder2/`
- ✅ **ALWAYS use `git add .`** to include everything

**Why this is critical:**
- Partial commits leave modifications stranded locally
- Vercel cannot deploy incomplete changes
- Creates confusion about what's actually deployed
- User expects ALL work to be saved and deployed

### Exception
The only exception is when the user provides a specific instruction in their initial request that clearly indicates they want commits (e.g., "implement feature X and commit it").

This ensures the user maintains full control over their git history and can review changes before they are committed.

## 🔢 Version Management

### Automatic Version Increment Rule
**MANDATORY**: When the user requests a commit, you MUST automatically increment the version number in `src/app/constants/version.ts` BEFORE committing.

**Version file location**: `src/app/constants/version.ts`
```typescript
// Version de l'application - À mettre à jour à chaque déploiement
export const APP_VERSION = 'X.Y.Z';
```

**Versioning strategy**:
- **Patch version (Z)**: Bug fixes, small changes, style updates
- **Minor version (Y)**: New features, significant improvements
- **Major version (X)**: Breaking changes, major redesigns

**Required workflow for commits:**
```bash
# 1. Increment version in src/app/constants/version.ts
# 2. git add .
# 3. git commit -m "v2.X.X: Descriptive message"
# 4. git push
```

**Example commit messages with version:**
- `v2.1.1: Fix modal close icon visibility`
- `v2.2.0: Add version display to Dashboard`
- `v3.0.0: Complete redesign of reservation system`

**Version display locations:**
- Dashboard page (entreprise): Displayed below "Bonjour, {nom}"
- Profile page (conducteur): Displayed at the bottom of the page