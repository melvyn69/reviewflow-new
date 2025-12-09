
import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { BlogPost, SeoAudit, Organization } from '../types';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, useToast, Badge, Select, Toggle } from '../components/ui';
import { 
    Megaphone, FileText, Globe, Search, Wand2, Plus, Edit3, Trash2, 
    CheckCircle2, AlertTriangle, ExternalLink, RefreshCw, BarChart, 
    Share2, Mail, Smartphone, Code, Save, Zap
} from 'lucide-react';

const CampaignBuilder = () => {
    const [channels, setChannels] = useState({ sms: true, email: true, social: false });
    const [budgetTotal, setBudgetTotal] = useState(500);
    const [prompt, setPrompt] = useState('');
    const [generating, setGenerating] = useState(false);
    const [content, setContent] = useState({ sms: '', email_subject: '', email_body: '', social_caption: '' });
    const toast = useToast();

    const handleGenerate = async () => {
        if (!prompt) return toast.error("Entrez un thème de campagne");
        setGenerating(true);
        try {
            const res = await api.marketing.generateCampaignContent(prompt, budgetTotal);
            setContent(res);
            toast.success("Contenu généré par l'IA !");
        } catch (e) {
            toast.error("Erreur génération");
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5 text-indigo-600" /> Paramètres Campagne</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Canaux</label>
                            <div className="flex gap-4">
                                {['sms', 'email', 'social'].map(c => (
                                    <button 
                                        key={c}
                                        onClick={() => setChannels({ ...channels, [c]: !channels[c as keyof typeof channels] })}
                                        className={`flex-1 p-3 rounded-xl border-2 flex items-center justify-center gap-2 capitalize transition-all ${channels[c as keyof typeof channels] ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500'}`}
                                    >
                                        {c === 'sms' && <Smartphone className="h-4 w-4" />}
                                        {c === 'email' && <Mail className="h-4 w-4" />}
                                        {c === 'social' && <Share2 className="h-4 w-4" />}
                                        {c}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Budget Total</label>
                            <div className="flex items-center gap-2">
                                <Input type="number" value={budgetTotal} onChange={e => setBudgetTotal(Number(e.target.value))} />
                                <span className="text-slate-500 font-bold">€</span>
                            </div>
                            <div className="mt-2 text-xs text-slate-500 flex justify-between">
                                <span>SMS: {Math.round(budgetTotal * 0.5)}€</span>
                                <span>Email: {Math.round(budgetTotal * 0.3)}€</span>
                                <span>Social: {Math.round(budgetTotal * 0.2)}€</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full mt-1 flex overflow-hidden">
                                <div className="h-full bg-blue-500" style={{ width: '50%' }}></div>
                                <div className="h-full bg-purple-500" style={{ width: '30%' }}></div>
                                <div className="h-full bg-pink-500" style={{ width: '20%' }}></div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <label className="block text-sm font-bold text-slate-700 mb-2">Assistant IA</label>
                        <div className="flex gap-2">
                            <Input placeholder="Thème (ex: Soldes d'été, Menu St Valentin...)" value={prompt} onChange={e => setPrompt(e.target.value)} />
                            <Button onClick={handleGenerate} isLoading={generating} icon={Wand2}>Générer Tout</Button>
                        </div>
                    </div>

                    {content.sms && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-bottom-4">
                            {channels.sms && (
                                <div className="bg-white p-3 rounded-lg border border-blue-200 shadow-sm">
                                    <div className="text-xs font-bold text-blue-600 mb-2 uppercase">SMS (Court)</div>
                                    <textarea className="w-full h-24 text-sm resize-none border-none focus:ring-0 p-0" value={content.sms} onChange={e => setContent({...content, sms: e.target.value})} />
                                </div>
                            )}
                            {channels.email && (
                                <div className="bg-white p-3 rounded-lg border border-purple-200 shadow-sm">
                                    <div className="text-xs font-bold text-purple-600 mb-2 uppercase">Email (Objet + Corps)</div>
                                    <Input className="mb-2 text-xs" value={content.email_subject} onChange={e => setContent({...content, email_subject: e.target.value})} />
                                    <textarea className="w-full h-20 text-sm resize-none border-none focus:ring-0 p-0" value={content.email_body} onChange={e => setContent({...content, email_body: e.target.value})} />
                                </div>
                            )}
                            {channels.social && (
                                <div className="bg-white p-3 rounded-lg border border-pink-200 shadow-sm">
                                    <div className="text-xs font-bold text-pink-600 mb-2 uppercase">Social Caption</div>
                                    <textarea className="w-full h-24 text-sm resize-none border-none focus:ring-0 p-0" value={content.social_caption} onChange={e => setContent({...content, social_caption: e.target.value})} />
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

const SeoTools = () => {
    const [url, setUrl] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    const [audit, setAudit] = useState<SeoAudit | null>(null);
    const [org, setOrg] = useState<Organization | null>(null);
    const toast = useToast();

    useEffect(() => {
        api.organization.get().then(setOrg);
    }, []);

    const handleAnalyze = async () => {
        if (!url) return toast.error("URL requise");
        setAnalyzing(true);
        try {
            const res = await api.marketing.analyzeCompetitorSeo(url);
            setAudit(res);
        } catch (e) {
            toast.error("Erreur analyse");
        } finally {
            setAnalyzing(false);
        }
    };

    const handleCopySnippet = async () => {
        if (!org) return;
        // Mock snippet generation based on org
        const snippet = await api.marketing.generateRichSnippet({ name: org.name, rating: 4.8, count: 124 });
        navigator.clipboard.writeText(snippet);
        toast.success("Code JSON-LD copié !");
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in">
            {/* COMPETITOR AUDIT */}
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5 text-indigo-600" /> Analyse Concurrent</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Input placeholder="https://concurrent.com" value={url} onChange={e => setUrl(e.target.value)} />
                            <Button onClick={handleAnalyze} isLoading={analyzing}>Analyser</Button>
                        </div>

                        {audit && (
                            <div className="space-y-4 animate-in slide-in-from-bottom-2">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                        <div className="text-xs text-slate-500 uppercase">Vitesse</div>
                                        <div className={`font-bold ${audit.metrics.load_time_ms < 1000 ? 'text-green-600' : 'text-red-600'}`}>{audit.metrics.load_time_ms}ms</div>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                        <div className="text-xs text-slate-500 uppercase">Mobile</div>
                                        <div className="font-bold text-green-600">{audit.metrics.mobile_friendly ? 'Oui' : 'Non'}</div>
                                    </div>
                                </div>
                                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                                    <div className="flex items-center gap-2 mb-2 font-bold text-indigo-900 text-sm"><Zap className="h-4 w-4" /> Opportunités IA</div>
                                    <ul className="list-disc pl-4 text-xs text-indigo-800 space-y-1">
                                        {audit.ai_analysis.opportunities.map((op, i) => <li key={i}>{op}</li>)}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* RICH SNIPPETS */}
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Code className="h-5 w-5 text-indigo-600" /> Rich Snippets</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-slate-600">Générez le code JSON-LD pour afficher vos étoiles dans les résultats Google.</p>
                        
                        <div className="bg-slate-900 p-4 rounded-lg font-mono text-xs text-green-400 overflow-x-auto relative">
                            <pre>{`{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "${org?.name || 'Votre Entreprise'}",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "124"
  }
}`}</pre>
                            <button onClick={handleCopySnippet} className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20 rounded text-white transition-colors">
                                <Share2 className="h-4 w-4" />
                            </button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

const BlogManager = () => {
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [editing, setEditing] = useState<BlogPost | null>(null);
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    useEffect(() => {
        loadPosts();
    }, []);

    const loadPosts = async () => {
        setLoading(true);
        const data = await api.marketing.getBlogPosts();
        setPosts(data);
        setLoading(false);
    };

    const handleCreate = () => {
        setEditing({ 
            id: '', title: '', slug: '', content: '', status: 'draft', tags: [] 
        });
    };

    const handleSave = async () => {
        if (!editing) return;
        await api.marketing.saveBlogPost(editing);
        setEditing(null);
        loadPosts();
        toast.success("Article sauvegardé");
    };

    const handleAiOptimize = async () => {
        if (!editing) return;
        toast.info("Optimisation SEO en cours...");
        const seoData = await api.marketing.generateSeoMeta(editing.content);
        setEditing({ ...editing, ...seoData });
        toast.success("Méta-données générées !");
    };

    if (editing) {
        return (
            <div className="space-y-6 animate-in slide-in-from-right-4">
                <div className="flex justify-between items-center">
                    <Button variant="ghost" onClick={() => setEditing(null)}>Retour</Button>
                    <div className="flex gap-2">
                        <Button variant="secondary" icon={Wand2} onClick={handleAiOptimize}>Optimiser SEO</Button>
                        <Button icon={Save} onClick={handleSave}>Enregistrer</Button>
                    </div>
                </div>
                
                <Card>
                    <CardContent className="p-6 space-y-6">
                        <Input placeholder="Titre de l'article" className="text-lg font-bold" value={editing.title} onChange={e => setEditing({...editing, title: e.target.value})} />
                        <div className="grid grid-cols-2 gap-4">
                            <Input placeholder="Slug URL (ex: mon-article)" value={editing.slug} onChange={e => setEditing({...editing, slug: e.target.value})} />
                            <Select value={editing.status} onChange={e => setEditing({...editing, status: e.target.value as any})}>
                                <option value="draft">Brouillon</option>
                                <option value="published">Publié</option>
                            </Select>
                        </div>
                        <textarea 
                            className="w-full h-64 p-4 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" 
                            placeholder="Contenu de l'article..."
                            value={editing.content}
                            onChange={e => setEditing({...editing, content: e.target.value})}
                        />
                        
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <h4 className="font-bold text-sm text-slate-700 mb-4 flex items-center gap-2"><Globe className="h-4 w-4" /> Aperçu Google (SEO)</h4>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Meta Title</label>
                                    <Input value={editing.meta_title || ''} onChange={e => setEditing({...editing, meta_title: e.target.value})} className="text-blue-600 font-medium" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Meta Description</label>
                                    <textarea className="w-full h-20 p-2 border border-slate-200 rounded text-sm text-slate-600" value={editing.meta_description || ''} onChange={e => setEditing({...editing, meta_description: e.target.value})} />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-900">Articles de Blog</h3>
                <Button icon={Plus} onClick={handleCreate}>Nouvel Article</Button>
            </div>
            
            <div className="grid gap-4">
                {posts.map(post => (
                    <div key={post.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center hover:shadow-md transition-shadow">
                        <div>
                            <h4 className="font-bold text-slate-900">{post.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant={post.status === 'published' ? 'success' : 'neutral'} className="text-[10px] uppercase">{post.status}</Badge>
                                <span className="text-xs text-slate-500">/{post.slug}</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setEditing(post)}><Edit3 className="h-4 w-4" /></Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const MarketingPage = () => {
    const [activeTab, setActiveTab] = useState<'campaigns' | 'blog' | 'seo'>('campaigns');

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20 p-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Megaphone className="h-8 w-8 text-indigo-600" />
                        Marketing & SEO
                    </h1>
                    <p className="text-slate-500">Suite complète pour booster votre visibilité en ligne.</p>
                </div>
            </div>

            <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar">
                {[
                    { id: 'campaigns', label: 'Campagnes 360°', icon: Share2 },
                    { id: 'blog', label: 'Blog & Contenu', icon: FileText },
                    { id: 'seo', label: 'Outils SEO', icon: Globe },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="min-h-[400px]">
                {activeTab === 'campaigns' && <CampaignBuilder />}
                {activeTab === 'blog' && <BlogManager />}
                {activeTab === 'seo' && <SeoTools />}
            </div>
        </div>
    );
};
