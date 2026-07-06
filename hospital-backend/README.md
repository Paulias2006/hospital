# 🏥 Hôpital EL-ELYON - Backend Professionnel

Backend Node.js/Express complètement opérationnel pour le système de gestion hospitalière **EL-ELYON**.

## 🚀 Démarrage Rapide

### Installation

```bash
cd hospital-backend
npm install
```

### Configuration

Copier `.env.example` vers `.env` et configurer:

```bash
cp .env.example .env
```

### Lancer le serveur

**Développement** (avec auto-reload):
```bash
npm run dev
```

**Production**:
```bash
npm start
```

Le serveur démarrera sur `http://localhost:5000`

---

## 📋 Fonctionnalités Implémentées

### ✅ Authentification & Sécurité
- [x] Inscription utilisateur
- [x] Connexion JWT
- [x] Hachage des mots de passe (bcrypt)
- [x] Tokens expirant automatiquement
- [x] Rôles (admin/staff)
- [x] Middleware d'authentification

### ✅ Gestion des Patients
- [x] Admission de patients
- [x] Modification des données
- [x] Sortie (Exéat/Décès)
- [x] Liste des patients actifs/historique

### ✅ Gestion des Chambres
- [x] CRUD complet
- [x] Statut d'occupation
- [x] Types de chambres (7 types)
- [x] Disponibilité

### ✅ Système de Paiements
- [x] Génération automatique des paiements
- [x] Calcul des nuitées (sans jour admission)
- [x] Tarifs configurables par type
- [x] Prise en charge automatique (PEC)
- [x] Modification manuelle des montants
- [x] Statuts (Payé/Non payé)

### ✅ Gestion des Assurances (PEC)
- [x] 10 types d'assurances
- [x] Tranches configurables
- [x] Statuts (En attente/Accordée/Refusée)
- [x] Basculement automatique si PEC terminée
- [x] Sync avec les paiements

### ✅ Tableau de Bord
- [x] Statistiques en temps réel
- [x] Taux d'occupation
- [x] Résumé paiements
- [x] Rapports

### ✅ Historique & Audit
- [x] Logs complets des actions
- [x] Traçabilité par utilisateur
- [x] Traçabilité par patient
- [x] Statistiques d'activité

---

## 🔌 API REST - Endpoints

### Authentication
```
POST   /api/auth/register       Créer un compte
POST   /api/auth/login          Se connecter
GET    /api/auth/me             Infos utilisateur
```

### Patients
```
GET    /api/patients            Lister patients actifs
GET    /api/patients/:id        Détails patient
POST   /api/patients            Admettre patient
PUT    /api/patients/:id        Modifier patient
POST   /api/patients/:id/exit   Enregistrer sortie
```

### Chambres
```
GET    /api/rooms               Lister chambres
GET    /api/rooms/:id           Détails chambre
POST   /api/rooms               Créer chambre
PUT    /api/rooms/:id           Modifier chambre
DELETE /api/rooms/:id           Supprimer chambre
GET    /api/rooms/stats/available  Stats occupation
```

### Paiements
```
GET    /api/payments/patient/:id              Paiements d'un patient
GET    /api/payments/:id                      Détails paiement
PUT    /api/payments/:id/mark-paid            Marquer payé
PUT    /api/payments/:id/mark-unpaid          Marquer non payé
PUT    /api/payments/:id/edit-amount          Modifier montant
GET    /api/payments/summary/dashboard        Résumé
GET    /api/payments/export/csv               Export CSV
```

### Assurances (PEC)
```
GET    /api/insurance/:patientId      Assurance patient
POST   /api/insurance/:patientId      Créer/Mettre à jour
PUT    /api/insurance/:insuranceId    Modifier
GET    /api/insurance/list/all        Toutes les assurances
```

### Historique
```
GET    /api/history                   Tout l'historique
GET    /api/history/patient/:id       Historique patient
GET    /api/history/user/:id          Historique utilisateur
GET    /api/history/stats/activity    Statistiques
```

### Dashboard
```
GET    /api/dashboard                 Données dashboard
GET    /api/dashboard/report          Rapport complet
```

---

## 🔐 Authentification

### 1. S'enregistrer
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@hospital.local",
    "password": "admin123"
  }'
```

### 2. Se connecter
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@hospital.local",
    "password": "admin123"
  }'
```

Réponse:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "_id": "...",
      "username": "admin",
      "email": "admin@hospital.local",
      "role": "admin"
    }
  }
}
```

### 3. Utiliser le token
```bash
curl http://localhost:5000/api/patients \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

## 🧮 Calculs Critiques

### Nuitées
- **Jour admission ≠ facturé**
- Facture commence le lendemain
- Exemple: Admission 01/07, fin 06/07 = 5 nuitées

### Réanimation
- **JAMAIS d'assurance**
- Tarif fixe: 100 000 F/nuit
- Pas de PEC possible

### PEC (Prise en Charge)
- **Montant patient** = Prix réel - Montant PEC
- Si PEC terminée → basculement auto en tarif non assuré
- Synchronise automatiquement avec les paiements

### Tarifs
```
Standard:      10 000 F/nuit
Individuelle:  23 000 F/nuit
Commune:        8 000 F/nuit
VIP:           35 000 F/nuit
Réanimation:  100 000 F/nuit
Pédiatrie:     12 000 F/nuit
Urgence:       15 000 F/nuit
```

---

## 🏗️ Structure du Projet

```
hospital-backend/
├── src/
│   ├── config/
│   │   ├── database.js        # Connexion MongoDB
│   │   └── logger.js          # Logging
│   ├── models/                # Mongoose models
│   │   ├── User.js
│   │   ├── Patient.js
│   │   ├── Room.js
│   │   ├── Insurance.js
│   │   ├── Payment.js
│   │   └── History.js
│   ├── routes/                # Endpoints API
│   │   ├── auth.js
│   │   ├── patients.js
│   │   ├── rooms.js
│   │   ├── payments.js
│   │   ├── insurance.js
│   │   ├── history.js
│   │   └── dashboard.js
│   ├── middleware/            # Middlewares
│   │   ├── auth.js           # JWT & auth
│   │   ├── errorHandler.js   # Error handling
│   │   └── logging.js        # Request logging
│   ├── utils/                 # Utilitaires
│   │   ├── calculations.js   # Tarifs, nuitées
│   │   └── validators.js     # Validation Joi
│   └── app.js                # Express app
├── server.js                 # Point d'entrée
├── package.json
├── .env
├── .gitignore
├── vercel.json               # Config Vercel
└── README.md
```

---

## 📊 Technos Utilisées

- **Node.js** v16+
- **Express.js** v4.18
- **MongoDB** + Mongoose
- **JWT** - Authentification
- **bcryptjs** - Hash passwords
- **Joi** - Validation
- **Helmet** - Sécurité
- **Pino** - Logging
- **Express Rate Limit** - Rate limiting

---

## 🔒 Sécurité

- ✅ Passwords hachés (bcrypt)
- ✅ JWT tokens avec expiration
- ✅ Rôles et permissions (admin/staff)
- ✅ Validation des inputs (Joi)
- ✅ CORS configuré
- ✅ Helmet pour headers de sécurité
- ✅ Rate limiting
- ✅ Audit trail complet

---

## 🚀 Déploiement sur Vercel

### 1. Préparation

```bash
# Login Vercel
npm install -g vercel
vercel login

# À la racine du projet
vercel
```

### 2. Configuration Vercel

Créer `vercel.json`:
```json
{
  "buildCommand": "npm install",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/server.js" }
  ]
}
```

### 3. Variables d'environnement

Définir dans Vercel Dashboard:
```
MONGODB_URI
JWT_SECRET
NODE_ENV=production
```

### 4. Déployer

```bash
vercel deploy --prod
```

---

## 🧪 Tester l'API

### Avec Postman
1. Importer la collection API
2. S'enregistrer/connecter
3. Copier le token
4. L'ajouter à l'onglet "Authorization"

### Avec cURL
```bash
# Login
TOKEN=$(curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hospital.local","password":"admin123"}' \
  | jq -r '.data.token')

# Utiliser le token
curl http://localhost:5000/api/patients \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📝 Logs & Monitoring

Les logs sont affichés dans le terminal (développement) ou en JSON (production).

Accéder aux logs sur Vercel:
```bash
vercel logs hospital-backend
```

---

## 🐛 Dépannage

### MongoDB ne se connecte pas
- Vérifier la chaîne de connexion dans `.env`
- Vérifier que le cluster MongoDB Atlas est actif
- Vérifier les adresses IP whitelist

### Erreur CORS
- Vérifier `CORS_ORIGIN` dans `.env`
- Ajouter le domaine frontend

### Token expiré
- Authentifier à nouveau
- Augmenter `JWT_EXPIRE` si nécessaire

---

## 📞 Support

Pour toute question, consulter:
- Logs du serveur
- Console Dev Tools du frontend
- Documentation MongoDB: https://docs.mongodb.com
- Documentation Express: https://expressjs.com

---

**Créé pour le Projet EL-ELYON - 2024**
