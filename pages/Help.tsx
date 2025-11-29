
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, useToast } from '../components/ui';
import { Search, Book, Video, MessageCircle, ChevronRight, PlayCircle, ExternalLink, HelpCircle, Mail } from 'lucide-react';

const GuideCard = ({ icon: Icon, title, description, category }: any) => (
    <div className="group flex items-start gap-4 p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer bg-white">
        <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
            <h4 className="font-semibold text-slate-900 mb-1 group-hover:text-indigo-700">{title}</h4>
            <p className="text-sm text-slate-500 mb-2">{description}</p>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{category}</span>
        </div>
        <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-500 self-center" />
    </div>
);

const VideoTutorial = ({ title, duration, thumbnail }: any) => (
    <div className="relative group rounded-xl overflow-hidden cursor-pointer border border-slate-200">
        <div className="aspect-video bg-slate-900 relative">
            {/* Placeholder for thumbnail */}
            <div className="absolute inset-0 bg-slate-800 flex items-center justify-center group-hover:scale-105 transition-transform duration-700">
                <PlayCircle className="h-12 w-12 text-white/80 group-hover:text-white" />
            </div>
            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                {duration}
            </div>
        </div>
        <div className="p-3 bg-white">
            <h4 className="font-medium text-slate-900 text-sm line-clamp-2">{title}</h4>
        </div>
    </div>
);

export const HelpPage = () => {
    const [search, setSearch] = useState('');
    const toast = useToast();
    const [contactMessage, setContactMessage] = useState('');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        toast.info(`Recherche lancée pour : ${search}`);
    };

    const handleContact = (e: React.FormEvent) => {
        e.preventDefault();
        toast.success("Message envoyé au support ! Nous vous répondrons sous 24h.");
        setContactMessage('');
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header with Search */}
            <div className="bg-indigo-600 rounded-2xl p-8 md:p-12 text-center text-white relative overflow-hidden">
                <div className="relative z-10 max-w-2xl mx-auto">
                    <h1 className="text-3xl font-bold mb-4">Comment pouvons-nous vous aider ?</h1>
                    <p className="text-indigo-100 mb-8 text-lg">Parcourez nos guides, regardez nos tutoriels ou contactez nos experts.</p>
                    
                    <form onSubmit={handleSearch} className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Rechercher un article (ex: connecter google, facture...)" 
                            className="w-full pl-12 pr-4 py-4 rounded-xl text-slate-900 placeholder:text-slate-400 shadow-lg focus:outline-none focus:ring-4 focus:ring-indigo-500/30"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </form>
                </div>
                
                {/* Abstract Shapes */}
                <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Main Content (Guides) */}
                <div className="lg:col-span-2 space-y-8">
                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Book className="h-5 w-5 text-indigo-600" /> Guides Démarrage
                        </h2>
                        <div className="grid grid-cols-1 gap-4">
                            <GuideCard 
                                icon={ExternalLink} 
                                title="Connecter sa fiche Google Business" 
                                description="Le guide étape par étape pour synchroniser vos avis." 
                                category="Installation"
                            />
                            <GuideCard 
                                icon={MessageCircle} 
                                title="Configurer la personnalité de l'IA" 
                                description="Apprenez à donner votre ton unique à l'intelligence artificielle." 
                                category="Configuration"
                            />
                            <GuideCard 
                                icon={HelpCircle} 
                                title="Comprendre les statistiques" 
                                description="Déchiffrez le NPS, le sentiment et les tendances." 
                                category="Analytics"
                            />
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Video className="h-5 w-5 text-indigo-600" /> Tutoriels Vidéo
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <VideoTutorial title="Démo complète de Reviewflow en 3 minutes" duration="03:12" />
                            <VideoTutorial title="Comment générer un QR Code pour votre comptoir" duration="01:45" />
                            <VideoTutorial title="Créer une règle d'automatisation avancée" duration="04:20" />
                            <VideoTutorial title="Inviter votre équipe et gérer les rôles" duration="02:10" />
                        </div>
                    </section>
                </div>

                {/* Sidebar (Support Form) */}
                <div className="space-y-6">
                    <Card className="bg-slate-50 border-indigo-100">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Mail className="h-5 w-5 text-indigo-600" />
                                Contact Support
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleContact} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Sujet</label>
                                    <Input placeholder="J'ai un problème avec..." required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                                    <textarea 
                                        className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-32"
                                        placeholder="Décrivez votre problème en détail..."
                                        value={contactMessage}
                                        onChange={(e) => setContactMessage(e.target.value)}
                                        required
                                    />
                                </div>
                                <Button type="submit" className="w-full">Envoyer au support</Button>
                            </form>
                            <div className="mt-4 pt-4 border-t border-slate-200 text-center text-xs text-slate-500">
                                <p>Email: support@reviewflow.com</p>
                                <p>Du Lundi au Vendredi, 9h-18h</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-indigo-900 text-white border-none">
                        <CardContent className="p-6 text-center">
                            <div className="h-12 w-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <MessageCircle className="h-6 w-6 text-indigo-200" />
                            </div>
                            <h3 className="font-bold text-lg mb-2">Besoin d'un coaching ?</h3>
                            <p className="text-indigo-200 text-sm mb-4">Réservez une session de 15min avec un expert pour optimiser votre compte.</p>
                            <Button variant="secondary" className="w-full bg-white text-indigo-900 hover:bg-indigo-50">Réserver un créneau</Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};
