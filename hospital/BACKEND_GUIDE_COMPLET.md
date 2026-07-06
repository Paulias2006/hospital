# 🏗️ GUIDE COMPLET - BACKEND NODEJS/EXPRESS + MONGODB

## 📋 TABLE DES MATIÈRES
1. Préparation
2. Architecture
3. Modèles MongoDB
4. API REST complète
5. Authentification
6. Déploiement

---

## 🛠️ PARTIE 1: PRÉPARATION DE L'ENVIRONNEMENT

### Installation requise:
```bash
# Node.js (v16+)
node --version

# Vérifier npm
npm --version
```

### Créer le projet:
```bash
mkdir hospital-backend
cd hospital-backend
npm init -y
```

### Installer les dépendances:
```bash
npm install express mongoose dotenv bcryptjs jsonwebtoken cors
npm install --save-dev nodemon

# Dépendances supplémentaires:
npm install joi express-validator
npm install winston pino  # logging
```

---

## 📁 PARTIE 2: STRUCTURE DU PROJET

```
hospital-backend/
├── src/
│   ├── config/
│   │   └── database.js          # Connexion MongoDB
│   ├── models/
│   │   ├── User.js              # Administrateurs/Staff
│   │   ├── Patient.js
│   │   ├── Room.js
│   │   ├── Insurance.js         # PEC
│   │   ├── Payment.js
│   │   └── History.js           # Audit
│   ├── routes/
│   │   ├── auth.js
│   │   ├── patients.js
│   │   ├── rooms.js
│   │   ├── insurance.js
│   │   ├── payments.js
│   │   ├── dashboard.js
│   │   └── history.js
│   ├── middleware/
│   │   ├── auth.js              # JWT verification
│   │   ├── errorHandler.js
│   │   └── validation.js
│   ├── utils/
│   │   ├── calculations.js      # Nuitées, tarifs
│   │   ├── validators.js
│   │   └── logger.js
│   └── app.js                   # Express app
├── .env                         # Variables d'environnement
├── server.js                    # Point d'entrée
└── package.json
```

---

## 🗄️ PARTIE 3: MODÈLES MONGOOSE

### 3.1 - User (Authentification)
```javascript
// src/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'staff'], default: 'staff' },
  createdAt: { type: Date, default: Date.now }
});

// Hash password avant sauvegarde
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Méthode de vérification
userSchema.methods.comparePassword = async function(pass) {
  return await bcrypt.compare(pass, this.password);
};

module.exports = mongoose.model('User', userSchema);
```

### 3.2 - Room (Chambres)
```javascript
// src/models/Room.js
const roomSchema = new mongoose.Schema({
  roomNumber: { type: String, required: true, unique: true },
  type: {
    type: String,
    enum: ['Standard', 'Individuelle', 'Commune', 'VIP', 'Réanimation', 'Pédiatrie', 'Urgence'],
    required: true
  },
  isOccupied: { type: Boolean, default: false },
  occupiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Room', roomSchema);
```

### 3.3 - Insurance (PEC - Prise en Charge)
```javascript
// src/models/Insurance.js
const insuranceSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  insuranceType: {
    type: String,
    enum: ['AMU', 'INAM', 'ASCOMA', 'GRAS SAVOYE', 'SALAM', 'OLEA', 'GTA', 'TRANSVIE', 'SUNU CLASSIQUE', 'SUNU BUDGET'],
    required: true
  },
  pecs: [{
    dateDebut: { type: Date, required: true },
    dateFin: { type: Date, required: true },
    prixReel: { type: Number, required: true },
    montantPEC: { type: Number, required: true },
    statut: {
      type: String,
      enum: ['En attente', 'Accordée', 'Refusée'],
      default: 'En attente'
    },
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Insurance', insuranceSchema);
```

### 3.4 - Patient (Patients)
```javascript
// src/models/Patient.js
const patientSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  prenom: { type: String },
  telephone: String,
  email: String,
  
  // Admission
  chambre: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  typeChambre: { type: String, required: true }, // Denormalisé pour perf
  dateAdmission: { type: Date, required: true },
  
  // Assurance
  statut: {
    type: String,
    enum: ['Non Assuré', 'Assuré'],
    default: 'Non Assuré'
  },
  insurance: { type: mongoose.Schema.Types.ObjectId, ref: 'Insurance' },
  
  // Sortie
  dateSortie: { type: Date, default: null },
  typeSortie: { type: String, enum: ['Exéat', 'Décès'], default: null },
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Patient', patientSchema);
```

### 3.5 - Payment (Paiements)
```javascript
// src/models/Payment.js
const paymentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  date: { type: Date, required: true },
  
  // Calculs
  montantCalcule: { type: Number, required: true },
  montantReel: { type: Number, default: null }, // Si modifié manuellement
  
  // Status
  paye: { type: Boolean, default: false },
  datePayment: { type: Date, default: null },
  
  // PEC actif ce jour-là
  pecActive: {
    prixReel: Number,
    montantPEC: Number
  },
  
  // Audit
  modifie: { type: Boolean, default: false },
  modifiePar: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dateModification: Date,
  
  createdAt: { type: Date, default: Date.now }
});

// Index pour recherche rapide
paymentSchema.index({ patient: 1, date: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
```

### 3.6 - History (Historique/Audit)
```javascript
// src/models/History.js
const historySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Admission', 'Sortie', 'Modification', 'Paiement', 'Login', 'PEC'],
    required: true
  },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  description: String,
  details: mongoose.Schema.Types.Mixed, // Données complètes de l'événement
  ipAddress: String,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('History', historySchema);
```

---

## 🔧 PARTIE 4: API REST - ROUTES PRINCIPALES

### 4.1 - Auth Routes
```javascript
// src/routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (await User.findOne({ email })) {
      return res.status(400).json({ error: 'Email existe déjà' });
    }
    
    const user = new User({ username, email, password });
    await user.save();
    
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.status(201).json({ token, user: { id: user._id, username, email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Credentials invalides' });
    }
    
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({ token, user: { id: user._id, username: user.username, email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

### 4.2 - Patients Routes
```javascript
// src/routes/patients.js
const express = require('express');
const Patient = require('../models/Patient');
const Room = require('../models/Room');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// GET ALL PATIENTS (actifs)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const patients = await Patient.find({ dateSortie: null })
      .populate('chambre')
      .populate('insurance');
    res.json(patients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE PATIENT (Admission)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { nom, prenom, chambreId, dateAdmission, statut, insuranceType } = req.body;
    
    // Vérifier chambre dispo
    const room = await Room.findById(chambreId);
    if (!room || room.isOccupied) {
      return res.status(400).json({ error: 'Chambre non disponible' });
    }
    
    const patient = new Patient({
      nom, prenom, chambre: chambreId,
      typeChambre: room.type,
      dateAdmission: new Date(dateAdmission),
      statut
    });
    
    await patient.save();
    
    // Marquer chambre occupée
    room.isOccupied = true;
    room.occupiedBy = patient._id;
    await room.save();
    
    // Générer les paiements pour cette admission
    await generatePaymentsForPatient(patient);
    
    res.status(201).json(patient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET PATIENT BY ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id)
      .populate('chambre')
      .populate('insurance');
    if (!patient) return res.status(404).json({ error: 'Patient non trouvé' });
    res.json(patient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE PATIENT
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate('chambre').populate('insurance');
    res.json(patient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// EXIT PATIENT
router.post('/:id/exit', authMiddleware, async (req, res) => {
  try {
    const { typeSortie, dateSortie } = req.body;
    const patient = await Patient.findById(req.params.id);
    
    if (!patient) return res.status(404).json({ error: 'Patient non trouvé' });
    
    patient.dateSortie = new Date(dateSortie);
    patient.typeSortie = typeSortie;
    await patient.save();
    
    // Libérer la chambre
    const room = await Room.findById(patient.chambre);
    room.isOccupied = false;
    room.occupiedBy = null;
    await room.save();
    
    res.json({ message: 'Patient sortie enregistrée', patient });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

### 4.3 - Payments Routes
```javascript
// src/routes/payments.js
const express = require('express');
const Payment = require('../models/Payment');
const Patient = require('../models/Patient');
const { authMiddleware } = require('../middleware/auth');
const { calculatePayment } = require('../utils/calculations');
const router = express.Router();

// GET PAYMENTS FOR PATIENT
router.get('/patient/:patientId', authMiddleware, async (req, res) => {
  try {
    const payments = await Payment.find({ patient: req.params.patientId })
      .sort({ date: 1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MARK PAYMENT AS PAID
router.put('/:paymentId/mark-paid', authMiddleware, async (req, res) => {
  try {
    const payment = await Payment.findByIdAndUpdate(
      req.params.paymentId,
      { paye: true, datePayment: new Date() },
      { new: true }
    );
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// EDIT PAYMENT AMOUNT (Admin only)
router.put('/:paymentId/edit-amount', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Permission refusée' });
    }
    
    const { montantReel } = req.body;
    const payment = await Payment.findByIdAndUpdate(
      req.params.paymentId,
      {
        montantReel,
        modifie: true,
        modifiePar: req.user.userId,
        dateModification: new Date()
      },
      { new: true }
    );
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET PAYMENTS SUMMARY
router.get('/summary/dashboard', authMiddleware, async (req, res) => {
  try {
    const total = await Payment.aggregate([
      { $group: {
        _id: null,
        totalMontant: { $sum: '$montantCalcule' },
        totalPaye: { $sum: { $cond: ['$paye', '$montantCalcule', 0] } },
        totalNonPaye: { $sum: { $cond: ['$paye', 0, '$montantCalcule'] } }
      }}
    ]);
    res.json(total[0] || { totalMontant: 0, totalPaye: 0, totalNonPaye: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

---

## 🔐 PARTIE 5: AUTHENTIFICATION JWT

### 5.1 - Middleware Auth
```javascript
// src/middleware/auth.js
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Token manquant' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token invalide' });
  }
};

module.exports = { authMiddleware };
```

---

## 📊 PARTIE 6: CALCULS CRITIQUES

```javascript
// src/utils/calculations.js

// Nombre de NUITÉES entre deux dates
function countNights(dateAdmission, dateEnd = new Date()) {
  const admission = new Date(dateAdmission);
  const end = new Date(dateEnd);
  
  // Pas de facture le jour d'admission
  admission.setDate(admission.getDate() + 1);
  
  const diffMs = end - admission;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  return diffDays < 0 ? 0 : diffDays;
}

// TARIFS NON ASSURÉS
const TARIFS = {
  'Standard': 10000,
  'Individuelle': 23000,
  'Commune': 8000,
  'VIP': 35000,
  'Réanimation': 100000,
  'Pédiatrie': 12000,
  'Urgence': 15000
};

// Calcul du tarif pour un jour donné
function calculatePaymentForDay(patient, date, insurance) {
  // Réanimation = jamais assurée
  if (patient.typeChambre === 'Réanimation') {
    return TARIFS['Réanimation'];
  }
  
  // Non assuré
  if (patient.statut === 'Non Assuré' || !insurance) {
    return TARIFS[patient.typeChambre] || TARIFS['Standard'];
  }
  
  // Assuré: vérifier PEC active
  const pecActive = insurance.pecs.find(pec => {
    const debut = new Date(pec.dateDebut);
    const fin = new Date(pec.dateFin);
    const checkDate = new Date(date);
    return checkDate >= debut && checkDate <= fin && pec.statut === 'Accordée';
  });
  
  if (!pecActive) {
    // Pas de PEC active = basculer auto en non assuré
    return TARIFS[patient.typeChambre] || TARIFS['Standard'];
  }
  
  // PEC active = patient paie la différence
  const montantPatient = pecActive.prixReel - pecActive.montantPEC;
  return montantPatient < 0 ? 0 : montantPatient;
}

module.exports = {
  countNights,
  TARIFS,
  calculatePaymentForDay
};
```

---

## 🚀 PARTIE 7: CONFIGURATION ET LANCEMENT

### .env
```
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/hospital
JWT_SECRET=your-super-secret-key-change-this
PORT=5000
NODE_ENV=development
```

### server.js
```javascript
const app = require('./src/app');
const mongoose = require('mongoose');

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connecté');
    app.listen(PORT, () => {
      console.log(`🚀 Serveur lancé sur port ${PORT}`);
    });
  })
  .catch(err => console.error('MongoDB erreur:', err));
```

### app.js
```javascript
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/insurance', require('./routes/insurance'));
app.use('/api/history', require('./routes/history'));

module.exports = app;
```

### package.json (scripts)
```json
{
  "scripts": {
    "dev": "nodemon server.js",
    "start": "node server.js",
    "test": "jest"
  }
}
```

---

## ▶️ LANCER LE SERVEUR

```bash
# Développement (auto-reload)
npm run dev

# Production
npm start
```

**Résultat attendu:**
```
✅ MongoDB connecté
🚀 Serveur lancé sur port 5000
```

---

## 📝 PROCHAINES ÉTAPES

1. **Migrer le Frontend** → Remplacer localStorage par appels API
2. **Ajouter Validation** → Joi pour tous les inputs
3. **Logging complet** → Winston/Pino
4. **Tests** → Jest pour tous les calculs
5. **Déploiement** → Docker + Railway/Heroku

