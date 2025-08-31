using System;
using System.IO;
using System.Net;
using System.Web.Mvc;

namespace TARIDIA.Areas.LengoPay.Controllers
{
    /// <summary>
    /// Contrôleur pour gérer les callbacks de paiement LengoPay
    /// </summary>
    public class LengoPayCallbackController : Controller
    {
        private readonly LengoPayCallbackService callbackService;

        public LengoPayCallbackController()
        {
            ServicePointManager.SecurityProtocol = ServicePointManager.SecurityProtocol | SecurityProtocolType.Tls12;
            callbackService = new LengoPayCallbackService();
        }

        /// <summary>
        /// Endpoint POST pour recevoir les callbacks de LengoPay après paiement
        /// URL: /api/LengoPayCallback
        /// </summary>
        [HttpPost]
        [Route("api/LengoPayCallback")]
        public ActionResult LengoPayCallback()
        {
            try
            {
                // Lire le body de la requête
                string jsonBody = "";
                using (var reader = new StreamReader(Request.InputStream))
                {
                    reader.BaseStream.Seek(0, SeekOrigin.Begin);
                    jsonBody = reader.ReadToEnd();
                }

                // Déléguer le traitement au service
                var result = callbackService.ProcessCallback(jsonBody);

                // Retourner le code HTTP approprié
                if (result.Success)
                {
                    // Retourner HTTP 200 OK pour confirmer la réception
                    return new HttpStatusCodeResult(200, "OK");
                }
                else
                {
                    // Retourner 400 Bad Request si erreur de traitement
                    return new HttpStatusCodeResult(400, result.Message);
                }
            }
            catch (Exception ex)
            {
                // Log l'erreur et retourner 500
                System.Diagnostics.Trace.TraceError($"LengoPayCallback Error: {ex.Message}");
                return new HttpStatusCodeResult(500, "Internal Server Error");
            }
        }

        /// <summary>
        /// Endpoint de test GET pour vérifier que l'endpoint est accessible
        /// URL: /api/LengoPayCallback
        /// </summary>
        [HttpGet]
        [Route("api/LengoPayCallback")]
        public ActionResult TestEndpoint()
        {
            var response = new
            {
                status = "OK",
                message = "LengoPay Callback Endpoint is running",
                timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
                server = Environment.MachineName
            };

            return Json(response, JsonRequestBehavior.AllowGet);
        }

        /// <summary>
        /// Page de succès après paiement LengoPay (return_url)
        /// URL: /payment-success
        /// </summary>
        [HttpGet]
        [Route("payment-success")]
        public ActionResult PaymentSuccess()
        {
            // Retourner du HTML simple directement
            string html = $@"
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Paiement Réussi - LokoTaxi</title>
                    <meta charset='utf-8'>
                    <meta name='viewport' content='width=device-width, initial-scale=1'>
                    <style>
                        body {{ 
                            font-family: Arial, sans-serif; 
                            text-align: center; 
                            margin: 50px; 
                            background-color: #f0f8f0;
                        }}
                        .success-container {{ 
                            background: white; 
                            padding: 40px; 
                            border-radius: 10px; 
                            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                            max-width: 500px;
                            margin: 0 auto;
                        }}
                        .success-icon {{ 
                            font-size: 80px; 
                            color: #28a745; 
                            margin-bottom: 20px;
                        }}
                        h1 {{ color: #28a745; }}
                        .timestamp {{ 
                            color: #6c757d; 
                            font-size: 14px; 
                            margin-top: 20px;
                        }}
                    </style>
                </head>
                <body>
                    <div class='success-container'>
                        <div class='success-icon'>✅</div>
                        <h1>Paiement Réussi !</h1>
                        <p>Votre paiement a été effectué avec succès.</p>
                        <p>Merci d'avoir utilisé <strong>LokoTaxi</strong>.</p>
                        <div class='timestamp'>
                            Traité le {DateTime.Now:yyyy-MM-dd} à {DateTime.Now:HH:mm:ss}
                        </div>
                        <p style='margin-top: 30px;'>
                            <a href='javascript:window.close()' style='color: #007bff;'>Fermer cette page</a>
                        </p>
                    </div>
                </body>
                </html>";

            return Content(html, "text/html");
        }

        /// <summary>
        /// Endpoint de test pour créer un paiement LengoPay
        /// URL: /api/LengoPayCreateTest?amount=7000&phone=628406028
        /// </summary>
        [HttpGet]
        [Route("api/LengoPayCreateTest")]
        public ActionResult CreateTestPayment(decimal amount = 8700, string phone = "628406028")
        {
            try
            {
                // Créer un paiement via le service
                var paymentResponse = callbackService.CreatePayment(amount, phone);

                if (paymentResponse != null && paymentResponse.status == "Success")
                {
                    var response = new
                    {
                        success = true,
                        message = "Paiement créé avec succès",
                        payment_id = paymentResponse.pay_id,
                        payment_url = paymentResponse.payment_url,
                        amount = amount,
                        phone = phone,
                        instructions = "Copiez l'URL de paiement dans votre navigateur pour effectuer le paiement"
                    };

                    return Json(response, JsonRequestBehavior.AllowGet);
                }
                else
                {
                    var errorResponse = new
                    {
                        success = false,
                        message = "Échec de création du paiement",
                        status = paymentResponse?.status ?? "Unknown error"
                    };

                    return Json(errorResponse, JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception ex)
            {
                var errorResponse = new
                {
                    success = false,
                    message = "Erreur lors de la création du paiement",
                    error = ex.Message
                };

                return Json(errorResponse, JsonRequestBehavior.AllowGet);
            }
        }


        [HttpGet]
        [Route("api/TestSupabaseInsert")]
        public ActionResult TestSupabaseInsert()
        {
            try
            {
                // Simuler un callback de test
                string testJson = @"{
                    ""pay_id"": ""TEST_" + DateTime.Now.Ticks + @""",
                    ""status"": ""SUCCESS"",
                    ""amount"": 1000,
                    ""message"": ""Test depuis navigateur"",
                    ""Client"": ""628000000""
                }";

                var result = callbackService.ProcessCallback(testJson);

                return Json(new
                {
                    success = result.Success,
                    message = result.Message,
                    payment_id = result.PaymentId,
                    error = result.ErrorDetails,
                    timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
                    test_data = testJson
                }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    success = false,
                    error = ex.Message,
                    stack_trace = ex.StackTrace,
                    timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
                }, JsonRequestBehavior.AllowGet);
            }
        }


        [HttpGet]
        [Route("api/TestUpdatePayment")]
        public ActionResult TestUpdatePayment(string payment_id = "cm0yN0c2dUpHU1BNcXBlbFVKcHROaGtxTWpNSVBZalE=")
        {
            try
            {
                // Simuler un callback pour ce payment_id spécifique
                string testJson = @"{
                    ""pay_id"": """ + payment_id + @""",
                    ""status"": ""SUCCESS"",
                    ""amount"": 8700,
                    ""message"": ""Test Update - Transaction Successful"",
                    ""Client"": ""628406028""
                }";

                var result = callbackService.ProcessCallback(testJson);

                return Json(new
                {
                    success = result.Success,
                    message = result.Message,
                    payment_id_tested = payment_id,
                    error = result.ErrorDetails,
                    timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
                    test_data = testJson
                }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    success = false,
                    payment_id_tested = payment_id,
                    error = ex.Message,
                    stack_trace = ex.StackTrace,
                    timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
                }, JsonRequestBehavior.AllowGet);
            }
        }

        /// <summary>
        /// 💳 ENDPOINT - DÉCLENCHER PAIEMENT SUR ACCEPTATION CONDUCTEUR
        /// URL: /api/TriggerPaymentOnAcceptance
        /// </summary>
       // [HttpPost]
        [Route("api/TriggerPaymentOnAcceptance")]
        public ActionResult TriggerPaymentOnAcceptance(string reservationId, string conducteurId = null)
        {
            try
            {
                if (string.IsNullOrEmpty(reservationId))
                {
                    return Json(new
                    {
                        success = false,
                        message = "ReservationId requis",
                        timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
                    }, JsonRequestBehavior.AllowGet);
                }

                // Déléguer le traitement au service
                var result = callbackService.TriggerPaymentOnAcceptance(reservationId, conducteurId);

                // Retourner la réponse JSON complète
                return Json(new
                {
                    success = result.Success,
                    message = result.Message,
                    paymentId = result.PaymentId,
                    paymentUrl = result.PaymentUrl,
                    notificationSent = result.NotificationSent,
                    reservationId = reservationId,
                    conducteurId = conducteurId,
                    logs = result.Logs,
                    duration = result.Duration,
                    timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
                }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Trace.TraceError($"TriggerPaymentOnAcceptance Error: {ex.Message}");
                return Json(new
                {
                    success = false,
                    message = "Erreur lors du déclenchement du paiement",
                    error = ex.Message,
                    reservationId = reservationId,
                    timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
                }, JsonRequestBehavior.AllowGet);
            }
        }


        [HttpGet]
        [Route("api/CheckPaymentNotifications")]
        public ActionResult CheckPaymentNotifications()
        {
            try
            {
                var result = callbackService.CheckPaymentNotifications();

                return Json(new
                {
                    success = result.Success,
                    message = result.Message,
                    //checked = result.CheckedCount,
                    notified = result.NotifiedCount,
                    failed = result.FailedCount,
                    duration_seconds = result.Duration,
                    logs = result.Logs,
                    timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
                    server = Environment.MachineName
                }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Trace.TraceError($"CheckPaymentNotifications Error: {ex.Message}");
                return Json(new
                {
                    success = false,
                    error = ex.Message,
                    timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
                }, JsonRequestBehavior.AllowGet);
            }
        }


    }
}