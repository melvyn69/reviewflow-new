
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Skeleton, useToast } from '../components/ui';
import { CreditCard, CheckCircle2, Download, Zap, FileText, ShieldCheck, RefreshCw, AlertCircle, Calendar } from 'lucide-react';
import { api } from '../lib/api';
import { Organization, BillingInvoice } from '../types';
import { PLANS, getPlanDetails, PlanId } from '../lib/plans';
import { useLocation, useNavigate } from '../components/ui';

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

const PaymentProcessingOverlay = () => (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in duration-300">
        <div className="bg-white p-8 rounded-2xl shadow-2xl border border-indigo-100 text-center max-w-sm">
            <div className="relative mb-4">
                <div className="h-16 w-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto">
                    <CreditCard className="h-8 w-8 text-indigo-600" />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 border-2 border-white">
                    <RefreshCw className="h-3 w-3 text-white animate-spin" />
                </div>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Finalisation de l'activation</h3>
            <p className="text-slate-500 text-sm">Nous synchronisons votre abonnement avec le serveur. Cela prend quelques secondes...</p>
        </div>
    </div>
);

const PricingCard = ({ 
    planId,
    current = false, 
    onUpgrade, 
    loading,
}: { 
    planId: PlanId;
    current?: boolean; 
    onUpgrade?: () => void; 
    loading?: boolean;
}) => {
    const plan = PLANS[planId];
    
    return (
        <div className={`relative p-6 rounded-2xl border transition-all duration-300 flex flex-col h-full ${current ? 'border-indigo-600 ring-2 ring-indigo-100 bg-white' : plan.highlight ? 'border-indigo-200 bg-gradient-to-b from-indigo-50/50 to-white shadow-lg scale-105 z-10' : plan.id === 'elite' ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
            {current && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                    Plan Actuel
                </span>
            )}
            {plan.highlight && !current && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-md">
                    Populaire
                </span>
            )}
            
            <h3 className={`text-lg font-bold mb-2 ${plan.id === 'elite' ? 'text-white' : 'text-slate-900'}`}>{plan.name}</h3>
            <div className="flex items-baseline gap-1 mb-1">
                <span className={`text-3xl font-bold ${plan.id === 'elite' ? 'text-white' : 'text-slate-900'}`}>{plan.price}</span>
                {plan.price !== 'Sur Devis' && <span className={`text-sm ${plan.id === 'elite' ? 'text-slate-400' : 'text-slate-500'}`}>HT/mois</span>}
            </div>
            
            <div className="flex items-center gap-2 mb-6 text-xs font-medium opacity-80">
                <Zap className="h-3 w-3" /> {plan.id === 'elite' ? 'IA Illimitée' : `${plan.ai_limit} réponses IA`}
            </div>
            
            <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feat, i) => (
                    <li key={i} className={`flex items-start gap-3 text-sm ${plan.id === 'elite' ? 'text-slate-300' : 'text-slate-600'}`}>
                        <CheckCircle2 className={`h-4 w-4 shrink-0 mt-0.5 ${plan.id === 'elite' ? 'text-indigo-400' : 'text-green-500'}`} />
                        <span>{feat}</span>
                    </li>
                ))}
            </ul>

            {current ? (
                <Button disabled className="w-full bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-100">Actif</Button>
            ) : (
                <Button 
                    variant={plan.highlight ? 'primary' : plan.id === 'elite' ? 'secondary' : 'outline'} 
                    className={`w-full ${plan.id === 'elite' ? 'bg-white text-slate-900 hover:bg-slate-100 border-none' : ''}`}
                    onClick={onUpgrade}
                    isLoading={loading}
                >
                    {plan.cta}
                </Button>
            )}
        </div>
    );
};

const InvoiceTable = () => {
    const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInvoices = async () => {
            try {
                const data = await api.billing.getInvoices();
                setInvoices(data || []);
            } catch (e) {
                setInvoices([]);
            } finally {
                setLoading(false);
            }
        };
        fetchInvoices();
    }, []);

    if (loading) return <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>;

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3">N° Facture</th>
                        <th className="px-6 py-3">Montant TTC</th>
                        <th className="px-6 py-3">Statut</th>
                        <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {invoices.length === 0 ? (
                        <tr><td colSpan={5} className="p-6 text-center text-slate-400">Aucune facture disponible.</td></tr>
                    ) : invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 font-medium text-slate-900">{inv.date}</td>
                            <td className="px-6 py-4 text-xs font-mono text-slate-500">{inv.number}</td>
                            <td className="px-6 py-4 font-bold">{inv.amount}</td>
                            <td className="px-6 py-4">
                                <Badge variant={inv.status === 'paid' ? 'success' : inv.status === 'open' ? 'warning' : 'error'} className="text-[10px] capitalize">{inv.status}</Badge>
                            </td>
                            <td className="px-6 py-4 text-right">
                                {inv.pdf_url ? (
                                    <Button 
                                        size="xs" 
                                        variant="ghost" 
                                        onClick={() => window.open(inv.pdf_url, '_blank')}
                                        className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                                    >
                                        <Download className="h-3 w-3 mr-1" /> Télécharger
                                    </Button>
                                ) : (
                                    <span className="text-slate-300 text-xs">N/A</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// Subscription Status Component
const SubscriptionStatus = ({ org, onPortal }: { org: Organization, onPortal: () => void }) => {
    const status = org.subscription_status || 'active';
    const isPastDue = status === 'past_due' || status === 'unpaid';
    const renewalDate = org.current_period_end ? new Date(org.current_period_end).toLocaleDateString() : 'N/A';
    
    return (
        <Card className={`border-l-4 ${isPastDue ? 'border-l-red-500' : 'border-l-green-500'}`}>
            <CardContent className="p-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                            Statut de l'abonnement
                            <Badge variant={isPastDue ? 'error' : 'success'} className="uppercase">
                                {status.replace('_', ' ')}
                            </Badge>
                        </h3>
                        {org.cancel_at_period_end ? (
                            <p className="text-sm text-amber-600 mt-1 flex items-center gap-1">
                                <AlertCircle className="h-4 w-4" /> Résiliation programmée le {renewalDate}
                            </p>
                        ) : (
                            <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                                <Calendar className="h-4 w-4" /> Prochain renouvellement : <span className="font-medium text-slate-700">{renewalDate}</span>
                            </p>
                        )}
                        
                        {org.subscription_plan !== 'free' && (
                            <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                                <CreditCard className="h-3 w-3" /> Paiement sécurisé via Stripe
                            </div>
                        )}
                    </div>
                    <div>
                        <Button variant="outline" size="sm" onClick={onPortal}>Gérer abonnement</Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export const BillingPage = () => {
    const [org, setOrg] = useState<Organization | null>(null);
    const [upgrading, setUpgrading] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [showSuccess, setShowSuccess] = useState(false);
    const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
    const [usageCount, setUsageCount] = useState(0);
    const [portalLoading, setPortalLoading] = useState(false);
    
    const toast = useToast();
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const init = async () => {
            if (location.search.includes('success=true')) {
                setIsVerifyingPayment(true);
                await pollForPlanUpdate();
                window.history.replaceState({}, '', '#/billing');
            } else {
                loadOrg();
            }
        };
        init();
    }, [location.search]);

    const pollForPlanUpdate = async () => {
        let attempts = 0;
        const maxAttempts = 10;
        
        const check = async () => {
            try {
                const data = await api.organization.get();
                // Check if plan has changed from free
                if (data && data.subscription_plan !== 'free') {
                    setOrg(data);
                    setIsVerifyingPayment(false);
                    setShowSuccess(true);
                    toast.success("Paiement validé ! Votre abonnement est actif.");
                    setLoading(false);
                    return;
                }
            } catch (e) {
                console.error("Polling error", e);
            }

            attempts++;
            if (attempts < maxAttempts) {
                setTimeout(check, 2000);
            } else {
                setIsVerifyingPayment(false);
                toast.info("Paiement reçu. L'activation peut prendre jusqu'à une minute.");
                loadOrg();
            }
        };

        check();
    };

    const loadOrg = async () => {
        setLoading(true);
        try {
            const data = await api.organization.get();
            setOrg(data);
            const usage = await api.billing.getUsage();
            setUsageCount(usage);
        } catch (e) {
            console.error("Failed to load org", e);
        } finally {
            setLoading(false);
        }
    };

    const handleUpgrade = async (planId: string) => {
        setUpgrading(planId);
        try {
            const url = await api.billing.createCheckoutSession(planId);
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
        window.location.href = "mailto:sales@reviewflow.com?subject=Demande%20Elite";
    };

    const handleManageCards = async () => {
        setPortalLoading(true);
        try {
            const url = await api.billing.createPortalSession();
            if (url && url.startsWith('http')) {
                window.location.href = url;
            } else {
                toast.error("Impossible d'accéder au portail. Contactez le support.");
            }
        } catch (e: any) {
            toast.error("Erreur portail: " + e.message);
        } finally {
            setPortalLoading(false);
        }
    };

    if (loading || isVerifyingPayment) {
        return (
            <div className="relative">
                {isVerifyingPayment && <PaymentProcessingOverlay />}
                <div className="p-8 text-center space-y-4">
                    <Skeleton className="h-24 w-full rounded-xl" />
                    <div className="grid grid-cols-3 gap-4">
                        <Skeleton className="h-96 w-full rounded-xl" />
                        <Skeleton className="h-96 w-full rounded-xl" />
                        <Skeleton className="h-96 w-full rounded-xl" />
                    </div>
                </div>
            </div>
        );
    }

    if (!org) {
        return (
            <div className="p-12 text-center flex flex-col items-center justify-center min-h-[50vh]">
                <div className="bg-slate-50 p-4 rounded-full mb-4">
                    <CreditCard className="h-8 w-8 text-slate-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Aucun abonnement actif</h3>
                <p className="text-slate-500 mb-6 max-w-sm">
                    Veuillez terminer la configuration de votre compte pour accéder aux offres.
                </p>
                <Button onClick={() => navigate('/onboarding')}>Terminer l'installation</Button>
            </div>
        );
    }

    // Dynamic Logic from PLANS config
    const currentPlanDetails = getPlanDetails(org.subscription_plan);
    const limit = currentPlanDetails.ai_limit;
    const percentage = limit > 0 ? Math.min(100, (usageCount / limit) * 100) : 100;
    const remaining = Math.max(0, limit - usageCount);

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 relative pb-20">
            {showSuccess && <Confetti />}
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Abonnement & Facturation</h1>
                    <p className="text-slate-500">Gérez votre offre et vos factures en toute transparence.</p>
                </div>
            </div>

            {/* Status Section */}
            {org.subscription_plan !== 'free' && (
                <SubscriptionStatus org={org} onPortal={handleManageCards} />
            )}

            {/* Usage Section */}
            <Card className="bg-gradient-to-r from-slate-900 to-indigo-900 text-white border-none shadow-xl">
                <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex-1 w-full">
                        <div className="flex items-center gap-2 mb-3">
                            <Zap className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                            <h3 className="font-bold text-lg">Consommation IA (Ce mois)</h3>
                        </div>
                        <div className="relative pt-1">
                            <div className="flex mb-2 items-center justify-between">
                                <div>
                                    <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-indigo-600 bg-indigo-200">
                                        {percentage.toFixed(0)}% Utilisé
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-semibold inline-block text-indigo-200">
                                        {org.subscription_plan === 'elite' ? 'Illimité' : `${remaining} restants`}
                                    </span>
                                </div>
                            </div>
                            <div className="overflow-hidden h-4 mb-4 text-xs flex rounded bg-indigo-800">
                                <div style={{ width: `${percentage}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-1000 ease-out"></div>
                            </div>
                        </div>
                        <div className="flex justify-between text-xs font-medium text-indigo-200">
                            <span>{usageCount} réponses générées</span>
                            <span>Plafond : {org.subscription_plan === 'elite' ? '∞' : limit}</span>
                        </div>
                    </div>
                    <div className="bg-white/10 p-6 rounded-xl backdrop-blur-sm border border-white/10 text-center min-w-[200px]">
                        <div className="text-xs text-indigo-300 uppercase tracking-wider font-semibold mb-1">Plan Actuel</div>
                        <div className="text-2xl font-bold mb-1">
                            {currentPlanDetails.name}
                        </div>
                        {org.subscription_plan === 'free' && (
                            <Button size="xs" variant="secondary" className="mt-2 w-full" onClick={() => document.getElementById('pricing')?.scrollIntoView({behavior:'smooth'})}>Mettre à niveau</Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Pricing Cards */}
            <div id="pricing" className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch pt-4">
                <PricingCard 
                    planId="starter"
                    current={org.subscription_plan === 'starter'}
                    loading={upgrading === 'starter'}
                    onUpgrade={() => handleUpgrade('starter')}
                />
                <PricingCard 
                    planId="pro"
                    current={org.subscription_plan === 'pro'}
                    loading={upgrading === 'pro'}
                    onUpgrade={() => handleUpgrade('pro')}
                />
                <PricingCard 
                    planId="elite"
                    current={org.subscription_plan === 'elite'}
                    onUpgrade={handleContactSales}
                />
            </div>

            {/* Invoices */}
            {org.subscription_plan !== 'free' && (
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
            )}

            <div className="text-center text-xs text-slate-400 flex items-center justify-center gap-2 pb-8">
                <ShieldCheck className="h-4 w-4" />
                Transactions sécurisées par Stripe. TVA applicable selon votre pays.
            </div>
        </div>
    );
};
