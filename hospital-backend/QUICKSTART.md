# 🚀 DÉMARRAGE RAPIDE - 5 MINUTES

## Installation

```bash
cd hospital-backend
npm install
```

## Configuration

Créer `hospital-backend/.env`:
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/hospital-elyon?retryWrites=true&w=majority
JWT_SECRET=your-secret-key-here
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost,file://
```

## Lancer le serveur

```bash
npm run dev
```

Puis ouvrir: **http://localhost:5000/health**

---

## Utiliser l'API

### Via cURL

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hospital.local","password":"admin123"}' \
  | jq -r '.data.token')

# 2. Créer chambre
curl -X POST http://localhost:5000/api/rooms \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"roomNumber":"101","type":"Standard"}'

# 3. Lister patients
curl http://localhost:5000/api/patients \
  -H "Authorization: Bearer $TOKEN"
```

### Via Postman

1. Importer `Postman_Collection.json`
2. Définir la variable `token` après login
3. Tester les endpoints

---

## Intégrer le Frontend

**Dans `hospital/index.html`, ajouter:**

```html
<script>
  const API_URL = 'http://localhost:5000/api';
  let AUTH_TOKEN = localStorage.getItem('auth_token');

  async function apiCall(endpoint, method = 'GET', body = null) {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (AUTH_TOKEN) options.headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
    if (body) options.body = JSON.stringify(body);
    return fetch(`${API_URL}${endpoint}`, options).then(r => r.json());
  }
</script>
```

Puis remplacer localStorage par `apiCall()`.

---

## Déployer sur Vercel

```bash
npm install -g vercel
vercel login
vercel --prod
```

Ajouter variables d'env sur Vercel Dashboard et update frontend URL.

---

**🎉 Backend prêt à l'emploi!**
