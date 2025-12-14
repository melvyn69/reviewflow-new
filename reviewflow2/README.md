
# Reviewflow - SaaS Gestion d'Avis Clients

Une application complète pour centraliser, analyser et automatiser la gestion des avis clients (Google, Facebook, etc.) grâce à l'IA.

## 🚀 Fonctionnalités Clés

- **Boîte de Réception Unifiée** : Tous les avis au même endroit.
- **Réponses IA (Gemini)** : Génération automatique de réponses personnalisées.
- **Automatisation** : Règles conditionnelles (ex: Répondre auto aux 5 étoiles).
- **Collecte** : QR Codes, Affiches PDF et Entonnoir de satisfaction.
- **Marketing** : Génération de campagnes SMS/Email par IA.
- **Rapports** : PDF professionnels.

## 🛠️ Pré-requis (Installation)

Avant de commencer, vous devez avoir **Node.js** installé sur votre machine.

1. **Vérifier Node.js** :
   ```bash
   node -v
   # Si commande introuvable : installez Node.js sur https://nodejs.org
   # Sur Mac avec Homebrew : brew install node
   ```

2. **Installer les dépendances** :
   ```bash
   npm install
   ```

3. **Lancer le serveur de développement** :
   ```bash
   npm run dev
   ```

## 🌍 Guide de Mise en Production (Supabase)

### 1. Configuration Supabase (Base de Données)

1. Créez un projet sur [Supabase](https://supabase.com).
2. Allez dans l'onglet **SQL Editor**.
3. Ouvrez le fichier `supabase/schema.sql` de ce projet, copiez tout le contenu.
4. Collez-le dans l'éditeur SQL de Supabase et cliquez sur **Run**.

### 2. Variables d'Environnement

Créez un fichier `.env` à la racine avec :

```env
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_cle_anon_supabase
VITE_API_KEY=votre_cle_google_gemini_ai
```

### 3. Déploiement des Edge Functions (Backend)

Pour activer l'IA et les connexions Google :

1. Installez Supabase CLI : `npm install -g supabase`.
2. Connectez-vous : `supabase login`.
3. Liez votre projet : `supabase link --project-ref votre-ref-projet`.
4. Déployez les fonctions :
   ```bash
   supabase functions deploy --no-verify-jwt
   ```

---
© 2025 Reviewflow.
