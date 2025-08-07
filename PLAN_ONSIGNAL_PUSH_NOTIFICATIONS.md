# PLAN ONESIGNAL PUSH NOTIFICATIONS

## 🎯 **Architecture Générale**

### **Workflow Complet**
1. **Nouvelle réservation** insérée dans Supabase → Trigger PostgreSQL
2. **Calcul conducteurs** dans 5km → `find_nearby_conducteurs()`  
3. **Pour chaque conducteur proche** → Appel API ASP.NET MVC
4. **ASP.NET envoie notification** OneSignal → Conducteur mobile
5. **Conducteur ouvre notification** → Navigation app → Page réservations

## 📊 **Avantages**

- ✅ **Notifications ciblées** (5km maximum)
- ✅ **Performance** (calcul PostGIS natif)
- ✅ **Scalable** (backend centralisé)
- ✅ **Économique** (moins de notifications inutiles)
- ✅ **Contrôlé** (backend maître des règles métier)

---

## 🗃️ **PHASE 1 - Modification Base de Données**

### **1.1 Ajouter colonne playerId**
```sql
-- Ajouter dans table conducteurs
ALTER TABLE conducteurs 
ADD COLUMN player_id VARCHAR(255) NULL;

-- Index pour performance
CREATE INDEX idx_conducteurs_player_id ON conducteurs(player_id);
CREATE INDEX idx_conducteurs_online_status ON conducteurs(hors_ligne) WHERE hors_ligne = false;

-- Commentaires
COMMENT ON COLUMN conducteurs.player_id IS 'OneSignal Player ID pour notifications push';
```

### **1.2 Fonction PostgreSQL Calcul Distance 5km**
```sql
-- Fonction pour trouver conducteurs dans un rayon de 5km
CREATE OR REPLACE FUNCTION find_nearby_conducteurs(
  reservation_position GEOMETRY,
  max_distance_km INTEGER DEFAULT 5
)
RETURNS TABLE(
  conducteur_id UUID,
  player_id VARCHAR(255),
  distance_km NUMERIC,
  nom VARCHAR(255),
  telephone VARCHAR(20)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.player_id,
    ROUND((ST_Distance(c.position, reservation_position) / 1000)::NUMERIC, 2) as distance_km,
    c.nom,
    c.telephone
  FROM conducteurs c
  WHERE 
    c.hors_ligne = false                    -- Seulement conducteurs EN LIGNE
    AND c.player_id IS NOT NULL             -- Avec OneSignal configuré
    AND c.position IS NOT NULL              -- Avec position GPS valide
    AND ST_DWithin(c.position, reservation_position, max_distance_km * 1000)  -- Dans rayon 5km
    AND c.derniere_activite > NOW() - INTERVAL '30 minutes'  -- Actif récemment
  ORDER BY ST_Distance(c.position, reservation_position);
END;
$$ LANGUAGE plpgsql;

-- Test de la fonction
-- SELECT * FROM find_nearby_conducteurs(ST_GeomFromText('POINT(-13.7122 9.5092)', 4326), 5);
```

### **1.3 Fonction Trigger Principal**
```sql
-- Fonction trigger pour nouvelles réservations
CREATE OR REPLACE FUNCTION notify_nearby_conducteurs()
RETURNS TRIGGER AS $$
DECLARE
  conducteur_record RECORD;
  notification_url TEXT := 'https://your-aspnet-app.com/api/notifications/send';
  conducteur_count INTEGER := 0;
BEGIN
  -- Seulement pour nouvelles réservations en attente
  IF NEW.statut = 'pending' AND NEW.position_depart IS NOT NULL THEN
    
    RAISE NOTICE 'Nouvelle réservation détectée: %', NEW.id;
    
    -- Appeler API ASP.NET pour chaque conducteur proche
    FOR conducteur_record IN 
      SELECT * FROM find_nearby_conducteurs(NEW.position_depart, 5)
    LOOP
      conducteur_count := conducteur_count + 1;
      
      RAISE NOTICE 'Notification conducteur: % (distance: %km)', 
        conducteur_record.conducteur_id, conducteur_record.distance_km;
      
      -- Appel HTTP vers ASP.NET MVC
      PERFORM net.http_post(
        url := notification_url,
        headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb,
        body := jsonb_build_object(
          'reservationId', NEW.id,
          'clientPhone', NEW.client_phone,
          'departNom', NEW.depart_nom,
          'destinationNom', NEW.destination_nom,
          'prixTotal', NEW.prix_total,
          'vehicleType', NEW.vehicle_type,
          'createdAt', NEW.created_at,
          'conducteurId', conducteur_record.conducteur_id,
          'playerId', conducteur_record.player_id,
          'distanceKm', conducteur_record.distance_km,
          'conducteurNom', conducteur_record.nom,
          'conducteurTelephone', conducteur_record.telephone
        )
      );
    END LOOP;
    
    RAISE NOTICE 'Notifications envoyées à % conducteurs proches', conducteur_count;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### **1.4 Créer Trigger**
```sql
-- Supprimer trigger existant si présent
DROP TRIGGER IF EXISTS trigger_notify_nearby_conducteurs ON reservations;

-- Créer nouveau trigger
CREATE TRIGGER trigger_notify_nearby_conducteurs
  AFTER INSERT ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION notify_nearby_conducteurs();

-- Commentaire
COMMENT ON TRIGGER trigger_notify_nearby_conducteurs ON reservations IS 
'Envoie notifications push aux conducteurs dans un rayon de 5km lors de nouvelles réservations';
```

### **1.5 Vue Performance (Optionnel)**
```sql
-- Vue matérialisée pour conducteurs actifs (performance)
CREATE MATERIALIZED VIEW active_conducteurs AS
SELECT 
  id,
  nom,
  telephone,
  player_id,
  position,
  derniere_activite,
  ST_AsText(position) as position_text
FROM conducteurs 
WHERE hors_ligne = false 
  AND player_id IS NOT NULL
  AND position IS NOT NULL
  AND derniere_activite > NOW() - INTERVAL '30 minutes';

-- Index sur la vue matérialisée
CREATE INDEX idx_active_conducteurs_position ON active_conducteurs USING GIST(position);

-- Fonction pour rafraîchir la vue
CREATE OR REPLACE FUNCTION refresh_active_conducteurs()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW active_conducteurs;
  RAISE NOTICE 'Vue active_conducteurs rafraîchie';
END;
$$ LANGUAGE plpgsql;

-- Programmer rafraîchissement automatique (toutes les 5 minutes)
-- SELECT cron.schedule('refresh-active-conducteurs', '*/5 * * * *', 'SELECT refresh_active_conducteurs();');
```

---

## 🖥️ **PHASE 2 - Backend ASP.NET MVC**

### **2.1 Structure du Projet**

```
ASP.NET MVC Project/
├── Controllers/
│   └── NotificationsController.cs
├── Services/
│   ├── ASP_MVC_ONSIGNAL_METHODE.cs      ← TOUTES LES MÉTHODES ICI
│   └── IOneSignalService.cs
├── Models/
│   ├── NotificationModels.cs
│   └── OneSignalModels.cs
├── appsettings.json
└── Program.cs
```

### **2.2 Configuration appsettings.json**
```json
{
  "OneSignal": {
    "AppId": "votre-onesignal-app-id",
    "ApiKey": "votre-onesignal-rest-api-key",
    "BaseUrl": "https://onesignal.com/api/v1"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  }
}
```

### **2.3 Models (NotificationModels.cs)**
```csharp
// Models/NotificationModels.cs
public class NotificationRequest
{
    public string ReservationId { get; set; }
    public string ClientPhone { get; set; }
    public string DepartNom { get; set; }
    public string DestinationNom { get; set; }
    public decimal PrixTotal { get; set; }
    public string VehicleType { get; set; }
    public DateTime CreatedAt { get; set; }
    public string ConducteurId { get; set; }
    public string PlayerId { get; set; }
    public decimal DistanceKm { get; set; }
    public string ConducteurNom { get; set; }
    public string ConducteurTelephone { get; set; }
}

public class NotificationResponse
{
    public bool Success { get; set; }
    public string Message { get; set; }
    public string NotificationId { get; set; }
    public int Recipients { get; set; }
}
```

### **2.4 Models OneSignal (OneSignalModels.cs)**
```csharp
// Models/OneSignalModels.cs
public class OneSignalNotification
{
    public string[] PlayerIds { get; set; }
    public Dictionary<string, string> Contents { get; set; }
    public Dictionary<string, string> Headings { get; set; }
    public object Data { get; set; }
    public string AndroidSound { get; set; }
    public string IosSound { get; set; }
    public int Priority { get; set; } = 10;
    public string AndroidChannelId { get; set; } = "reservations";
}

public class OneSignalResponse
{
    public string Id { get; set; }
    public int Recipients { get; set; }
    public string[] Errors { get; set; }
    public bool IsSuccess => Errors == null || Errors.Length == 0;
}
```

### **2.5 Interface Service**
```csharp
// Services/IOneSignalService.cs
public interface IOneSignalService
{
    Task<OneSignalResponse> SendNotificationAsync(OneSignalNotification notification);
    Task<NotificationResponse> SendReservationNotificationAsync(NotificationRequest request);
    Task<bool> ValidatePlayerIdAsync(string playerId);
}
```

### **2.6 Controller Principal**
```csharp
// Controllers/NotificationsController.cs
[ApiController]
[Route("api/notifications")]
public class NotificationsController : ControllerBase
{
    private readonly IOneSignalService _oneSignalService;
    private readonly ILogger<NotificationsController> _logger;

    public NotificationsController(IOneSignalService oneSignalService, ILogger<NotificationsController> logger)
    {
        _oneSignalService = oneSignalService;
        _logger = logger;
    }

    [HttpPost("send")]
    public async Task<ActionResult<NotificationResponse>> SendNotification([FromBody] NotificationRequest request)
    {
        try
        {
            _logger.LogInformation($"Réception demande notification pour conducteur {request.ConducteurId}");
            
            if (string.IsNullOrEmpty(request.PlayerId))
            {
                _logger.LogWarning($"PlayerId manquant pour conducteur {request.ConducteurId}");
                return BadRequest(new NotificationResponse 
                { 
                    Success = false, 
                    Message = "PlayerId manquant" 
                });
            }

            var result = await _oneSignalService.SendReservationNotificationAsync(request);
            
            _logger.LogInformation($"Notification envoyée: {result.Success} - {result.Message}");
            
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Erreur envoi notification pour conducteur {request.ConducteurId}");
            return StatusCode(500, new NotificationResponse 
            { 
                Success = false, 
                Message = ex.Message 
            });
        }
    }

    [HttpGet("health")]
    public IActionResult Health()
    {
        return Ok(new { status = "OK", timestamp = DateTime.UtcNow });
    }
}
```

### **2.7 Configuration Program.cs**
```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);

// Services
builder.Services.AddControllers();
builder.Services.AddHttpClient();
builder.Services.AddScoped<IOneSignalService, OneSignalService>();

// Configuration
builder.Services.Configure<OneSignalSettings>(
    builder.Configuration.GetSection("OneSignal"));

// CORS pour Supabase
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowSupabase", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Pipeline
app.UseCors("AllowSupabase");
app.UseRouting();
app.MapControllers();

app.Run();

public class OneSignalSettings
{
    public string AppId { get; set; }
    public string ApiKey { get; set; }
    public string BaseUrl { get; set; }
}
```

---

## 📱 **PHASE 3 - Frontend Ionic (Minimal)**

### **3.1 Installation OneSignal**
```bash
# Installation plugin
npm install onesignal-cordova-plugin
npm install @awesome-cordova-plugins/onesignal
ionic capacitor sync
```

### **3.2 Configuration Capacitor**
```json
// capacitor.config.json
{
  "appId": "com.lako.chauffeur",
  "appName": "AppLakoChauffeur",
  "plugins": {
    "OneSignal": {
      "appId": "votre-onesignal-app-id"
    }
  }
}
```

### **3.3 Service OneSignal Angular**
```typescript
// services/onesignal.service.ts
import { Injectable } from '@angular/core';
import { OneSignal } from '@awesome-cordova-plugins/onesignal/ngx';
import { Capacitor } from '@capacitor/core';

@Injectable({ providedIn: 'root' })
export class OneSignalService {
  
  constructor(private oneSignal: OneSignal) {}

  async initializeOneSignal() {
    if (Capacitor.getPlatform() === 'web') {
      console.log('OneSignal désactivé sur web');
      return;
    }
    
    try {
      // Configuration OneSignal
      this.oneSignal.startInit('votre-onesignal-app-id');
      
      // Gestion notification reçue
      this.oneSignal.handleNotificationReceived().subscribe(data => {
        console.log('Notification reçue:', data);
      });
      
      // Gestion notification ouverte
      this.oneSignal.handleNotificationOpened().subscribe(data => {
        console.log('Notification ouverte:', data);
        this.handleNotificationOpened(data);
      });
      
      this.oneSignal.endInit();
      
      // Récupérer Player ID
      const playerIds = await this.oneSignal.getIds();
      if (playerIds.userId) {
        await this.updateConducteurPlayerId(playerIds.userId);
      }
      
    } catch (error) {
      console.error('Erreur initialisation OneSignal:', error);
    }
  }

  private async updateConducteurPlayerId(playerId: string) {
    // Appel à Supabase pour mettre à jour player_id
    const conducteurId = this.authService.getCurrentConducteurId();
    if (conducteurId) {
      await this.supabaseService.updateConducteurPlayerId(conducteurId, playerId);
      console.log(`Player ID ${playerId} associé au conducteur ${conducteurId}`);
    }
  }

  private handleNotificationOpened(data: any) {
    const additionalData = data.notification.payload.additionalData;
    
    if (additionalData?.type === 'new_reservation') {
      // Naviguer vers page réservations
      this.router.navigate(['/tabs/reservations']);
    }
  }
}
```

### **3.4 Intégration App Component**
```typescript
// app.component.ts
import { OneSignalService } from './services/onesignal.service';

export class AppComponent implements OnInit {
  constructor(private oneSignalService: OneSignalService) {}

  async ngOnInit() {
    // ... autres initialisations ...
    
    // Initialiser OneSignal après connexion conducteur
    this.authService.currentConducteur$.subscribe(async (conducteur) => {
      if (conducteur) {
        await this.oneSignalService.initializeOneSignal();
      }
    });
  }
}
```

### **3.5 Mise à jour Supabase Service**
```typescript
// services/supabase.service.ts (ajouter méthode)
async updateConducteurPlayerId(conducteurId: string, playerId: string): Promise<boolean> {
  try {
    const { error } = await this.supabase
      .from('conducteurs')
      .update({ player_id: playerId })
      .eq('id', conducteurId);

    if (error) {
      console.error('Erreur mise à jour player_id:', error);
      return false;
    }

    console.log(`Player ID mis à jour pour conducteur ${conducteurId}`);
    return true;
  } catch (error) {
    console.error('Erreur updateConducteurPlayerId:', error);
    return false;
  }
}
```

---

## 🔧 **PHASE 4 - Optimisations Avancées**

### **4.1 Rate Limiting SQL**
```sql
-- Table pour tracking notifications
CREATE TABLE notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conducteur_id UUID REFERENCES conducteurs(id),
    reservation_id UUID REFERENCES reservations(id),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    success BOOLEAN DEFAULT false,
    error_message TEXT
);

-- Fonction rate limiting (max 10 notifications/heure/conducteur)
CREATE OR REPLACE FUNCTION can_send_notification(p_conducteur_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    notification_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO notification_count
    FROM notification_logs
    WHERE conducteur_id = p_conducteur_id
      AND sent_at > NOW() - INTERVAL '1 hour';
      
    RETURN notification_count < 10;
END;
$$ LANGUAGE plpgsql;
```

### **4.2 Horaires Intelligents**
```sql
-- Fonction pour vérifier horaires envoi
CREATE OR REPLACE FUNCTION is_notification_time()
RETURNS BOOLEAN AS $$
DECLARE
    current_hour INTEGER;
    current_day INTEGER;
BEGIN
    -- Heure actuelle GMT+0 (Conakry)
    current_hour := EXTRACT(HOUR FROM NOW() AT TIME ZONE 'GMT');
    current_day := EXTRACT(DOW FROM NOW()); -- 0=Dimanche, 6=Samedi
    
    -- Horaires service: 6h-23h, 7j/7
    RETURN current_hour BETWEEN 6 AND 23;
END;
$$ LANGUAGE plpgsql;
```

### **4.3 Trigger Optimisé Final**
```sql
-- Version finale du trigger avec toutes optimisations
CREATE OR REPLACE FUNCTION notify_nearby_conducteurs()
RETURNS TRIGGER AS $$
DECLARE
  conducteur_record RECORD;
  notification_url TEXT := 'https://your-aspnet-app.com/api/notifications/send';
  conducteur_count INTEGER := 0;
  can_send BOOLEAN;
BEGIN
  -- Vérifications préliminaires
  IF NEW.statut != 'pending' OR NEW.position_depart IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Vérifier horaires
  IF NOT is_notification_time() THEN
    RAISE NOTICE 'Hors horaires service - notification annulée';
    RETURN NEW;
  END IF;
  
  RAISE NOTICE 'Nouvelle réservation détectée: %', NEW.id;
  
  -- Traiter chaque conducteur proche
  FOR conducteur_record IN 
    SELECT * FROM find_nearby_conducteurs(NEW.position_depart, 5)
  LOOP
    -- Vérifier rate limiting
    SELECT can_send_notification(conducteur_record.conducteur_id) INTO can_send;
    
    IF can_send THEN
      conducteur_count := conducteur_count + 1;
      
      -- Log tentative
      INSERT INTO notification_logs (conducteur_id, reservation_id, success)
      VALUES (conducteur_record.conducteur_id, NEW.id, false);
      
      -- Appel HTTP
      PERFORM net.http_post(
        url := notification_url,
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := jsonb_build_object(
          'reservationId', NEW.id,
          'clientPhone', NEW.client_phone,
          'departNom', NEW.depart_nom,
          'destinationNom', NEW.destination_nom,
          'prixTotal', NEW.prix_total,
          'vehicleType', NEW.vehicle_type,
          'createdAt', NEW.created_at,
          'conducteurId', conducteur_record.conducteur_id,
          'playerId', conducteur_record.player_id,
          'distanceKm', conducteur_record.distance_km
        )
      );
      
      RAISE NOTICE 'Notification envoyée à conducteur % (%.1fkm)', 
        conducteur_record.conducteur_id, conducteur_record.distance_km;
    ELSE
      RAISE NOTICE 'Rate limit atteint pour conducteur %', conducteur_record.conducteur_id;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Total notifications envoyées: %', conducteur_count;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 🧪 **PHASE 5 - Tests et Monitoring**

### **5.1 Tests SQL**
```sql
-- Test fonction distance
SELECT * FROM find_nearby_conducteurs(
  ST_GeomFromText('POINT(-13.7122 9.5092)', 4326), -- Conakry centre
  5 -- 5km rayon
);

-- Test insertion réservation (déclenche trigger)
INSERT INTO reservations (
  client_phone, depart_nom, destination_nom, 
  position_depart, prix_total, vehicle_type, statut
) VALUES (
  '+224123456789', 
  'Ratoma', 
  'Aéroport',
  ST_GeomFromText('POINT(-13.7122 9.5092)', 4326),
  85000,
  'standard',
  'pending'
);

-- Vérifier logs
SELECT * FROM notification_logs ORDER BY sent_at DESC LIMIT 10;
```

### **5.2 Monitoring ASP.NET**
```csharp
// Dans ASP_MVC_ONSIGNAL_METHODE.cs - Ajouter logging détaillé
private readonly ILogger<OneSignalService> _logger;

public async Task<NotificationResponse> SendReservationNotificationAsync(NotificationRequest request)
{
    var stopwatch = Stopwatch.StartNew();
    
    try 
    {
        _logger.LogInformation("Début envoi notification: {ConducteurId} - {ReservationId}", 
            request.ConducteurId, request.ReservationId);
            
        // ... logique envoi ...
        
        stopwatch.Stop();
        _logger.LogInformation("Notification envoyée avec succès en {ElapsedMs}ms", 
            stopwatch.ElapsedMilliseconds);
            
        return new NotificationResponse { Success = true, Message = "Envoyé" };
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Erreur envoi notification: {ConducteurId}", request.ConducteurId);
        return new NotificationResponse { Success = false, Message = ex.Message };
    }
}
```

---

## 📋 **PHASE 6 - Checklist Déploiement**

### **6.1 Prérequis**
- [ ] Compte OneSignal créé
- [ ] App OneSignal configurée (Android + iOS)
- [ ] REST API Key récupérée
- [ ] Server ASP.NET MVC déployé
- [ ] URL ASP.NET accessible depuis Supabase
- [ ] Extension `net.http_post` activée sur Supabase

### **6.2 Configuration Base**
- [ ] Colonne `player_id` ajoutée à table `conducteurs`
- [ ] Fonction `find_nearby_conducteurs()` créée
- [ ] Fonction `notify_nearby_conducteurs()` créée  
- [ ] Trigger `trigger_notify_nearby_conducteurs` créé
- [ ] Table `notification_logs` créée (optionnel)

### **6.3 Backend ASP.NET**
- [ ] Controller `NotificationsController` implémenté
- [ ] Service `ASP_MVC_ONSIGNAL_METHODE.cs` complet
- [ ] Configuration OneSignal dans `appsettings.json`
- [ ] CORS configuré pour Supabase
- [ ] Endpoint `/api/notifications/send` fonctionnel

### **6.4 Frontend Ionic**
- [ ] Plugin OneSignal installé
- [ ] Service OneSignal initialisé
- [ ] Player ID envoyé à Supabase au login
- [ ] Gestion navigation sur notification ouverte

### **6.5 Tests**
- [ ] Test fonction SQL `find_nearby_conducteurs()`
- [ ] Test trigger avec insertion réservation
- [ ] Test endpoint ASP.NET avec Postman
- [ ] Test notification reçue sur mobile
- [ ] Test navigation après clic notification

---

## 🎯 **Résultats Attendus**

- **📱 Notification instantanée** aux conducteurs dans 5km
- **🎯 Ciblage précis** selon position géographique
- **💰 Optimisation coûts** (moins de notifications inutiles)
- **📊 Traçabilité complète** via logs
- **⚡ Performance élevée** grâce à PostGIS
- **🔧 Contrôle total** via backend centralisé

## 📞 **Support**

Pour toute question technique :
1. **Vérifier logs** Supabase (Trigger)
2. **Vérifier logs** ASP.NET (Controller)  
3. **Vérifier réception** OneSignal Dashboard
4. **Tester manuellement** chaque composant