# ⚡ SmartTask — Plateforme DevOps complète

> Application de gestion de tâches collaborative avec chatbot IA intégré.
> Stack : Angular 17 · Node.js 20 · MongoDB · Docker · Kubernetes · Jenkins · Prometheus/Grafana

---

## 🏗️ Architecture

```
smarttask/
├── backend/                  # Node.js 20 + Express + MongoDB
│   ├── src/
│   │   ├── config/           # DB, Logger, Swagger
│   │   ├── controllers/      # auth, task, project, chat
│   │   ├── middleware/        # JWT auth
│   │   ├── models/           # User, Project, Task
│   │   └── routes/           # REST API routes
│   ├── tests/                # Jest + Supertest
│   └── Dockerfile
├── frontend/                 # Angular 17 standalone
│   ├── src/app/
│   │   ├── core/             # services, guards, interceptors, models
│   │   └── features/         # auth, dashboard, tasks, projects, chat
│   ├── nginx.conf
│   └── Dockerfile
├── k8s/                      # Kubernetes manifests
│   ├── deployment.yaml
│   └── mongodb.yaml
├── monitoring/               # Prometheus + Grafana + Loki
│   ├── prometheus.yml
│   └── alert_rules.yml
├── docker-compose.yml        # Stack principale
├── docker-compose.monitoring.yml
├── Jenkinsfile               # CI/CD pipeline
└── sonar-project.properties  # SonarQube
```

---

## 🚀 Démarrage rapide

### Prérequis
- Docker & Docker Compose
- Node.js 20+
- Angular CLI 17+

### 1. Cloner et configurer
```bash
git clone https://github.com/votre-org/smarttask.git
cd smarttask

# Backend
cp backend/.env.example backend/.env
# Éditez backend/.env avec vos valeurs

# Frontend
cp frontend/src/environments/environment.ts.example ...
```

### 2. Lancer avec Docker Compose
```bash
# Stack principale (+ Mongo Express en dev)
docker-compose --profile dev up -d

# Stack monitoring
docker-compose -f docker-compose.monitoring.yml up -d
```

### 3. Développement local
```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (autre terminal)
cd frontend && npm install && ng serve
```

---

## 📡 API Endpoints

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | /api/auth/register | Inscription |
| POST | /api/auth/login | Connexion |
| GET | /api/auth/me | Profil courant |
| GET | /api/projects | Liste projets |
| POST | /api/projects | Créer projet |
| GET | /api/tasks | Liste tâches (filtrable) |
| POST | /api/tasks | Créer tâche |
| PATCH | /api/tasks/:id/status | Changer statut |
| GET | /api/tasks/stats | Statistiques |
| POST | /api/chat/message | SmartBot |

📖 Swagger UI : http://localhost:3000/api-docs

---

## 🧪 Tests

```bash
# Backend
cd backend && npm test          # Jest + Supertest
npm run test -- --coverage      # Avec couverture

# Frontend
cd frontend && ng test          # Karma + Jasmine
ng test --watch=false --code-coverage
```

---

## 🔄 CI/CD Jenkins

Le pipeline Jenkins inclut :
1. **Checkout** — Clone du repo
2. **Install** — npm ci (parallel)
3. **Lint** — ESLint / Angular lint
4. **Test** — Jest + Karma avec rapports
5. **SonarQube** — Analyse qualité + Quality Gate
6. **Build Docker** — Images multi-stage
7. **Push Registry** — DockerHub
8. **Deploy Staging** — Auto sur `develop`
9. **Deploy Production** — Manuel avec approbation sur `main`

---

## ☸️ Kubernetes

```bash
# Déployer
kubectl apply -f k8s/mongodb.yaml
kubectl apply -f k8s/deployment.yaml

# Vérifier
kubectl get pods -n smarttask
kubectl get services -n smarttask
kubectl get ingress -n smarttask

# Logs
kubectl logs -f deployment/backend -n smarttask
```

---

## 📊 Monitoring

| Service | URL | Identifiants |
|---------|-----|-------------|
| Prometheus | http://localhost:9090 | — |
| Grafana | http://localhost:3001 | admin / admin |
| Loki | http://localhost:3100 | — |
| Mongo Express | http://localhost:8081 | — |

---

## 🤖 SmartBot

Le chatbot utilise OpenAI GPT-4o-mini avec accès contextuel aux tâches de l'utilisateur.

**Exemples de questions :**
- *"Quelles tâches sont en retard ?"*
- *"Résume mes tâches du jour"*
- *"Montre mes tâches urgentes"*
- *"Bilan de mes projets"*

**Mode sans clé API :** Réponses automatiques basées sur des règles.

---

## 🌿 Git Flow

```
main          → Production (déploiement manuel)
develop       → Intégration (déploiement auto staging)
feature/*     → Nouvelles fonctionnalités
hotfix/*      → Corrections urgentes
release/*     → Préparation de release
```

---

## 📋 Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `MONGODB_URI` | URI MongoDB | `mongodb://localhost:27017/smarttask` |
| `JWT_SECRET` | Clé secrète JWT | — (obligatoire) |
| `JWT_EXPIRES_IN` | Durée token | `7d` |
| `OPENAI_API_KEY` | Clé OpenAI | Optionnel |
| `PORT` | Port backend | `3000` |
| `NODE_ENV` | Environnement | `development` |
