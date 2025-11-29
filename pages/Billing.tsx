
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Skeleton, useToast } from '../components/ui';
import { CreditCard, CheckCircle2, Download, Zap, FileText, ArrowRight, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import { Organization } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const PricingCard = ({ 
    title, 
    price, 
    features, 
    current = false, 
    onUpgrade, 
    loading,
    variant = 'default',
    overageText
}: { 
    title: string; 
    price: string; 
    features: string[]; 
    current?: boolean; 
    onUpgrade?: () => void; 
    loading?: boolean;
    variant?: 'default' | 'featured';
    overageText?: string;
}) => (
    <div className={`relative p-6 rounded-2xl border transition-all duration-300 ${current ? 'border-indigo-600 ring-2 ring-indigo-100 bg-white' : variant === 'featured' ? 'border-indigo-200 bg-gradient-to-b from-indigo-50/50 to-white shadow-lg scale-105 z-10' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
        {current && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                Plan Actuel
            </span>
        )}
        <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
        <div className="flex items-baseline gap-1 mb-1">
            <span className="text-3xl font-bold text-slate-900">{price}</span>
            <span className="text-sm text-slate-500">/mois</span>
        </div>
        {overageText && <p className="text-xs text-slate-500 mb-6">{overageText}</p>}
        
        <ul className="space-y-3 mb-8">
            {features.map((feat, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                </li>
            ))}
        </ul>

        {current ? (
            <Button disabled className="w-full bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-100">Actif</Button>
        ) : (
            <Button 
                variant={variant === 'featured' ? 'primary' : 'outline'} 
                className="w-full" 
                onClick={onUpgrade}
                isLoading={loading}
            >
                {variant === 'featured' ? 'Passer au Pro' : 'Choisir'}
            </Button>
        )}
    </div>
);

const InvoiceTable = () => {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    useEffect(() => {
        api.billing.getInvoices().then(data => {
            setInvoices(data);
            setLoading(false);
        });
    }, []);

    const handleDownload = (invoice: any) => {
        const doc = new jsPDF();
        
        // Logo / Brand
        doc.setFontSize(22);
        doc.setTextColor(79, 70, 229);
        doc.text("Reviewflow", 20, 20);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text("12 Avenue de la République", 20, 26);
        doc.text("75011 Paris, France", 20, 31);
        doc.text("SIRET: 123 456 789 00012", 20, 36);

        // Invoice Info
        doc.setFontSize(16);
        doc.setTextColor(30, 41, 59);
        doc.text("FACTURE", 140, 20);
        doc.setFontSize(10);
        doc.text(`N° ${invoice.id}`, 140, 26);
        doc.text(`Date : ${invoice.date}`, 140, 31);
        
        // Client Info
        doc.text("Facturé à :", 20, 55);
        doc.setFont("helvetica", "bold");
        doc.text("Groupe Multiservices", 20, 60);
        doc.setFont("helvetica", "normal");
        doc.text("12 rue de la Paix", 20, 65);
        doc.text("75000 Paris", 20, 70);
        
        // Table
        const price = parseFloat(invoice.amount.replace('€', ''));
        const ht = (price / 1.2).toFixed(2);
        const tva = (price - parseFloat(ht)).toFixed(2);

        autoTable(doc, {
            startY: 80,
            head: [['Description', 'Qté', 'Prix U. HT', 'Total HT']],
            body: [
                ['Abonnement Pro Mensuel', '1', `${ht} €`, `${ht} €`],
                ['Crédits IA (Inclus)', '1', '0.00 €', '0.00 €']
            ],
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229] },
            foot: [
                ['', '', 'Total HT', `${ht} €`],
                ['', '', 'TVA (20%)', `${tva} €`],
                ['', '', 'Total TTC', invoice.amount]
            ],
            footStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold' }
        });
        
        // Footer
        const finalY = (doc as any).lastAutoTable.finalY + 20;
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text("Conditions de paiement : Paiement à réception.", 20, finalY);
        doc.text("En cas de retard de paiement, une pénalité de 3 fois le taux d'intérêt légal sera appliquée.", 20, finalY + 5);

        doc.save(`facture_${invoice.id}.pdf`);
        toast.success("Facture téléchargée");
    };

    if (loading) return <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>;

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3">Montant</th>
                        <th className="px-6 py-3">Statut</th>
                        <th className="px-6 py-3 text-right">Facture</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 font-medium text-slate-900">{inv.date}</td>
                            <td className="px-6 py-4">{inv.amount}</td>
                            <td className="px-6 py-4">
                                <Badge variant="success" className="text-[10px]">{inv.status}</Badge>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <button 
                                    onClick={() => handleDownload(inv)}
                                    className="text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1"
                                >
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
    const toast = useToast();

    useEffect(() => {
        loadOrg();
    }, []);

    const loadOrg = async () => {
        const data = await api.organization.get();
        setOrg(data);
    };

    const handleUpgrade = async (plan: 'starter' | 'pro') => {
        setUpgrading(plan);
        try {
            const url = await api.billing.createCheckoutSession(plan);
            // In real app: window.location.href = url;
            // Here we simulate success:
            await api.organization.upgradePlan(plan);
            toast.success(`Félicitations ! Vous êtes passé au plan ${plan.toUpperCase()}.`);
            await loadOrg();
        } catch (e) {
            toast.error("Erreur lors de la redirection vers le paiement.");
        } finally {
            setUpgrading(null);
        }
    };

    if (!org) return <div className="p-8 text-center"><Skeleton className="h-96 w-full" /></div>;

    // Logic for usage bars
    const usage = org.ai_usage_count || 0;
    const limit = org.subscription_plan === 'free' ? 3 : org.subscription_plan === 'starter' ? 100 : 300;
    const percentage = Math.min(100, (usage / limit) * 100);

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Abonnement & Facturation</h1>
                    <p className="text-slate-500">Gérez votre plan et vos méthodes de paiement.</p>
                </div>
                <Button variant="outline" icon={CreditCard} onClick={() => api.billing.createPortalSession().then(() => toast.info("Ouverture du portail Stripe..."))}>
                    Gérer carte bancaire
                </Button>
            </div>

            {/* Usage Section */}
            <Card className="bg-gradient-to-r from-slate-900 to-indigo-900 text-white border-none shadow-xl">
                <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <Zap className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                            <h3 className="font-bold text-lg">Consommation IA</h3>
                        </div>
                        <p className="text-indigo-200 text-sm mb-6">
                            Crédits de réponse utilisés ce mois-ci. Les réponses supplémentaires sont facturées selon votre plan.
                        </p>
                        <div className="w-full bg-white/10 rounded-full h-4 mb-2 overflow-hidden">
                            <div 
                                className="bg-gradient-to-r from-yellow-400 to-orange-500 h-full transition-all duration-1000 ease-out" 
                                style={{ width: `${percentage}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between text-xs font-medium text-indigo-200">
                            <span>{usage} réponses générées</span>
                            <span>Limite incluse : {limit}</span>
                        </div>
                    </div>
                    <div className="bg-white/10 p-6 rounded-xl backdrop-blur-sm border border-white/10 text-center min-w-[200px]">
                        <div className="text-xs text-indigo-300 uppercase tracking-wider font-semibold mb-1">Plan Actuel</div>
                        <div className="text-2xl font-bold mb-1 capitalize">{org.subscription_plan}</div>
                        {org.subscription_plan === 'free' && (
                            <Button size="xs" className="mt-2 bg-white text-indigo-900 hover:bg-indigo-50 border-none" onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth'})}>
                                Mettre à niveau
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Pricing Cards */}
            <div id="pricing" className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start pt-8">
                <PricingCard 
                    title="Gratuit" 
                    price="0€" 
                    current={org.subscription_plan === 'free'}
                    overageText="Pas d'IA incluse"
                    features={[
                        "1 Établissement",
                        "Connexion Google & Facebook",
                        "Réponses Manuelles illimitées",
                        "Tableau de bord basique",
                        "Pas d'IA générative"
                    ]} 
                />
                <PricingCard 
                    title="Starter" 
                    price="49€" 
                    current={org.subscription_plan === 'starter'}
                    loading={upgrading === 'starter'}
                    onUpgrade={() => handleUpgrade('starter')}
                    overageText="puis 0.20€ / réponse supp."
                    features={[
                        "1 Établissement",
                        "100 Réponses IA incluses",
                        "IA personnalisée (Brand Voice)",
                        "Analyses Sémantiques",
                        "Support Email 24h"
                    ]} 
                />
                <PricingCard 
                    title="Pro" 
                    price="79€" 
                    variant="featured"
                    current={org.subscription_plan === 'pro'}
                    loading={upgrading === 'pro'}
                    onUpgrade={() => handleUpgrade('pro')}
                    overageText="puis 0.15€ / réponse supp."
                    features={[
                        "Établissements Illimités",
                        "300 Réponses IA incluses",
                        "Automatisation (Workflows)",
                        "Rapports PDF & Excel",
                        "Support Prioritaire",
                        "Accès API"
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
                Paiements sécurisés par Stripe. Annulation possible à tout moment.
            </div>
        </div>
    );
};
