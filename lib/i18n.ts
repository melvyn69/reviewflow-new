
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

export const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLang] = useState('en');

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
