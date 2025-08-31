# ===============================================
# cURL POUR API TriggerPaymentOnAcceptance
# Test avec réservation et conducteur spécifiés
# ===============================================

# Variables de test
RESERVATION_ID="0b1c5f4f-38ab-4419-8fd2-f2cca9d63e78"
CONDUCTEUR_ID="75f2bd16-d906-4ea5-8f30-5ff66612ea5c"

# URL de l'API (ajustez selon votre endpoint)
API_BASE_URL="https://your-api-domain.com"
ENDPOINT="/api/TriggerPaymentOnAcceptance"

# Test 1: POST avec données JSON
curl -X POST \
  "${API_BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN_HERE" \
  -d '{
    "reservation_id": "'${RESERVATION_ID}'",
    "conducteur_id": "'${CONDUCTEUR_ID}'",
    "action": "accept_and_trigger_payment"
  }' \
  -v

echo "\n==============================================="
echo "Test avec données de réservation:"
echo "- Réservation ID: ${RESERVATION_ID}"
echo "- Conducteur ID: ${CONDUCTEUR_ID}"
echo "==============================================="

# Test 2: GET avec paramètres dans l'URL (si l'API fonctionne en GET)
curl -X GET \
  "${API_BASE_URL}${ENDPOINT}?reservation_id=${RESERVATION_ID}&conducteur_id=${CONDUCTEUR_ID}" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN_HERE" \
  -v

# Test 3: POST avec form-data (alternative si JSON ne fonctionne pas)
curl -X POST \
  "${API_BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN_HERE" \
  -d "reservation_id=${RESERVATION_ID}" \
  -d "conducteur_id=${CONDUCTEUR_ID}" \
  -v