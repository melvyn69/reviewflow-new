
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

### 4. Déploiement des Edge Functions

Pour que le backend fonctionne :

1. Installez Supabase CLI : `npm install -g supabase`.
2. Connectez-vous : `supabase login`.
3. Liez votre projet : `supabase link --project-ref votre-ref-projet`.
4. Ajoutez vos secrets de production :
   ```bash
   supabase secrets set GOOGLE_CLIENT_ID=votre_id GOOGLE_CLIENT_SECRET=votre_secret
   supabase secrets set PROJECT_URL=https://votre-ref.supabase.co
   supabase secrets set SERVICE_ROLE=votre_cle_service_role_supabase
   ```
5. Déployez les fonctions :
   ```bash
   supabase functions deploy fetch_google_reviews --no-verify-jwt
   supabase functions deploy fetch_google_locations --no-verify-jwt
   supabase functions deploy cron_sync_reviews --no-verify-jwt
   supabase functions deploy process_reviews --no-verify-jwt
   ```

### 5. Activation de l'Automatisation (CRON)

Pour que les avis se mettent à jour automatiquement toutes les heures sans action utilisateur :

1. Allez dans le Dashboard Supabase > **SQL Editor**.
2. Créez une nouvelle requête (New Query).
3. Copiez-collez le code suivant (remplacez les valeurs `<...>` par les vôtres) :

```sql
-- 1. Active l'extension de planification
create extension if not exists pg_cron;

-- 2. Nettoyage (au cas où)
select cron.unschedule('sync-google-reviews-hourly');

-- 3. Planification du job (Toutes les heures à la minute 0)
-- REMPLACEZ <PROJECT_REF> par votre ID de projet (ex: abcdefghijklm)
-- REMPLACEZ <SERVICE_ROLE_KEY> par votre clé secrète Supabase (Settings > API > service_role)
select cron.schedule(
  'sync-google-reviews-hourly',
  '0 * * * *', 
  $$
  select
    net.http_post(
        url:='https://<PROJECT_REF>.supabase.co/functions/v1/cron_sync_reviews',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);
```
4. Cliquez sur **Run**.

## 📝 Notes pour le développeur

- Le fichier `lib/api.ts` contient toute la logique métier.
- L'application bascule automatiquement en "Mode Démo" si Supabase n'est pas configuré.
- Pour tester le paiement, utilisez les cartes de test Stripe (4242 4242...).

---
© 2025 Reviewflow.
