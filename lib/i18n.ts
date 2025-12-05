
import React, { createContext, useContext, useState, useEffect } from 'react';

// Dictionary Types
type Translations = {
  [key: string]: {
    [key: string]: string;
  };
};

// Translations Dictionary
const resources: Translations = {
  fr: {
    "nav.login": "Espace Client",
    "nav.demo": "Réserver une démo",
    "hero.title": "Pilotez votre Réputation.\nBoostez votre Chiffre d'Affaires.",
    "hero.subtitle": "La solution d'intelligence artificielle pour les réseaux d'enseignes et les franchisés qui ne laissent rien au hasard.",
    "cta.book": "Programmer une visio",
    "pricing.ht": "HT / mois",
    "pricing.contact": "Nous contacter",
    "pricing.custom": "Sur mesure",
    "lang.fr": "Français",
    "lang.en": "English",
    "lang.es": "Español",
    
    // Onboarding
    "onboarding.welcome": "Bienvenue sur Reviewflow",
    "onboarding.subtitle": "Configurons votre espace de travail en quelques secondes.",
    "onboarding.step1": "Entreprise",
    "onboarding.step2": "Connexions",
    "onboarding.step3": "Intelligence Artificielle",
    "onboarding.next": "Continuer",
    "onboarding.finish": "Accéder au Dashboard",
    "onboarding.skip": "Passer pour le moment",

    // Sidebar
    "sidebar.platform": "Plateforme",
    "sidebar.dashboard": "Tableau de bord",
    "sidebar.inbox": "Boîte de réception",
    "sidebar.social": "Social Studio",
    "sidebar.analytics": "Statistiques",
    "sidebar.competitors": "Veille Concurrentielle",
    "sidebar.team": "Équipe & Classement",
    "sidebar.collect": "Collecte d'avis",
    "sidebar.offers": "Offres & Fidélité",
    "sidebar.reports": "Rapports",
    "sidebar.automation": "Automatisation",
    "sidebar.org": "Organisation",
    "sidebar.billing": "Abonnement",
    "sidebar.settings": "Paramètres",
    "sidebar.help": "Centre d'Aide",
    "sidebar.admin": "Zone Admin",
    "sidebar.super_admin": "Super Admin",
    "sidebar.logout": "Déconnexion",
    "sidebar.install": "Installer l'App",
    "sidebar.install_sub": "Sur votre mobile",

    // Dashboard & KPIs
    "kpi.rating": "Note Moyenne",
    "kpi.response": "Taux de Réponse",
    "kpi.nps": "Score NPS",
    "kpi.sentiment": "Sentiment Positif",
    "dashboard.greeting_morning": "Bonjour",
    "dashboard.greeting_afternoon": "Bonne après-midi",
    "dashboard.greeting_evening": "Bonsoir",
    "dashboard.subtitle": "Voici ce qu'il se passe sur vos établissements aujourd'hui.",
    "dashboard.actions.qrcode": "QR Code",
    "dashboard.actions.print": "Imprimer le kit",
    "dashboard.actions.funnel": "Formulaire",
    "dashboard.actions.link": "Lien public",
    "dashboard.actions.reply": "Répondre",
    "dashboard.actions.inbox": "Boîte de réception",
    "dashboard.actions.social": "Social Post",
    "dashboard.actions.create": "Créer un visuel",
    "dashboard.urgent": "À traiter en priorité",
    "dashboard.urgent_sub": "avis",
    "dashboard.all_good": "Tout est sous contrôle !",
    "dashboard.no_urgent": "Aucun avis négatif en attente.",
    "dashboard.strengths": "Points Forts",
    "dashboard.weaknesses": "Points de Vigilance",
    "dashboard.analyzing": "Analyse en cours...",
    "dashboard.activity": "Flux d'activité"
  },
  en: {
    "nav.login": "Client Login",
    "nav.demo": "Book a Demo",
    "hero.title": "Master Your Reputation.\nScale Your Revenue.",
    "hero.subtitle": "The AI-powered intelligence suite for retail chains and franchises who leave nothing to chance.",
    "cta.book": "Schedule a Call",
    "pricing.ht": "excl. VAT / mo",
    "pricing.contact": "Contact Sales",
    "pricing.custom": "Custom",
    "lang.fr": "Français",
    "lang.en": "English",
    "lang.es": "Español",

    // Onboarding
    "onboarding.welcome": "Welcome to Reviewflow",
    "onboarding.subtitle": "Let's set up your workspace in seconds.",
    "onboarding.step1": "Company",
    "onboarding.step2": "Connections",
    "onboarding.step3": "Artificial Intelligence",
    "onboarding.next": "Continue",
    "onboarding.finish": "Go to Dashboard",
    "onboarding.skip": "Skip for now",

    // Sidebar
    "sidebar.platform": "Platform",
    "sidebar.dashboard": "Dashboard",
    "sidebar.inbox": "Inbox",
    "sidebar.social": "Social Studio",
    "sidebar.analytics": "Analytics",
    "sidebar.competitors": "Competitor Watch",
    "sidebar.team": "Team & Ranking",
    "sidebar.collect": "Review Collection",
    "sidebar.offers": "Offers & Loyalty",
    "sidebar.reports": "Reports",
    "sidebar.automation": "Automation",
    "sidebar.org": "Organization",
    "sidebar.billing": "Subscription",
    "sidebar.settings": "Settings",
    "sidebar.help": "Help Center",
    "sidebar.admin": "Admin Zone",
    "sidebar.super_admin": "Super Admin",
    "sidebar.logout": "Logout",
    "sidebar.install": "Install App",
    "sidebar.install_sub": "On your mobile",

    // Dashboard & KPIs
    "kpi.rating": "Average Rating",
    "kpi.response": "Response Rate",
    "kpi.nps": "NPS Score",
    "kpi.sentiment": "Positive Sentiment",
    "dashboard.greeting_morning": "Good morning",
    "dashboard.greeting_afternoon": "Good afternoon",
    "dashboard.greeting_evening": "Good evening",
    "dashboard.subtitle": "Here is what's happening at your locations today.",
    "dashboard.actions.qrcode": "QR Code",
    "dashboard.actions.print": "Print Kit",
    "dashboard.actions.funnel": "Funnel",
    "dashboard.actions.link": "Public Link",
    "dashboard.actions.reply": "Reply",
    "dashboard.actions.inbox": "Inbox",
    "dashboard.actions.social": "Social Post",
    "dashboard.actions.create": "Create Visual",
    "dashboard.urgent": "Needs Attention",
    "dashboard.urgent_sub": "reviews",
    "dashboard.all_good": "All clear!",
    "dashboard.no_urgent": "No negative reviews pending.",
    "dashboard.strengths": "Strengths",
    "dashboard.weaknesses": "Areas for Improvement",
    "dashboard.analyzing": "Analyzing...",
    "dashboard.activity": "Activity Feed"
  },
  es: {
    "nav.login": "Área de Cliente",
    "nav.demo": "Reservar Demo",
    "hero.title": "Domine su Reputación.\nAumente sus Ingresos.",
    "hero.subtitle": "La suite de inteligencia artificial para cadenas y franquicias que no dejan nada al azar.",
    "cta.book": "Agendar Visio",
    "pricing.ht": "+ IVA / mes",
    "pricing.contact": "Contactar Ventas",
    "pricing.custom": "A medida",
    "lang.fr": "Français",
    "lang.en": "English",
    "lang.es": "Español",

    // Onboarding
    "onboarding.welcome": "Bienvenido a Reviewflow",
    "onboarding.subtitle": "Configuremos su espacio de trabajo en segundos.",
    "onboarding.step1": "Empresa",
    "onboarding.step2": "Conexiones",
    "onboarding.step3": "Inteligencia Artificial",
    "onboarding.next": "Continuar",
    "onboarding.finish": "Ir al Panel",
    "onboarding.skip": "Saltar por ahora",

    // Sidebar
    "sidebar.platform": "Plataforma",
    "sidebar.dashboard": "Panel de Control",
    "sidebar.inbox": "Bandeja de Entrada",
    "sidebar.social": "Social Studio",
    "sidebar.analytics": "Estadísticas",
    "sidebar.competitors": "Competencia",
    "sidebar.team": "Equipo & Ranking",
    "sidebar.collect": "Colección",
    "sidebar.offers": "Ofertas & Fidelidad",
    "sidebar.reports": "Reportes",
    "sidebar.automation": "Automatización",
    "sidebar.org": "Organización",
    "sidebar.billing": "Suscripción",
    "sidebar.settings": "Ajustes",
    "sidebar.help": "Ayuda",
    "sidebar.admin": "Zona Admin",
    "sidebar.super_admin": "Super Admin",
    "sidebar.logout": "Cerrar Sesión",
    "sidebar.install": "Instalar App",
    "sidebar.install_sub": "En su móvil",

    // Dashboard & KPIs
    "kpi.rating": "Nota Media",
    "kpi.response": "Tasa de Respuesta",
    "kpi.nps": "Puntaje NPS",
    "kpi.sentiment": "Sentimiento Positivo",
    "dashboard.greeting_morning": "Buenos días",
    "dashboard.greeting_afternoon": "Buenas tardes",
    "dashboard.greeting_evening": "Buenas noches",
    "dashboard.subtitle": "Esto es lo que está pasando en sus establecimientos hoy.",
    "dashboard.actions.qrcode": "Código QR",
    "dashboard.actions.print": "Imprimir Kit",
    "dashboard.actions.funnel": "Formulario",
    "dashboard.actions.link": "Enlace público",
    "dashboard.actions.reply": "Responder",
    "dashboard.actions.inbox": "Bandeja",
    "dashboard.actions.social": "Post Social",
    "dashboard.actions.create": "Crear Visual",
    "dashboard.urgent": "Atención Requerida",
    "dashboard.urgent_sub": "reseñas",
    "dashboard.all_good": "¡Todo en orden!",
    "dashboard.no_urgent": "Sin reseñas negativas pendientes.",
    "dashboard.strengths": "Puntos Fuertes",
    "dashboard.weaknesses": "A Mejorar",
    "dashboard.analyzing": "Analizando...",
    "dashboard.activity": "Actividad Reciente"
  }
};

// Context
interface I18nContextType {
  t: (key: string) => string;
  lang: string;
  setLang: (lang: string) => void;
}

const I18nContext = createContext<I18nContextType>({
  t: (key: string) => key,
  lang: 'en', // Default to English for international B2B
  setLang: () => {},
});

export const I18nProvider = ({ children }: { children?: React.ReactNode }) => {
  const [lang, setLang] = useState('fr'); // Default to French for this demo context

  useEffect(() => {
    // Auto-detect language
    const browserLang = navigator.language.split('-')[0];
    if (['fr', 'en', 'es'].includes(browserLang)) {
      setLang(browserLang);
    }
  }, []);

  const t = (key: string) => {
    return resources[lang]?.[key] || resources['en']?.[key] || key;
  };

  return React.createElement(
    I18nContext.Provider,
    { value: { t, lang, setLang } },
    children
  );
};

export const useTranslation = () => useContext(I18nContext);
