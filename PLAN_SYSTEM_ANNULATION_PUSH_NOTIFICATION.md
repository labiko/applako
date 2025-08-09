# 📋 PLAN SYSTÈME ANNULATION - NOTIFICATIONS PUSH

## 🎯 **OBJECTIF**
Implémenter un système de notifications push pour informer automatiquement les conducteurs assignés lorsqu'une réservation est annulée (`statut = 'canceled'`), en utilisant la même architecture de polling que le système de nouvelles réservations.

---

## 🏗️ **ARCHITECTURE TECHNIQUE**

### **Principe de Fonctionnement**
1. **Détection** : Polling automatique toutes les 2-3 minutes
2. **Identification** : Réservations `statut = 'canceled'` avec `conducteur_id` assigné
3. **Notification** : Envoi OneSignal au conducteur concerné
4. **Tracking** : Marquage `cancellation_notified_at` pour éviter doublons
5. **Mobile** : Notification distincte avec navigation appropriée

---

## 📊 **PHASE 1 - DATABASE (PostgreSQL/Supabase)**

### **1.1 Ajout Colonne Tracking**
```sql
-- Colonne pour tracker les notifications d'annulation envoyées
ALTER TABLE reservations 
ADD COLUMN cancellation_notified_at TIMESTAMPTZ NULL;

-- Index pour performance sur les requêtes
CREATE INDEX idx_reservations_cancelled_notified 
ON reservations(statut, cancellation_notified_at) 
WHERE statut = 'canceled';

-- Commentaire explicatif
COMMENT ON COLUMN reservations.cancellation_notified_at IS 
'Timestamp de notification d\'annulation envoyée au conducteur';
```

### **1.2 Fonction PostgreSQL - Réservations Annulées**
```sql
-- Fonction pour récupérer les réservations annulées non notifiées
CREATE OR REPLACE FUNCTION find_cancelled_reservations_to_notify()
RETURNS TABLE(
    id UUID,
    conducteur_id UUID,
    client_phone VARCHAR(20),
    depart_nom VARCHAR(255),
    destination_nom VARCHAR(255),
    prix_total NUMERIC(10,2),
    vehicle_type VARCHAR(50),
    cancelled_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.conducteur_id,
        r.client_phone,
        r.depart_nom,
        r.destination_nom,
        r.prix_total,
        r.vehicle_type,
        r.updated_at as cancelled_at
    FROM reservations r
    WHERE r.statut = 'canceled'
      AND r.conducteur_id IS NOT NULL  -- Seulement réservations assignées
      AND r.cancellation_notified_at IS NULL  -- Pas encore notifiées
    ORDER BY r.updated_at DESC
    LIMIT 50;  -- Limiter pour performance
END;
$$ LANGUAGE plpgsql;
```

### **1.3 Test Fonction SQL**
```sql
-- Test de la fonction
SELECT * FROM find_cancelled_reservations_to_notify();

-- Vérifier les réservations annulées existantes
SELECT id, conducteur_id, depart_nom, statut, cancellation_notified_at
FROM reservations 
WHERE statut = 'canceled' 
  AND conducteur_id IS NOT NULL;
```

---

## 🖥️ **PHASE 2 - BACKEND C# (ASP.NET MVC)**

### **2.1 Méthode Polling Principal - ProcessCancelledReservationNotifications**

```csharp
// Dans ASP_MVC_PUSH_NOTIFICATION_RESERVATION.cs

public async Task<ActionResult> ProcessCancelledReservationNotifications()
{
    ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;
    
    int processedCount = 0;
    var startTime = DateTime.Now;
    var logMessages = new List<string>();
    
    // Configuration depuis Web.config
    var supabaseUrl = ConfigurationManager.AppSettings["Supabase:Url"];
    var supabaseKey = ConfigurationManager.AppSettings["Supabase:Key"];
    
    try
    {
        logMessages.Add($"❌ Démarrage traitement ANNULATIONS - {startTime:HH:mm:ss}");
        
        using (var httpClient = new HttpClient())
        {
            // Headers Supabase
            httpClient.DefaultRequestHeaders.Clear();
            httpClient.DefaultRequestHeaders.Add("apikey", supabaseKey);
            httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {supabaseKey}");
            
            // 1. Récupérer réservations annulées non notifiées
            var cancelUrl = $"{supabaseUrl}/rest/v1/reservations?statut=eq.canceled&conducteur_id=not.is.null&cancellation_notified_at=is.null&select=id,conducteur_id,depart_nom,destination_nom,vehicle_type,prix_total,updated_at";
            
            var cancelResponse = await httpClient.GetStringAsync(cancelUrl);
            var cancelledReservations = JsonConvert.DeserializeObject<dynamic[]>(cancelResponse);
            
            logMessages.Add($"📊 {cancelledReservations.Length} réservation(s) annulée(s) trouvée(s)");
            
            if (cancelledReservations.Length == 0)
            {
                return new JsonResult
                {
                    Data = new
                    {
                        success = true,
                        processed = 0,
                        message = "Aucune réservation annulée à traiter",
                        logs = logMessages,
                        duration = (DateTime.Now - startTime).TotalSeconds
                    },
                    JsonRequestBehavior = JsonRequestBehavior.AllowGet
                };
            }
            
            foreach (var reservation in cancelledReservations)
            {
                try
                {
                    logMessages.Add($"❌ Traitement annulation: {reservation.id}");
                    logMessages.Add($"👤 Conducteur assigné: {reservation.conducteur_id}");
                    
                    // 2. Construire message d'annulation
                    var message = $"❌ Course annulée: {reservation.depart_nom} → {reservation.destination_nom}";
                    
                    // 3. Envoyer notification OneSignal
                    var success = SendCancellationNotificationToConducteur(
                        reservation.conducteur_id.ToString(),
                        message,
                        reservation.id.ToString()
                    );
                    
                    if (success)
                    {
                        logMessages.Add($"📱 Notification annulation envoyée au conducteur");
                        
                        // 4. Marquer comme notifiée
                        var updateUrl = $"{supabaseUrl}/rest/v1/reservations?id=eq.{reservation.id}";
                        var updatePayload = new { cancellation_notified_at = DateTime.UtcNow };
                        var updateContent = new StringContent(
                            JsonConvert.SerializeObject(updatePayload),
                            Encoding.UTF8,
                            "application/json"
                        );
                        
                        var updateResponse = await httpClient.SendAsync(
                            new HttpRequestMessage(new HttpMethod("PATCH"), updateUrl)
                            {
                                Content = updateContent
                            }
                        );
                        
                        if (updateResponse.IsSuccessStatusCode)
                        {
                            logMessages.Add($"✅ Réservation {reservation.id} marquée comme notifiée");
                            processedCount++;
                        }
                    }
                    else
                    {
                        logMessages.Add($"⚠️ Échec envoi notification annulation");
                    }
                    
                    // Délai anti-spam
                    await Task.Delay(500);
                }
                catch (Exception ex)
                {
                    logMessages.Add($"❌ Erreur traitement annulation {reservation.id}: {ex.Message}");
                }
            }
        }
        
        var duration = (DateTime.Now - startTime).TotalSeconds;
        var resultMessage = $"✅ Traitement terminé: {processedCount} annulation(s) notifiée(s) en {duration:F1}s";
        logMessages.Add(resultMessage);
        
        return new JsonResult
        {
            Data = new
            {
                success = true,
                processed = processedCount,
                message = resultMessage,
                logs = logMessages,
                duration = duration
            },
            JsonRequestBehavior = JsonRequestBehavior.AllowGet
        };
    }
    catch (Exception ex)
    {
        var duration = (DateTime.Now - startTime).TotalSeconds;
        logMessages.Add($"❌ ERREUR GLOBALE: {ex.Message}");
        
        return new JsonResult
        {
            Data = new
            {
                success = false,
                processed = 0,
                message = $"Erreur: {ex.Message}",
                logs = logMessages,
                duration = duration
            },
            JsonRequestBehavior = JsonRequestBehavior.AllowGet
        };
    }
}
```

### **2.2 Méthode OneSignal - SendCancellationNotificationToConducteur**

```csharp
// Méthode spécialisée pour notifications d'annulation
public bool SendCancellationNotificationToConducteur(string conducteurId, string message, string reservationId)
{
    ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;
    
    try
    {
        var request = WebRequest.Create(ConfigurationManager.AppSettings["onesignalUrl"]) as HttpWebRequest;
        request.KeepAlive = true;
        request.Method = "POST";
        request.ContentType = "application/json; charset=utf-8";
        request.Headers.Add("Authorization", "Key " + ConfigurationManager.AppSettings["onesignalApiKey"]);
        
        var serializer = new JavaScriptSerializer();
        var obj = new
        {
            app_id = ConfigurationManager.AppSettings["onesignalAppId"],
            contents = new { 
                en = message,
                fr = message 
            },
            headings = new { 
                en = "Course Annulée",
                fr = "Course Annulée" 
            },
            include_external_user_ids = new string[] { "conducteur_" + conducteurId },
            priority = 10,
            android_accent_color = "FFFF0000",  // Rouge pour annulation
            android_led_color = "FFFF0000",     // LED rouge
            data = new
            {
                type = "reservation_cancelled",
                reservation_id = reservationId,
                conducteur_id = conducteurId,
                timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            }
        };
        
        var param = serializer.Serialize(obj);
        byte[] byteArray = Encoding.UTF8.GetBytes(param);
        
        using (var writer = request.GetRequestStream())
        {
            writer.Write(byteArray, 0, byteArray.Length);
        }
        
        using (var response = request.GetResponse() as HttpWebResponse)
        {
            using (var reader = new StreamReader(response.GetResponseStream()))
            {
                var responseContent = reader.ReadToEnd();
                System.Diagnostics.Debug.WriteLine("OneSignal Cancellation Success: " + responseContent);
            }
        }
        
        return true;
    }
    catch (WebException ex)
    {
        System.Diagnostics.Debug.WriteLine("OneSignal Cancellation Error: " + ex.Message);
        return false;
    }
}
```

### **2.3 Méthode Test Direct**

```csharp
// Méthode de test pour annulation
public JsonResult TestCancellationNotification(string conducteurId = "69e0cde9-14a0-4dde-86c1-1fe9a306f2fa")
{
    var message = "❌ TEST - Course annulée: Lieusaint → Paris";
    var success = SendCancellationNotificationToConducteur(
        conducteurId, 
        message, 
        "test-reservation-id"
    );
    
    return Json(new
    {
        success = success,
        message = success ? "Notification annulation envoyée" : "Échec envoi",
        conducteurId = conducteurId,
        externalUserId = $"conducteur_{conducteurId}"
    }, JsonRequestBehavior.AllowGet);
}
```

---

## 📱 **PHASE 3 - MOBILE (Ionic/Angular)**

### **3.1 Mise à jour Service OneSignal**

```typescript
// Dans src/app/services/onesignal.service.ts

// Modifier handleNotificationReceived()
private handleNotificationReceived(notification: any): void {
    console.log('🔔 Traitement notification reçue:', notification);
    
    const additionalData = notification.additionalData;
    
    if (additionalData?.type === 'new_reservation') {
        console.log('🚗 Nouvelle réservation détectée via notification');
        
        if (this.reservationsPageCallback) {
            this.reservationsPageCallback().catch(error => {
                console.error('❌ Erreur callback réservations:', error);
            });
        }
    } else if (additionalData?.type === 'reservation_cancelled') {
        console.log('❌ Annulation réservation détectée via notification');
        
        // Rafraîchir la page si callback disponible
        if (this.reservationsPageCallback) {
            this.reservationsPageCallback().catch(error => {
                console.error('❌ Erreur callback annulation:', error);
            });
        }
        
        // Optionnel: Afficher un toast d'annulation
        this.showCancellationToast(notification.body);
    }
}

// Modifier handleNotificationOpened()
private handleNotificationOpened(result: any): void {
    console.log('👆 Traitement notification ouverte:', result);
    
    const notification = result.notification;
    const additionalData = notification.additionalData;
    
    if (additionalData?.type === 'new_reservation') {
        console.log('🚗 Navigation vers réservations suite à clic notification');
        this.router.navigate(['/tabs/reservations']);
    } else if (additionalData?.type === 'reservation_cancelled') {
        console.log('❌ Navigation vers historique suite à annulation');
        // Navigation vers historique ou réservations
        this.router.navigate(['/tabs/historique']);
    }
}

// Nouvelle méthode pour toast (optionnel)
private async showCancellationToast(message: string): Promise<void> {
    try {
        // Si vous utilisez Ionic Toast
        // const toast = await this.toastController.create({
        //     message: message,
        //     duration: 5000,
        //     color: 'danger',
        //     position: 'top'
        // });
        // await toast.present();
        
        console.log('❌ Toast annulation:', message);
    } catch (error) {
        console.error('Erreur affichage toast:', error);
    }
}
```

---

## 🧪 **PHASE 4 - TESTS**

### **4.1 URLs de Test**

| URL | Description |
|-----|-------------|
| `/Taxi/ProcessCancelledReservationNotifications` | Polling principal annulations |
| `/Taxi/TestCancellationNotification?conducteurId=xxx` | Test notification directe |

### **4.2 Scénario de Test Complet**

```sql
-- ÉTAPE 1: Créer une réservation assignée à un conducteur
INSERT INTO reservations (
    client_phone,
    depart_nom,
    destination_nom,
    position_depart,
    vehicle_type,
    statut,
    conducteur_id,  -- IMPORTANT: Assigner un conducteur
    prix_total
) VALUES (
    '+33123456789',
    'TEST Annulation Lieusaint',
    'TEST Annulation Paris',
    ST_GeomFromText('POINT(2.5891222 48.6277095)', 4326),
    'moto',
    'accepted',  -- Statut initial accepté
    '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa',  -- ID conducteur
    30.00
);

-- ÉTAPE 2: Annuler la réservation
UPDATE reservations 
SET statut = 'canceled',
    updated_at = NOW()
WHERE depart_nom = 'TEST Annulation Lieusaint';

-- ÉTAPE 3: Vérifier les réservations annulées non notifiées
SELECT id, conducteur_id, depart_nom, statut, cancellation_notified_at
FROM reservations 
WHERE statut = 'canceled' 
  AND conducteur_id IS NOT NULL
  AND cancellation_notified_at IS NULL;

-- ÉTAPE 4: Appeler le polling
-- URL: /Taxi/ProcessCancelledReservationNotifications

-- ÉTAPE 5: Vérifier que la notification a été marquée
SELECT id, conducteur_id, cancellation_notified_at
FROM reservations 
WHERE depart_nom = 'TEST Annulation Lieusaint';
```

---

## 🔄 **INTÉGRATION SYSTÈME GLOBAL**

### **Architecture Dual Polling**

```javascript
// Planificateur production (exemple Node.js/Cron)
// Exécuter toutes les 2-3 minutes

setInterval(async () => {
    // Polling nouvelles réservations
    await fetch('/Taxi/ProcessPendingReservationNotifications');
    
    // Polling annulations (30 secondes après)
    setTimeout(async () => {
        await fetch('/Taxi/ProcessCancelledReservationNotifications');
    }, 30000);
    
}, 180000); // 3 minutes
```

### **Monitoring Unifié**

```sql
-- Dashboard monitoring notifications
SELECT 
    'Nouvelles' as type,
    COUNT(*) as total,
    COUNT(CASE WHEN notified_at IS NOT NULL THEN 1 END) as notifiees
FROM reservations
WHERE statut = 'pending'
UNION ALL
SELECT 
    'Annulations' as type,
    COUNT(*) as total,
    COUNT(CASE WHEN cancellation_notified_at IS NOT NULL THEN 1 END) as notifiees
FROM reservations
WHERE statut = 'canceled' AND conducteur_id IS NOT NULL;
```

---

## ✅ **CHECKLIST D'IMPLÉMENTATION**

- [ ] **Database**
  - [ ] Ajouter colonne `cancellation_notified_at`
  - [ ] Créer fonction `find_cancelled_reservations_to_notify()`
  - [ ] Créer index performance

- [ ] **Backend C#**
  - [ ] Ajouter `ProcessCancelledReservationNotifications()`
  - [ ] Ajouter `SendCancellationNotificationToConducteur()`
  - [ ] Ajouter `TestCancellationNotification()`

- [ ] **Mobile**
  - [ ] Mettre à jour `handleNotificationReceived()`
  - [ ] Mettre à jour `handleNotificationOpened()`
  - [ ] Tester navigation vers historique

- [ ] **Tests**
  - [ ] Test création/annulation réservation
  - [ ] Test polling annulations
  - [ ] Test réception notification mobile
  - [ ] Test navigation au clic

---

## 📊 **MÉTRIQUES SUCCÈS**

- ✅ **Détection automatique** des annulations en < 3 minutes
- ✅ **Notification immédiate** au conducteur assigné
- ✅ **Zéro doublon** grâce à `cancellation_notified_at`
- ✅ **Navigation appropriée** vers historique
- ✅ **Logs détaillés** pour monitoring

---

## 🎯 **RÉSULTAT ATTENDU**

Un système complet de notifications d'annulation qui :
1. **Détecte automatiquement** les réservations annulées
2. **Notifie uniquement** le conducteur assigné
3. **Évite les doublons** avec tracking en base
4. **Offre une UX claire** avec messages et navigation adaptés
5. **S'intègre parfaitement** avec le système existant

**🚀 Prêt pour implémentation !**