
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, useToast } from '../components/ui';
import { Search, Video, ChevronRight, PlayCircle, ExternalLink, HelpCircle, Mail, FileText, Settings, Zap } from 'lucide-react';

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

const FAQItem = ({ question, answer }: { question: string, answer: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-slate-100 last:border-0">
            <button 
                className="w-full text-left py-4 flex justify-between items-center text-slate-900 font-medium hover:text-indigo-600 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                {question}
                <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            </button>
            {isOpen && (
                <div className="pb-4 text-sm text-slate-600 leading-relaxed animate-in slide-in-from-top-2">
                    {answer}
                </div>
            )}
        </div>
    );
};

const FAQ_DATA = [
    {
        question: "Combien de temps l'IA met-elle à répondre ?",
        answer: "L'IA génère un brouillon instantanément. Si vous avez activé le mode automatique, la réponse est publiée sur Google sous 5 à 10 minutes après validation ou délai configuré."
    },
    {
        question: "Puis-je modifier une réponse générée par l'IA ?",
        answer: "Absolument. Vous pouvez éditer n'importe quel brouillon avant de l'envoyer, ou modifier une réponse déjà publiée depuis l'interface."
    },
    {
        question: "Comment ajouter un nouvel établissement ?",
        answer: "Allez dans Paramètres > Établissements, puis cliquez sur 'Ajouter'. Si votre abonnement ne le permet pas, vous serez invité à passer au plan supérieur."
    },
    {
        question: "Mes données sont-elles sécurisées ?",
        answer: "Oui, nous utilisons le chiffrement SSL pour toutes les communications et vos données sont hébergées sur des serveurs sécurisés en Europe."
    }
];

const GUIDES_DATA = [
    { icon: ExternalLink, title: "Connecter sa fiche Google Business", description: "Le guide étape par étape pour synchroniser vos avis et importer l'historique.", category: "Installation" },
    { icon: Settings, title: "Configurer la personnalité de l'IA", description: "Apprenez à donner votre ton unique à l'intelligence artificielle pour des réponses parfaites.", category: "Configuration" },
    { icon: FileText, title: "Générer mon premier rapport PDF", description: "Créez un audit professionnel en un clic pour votre direction.", category: "Reporting" }
];

export const HelpPage = () => {
    const [search, setSearch] = useState('');
    const toast = useToast();
    const [contactMessage, setContactMessage] = useState('');
    
    // Filtered lists
    const filteredGuides = GUIDES_DATA.filter(g => g.title.toLowerCase().includes(search.toLowerCase()) || g.description.toLowerCase().includes(search.toLowerCase()));
    const filteredFaq = FAQ_DATA.filter(f => f.question.toLowerCase().includes(search.toLowerCase()) || f.answer.toLowerCase().includes(search.toLowerCase()));

    const handleContact = (e: React.FormEvent) => {
        e.preventDefault();
        toast.success("Message envoyé au support ! Nous vous répondrons sous 24h.");
        setContactMessage('');
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header with Search */}
            <div className="bg-indigo-600 rounded-2xl p-8 md:p-12 text-center text-white relative overflow-hidden shadow-xl">
                <div className="relative z-10 max-w-2xl mx-auto">
                    <h1 className="text-3xl font-bold mb-4">Centre d'Aide & Support</h1>
                    <p className="text-indigo-100 mb-8 text-lg">Tout ce dont vous avez besoin pour maîtriser Reviewflow.</p>
                    
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Rechercher un article (ex: connecter google, facture...)" 
                            className="w-full pl-12 pr-4 py-4 rounded-xl text-slate-900 placeholder:text-slate-400 shadow-lg focus:outline-none focus:ring-4 focus:ring-indigo-500/30"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
                
                {/* Abstract Shapes */}
                <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-10">
                    
                    {/* Quick Start / Guides */}
                    {filteredGuides.length > 0 && (
                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <Zap className="h-5 w-5 text-amber-500" /> Guides & Tutoriels
                            </h2>
                            <div className="grid grid-cols-1 gap-4">
                                {filteredGuides.map((guide, i) => (
                                    <GuideCard key={i} {...guide} />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Academy - Only show if not searching or if relevant */}
                    {!search && (
                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <Video className="h-5 w-5 text-indigo-600" /> Reviewflow Academy
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <VideoTutorial title="Démo complète de la plateforme en 3 minutes" duration="03:12" />
                                <VideoTutorial title="Comment doubler ses avis Google avec le QR Code" duration="04:45" />
                                <VideoTutorial title="Créer une règle d'automatisation pour les avis négatifs" duration="02:20" />
                                <VideoTutorial title="Gérer plusieurs établissements en équipe" duration="05:10" />
                            </div>
                        </section>
                    )}

                    {/* FAQ */}
                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <HelpCircle className="h-5 w-5 text-slate-600" /> Questions Fréquentes
                        </h2>
                        <Card>
                            <CardContent className="divide-y divide-slate-100">
                                {filteredFaq.length > 0 ? (
                                    filteredFaq.map((item, i) => (
                                        <FAQItem key={i} question={item.question} answer={item.answer} />
                                    ))
                                ) : (
                                    <div className="py-8 text-center text-slate-500">Aucun résultat pour "{search}"</div>
                                )}
                            </CardContent>
                        </Card>
                    </section>
                </div>

                {/* Sidebar (Support Form) */}
                <div className="space-y-6">
                    <Card className="bg-white border-slate-200 shadow-sm sticky top-24">
                        <CardHeader className="bg-slate-50 border-b border-slate-100">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Mail className="h-5 w-5 text-indigo-600" />
                                Contact Support
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <p className="text-sm text-slate-500 mb-4">Notre équipe technique vous répond sous 24h ouvrées.</p>
                            <form onSubmit={handleContact} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Sujet</label>
                                    <Input placeholder="J'ai un problème avec..." required className="bg-slate-50" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Message</label>
                                    <textarea 
                                        className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-32 bg-slate-50 resize-none"
                                        placeholder="Décrivez votre problème en détail..."
                                        value={contactMessage}
                                        onChange={(e) => setContactMessage(e.target.value)}
                                        required
                                    />
                                </div>
                                <Button type="submit" className="w-full shadow-lg shadow-indigo-100">Envoyer au support</Button>
                            </form>
                            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
                                <p className="text-xs text-slate-400 font-medium">support@reviewflow.com</p>
                                <p className="text-[10px] text-slate-300 mt-1">Lundi - Vendredi, 9h - 18h</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};
