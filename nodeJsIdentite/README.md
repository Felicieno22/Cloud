# Plateforme d'Échange de Cryptomonnaies

Une plateforme d'échange de cryptomonnaies complète avec authentification des utilisateurs, gestion de portefeuille, et fonctionnalités de dépôt/retrait.

## 🚀 Fonctionnalités

- 👤 Authentification des utilisateurs
- ✉️ Vérification par email
- 💰 Gestion de portefeuille
- 💸 Dépôt et retrait de fonds
- 📊 Suivi des transactions
- 🔒 Sécurité renforcée

## 🛠️ Technologies Utilisées

- Node.js
- Express.js
- PostgreSQL
- EJS (templating)
- Bootstrap 5
- Docker
- Nodemailer

## 📋 Prérequis

- Docker et Docker Compose
- Node.js (pour le développement local)
- PostgreSQL (pour le développement local)
- Un compte Gmail (pour l'envoi d'emails)

## ⚙️ Installation

1. Clonez le dépôt :
```bash
git clone [URL_DU_REPO]
cd nodeJsIdentite
```

2. Configuration des variables d'environnement :
   Créez un fichier `.env` à la racine du projet :
```env
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=PostgresCedy
DB_NAME=crypto
EMAIL_USER=votre_email@gmail.com
EMAIL_PASSWORD=votre_mot_de_passe_application
```

3. Démarrage avec Docker :
```bash
docker-compose up --build
```

## 🧪 Tests Utilisateurs

### 1. Création de Compte
1. Accédez à `http://localhost:3000/register`
2. Remplissez le formulaire avec :
   - Email : test@example.com
   - Mot de passe : Test123!
3. Vérifiez votre email pour le code de vérification
4. Entrez le code de vérification

### 2. Connexion
1. Accédez à `http://localhost:3000/login`
2. Connectez-vous avec :
   - Email : test@example.com
   - Mot de passe : Test123!

### 3. Test du Portefeuille
1. Après connexion, accédez à "Mon Portefeuille"
2. Testez un dépôt :
   - Cliquez sur "Dépôt"
   - Entrez un montant (ex: 1000€)
   - Vérifiez que le solde est mis à jour
3. Testez un retrait :
   - Cliquez sur "Retrait"
   - Entrez un montant inférieur à votre solde
   - Vérifiez que le solde est mis à jour

### 4. Scénarios de Test

#### Test de Dépôt
```
✅ Dépôt de 1000€ -> Solde attendu : 1000€
✅ Dépôt de 0.01€ -> Montant minimum accepté
❌ Dépôt de -100€ -> Erreur attendue
❌ Dépôt de 0€ -> Erreur attendue
```

#### Test de Retrait
```
✅ Retrait de 100€ avec solde de 1000€ -> Solde attendu : 900€
❌ Retrait de 2000€ avec solde de 1000€ -> Erreur "Solde insuffisant"
❌ Retrait de -100€ -> Erreur attendue
❌ Retrait de 0€ -> Erreur attendue
```

## 🔧 Développement Local

1. Installez les dépendances :
```bash
npm install
```

2. Démarrez PostgreSQL localement

3. Initialisez la base de données :
```bash
psql -U postgres -d crypto -f database/init.sql
```

4. Démarrez l'application :
```bash
npm start
```

## 📝 API Endpoints

- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `POST /api/auth/verify` - Vérification email
- `GET /api/wallet/balance` - Obtenir le solde
- `POST /api/wallet/deposit` - Effectuer un dépôt
- `POST /api/wallet/withdraw` - Effectuer un retrait
- `GET /api/wallet/transactions` - Historique des transactions

## 🔐 Sécurité

- Hachage des mots de passe avec bcrypt
- Protection contre les injections SQL
- Validation des données entrantes
- Sessions sécurisées
- Protection CSRF
- Variables d'environnement pour les données sensibles

## 🐛 Résolution des Problèmes Courants

1. **Erreur de connexion à la base de données**
   - Vérifiez les credentials dans le fichier `.env`
   - Assurez-vous que PostgreSQL est en cours d'exécution

2. **Erreur d'envoi d'email**
   - Vérifiez les credentials Gmail
   - Activez "Less secure app access" dans les paramètres Gmail
   - Utilisez un mot de passe d'application

3. **Les conteneurs Docker ne démarrent pas**
   - Vérifiez que les ports 3000 et 5432 sont disponibles
   - Exécutez `docker-compose down -v` puis réessayez

## 📄 Licence

MIT

## 👥 Contribution

Les contributions sont les bienvenues ! Consultez notre guide de contribution pour plus de détails.
