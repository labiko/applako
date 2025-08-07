// ASP_MVC_ONSIGNAL_METHODE.cs
// TOUTES LES MÉTHODES C# POUR ONESIGNAL NOTIFICATIONS
// Système de notifications push pour conducteurs dans un rayon de 5km

using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Logging;

namespace AppLakoNotifications.Services
{
    // ================================
    // 1. CONFIGURATION ET MODELS
    // ================================
    
    /// <summary>
    /// Configuration OneSignal depuis appsettings.json
    /// </summary>
    public class OneSignalSettings
    {
        public string AppId { get; set; } = string.Empty;
        public string ApiKey { get; set; } = string.Empty;
        public string BaseUrl { get; set; } = "https://onesignal.com/api/v1";
    }

    /// <summary>
    /// Requête de notification depuis Supabase trigger
    /// </summary>
    public class NotificationRequest
    {
        public string ReservationId { get; set; } = string.Empty;
        public string ClientPhone { get; set; } = string.Empty;
        public string DepartNom { get; set; } = string.Empty;
        public string DestinationNom { get; set; } = string.Empty;
        public decimal PrixTotal { get; set; }
        public string VehicleType { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public string ConducteurId { get; set; } = string.Empty;
        public string PlayerId { get; set; } = string.Empty;
        public decimal DistanceKm { get; set; }
        public string ConducteurNom { get; set; } = string.Empty;
        public string ConducteurTelephone { get; set; } = string.Empty;
    }

    /// <summary>
    /// Réponse standardisée pour les notifications
    /// </summary>
    public class NotificationResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public string NotificationId { get; set; } = string.Empty;
        public int Recipients { get; set; }
        public DateTime SentAt { get; set; } = DateTime.UtcNow;
        public decimal? DistanceKm { get; set; }
    }

    /// <summary>
    /// Structure notification OneSignal
    /// </summary>
    public class OneSignalNotification
    {
        public string[] PlayerIds { get; set; } = Array.Empty<string>();
        public Dictionary<string, string> Contents { get; set; } = new();
        public Dictionary<string, string> Headings { get; set; } = new();
        public object? Data { get; set; }
        public string AndroidSound { get; set; } = "notification_sound";
        public string IosSound { get; set; } = "notification_sound.wav";
        public int Priority { get; set; } = 10;
        public string AndroidChannelId { get; set; } = "reservations";
        public bool ContentAvailable { get; set; } = true;
        public string AndroidAccentColor { get; set; } = "FFC1F11D"; // Lako Green
        public string SmallIcon { get; set; } = "ic_notification";
        public string LargeIcon { get; set; } = "ic_launcher";
    }

    /// <summary>
    /// Réponse API OneSignal
    /// </summary>
    public class OneSignalApiResponse
    {
        public string? Id { get; set; }
        public int Recipients { get; set; }
        public string[]? Errors { get; set; }
        public string[]? Warnings { get; set; }
        public bool IsSuccess => Errors == null || Errors.Length == 0;
    }

    // ================================
    // 2. INTERFACE SERVICE
    // ================================
    
    /// <summary>
    /// Interface pour service OneSignal
    /// </summary>
    public interface IOneSignalService
    {
        Task<OneSignalApiResponse> SendNotificationAsync(OneSignalNotification notification);
        Task<NotificationResponse> SendReservationNotificationAsync(NotificationRequest request);
        Task<bool> ValidatePlayerIdAsync(string playerId);
        Task<NotificationResponse> SendUrgentReservationAsync(NotificationRequest request, decimal bonusAmount);
        Task<NotificationResponse> SendReservationTakenAsync(string reservationId, string[] playerIds);
        Task<List<NotificationResponse>> SendBulkNotificationsAsync(List<NotificationRequest> requests);
    }

    // ================================
    // 3. SERVICE PRINCIPAL ONESIGNAL
    // ================================
    
    /// <summary>
    /// Service principal pour gestion notifications OneSignal
    /// Implémente toutes les méthodes pour notifications push conducteurs
    /// </summary>
    public class OneSignalService : IOneSignalService
    {
        private readonly HttpClient _httpClient;
        private readonly OneSignalSettings _settings;
        private readonly ILogger<OneSignalService> _logger;
        private readonly string _baseUrl;

        public OneSignalService(HttpClient httpClient, IOptions<OneSignalSettings> settings, ILogger<OneSignalService> logger)
        {
            _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
            _settings = settings.Value ?? throw new ArgumentNullException(nameof(settings));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _baseUrl = _settings.BaseUrl;

            // Configuration HttpClient
            _httpClient.DefaultRequestHeaders.Add("Authorization", $"Basic {_settings.ApiKey}");
            _httpClient.DefaultRequestHeaders.Add("Accept", "application/json");
            _httpClient.Timeout = TimeSpan.FromSeconds(30);
        }

        // ================================
        // MÉTHODE PRINCIPALE: Envoi notification réservation
        // ================================
        
        /// <summary>
        /// Envoie notification de nouvelle réservation à un conducteur spécifique
        /// Appelée par le trigger Supabase via Controller
        /// </summary>
        /// <param name="request">Données réservation et conducteur</param>
        /// <returns>Résultat envoi notification</returns>
        public async Task<NotificationResponse> SendReservationNotificationAsync(NotificationRequest request)
        {
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();
            
            try
            {
                _logger.LogInformation("🚗 Début envoi notification réservation: ConducteurId={ConducteurId}, ReservationId={ReservationId}, Distance={DistanceKm}km", 
                    request.ConducteurId, request.ReservationId, request.DistanceKm);

                // Validation des données
                if (string.IsNullOrEmpty(request.PlayerId))
                {
                    _logger.LogWarning("❌ PlayerId manquant pour conducteur {ConducteurId}", request.ConducteurId);
                    return new NotificationResponse
                    {
                        Success = false,
                        Message = "PlayerId manquant",
                        Recipients = 0
                    };
                }

                // Construction message personnalisé
                var title = "🚗 Nouvelle Course Disponible !";
                var message = $"{request.DepartNom} → {request.DestinationNom}";
                var subtitle = $"À {request.DistanceKm:F1}km • {request.PrixTotal:N0} GNF";

                // Création notification OneSignal
                var notification = new OneSignalNotification
                {
                    PlayerIds = new[] { request.PlayerId },
                    Contents = new Dictionary<string, string>
                    {
                        ["fr"] = $"{message} • {subtitle}"
                    },
                    Headings = new Dictionary<string, string>
                    {
                        ["fr"] = title
                    },
                    Data = new
                    {
                        type = "new_reservation",
                        reservation_id = request.ReservationId,
                        distance_km = request.DistanceKm,
                        pickup = request.DepartNom,
                        destination = request.DestinationNom,
                        price = request.PrixTotal,
                        vehicle_type = request.VehicleType,
                        client_phone = request.ClientPhone,
                        conducteur_id = request.ConducteurId,
                        created_at = request.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss")
                    },
                    AndroidSound = "notification_sound",
                    IosSound = "notification_sound.wav",
                    Priority = 10,
                    AndroidChannelId = "reservations",
                    ContentAvailable = true,
                    AndroidAccentColor = "FFC1F11D", // Lako Green
                    SmallIcon = "ic_notification",
                    LargeIcon = "ic_launcher"
                };

                // Envoi via API OneSignal
                var result = await SendNotificationAsync(notification);

                stopwatch.Stop();

                if (result.IsSuccess)
                {
                    _logger.LogInformation("✅ Notification envoyée avec succès en {ElapsedMs}ms: NotificationId={NotificationId}, Recipients={Recipients}", 
                        stopwatch.ElapsedMilliseconds, result.Id, result.Recipients);

                    return new NotificationResponse
                    {
                        Success = true,
                        Message = "Notification envoyée avec succès",
                        NotificationId = result.Id ?? string.Empty,
                        Recipients = result.Recipients,
                        DistanceKm = request.DistanceKm
                    };
                }
                else
                {
                    var errorMsg = string.Join(", ", result.Errors ?? Array.Empty<string>());
                    _logger.LogError("❌ Échec envoi notification: {Errors}", errorMsg);

                    return new NotificationResponse
                    {
                        Success = false,
                        Message = $"Erreur OneSignal: {errorMsg}",
                        Recipients = 0
                    };
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Exception lors envoi notification réservation pour conducteur {ConducteurId}", request.ConducteurId);
                
                return new NotificationResponse
                {
                    Success = false,
                    Message = $"Exception: {ex.Message}",
                    Recipients = 0
                };
            }
        }

        // ================================
        // MÉTHODE CORE: Communication OneSignal API
        // ================================
        
        /// <summary>
        /// Méthode de base pour envoi notifications via API OneSignal
        /// Utilisée par toutes les autres méthodes
        /// </summary>
        /// <param name="notification">Structure notification OneSignal</param>
        /// <returns>Réponse API OneSignal</returns>
        public async Task<OneSignalApiResponse> SendNotificationAsync(OneSignalNotification notification)
        {
            try
            {
                // Construction payload API
                var payload = new
                {
                    app_id = _settings.AppId,
                    include_player_ids = notification.PlayerIds,
                    contents = notification.Contents,
                    headings = notification.Headings,
                    data = notification.Data,
                    android_sound = notification.AndroidSound,
                    ios_sound = notification.IosSound,
                    priority = notification.Priority,
                    android_channel_id = notification.AndroidChannelId,
                    content_available = notification.ContentAvailable,
                    android_accent_color = notification.AndroidAccentColor,
                    small_icon = notification.SmallIcon,
                    large_icon = notification.LargeIcon
                };

                var json = JsonSerializer.Serialize(payload, new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                    WriteIndented = false
                });

                _logger.LogDebug("📤 Payload OneSignal: {Payload}", json);

                // Appel API OneSignal
                var content = new StringContent(json, Encoding.UTF8, "application/json");
                var response = await _httpClient.PostAsync($"{_baseUrl}/notifications", content);

                var responseContent = await response.Content.ReadAsStringAsync();
                
                _logger.LogDebug("📥 Réponse OneSignal: StatusCode={StatusCode}, Content={Content}", 
                    response.StatusCode, responseContent);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("❌ Erreur HTTP OneSignal: {StatusCode} - {Content}", 
                        response.StatusCode, responseContent);
                    
                    return new OneSignalApiResponse
                    {
                        Errors = new[] { $"HTTP {response.StatusCode}: {responseContent}" },
                        Recipients = 0
                    };
                }

                // Parse réponse
                var result = JsonSerializer.Deserialize<OneSignalApiResponse>(responseContent, new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                });

                return result ?? new OneSignalApiResponse
                {
                    Errors = new[] { "Réponse OneSignal invalide" },
                    Recipients = 0
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Exception lors appel API OneSignal");
                
                return new OneSignalApiResponse
                {
                    Errors = new[] { ex.Message },
                    Recipients = 0
                };
            }
        }

        // ================================
        // MÉTHODES AVANCÉES: Cas spéciaux
        // ================================

        /// <summary>
        /// Envoie notification urgente avec bonus financier
        /// Pour réservations en attente depuis longtemps
        /// </summary>
        public async Task<NotificationResponse> SendUrgentReservationAsync(NotificationRequest request, decimal bonusAmount)
        {
            try
            {
                _logger.LogInformation("🚨 Envoi notification URGENTE: ReservationId={ReservationId}, Bonus={BonusAmount} GNF", 
                    request.ReservationId, bonusAmount);

                var notification = new OneSignalNotification
                {
                    PlayerIds = new[] { request.PlayerId },
                    Contents = new Dictionary<string, string>
                    {
                        ["fr"] = $"🚨 URGENTE: {request.DepartNom} → {request.DestinationNom}\nBonus +{bonusAmount:N0} GNF • À {request.DistanceKm:F1}km"
                    },
                    Headings = new Dictionary<string, string>
                    {
                        ["fr"] = "🚨 Course Urgente - Bonus !"
                    },
                    Data = new
                    {
                        type = "urgent_reservation",
                        reservation_id = request.ReservationId,
                        bonus_amount = bonusAmount,
                        distance_km = request.DistanceKm,
                        pickup = request.DepartNom,
                        destination = request.DestinationNom,
                        original_price = request.PrixTotal,
                        total_price = request.PrixTotal + bonusAmount
                    },
                    Priority = 10, // Max priority
                    AndroidSound = "urgent_notification",
                    IosSound = "urgent_notification.wav"
                };

                var result = await SendNotificationAsync(notification);

                return new NotificationResponse
                {
                    Success = result.IsSuccess,
                    Message = result.IsSuccess ? "Notification urgente envoyée" : string.Join(", ", result.Errors ?? Array.Empty<string>()),
                    NotificationId = result.Id ?? string.Empty,
                    Recipients = result.Recipients
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Erreur notification urgente");
                return new NotificationResponse { Success = false, Message = ex.Message };
            }
        }

        /// <summary>
        /// Informe conducteurs qu'une réservation a été prise par quelqu'un d'autre
        /// Pour éviter tentatives multiples sur même réservation
        /// </summary>
        public async Task<NotificationResponse> SendReservationTakenAsync(string reservationId, string[] playerIds)
        {
            try
            {
                _logger.LogInformation("⏰ Notification réservation prise: ReservationId={ReservationId}, Conducteurs={Count}", 
                    reservationId, playerIds.Length);

                var notification = new OneSignalNotification
                {
                    PlayerIds = playerIds,
                    Contents = new Dictionary<string, string>
                    {
                        ["fr"] = "Cette réservation a été acceptée par un autre conducteur"
                    },
                    Headings = new Dictionary<string, string>
                    {
                        ["fr"] = "⏰ Réservation Prise"
                    },
                    Data = new
                    {
                        type = "reservation_taken",
                        reservation_id = reservationId
                    },
                    Priority = 5 // Moins urgent
                };

                var result = await SendNotificationAsync(notification);

                return new NotificationResponse
                {
                    Success = result.IsSuccess,
                    Message = result.IsSuccess ? "Notification 'prise' envoyée" : string.Join(", ", result.Errors ?? Array.Empty<string>()),
                    NotificationId = result.Id ?? string.Empty,
                    Recipients = result.Recipients
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Erreur notification 'prise'");
                return new NotificationResponse { Success = false, Message = ex.Message };
            }
        }

        /// <summary>
        /// Envoi notifications en lot (batch)
        /// Optimise les appels API pour plusieurs conducteurs
        /// </summary>
        public async Task<List<NotificationResponse>> SendBulkNotificationsAsync(List<NotificationRequest> requests)
        {
            var responses = new List<NotificationResponse>();
            const int batchSize = 5; // Limiter charge API
            
            _logger.LogInformation("📦 Envoi notifications en lot: Count={Count}", requests.Count);

            for (int i = 0; i < requests.Count; i += batchSize)
            {
                var batch = requests.Skip(i).Take(batchSize);
                var batchTasks = batch.Select(SendReservationNotificationAsync);
                
                var batchResults = await Task.WhenAll(batchTasks);
                responses.AddRange(batchResults);
                
                // Pause entre batches pour éviter rate limiting
                if (i + batchSize < requests.Count)
                {
                    await Task.Delay(1000); // 1 seconde
                }
            }

            var successCount = responses.Count(r => r.Success);
            _logger.LogInformation("✅ Notifications lot terminées: {Success}/{Total} succès", successCount, requests.Count);

            return responses;
        }

        // ================================
        // MÉTHODES UTILITAIRES
        // ================================

        /// <summary>
        /// Valide qu'un Player ID OneSignal existe et est actif
        /// Utilisé avant envoi notification
        /// </summary>
        public async Task<bool> ValidatePlayerIdAsync(string playerId)
        {
            try
            {
                if (string.IsNullOrEmpty(playerId))
                    return false;

                // Appel API OneSignal pour vérifier Player ID
                var response = await _httpClient.GetAsync($"{_baseUrl}/players/{playerId}?app_id={_settings.AppId}");
                
                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsStringAsync();
                    var playerInfo = JsonSerializer.Deserialize<JsonElement>(content);
                    
                    // Vérifier si le player est actif
                    if (playerInfo.TryGetProperty("invalid_identifier", out var invalid))
                    {
                        return !invalid.GetBoolean();
                    }
                    
                    return true;
                }

                return false;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "⚠️ Erreur validation PlayerId: {PlayerId}", playerId);
                return false;
            }
        }

        /// <summary>
        /// Obtient statistiques d'envoi pour monitoring
        /// </summary>
        public async Task<object> GetNotificationStatsAsync(string playerId)
        {
            try
            {
                var response = await _httpClient.GetAsync($"{_baseUrl}/players/{playerId}?app_id={_settings.AppId}");
                
                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsStringAsync();
                    return JsonSerializer.Deserialize<object>(content) ?? new { };
                }
                
                return new { error = "Player not found" };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Erreur récupération stats");
                return new { error = ex.Message };
            }
        }

        /// <summary>
        /// Configure tags OneSignal pour un conducteur
        /// Permet ciblage notifications par critères
        /// </summary>
        public async Task<bool> SetPlayerTagsAsync(string playerId, Dictionary<string, object> tags)
        {
            try
            {
                var payload = new
                {
                    app_id = _settings.AppId,
                    tags = tags
                };

                var json = JsonSerializer.Serialize(payload);
                var content = new StringContent(json, Encoding.UTF8, "application/json");
                
                var response = await _httpClient.PutAsync($"{_baseUrl}/players/{playerId}", content);
                
                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("🏷️ Tags mis à jour pour PlayerId: {PlayerId}", playerId);
                    return true;
                }
                
                _logger.LogWarning("⚠️ Échec mise à jour tags: {StatusCode}", response.StatusCode);
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Erreur mise à jour tags");
                return false;
            }
        }
    }

    // ================================
    // 4. HELPER CLASSES
    // ================================

    /// <summary>
    /// Helper pour construction messages notifications personnalisés
    /// </summary>
    public static class NotificationMessageBuilder
    {
        /// <summary>
        /// Message standard nouvelle réservation
        /// </summary>
        public static (string title, string message) BuildNewReservationMessage(NotificationRequest request)
        {
            var title = "🚗 Nouvelle Course Disponible !";
            var message = $"{request.DepartNom} → {request.DestinationNom} • {request.DistanceKm:F1}km • {request.PrixTotal:N0} GNF";
            
            return (title, message);
        }

        /// <summary>
        /// Message réservation urgente avec bonus
        /// </summary>
        public static (string title, string message) BuildUrgentReservationMessage(NotificationRequest request, decimal bonus)
        {
            var title = "🚨 Course Urgente - Bonus !";
            var totalPrice = request.PrixTotal + bonus;
            var message = $"{request.DepartNom} → {request.DestinationNom}\n💰 {totalPrice:N0} GNF (Bonus +{bonus:N0}) • {request.DistanceKm:F1}km";
            
            return (title, message);
        }

        /// <summary>
        /// Message réservation prise par autre conducteur
        /// </summary>
        public static (string title, string message) BuildReservationTakenMessage()
        {
            var title = "⏰ Réservation Prise";
            var message = "Cette course a été acceptée par un autre conducteur";
            
            return (title, message);
        }
    }

    /// <summary>
    /// Helper pour gestion rate limiting et horaires
    /// </summary>
    public static class NotificationRules
    {
        private static readonly Dictionary<string, DateTime> _lastNotificationTime = new();
        private static readonly object _lockObject = new object();

        /// <summary>
        /// Vérifie si on peut envoyer notification à ce conducteur (rate limiting)
        /// </summary>
        public static bool CanSendToConducteur(string conducteurId, TimeSpan minimumInterval)
        {
            lock (_lockObject)
            {
                var now = DateTime.UtcNow;
                
                if (_lastNotificationTime.ContainsKey(conducteurId))
                {
                    var timeSinceLastNotification = now - _lastNotificationTime[conducteurId];
                    if (timeSinceLastNotification < minimumInterval)
                    {
                        return false;
                    }
                }
                
                _lastNotificationTime[conducteurId] = now;
                return true;
            }
        }

        /// <summary>
        /// Vérifie si on est dans les horaires de service (6h-23h GMT+0 Conakry)
        /// </summary>
        public static bool IsServiceHours()
        {
            var conakryTime = DateTime.UtcNow; // GMT+0 = UTC
            var hour = conakryTime.Hour;
            
            return hour >= 6 && hour <= 23;
        }

        /// <summary>
        /// Nettoyage périodique du cache rate limiting
        /// </summary>
        public static void CleanupRateLimit()
        {
            lock (_lockObject)
            {
                var cutoff = DateTime.UtcNow.AddHours(-1);
                var keysToRemove = _lastNotificationTime
                    .Where(kvp => kvp.Value < cutoff)
                    .Select(kvp => kvp.Key)
                    .ToList();

                foreach (var key in keysToRemove)
                {
                    _lastNotificationTime.Remove(key);
                }
            }
        }
    }
}

// ================================
// 5. EXTENSION METHODS
// ================================

namespace AppLakoNotifications.Extensions
{
    /// <summary>
    /// Extensions pour faciliter utilisation du service
    /// </summary>
    public static class OneSignalServiceExtensions
    {
        /// <summary>
        /// Extension pour envoi notification avec retry automatique
        /// </summary>
        public static async Task<NotificationResponse> SendWithRetryAsync(
            this IOneSignalService service, 
            NotificationRequest request, 
            int maxRetries = 3)
        {
            for (int attempt = 1; attempt <= maxRetries; attempt++)
            {
                var result = await service.SendReservationNotificationAsync(request);
                
                if (result.Success)
                    return result;
                
                if (attempt < maxRetries)
                {
                    await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, attempt))); // Exponential backoff
                }
            }
            
            return new NotificationResponse 
            { 
                Success = false, 
                Message = $"Échec après {maxRetries} tentatives" 
            };
        }
    }
}