using System;
using System.IO;
using System.Net;
using System.Text;
using System.Web.Script.Serialization;

namespace TestOneSignal
{
    public class OneSignalTester
    {
        // Vos paramètres OneSignal en dur pour test
        private static readonly string ONESIGNAL_URL = "https://onesignal.com/api/v1/notifications";
        private static readonly string ONESIGNAL_APP_ID = "867e880f-d486-482e-b7d8-d174db39f322";
        private static readonly string REST_API_KEY = "os_v2_app_qz7iqd6uqzec5n6y2f2nwoptelbcfyz3rome4aue3heo7mz6mpdebjbpum3qzzdl6crzi5o6z3u5zizdckxjkalkylohy5p3i4a5jsa";
        
        // Votre Player ID en dur pour test
        private static readonly string PLAYER_ID = "3441e939-2f5a-4dd9-97a3-8d721d6f09c5";

        public static bool SendPushNotification(string PlayerId, string Msge)
        {
            ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;
            var request = WebRequest.Create(ONESIGNAL_URL) as HttpWebRequest;
            request.KeepAlive = true;
            request.Method = "POST";
            request.ContentType = "application/json; charset=utf-8";
            
            // Ajouter l'authentification REST API Key
            request.Headers.Add("Authorization", "Key " + REST_API_KEY);

            var serializer = new JavaScriptSerializer();
            var obj = new
            {
                app_id = ONESIGNAL_APP_ID,
                contents = new { en = Msge },
                include_player_ids = new string[] { PlayerId }, // split des player_id
                priority = 10,
                //delivery_time_of_day="01:59"
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
                
                Console.WriteLine("SUCCESS - Response: " + responseContent);
                return true;
            }
            catch (WebException ex)
            {
                Console.WriteLine("ERROR: " + ex.Message);
                try 
                {
                    using (var reader = new StreamReader(ex.Response.GetResponseStream()))
                    {
                        string errorResponse = reader.ReadToEnd();
                        Console.WriteLine("Error Response: " + errorResponse);
                    }
                }
                catch 
                {
                    Console.WriteLine("Could not read error response");
                }
                return false;
            }
        }

        public static void Main(string[] args)
        {
            Console.WriteLine("===========================================");
            Console.WriteLine("TEST ONESIGNAL - MÉTHODE EXACTE");
            Console.WriteLine("===========================================");
            Console.WriteLine("URL: " + ONESIGNAL_URL);
            Console.WriteLine("App ID: " + ONESIGNAL_APP_ID);
            Console.WriteLine("Player ID: " + PLAYER_ID);
            Console.WriteLine("Message: TEST C# - Nouvelle course disponible!");
            Console.WriteLine("");

            bool result = SendPushNotification(PLAYER_ID, "TEST C# - Nouvelle course disponible!");
            
            Console.WriteLine("");
            if (result)
            {
                Console.WriteLine("===========================================");
                Console.WriteLine("REGARDEZ VOTRE TÉLÉPHONE!");
                Console.WriteLine("===========================================");
            }
            else
            {
                Console.WriteLine("===========================================");
                Console.WriteLine("ÉCHEC - Vérifiez les logs ci-dessus");
                Console.WriteLine("===========================================");
            }
            
            Console.WriteLine("Appuyez sur une touche pour continuer...");
            Console.ReadKey();
        }
    }
}