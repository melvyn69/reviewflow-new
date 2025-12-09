

import { Organization, User } from '../types';

export type PlanId = 'free' | 'starter' | 'pro' | 'elite';
export type FeatureId = 
    | 'social_studio' 
    | 'automation' 
    | 'competitors' 
    | 'advanced_reports' 
    | 'api_access'
    | 'white_label'
    | 'review_collection';

export type UserRole = 'super_admin' | 'admin' | 'manager' | 'editor' | 'viewer';

interface PlanDefinition {
    label: string;
    features: FeatureId[];
    limits: {
        locations: number;
        ai_responses: number; // Monthly
        team_members: number;
    };
}

export const PLANS: Record<PlanId, PlanDefinition> = {
    free: {
        label: 'Découverte',
        features: [],
        limits: {
            locations: 1,
            ai_responses: 10,
            team_members: 1
        }
    },
    starter: {
        label: 'Starter',
        features: ['review_collection'],
        limits: {
            locations: 1,
            ai_responses: 150,
            team_members: 2
        }
    },
    pro: {
        label: 'Growth',
        features: ['review_collection', 'social_studio', 'automation', 'competitors', 'advanced_reports'],
        limits: {
            locations: 3,
            ai_responses: 500,
            team_members: 5
        }
    },
    elite: {
        label: 'Enterprise',
        features: ['review_collection', 'social_studio', 'automation', 'competitors', 'advanced_reports', 'api_access', 'white_label'],
        limits: {
            locations: 999,
            ai_responses: 999999,
            team_members: 999
        }
    }
};

export const FEATURES_INFO: Record<FeatureId, { title: string; description: string }> = {
    social_studio: {
        title: "Social Studio",
        description: "Créez, planifiez et diffusez vos meilleurs avis sur Instagram, Facebook et LinkedIn."
    },
    automation: {
        title: "Automatisation",
        description: "Créez des workflows intelligents pour répondre automatiquement ou alerter votre équipe."
    },
    competitors: {
        title: "Veille Concurrentielle",
        description: "Espionnez légalement vos concurrents et analysez leurs points faibles."
    },
    advanced_reports: {
        title: "Rapports Avancés",
        description: "Générez des rapports PDF personnalisés et planifiez leur envoi automatique."
    },
    api_access: {
        title: "API Développeur",
        description: "Accédez à vos données par programme et intégrez Reviewflow à votre CRM."
    },
    white_label: {
        title: "Marque Blanche",
        description: "Retirez la mention 'Powered by Reviewflow' sur vos widgets et rapports."
    },
    review_collection: {
        title: "Collecte d'Avis",
        description: "QR Codes, Campagnes Email/SMS et Funnel de satisfaction."
    }
};

// --- HELPERS ---

export const getPlanLimits = (planId: string) => {
    return PLANS[planId as PlanId]?.limits || PLANS.free.limits;
};

// GOD MODE HELPER
export const isGodMode = (user: User | null | undefined): boolean => {
    return !!user?.is_super_admin;
};

export const hasAccess = (org: Organization | null, feature: FeatureId, user?: User | null): boolean => {
    // 1. GOD MODE CHECK FIRST
    if (user && isGodMode(user)) return true;

    // 2. Standard Plan Check
    if (!org) return false;
    const plan = PLANS[org.subscription_plan as PlanId] || PLANS.free;
    return plan.features.includes(feature);
};

export const canPerformAction = (user: User | null, requiredRole: UserRole): boolean => {
    if (!user) return false;
    if (isGodMode(user)) return true; // Super Admin can do everything

    const roleHierarchy: UserRole[] = ['viewer', 'editor', 'manager', 'admin', 'super_admin'];
    const userLevel = roleHierarchy.indexOf(user.role);
    const requiredLevel = roleHierarchy.indexOf(requiredRole);
    return userLevel >= requiredLevel;
};