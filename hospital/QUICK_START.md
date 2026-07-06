# 🚀 QUICK START - DÉMARRER EN 30 MINUTES

Ce guide vous permet de démarrer un backend minimal en 30 minutes.

---

## 📥 INSTALLATION (5 min)

```bash
# 1. Créer le dossier
mkdir hospital-backend
cd hospital-backend

# 2. Initialiser npm
npm init -y

# 3. Installer les dépendances
npm install express mongoose dotenv bcryptjs jsonwebtoken cors
npm install --save-dev nodemon
```

---

## 📝 FICHIER 1: .env

Créer le fichier `.env` à la racine:

```
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/hospital
JWT_SECRET=your-secret-key-123-change-in-production
PORT=5000
NODE_ENV=development
```

**Pour MongoDB:**
1. Aller sur https://www.mongodb.com/cloud/atlas
2. Créer un compte gratuit
3. Créer un cluster gratuit
4. Obtenir la connection string
5. Remplacer `user:password` et `@cluster.mongodb.net`

---

## 📁 FICHIER 2: package.json (Scripts)

Modifier la partie `"scripts"`:

```json
{
  "scripts": {
    "dev": "nodemon server.js",
    "start": "node server.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  }
}
```

---

## 🗄️ FICHIER 3: server.js

Créer le fichier `server.js` à la racine:

```javascript
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ============================================================================
// CONNEXION MONGODB
// ============================================================================
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connecté'))
  .catch(err => console.error('❌ MongoDB erreur:', err));

// ============================================================================
// MODÈLES (Inline pour simplifier)
// ============================================================================

// User
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'staff'], default: 'staff' },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// Room
const roomSchema = new mongoose.Schema({
  roomNumber: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  isOccupied: { type: Boolean, default: false }
});
const Room = mongoose.model('Room', roomSchema);

// Patient
const patientSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  chambre: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  typeChambre: String,
  dateAdmission: { type: Date, required: true },
  dateSortie: { type: Date, default: null },
  assurance: String,
  insuranceType: String,
  createdAt: { type: Date, default: Date.now }
});
const Patient = mongoose.model('Patient', patientSchema);

// ============================================================================
// MIDDLEWARE AUTH
// ============================================================================

const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token manquant' });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token invalide' });
  }
};

// ============================================================================
// ROUTES AUTHENTIFICATION
// ============================================================================

// Login simple (production: implémenter register aussi)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Pour démo: créer user admin si n'existe pas
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        email,
        password, // DANGER: ne pas faire en production!
        role: 'admin'
      });
      await user.save();
    }
    
    // Vérifier password (simplifié pour démo)
    if (password !== 'admin') {
      return res.status(401).json({ error: 'Mot de passe incorrect' });
    }
    
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      user: { id: user._id, email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// ROUTES PATIENTS
// ============================================================================

// GET - Lister tous les patients actifs
app.get('/api/patients', authMiddleware, async (req, res) => {
  try {
    const patients = await Patient.find({ dateSortie: null }).populate('chambre');
    res.json(patients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST - Créer un patient (admission)
app.post('/api/patients', authMiddleware, async (req, res) => {
  try {
    const { nom, chambreId, dateAdmission, assurance, insuranceType } = req.body;
    
    const room = await Room.findById(chambreId);
    if (!room || room.isOccupied) {
      return res.status(400).json({ error: 'Chambre non disponible' });
    }
    
    const patient = new Patient({
      nom,
      chambre: chambreId,
      typeChambre: room.type,
      dateAdmission: new Date(dateAdmission),
      assurance,
      insuranceType
    });
    
    await patient.save();
    
    // Marquer la chambre occupée
    room.isOccupied = true;
    await room.save();
    
    res.status(201).json(patient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// ROUTES CHAMBRES
// ============================================================================

// GET - Lister toutes les chambres
app.get('/api/rooms', authMiddleware, async (req, res) => {
  try {
    const rooms = await Room.find();
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST - Créer une chambre
app.post('/api/rooms', authMiddleware, async (req, res) => {
  try {
    const { roomNumber, type } = req.body;
    const room = new Room({ roomNumber, type });
    await room.save();
    res.status(201).json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// ROUTE DE TEST
// ============================================================================

app.get('/', (req, res) => {
  res.json({
    message: '🏥 Hôpital EL-ELYON API',
    version: '1.0.0',
    endpoints: {
      auth: 'POST /api/auth/login',
      patients: 'GET /api/patients',
      rooms: 'GET /api/rooms'
    }
  });
});

// ============================================================================
// LANCER LE SERVEUR
// ============================================================================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
  console.log(`📚 API: http://localhost:${PORT}/api`);
});
```

---

## ▶️ LANCER LE SERVEUR

```bash
# Développement (auto-reload)
npm run dev

# Vous devriez voir:
# ✅ MongoDB connecté
# 🚀 Serveur lancé sur http://localhost:5000
```

---

## 🧪 TESTER L'API

### Avec cURL:

```bash
# 1. Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hospital.local","password":"admin"}'

# Réponse (garder le token):
# {"token":"eyJ...","user":{"id":"...","email":"admin@hospital.local"}}

# 2. Lister les patients (remplacer TOKEN)
curl http://localhost:5000/api/patients \
  -H "Authorization: Bearer TOKEN"

# 3. Créer une chambre (remplacer TOKEN)
curl -X POST http://localhost:5000/api/rooms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"roomNumber":"101","type":"Standard"}'
```

### Avec Postman:

1. Créer une collection "EL-ELYON"
2. Ajouter les requêtes:

```
POST http://localhost:5000/api/auth/login
Body: {"email":"admin@hospital.local","password":"admin"}

GET http://localhost:5000/api/rooms
Headers: Authorization: Bearer {token}

POST http://localhost:5000/api/rooms
Body: {"roomNumber":"201","type":"Individuelle"}
Headers: Authorization: Bearer {token}
```

---

## 🔗 INTÉGRER AU FRONTEND

Dans le HTML actuel, ajouter au-dessus de `<script>`:

```html
<script>
  const API_URL = 'http://localhost:5000/api';
  let AUTH_TOKEN = null;

  // Login modifié
  async function login(event) {
    event.preventDefault();
    const pwd = document.getElementById('password').value;
    
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@hospital.local', password: pwd })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      AUTH_TOKEN = data.token;
      localStorage.setItem('auth_token', AUTH_TOKEN);
      
      document.getElementById('loginContainer').style.display = 'none';
      document.getElementById('appContainer').classList.add('active');
      
    } catch (err) {
      alert('Erreur: ' + err.message);
    }
  }

  // Helper pour les appels API
  async function apiCall(endpoint, method = 'GET', body = null) {
    const options = {
      method,
      headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
    };
    
    if (body) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${API_URL}${endpoint}`, options);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  }
</script>
```

---

## 📚 PROCHAINES ÉTAPES

1. **Ajouter les modèles manquants** (Payment, Insurance, History)
2. **Ajouter les routes manquantes** (payments, insurance, exit)
3. **Implémenter les calculs** (nuitées, tarifs)
4. **Migrer complètement le frontend**
5. **Ajouter tests**
6. **Déployer sur Railway/Heroku**

---

## 💡 STRUCTURE COMPLÈTE (Après optimisation)

Une fois que vous maîtrisez le concept, passez à la structure complète:

```
hospital-backend/
├── src/
│   ├── config/database.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Patient.js
│   │   ├── Room.js
│   │   ├── Insurance.js
│   │   ├── Payment.js
│   │   └── History.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── patients.js
│   │   ├── rooms.js
│   │   ├── payments.js
│   │   ├── insurance.js
│   │   └── history.js
│   ├── middleware/auth.js
│   ├── utils/
│   │   ├── calculations.js
│   │   └── validators.js
│   └── app.js
├── .env
└── server.js
```

Mais commencez simple avec ce quick start!

---

## ✅ VOUS ÊTES PRÊT!

Vous avez maintenant:
- ✅ Backend Node.js/Express
- ✅ MongoDB connecté
- ✅ Authentification JWT
- ✅ Routes API basiques
- ✅ Intégration frontale possible

**Prochaine étape:** Lire le guide complet pour ajouter tous les modèles.

