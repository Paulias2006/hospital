# 🔄 ADAPTER LE FRONTEND - Intégration API Complète

Ce guide vous montre comment adapter votre HTML actuel pour utiliser l'API backend.

---

## 🎯 Approche

**Avant:** Tout en localStorage (client-side)  
**Après:** API calls au serveur (server-side)

Le UI reste inchangé, seul le backend de communication change.

---

## 📝 ÉTAPE 1: Ajouter la Configuration API

Au début du fichier HTML, avant les autres `<script>`, ajouter:

```html
<script>
  // Configuration API
  const API_URL = 'http://localhost:5000/api';
  let AUTH_TOKEN = localStorage.getItem('auth_token');
  let CURRENT_USER = JSON.parse(localStorage.getItem('current_user') || 'null');

  // Cache local (état de l'app)
  let state = {
    rooms: [],
    patients: [],
    payments: {},
    insurance: [],
    history: [],
  };

  // ============================================================================
  // HELPER: Appels API
  // ============================================================================

  async function apiCall(endpoint, method = 'GET', body = null) {
    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (AUTH_TOKEN) {
        options.headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
      }

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${API_URL}${endpoint}`, options);

      if (response.status === 401) {
        // Token expiré
        AUTH_TOKEN = null;
        CURRENT_USER = null;
        localStorage.removeItem('auth_token');
        localStorage.removeItem('current_user');
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
      showToast(error.message, 'error');
      throw error;
    }
  }

  // ============================================================================
  // CHARGER LES DONNÉES AU DÉMARRAGE
  // ============================================================================

  async function loadAllData() {
    try {
      console.log('🔄 Chargement des données...');

      const roomsRes = await apiCall('/rooms');
      state.rooms = roomsRes.data || [];

      const patientsRes = await apiCall('/patients');
      state.patients = patientsRes.data || [];

      const insuranceRes = await apiCall('/insurance/list/all');
      state.insurance = insuranceRes.data || [];

      // Charger les paiements pour chaque patient
      for (let patient of state.patients) {
        const paymentsRes = await apiCall(`/payments/patient/${patient._id}`);
        state.payments[patient._id] = paymentsRes.data || [];
      }

      console.log('✅ Données chargées avec succès');
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      showToast('Erreur lors du chargement des données', 'error');
    }
  }
</script>
```

---

## 🔐 ÉTAPE 2: Adapter l'Authentification

Remplacer la fonction `login()` existante:

```javascript
async function login(event) {
  event.preventDefault();
  const pwd = document.getElementById('password').value;

  try {
    const response = await apiCall('/auth/login', 'POST', {
      email: 'admin@hospital.local', // À adapter si nécessaire
      password: pwd,
    });

    if (!response.success) {
      throw new Error(response.error || 'Erreur d\'authentification');
    }

    // Sauvegarder le token
    AUTH_TOKEN = response.data.token;
    CURRENT_USER = response.data.user;

    localStorage.setItem('auth_token', AUTH_TOKEN);
    localStorage.setItem('current_user', JSON.stringify(CURRENT_USER));

    // Charger les données
    await loadAllData();

    // Afficher l'app
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('appContainer').classList.add('active');
    document.getElementById('admissionDate').value = getTodayStr();
    document.getElementById('exitDate').value = getTodayStr();

    renderAll();
    showToast('Connecté avec succès');

    console.log('✅ Authentification réussie:', CURRENT_USER);
  } catch (error) {
    console.error('Erreur login:', error);
    document.getElementById('loginError').classList.add('show');
  }
}
```

Adapter aussi `logout()`:

```javascript
function logout() {
  if (!confirm('Voulez-vous vraiment vous déconnecter ?')) return;

  AUTH_TOKEN = null;
  CURRENT_USER = null;
  state = { rooms: [], patients: [], payments: {}, insurance: [], history: [] };

  localStorage.removeItem('auth_token');
  localStorage.removeItem('current_user');

  document.getElementById('loginContainer').style.display = 'flex';
  document.getElementById('appContainer').classList.remove('active');
  document.getElementById('password').value = '';

  showToast('Déconnecté');
}
```

---

## 🏨 ÉTAPE 3: Adapter les Chambres

```javascript
async function addRoom() {
  const number = document.getElementById('roomNumber').value.trim();
  const type = document.getElementById('roomType').value;

  if (!number) {
    showToast('Numéro de salle requis', 'error');
    return;
  }

  try {
    const response = await apiCall('/rooms', 'POST', {
      roomNumber: number,
      type: type,
    });

    state.rooms.push(response.data);

    document.getElementById('roomNumber').value = '';
    showToast('Chambre ajoutée avec succès');

    renderRooms();
    renderPatientRoomSelect();
  } catch (error) {
    console.error('Erreur:', error);
  }
}

async function deleteRoom(roomId) {
  if (!confirm('Supprimer cette chambre ?')) return;

  try {
    await apiCall(`/rooms/${roomId}`, 'DELETE');

    state.rooms = state.rooms.filter(r => r._id !== roomId);

    showToast('Chambre supprimée');
    renderRooms();
    renderPatientRoomSelect();
  } catch (error) {
    console.error('Erreur:', error);
  }
}
```

---

## 👨‍⚕️ ÉTAPE 4: Adapter les Admissions

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
    showToast('Veuillez sélectionner l\'assurance', 'error');
    return;
  }

  try {
    const response = await apiCall('/patients', 'POST', {
      nom,
      chambreId,
      dateAdmission,
      statut,
      insuranceType,
    });

    state.patients.push(response.data);
    state.payments[response.data._id] = [];

    event.target.reset();
    document.getElementById('admissionDate').value = getTodayStr();
    document.getElementById('insuranceSelectGroup').style.display = 'none';

    showToast('Patient admis avec succès');
    renderAll();
  } catch (error) {
    console.error('Erreur:', error);
  }
}
```

---

## 💳 ÉTAPE 5: Adapter les Paiements

```javascript
async function markDayPaid(patientId, paymentId) {
  try {
    const response = await apiCall(`/payments/${paymentId}/mark-paid`, 'PUT');

    // Mettre à jour le cache local
    const paymentIdx = state.payments[patientId].findIndex(p => p._id === paymentId);
    if (paymentIdx !== -1) {
      state.payments[patientId][paymentIdx] = response.data;
    }

    viewPaymentDetails(patientId);
    renderPaymentsTable();
    showToast('Paiement enregistré');
  } catch (error) {
    console.error('Erreur:', error);
  }
}

async function saveEditedAmount() {
  const patientId = parseInt(document.getElementById('editPatientId').value);
  const paymentId = document.getElementById('editPaymentId').value;
  const montant = parseFloat(document.getElementById('editAmount').value);

  if (isNaN(montant) || montant < 0) {
    showToast('Montant invalide', 'error');
    return;
  }

  try {
    const response = await apiCall(
      `/payments/${paymentId}/edit-amount`,
      'PUT',
      { montantReel: montant }
    );

    const paymentIdx = state.payments[patientId].findIndex(p => p._id === paymentId);
    if (paymentIdx !== -1) {
      state.payments[patientId][paymentIdx] = response.data;
    }

    closeModal('editAmountModal');
    viewPaymentDetails(patientId);
    renderPaymentsTable();
    showToast('Montant modifié');
  } catch (error) {
    console.error('Erreur:', error);
  }
}
```

---

## 🔐 ÉTAPE 6: Adapter les Assurances (PEC)

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
      tranches.push({
        dateDebut,
        dateFin,
        prixReel,
        montantPEC,
        statut,
      });
    }
  });

  try {
    const response = await apiCall(`/insurance/${patientId}`, 'POST', {
      insuranceType: document.getElementById('insuranceType')?.value,
      pecs: tranches,
    });

    const idx = state.insurance.findIndex(i => i.patient === patientId);
    if (idx !== -1) {
      state.insurance[idx] = response.data;
    } else {
      state.insurance.push(response.data);
    }

    // Recharger les paiements
    const paymentsRes = await apiCall(`/payments/patient/${patientId}`);
    state.payments[patientId] = paymentsRes.data || [];

    closeModal('pecModal');
    renderAll();
    showToast('PEC enregistrée avec succès');
  } catch (error) {
    console.error('Erreur:', error);
  }
}
```

---

## 🚪 ÉTAPE 7: Adapter les Sorties

```javascript
async function confirmExit() {
  const patientId = document.getElementById('exitPatientId').value;
  const typeSortie = document.getElementById('exitType').value;
  const dateSortie = document.getElementById('exitDate').value;

  try {
    const response = await apiCall(
      `/patients/${patientId}/exit`,
      'POST',
      { typeSortie, dateSortie }
    );

    const idx = state.patients.findIndex(p => p._id === patientId);
    if (idx !== -1) {
      state.patients[idx] = response.data;
    }

    // Recharger les paiements
    const paymentsRes = await apiCall(`/payments/patient/${patientId}`);
    state.payments[patientId] = paymentsRes.data || [];

    closeModal('exitModal');
    renderAll();
    showToast(`${typeSortie} enregistré avec succès`);
  } catch (error) {
    console.error('Erreur:', error);
  }
}
```

---

## 📊 ÉTAPE 8: Adapter le Dashboard

Modifier `renderPaymentsTable()`:

```javascript
async function renderPaymentsTable() {
  try {
    const summaryRes = await apiCall('/payments/summary/dashboard');
    const summary = summaryRes.data;

    document.getElementById('payTotal').textContent = formatMontant(summary.totalMontant);
    document.getElementById('payPaid').textContent = formatMontant(summary.totalPaye);
    document.getElementById('payUnpaid').textContent = formatMontant(summary.totalNonPaye);

    // Reste du rendu...
  } catch (error) {
    console.error('Erreur dashboard:', error);
  }
}
```

---

## 🔄 ÉTAPE 9: Auto-Sync

Ajouter après `init()`:

```javascript
// Synchroniser les données toutes les 5 minutes
setInterval(async () => {
  if (AUTH_TOKEN) {
    console.log('🔄 Sync automatique...');
    await loadAllData();
    renderAll();
  }
}, 5 * 60 * 1000);

// Au chargement du DOM
document.addEventListener('DOMContentLoaded', async () => {
  if (AUTH_TOKEN && CURRENT_USER) {
    // Déjà connecté
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('appContainer').classList.add('active');
    await loadAllData();
    renderAll();
  }
});
```

---

## ✅ CHECKLIST D'ADAPTATION

- [ ] Configuration API ajoutée
- [ ] Helper `apiCall()` implémenté
- [ ] Authentification adaptée
- [ ] Chambres (CRUD) adaptées
- [ ] Admissions adaptées
- [ ] Paiements adaptés
- [ ] Assurances adaptées
- [ ] Sorties adaptées
- [ ] Dashboard adapté
- [ ] Auto-sync configurée
- [ ] Historique potentiellement affiché
- [ ] Tests complets

---

## 🧪 TESTER

1. Lancer le backend: `npm run dev`
2. Ouvrir le HTML dans le navigateur
3. Se connecter (email: admin@hospital.local, password: admin)
4. Vérifier Console Dev → Network (voir les appels API)

---

**L'intégration est complète!** 🎉

