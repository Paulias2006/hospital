# ⚙️ GUIDE COMPLET: DÉMARRAGE, TEST, DÉPLOIEMENT

---

## 🚀 ÉTAPE 1: INSTALLER & CONFIGURER LE BACKEND

### 1.1 Cloner et installer

```bash
cd hospital-backend
npm install
```

### 1.2 Configurer MongoDB

**Option A: MongoDB Atlas (Cloud - Recommandé)**
1. Aller sur https://www.mongodb.com/cloud/atlas
2. Créer un compte gratuit
3. Créer un cluster gratuit
4. Dans "Database" → "Connect" → copier la chaîne de connexion
5. Créer une `.env` avec:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hospital-elyon?retryWrites=true&w=majority
```

**Option B: MongoDB Local (sur votre machine)**
1. Télécharger MongoDB Community: https://www.mongodb.com/try/download/community
2. Installer et lancer le service
3. Utiliser:

```env
MONGODB_URI=mongodb://localhost:27017/hospital-elyon
```

### 1.3 Configuration complète

Créer `hospital-backend/.env`:

```env
# MongoDB
MONGODB_URI=mongodb+srv://youruser:yourpass@cluster.mongodb.net/hospital-elyon?retryWrites=true&w=majority
DB_NAME=hospital-elyon

# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRE=24h

# Serveur
PORT=5000
NODE_ENV=development

# CORS (pour frontend)
CORS_ORIGIN=http://localhost,http://127.0.0.1,http://localhost:3000,file://

# Logging
LOG_LEVEL=info

# Tarifs
TARIF_STANDARD=10000
TARIF_INDIVIDUELLE=23000
TARIF_COMMUNE=8000
TARIF_VIP=35000
TARIF_REANIMATION=100000
TARIF_PEDIATRIE=12000
TARIF_URGENCE=15000
```

---

## 🧪 ÉTAPE 2: TESTER LE BACKEND

### 2.1 Démarrer le serveur

```bash
npm run dev
```

Vous devez voir:

```
╔════════════════════════════════════════════════════════════╗
║     🏥 HÔPITAL EL-ELYON - Système de Gestion         ║
║     Serveur lancé avec succès!                            ║
╠════════════════════════════════════════════════════════════╣
║ URL: http://localhost:5000                              ║
╚════════════════════════════════════════════════════════════╝
```

### 2.2 Tester la santé

```bash
curl http://localhost:5000/health
```

Réponse:
```json
{
  "success": true,
  "message": "✅ API Hôpital EL-ELYON est fonctionnelle",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 2.3 Créer un utilisateur

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@hospital.local",
    "password": "admin123"
  }'
```

Réponse:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "67a3b...",
      "username": "admin",
      "email": "admin@hospital.local",
      "role": "admin"
    }
  }
}
```

### 2.4 Se connecter

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@hospital.local",
    "password": "admin123"
  }'
```

**Copier le token pour les requêtes suivantes.**

### 2.5 Créer une chambre

```bash
# Remplacer TOKEN par le token obtenu
curl -X POST http://localhost:5000/api/rooms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "roomNumber": "101",
    "type": "Standard",
    "capacity": 1,
    "amenities": ["Lit", "Chaise"]
  }'
```

### 2.6 Lister les chambres

```bash
curl http://localhost:5000/api/rooms \
  -H "Authorization: Bearer TOKEN"
```

---

## 📱 ÉTAPE 3: ADAPTER LE FRONTEND HTML

### 3.1 Localisation du fichier HTML

Le fichier HTML est à: `hospital/index.html`

### 3.2 Ajouter l'intégration API

1. Ouvrir `hospital/index.html`
2. **À la fin du `<head>`**, avant `</head>`, ajouter:

```html
<script>
  // Configuration API
  const API_URL = 'http://localhost:5000/api';
  let AUTH_TOKEN = localStorage.getItem('auth_token');
  let CURRENT_USER = JSON.parse(localStorage.getItem('current_user') || 'null');

  // État global
  let state = {
    rooms: [],
    patients: [],
    payments: {},
    insurance: [],
  };

  // Helper API
  async function apiCall(endpoint, method = 'GET', body = null) {
    try {
      const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
      };

      if (AUTH_TOKEN) {
        options.headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
      }

      if (body) options.body = JSON.stringify(body);

      const response = await fetch(`${API_URL}${endpoint}`, options);

      if (response.status === 401) {
        AUTH_TOKEN = null;
        logout();
        return null;
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur');
      }

      return await response.json();
    } catch (error) {
      console.error('Erreur API:', error);
      showToast?.('❌ ' + error.message, 'error');
      throw error;
    }
  }

  // Charger toutes les données
  async function loadAllData() {
    try {
      const roomsRes = await apiCall('/rooms');
      state.rooms = roomsRes?.data || [];

      const patientsRes = await apiCall('/patients');
      state.patients = patientsRes?.data || [];

      for (let patient of state.patients) {
        const paymentsRes = await apiCall(`/payments/patient/${patient._id}`);
        state.payments[patient._id] = paymentsRes?.data || [];
      }

      console.log('✅ Données chargées');
    } catch (error) {
      console.error('Erreur chargement:', error);
    }
  }
</script>
```

### 3.3 Adapter la fonction login()

Remplacer la fonction `login()` existante par:

```javascript
async function login(event) {
  event.preventDefault();
  const pwd = document.getElementById('password').value;

  try {
    const response = await apiCall('/auth/login', 'POST', {
      email: 'admin@hospital.local',
      password: pwd,
    });

    AUTH_TOKEN = response.data.token;
    CURRENT_USER = response.data.user;

    localStorage.setItem('auth_token', AUTH_TOKEN);
    localStorage.setItem('current_user', JSON.stringify(CURRENT_USER));

    await loadAllData();

    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('appContainer').classList.add('active');
    
    showToast('✅ Authentifié avec succès');
  } catch (error) {
    document.getElementById('loginError').classList.add('show');
  }
}
```

### 3.4 Adapter addRoom()

```javascript
async function addRoom() {
  const number = document.getElementById('roomNumber').value;
  const type = document.getElementById('roomType').value;

  try {
    const response = await apiCall('/rooms', 'POST', {
      roomNumber: number,
      type: type,
    });

    state.rooms.push(response.data);
    document.getElementById('roomNumber').value = '';
    showToast('✅ Chambre ajoutée');
    renderRooms();
  } catch (error) {
    console.error('Erreur:', error);
  }
}
```

### 3.5 Adapter admitPatient()

```javascript
async function admitPatient(event) {
  event.preventDefault();

  const nom = document.getElementById('patientName').value;
  const dateAdmission = document.getElementById('admissionDate').value;
  const roomSelect = document.getElementById('patientRoom');
  const chambreId = roomSelect.value;
  const statut = document.getElementById('insuranceStatus').value;

  try {
    const response = await apiCall('/patients', 'POST', {
      nom,
      chambreId,
      dateAdmission,
      statut,
    });

    state.patients.push(response.data);
    state.payments[response.data._id] = [];
    
    event.target.reset();
    showToast('✅ Patient admis');
    renderAll();
  } catch (error) {
    console.error('Erreur:', error);
  }
}
```

### 3.6 Adapter markDayPaid()

```javascript
async function markDayPaid(patientId, paymentId) {
  try {
    const response = await apiCall(`/payments/${paymentId}/mark-paid`, 'PUT');

    const idx = state.payments[patientId].findIndex(p => p._id === paymentId);
    if (idx !== -1) {
      state.payments[patientId][idx] = response.data;
    }

    renderPaymentsTable();
    showToast('✅ Paiement enregistré');
  } catch (error) {
    console.error('Erreur:', error);
  }
}
```

### 3.7 Adapter confirmExit()

```javascript
async function confirmExit() {
  const patientId = document.getElementById('exitPatientId').value;
  const typeSortie = document.getElementById('exitType').value;
  const dateSortie = document.getElementById('exitDate').value;

  try {
    const response = await apiCall(`/patients/${patientId}/exit`, 'POST', {
      typeSortie,
      dateSortie,
    });

    const idx = state.patients.findIndex(p => p._id === patientId);
    if (idx !== -1) {
      state.patients[idx] = response.data;
    }

    closeModal('exitModal');
    showToast('✅ Sortie enregistrée');
    renderAll();
  } catch (error) {
    console.error('Erreur:', error);
  }
}
```

### 3.8 Au chargement de la page

Ajouter avant le `</script>` de fermeture:

```javascript
// Vérifier la connexion au chargement
document.addEventListener('DOMContentLoaded', async () => {
  if (AUTH_TOKEN && CURRENT_USER) {
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('appContainer').classList.add('active');
    await loadAllData();
    // renderAll() - appeler selon votre code
  }
});
```

---

## 🔗 ÉTAPE 4: CONNECTER FRONTEND + BACKEND

### 4.1 Démarrer le backend

Terminal 1:
```bash
cd hospital-backend
npm run dev
```

### 4.2 Ouvrir le frontend

Terminal 2:
```bash
# Sur Windows
start hospital/index.html

# Sur Mac
open hospital/index.html

# Ou simplement ouvrir avec votre navigateur
```

### 4.3 Tester le flux complet

1. ✅ Ouvrir Dev Tools (F12)
2. ✅ Onglet "Network"
3. ✅ Entrer le mot de passe dans le formulaire
4. ✅ Voir les requêtes API (POST /auth/login, GET /rooms, etc.)
5. ✅ Les données devraient charger

### 4.4 Dépannage

**Erreur CORS?**
```env
CORS_ORIGIN=http://localhost,http://127.0.0.1,file://
```

**Token non envoyé?**
```javascript
// Vérifier dans Dev Tools > Network > Headers:
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Requête 401?**
```javascript
// Le token a peut-être expiré
localStorage.removeItem('auth_token');
location.reload();
```

---

## 📦 ÉTAPE 5: DÉPLOYER SUR VERCEL

### 5.1 Préparer le projet

```bash
cd hospital-backend

# Vérifier package.json
npm list

# Tester en production local
NODE_ENV=production npm start
```

### 5.2 Créer un compte Vercel

1. Aller sur https://vercel.com
2. S'enregistrer avec GitHub (recommandé)
3. Autoriser Vercel

### 5.3 Installer Vercel CLI

```bash
npm install -g vercel
vercel login
```

### 5.4 Déployer

```bash
cd hospital-backend
vercel
```

Répondre aux questions:
```
? Set up and deploy: Y
? Project name: hospital-backend
? Which scope? (Your username)
? Link to existing project? N
? Upload files? Y
```

### 5.5 Configurer les variables d'env

Sur https://vercel.com/dashboard:
1. Sélectionner le projet "hospital-backend"
2. Settings → Environment Variables
3. Ajouter:
   - `MONGODB_URI`: votre chaîne MongoDB
   - `JWT_SECRET`: une clé secrète complexe
   - `NODE_ENV`: production

### 5.6 Redéployer

```bash
vercel --prod
```

Ou depuis le dashboard Vercel.

### 5.7 Récupérer l'URL

L'URL sera affichée après le déploiement:
```
✅ Production: https://hospital-backend-abc123.vercel.app
```

---

## 🌐 ÉTAPE 6: ADAPTER LE FRONTEND POUR LA PRODUCTION

Remplacer:
```javascript
const API_URL = 'http://localhost:5000/api';
```

Par:
```javascript
const API_URL = 'https://hospital-backend-abc123.vercel.app/api';
```

Ou rendre dynamique:
```javascript
const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:5000/api'
  : 'https://hospital-backend-abc123.vercel.app/api';
```

---

## 📊 ÉTAPE 7: VÉRIFIER LE DÉPLOIEMENT

```bash
curl https://hospital-backend-abc123.vercel.app/health
```

Réponse:
```json
{
  "success": true,
  "message": "✅ API Hôpital EL-ELYON est fonctionnelle"
}
```

---

## 📋 CHECKLIST FINALE

- [ ] Backend créé et testé localement
- [ ] MongoDB configuré
- [ ] Frontend adapté avec API calls
- [ ] Frontend testé avec backend local
- [ ] Backend déployé sur Vercel
- [ ] Variables d'env configurées sur Vercel
- [ ] Frontend pointe vers l'API de production
- [ ] Authentification fonctionne en production
- [ ] Chambres/patients/paiements synchronisés
- [ ] Historique et audit trail actifs
- [ ] Tests de charge effectués

---

## 🚨 RÉSOLUTION DE PROBLÈMES

### Erreur: "Cannot find module"
```bash
npm install
npm run dev
```

### MongoDB: "connection refused"
```bash
# Vérifier la chaîne MONGODB_URI
# Vérifier que le cluster Atlas est actif
# Vérifier les IP whitelist
```

### CORS error
```env
# Ajouter l'origine du frontend
CORS_ORIGIN=http://localhost,https://monsite.com
```

### Token expiré 401
```javascript
// Forcer la nouvelle connexion
localStorage.clear();
location.reload();
```

### Données non synchronisées
```javascript
// Vérifier les logs du backend
console.log(state.patients);

// Forcer un rechargement
await loadAllData();
renderAll();
```

---

## 📞 SUPPORT

- Logs: `console.log()` et Dev Tools
- Backend logs: `npm run dev` terminal
- MongoDB: Atlas Dashboard
- Vercel: Dashboard logs

**API est maintenant en production! 🚀**

