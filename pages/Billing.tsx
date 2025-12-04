
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Skeleton, useToast } from '../components/ui';
import { CreditCard, CheckCircle2, Download, Zap, FileText, ShieldCheck, RefreshCw, Smartphone, Building2 } from 'lucide-react';
import { api } from '../lib/api';
import { Organization } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useTranslation } from '../lib/i18n';
import { useLocation, useNavigate } from 'react-router-dom';

const Confetti = () => (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
        {[...Array(50)].map((_, i) => (
            <div key={i} className="confetti" style={{ 
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                backgroundColor: ['#f2d74e', '#ef2964', '#00c09d', '#2d87b0'][Math.floor(Math.random() * 4)]
            }}></div>
        ))}
    </div>
);

const PricingCard = ({ 
    title, 
    price, 
    features, 
    current = false, 
    onUpgrade, 
    loading,
    variant = 'default',
    subtext,
    ctaLabel
}: { 
    title: string; 
    price: string; 
    features: string[]; 
    current?: boolean; 
    onUpgrade?: () => void; 
    loading?: boolean;
    variant?: 'default' | 'featured' | 'enterprise';
    subtext?: string;
    ctaLabel?: string;
}) => (
    <div className={`relative p-6 rounded-2xl border transition-all duration-300 flex flex-col h-full ${current ? 'border-indigo-600 ring-2 ring-indigo-100 bg-white' : variant === 'featured' ? 'border-indigo-200 bg-gradient-to-b from-indigo-50/50 to-white shadow-lg scale-105 z-10' : variant === 'enterprise' ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
        {current && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                Plan Actuel
            </span>
        )}
        <h3 className={`text-lg font-bold mb-2 ${variant === 'enterprise' ? 'text-white' : 'text-slate-900'}`}>{title}</h3>
        <div className="flex items-baseline gap-1 mb-1">
            <span className={`text-3xl font-bold ${variant === 'enterprise' ? 'text-white' : 'text-slate-900'}`}>{price}</span>
            {price !== 'Sur Devis' && <span className={`text-sm ${variant === 'enterprise' ? 'text-slate-400' : 'text-slate-500'}`}>HT/mois</span>}
        </div>
        {subtext && <p className={`text-xs mb-6 ${variant === 'enterprise' ? 'text-slate-400' : 'text-slate-500'}`}>{subtext}</p>}
        
        <ul className="space-y-3 mb-8 flex-1">
            {features.map((feat, i) => (
                <li key={i} className={`flex items-start gap-3 text-sm ${variant === 'enterprise' ? 'text-slate-300' : 'text-slate-600'}`}>
                    <CheckCircle2 className={`h-4 w-4 shrink-0 mt-0.5 ${variant === 'enterprise' ? 'text-indigo-400' : 'text-green-500'}`} />
                    <span>{feat}</span>
                </li>
            ))}
        </ul>

        {current ? (
            <Button disabled className="w-full bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-100">Actif</Button>
        ) : (
            <Button 
                variant={variant === 'featured' ? 'primary' : variant === 'enterprise' ? 'secondary' : 'outline'} 
                className={`w-full ${variant === 'enterprise' ? 'bg-white text-slate-900 hover:bg-slate-100 border-none' : ''}`}
                onClick={onUpgrade}
                isLoading={loading}
            >
                {ctaLabel || (variant === 'enterprise' ? 'Contacter' : 'Choisir')}
            </Button>
        )}
    </div>
);

const InvoiceTable = () => {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    useEffect(() => {
        api.billing.getInvoices().then((data: any) => {
            setInvoices(data);
            setLoading(false);
        });
    }, []);

    if (loading) return <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>;

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3">Montant HT</th>
                        <th className="px-6 py-3">Statut</th>
                        <th className="px-6 py-3 text-right">Facture</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {invoices.length === 0 ? (
                        <tr><td colSpan={4} className="p-6 text-center text-slate-400">Aucune facture disponible.</td></tr>
                    ) : invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 font-medium text-slate-900">{inv.date}</td>
                            <td className="px-6 py-4">{inv.amount}</td>
                            <td className="px-6 py-4">
                                <Badge variant="success" className="text-[10px]">{inv.status}</Badge>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <button className="text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1">
                                    <Download className="h-3 w-3" /> PDF
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export const BillingPage = () => {
    const [org, setOrg] = useState<Organization | null>(null);
    const [upgrading, setUpgrading] = useState<string | null>(null);
    const [error, setError] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    
    const toast = useToast();
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        // Handle Stripe Return
        if (location.search.includes('success=true')) {
            setShowSuccess(true);
            toast.success("Paiement réussi ! Bienvenue dans le club.");
            // Clear URL param without reload
            window.history.replaceState({}, '', '#/billing');
            // Force refresh data
            api.auth.getUser().then(() => loadOrg());
        }
        
        loadOrg();
    }, [location.search]);

    const loadOrg = async () => {
        setError(false);
        setOrg(null);
        try {
            const data = await api.organization.get();
            setOrg(data);
        } catch (e) {
            setError(true);
        }
    };

    const handleUpgrade = async (plan: 'starter' | 'pro') => {
        setUpgrading(plan);
        try {
            const url = await api.billing.createCheckoutSession(plan);
            if (url && url.startsWith('http')) {
                window.location.href = url;
            } else {
                toast.error("Lien de paiement non configuré.");
            }
        } catch (e: any) {
            toast.error(e.message || "Erreur paiement.");
        } finally {
            setUpgrading(null);
        }
    };

    const handleContactSales = () => {
        window.location.href = "mailto:sales@reviewflow.com?subject=Demande%20Enterprise";
    };

    if (error) return <div>Erreur chargement.</div>;
    if (!org) return <div className="p-8 text-center"><Skeleton className="h-96 w-full" /></div>;

    const usage = org.ai_usage_count || 0;
    const limit = org.subscription_plan === 'free' ? 0 : org.subscription_plan === 'starter' ? 150 : 500;
    const percentage = limit > 0 ? Math.min(100, (usage / limit) * 100) : 100;

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 relative">
            {showSuccess && <Confetti />}
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Abonnement & Facturation</h1>
                    <p className="text-slate-500">Choisissez la puissance dont votre enseigne a besoin.</p>
                </div>
                {org.subscription_plan !== 'free' && (
                    <Button variant="outline" icon={CreditCard} onClick={() => api.billing.createPortalSession().then((url: string) => window.location.href = url)}>
                        Gérer carte & Factures
                    </Button>
                )}
            </div>

            {/* Usage Section */}
            {org.subscription_plan !== 'free' && (
                <Card className="bg-gradient-to-r from-slate-900 to-indigo-900 text-white border-none shadow-xl">
                    <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <Zap className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                                <h3 className="font-bold text-lg">Consommation IA</h3>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-4 mb-2 overflow-hidden">
                                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 h-full" style={{ width: `${percentage}%` }}></div>
                            </div>
                            <div className="flex justify-between text-xs font-medium text-indigo-200">
                                <span>{usage} réponses</span>
                                <span>Limite : {limit}</span>
                            </div>
                        </div>
                        <div className="bg-white/10 p-6 rounded-xl backdrop-blur-sm border border-white/10 text-center min-w-[200px]">
                            <div className="text-xs text-indigo-300 uppercase tracking-wider font-semibold mb-1">Plan Actuel</div>
                            <div className="text-2xl font-bold mb-1 capitalize">
                                {org.subscription_plan === 'starter' ? 'Essential' : org.subscription_plan === 'pro' ? 'Growth' : org.subscription_plan}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Pricing Cards */}
            <div id="pricing" className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch pt-4">
                <PricingCard 
                    title="Essential" 
                    price="49€" 
                    current={org.subscription_plan === 'starter'}
                    loading={upgrading === 'starter'}
                    onUpgrade={() => handleUpgrade('starter')}
                    subtext="Pour les indépendants"
                    features={[
                        "1 Établissement connecté",
                        "Réponses IA Illimitées",
                        "Alertes Email instantanées",
                        "Collecte (QR Code & Funnel)",
                        "Support Email 24/7"
                    ]} 
                />
                <PricingCard 
                    title="Growth" 
                    price="89€" 
                    variant="featured"
                    current={org.subscription_plan === 'pro'}
                    loading={upgrading === 'pro'}
                    onUpgrade={() => handleUpgrade('pro')}
                    subtext="Pour les gérants exigeants"
                    features={[
                        "3 Établissements inclus",
                        "Automatisation (Workflows)",
                        "Veille Concurrentielle",
                        "Social Studio (Image Gen)",
                        "Rapports PDF Marque Blanche"
                    ]} 
                />
                <PricingCard 
                    title="Enterprise" 
                    price="Sur Devis" 
                    variant="enterprise"
                    subtext="Réseaux & Franchises"
                    onUpgrade={handleContactSales}
                    features={[
                        "Établissements Illimités",
                        "Dashboard Master (Vue Groupe)",
                        "API Dédiée & Webhooks",
                        "Onboarding Personnalisé",
                        "Facturation centralisée"
                    ]} 
                />
            </div>

            {/* Invoices */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-slate-400" />
                        Historique des factures
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <InvoiceTable />
                </CardContent>
            </Card>

            <div className="text-center text-xs text-slate-400 flex items-center justify-center gap-2 pb-8">
                <ShieldCheck className="h-4 w-4" />
                Transactions sécurisées par Stripe. TVA applicable selon votre pays.
            </div>
        </div>
    );
};
