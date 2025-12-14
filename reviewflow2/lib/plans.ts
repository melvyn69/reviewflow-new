
import { CheckCircle2, Zap, Globe, Shield, Rocket } from 'lucide-react';

export type PlanId = 'free' | 'starter' | 'pro' | 'elite';

export interface PlanConfig {
    id: PlanId;
    name: string;
    price: string;
    priceId?: string; // Optional: mapped in backend env vars usually
    ai_limit: number;
    locations_limit: number;
    features: string[];
    highlight?: boolean;
    cta: string;
    color: string;
}

export const PLANS: Record<PlanId, PlanConfig> = {
    free: {
        id: 'free',
        name: 'Découverte',
        price: '0€',
        ai_limit: 10,
        locations_limit: 1,
        features: [
            "1 Établissement",
            "10 Réponses IA / mois",
            "Tableau de bord basique",
            "Support communautaire"
        ],
        cta: 'Actuel',
        color: 'bg-slate-100 text-slate-600'
    },
    starter: {
        id: 'starter',
        name: 'Starter',
        price: '29€',
        ai_limit: 150,
        locations_limit: 1,
        features: [
            "1 Établissement connecté",
            "150 Réponses IA / mois",
            "Alertes Email instantanées",
            "Collecte (QR Code & Funnel)",
            "Support Email 24/7"
        ],
        cta: 'Commencer',
        color: 'bg-blue-50 text-blue-700 border-blue-200'
    },
    pro: {
        id: 'pro',
        name: 'Pro',
        price: '79€',
        ai_limit: 500,
        locations_limit: 3,
        highlight: true,
        features: [
            "Jusqu'à 3 Établissements",
            "500 Réponses IA / mois",
            "Automatisation (Workflows)",
            "Veille Concurrentielle",
            "Social Studio (Image Gen)",
            "Rapports PDF Marque Blanche"
        ],
        cta: 'Passer Pro',
        color: 'bg-indigo-50 text-indigo-700 border-indigo-200'
    },
    elite: {
        id: 'elite',
        name: 'Elite',
        price: 'Sur Devis',
        ai_limit: 999999, // Virtually unlimited for UI display
        locations_limit: 999,
        features: [
            "Établissements Illimités",
            "IA Illimitée",
            "Dashboard Master Groupe",
            "API Dédiée & Webhooks",
            "Account Manager Dédié",
            "Facturation centralisée"
        ],
        cta: 'Contacter',
        color: 'bg-slate-900 text-white border-slate-800'
    }
};

export const getPlanDetails = (planId: string): PlanConfig => {
    return PLANS[planId as PlanId] || PLANS.free;
};
