// ========================================
// MÉTHODES D'ANNULATION À AJOUTER DANS ASP_MVC_PUSH_NOTIFICATION_RESERVATION.cs
// ========================================

// Méthode principale pour traiter les réservations annulées
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
            httpClient.DefaultRequestHeaders.Add("Prefer", "return=representation");
            
            logMessages.Add("🔍 Récupération réservations annulées...");
            
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
                    logMessages.Add($"📍 Trajet: {reservation.depart_nom} → {reservation.destination_nom}");
                    
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
                        
                        httpClient.DefaultRequestHeaders.Remove("Prefer");
                        httpClient.DefaultRequestHeaders.Add("Prefer", "return=minimal");
                        
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
                        else
                        {
                            logMessages.Add($"⚠️ Échec marquage notification pour {reservation.id}");
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
                duration = duration,
                stackTrace = ex.ToString()
            },
            JsonRequestBehavior = JsonRequestBehavior.AllowGet
        };
    }
}

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
        try
        {
            using (var reader = new StreamReader(ex.Response.GetResponseStream()))
            {
                string errorResponse = reader.ReadToEnd();
                System.Diagnostics.Debug.WriteLine("OneSignal Cancellation Error Response: " + errorResponse);
            }
        }
        catch { }
        return false;
    }
}

// Méthode de test pour annulation
public JsonResult TestCancellationNotification(string conducteurId = "69e0cde9-14a0-4dde-86c1-1fe9a306f2fa")
{
    var message = "❌ TEST - Course annulée: Lieusaint → Paris";
    var success = SendCancellationNotificationToConducteur(
        conducteurId, 
        message, 
        "test-reservation-id"
    );
    
    return new JsonResult
    {
        Data = new
        {
            success = success,
            message = success ? "Notification annulation envoyée" : "Échec envoi",
            conducteurId = conducteurId,
            externalUserId = $"conducteur_{conducteurId}",
            timestamp = DateTime.UtcNow
        },
        JsonRequestBehavior = JsonRequestBehavior.AllowGet
    };
}