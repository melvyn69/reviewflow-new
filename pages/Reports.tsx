import React, { useEffect, useState, useRef } from 'react';
import { api } from '../lib/api';
import { ReportConfig, AnalyticsSummary, Organization, User, ReportHistoryItem, StaffMember, Competitor } from '../types';
import { Button, Card, Badge, Toggle, useToast, Input, Select, CardHeader, CardTitle, CardContent, ProLock } from '../components/ui';
import { FileText, Plus, Download, Mail, Trash2, X, PieChart, TrendingUp, Award, Calendar, Users, BarChart3, Target, Layout, Check, ChevronRight, ChevronLeft, Clock, Shield, User as UserIcon, History, MapPin, Eye, Send as SendIcon } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toPng } from 'html-to-image';

// --- VISUAL TEMPLATES FOR PDF GENERATION ---
const ReportCoverTemplate = React.forwardRef<HTMLDivElement, { title: string, date: string, orgName: string }>(({ title, date, orgName }, ref) => (
    <div ref={ref} className="w-[800px] h-[1130px] bg-slate-900 text-white p-20 flex flex-col justify-between relative overflow-hidden font-sans">
        {/* Modern Geometric Accents */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 opacity-40"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-violet-600 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3 opacity-30"></div>
        <div className="absolute top-20 left-20 w-20 h-1 bg-gradient-to-r from-indigo-500 to-transparent"></div>
        
        <div className="relative z-10 pt-20">
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-sm font-semibold tracking-wide mb-12 shadow-xl">
                <div className="h-2.5 w-2.5 rounded-full bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.8)]"></div>
                REVIEWFLOW INTELLIGENCE
            </div>
            <h1 className="text-7xl font-extrabold tracking-tight leading-none mb-8 text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400">
                {title}
            </h1>
            <p className="text-2xl text-indigo-200 font-light max-w-xl leading-relaxed border-l-4 border-indigo-500 pl-6">
                Analyse de performance, e-réputation et insights stratégiques.
            </p>
        </div>

        <div className="relative z-10 border-t border-white/10 pt-10 flex justify-between items-end">
            <div>
                <p className="text-xs text-slate-400 uppercase tracking-[0.2em] mb-3 font-bold">Préparé pour</p>
                <h3 className="text-4xl font-bold flex items-center gap-3">
                    <div className="h-10 w-1 bg-indigo-500 rounded-full"></div>
                    {orgName}
                </h3>
            </div>
            <div className="text-right">
                <p className="text-xs text-slate-400 uppercase tracking-[0.2em] mb-3 font-bold">Date du rapport</p>
                <h3 className="text-2xl font-medium font-mono text-indigo-100 bg-white/5 px-4 py-2 rounded-lg inline-block border border-white/10">{date}</h3>
            </div>
        </div>
    </div>
));

interface SummaryProps {
    analytics: AnalyticsSummary;
    orgName: string;
    date: string;
    team?: StaffMember[];
    competitors?: Competitor[];
    metrics?: string[];
}

const ReportSummaryTemplate = React.forwardRef<HTMLDivElement, SummaryProps>(({ analytics, orgName, date, team, competitors, metrics }, ref) => (
    <div ref={ref} className="w-[800px] h-[1130px] bg-slate-50 p-12 flex flex-col font-sans text-slate-900">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8 pb-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">R</div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Executive Summary</h2>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">{orgName} • {date}</p>
                </div>
            </div>
            <div className="px-4 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-500 shadow-sm">
                Confidentiel
            </div>
        </div>

        {/* 1. KPIs Grid (Always Visible) */}
        <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-indigo-600">
                    <Award className="h-4 w-4"/>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Note Moyenne</span>
                </div>
                <div className="text-4xl font-extrabold text-slate-900 mb-1">{analytics.average_rating}</div>
                <p className="text-[10px] text-slate-500">Sur {analytics.total_reviews} avis</p>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-emerald-600">
                    <TrendingUp className="h-4 w-4"/>
                    <span className="text-[10px] font-bold uppercase tracking-wider">NPS Score</span>
                </div>
                <div className="text-4xl font-extrabold text-slate-900 mb-1">{analytics.nps_score}</div>
                <p className="text-[10px] text-slate-500">Indice de recommandation</p>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-blue-600">
                    <Users className="h-4 w-4"/>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Volume</span>
                </div>
                <div className="text-4xl font-extrabold text-slate-900 mb-1">{analytics.total_reviews}</div>
                <p className="text-[10px] text-slate-500">Nouveaux avis</p>
            </div>
        </div>

        {/* 2. Sentiment Analysis (Optional) */}
        {metrics?.includes('sentiment') && (
            <div className="mb-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-bold text-slate-900 mb-4 flex items-center gap-2 uppercase tracking-wide">
                    <PieChart className="h-3 w-3 text-indigo-500" /> Répartition du Sentiment
                </h3>
                <div className="flex items-center gap-1 h-8 w-full rounded-lg overflow-hidden mb-3">
                    <div style={{ width: `${analytics.sentiment_distribution.positive * 100}%` }} className="h-full bg-emerald-500"></div>
                    <div style={{ width: `${analytics.sentiment_distribution.neutral * 100}%` }} className="h-full bg-amber-400"></div>
                    <div style={{ width: `${analytics.sentiment_distribution.negative * 100}%` }} className="h-full bg-rose-500"></div>
                </div>
                <div className="flex justify-between px-1">
                    <div className="text-center">
                        <div className="text-lg font-bold text-emerald-600">{Math.round(analytics.sentiment_distribution.positive * 100)}%</div>
                        <div className="text-[9px] text-slate-400 uppercase font-bold">Positif</div>
                    </div>
                    <div className="text-center">
                        <div className="text-lg font-bold text-amber-500">{Math.round(analytics.sentiment_distribution.neutral * 100)}%</div>
                        <div className="text-[9px] text-slate-400 uppercase font-bold">Neutre</div>
                    </div>
                    <div className="text-center">
                        <div className="text-lg font-bold text-rose-500">{Math.round(analytics.sentiment_distribution.negative * 100)}%</div>
                        <div className="text-[9px] text-slate-400 uppercase font-bold">Négatif</div>
                    </div>
                </div>
            </div>
        )}

        <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
            {/* 3. Top Staff (Optional) */}
            {metrics?.includes('staff_ranking') && team && team.length > 0 && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                    <h4 className="font-bold text-indigo-700 mb-3 text-xs uppercase tracking-wide flex items-center gap-2">
                        <Users className="h-3 w-3" /> Top Collaborateurs
                    </h4>
                    <ul className="space-y-3">
                        {team.sort((a,b) => b.reviews_count - a.reviews_count).slice(0, 4).map((member, i) => (
                            <li key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700">{i+1}</div>
                                    <span className="text-sm font-medium text-slate-700">{member.name}</span>
                                </div>
                                <div className="text-xs font-bold text-slate-900">{member.reviews_count} avis</div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* 4. Competitors (Optional) */}
            {metrics?.includes('competitors') && competitors && competitors.length > 0 && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                    <h4 className="font-bold text-rose-700 mb-3 text-xs uppercase tracking-wide flex items-center gap-2">
                        <Target className="h-3 w-3" /> Veille Concurrentielle
                    </h4>
                    <ul className="space-y-3">
                        {competitors.slice(0, 4).map((comp, i) => (
                            <li key={i} className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-700 truncate max-w-[120px]">{comp.name}</span>
                                <div className="flex items-center gap-2">
                                    <div className="text-xs font-bold text-slate-900">{comp.rating}★</div>
                                    <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                        <div className={`h-full ${comp.rating >= 4.5 ? 'bg-green-500' : 'bg-amber-400'}`} style={{ width: `${(comp.rating / 5) * 100}%` }}></div>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            
            {/* 5. Semantic Themes (Fallback if space) */}
            {!metrics?.includes('staff_ranking') && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                    <h4 className="font-bold text-emerald-700 mb-3 text-xs uppercase tracking-wide flex items-center gap-2">
                        <TrendingUp className="h-3 w-3" /> Points Forts (IA)
                    </h4>
                    <ul className="space-y-2">
                        {analytics.top_themes_positive.slice(0, 4).map((t, i) => (
                            <li key={i}>
                                <div className="flex justify-between text-xs mb-1 font-medium text-slate-700">
                                    <span className="capitalize">{t.name}</span>
                                    <span>{Math.round(t.weight * 100)}%</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1">
                                    <div className="bg-emerald-500 h-1 rounded-full" style={{ width: `${t.weight * 100}%` }}></div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
        
        <div className="mt-auto pt-6 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400 font-medium uppercase tracking-widest">
            <span>Reviewflow Analytics</span>
            <span>Page 1 / 1</span>
        </div>
    </div>
));

// --- WIZARD COMPONENT ---
const ReportWizard = ({ onClose, onComplete, team, locations }: { onClose: () => void, onComplete: (config: Partial<ReportConfig>) => void, team: User[], locations: any[] }) => {
    const [step, setStep] = useState(1);
    
    // Default Configuration
    const [config, setConfig] = useState<Partial<ReportConfig>>({
        name: '',
        format: 'pdf',
        metrics: ['reviews_count', 'rating_avg', 'sentiment'],
        enabled: true,
        scope: 'all',
        location_ids: [],
        schedule: {
            frequency: 'monthly',
            day: 1, // 1st of month
            time: '09:00'
        },
        distribution: {
            roles: [],
            userIds: [],
            emails: []
        }
    });
    
    const [emailInput, setEmailInput] = useState('');

    const handleNext = () => setStep(step + 1);
    const handleBack = () => setStep(step - 1);

    const handleAddExternalEmail = () => {
        if (emailInput && emailInput.includes('@') && !config.distribution?.emails.includes(emailInput)) {
            setConfig(prev => ({
                ...prev,
                distribution: {
                    ...prev.distribution!,
                    emails: [...(prev.distribution?.emails || []), emailInput]
                }
            }));
            setEmailInput('');
        }
    };

    const removeEmail = (email: string) => {
        setConfig(prev => ({
            ...prev,
            distribution: {
                ...prev.distribution!,
                emails: prev.distribution?.emails.filter(e => e !== email) || []
            }
        }));
    };

    const toggleMetric = (metric: string) => {
        const current = config.metrics || [];
        if (current.includes(metric)) {
            setConfig(prev => ({ ...prev, metrics: current.filter(m => m !== metric) }));
        } else {
            setConfig(prev => ({ ...prev, metrics: [...current, metric] }));
        }
    };

    const toggleLocation = (locId: string) => {
        const current = config.location_ids || [];
        if (current.includes(locId)) {
            setConfig(prev => ({ ...prev, location_ids: current.filter(l => l !== locId) }));
        } else {
            setConfig(prev => ({ ...prev, location_ids: [...current, locId] }));
        }
    };

    const toggleRole = (role: string) => {
        const current = config.distribution?.roles || [];
        if (current.includes(role)) {
            setConfig(prev => ({
                ...prev,
                distribution: { ...prev.distribution!, roles: current.filter(r => r !== role) }
            }));
        } else {
            setConfig(prev => ({
                ...prev,
                distribution: { ...prev.distribution!, roles: [...current, role] }
            }));
        }
    };

    const toggleUser = (userId: string) => {
        const current = config.distribution?.userIds || [];
        if (current.includes(userId)) {
            setConfig(prev => ({
                ...prev,
                distribution: { ...prev.distribution!, userIds: current.filter(u => u !== userId) }
            }));
        } else {
            setConfig(prev => ({
                ...prev,
                distribution: { ...prev.distribution!, userIds: [...current, userId] }
            }));
        }
    };

    const isStepValid = () => {
        if (step === 1) {
            if (!config.name || !config.schedule?.frequency) return false;
            if (config.scope === 'custom' && (config.location_ids?.length || 0) === 0) return false;
            return true;
        }
        if (step === 2) return (config.metrics?.length || 0) > 0;
        if (step === 3) {
            const hasRoles = (config.distribution?.roles.length || 0) > 0;
            const hasUsers = (config.distribution?.userIds.length || 0) > 0;
            const hasEmails = (config.distribution?.emails.length || 0) > 0;
            return hasRoles || hasUsers || hasEmails;
        }
        return true;
    };

    const updateSchedule = (field: string, value: any) => {
        setConfig(prev => ({
            ...prev,
            schedule: { ...prev.schedule!, [field]: value }
        }));
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <Card className="w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Nouveau Rapport Automatique</h2>
                        <div className="flex gap-1 mt-1">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className={`h-1 w-8 rounded-full ${step >= i ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>
                            ))}
                        </div>
                    </div>
                    <button onClick={onClose}><X className="h-5 w-5 text-slate-400 hover:text-slate-600" /></button>
                </div>

                <div className="p-6 md:p-8 flex-1 overflow-y-auto">
                    
                    {/* STEP 1: CONFIGURATION & SCHEDULE */}
                    {step === 1 && (
                        <div className="space-y-6 animate-in slide-in-from-right-8">
                            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <Clock className="h-5 w-5 text-indigo-600" />
                                1. Configuration Générale
                            </h3>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nom du rapport</label>
                                <Input 
                                    placeholder="Ex: Bilan Hebdo Direction" 
                                    value={config.name} 
                                    onChange={e => setConfig({ ...config, name: e.target.value })} 
                                    autoFocus
                                />
                            </div>

                            {/* PERIMETRE */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Périmètre (Établissements)</label>
                                <div className="flex gap-4 mb-4">
                                    <label className={`flex-1 p-3 border rounded-xl cursor-pointer flex items-center justify-between ${config.scope === 'all' ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'border-slate-200 hover:border-slate-300'}`}>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${config.scope === 'all' ? 'border-indigo-600' : 'border-slate-400'}`}>
                                                {config.scope === 'all' && <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>}
                                            </div>
                                            <span className="font-bold text-sm text-slate-700">Tous les établissements</span>
                                        </div>
                                        <input type="radio" className="hidden" name="scope" checked={config.scope === 'all'} onChange={() => setConfig({...config, scope: 'all'})} />
                                    </label>
                                    <label className={`flex-1 p-3 border rounded-xl cursor-pointer flex items-center justify-between ${config.scope === 'custom' ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'border-slate-200 hover:border-slate-300'}`}>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${config.scope === 'custom' ? 'border-indigo-600' : 'border-slate-400'}`}>
                                                {config.scope === 'custom' && <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>}
                                            </div>
                                            <span className="font-bold text-sm text-slate-700">Sélection manuelle</span>
                                        </div>
                                        <input type="radio" className="hidden" name="scope" checked={config.scope === 'custom'} onChange={() => setConfig({...config, scope: 'custom'})} />
                                    </label>
                                </div>

                                {config.scope === 'custom' && (
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-40 overflow-y-auto">
                                        {locations.map(loc => (
                                            <label key={loc.id} className="flex items-center gap-3 p-2 hover:bg-white rounded cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={config.location_ids?.includes(loc.id)} 
                                                    onChange={() => toggleLocation(loc.id)}
                                                    className="rounded text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span className="text-sm text-slate-700">{loc.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Fréquence d'envoi</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {[
                                        { id: 'weekly', label: 'Hebdomadaire' },
                                        { id: 'monthly', label: 'Mensuel' },
                                        { id: 'quarterly', label: 'Trimestriel' },
                                        { id: 'custom', label: 'Personnalisé' }
                                    ].map(opt => (
                                        <button 
                                            key={opt.id}
                                            onClick={() => updateSchedule('frequency', opt.id)}
                                            className={`p-3 rounded-lg border text-sm font-medium transition-all ${config.schedule?.frequency === opt.id ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Detailed Scheduling */}
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-2 gap-4">
                                {config.schedule?.frequency === 'weekly' && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Jour de la semaine</label>
                                        <Select 
                                            value={config.schedule?.day || 1} 
                                            onChange={e => updateSchedule('day', parseInt(e.target.value))}
                                        >
                                            <option value={1}>Lundi</option>
                                            <option value={2}>Mardi</option>
                                            <option value={3}>Mercredi</option>
                                            <option value={4}>Jeudi</option>
                                            <option value={5}>Vendredi</option>
                                            <option value={6}>Samedi</option>
                                            <option value={0}>Dimanche</option>
                                        </Select>
                                    </div>
                                )}

                                {(config.schedule?.frequency === 'monthly' || config.schedule?.frequency === 'quarterly') && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Jour du mois</label>
                                        <Select 
                                            value={config.schedule?.day || 1} 
                                            onChange={e => updateSchedule('day', parseInt(e.target.value))}
                                        >
                                            <option value={1}>Le 1er du mois</option>
                                            <option value={15}>Le 15 du mois</option>
                                            <option value={-1}>Le dernier jour du mois</option>
                                        </Select>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Heure d'envoi</label>
                                    <Input 
                                        type="time" 
                                        value={config.schedule?.time} 
                                        onChange={e => updateSchedule('time', e.target.value)} 
                                        className="bg-white"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: CONTENT */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-8">
                            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <FileText className="h-5 w-5 text-indigo-600" />
                                2. Contenu du rapport
                            </h3>
                            <p className="text-sm text-slate-500">Sélectionnez les blocs de données à inclure.</p>
                            
                            <div className="space-y-3">
                                {[
                                    { id: 'reviews_count', label: 'Volume & Évolution', icon: BarChart3 },
                                    { id: 'rating_avg', label: 'Note Moyenne & NPS', icon: Award },
                                    { id: 'sentiment', label: 'Analyse Sentiment (IA)', icon: PieChart },
                                    { id: 'verbatims', label: 'Verbatims Clés', icon: FileText },
                                    { id: 'staff_ranking', label: 'Classement Équipe', icon: Users },
                                    { id: 'competitors', label: 'Comparatif Concurrents', icon: Target },
                                ].map(m => (
                                    <div 
                                        key={m.id}
                                        onClick={() => toggleMetric(m.id)}
                                        className={`flex items-center p-4 rounded-xl border cursor-pointer transition-all ${config.metrics?.includes(m.id) ? 'border-indigo-600 bg-indigo-50 shadow-sm' : 'border-slate-200 hover:bg-slate-50'}`}
                                    >
                                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center mr-4 ${config.metrics?.includes(m.id) ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                                            <m.icon className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1">
                                            <div className={`font-bold ${config.metrics?.includes(m.id) ? 'text-indigo-900' : 'text-slate-700'}`}>{m.label}</div>
                                        </div>
                                        {config.metrics?.includes(m.id) && <Check className="h-5 w-5 text-indigo-600" />}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* STEP 3: DISTRIBUTION */}
                    {step === 3 && (
                        <div className="space-y-8 animate-in slide-in-from-right-8">
                            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <Users className="h-5 w-5 text-indigo-600" />
                                3. Destinataires
                            </h3>
                            
                            {/* A. Rôles */}
                            <div>
                                <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide flex items-center gap-2">
                                    <Shield className="h-4 w-4" /> Par Rôle
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {['admin', 'manager', 'editor'].map(role => (
                                        <button 
                                            key={role}
                                            onClick={() => toggleRole(role)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${config.distribution?.roles.includes(role) ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                                        >
                                            {role === 'admin' ? 'Administrateurs' : role === 'manager' ? 'Managers' : 'Éditeurs'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* B. Membres Spécifiques */}
                            <div>
                                <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide flex items-center gap-2">
                                    <UserIcon className="h-4 w-4" /> Membres Spécifiques
                                </h4>
                                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                                    {team.map(user => (
                                        <div 
                                            key={user.id} 
                                            onClick={() => toggleUser(user.id)}
                                            className={`flex items-center gap-3 p-3 cursor-pointer border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors ${config.distribution?.userIds.includes(user.id) ? 'bg-indigo-50/50' : 'bg-white'}`}
                                        >
                                            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${config.distribution?.userIds.includes(user.id) ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                                {user.name.charAt(0)}
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-sm font-medium text-slate-900">{user.name}</div>
                                                <div className="text-xs text-slate-500">{user.email}</div>
                                            </div>
                                            {config.distribution?.userIds.includes(user.id) && <Check className="h-4 w-4 text-indigo-600" />}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* C. Emails Externes */}
                            <div>
                                <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide flex items-center gap-2">
                                    <Mail className="h-4 w-4" /> Externes
                                </h4>
                                <div className="flex gap-2 mb-3">
                                    <Input 
                                        placeholder="investisseur@partner.com" 
                                        value={emailInput}
                                        onChange={e => setEmailInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddExternalEmail()}
                                        className="text-sm"
                                    />
                                    <Button onClick={handleAddExternalEmail} disabled={!emailInput.includes('@')} size="sm">Ajouter</Button>
                                </div>
                                
                                <div className="flex flex-wrap gap-2">
                                    {config.distribution?.emails.map(email => (
                                        <Badge key={email} variant="neutral" className="pl-3 pr-2 py-1 flex items-center gap-2 bg-slate-100">
                                            {email}
                                            <button onClick={() => removeEmail(email)} className="hover:text-red-500">
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: RECAP & VALIDATION */}
                    {step === 4 && (
                        <div className="space-y-6 animate-in slide-in-from-right-8">
                            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <Check className="h-5 w-5 text-indigo-600" />
                                4. Récapitulatif
                            </h3>
                            
                            <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                                <div className="p-4 border-b border-slate-200 bg-slate-100/50">
                                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Résumé de la configuration</h4>
                                </div>
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                                    <div>
                                        <p className="text-slate-500 text-xs uppercase font-bold mb-1">Informations</p>
                                        <p className="font-bold text-slate-900 mb-4 text-base">{config.name}</p>
                                        
                                        <p className="text-slate-500 text-xs uppercase font-bold mb-1">Périmètre</p>
                                        <p className="text-slate-900 mb-4 flex items-center gap-1">
                                            <MapPin className="h-3 w-3 text-slate-400" />
                                            {config.scope === 'all' ? 'Tous les établissements' : `${config.location_ids?.length} établissement(s) sélectionné(s)`}
                                        </p>

                                        <p className="text-slate-500 text-xs uppercase font-bold mb-1">Programmation</p>
                                        <p className="text-slate-900 flex items-center gap-1">
                                            <Clock className="h-3 w-3 text-slate-400" />
                                            <span className="capitalize">{config.schedule?.frequency}</span> • {config.schedule?.time}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 text-xs uppercase font-bold mb-1">Contenu</p>
                                        <div className="flex flex-wrap gap-1 mb-4">
                                            {config.metrics?.map(m => (
                                                <Badge key={m} variant="neutral" className="text-[10px] bg-white border">{m}</Badge>
                                            ))}
                                        </div>

                                        <p className="text-slate-500 text-xs uppercase font-bold mb-1">Destinataires</p>
                                        <div className="flex flex-wrap gap-1">
                                            {config.distribution?.roles.map(r => <Badge key={r} className="bg-purple-100 text-purple-800">{r}</Badge>)}
                                            {config.distribution?.userIds.length > 0 && <Badge className="bg-indigo-100 text-indigo-800">{config.distribution.userIds.length} membres</Badge>}
                                            {config.distribution?.emails.length > 0 && <Badge className="bg-slate-200 text-slate-700">{config.distribution.emails.length} externes</Badge>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-3">Format du rapport</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button 
                                        onClick={() => setConfig({ ...config, format: 'pdf' })}
                                        className={`p-4 rounded-xl border flex items-center gap-3 transition-all ${config.format === 'pdf' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}
                                    >
                                        <FileText className="h-5 w-5" />
                                        <span className="font-bold">PDF (Présentation)</span>
                                    </button>
                                    <button 
                                        onClick={() => setConfig({ ...config, format: 'csv' })}
                                        className={`p-4 rounded-xl border flex items-center gap-3 transition-all ${config.format === 'csv' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}
                                    >
                                        <Layout className="h-5 w-5" />
                                        <span className="font-bold">CSV (Data)</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-100 flex justify-between bg-slate-50">
                    <Button variant="ghost" onClick={step === 1 ? onClose : handleBack}>
                        {step === 1 ? 'Annuler' : 'Précédent'}
                    </Button>
                    <Button 
                        onClick={step === 4 ? () => onComplete(config) : handleNext} 
                        disabled={!isStepValid()}
                        className={step === 4 ? "bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200" : ""}
                    >
                        {step === 4 ? 'Confirmer & Programmer' : 'Suivant'} {step !== 4 && <ChevronRight className="h-4 w-4 ml-1" />}
                    </Button>
                </div>
            </Card>
        </div>
    );
};

// --- HISTORY TABLE ---
const ReportHistoryTable = ({ history }: { history: ReportHistoryItem[] }) => {
    if (history.length === 0) return (
        <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
            <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Aucun rapport envoyé pour le moment.</p>
        </div>
    );

    return (
        <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm">
            <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50/80">
                    <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Date d'envoi</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Établissements</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Destinataires</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Statut</th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                    {history.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                {new Date(log.date).toLocaleDateString()} <span className="text-slate-400 text-xs">{new Date(log.date).toLocaleTimeString()}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 capitalize">
                                {log.type}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-slate-400"/> {log.locations_count}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                {log.recipient_count}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <Badge variant={log.status === 'success' ? 'success' : 'error'}>{log.status === 'success' ? 'Envoyé' : 'Échec'}</Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                <Button size="xs" variant="outline" icon={Eye} disabled={log.status === 'failure'}>Voir</Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export const ReportsPage = () => {
  const [reports, setReports] = useState<ReportConfig[]>([]);
  const [org, setOrg] = useState<Organization | null>(null);
  const [team, setTeam] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'config' | 'history'>('config');
  const toast = useToast();
  
  // Refs for Image Generation (Hidden)
  const coverRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const [generatingData, setGeneratingData] = useState<{title: string, date: string, orgName: string, analytics: AnalyticsSummary | null, team?: StaffMember[], competitors?: Competitor[], metrics?: string[]} | null>(null);
  
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    // Initial fetch
    const init = async () => {
        const [organization, teamMembers] = await Promise.all([
            api.organization.get(),
            api.team.list()
        ]);
        setOrg(organization);
        setTeam(teamMembers);
        
        // Mock data for demo UI
        setReports([
          {
            id: 'rep1',
            name: 'Rapport Mensuel Performance',
            format: 'pdf',
            enabled: true,
            last_sent: '2023-10-01',
            last_run_status: 'success',
            schedule: {
                frequency: 'monthly',
                day: 1,
                time: '08:00'
            },
            distribution: {
                roles: ['admin'],
                userIds: [],
                emails: []
            },
            metrics: ['reviews_count', 'rating_avg', 'sentiment', 'staff_ranking'],
            scope: 'all',
            history: [
                { id: 'h1', date: '2023-10-01T08:00:00Z', status: 'success', recipient_count: 3, type: 'Mensuel', locations_count: 3 },
                { id: 'h2', date: '2023-09-01T08:00:00Z', status: 'success', recipient_count: 3, type: 'Mensuel', locations_count: 3 }
            ]
          }
        ]);
    };
    init();
  }, []);

  const handleCreateComplete = (config: Partial<ReportConfig>) => {
      const newReport: ReportConfig = {
          id: 'rep-' + Date.now(),
          name: config.name || 'Nouveau Rapport',
          format: config.format as any,
          enabled: true,
          last_sent: '-',
          metrics: config.metrics,
          schedule: config.schedule!,
          distribution: config.distribution!,
          scope: config.scope as any,
          location_ids: config.location_ids,
          history: []
      };
      setReports([...reports, newReport]);
      setShowWizard(false);
      toast.success("Rapport programmé avec succès !");
  };

  const handleToggle = (id: string) => {
      setReports(reports.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const handleDelete = (id: string) => {
      if(confirm("Êtes-vous sûr de vouloir supprimer ce rapport ?")) {
          setReports(reports.filter(r => r.id !== id));
          toast.success("Rapport supprimé");
      }
  };

  const handleSendNow = async (report: ReportConfig) => {
      toast.info("Génération et envoi en cours...");
      try {
          // Trigger backend logic
          await api.reports.trigger(report.id);
          // Simulate update
          const newHistoryItem: ReportHistoryItem = {
              id: 'h-' + Date.now(),
              date: new Date().toISOString(),
              status: 'success',
              recipient_count: report.distribution.roles.length + report.distribution.emails.length,
              type: 'Ponctuel',
              locations_count: report.scope === 'all' ? 10 : report.location_ids?.length || 0
          };
          setReports(reports.map(r => r.id === report.id ? { ...r, history: [newHistoryItem, ...(r.history || [])] } : r));
          toast.success("Rapport envoyé aux destinataires !");
      } catch (e) {
          console.error(e);
          toast.error("Erreur lors de l'envoi");
      }
  };

  const handleDownload = async (reportName: string, metrics: string[] = []) => {
      toast.info("Génération du rapport Premium...");
      
      try {
          // Fetch parallel data
          const [orgData, analyticsData, reviewsData, teamData, competitorsData] = await Promise.all([
              api.organization.get(),
              api.analytics.getOverview(),
              api.reviews.list({ status: 'all' }),
              metrics.includes('staff_ranking') ? api.team.list() : Promise.resolve([]),
              metrics.includes('competitors') ? api.competitors.list() : Promise.resolve([])
          ]);

          // 1. Prepare data for the hidden DOM nodes
          setGeneratingData({
              title: reportName,
              date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
              orgName: orgData?.name || 'Mon Entreprise',
              analytics: analyticsData,
              team: teamData as StaffMember[],
              competitors: competitorsData as Competitor[],
              metrics: metrics
          });

          // Allow DOM to render hidden elements
          await new Promise(resolve => setTimeout(resolve, 500));

          const doc = new jsPDF('p', 'mm', 'a4');
          const width = doc.internal.pageSize.getWidth();
          const height = doc.internal.pageSize.getHeight();

          // 2. Capture Cover Page (From React Component)
          if (coverRef.current) {
              const coverImg = await toPng(coverRef.current, { cacheBust: true, pixelRatio: 2 });
              doc.addImage(coverImg, 'PNG', 0, 0, width, height);
          }

          // 3. Capture Summary Page (From React Component)
          if (summaryRef.current) {
              doc.addPage();
              const summaryImg = await toPng(summaryRef.current, { cacheBust: true, pixelRatio: 2 });
              doc.addImage(summaryImg, 'PNG', 0, 0, width, height);
          }

          // 4. Standard Data Tables (using AutoTable for multi-page overflow support)
          doc.addPage();
          doc.setFontSize(18);
          doc.setTextColor(30, 41, 59);
          doc.text("Détail des Avis", 14, 20);
          doc.setFontSize(10);
          doc.setTextColor(100);
          doc.text("Liste exhaustive des derniers retours clients.", 14, 26);

          const tableData = reviewsData.slice(0, 50).map(r => [
              new Date(r.received_at).toLocaleDateString(),
              r.source,
              `${r.rating}/5`,
              r.author_name,
              r.body.substring(0, 80) + (r.body.length > 80 ? '...' : '')
          ]);

          autoTable(doc, {
              startY: 35,
              head: [['Date', 'Source', 'Note', 'Client', 'Commentaire']],
              body: tableData,
              styles: { fontSize: 9, cellPadding: 4 },
              headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
              alternateRowStyles: { fillColor: [248, 250, 252] },
              columnStyles: {
                  4: { cellWidth: 'auto' } // Auto width for comment
              }
          });

          // Footer with Page Numbers
          const pageCount = (doc as any).internal.getNumberOfPages();
          for(let i = 1; i <= pageCount; i++) {
              doc.setPage(i);
              // Don't put footer on cover
              if (i > 1) {
                  doc.setFontSize(8);
                  doc.setTextColor(150);
                  doc.text(`Reviewflow Report - Page ${i} / ${pageCount}`, width - 20, height - 10, { align: 'right' });
              }
          }

          doc.save(`Reviewflow_${reportName.replace(/\s/g, '_')}.pdf`);
          toast.success("Rapport téléchargé !");

      } catch (e) {
          console.error(e);
          toast.error("Erreur lors de la génération du PDF");
      } finally {
          // Clean up hidden DOM
          setGeneratingData(null);
      }
  };

  // PAYWALL: Block Free AND Starter plans
  if (org && (org.subscription_plan === 'free' || org.subscription_plan === 'starter')) {
      return (
          <div className="max-w-6xl mx-auto mt-8 px-4">
              <div className="mb-8">
                  <h1 className="text-2xl font-bold text-slate-900">Rapports Automatisés</h1>
                  <p className="text-slate-500">Envoyez des PDF professionnels à votre direction chaque lundi.</p>
              </div>
              <ProLock 
                  title="Débloquez le Reporting" 
                  description="Générez des rapports PDF en marque blanche, planifiez des envois automatiques et analysez votre ROI."
              >
                  <div className="opacity-50 pointer-events-none filter blur-sm">
                      <div className="space-y-4">
                          {[1, 2, 3].map(i => (
                              <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 h-24"></div>
                          ))}
                      </div>
                  </div>
              </ProLock>
          </div>
      );
  }

  // Aggregate History for all reports
  const fullHistory = reports.flatMap(r => r.history || []).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 pb-20">
      
      {/* HIDDEN TEMPLATES FOR PDF GENERATION */}
      <div className="fixed top-0 left-0 overflow-hidden pointer-events-none opacity-0" style={{ zIndex: -1000 }}>
          {generatingData && (
              <>
                  <ReportCoverTemplate 
                      ref={coverRef}
                      title={generatingData.title}
                      date={generatingData.date}
                      orgName={generatingData.orgName}
                  />
                  {generatingData.analytics && (
                      <ReportSummaryTemplate 
                          ref={summaryRef}
                          analytics={generatingData.analytics}
                          orgName={generatingData.orgName}
                          date={generatingData.date}
                          team={generatingData.team}
                          competitors={generatingData.competitors}
                          metrics={generatingData.metrics}
                      />
                  )}
              </>
          )}
      </div>

      {showWizard && <ReportWizard onClose={() => setShowWizard(false)} onComplete={handleCreateComplete} team={team} locations={org?.locations || []} />}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              Rapports
              <Badge variant="pro">GROWTH</Badge>
          </h1>
          <p className="text-slate-500">Génération et envoi automatique de documents PDF.</p>
        </div>
        <Button icon={Plus} onClick={() => setShowWizard(true)} className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg">
            Créer un rapport
        </Button>
      </div>

      {/* TABS */}
      <div className="mb-6 flex border-b border-slate-200">
          <button 
              onClick={() => setActiveTab('config')} 
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'config' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
          >
              Rapports Programmés
          </button>
          <button 
              onClick={() => setActiveTab('history')} 
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'history' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
          >
              Historique d'envoi
          </button>
      </div>

      {activeTab === 'history' ? (
          <ReportHistoryTable history={fullHistory} />
      ) : (
          <>
            {/* MOBILE LIST VIEW */}
            <div className="md:hidden space-y-4">
                {reports.map(report => (
                    <Card key={report.id} className="border border-slate-200">
                        <CardContent className="p-5">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center ${report.format === 'pdf' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                        {report.format === 'pdf' ? <FileText className="h-5 w-5" /> : <Layout className="h-5 w-5" />}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 text-sm line-clamp-1">{report.name}</h4>
                                        <div className="text-xs text-slate-500 capitalize">{report.schedule.frequency}</div>
                                    </div>
                                </div>
                                <Toggle checked={report.enabled} onChange={() => handleToggle(report.id)} />
                            </div>
                            
                            <div className="flex flex-wrap gap-2 mb-4">
                                <Badge variant="neutral" className="text-[10px] uppercase tracking-wider">{report.format}</Badge>
                                <Badge variant="neutral" className="text-[10px] flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> {report.schedule.time}
                                </Badge>
                                <Badge variant="neutral" className="bg-slate-50 text-slate-600 text-[10px]">
                                    { (report.distribution.roles.length + report.distribution.userIds.length + report.distribution.emails.length) } destinataires
                                </Badge>
                            </div>

                            <div className="flex gap-2 pt-4 border-t border-slate-100">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="flex-1 text-slate-600" 
                                    icon={Download} 
                                    onClick={() => handleDownload(report.name, report.metrics)}
                                >
                                    PDF
                                </Button>
                                <Button 
                                    variant="outline"
                                    size="sm"
                                    className="px-3 text-indigo-600 hover:text-indigo-700"
                                    onClick={() => handleSendNow(report)}
                                >
                                    <SendIcon className="h-4 w-4" />
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 px-3" 
                                    onClick={() => handleDelete(report.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* DESKTOP TABLE VIEW */}
            <Card className="hidden md:block overflow-hidden border-slate-200 shadow-sm">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50/80">
                        <tr>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Rapport</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Fréquence</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Destinataires</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Dernier envoi</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Statut</th>
                        <th scope="col" className="relative px-6 py-4"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                        {reports.map((report) => (
                        <tr key={report.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                                <div className={`flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center ${report.format === 'pdf' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                    {report.format === 'pdf' ? <FileText className="h-5 w-5" /> : <Layout className="h-5 w-5" />}
                                </div>
                                <div className="ml-4">
                                <div className="text-sm font-bold text-slate-900">{report.name}</div>
                                <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                    {report.scope === 'all' ? 'Tous sites' : `${report.location_ids?.length} sites`}
                                </div>
                                </div>
                            </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-900 capitalize font-medium">{report.schedule.frequency}</div>
                            <div className="text-xs text-slate-500">
                                {report.schedule.day ? `Le ${report.schedule.day}` : ''} à {report.schedule.time}
                            </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex -space-x-2">
                                    {report.distribution.roles.length > 0 && (
                                        <div className="h-8 w-8 rounded-full bg-purple-100 border-2 border-white flex items-center justify-center text-xs font-bold text-purple-700" title="Roles">
                                            R
                                        </div>
                                    )}
                                    {report.distribution.emails.length > 0 && (
                                        <div className="h-8 w-8 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-xs font-bold text-blue-700" title="Emails Externes">
                                            @
                                        </div>
                                    )}
                                    {(report.distribution.roles.length + report.distribution.emails.length + report.distribution.userIds.length) > 2 && (
                                        <div className="h-8 w-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-xs font-bold text-slate-500">
                                            +{(report.distribution.roles.length + report.distribution.emails.length + report.distribution.userIds.length) - 2}
                                        </div>
                                    )}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">
                            {report.last_sent || 'Jamais'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                            <Toggle checked={report.enabled} onChange={() => handleToggle(report.id)} />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors" onClick={() => handleSendNow(report)} title="Envoyer maintenant">
                                        <SendIcon className="h-4 w-4" />
                                    </button>
                                    <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors" onClick={() => handleDownload(report.name, report.metrics)} title="Télécharger">
                                        <Download className="h-4 w-4" />
                                    </button>
                                    <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" onClick={() => handleDelete(report.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                        ))}
                        {reports.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-400 bg-slate-50/50">
                                    Aucun rapport programmé. Commencez par en créer un.
                                </td>
                            </tr>
                        )}
                    </tbody>
                    </table>
                </div>
            </Card>
          </>
      )}
    </div>
  );
};