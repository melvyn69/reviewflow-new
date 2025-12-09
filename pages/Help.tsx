
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Select, useToast, Badge } from '../components/ui';
import { Search, Video, ChevronRight, PlayCircle, ExternalLink, HelpCircle, Mail, FileText, Settings, Zap, ArrowRight, MessageCircle, Phone, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import { Tutorial, SupportUrgency } from '../types';
import { SupportChatbot } from '../components/SupportChatbot';

// --- COMPONENTS ---

const TutorialCard = ({ tutorial, onClick }: { tutorial: Tutorial, onClick: () => void }) => (
    <div 
        onClick={onClick}
        className="group flex flex-col bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all cursor-pointer overflow-hidden h-full"
    >
        <div className="relative aspect-video bg-slate-900">
            {tutorial.videoUrl ? (
                <div className="absolute inset-0 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                    <PlayCircle className="h-12 w-12 text-white/80 group-hover:text-white" />
                </div>
            ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-indigo-50">
                    <FileText className="h-12 w-12 text-indigo-200" />
                </div>
            )}
            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                {tutorial.duration}
            </div>
        </div>
        <div className="p-4 flex flex-col flex-1">
            <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">{tutorial.category}</span>
            </div>
            <h4 className="font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-indigo-700 transition-colors">{tutorial.title}</h4>
            <p className="text-sm text-slate-500 line-clamp-3 mb-4 flex-1">{tutorial.description}</p>
            <div className="flex items-center text-sm font-medium text-indigo-600 group-hover:translate-x-1 transition-transform">
                Voir le tuto <ArrowRight className="h-4 w-4 ml-1" />
            </div>
        </div>
    </div>
);

const TutorialDetail = ({ tutorial, onBack }: { tutorial: Tutorial, onBack: () => void }) => {
    // Helper to determine if url is Youtube or Loom
    const isLoom = tutorial.videoUrl?.includes('loom.com');
    const isYoutube = tutorial.videoUrl?.includes('youtube.com') || tutorial.videoUrl?.includes('youtu.be');

    return (
        <div className="animate-in slide-in-from-right-8 duration-300">
            <Button variant="ghost" onClick={onBack} className="mb-4 text-slate-500 hover:text-slate-900 pl-0">
                <ChevronRight className="h-4 w-4 rotate-180 mr-1" /> Retour aux tutoriels
            </Button>
            
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-6 md:p-8 border-b border-slate-100">
                    <div className="flex gap-2 mb-3">
                        <Badge variant="neutral">{tutorial.category}</Badge>
                        <Badge variant="neutral" className="bg-indigo-50 text-indigo-700 border-indigo-100">⏱ {tutorial.duration}</Badge>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">{tutorial.title}</h1>
                    <p className="text-slate-600 text-lg">{tutorial.description}</p>
                </div>

                {/* Video Player */}
                {tutorial.videoUrl && (
                    <div className="aspect-video bg-black w-full">
                        {isLoom ? (
                            <iframe 
                                src={tutorial.videoUrl.replace('/share/', '/embed/')} 
                                frameBorder="0" 
                                className="w-full h-full" 
                                allowFullScreen
                            ></iframe>
                        ) : isYoutube ? (
                            <iframe 
                                src={tutorial.videoUrl} 
                                className="w-full h-full" 
                                allowFullScreen
                                title="Tutorial Video"
                            ></iframe>
                        ) : (
                            <div className="flex items-center justify-center h-full text-white">Vidéo non supportée</div>
                        )}
                    </div>
                )}

                <div className="p-6 md:p-8 bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-900 mb-6 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-indigo-600" /> Étapes à suivre
                    </h3>
                    <div className="space-y-6">
                        {tutorial.steps?.map((step, i) => (
                            <div key={i} className="flex gap-4">
                                <div className="flex flex-col items-center">
                                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md shrink-0">
                                        {i + 1}
                                    </div>
                                    {i < (tutorial.steps?.length || 0) - 1 && (
                                        <div className="w-0.5 bg-slate-200 h-full mt-2"></div>
                                    )}
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex-1">
                                    <p className="text-slate-700 leading-relaxed">{step}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const FAQAccordion = ({ items }: { items: { q: string, a: string, cat: string }[] }) => {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <div className="space-y-3">
            {items.map((item, i) => (
                <div key={i} className="border border-slate-200 rounded-xl bg-white overflow-hidden">
                    <button 
                        onClick={() => setOpenIndex(openIndex === i ? null : i)}
                        className="w-full text-left p-4 flex justify-between items-center hover:bg-slate-50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-500 rounded uppercase">{item.cat}</span>
                            <span className="font-medium text-slate-900">{item.q}</span>
                        </div>
                        <ChevronRight className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${openIndex === i ? 'rotate-90' : ''}`} />
                    </button>
                    {openIndex === i && (
                        <div className="p-4 pt-0 text-slate-600 text-sm leading-relaxed border-t border-slate-50 bg-slate-50/30">
                            <div className="mt-4" dangerouslySetInnerHTML={{ __html: item.a }}></div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export const HelpPage = () => {
    const [activeTab, setActiveTab] = useState<'hub' | 'faq' | 'contact'>('hub');
    const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);
    const [tutorials, setTutorials] = useState<Tutorial[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Contact Form State
    const [contactForm, setContactForm] = useState({ name: '', email: '', subject: '', message: '', urgency: 'normal' as SupportUrgency });
    const [sending, setSending] = useState(false);
    
    const toast = useToast();

    useEffect(() => {
        const load = async () => {
            try {
                const data = await api.support.getTutorials();
                setTutorials(data);
                const user = await api.auth.getUser();
                if (user) {
                    setContactForm(prev => ({ ...prev, name: user.name, email: user.email }));
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleSendTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        setSending(true);
        try {
            await api.support.sendTicket(contactForm);
            toast.success("Votre demande a bien été envoyée !");
            setContactForm(prev => ({ ...prev, subject: '', message: '', urgency: 'normal' }));
        } catch (e: any) {
            toast.error("Erreur lors de l'envoi : " + e.message);
        } finally {
            setSending(false);
        }
    };

    const filteredTutorials = tutorials.filter(t => 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const FAQ_ITEMS = [
        { cat: 'Avis', q: "Comment supprimer un avis Google ?", a: "Vous ne pouvez pas supprimer directement un avis. Cependant, vous pouvez le signaler à Google s'il enfreint les règles (conflit d'intérêt, spam, haine). Dans Reviewflow, cliquez sur l'avis > Actions > Signaler." },
        { cat: 'Compte', q: "Comment ajouter un nouvel établissement ?", a: "Allez dans <strong>Paramètres > Établissements</strong>. Cliquez sur 'Ajouter'. Si votre abonnement est limité, vous devrez passer au plan supérieur." },
        { cat: 'IA', q: "Puis-je modifier le style des réponses IA ?", a: "Oui ! Allez dans <strong>Paramètres > Identité IA</strong>. Vous pouvez définir le ton (Amical, Pro...), le vouvoiement/tutoiement et ajouter des mots interdits." },
        { cat: 'Facturation', q: "Où trouver mes factures ?", a: "Toutes vos factures sont disponibles dans l'onglet <strong>Abonnement</strong> en bas de page." },
        { cat: 'Collecte', q: "Mon QR Code ne fonctionne pas", a: "Vérifiez que vous avez bien une URL Google valide configurée dans les paramètres de l'établissement. Essayez de le régénérer dans la page Collecte." }
    ];

    if (selectedTutorial) {
        return (
            <div className="max-w-5xl mx-auto p-4 md:p-8">
                <TutorialDetail tutorial={selectedTutorial} onBack={() => setSelectedTutorial(null)} />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24">
            
            <SupportChatbot />

            {/* HEADER */}
            <div className="bg-indigo-900 rounded-3xl p-8 md:p-12 text-center text-white relative overflow-hidden shadow-2xl">
                <div className="relative z-10 max-w-2xl mx-auto">
                    <h1 className="text-3xl md:text-4xl font-bold mb-4">Centre d'Aide Reviewflow</h1>
                    <p className="text-indigo-200 mb-8 text-lg">Tutos, FAQ et Support Expert. Nous sommes là pour vous aider.</p>
                    
                    <div className="relative max-w-lg mx-auto">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Comment connecter Google, changer le ton IA..." 
                            className="w-full pl-12 pr-4 py-4 rounded-xl text-slate-900 placeholder:text-slate-400 shadow-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/30 border-none"
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); if(e.target.value) setActiveTab('hub'); }}
                        />
                    </div>
                </div>
                {/* Background Decor */}
                <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-500/30 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
            </div>

            {/* TABS */}
            <div className="flex justify-center border-b border-slate-200">
                <button 
                    onClick={() => setActiveTab('hub')} 
                    className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'hub' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    <Video className="h-4 w-4" /> Tutoriels
                </button>
                <button 
                    onClick={() => setActiveTab('faq')} 
                    className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'faq' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    <HelpCircle className="h-4 w-4" /> FAQ
                </button>
                <button 
                    onClick={() => setActiveTab('contact')} 
                    className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'contact' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    <Mail className="h-4 w-4" /> Contact & Urgence
                </button>
            </div>

            {/* TAB CONTENT: HUB (TUTORIALS) */}
            {activeTab === 'hub' && (
                <div className="animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-slate-900">Vidéos & Guides</h2>
                        <span className="text-sm text-slate-500">{filteredTutorials.length} résultats</span>
                    </div>
                    
                    {filteredTutorials.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredTutorials.map(t => (
                                <TutorialCard key={t.id} tutorial={t} onClick={() => setSelectedTutorial(t)} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <p className="text-slate-500">Aucun tutoriel ne correspond à votre recherche.</p>
                            <Button variant="ghost" className="mt-2" onClick={() => setSearchQuery('')}>Voir tout</Button>
                        </div>
                    )}
                </div>
            )}

            {/* TAB CONTENT: FAQ */}
            {activeTab === 'faq' && (
                <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4">
                    <h2 className="text-xl font-bold text-slate-900 mb-6 text-center">Questions Fréquentes</h2>
                    <FAQAccordion items={FAQ_ITEMS.filter(i => i.q.toLowerCase().includes(searchQuery.toLowerCase()) || i.a.toLowerCase().includes(searchQuery.toLowerCase()))} />
                </div>
            )}

            {/* TAB CONTENT: CONTACT */}
            {activeTab === 'contact' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4">
                    
                    {/* Formulaire */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MessageCircle className="h-5 w-5 text-indigo-600" />
                                Envoyer une demande
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSendTicket} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Nom</label>
                                        <Input value={contactForm.name} onChange={e => setContactForm({...contactForm, name: e.target.value})} required />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                                        <Input type="email" value={contactForm.email} onChange={e => setContactForm({...contactForm, email: e.target.value})} required />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Niveau d'urgence</label>
                                    <div className="flex gap-4">
                                        {['normal', 'high', 'critical'].map(level => (
                                            <label key={level} className={`flex-1 border rounded-lg p-3 cursor-pointer flex items-center justify-center gap-2 transition-all ${contactForm.urgency === level ? (level === 'critical' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-indigo-50 border-indigo-600 text-indigo-700') : 'hover:bg-slate-50'}`}>
                                                <input type="radio" name="urgency" className="hidden" checked={contactForm.urgency === level} onChange={() => setContactForm({...contactForm, urgency: level as any})} />
                                                {level === 'critical' && <AlertTriangle className="h-4 w-4" />}
                                                <span className="capitalize text-sm font-bold">
                                                    {level === 'normal' ? 'Question' : level === 'high' ? 'Important' : 'Bloquant'}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Sujet</label>
                                    <Input placeholder="Ex: Problème de connexion Google..." value={contactForm.subject} onChange={e => setContactForm({...contactForm, subject: e.target.value})} required />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Message</label>
                                    <textarea 
                                        className="w-full p-3 border border-slate-200 rounded-lg text-sm min-h-[120px] focus:ring-2 focus:ring-indigo-500 resize-none"
                                        placeholder="Décrivez votre problème en détail..."
                                        value={contactForm.message}
                                        onChange={e => setContactForm({...contactForm, message: e.target.value})}
                                        required
                                    />
                                </div>

                                <Button className={`w-full shadow-lg ${contactForm.urgency === 'critical' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`} isLoading={sending}>
                                    Envoyer la demande
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Urgence / Calendly */}
                    <div className="space-y-6">
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Phone className="h-24 w-24 text-amber-600" />
                            </div>
                            <h3 className="text-lg font-bold text-amber-900 mb-2 flex items-center gap-2">
                                <Zap className="h-5 w-5 fill-amber-600 text-amber-600" />
                                Besoin d'aide immédiate ?
                            </h3>
                            <p className="text-sm text-amber-800 mb-6 leading-relaxed relative z-10">
                                Vous rencontrez un problème bloquant ou avez besoin d'une assistance guidée pour la configuration ? Réservez un créneau de 15 minutes avec un expert technique.
                            </p>
                            
                            <div className="bg-white/60 p-4 rounded-xl mb-6 border border-amber-100">
                                <p className="text-xs font-bold text-amber-900 mb-1 uppercase">💡 Pour gagner du temps :</p>
                                <p className="text-xs text-amber-800">
                                    Dans la note du rendez-vous, décrivez en une phrase le problème (ex: "Erreur 403 sur connexion Google").
                                </p>
                            </div>

                            <Button 
                                className="w-full bg-amber-600 hover:bg-amber-700 text-white border-none shadow-lg shadow-amber-200"
                                onClick={() => window.open('https://calendly.com/reviewflow-support/15min', '_blank')}
                            >
                                <Clock className="h-4 w-4 mr-2" /> Réserver un appel expert (15 min)
                            </Button>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                                <CheckCircle2 className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 text-sm">Support Réactif</h4>
                                <p className="text-xs text-slate-500 mt-1">
                                    Temps de réponse moyen : <span className="font-bold text-green-600">2 heures</span> (jours ouvrés).
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
