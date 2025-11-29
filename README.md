
# Reviewflow - SaaS Gestion d'Avis Clients

Une application complète pour centraliser, analyser et automatiser la gestion des avis clients (Google, Facebook, etc.) grâce à l'IA.

## 🚀 Fonctionnalités Clés

- **Boîte de Réception Unifiée** : Tous les avis au même endroit.
- **Réponses IA (Gemini)** : Génération automatique de réponses personnalisées.
- **Automatisation** : Règles conditionnelles (ex: Répondre auto aux 5 étoiles).
- **Collecte** : QR Codes, Affiches PDF et Entonnoir de satisfaction.
- **Analyses** : Sentiment, Mots-clés, Veille Concurrentielle.
- **Rapports** : PDF professionnels.

## 🛠️ Stack Technique

- **Frontend** : React 18, Tailwind CSS, Lucide Icons, Recharts.
- **Backend** : Supabase (Auth, Database, Edge Functions).
- **IA** : Google Gemini API (via `@google/genai`).
- **Outils** : jsPDF (Rapports), qrcode.react (QR Codes).

## 🌍 Guide de Déploiement (Production)

Pour mettre cette application en ligne et la vendre à vos clients :

### 1. Configuration Supabase (Backend)

1. Créez un projet sur [Supabase](https://supabase.com).
2. Allez dans **SQL Editor** et exécutez le script contenu dans `supabase/schema.sql`.
3. Allez dans **Project Settings > API** et récupérez l'URL et la clé ANON.
4. Mettez à jour `lib/supabase.ts` avec ces clés (si ce n'est pas déjà fait).

### 2. Configuration Google Auth

1. Allez dans la console [Google Cloud](https://console.cloud.google.com).
2. Créez un projet et configurez l'écran de consentement OAuth (External).
3. Créez des identifiants **OAuth Client ID** (Web App).
4. Ajoutez l'URL de votre site (ex: `https://mon-app.vercel.app`) dans "Authorized redirect URIs".
5. Copiez le Client ID et le Secret dans Supabase (**Auth > Providers > Google**).

### 3. Déploiement Vercel (Hébergement)

1. Créez un compte sur [Vercel](https://vercel.com).
2. Importez votre dépôt GitHub (contenant ce code).
3. Vercel détectera automatiquement que c'est du React (Vite).
4. Cliquez sur **Deploy**.

### 4. Automatisation (Edge Functions)

Pour que l'IA réponde la nuit (24/7) :

1. Installez le CLI Supabase.
2. Déployez la fonction : `supabase functions deploy process_reviews`.
3. Ajoutez votre clé Gemini : `supabase secrets set API_KEY=votre_cle_api`.
4. Le script `supabase/config.toml` s'occupera de la planification (Cron).

## 📝 Notes pour le développeur

- Le fichier `lib/api.ts` contient toute la logique métier.
- Le mode "Démo" est activé par défaut si Supabase n'est pas connecté.
- Pour tester le paiement, utilisez les cartes de test Stripe (4242 4242...).

---
© 2025 Reviewflow.
