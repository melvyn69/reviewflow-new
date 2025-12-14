
import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { ClientProgress, Badge as BadgeType, Milestone } from '../types';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '../components/ui';
import { Trophy, Star, CheckCircle2, Lock, Medal, History, Zap, Rocket, Award } from 'lucide-react';
import { useNavigate } from '../components/ui';

const LEVEL_COLORS = {
    'Beginner': 'bg-slate-500',
    'Pro': 'bg-indigo-600',
    'Expert': 'bg-amber-500'
};

const BadgeCard: React.FC<{ badge: BadgeType }> = ({ badge }) => {
    const Icon = {
        User: Star,
        MessageSquare: MessageSquareIcon,
        Star: Star,
        Zap: Zap,
        Share2: Rocket
    }[badge.icon] || Star;

    return (
        <div className={`p-4 rounded-xl border flex items-center gap-4 transition-all ${badge.unlocked ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-60 grayscale'}`}>
            <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${badge.unlocked ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-400'}`}>
                {badge.unlocked ? <Icon className="h-6 w-6" /> : <Lock className="h-5 w-5" />}
            </div>
            <div>
                <h4 className="font-bold text-slate-900 text-sm">{badge.name}</h4>
                <p className="text-xs text-slate-500">{badge.description}</p>
                {!badge.unlocked && <p className="text-[10px] text-indigo-500 mt-1 font-medium">Objectif : {badge.condition_description}</p>}
                {badge.unlocked && <p className="text-[10px] text-green-600 mt-1 font-bold">Débloqué le {new Date(badge.unlocked_at!).toLocaleDateString()}</p>}
            </div>
        </div>
    );
};

// Helper component for icon
const MessageSquareIcon = (props: any) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
);

export const ProgressPage = () => {
    const [progress, setProgress] = useState<ClientProgress | null>(null);
    const [badges, setBadges] = useState<BadgeType[]>([]);
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const load = async () => {
            const [p, b, m] = await Promise.all([
                api.progression.get(),
                api.progression.getBadges(),
                api.progression.getMilestones()
            ]);
            setProgress(p);
            setBadges(b);
            setMilestones(m);
            setLoading(false);
        };
        load();
    }, []);

    if (loading) return <div className="p-8 text-center">Chargement de votre progression...</div>;
    if (!progress) return null;

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20 p-4">
            
            {/* Header Level */}
            <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                    <div className="relative">
                        <div className="w-24 h-24 rounded-full border-4 border-white/20 flex items-center justify-center bg-white/10 backdrop-blur-sm">
                            <Trophy className="h-10 w-10 text-yellow-400" />
                        </div>
                        <div className={`absolute -bottom-2 -right-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${LEVEL_COLORS[progress.level] || 'bg-slate-500'}`}>
                            {progress.level}
                        </div>
                    </div>
                    <div className="text-center md:text-left flex-1">
                        <h1 className="text-3xl font-bold mb-2">Votre Niveau : {progress.level}</h1>
                        <p className="text-indigo-200 mb-4">Score de progression : {progress.score}/100</p>
                        <div className="w-full bg-slate-700/50 h-3 rounded-full overflow-hidden">
                            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-1000" style={{ width: `${progress.score}%` }}></div>
                        </div>
                    </div>
                </div>
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* TIMELINE */}
                <div className="lg:col-span-1">
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <History className="h-5 w-5 text-indigo-600" /> Historique
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="relative pl-4 border-l-2 border-slate-100 space-y-8">
                                {milestones.map((m, i) => (
                                    <div key={m.id} className="relative group">
                                        <div className={`absolute -left-[21px] top-0 h-4 w-4 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${m.type === 'setup' ? 'bg-green-500' : 'bg-indigo-500'}`}>
                                            <CheckCircle2 className="h-3 w-3 text-white" />
                                        </div>
                                        <div>
                                            <span className="text-xs font-mono text-slate-400 block mb-1">{new Date(m.completed_at).toLocaleDateString()}</span>
                                            <h4 className="font-bold text-sm text-slate-800">{m.title}</h4>
                                            <p className="text-xs text-slate-500">{m.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* BADGES */}
                <div className="lg:col-span-2 space-y-6">
                    <h3 className="font-bold text-xl text-slate-900 flex items-center gap-2">
                        <Award className="h-6 w-6 text-amber-500" /> Salle des Trophées
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {badges.map(badge => (
                            <BadgeCard key={badge.id} badge={badge} />
                        ))}
                    </div>

                    {/* Unlocked Features based on Level */}
                    <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100 mt-8">
                        <h4 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
                            <Zap className="h-5 w-5" /> Fonctionnalités Débloquées
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div className={`p-3 rounded bg-white text-center text-sm font-medium ${progress.score >= 0 ? 'text-indigo-600 border-indigo-200 border' : 'text-slate-400 opacity-50'}`}>
                                Réponses IA
                            </div>
                            <div className={`p-3 rounded bg-white text-center text-sm font-medium ${progress.score >= 30 ? 'text-indigo-600 border-indigo-200 border' : 'text-slate-400 opacity-50 grayscale'}`}>
                                Widgets Web
                            </div>
                            <div className={`p-3 rounded bg-white text-center text-sm font-medium ${progress.score >= 60 ? 'text-indigo-600 border-indigo-200 border' : 'text-slate-400 opacity-50 grayscale'}`}>
                                Automatisation
                            </div>
                            <div className={`p-3 rounded bg-white text-center text-sm font-medium ${progress.score >= 80 ? 'text-indigo-600 border-indigo-200 border' : 'text-slate-400 opacity-50 grayscale'}`}>
                                Social Studio
                            </div>
                            <div className={`p-3 rounded bg-white text-center text-sm font-medium ${progress.score >= 90 ? 'text-indigo-600 border-indigo-200 border' : 'text-slate-400 opacity-50 grayscale'}`}>
                                Veille Concurrentielle
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
