using System;
using System.Collections.Generic;
using System.Configuration;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using Newtonsoft.Json;

namespace TARIDIA.Areas.LengoPay
{
    // Modèles de données
    public class LengoPayCallbackModel
    {
        public string pay_id { get; set; }      // Identifiant unique du paiement
        public string status { get; set; }      // SUCCESS ou FAILED
        public decimal amount { get; set; }     // Montant du paiement traité
        public string message { get; set; }     // Message décrivant le résultat
        public string Client { get; set; }      // Numéro du client qui a payé (ex: "624897845")
    }

    public class LengoPayCallbackResult
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public string PaymentId { get; set; }
        public string ErrorDetails { get; set; }
    }

    public class PaymentNotificationCheckResult
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public int CheckedCount { get; set; }
        public int NotifiedCount { get; set; }
        public int FailedCount { get; set; }
        public double Duration { get; set; }
        public List<string> Logs { get; set; } = new List<string>();
    }

    // Nouveau modèle pour TriggerPaymentOnAcceptance
    public class TriggerPaymentResult
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public string PaymentId { get; set; }
        public string PaymentUrl { get; set; }
        public bool NotificationSent { get; set; }
        public List<string> Logs { get; set; }
        public double Duration { get; set; }
        public string ErrorDetails { get; set; }

        public TriggerPaymentResult()
        {
            Logs = new List<string>();
        }
    }

    // Modèle pour récupérer les données de réservation (structure DB réelle)
    public class ReservationData
    {
        public string id { get; set; }
        public string client_phone { get; set; }
        public decimal? prix_total { get; set; } // ✅ Correct : prix_total dans la DB
        public string vehicle_type { get; set; }
        public string destination_nom { get; set; }
        public string depart_nom { get; set; }
        public string statut { get; set; }
        public string position_depart { get; set; }
        public string destination_position { get; set; }
        public decimal? distance_km { get; set; }
        public string code_validation { get; set; }
        public DateTime? created_at { get; set; }
    }

    // Modèle pour créer un paiement
    public class LengoPayCreatePaymentRequest
    {
        public string websiteid { get; set; }
        public decimal amount { get; set; }
        public string currency { get; set; }
        public string type_account { get; set; }  // lp-om-gn pour Orange Money Guinée
        public string account { get; set; }       // Numéro de téléphone
        public string callback_url { get; set; }
        public string return_url { get; set; }
    }

    // Modèle pour la réponse de création de paiement
    public class LengoPayCreatePaymentResponse
    {
        public string status { get; set; }
        public string pay_id { get; set; }
        public string payment_url { get; set; }
    }

    /// <summary>
    /// Service pour gérer les callbacks de paiement LengoPay
    /// </summary>
    public class LengoPayCallbackService
    {
        private readonly string supabaseUrl;
        private readonly string supabaseKey;
        private readonly string lengoPayApiUrl;
        private readonly string lengoPayLicenseKey;
        private readonly string lengoPayWebsiteId;
        private readonly string lengoPayCallbackUrl;
        private readonly string logPath;

        public LengoPayCallbackService()
        {
            // Configuration Supabase depuis Web.config
            supabaseUrl = ConfigurationManager.AppSettings["Supabase:Url"];
            supabaseKey = ConfigurationManager.AppSettings["Supabase:Key"];

            // Configuration LengoPay depuis Web.config
            lengoPayApiUrl = ConfigurationManager.AppSettings["LengoPay:ApiUrl"];
            lengoPayLicenseKey = ConfigurationManager.AppSettings["LengoPay:LicenseKey"];
            lengoPayWebsiteId = ConfigurationManager.AppSettings["LengoPay:WebsiteId"];

            // Construire l'URL de callback avec la racine depuis Web.config
            string rootUrl = ConfigurationManager.AppSettings["RootUrl"];
            lengoPayCallbackUrl = ConfigurationManager.AppSettings["LengoPay:CallbackUrl"];

            // Définir le chemin des logs
            logPath = System.Web.HttpContext.Current?.Server.MapPath("~/App_Data/Logs") ?? @"C:\Logs";
        }

        /// <summary>
        /// Créer un nouveau paiement LengoPay
        /// </summary>
        public LengoPayCreatePaymentResponse CreatePayment(decimal amount, string phoneNumber, string callbackUrl = null)
        {
            try
            {
                LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ===== CRÉATION PAIEMENT LENGOPAY =====");
                LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] Montant: {amount:N0} GNF");
                LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] Téléphone: {phoneNumber}");

                // Préparer la requête
                var request = new LengoPayCreatePaymentRequest
                {
                    websiteid = lengoPayWebsiteId,
                    amount = amount,
                    currency = "GNF",
                    type_account = "lp-om-gn",  // Orange Money Guinée
                    account = phoneNumber,
                    callback_url = callbackUrl ?? lengoPayCallbackUrl,
                    return_url = ConfigurationManager.AppSettings["LengoPay:CallbackUrl"] ?? "http://localhost:2913/payment-success"
                };

                string jsonRequest = JsonConvert.SerializeObject(request);
                LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] Request JSON: {jsonRequest}");

                // Faire l'appel REST
                using (var client = new WebClient())
                {
                    // Headers
                    client.Headers[HttpRequestHeader.Authorization] = $"Basic {lengoPayLicenseKey}";
                    client.Headers[HttpRequestHeader.Accept] = "application/json";
                    client.Headers[HttpRequestHeader.ContentType] = "application/json";
                    client.Encoding = Encoding.UTF8;

                    // Appel API
                    string jsonResponse = client.UploadString(lengoPayApiUrl, "POST", jsonRequest);
                    LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] Response JSON: {jsonResponse}");

                    // Parser la réponse
                    var response = JsonConvert.DeserializeObject<LengoPayCreatePaymentResponse>(jsonResponse);

                    if (response != null && response.status == "Success")
                    {
                        LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ✅ Paiement créé avec succès");
                        LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] Payment ID: {response.pay_id}");
                        LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] Payment URL: {response.payment_url}");

                        // Sauvegarder en base
                        SaveInitialPayment(response.pay_id, amount, phoneNumber, jsonResponse);
                    }
                    else
                    {
                        LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ❌ Échec création paiement");
                    }

                    return response;
                }
            }
            catch (WebException webEx)
            {
                // Gérer les erreurs HTTP
                string errorResponse = "";
                if (webEx.Response != null)
                {
                    using (var reader = new StreamReader(webEx.Response.GetResponseStream()))
                    {
                        errorResponse = reader.ReadToEnd();
                    }
                }

                LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ❌ ERREUR WEB: {webEx.Message}");
                LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] Response: {errorResponse}");

                return new LengoPayCreatePaymentResponse
                {
                    status = "Error",
                    pay_id = null,
                    payment_url = null
                };
            }
            catch (Exception ex)
            {
                LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ❌ EXCEPTION: {ex.Message}");
                LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] Stack: {ex.StackTrace}");

                return new LengoPayCreatePaymentResponse
                {
                    status = "Error",
                    pay_id = null,
                    payment_url = null
                };
            }
        }

        /// <summary>
        /// Sauvegarder le paiement initial via API REST Supabase
        /// </summary>
        private void SaveInitialPayment(string paymentId, decimal amount, string phoneNumber, string rawJson)
        {
            try
            {
                var paymentData = new
                {
                    payment_id = paymentId,
                    status = "PENDING",
                    amount = amount,
                    currency = "GNF",
                    client_phone = phoneNumber,
                    message = "Paiement initié",
                    raw_json = JsonConvert.DeserializeObject(rawJson)
                };

                string jsonPayload = JsonConvert.SerializeObject(paymentData);

                using (var client = new WebClient())
                {
                    client.Headers[HttpRequestHeader.Authorization] = $"Bearer {supabaseKey}";
                    client.Headers["apikey"] = supabaseKey;
                    client.Headers[HttpRequestHeader.ContentType] = "application/json";
                    client.Headers["Prefer"] = "resolution=merge-duplicates";
                    client.Encoding = Encoding.UTF8;

                    string url = $"{supabaseUrl}/rest/v1/lengopay_payments";
                    string response = client.UploadString(url, "POST", jsonPayload);

                    LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] 💾 Paiement initial sauvegardé via API REST");
                }
            }
            catch (Exception ex)
            {
                LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ⚠️ Erreur sauvegarde initiale: {ex.Message}");
            }
        }

        /// <summary>
        /// NOUVELLE MÉTHODE - Sauvegarder le paiement initial avec reservation_id
        /// </summary>
        private void SaveInitialPaymentWithReservation(string paymentId, decimal amount, string phoneNumber, string rawJson, string reservationId)
        {
            try
            {
                var paymentData = new
                {
                    payment_id = paymentId,
                    status = "PENDING",
                    amount = amount,
                    currency = "GNF",
                    client_phone = phoneNumber,
                    message = "Paiement initié",
                    raw_json = JsonConvert.DeserializeObject(rawJson),
                    reservation_id = reservationId  // Ajout du lien direct avec la réservation
                };

                string jsonPayload = JsonConvert.SerializeObject(paymentData);

                using (var client = new WebClient())
                {
                    client.Headers[HttpRequestHeader.Authorization] = $"Bearer {supabaseKey}";
                    client.Headers["apikey"] = supabaseKey;
                    client.Headers[HttpRequestHeader.ContentType] = "application/json";
                    client.Headers["Prefer"] = "resolution=merge-duplicates";
                    client.Encoding = Encoding.UTF8;

                    string url = $"{supabaseUrl}/rest/v1/lengopay_payments";
                    string response = client.UploadString(url, "POST", jsonPayload);

                    LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] 💾 Paiement initial sauvegardé avec reservation_id: {reservationId}");
                }
            }
            catch (Exception ex)
            {
                LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ⚠️ Erreur sauvegarde initiale avec reservation: {ex.Message}");
            }
        }

        /// <summary>
        /// 🔄 VÉRIFIER ET NOTIFIER LES PAIEMENTS CONFIRMÉS
        /// Appelle le service Supabase payment-notification-checker
        /// </summary>
        public PaymentNotificationCheckResult CheckPaymentNotifications()
        {
            var startTime = DateTime.Now;
            var result = new PaymentNotificationCheckResult();

            try
            {
                result.Logs.Add($"🔄 [PAYMENT-CHECK] Début vérification paiements - {startTime:HH:mm:ss}");

                using (var client = new WebClient())
                {
                    client.Headers.Add("Authorization", $"Bearer {supabaseKey}");
                    client.Headers.Add("Content-Type", "application/json");
                    client.Encoding = Encoding.UTF8;

                    // URL du service payment-notification-checker
                    string serviceUrl = $"{supabaseUrl}/functions/v1/payment-notification-checker";
                    result.Logs.Add($"📨 [PAYMENT-CHECK] Appel service: {serviceUrl}");

                    // Appeler le service
                    string response = client.UploadString(serviceUrl, "POST", "{}");
                    result.Duration = (DateTime.Now - startTime).TotalSeconds;

                    result.Logs.Add($"📊 [PAYMENT-CHECK] Response: {response}");

                    // Parser la réponse
                    var responseData = JsonConvert.DeserializeObject<dynamic>(response);

                    if (responseData?.success == true)
                    {
                        result.Success = true;
                        result.Message = responseData?.message?.ToString() ?? "Vérification terminée";
                        result.CheckedCount = responseData?["checked"] != null ? Convert.ToInt32(responseData["checked"]) : 0;
                        result.NotifiedCount = responseData?["notified"] != null ? Convert.ToInt32(responseData["notified"]) : 0;
                        result.FailedCount = responseData?["failed"] != null ? Convert.ToInt32(responseData["failed"]) : 0;

                        result.Logs.Add($"✅ [PAYMENT-CHECK] Résultat: {result.Message}");
                        result.Logs.Add($"📊 [PAYMENT-CHECK] Vérifiés={result.CheckedCount}, Notifiés={result.NotifiedCount}, Échoués={result.FailedCount}");

                        LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ✅ Payment Check: {result.NotifiedCount}/{result.CheckedCount} notifiés");
                    }
                    else
                    {
                        result.Success = false;
                        result.Message = responseData?.error?.ToString() ?? "Erreur inconnue du service";
                        result.Logs.Add($"❌ [PAYMENT-CHECK] Erreur service: {result.Message}");

                        LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ❌ Payment Check Error: {result.Message}");
                    }
                }
            }
            catch (WebException webEx)
            {
                string errorResponse = "";
                if (webEx.Response != null)
                {
                    using (var reader = new StreamReader(webEx.Response.GetResponseStream()))
                    {
                        errorResponse = reader.ReadToEnd();
                    }
                }

                result.Success = false;
                result.Message = $"Erreur Web: {webEx.Message}";
                result.Duration = (DateTime.Now - startTime).TotalSeconds;
                result.Logs.Add($"❌ [PAYMENT-CHECK] Erreur Web: {webEx.Message}");
                result.Logs.Add($"📄 [PAYMENT-CHECK] Détails: {errorResponse}");

                LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ❌ Payment Check WebError: {webEx.Message}");
            }
            catch (Exception ex)
            {
                result.Success = false;
                result.Message = $"Erreur: {ex.Message}";
                result.Duration = (DateTime.Now - startTime).TotalSeconds;
                result.Logs.Add($"❌ [PAYMENT-CHECK] Exception: {ex.Message}");

                LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ❌ Payment Check Exception: {ex.Message}");
            }

            return result;
        }

        /// <summary>
        /// Traiter le callback de paiement LengoPay
        /// </summary>
        public LengoPayCallbackResult ProcessCallback(string jsonBody)
        {
            var result = new LengoPayCallbackResult();

            try
            {
                // Logger la requête brute
                LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ===== NOUVEAU CALLBACK LENGOPAY =====");
                LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] JSON Reçu: {jsonBody}");

                // Valider et parser le JSON
                if (string.IsNullOrWhiteSpace(jsonBody))
                {
                    throw new ArgumentException("JSON body is empty");
                }

                var callbackData = JsonConvert.DeserializeObject<LengoPayCallbackModel>(jsonBody);
                if (callbackData == null)
                {
                    throw new InvalidOperationException("Failed to deserialize JSON");
                }

                // Logger les détails
                LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] Payment ID: {callbackData.pay_id}");
                LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] Status: {callbackData.status}");
                LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] Amount: {callbackData.amount:N0} GNF");
                LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] Client: {callbackData.Client}");
                LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] Message: {callbackData.message}");

                // Sauvegarder dans Supabase
                SaveToSupabase(callbackData, jsonBody);

                // Traiter selon le statut
                switch (callbackData.status?.ToUpper())
                {
                    case "SUCCESS":
                        ProcessSuccessfulPayment(callbackData);
                        result.Success = true;
                        result.Message = "Payment processed successfully";
                        LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ✅ PAIEMENT RÉUSSI - Traitement terminé");
                        break;

                    case "FAILED":
                        ProcessFailedPayment(callbackData);
                        result.Success = true;
                        result.Message = "Failed payment recorded";
                        LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ❌ PAIEMENT ÉCHOUÉ - Enregistré");
                        break;

                    default:
                        LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ⚠️ STATUT INCONNU: {callbackData.status}");
                        result.Success = true;
                        result.Message = $"Unknown status: {callbackData.status}";
                        break;
                }

                result.PaymentId = callbackData.pay_id;
                LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ===== FIN TRAITEMENT CALLBACK =====\n");
            }
            catch (Exception ex)
            {
                result.Success = false;
                result.Message = "Error processing callback";
                result.ErrorDetails = ex.Message;

                LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ⚠️ EXCEPTION: {ex.Message}");
                LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] STACK: {ex.StackTrace}");
                LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ===== FIN AVEC ERREUR =====\n");
            }

            return result;
        }
        /// <summary>
        /// VERSION CORRIGÉE - SaveToSupabase pour remplacer dans LengoPayCallbackService.cs
        /// </summary>

        private void SaveToSupabase(LengoPayCallbackModel payment, string rawJson)
        {
            try
            {
                LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] 📊 Sauvegarde via API REST Supabase");

                var paymentData = new
                {
                    payment_id = payment.pay_id ?? "",
                    status = payment.status ?? "UNKNOWN",
                    amount = payment.amount,
                    currency = "GNF",
                    client_phone = payment.Client ?? "",
                    message = payment.message ?? "",
                    raw_json = JsonConvert.DeserializeObject(rawJson),
                    processed_at = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
                    updated_at = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
                };

                string jsonPayload = JsonConvert.SerializeObject(paymentData);
                LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] 📦 Payload: {jsonPayload}");

                using (var client = new WebClient())
                {
                    client.Headers[HttpRequestHeader.Authorization] = $"Bearer {supabaseKey}";
                    client.Headers["apikey"] = supabaseKey;
                    client.Headers[HttpRequestHeader.ContentType] = "application/json";
                    client.Encoding = Encoding.UTF8;

                    try
                    {
                        // Vérifier si le payment_id existe déjà
                        string checkUrl = $"{supabaseUrl}/rest/v1/lengopay_payments?payment_id=eq.{payment.pay_id}&select=id";
                        LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] 🔍 Vérification existence: {checkUrl}");

                        string existingRecord = client.DownloadString(checkUrl);
                        LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] 📋 Résultat recherche: {existingRecord}");

                        string response = "";

                        if (existingRecord == "[]" || string.IsNullOrEmpty(existingRecord))
                        {
                            // Nouveau paiement - INSERT avec POST
                            client.Headers["Prefer"] = "return=representation";
                            string insertUrl = $"{supabaseUrl}/rest/v1/lengopay_payments";
                            LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] 🆕 INSERT nouveau paiement");

                            response = client.UploadString(insertUrl, "POST", jsonPayload);
                            LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ✅ Nouveau paiement créé");
                        }
                        else
                        {
                            // Paiement existe - Récupérer d'abord les données existantes pour préserver reservation_id
                            string getUrl = $"{supabaseUrl}/rest/v1/lengopay_payments?payment_id=eq.{payment.pay_id}&select=reservation_id";
                            string existingData = client.DownloadString(getUrl);
                            LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] 🔍 Données existantes: {existingData}");

                            dynamic[] existingPayments = JsonConvert.DeserializeObject<dynamic[]>(existingData);
                            string existingReservationId = null;

                            if (existingPayments != null && existingPayments.Length > 0)
                            {
                                existingReservationId = existingPayments[0].reservation_id?.ToString();
                                LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] 🔗 Reservation_id existant: {existingReservationId ?? "null"}");
                            }

                            // UPDATE avec PATCH en préservant le reservation_id
                            client.Headers["Prefer"] = "return=representation";
                            string updateUrl = $"{supabaseUrl}/rest/v1/lengopay_payments?payment_id=eq.{payment.pay_id}";
                            LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] 🔄 UPDATE paiement existant avec préservation reservation_id");

                            // Construire updateData en préservant reservation_id s'il existe
                            var updateData = new
                            {
                                status = payment.status ?? "UNKNOWN",
                                message = payment.message ?? "",
                                processed_at = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
                                updated_at = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
                                reservation_id = existingReservationId // ✅ PRÉSERVATION
                            };
                            string updateJson = JsonConvert.SerializeObject(updateData);

                            response = client.UploadString(updateUrl, "PATCH", updateJson);
                            LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ✅ Paiement mis à jour avec reservation_id préservé: {existingReservationId ?? "null"}");
                        }

                        LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] 📥 Réponse Supabase: {response}");

                        // ✅ DÉSACTIVATION LinkToReservationViaAPI - Conservation des reservation_id existants
                        if (payment.status?.ToUpper() == "SUCCESS")
                        {
                            LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ✅ Paiement SUCCESS traité - LinkToReservationViaAPI désactivé pour conservation des reservation_id");
                        }
                    }
                    catch (WebException innerWebEx)
                    {
                        string errorDetail = "";
                        if (innerWebEx.Response != null)
                        {
                            using (var reader = new StreamReader(innerWebEx.Response.GetResponseStream()))
                            {
                                errorDetail = reader.ReadToEnd();
                            }
                        }
                        LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ❌ Erreur Web: {innerWebEx.Message}");
                        LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] 📄 Détails: {errorDetail}");
                        throw;
                    }
                }
            }
            catch (WebException webEx)
            {
                string errorResponse = "";
                if (webEx.Response != null)
                {
                    using (var reader = new StreamReader(webEx.Response.GetResponseStream()))
                    {
                        errorResponse = reader.ReadToEnd();
                    }
                }
                LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ❌ ERREUR WEB SaveToSupabase: {webEx.Message}");
                LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] 📄 Détails erreur: {errorResponse}");
            }
            catch (Exception ex)
            {
                LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ⚠️ Erreur SaveToSupabase: {ex.Message}");
                LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] 📄 Stack trace: {ex.StackTrace}");
            }
        }



        /// <summary>
        /// Lier le paiement à une réservation via API REST
        /// </summary>
        private void LinkToReservationViaAPI(LengoPayCallbackModel payment)
        {
            try
            {
                // Normaliser le numéro de téléphone
                string clientPhone = payment.Client;
                if (!clientPhone.StartsWith("+"))
                {
                    // Ajouter le code pays Guinée si manquant
                    if (clientPhone.StartsWith("6"))
                    {
                        clientPhone = "+224" + clientPhone;
                    }
                }

                // Rechercher une réservation via API REST
                using (var client = new WebClient())
                {
                    client.Headers[HttpRequestHeader.Authorization] = $"Bearer {supabaseKey}";
                    client.Headers["apikey"] = supabaseKey;
                    client.Headers[HttpRequestHeader.ContentType] = "application/json";
                    client.Encoding = Encoding.UTF8;

                    // Construire la requête pour trouver une réservation correspondante
                    string searchUrl = $"{supabaseUrl}/rest/v1/reservations?" +
                        $"client_phone=eq.{clientPhone}" +
                        $"&statut=in.(pending,accepted,confirmed)" +
                        $"&select=id,client_nom,statut,prix_total" +
                        $"&order=created_at.desc" +
                        $"&limit=1";

                    string searchResponse = client.DownloadString(searchUrl);
                    dynamic[] reservations = JsonConvert.DeserializeObject<dynamic[]>(searchResponse);

                    if (reservations != null && reservations.Length > 0)
                    {
                        var reservation = reservations[0];
                        string reservationId = reservation.id.ToString();
                        decimal prixTotal = Convert.ToDecimal(reservation.prix_total);

                        // Vérifier que le montant correspond (tolérance 1000 GNF)
                        if (Math.Abs(prixTotal - payment.amount) < 1000)
                        {
                            LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] 🔗 Réservation trouvée: ID={reservationId}, Prix={prixTotal:N0} GNF");

                            // Mettre à jour le paiement avec l'ID de réservation
                            var updateData = new { reservation_id = reservationId };
                            string updateJson = JsonConvert.SerializeObject(updateData);

                            string updateUrl = $"{supabaseUrl}/rest/v1/lengopay_payments?payment_id=eq.{payment.pay_id}";
                            client.Headers[HttpRequestHeader.ContentType] = "application/json";
                            client.Headers["Prefer"] = "return=representation";

                            client.UploadString(updateUrl, "PATCH", updateJson);
                            LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ✅ Paiement lié à la réservation {reservationId}");

                            // Mettre à jour le statut de la réservation
                            UpdateReservationStatusViaAPI(reservationId, "paid");
                        }
                    }
                    else
                    {
                        LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ℹ️ Aucune réservation trouvée pour {clientPhone}");
                    }
                }
            }
            catch (Exception ex)
            {
                LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ⚠️ Erreur liaison réservation: {ex.Message}");
            }
        }

        /// <summary>
        /// Mettre à jour le statut d'une réservation via API REST
        /// </summary>
        private void UpdateReservationStatusViaAPI(string reservationId, string newStatus)
        {
            try
            {
                using (var client = new WebClient())
                {
                    client.Headers[HttpRequestHeader.Authorization] = $"Bearer {supabaseKey}";
                    client.Headers["apikey"] = supabaseKey;
                    client.Headers[HttpRequestHeader.ContentType] = "application/json";
                    client.Encoding = Encoding.UTF8;

                    var updateData = new
                    {
                        statut = newStatus,
                        updated_at = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
                    };

                    string updateJson = JsonConvert.SerializeObject(updateData);
                    string updateUrl = $"{supabaseUrl}/rest/v1/reservations?id=eq.{reservationId}";

                    client.UploadString(updateUrl, "PATCH", updateJson);
                    LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ✅ Réservation {reservationId} marquée comme payée");
                }
            }
            catch (Exception ex)
            {
                LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ⚠️ Erreur mise à jour réservation: {ex.Message}");
            }
        }

        /// <summary>
        /// Traiter un paiement réussi
        /// </summary>
        private void ProcessSuccessfulPayment(LengoPayCallbackModel payment)
        {
            try
            {
                LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] 💰 Traitement paiement SUCCESS pour {payment.Client}");

                // 📱 ENVOYER NOTIFICATION DE CONFIRMATION AU CLIENT
                SendPaymentConfirmationNotification(payment);

                // 🔄 METTRE À JOUR STATUT RÉSERVATION  
                //  UpdateReservationStatus(payment.pay_id, "paid");

            }
            catch (Exception ex)
            {
                LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] Erreur ProcessSuccessfulPayment: {ex.Message}");
            }
        }

        /// <summary>
        /// 📱 ENVOYER NOTIFICATION DE CONFIRMATION PAIEMENT
        /// </summary>
        private void SendPaymentConfirmationNotification(LengoPayCallbackModel payment)
        {
            try
            {
                LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] 📱 Envoi confirmation paiement pour {payment.Client}");

                using (var client = new WebClient())
                {
                    client.Headers.Add("Authorization", $"Bearer {supabaseKey}");
                    client.Headers.Add("Content-Type", "application/json");
                    client.Headers.Add("apikey", supabaseKey);
                    client.Encoding = Encoding.UTF8;

                    // 1. RÉCUPÉRER LE PAIEMENT AVEC RESERVATION_ID
                    string getPaymentUrl = $"{supabaseUrl}/rest/v1/lengopay_payments?payment_id=eq.{payment.pay_id}&select=reservation_id";
                    LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] 🔍 Recherche reservation_id pour payment: {payment.pay_id}");

                    string paymentData = client.DownloadString(getPaymentUrl);
                    dynamic[] payments = JsonConvert.DeserializeObject<dynamic[]>(paymentData);

                    if (payments == null || payments.Length == 0 || payments[0].reservation_id == null)
                    {
                        LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ❌ Pas de reservation_id trouvé - notification annulée");
                        return;
                    }

                    string reservationId = payments[0].reservation_id.ToString();
                    LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ✅ Reservation_id trouvé: {reservationId}");

                    // 2. RÉCUPÉRER LA RÉSERVATION AVEC CLIENT_PHONE ET CONDUCTEUR_ID
                    string getReservationUrl = $"{supabaseUrl}/rest/v1/reservations?id=eq.{reservationId}&select=client_phone,destination_nom,depart_nom,vehicle_type,prix_total,conducteur_id";
                    LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] 🔍 Recherche client_phone depuis réservation: {reservationId}");

                    string reservationData = client.DownloadString(getReservationUrl);
                    dynamic[] reservations = JsonConvert.DeserializeObject<dynamic[]>(reservationData);

                    if (reservations == null || reservations.Length == 0 || reservations[0].client_phone == null)
                    {
                        LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ❌ Pas de client_phone trouvé - notification annulée");
                        return;
                    }

                    var reservation = reservations[0];
                    string clientPhone = reservation.client_phone.ToString();
                    LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ✅ Client phone trouvé: {clientPhone} (payeur était: {payment.Client})");

                    var notificationServiceUrl = $"{supabaseUrl}/functions/v1/notification-service?action=send";

                    // 4. RÉCUPÉRER LES INFORMATIONS DU CONDUCTEUR
                    string conducteurNom = "Votre conducteur";
                    string conducteurTelephone = "";
                    string tempsArrivee = "quelques minutes";

                    if (reservation.conducteur_id != null)
                    {
                        try
                        {
                            string getConducteurUrl = $"{supabaseUrl}/rest/v1/conducteurs?id=eq.{reservation.conducteur_id}&select=nom,telephone";
                            string conducteurData = client.DownloadString(getConducteurUrl);
                            dynamic[] conducteurs = JsonConvert.DeserializeObject<dynamic[]>(conducteurData);

                            if (conducteurs != null && conducteurs.Length > 0)
                            {
                                conducteurNom = conducteurs[0].nom?.ToString() ?? "Votre conducteur";
                                conducteurTelephone = conducteurs[0].telephone?.ToString() ?? "";
                                LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ✅ Conducteur trouvé: {conducteurNom}");
                            }
                        }
                        catch (Exception conducteurEx)
                        {
                            LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ⚠️ Erreur récupération conducteur: {conducteurEx.Message}");
                        }
                    }

                    // Message de confirmation VERSION 3 - Focus sur l'action
                    var confirmationMessage = $@"🚗 **VOTRE CONDUCTEUR ARRIVE !**

✅ Paiement validé : **{payment.amount:N0} GNF**
🎯 Destination : {reservation.destination_nom ?? "Votre destination"}
🏍️ Véhicule : {reservation.vehicle_type?.ToString()?.ToUpper() ?? "TAXI"}

👨‍✈️ **{conducteurNom}**{(string.IsNullOrEmpty(conducteurTelephone) ? "" : $" - 📞 {conducteurTelephone}")}
⏱️ **Arrivée dans {tempsArrivee}**

🔄 **Statut :** En route vers vous
📍 Le conducteur connaît votre position

Merci LokoTaxi ! 🙏";

                    var payload = JsonConvert.SerializeObject(new
                    {
                        to = clientPhone.Replace("whatsapp:", ""),  // ✅ Utilise le client de la réservation
                        message = confirmationMessage,
                        type = "confirmation",
                        priority = "high"
                    });

                    LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] 📱 [CONFIRMATION] Envoi au client de réservation: {clientPhone}");
                    LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] 📱 [CONFIRMATION] Payload: {payload}");

                    var response = client.UploadString(notificationServiceUrl, "POST", payload);
                    LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] 📱 [CONFIRMATION] Response: {response}");

                    var notificationData = JsonConvert.DeserializeObject<dynamic>(response);
                    bool success = notificationData?.success == true;

                    LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] 📱 [CONFIRMATION] Résultat: {(success ? "✅ Confirmation envoyée" : "❌ Échec confirmation")}");

                    // 3. MARQUER LE PAIEMENT COMME NOTIFIÉ POUR ÉVITER DOUBLE NOTIFICATION
                    if (success)
                    {
                        try
                        {
                            var updatePaymentUrl = $"{supabaseUrl}/rest/v1/lengopay_payments?payment_id=eq.{payment.pay_id}";
                            var updateData = new
                            {
                                processed_client_notified_at = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss")
                            };
                            string updateJson = JsonConvert.SerializeObject(updateData);

                            client.Headers["Prefer"] = "return=representation";
                            client.UploadString(updatePaymentUrl, "PATCH", updateJson);

                            LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ✅ Paiement marqué comme notifié");
                        }
                        catch (Exception updateEx)
                        {
                            LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ⚠️ Erreur marquage notification: {updateEx.Message}");
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ❌ Erreur envoi confirmation: {ex.Message}");
            }
        }



        /// <summary>
        /// Traiter un paiement échoué
        /// </summary>
        private void ProcessFailedPayment(LengoPayCallbackModel payment)
        {
            try
            {
                LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ❌ Traitement échec paiement pour {payment.Client}");

                // TODO: Ajouter ici la logique métier pour échec
                // - Notifier le client de l'échec
                // - Proposer une nouvelle tentative
                // - Logger pour analyse
            }
            catch (Exception ex)
            {
                LogToFile($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] Erreur ProcessFailedPayment: {ex.Message}");
            }
        }

        /// <summary>
        /// 💳 DÉCLENCHER PAIEMENT AUTOMATIQUE QUAND CONDUCTEUR ACCEPTE RÉSERVATION
        /// VERSION MISE À JOUR - Utilise configuration par entreprise avec fallback
        /// </summary>
        public TriggerPaymentResult TriggerPaymentOnAcceptance(string reservationId, string conducteurId = null)
        {
            var startTime = DateTime.Now;
            var result = new TriggerPaymentResult();

            try
            {
                result.Logs.Add($"🚀 [PAYMENT-TRIGGER] Début pour réservation: {reservationId}");
                result.Logs.Add($"🚀 [PAYMENT-TRIGGER] Conducteur ID: {conducteurId ?? "null"}");

                // 1. RÉCUPÉRER DONNÉES RÉSERVATION DEPUIS SUPABASE
                var reservationData = GetReservationData(reservationId, result.Logs);
                if (reservationData == null)
                {
                    result.Success = false;
                    result.Message = "Réservation introuvable";
                    result.ErrorDetails = $"Aucune réservation trouvée avec ID: {reservationId}";
                    return result;
                }

                // 2. TENTATIVE RÉCUPÉRATION CONFIG ENTREPRISE (si conducteurId fourni)
                dynamic entrepriseConfig = null;
                if (!string.IsNullOrEmpty(conducteurId))
                {
                    entrepriseConfig = GetEnterprisePaymentConfig(conducteurId, result.Logs);
                    
                    // Vérifier si la configuration est désactivée
                    if (entrepriseConfig != null && entrepriseConfig.is_active == false)
                    {
                        result.Success = false;
                        result.Message = "Configuration de paiement désactivée pour cette entreprise";
                        result.ErrorDetails = "PAYMENT_CONFIG_DISABLED";
                        result.Duration = (DateTime.Now - startTime).TotalSeconds;
                        result.Logs.Add($"❌ [PAYMENT-TRIGGER] Configuration désactivée pour entreprise");
                        return result;
                    }
                }

                // 3. CRÉER PAIEMENT SELON CONFIG DISPONIBLE
                TriggerPaymentResult paymentResult;
                if (entrepriseConfig != null)
                {
                    result.Logs.Add($"✅ [PAYMENT-TRIGGER] Configuration entreprise trouvée - utilisation config spécifique");
                    paymentResult = CreatePaymentWithEnterpriseConfig(reservationData, entrepriseConfig, result.Logs);
                }
                else
                {
                    result.Logs.Add($"⚠️ [PAYMENT-TRIGGER] Pas de config entreprise - utilisation fallback Web.config");
                    paymentResult = CreatePaymentViaService(reservationData, result.Logs);
                }

                if (!paymentResult.Success)
                {
                    result.Success = false;
                    result.Message = "Échec création paiement";
                    result.ErrorDetails = paymentResult.ErrorDetails;
                    return result;
                }

                result.PaymentId = paymentResult.PaymentId;
                result.PaymentUrl = paymentResult.PaymentUrl;

                // 4. ENVOYER NOTIFICATION VIA NOTIFICATION-SERVICE SUPABASE
                var notificationResult = SendPaymentNotificationViaService(reservationData, paymentResult, result.Logs);
                result.NotificationSent = notificationResult;

                // 5. RÉSULTAT FINAL
                result.Success = true;
                result.Message = notificationResult ?
                    "Paiement créé et notification envoyée avec succès" :
                    "Paiement créé, mais échec notification";

                result.Duration = (DateTime.Now - startTime).TotalSeconds;
                result.Logs.Add($"✅ [PAYMENT-TRIGGER] Terminé en {result.Duration:F2}s");

                return result;
            }
            catch (Exception ex)
            {
                result.Success = false;
                result.Message = "Erreur technique lors du déclenchement";
                result.ErrorDetails = ex.Message;
                result.Duration = (DateTime.Now - startTime).TotalSeconds;
                result.Logs.Add($"❌ [PAYMENT-TRIGGER] Exception: {ex.Message}");

                LogToFile($"[TriggerPaymentOnAcceptance] ERROR: {ex.Message} | ReservationId: {reservationId} | ConducteurId: {conducteurId}");
                return result;
            }
        }

        /// <summary>
        /// 📋 RÉCUPÉRER DONNÉES RÉSERVATION DEPUIS SUPABASE
        /// </summary>
        private ReservationData GetReservationData(string reservationId, List<string> logs)
        {
            try
            {
                using (var client = new WebClient())
                {
                    client.Headers.Add("apikey", supabaseKey);
                    client.Headers.Add("Authorization", $"Bearer {supabaseKey}");
                    client.Encoding = Encoding.UTF8;

                    var url = $"{supabaseUrl}/rest/v1/reservations?" +
                             $"id=eq.{reservationId}&" +
                             $"select=id,client_phone,prix_total,vehicle_type,destination_nom,depart_nom,statut,position_depart,destination_position,distance_km,code_validation,created_at";

                    logs.Add($"🔍 [RESERVATION] URL: {url.Replace(supabaseKey, "***")}");

                    var response = client.DownloadString(url);
                    logs.Add($"🔍 [RESERVATION] Response: {response.Substring(0, Math.Min(200, response.Length))}");

                    var reservations = JsonConvert.DeserializeObject<List<ReservationData>>(response);

                    if (reservations != null && reservations.Count > 0)
                    {
                        var reservation = reservations[0];
                        logs.Add($"✅ [RESERVATION] Trouvée: {reservation.client_phone} - {reservation.prix_total} GNF");
                        return reservation;
                    }

                    return null;
                }
            }
            catch (Exception ex)
            {
                logs.Add($"❌ [RESERVATION] Erreur: {ex.Message}");
                return null;
            }
        }

        /// <summary>
        /// 💳 CRÉER PAIEMENT AVEC CONFIGURATION ENTREPRISE
        /// </summary>
        private TriggerPaymentResult CreatePaymentWithEnterpriseConfig(ReservationData reservation, dynamic enterpriseConfig, List<string> logs)
        {
            var result = new TriggerPaymentResult();

            try
            {
                logs.Add($"💳 [PAYMENT] Utilisation config entreprise");

                // Récupérer les paramètres depuis la config entreprise
                string apiUrl = enterpriseConfig.api_url?.ToString();
                string licenseKey = enterpriseConfig.license_key?.ToString();
                string websiteId = enterpriseConfig.website_id?.ToString();
                string callbackUrl = enterpriseConfig.callback_url?.ToString();

                if (string.IsNullOrEmpty(apiUrl) || string.IsNullOrEmpty(licenseKey) || string.IsNullOrEmpty(websiteId))
                {
                    result.Success = false;
                    result.ErrorDetails = "Configuration LengoPay incomplète";
                    logs.Add($"❌ [PAYMENT] Config incomplète - API:{!string.IsNullOrEmpty(apiUrl)} License:{!string.IsNullOrEmpty(licenseKey)} Website:{!string.IsNullOrEmpty(websiteId)}");
                    return result;
                }

                logs.Add($"🔧 [PAYMENT] API URL: {apiUrl}");
                logs.Add($"🔧 [PAYMENT] Website ID: {websiteId}");

                // Créer la requête de paiement
                var request = new LengoPayCreatePaymentRequest
                {
                    websiteid = websiteId,
                    amount = reservation.prix_total ?? 10000,
                    currency = "GNF",
                    type_account = "lp-om-gn",
                    account = reservation.client_phone?.Replace("whatsapp:", ""),
                    callback_url = callbackUrl,
                    return_url = callbackUrl.Replace("LengoPayCallback", "payment-success")
                };

                string jsonRequest = JsonConvert.SerializeObject(request);
                logs.Add($"📦 [PAYMENT] Request: {jsonRequest}");

                // Appel API avec config entreprise
                using (var client = new WebClient())
                {
                    client.Headers[HttpRequestHeader.Authorization] = $"Basic {licenseKey}";
                    client.Headers[HttpRequestHeader.Accept] = "application/json";
                    client.Headers[HttpRequestHeader.ContentType] = "application/json";
                    client.Encoding = Encoding.UTF8;

                    string jsonResponse = client.UploadString(apiUrl, "POST", jsonRequest);
                    logs.Add($"📥 [PAYMENT] Response: {jsonResponse}");

                    var response = JsonConvert.DeserializeObject<LengoPayCreatePaymentResponse>(jsonResponse);

                    if (response != null && response.status == "Success")
                    {
                        result.Success = true;
                        result.PaymentId = response.pay_id;
                        result.PaymentUrl = response.payment_url;
                        logs.Add($"✅ [PAYMENT] Créé: {result.PaymentId}");

                        // Sauvegarder le paiement initial avec reservation_id
                        SaveInitialPaymentWithReservation(response.pay_id, reservation.prix_total ?? 10000, 
                                                         reservation.client_phone, jsonResponse, reservation.id);
                    }
                    else
                    {
                        result.Success = false;
                        result.ErrorDetails = response?.status ?? "Erreur inconnue";
                        logs.Add($"❌ [PAYMENT] Échec: {result.ErrorDetails}");
                    }

                    return result;
                }
            }
            catch (Exception ex)
            {
                result.Success = false;
                result.ErrorDetails = ex.Message;
                logs.Add($"❌ [PAYMENT] Exception: {ex.Message}");
                return result;
            }
        }

        /// <summary>
        /// 💳 CRÉER PAIEMENT VIA PAYMENT-SERVICE SUPABASE (FALLBACK)
        /// </summary>
        private TriggerPaymentResult CreatePaymentViaService(ReservationData reservation, List<string> logs)
        {
            var result = new TriggerPaymentResult();

            try
            {
                using (var client = new WebClient())
                {
                    client.Headers.Add("Authorization", $"Bearer {supabaseKey}");
                    client.Headers.Add("Content-Type", "application/json");
                    client.Encoding = Encoding.UTF8;

                    var paymentServiceUrl = $"{supabaseUrl}/functions/v1/payment-service?action=create";
                    var payload = JsonConvert.SerializeObject(new
                    {
                        amount = reservation.prix_total ?? 10000,
                        clientPhone = reservation.client_phone?.Replace("whatsapp:", ""),
                        reservationId = reservation.id
                    });

                    logs.Add($"💳 [PAYMENT] URL: {paymentServiceUrl}");
                    logs.Add($"💳 [PAYMENT] Payload: {payload}");

                    var response = client.UploadString(paymentServiceUrl, "POST", payload);
                    logs.Add($"💳 [PAYMENT] Response: {response}");

                    var paymentData = JsonConvert.DeserializeObject<dynamic>(response);

                    if (paymentData?.success == true)
                    {
                        result.Success = true;
                        result.PaymentId = paymentData.paymentId?.ToString();
                        result.PaymentUrl = paymentData.paymentUrl?.ToString();
                        logs.Add($"✅ [PAYMENT] Créé avec succès: {result.PaymentId}");
                    }
                    else
                    {
                        result.Success = false;
                        result.ErrorDetails = paymentData?.message?.ToString() ?? "Erreur inconnue";
                        logs.Add($"❌ [PAYMENT] Échec: {result.ErrorDetails}");
                    }

                    return result;
                }
            }
            catch (Exception ex)
            {
                result.Success = false;
                result.ErrorDetails = ex.Message;
                logs.Add($"❌ [PAYMENT] Exception: {ex.Message}");
                return result;
            }
        }

        /// <summary>
        /// 📱 ENVOYER NOTIFICATION VIA NOTIFICATION-SERVICE SUPABASE
        /// </summary>
        private bool SendPaymentNotificationViaService(ReservationData reservation, TriggerPaymentResult paymentResult, List<string> logs)
        {
            try
            {
                using (var client = new WebClient())
                {
                    client.Headers.Add("Authorization", $"Bearer {supabaseKey}");
                    client.Headers.Add("Content-Type", "application/json");
                    client.Encoding = Encoding.UTF8;

                    var notificationServiceUrl = $"{supabaseUrl}/functions/v1/notification-service?action=send";
                    // Icône dynamique selon type véhicule
                    string vehicleIcon;
                    switch (reservation.vehicle_type?.ToLower())
                    {
                        case "moto":
                            vehicleIcon = "🏍️";
                            break;
                        case "voiture":
                        case "auto":
                            vehicleIcon = "🚗";
                            break;
                        default:
                            vehicleIcon = "🚗";
                            break;
                    }

                    // Message optimisé mobile - VERSION 3 compacte + expiration
                    var message = $@"⚡ **CONDUCTEUR PRÊT !**

{vehicleIcon} {reservation.destination_nom} • **{(reservation.prix_total ?? 0).ToString("N0")} GNF**

🟠 **PAYER = DÉPART IMMÉDIAT**
👆 {paymentResult.PaymentUrl}

⏰ **Lien expire dans 15min** • 💡 Gagnez du temps !";

                    var payload = JsonConvert.SerializeObject(new
                    {
                        to = reservation.client_phone?.Replace("whatsapp:", ""),
                        message = message,
                        type = "payment",
                        priority = "high"
                    });

                    logs.Add($"📱 [NOTIFICATION] URL: {notificationServiceUrl}");
                    logs.Add($"📱 [NOTIFICATION] Payload: {payload}");

                    var response = client.UploadString(notificationServiceUrl, "POST", payload);
                    logs.Add($"📱 [NOTIFICATION] Response: {response}");

                    var notificationData = JsonConvert.DeserializeObject<dynamic>(response);
                    bool success = notificationData?.success == true;

                    logs.Add($"📱 [NOTIFICATION] Résultat: {(success ? "✅ Envoyé" : "❌ Échec")}");
                    return success;
                }
            }
            catch (Exception ex)
            {
                logs.Add($"❌ [NOTIFICATION] Exception: {ex.Message}");
                return false;
            }
        }


        /// <summary>
        /// NOUVELLE MÉTHODE - Récupérer la configuration LengoPay de l'entreprise
        /// </summary>
        private dynamic GetEnterprisePaymentConfig(string conducteurId, List<string> logs)
        {
            try
            {
                using (var client = new WebClient())
                {
                    client.Headers.Add("apikey", supabaseKey);
                    client.Headers.Add("Authorization", $"Bearer {supabaseKey}");
                    client.Encoding = Encoding.UTF8;

                    // 1. Récupérer l'entreprise_id du conducteur
                    var conducteurUrl = $"{supabaseUrl}/rest/v1/conducteurs?" +
                                      $"id=eq.{conducteurId}&select=entreprise_id";
                    
                    logs.Add($"🏢 [CONFIG] Recherche entreprise pour conducteur: {conducteurId}");
                    var conducteurResponse = client.DownloadString(conducteurUrl);
                    var conducteurs = JsonConvert.DeserializeObject<dynamic[]>(conducteurResponse);

                    if (conducteurs == null || conducteurs.Length == 0)
                    {
                        logs.Add($"❌ [CONFIG] Conducteur introuvable");
                        return null;
                    }

                    string entrepriseId = conducteurs[0].entreprise_id?.ToString();
                    if (string.IsNullOrEmpty(entrepriseId))
                    {
                        logs.Add($"❌ [CONFIG] Pas d'entreprise liée au conducteur");
                        return null;
                    }

                    // 2. Récupérer la configuration LengoPay de l'entreprise
                    var configUrl = $"{supabaseUrl}/rest/v1/lengopay_config?" +
                                   $"entreprise_id=eq.{entrepriseId}&" +
                                   $"select=api_url,license_key,website_id,callback_url,telephone_marchand,is_active";

                    logs.Add($"🔧 [CONFIG] Recherche config LengoPay pour entreprise: {entrepriseId}");
                    var configResponse = client.DownloadString(configUrl);
                    var configs = JsonConvert.DeserializeObject<dynamic[]>(configResponse);

                    if (configs == null || configs.Length == 0)
                    {
                        logs.Add($"❌ [CONFIG] Pas de configuration LengoPay pour cette entreprise");
                        return null;
                    }

                    var config = configs[0];
                    bool isActive = config.is_active == true;
                    logs.Add($"✅ [CONFIG] Configuration trouvée: {config.website_id} - Active: {isActive}");
                    return config;
                }
            }
            catch (Exception ex)
            {
                logs.Add($"❌ [CONFIG] Erreur récupération config: {ex.Message}");
                return null;
            }
        }

        /// <summary>
        /// Logger dans un fichier pour debug
        /// </summary>
        private void LogToFile(string message)
        {
            try
            {
                if (!Directory.Exists(logPath))
                {
                    Directory.CreateDirectory(logPath);
                }

                string logFile = Path.Combine(logPath, $"lengopay_{DateTime.Now:yyyy-MM-dd}.log");
                File.AppendAllText(logFile, message + Environment.NewLine);
            }
            catch
            {
                // Ignorer les erreurs de log
            }
        }
    }
}