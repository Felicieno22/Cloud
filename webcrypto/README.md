# API Documentation Swagger

http://localhost:8080/swagger-ui/index.html

# Plateforme de Trading de Cryptomonnaies

Cette plateforme permet l'achat et la vente de cryptomonnaies avec les fonctionnalités suivantes :
- Authentification via @[identiter]
- Gestion de portefeuille de cryptomonnaies
- Gestion des fonds (dépôt/retrait)
- Cours en temps réel des cryptomonnaies

## Prérequis

- Node.js v14+
- PostgreSQL
- Base de données créée avec le script SQL fourni

## Structure du projet

- `/backend` : Serveur Node.js
- `/frontend` : Application Vue.js
- `/identiter` : Service d'authentification
- `/sql` : Scripts de base de données

## Installation

1. Backend :
```bash
cd backend
npm install
cp .env.example .env  # Configurer les variables d'environnement
npm run dev
```

2. Frontend :
```bash
cd frontend
npm install
npm run serve
```

3. Service d'authentification (@[identiter]) :
Suivre les instructions dans le dossier `identiter`

## Ports utilisés

- Frontend : 8080
- Backend : 3000
- Service d'authentification : 8081

## Fonctionnalités

1. **Authentification**
   - Connexion via @[identiter]
   - Inscription avec validation par email

2. **Trading**
   - Visualisation des cours en temps réel
   - Achat/vente de cryptomonnaies
   - Historique des transactions

3. **Portefeuille**
   - Vue d'ensemble des actifs
   - Gestion des fonds
   - Historique des opérations

## Sécurité

- Authentification via JWT
- Validation par email pour les opérations sensibles
- Protection contre les attaques CSRF
- Rate limiting sur les API
