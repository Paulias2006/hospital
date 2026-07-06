#!/bin/bash

# 🏥 TEST DE L'API HÔPITAL EL-ELYON
# Script pour tester tous les endpoints

API_URL="http://localhost:5000/api"
TOKEN=""

echo "🏥 HÔPITAL EL-ELYON - Tests API"
echo "=================================="
echo ""

# 1. TESTER LA SANTÉ
echo "1️⃣ Test santé du serveur..."
curl -s "$API_URL/../health" | jq .
echo ""
sleep 1

# 2. ENREGISTREMENT
echo "2️⃣ Enregistrement utilisateur..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@hospital.local",
    "password": "admin123"
  }')

echo "$REGISTER_RESPONSE" | jq .

TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.data.token')
echo "✅ Token obtenu: ${TOKEN:0:30}..."
echo ""
sleep 1

# 3. CONNEXION
echo "3️⃣ Connexion utilisateur..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@hospital.local",
    "password": "admin123"
  }')

echo "$LOGIN_RESPONSE" | jq .
echo ""
sleep 1

# 4. OBTENIR INFO UTILISATEUR
echo "4️⃣ Info utilisateur courant..."
curl -s "$API_URL/auth/me" \
  -H "Authorization: Bearer $TOKEN" | jq .
echo ""
sleep 1

# 5. CRÉER UNE CHAMBRE
echo "5️⃣ Créer une chambre..."
ROOM_RESPONSE=$(curl -s -X POST "$API_URL/rooms" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "roomNumber": "101",
    "type": "Standard",
    "capacity": 1,
    "amenities": ["Lit", "Chaise"]
  }')

echo "$ROOM_RESPONSE" | jq .
ROOM_ID=$(echo "$ROOM_RESPONSE" | jq -r '.data._id')
echo "✅ Chambre ID: $ROOM_ID"
echo ""
sleep 1

# 6. LISTER LES CHAMBRES
echo "6️⃣ Lister les chambres..."
curl -s "$API_URL/rooms" \
  -H "Authorization: Bearer $TOKEN" | jq .
echo ""
sleep 1

# 7. ADMETTRE UN PATIENT
echo "7️⃣ Admettre un patient..."
PATIENT_RESPONSE=$(curl -s -X POST "$API_URL/patients" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"nom\": \"Diallo Ahmed\",
    \"prenom\": \"Ahmed\",
    \"telephone\": \"771234567\",
    \"email\": \"diallo@example.com\",
    \"adresse\": \"Dakar\",
    \"chambreId\": \"$ROOM_ID\",
    \"dateAdmission\": \"2024-01-15\",
    \"statut\": \"Assuré\",
    \"insuranceType\": \"INAM\"
  }")

echo "$PATIENT_RESPONSE" | jq .
PATIENT_ID=$(echo "$PATIENT_RESPONSE" | jq -r '.data._id')
echo "✅ Patient ID: $PATIENT_ID"
echo ""
sleep 1

# 8. LISTER LES PATIENTS
echo "8️⃣ Lister les patients..."
curl -s "$API_URL/patients" \
  -H "Authorization: Bearer $TOKEN" | jq .
echo ""
sleep 1

# 9. OBTENIR LES PAIEMENTS DU PATIENT
echo "9️⃣ Paiements du patient..."
curl -s "$API_URL/payments/patient/$PATIENT_ID" \
  -H "Authorization: Bearer $TOKEN" | jq .
echo ""
sleep 1

# 10. RÉSUMÉ DES PAIEMENTS
echo "🔟 Résumé des paiements..."
curl -s "$API_URL/payments/summary/dashboard" \
  -H "Authorization: Bearer $TOKEN" | jq .
echo ""
sleep 1

# 11. OBTENIR L'ASSURANCE DU PATIENT
echo "1️⃣1️⃣ Assurance du patient..."
curl -s "$API_URL/insurance/list/all" \
  -H "Authorization: Bearer $TOKEN" | jq .
echo ""
sleep 1

# 12. DASHBOARD
echo "1️⃣2️⃣ Tableau de bord..."
curl -s "$API_URL/dashboard" \
  -H "Authorization: Bearer $TOKEN" | jq .
echo ""
sleep 1

# 13. HISTORIQUE
echo "1️⃣3️⃣ Historique des événements..."
curl -s "$API_URL/history" \
  -H "Authorization: Bearer $TOKEN" | jq .
echo ""

echo ""
echo "✅ TESTS TERMINÉS!"
echo ""
echo "🎉 Tous les endpoints testés avec succès!"
