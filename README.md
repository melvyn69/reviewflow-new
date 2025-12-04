
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

## 🌍 Guide de Mise en Production (Obligatoire)

Pour que l'application fonctionne réellement (stockage des avis, authentification), suivez ces étapes :

### 1. Configuration Supabase (Base de Données)

1. Créez un projet sur [Supabase](https://supabase.com).
2. Allez dans l'onglet **SQL Editor**.
3. Ouvrez le fichier `supabase/schema.sql` de ce projet, copiez tout le contenu.
4. Collez-le dans l'éditeur SQL de Supabase et cliquez sur **Run**.
   *Cela va créer les tables, la sécurité RLS et les triggers.*

### 2. Variables d'Environnement

Créez un fichier `.env` à la racine (ou configurez Vercel) avec :

```env
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_cle_anon_supabase
VITE_API_KEY=votre_cle_google_gemini_ai
VITE_STRIPE_PUBLIC_KEY=votre_cle_publique_stripe
```

### 3. Configuration Auth (Google)

1. Dans Supabase > Authentication > Providers, activez **Google**.
2. Créez un projet sur [Google Cloud Console](https://console.cloud.google.com).
3. Configurez les ID OAuth et ajoutez l'URL de votre site en "Redirect URI".
4. Copiez les Client ID/Secret dans Supabase.

### 4. Automatisation (Edge Functions)

Pour que l'IA réponde la nuit (24/7) :

1. Installez le CLI Supabase.
2. Déployez la fonction : `supabase functions deploy process_reviews`.
3. Ajoutez votre clé Gemini : `supabase secrets set API_KEY=votre_cle_api`.

## 📝 Notes pour le développeur

- Le fichier `lib/api.ts` contient toute la logique métier.
- L'application bascule automatiquement en "Mode Démo" si Supabase n'est pas configuré.
- Pour tester le paiement, utilisez les cartes de test Stripe (4242 4242...).

---
© 2025 Reviewflow.
