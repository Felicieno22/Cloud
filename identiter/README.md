# Identiter - Système d'Authentification Sécurisé

Identiter est une API d'authentification robuste construite avec Spring Boot et PostgreSQL. Elle fournit des mécanismes d'authentification sécurisés et efficaces pour vos applications, incluant l'authentification à deux facteurs et la gestion des sessions.

## Table des matières

- [Fonctionnalités](#fonctionnalités)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Configuration](#configuration)
- [Utilisation](#utilisation)
- [Documentation API](#documentation-api)
- [Sécurité](#sécurité)
- [Contribution](#contribution)
- [Licence](#licence)

## Fonctionnalités

### Authentification
- Inscription avec vérification d'email
- Connexion sécurisée avec 2FA
- Gestion des sessions avec expiration automatique
- Verrouillage de compte après tentatives échouées

### Sécurité
- Hachage des mots de passe avec BCrypt
- Protection contre les attaques par force brute
- Tokens de session sécurisés
- Validation des données entrantes

### Gestion des utilisateurs
- CRUD complet des utilisateurs
- Gestion des rôles et permissions
- Récupération de mot de passe
- Historique des connexions

## Prérequis

- Java 17 ou supérieur
- PostgreSQL 12 ou supérieur
- Maven 3.6 ou supérieur
- Serveur SMTP pour l'envoi d'emails

## Installation

1. **Cloner le dépôt**
```bash
git clone https://github.com/feliceno22/identiter.git
cd identiter