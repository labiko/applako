        public async Task<ActionResult> ProcessPendingReservationNotifications()
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
                logMessages.Add($"🚀 Démarrage traitement notifications OneSignal - {startTime:HH:mm:ss}");

                using (var httpClient = new HttpClient())
                {
                    // 🔧 HEADERS SUPABASE
                    httpClient.DefaultRequestHeaders.Clear();
                    httpClient.DefaultRequestHeaders.Add("apikey", supabaseKey);
                    httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {supabaseKey}");
                    httpClient.DefaultRequestHeaders.Add("Prefer", "return=representation");

                    logMessages.Add("🔍 Récupération réservations pending...");

                    // 1. Récupérer réservations pending non notifiées
                    var resUrl =
$"{supabaseUrl}/rest/v1/reservations?statut=eq.pending&notified_at=is.null&select=id,depart_nom,destination_nom,vehicle_type,position_depart,prix_total,created_at";
                    
                    var resResponse = await httpClient.GetStringAsync(resUrl);
                    var reservations = JsonConvert.DeserializeObject<dynamic[]>(resResponse);

                    logMessages.Add($"📊 {reservations.Length} réservation(s) pending trouvée(s)");

                    if (reservations.Length == 0)
                    {
                        return new JsonResult
                        {
                            Data = new
                            {
                                success = true,
                                processed = 0,
                                message = "Aucune réservation pending",
                                logs = logMessages,
                                duration = (DateTime.Now - startTime).TotalSeconds
                            },
                            JsonRequestBehavior = JsonRequestBehavior.AllowGet
                        };
                    }

                    foreach (var res in reservations)
                    {
                        try
                        {
                            logMessages.Add($"🚗 Traitement réservation: {res.id} - Type: {res.vehicle_type}");

                            // 2. Trouver conducteurs compatibles dans 5km
                            var condUrl = $"{supabaseUrl}/rest/v1/rpc/find_nearby_conducteurs_by_vehicle";
                            
                            // Convertir position WKB vers format text lisible
                            string positionText = null;
                            try
                            {
                                // Si c'est du WKB, le convertir via une requête Supabase
                                var convertUrl = $"{supabaseUrl}/rest/v1/rpc/st_astext";
                                var convertPayload = new { geom = res.position_depart?.ToString() };
                                var convertContent = new StringContent(
                                    JsonConvert.SerializeObject(convertPayload),
                                    Encoding.UTF8,
                                    "application/json"
                                );
                                
                                var convertResponse = await httpClient.PostAsync(convertUrl, convertContent);
                                if (convertResponse.IsSuccessStatusCode)
                                {
                                    positionText = await convertResponse.Content.ReadAsStringAsync();
                                    positionText = positionText.Trim('"'); // Enlever les guillemets JSON
                                    logMessages.Add($"🗺️ Position convertie: {positionText}");
                                }
                                else
                                {
                                    // Fallback: utiliser directement la position brute
                                    positionText = res.position_depart?.ToString();
                                    logMessages.Add($"⚠️ Conversion position échouée, utilisation directe");
                                }
                            }
                            catch (Exception convEx)
                            {
                                positionText = res.position_depart?.ToString();
                                logMessages.Add($"⚠️ Erreur conversion position: {convEx.Message}");
                            }
                            
                            var condPayload = new
                            {
                                p_position_depart = positionText,
                                p_vehicle_type = res.vehicle_type?.ToString(),
                                p_max_distance_km = 5
                            };

                            logMessages.Add($"🔍 Appel fonction Supabase: {condUrl}");
                            logMessages.Add($"📍 Position: {res.position_depart}");
                            logMessages.Add($"🚗 Type véhicule: {res.vehicle_type}");

                            var condContent = new StringContent(
                                JsonConvert.SerializeObject(condPayload),
                                Encoding.UTF8,
                                "application/json"
                            );

                            var condResponse = await httpClient.PostAsync(condUrl, condContent);
                            var condResult = await condResponse.Content.ReadAsStringAsync();
                            
                            logMessages.Add($"🌐 Status Code: {condResponse.StatusCode}");
                            logMessages.Add($"📥 Response Length: {condResult?.Length ?? 0}");
                            logMessages.Add($"📄 Raw Response: {condResult}");

                            // Vérifier le format de la réponse avant désérialisation
                            dynamic[] conducteurs;
                            try
                            {
                                if (string.IsNullOrWhiteSpace(condResult) || condResult.Trim() == "[]")
                                {
                                    logMessages.Add("⚠️ Réponse vide - Aucun conducteur trouvé");
                                    conducteurs = new dynamic[0];
                                }
                                else if (condResult.TrimStart().StartsWith("{"))
                                {
                                    logMessages.Add("❌ ERREUR: Réponse est un objet, pas un tableau");
                                    logMessages.Add($"🔧 Contenu objet: {condResult}");
                                    
                                    // Essayer de parser l'erreur
                                    var errorObj = JsonConvert.DeserializeObject<dynamic>(condResult);
                                    logMessages.Add($"💥 Erreur Supabase: {errorObj}");
                                    
                                    conducteurs = new dynamic[0];
                                }
                                else
                                {
                                    conducteurs = JsonConvert.DeserializeObject<dynamic[]>(condResult);
                                    logMessages.Add($"✅ Désérialisation réussie: {conducteurs.Length} conducteurs");
                                }
                            }
                            catch (Exception deserializeEx)
                            {
                                logMessages.Add($"❌ ERREUR DÉSÉRIALISATION: {deserializeEx.Message}");
                                logMessages.Add($"🔍 Type exception: {deserializeEx.GetType().Name}");
                                
                                if (!string.IsNullOrEmpty(condResult))
                                {
                                    logMessages.Add($"🔤 Premier caractère: '{condResult[0]}'");
                                    logMessages.Add($"🔤 Dernier caractère: '{condResult[condResult.Length - 1]}'");
                                    logMessages.Add($"🔍 Contient 'error': {condResult.Contains("error")}");
                                    logMessages.Add($"🔍 Contient 'message': {condResult.Contains("message")}");
                                }
                                
                                conducteurs = new dynamic[0];
                            }

                            logMessages.Add($"👥 {conducteurs.Length} conducteur(s) {res.vehicle_type} trouvé(s) dans 5km");

                            if (conducteurs.Length > 0)
                            {
                                // 3. Envoyer notification OneSignal à chaque conducteur
                                var message = $"🚗 Nouvelle course {res.vehicle_type}: {res.depart_nom} → {res.destination_nom}";
                                var notificationsSent = 0;

                                foreach (var cond in conducteurs)
                                {
                                    try
                                    {
                                        var success = SendNewReservationNotificationToConducteurs(
                                            cond.id.ToString(),
                                            message
                                        );

                                        if (success)
                                        {
                                            notificationsSent++;
                                            logMessages.Add($"📱 Notification envoyée à {cond.nom} ({cond.distance_km}km)");
                                        }
                                    }
                                    catch (Exception ex)
                                    {
                                        logMessages.Add($"❌ Erreur notification {cond.nom}: {ex.Message}");
                                    }
                                }

                                // 4. Marquer réservation comme notifiée
                                if (notificationsSent > 0)
                                {
                                    var updateUrl = $"{supabaseUrl}/rest/v1/reservations?id=eq.{res.id}";
                                    var updatePayload = new { notified_at = DateTime.UtcNow };
                                    var updateContent = new StringContent(
                                        JsonConvert.SerializeObject(updatePayload),
                                        Encoding.UTF8,
                                        "application/json"
                                    );

                                    httpClient.DefaultRequestHeaders.Remove("Prefer");
                                    httpClient.DefaultRequestHeaders.Add("Prefer", "return=minimal");

                                    var updateResponse = await httpClient.SendAsync(new HttpRequestMessage(new HttpMethod("PATCH"), updateUrl)
                                    {
                                        Content = updateContent
                                    });

                                    if (updateResponse.IsSuccessStatusCode)
                                    {
                                        logMessages.Add($"✅ Réservation {res.id} marquée comme notifiée");
                                        processedCount++;
                                    }
                                }
                            }
                            else
                            {
                                logMessages.Add($"⚠️ Aucun conducteur {res.vehicle_type} disponible dans 5km");
                            }

                            // Délai pour éviter le spam
                            await Task.Delay(500);
                        }
                        catch (Exception ex)
                        {
                            logMessages.Add($"❌ Erreur réservation {res.id}: {ex.Message}");
                        }
                    }
                }

                var duration = (DateTime.Now - startTime).TotalSeconds;
                var resultMessage = $"✅ Traitement terminé: {processedCount} réservation(s) traitée(s) en {duration:F1}s";
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

        // Méthode OneSignal pour envoyer notification External User IDs
        public bool SendNewReservationNotificationToConducteurs(string ConducteurId, string Message)
        {
            ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;
            var request = WebRequest.Create(ConfigurationManager.AppSettings["onesignalUrl"]) as HttpWebRequest;
            request.KeepAlive = true;
            request.Method = "POST";
            request.ContentType = "application/json; charset=utf-8";
            request.Headers.Add("Authorization", "Key " + ConfigurationManager.AppSettings["onesignalApiKey"]);

            var serializer = new JavaScriptSerializer();
            var obj = new
            {
                app_id = ConfigurationManager.AppSettings["onesignalAppId"],
                contents = new { en = Message },
                include_external_user_ids = new string[] { "conducteur_" + ConducteurId },
                priority = 10,
                data = new
                {
                    type = "new_reservation",
                    conducteur_id = ConducteurId,
                    timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                }
            };

            var param = serializer.Serialize(obj);
            byte[] byteArray = Encoding.UTF8.GetBytes(param);

            string responseContent = null;

            try
            {
                using (var writer = request.GetRequestStream())
                {
                    writer.Write(byteArray, 0, byteArray.Length);
                }

                using (var response = request.GetResponse() as HttpWebResponse)
                {
                    using (var reader = new StreamReader(response.GetResponseStream()))
                    {
                        responseContent = reader.ReadToEnd();
                    }
                }

                System.Diagnostics.Debug.WriteLine("OneSignal Success: " + responseContent);
                return true;
            }
            catch (WebException ex)
            {
                System.Diagnostics.Debug.WriteLine("OneSignal Error: " + ex.Message);
                try
                {
                    using (var reader = new StreamReader(ex.Response.GetResponseStream()))
                    {
                        string errorResponse = reader.ReadToEnd();
                        System.Diagnostics.Debug.WriteLine("OneSignal Error Response: " + errorResponse);
                    }
                }
                catch { }
                return false;
            }
        }

        // Méthode pour traiter JSON du trigger PostgreSQL (garde pour compatibilité)
        public object ProcessNewReservationNotification(System.Web.HttpRequestBase request, string conducteurId = null, string message = null)
        {
            // CAS 1: Paramètres GET/POST fournis (test navigateur)
            if (!string.IsNullOrEmpty(conducteurId) && !string.IsNullOrEmpty(message))
            {
                var callback = SendNewReservationNotificationToConducteurs(conducteurId, message);
                return new
                {
                    success = callback,
                    message = "Test notification envoyée",
                    method = "GET/POST parameters",
                    conducteurId = conducteurId
                };
            }

            // CAS 2: JSON du trigger (pour compatibilité)
            try
            {
                var requestBody = new StreamReader(request.InputStream).ReadToEnd();

                if (string.IsNullOrEmpty(requestBody))
                {
                    return new
                    {
                        success = false,
                        message = "Utilisez ProcessPendingReservationNotifications() pour le traitement automatique"
                    };
                }

                var serializer = new JavaScriptSerializer();
                var notificationRequest = serializer.Deserialize<dynamic>(requestBody);

                return new
                {
                    success = true,
                    message = "Utilisez ProcessPendingReservationNotifications() pour le traitement automatique",
                    method = "JSON deprecated - use ProcessPendingReservationNotifications"
                };
            }
            catch (Exception ex)
            {
                return new
                {
                    success = false,
                    message = "Erreur: " + ex.Message
                };
            }
        }