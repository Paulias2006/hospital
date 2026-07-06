# 🔄 MIGRATION FRONTEND - DE LOCALSTORAGE À API

## 📋 RÉSUMÉ

Actuellement: Le frontend utilise `localStorage` et JavaScript pur pour tout.
Objectif: Le frontend appelle une API Node.js/Express au lieu de localStorage.

---

## 🎯 STRATÉGIE

### Avant (Client-side):
```javascript
// localStorage
let state = { rooms: [], patients: [], paiements: {}, history: [] };

function saveState() {
  localStorage.setItem('elyon_data_v12', JSON.stringify(state));
}
```

### Après (API):
```javascript
// API calls
async function getPatients() {
  const response = await fetch('/api/patients', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
}
```

---

## 🔐 ÉTAPE 1: GESTION TOKEN/AUTH

### Ajouter au HTML (avant les autres scripts)

```html
<script>
  // Variables globales
  let API_URL = 'http://localhost:5000/api';
  let AUTH_TOKEN = localStorage.getItem('auth_token');
  let CURRENT_USER = null;

  // Fonction d'authentification
  async function login(event) {
    event.preventDefault();
    const pwd = document.getElementById('password').value;
    
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@hospital.local', password: pwd })
      });
      
      if (!response.ok) throw new Error('Authentification échouée');
      
      const data = await response.json();
      AUTH_TOKEN = data.token;
      CURRENT_USER = data.user;
      
      localStorage.setItem('auth_token', AUTH_TOKEN);
      localStorage.setItem('current_user', JSON.stringify(CURRENT_USER));
      
      // Masquer login, afficher app
      document.getElementById('loginContainer').style.display = 'none';
      document.getElementById('appContainer').classList.add('active');
      
      // Charger les données
      await loadAllData();
      renderAll();
      
    } catch (error) {
      console.error('Erreur auth:', error);
      document.getElementById('loginError').classList.add('show');
    }
  }

  // Fonction de déconnexion
  function logout() {
    if (!confirm('Vraiment se déconnecter ?')) return;
    AUTH_TOKEN = null;
    CURRENT_USER = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
    document.getElementById('loginContainer').style.display = 'flex';
    document.getElementById('appContainer').classList.remove('active');
    document.getElementById('password').value = '';
  }

  // Headers pour toutes les requêtes
  function getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`
    };
  }
</script>
```

---

## 🏗️ ÉTAPE 2: STRUCTURE DE DONNÉES (État local)

### Garder l'état local mais le synchroniser avec l'API

```javascript
<script>
  // État global (cache local)
  let state = {
    rooms: [],
    patients: [],
    payments: {},      // { patientId: { date: {...} } }
    history: [],
    insurance: []
  };

  // CHARGER TOUTES LES DONNÉES AU DÉMARRAGE
  async function loadAllData() {
    try {
      state.rooms = await fetchAPI('/rooms');
      state.patients = await fetchAPI('/patients');
      state.insurance = await fetchAPI('/insurance');
      state.history = await fetchAPI('/history');
      
      // Charger les paiements pour chaque patient
      for (let patient of state.patients) {
        state.payments[patient._id] = await fetchAPI(`/payments/patient/${patient._id}`);
      }
      
      console.log('✅ Données chargées depuis API');
    } catch (error) {
      console.error('Erreur chargement:', error);
    }
  }

  // FONCTION UTILITAIRE POUR APPELS API
  async function fetchAPI(endpoint, method = 'GET', body = null) {
    try {
      const options = {
        method,
        headers: getHeaders()
      };
      
      if (body) options.body = JSON.stringify(body);
      
      const response = await fetch(`${API_URL}${endpoint}`, options);
      
      if (response.status === 401) {
        // Token expiré
        logout();
        return null;
      }
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur API');
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Erreur API (${endpoint}):`, error);
      throw error;
    }
  }
</script>
```

---

## 👨‍⚕️ ÉTAPE 3: ADMISSIONS PATIENTS

### Remplacer la fonction admitPatient()

```javascript
async function admitPatient(event) {
  event.preventDefault();
  
  const nom = document.getElementById('patientName').value.trim();
  const dateAdmission = document.getElementById('admissionDate').value;
  const roomSelect = document.getElementById('patientRoom');
  const chambreId = roomSelect.value;
  const typeChambre = roomSelect.options[roomSelect.selectedIndex].dataset.type;
  const statut = document.getElementById('insuranceStatus').value;
  const insuranceType = statut === 'Assuré' ? document.getElementById('insuranceType').value : '';
  
  if (!nom || !dateAdmission || !chambreId) {
    showToast('Veuillez remplir tous les champs', 'error');
    return;
  }
  
  if (statut === 'Assuré' && !insuranceType) {
    showToast('Veuillez sélectionner le type d\'assurance', 'error');
    return;
  }
  
  try {
    // Créer le patient
    const patient = await fetchAPI('/patients', 'POST', {
      nom,
      chambreId,      // MongoDB ObjectId
      dateAdmission,
      statut,
      insuranceType
    });
    
    // Ajouter au cache local
    state.patients.push(patient);
    state.payments[patient._id] = [];
    
    // Réinitialiser formulaire
    event.target.reset();
    document.getElementById('admissionDate').value = getTodayStr();
    document.getElementById('insuranceSelectGroup').style.display = 'none';
    
    showToast('Patient admis avec succès');
    renderAll();
    
  } catch (error) {
    showToast('Erreur admission: ' + error.message, 'error');
  }
}
```

---

## 🏨 ÉTAPE 4: GESTION DES CHAMBRES

```javascript
async function addRoom() {
  const number = document.getElementById('roomNumber').value.trim();
  const type = document.getElementById('roomType').value;
  
  if (!number) {
    showToast('Numéro de salle requis', 'error');
    return;
  }
  
  try {
    const room = await fetchAPI('/rooms', 'POST', { roomNumber: number, type });
    state.rooms.push(room);
    
    document.getElementById('roomNumber').value = '';
    showToast('Chambre ajoutée');
    renderRooms();
    renderPatientRoomSelect();
    
  } catch (error) {
    showToast('Erreur: ' + error.message, 'error');
  }
}

async function deleteRoom(roomId) {
  if (!confirm('Supprimer cette chambre ?')) return;
  
  try {
    await fetchAPI(`/rooms/${roomId}`, 'DELETE');
    state.rooms = state.rooms.filter(r => r._id !== roomId);
    showToast('Chambre supprimée');
    renderRooms();
    renderPatientRoomSelect();
    
  } catch (error) {
    showToast('Erreur: ' + error.message, 'error');
  }
}
```

---

## 💳 ÉTAPE 5: PAIEMENTS

```javascript
async function markDayPaid(patientId, paymentId) {
  try {
    const payment = await fetchAPI(
      `/payments/${paymentId}/mark-paid`,
      'PUT',
      { paye: true }
    );
    
    // Mettre à jour cache local
    if (state.payments[patientId]) {
      const idx = state.payments[patientId].findIndex(p => p._id === paymentId);
      if (idx !== -1) state.payments[patientId][idx] = payment;
    }
    
    viewPaymentDetails(patientId);
    renderPaymentsTable();
    showToast('Paiement enregistré');
    
  } catch (error) {
    showToast('Erreur: ' + error.message, 'error');
  }
}

async function openEditAmount(patientId, paymentId, montant) {
  document.getElementById('editPatientId').value = patientId;
  document.getElementById('editPaymentId').value = paymentId;
  document.getElementById('editAmount').value = montant;
  document.getElementById('editAmountModal').classList.add('active');
}

async function saveEditedAmount() {
  const patientId = parseInt(document.getElementById('editPatientId').value);
  const paymentId = document.getElementById('editPaymentId').value;
  const nouveauMontant = parseFloat(document.getElementById('editAmount').value);
  
  if (isNaN(nouveauMontant) || nouveauMontant < 0) {
    showToast('Montant invalide', 'error');
    return;
  }
  
  try {
    const payment = await fetchAPI(
      `/payments/${paymentId}/edit-amount`,
      'PUT',
      { montantReel: nouveauMontant }
    );
    
    // Mettre à jour cache
    if (state.payments[patientId]) {
      const idx = state.payments[patientId].findIndex(p => p._id === paymentId);
      if (idx !== -1) state.payments[patientId][idx] = payment;
    }
    
    closeModal('editAmountModal');
    viewPaymentDetails(patientId);
    renderPaymentsTable();
    showToast('Montant modifié');
    
  } catch (error) {
    showToast('Erreur: ' + error.message, 'error');
  }
}
```

---

## 🔐 ÉTAPE 6: ASSURANCES (PEC)

```javascript
async function savePEC() {
  const patientId = document.getElementById('pecPatientId').value;
  const statut = document.getElementById('pecStatut').value;
  
  const tranches = [];
  document.querySelectorAll('#tranchesContainer .tranche-item').forEach(item => {
    const inputs = item.querySelectorAll('input');
    const dateDebut = inputs[0].value;
    const dateFin = inputs[1].value;
    const prixReel = parseFloat(inputs[2].value) || 0;
    const montantPEC = parseFloat(inputs[3].value) || 0;
    
    if (dateDebut && dateFin && prixReel > 0) {
      tranches.push({ dateDebut, dateFin, prixReel, montantPEC, statut });
    }
  });
  
  try {
    const insurance = await fetchAPI(
      `/insurance/${patientId}`,
      'PUT',
      { pecs: tranches }
    );
    
    // Mettre à jour cache
    const idx = state.insurance.findIndex(i => i.patient === patientId);
    if (idx !== -1) {
      state.insurance[idx] = insurance;
    } else {
      state.insurance.push(insurance);
    }
    
    // Régénérer les paiements du patient
    state.payments[patientId] = await fetchAPI(`/payments/patient/${patientId}`);
    
    closeModal('pecModal');
    renderAll();
    showToast('PEC enregistrée');
    
  } catch (error) {
    showToast('Erreur: ' + error.message, 'error');
  }
}
```

---

## 🚪 ÉTAPE 7: SORTIES & DÉCÈS

```javascript
async function confirmExit() {
  const patientId = document.getElementById('exitPatientId').value;
  const typeSortie = document.getElementById('exitType').value;
  const dateSortie = document.getElementById('exitDate').value;
  
  try {
    const patient = await fetchAPI(
      `/patients/${patientId}/exit`,
      'POST',
      { typeSortie, dateSortie }
    );
    
    // Mettre à jour cache
    const idx = state.patients.findIndex(p => p._id === patientId);
    if (idx !== -1) state.patients[idx] = patient;
    
    closeModal('exitModal');
    renderAll();
    showToast(`${typeSortie} enregistré`);
    
  } catch (error) {
    showToast('Erreur: ' + error.message, 'error');
  }
}
```

---

## 📊 ÉTAPE 8: DASHBOARD & RAPPORTS

```javascript
async function loadDashboardData() {
  try {
    const summary = await fetchAPI('/payments/summary/dashboard');
    document.getElementById('payTotal').textContent = formatMontant(summary.totalMontant);
    document.getElementById('payPaid').textContent = formatMontant(summary.totalPaye);
    document.getElementById('payUnpaid').textContent = formatMontant(summary.totalNonPaye);
  } catch (error) {
    console.error('Erreur dashboard:', error);
  }
}
```

---

## 🔄 ÉTAPE 9: SYNCHRONISATION AUTOMATIQUE

```javascript
// Rafraîchir les données toutes les 5 minutes
setInterval(async () => {
  console.log('🔄 Synchronisation...');
  await loadAllData();
  renderAll();
}, 5 * 60 * 1000); // 5 minutes

// Ou au changement de module
function showModule(moduleId, el) {
  document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
  document.getElementById(moduleId).classList.add('active');
  document.querySelectorAll('.sidebar-menu a').forEach(a => a.classList.remove('active'));
  if (el) el.classList.add('active');
  
  // Rafraîchir les données du module
  loadAllData().then(() => renderAll());
}
```

---

## 🎬 ÉTAPE 10: INITIALISATION AU DÉMARRAGE

```javascript
// Au chargement du DOM, vérifier le token
document.addEventListener('DOMContentLoaded', async () => {
  AUTH_TOKEN = localStorage.getItem('auth_token');
  CURRENT_USER = JSON.parse(localStorage.getItem('current_user') || 'null');
  
  if (AUTH_TOKEN && CURRENT_USER) {
    // Déjà connecté
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('appContainer').classList.add('active');
    document.getElementById('admissionDate').value = getTodayStr();
    document.getElementById('exitDate').value = getTodayStr();
    
    await loadAllData();
    renderAll();
  } else {
    // Afficher login
    document.getElementById('loginContainer').style.display = 'flex';
  }
});
```

---

## ⚙️ CONFIGURATION CORS (Backend)

Ajouter au `server.js`:

```javascript
const cors = require('cors');

app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1'],
  credentials: true
}));
```

---

## 📝 CHECKLIST DE MIGRATION

- [ ] Ajouter gestion token/auth
- [ ] Créer fetchAPI() helper
- [ ] Migrer admitPatient()
- [ ] Migrer addRoom()
- [ ] Migrer markDayPaid()
- [ ] Migrer savePEC()
- [ ] Migrer confirmExit()
- [ ] Ajouter sync automatique
- [ ] Tester offline graceful
- [ ] Ajouter error handling complet

---

## 🧪 TESTER

```bash
# Terminal 1: Backend
cd hospital-backend
npm run dev

# Terminal 2: Frontend
# Ouvrir index.html dans le navigateur
# Aller à http://localhost:3000/index.html (ou servir statiquement)

# Vérifier Console Dev -> Network
# Voir les appels API
```

