# ✅ PLAN D'ACTION COMPLET - TRANSFORMATION BACKEND

## 📌 RÉSUMÉ EXÉCUTIF

Vous avez un projet hospitalier **pur client-side** (HTML + localStorage).
**Objectif**: Transformer en un vrai système avec **Node.js + MongoDB + API REST**.

**Durée estimée**: 2-3 semaines pour une équipe de 1-2 développeurs.

---

## 🎯 ROADMAP DE MISE EN ŒUVRE

### PHASE 1: SETUP BACKEND (3-5 jours)

#### Tâche 1.1: Initialiser le projet Node.js
```bash
mkdir hospital-backend
cd hospital-backend
npm init -y
npm install express mongoose dotenv bcryptjs jsonwebtoken cors
npm install --save-dev nodemon
```

#### Tâche 1.2: Créer la structure de fichiers
```
hospital-backend/
├── src/
│   ├── config/database.js
│   ├── models/ (6 fichiers)
│   ├── routes/ (6 fichiers)
│   ├── middleware/auth.js
│   ├── utils/
│   └── app.js
├── .env
└── server.js
```

#### Tâche 1.3: Configurer MongoDB
- Créer compte MongoDB Atlas (gratuit)
- Créer cluster gratuit
- Obtenir connection string
- Mettre dans `.env`

#### Tâche 1.4: Implémenter les modèles Mongoose
- [ ] User (authentification)
- [ ] Room (chambres)
- [ ] Patient (patients)
- [ ] Insurance (PEC)
- [ ] Payment (paiements)
- [ ] History (audit)

#### Tâche 1.5: Authentification JWT
- [ ] Routes `/auth/register` et `/auth/login`
- [ ] Middleware d'authentification
- [ ] Gestion des tokens

---

### PHASE 2: IMPLÉMENTATION API (5-7 jours)

#### Tâche 2.1: Routes Patients
```
POST   /api/patients              → Créer (admission)
GET    /api/patients              → Lister tous
GET    /api/patients/:id          → Détails
PUT    /api/patients/:id          → Modifier
POST   /api/patients/:id/exit     → Enregistrer sortie
```

#### Tâche 2.2: Routes Chambres
```
POST   /api/rooms                 → Créer
GET    /api/rooms                 → Lister
DELETE /api/rooms/:id             → Supprimer
```

#### Tâche 2.3: Routes Paiements
```
GET    /api/payments/patient/:id  → Lister pour patient
PUT    /api/payments/:id/mark-paid → Marquer payé
PUT    /api/payments/:id/edit-amount → Modifier montant
GET    /api/payments/summary      → Statistiques
```

#### Tâche 2.4: Routes Assurances
```
POST   /api/insurance             → Créer PEC
GET    /api/insurance/:patientId  → Détails PEC
PUT    /api/insurance/:id         → Modifier PEC
```

#### Tâche 2.5: Routes Historique
```
GET    /api/history               → Tous les événements
POST   /api/history               → Enregistrer événement
```

#### Tâche 2.6: Validation & Gestion erreurs
- [ ] Joi pour validation des inputs
- [ ] Error handler middleware
- [ ] Logging (Winston/Pino)

---

### PHASE 3: MIGRATION FRONTEND (3-5 jours)

#### Tâche 3.1: Adapter l'authentification
- Remplacer mot de passe dur par JWT
- Implémenter formulaire login réel
- Stocker token dans localStorage

#### Tâche 3.2: Remplacer localStorage
- Créer `fetchAPI()` helper
- Remplacer tous les `localStorage.setItem()` par appels API
- Garder état local comme cache

#### Tâche 3.3: Adapter chaque module
- [ ] Dashboard → charger depuis API
- [ ] Admission → POST à `/api/patients`
- [ ] Paiements → GET/PUT paiements
- [ ] Assurances → PUT PEC
- [ ] Sorties → POST exit
- [ ] Historique → GET history

#### Tâche 3.4: Synchronisation
- Rafraîchir données tous les 5 minutes
- Gestion des erreurs réseau
- Offline graceful (cache local)

#### Tâche 3.5: Testing UI
- Tester toutes les fonctionnalités
- Vérifier Network tab
- Corriger bugs API/Frontend

---

### PHASE 4: TESTS & SÉCURITÉ (2-3 jours)

#### Tâche 4.1: Unit Tests
```bash
npm install --save-dev jest
# Tester les calculs: nuitées, tarifs
# Tester les validations
```

#### Tâche 4.2: Integration Tests
- Tester les routes API
- Tester la base de données

#### Tâche 4.3: Sécurité
- [ ] Validation des inputs
- [ ] SQL injection (n/a MongoDB mais injection JS)
- [ ] CORS configuré
- [ ] Passwords hachés (bcrypt)
- [ ] Rate limiting

#### Tâche 4.4: Audit & Logging
- Enregistrer toutes les actions
- Historique complet
- Logs d'erreur

---

### PHASE 5: DÉPLOIEMENT (2-3 jours)

#### Tâche 5.1: Préparation
- [ ] Créer Dockerfile
- [ ] Configurer variables d'env production
- [ ] Tester en mode production

#### Tâche 5.2: Choisir hosting
**Option gratuite:**
- Backend: Railway.app ou Heroku
- DB: MongoDB Atlas (free tier)

**Option payante:**
- Backend: AWS, Google Cloud, Azure
- DB: Managed services

#### Tâche 5.3: Déployer
```bash
# Exemple Railway
npm install -g railway
railway login
railway init
railway up
```

#### Tâche 5.4: Monitoring
- Logs en temps réel
- Alertes erreurs
- Uptime monitoring

---

## 🔧 RESSOURCES & OUTILS

### Installation requise:
- Node.js v16+
- Git
- Compte MongoDB Atlas (gratuit)
- Compte Railway/Heroku (gratuit)

### Packages essentiels:
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "mongoose": "^7.0.0",
    "dotenv": "^16.0.0",
    "bcryptjs": "^2.4.0",
    "jsonwebtoken": "^9.0.0",
    "cors": "^2.8.5",
    "joi": "^17.9.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.20",
    "jest": "^29.0.0"
  }
}
```

### Documentation:
- Express: https://expressjs.com
- Mongoose: https://mongoosejs.com
- JWT: https://jwt.io
- MongoDB: https://docs.mongodb.com

---

## 💡 POINTS CRITIQUES À RETENIR

### 1. Calculs tarifaires
```javascript
// JAMAIS facture le jour d'admission
// Commence le lendemain

// Réanimation = TOUJOURS 100k/nuit (jamais d'assurance)

// Basculement auto: Si PEC terminée → tarif non assuré
```

### 2. Paiements quotidiens
- Chaque nuitée = 1 document Payment
- Flexible (modifiable manuellement)
- Statut: Payé/Non payé
- Audit complet des modifications

### 3. Assurances/PEC
- Tranches avec dates début/fin
- Prix réel vs Montant PEC
- Statuts: En attente/Accordée/Refusée
- Synchronisation automatique avec paiements

### 4. Authentification
- Plus de mot de passe en dur
- JWT tokens avec expiration
- Roles: admin/staff
- Gestion multi-utilisateurs

---

## 📊 CHECKLIST FINALE

### Backend:
- [ ] Node.js + Express setupé
- [ ] MongoDB connecté
- [ ] 6 modèles Mongoose implémentés
- [ ] 20+ routes API testées
- [ ] JWT authentication fonctionnelle
- [ ] Calculs tarifaires implémentés
- [ ] Error handling complet
- [ ] Logging en place

### Frontend:
- [ ] Formulaire login JWT
- [ ] fetchAPI() helper créé
- [ ] Tous les modules adaptés
- [ ] Sync automatique fonctionnelle
- [ ] Gestion erreurs réseau
- [ ] Cache local OK

### Testing:
- [ ] Unit tests (calculs)
- [ ] Integration tests (API)
- [ ] Smoke tests (UI)
- [ ] Tests sécurité

### Deployment:
- [ ] Docker prêt
- [ ] Env variables configurées
- [ ] DNS configuré
- [ ] SSL/TLS en place
- [ ] Monitoring actif

---

## 🚀 COMMANDES RAPIDES

```bash
# Setup backend
npm init -y && npm install express mongoose dotenv bcryptjs jsonwebtoken cors

# Dev
npm run dev

# Production
npm start

# Deploy (si Railway)
railway up

# Tests
npm test
```

---

## 💬 PROCHAINES ÉTAPES

1. **Créer le compte MongoDB Atlas** (5 min)
2. **Initialiser Node.js** (10 min)
3. **Mettre les modèles** (2h)
4. **Implémenter les routes** (5h)
5. **Adapter le frontend** (4h)
6. **Tester complet** (3h)
7. **Déployer** (1h)

**Total: ~15-20h pour une personne expérimentée**

---

## ⚠️ PIÈGES À ÉVITER

1. ❌ Ne pas oublier les indexes MongoDB
2. ❌ Ne pas mettre les secrets en dur (utiliser .env)
3. ❌ Ne pas oublier CORS
4. ❌ Ne pas faire de requêtes sans authentification
5. ❌ Ne pas oublier de hasher les passwords
6. ❌ Ne pas oublier de valider les inputs
7. ❌ Ne pas faire de calculs complexes en JavaScript
8. ❌ Ne pas oublier l'audit/logging

---

## 🎓 RESSOURCES D'APPRENTISSAGE

- **JWT**: https://jwt.io/introduction
- **Mongoose**: https://mongoosejs.com/docs
- **Express**: https://expressjs.com/en/starter/hello-world.html
- **REST API Design**: https://restfulapi.net
- **Security**: https://owasp.org/www-project-top-ten/

