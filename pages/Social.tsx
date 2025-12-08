
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { Review, Organization, SocialPost } from '../types';
import { Card, CardContent, CardHeader, CardTitle, Button, useToast, Input, Badge, ProLock } from '../components/ui';
import { 
    Share2, 
    Instagram, 
    Facebook, 
    Linkedin, 
    Download, 
    Sparkles, 
    Palette,
    Type,
    Layout,
    Star,
    Calendar,
    Clock,
    Trash2,
    Plus
} from 'lucide-react';
import { toPng } from 'html-to-image';

// Template styles
const TEMPLATES = [
    { id: 'minimal', name: 'Minimal', style: 'bg-white text-slate-900 border-2 border-slate-900' },
    { id: 'dark', name: 'Dark Mode', style: 'bg-slate-900 text-white border-2 border-slate-700' },
    { id: 'gradient', name: 'Vibrant', style: 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white' },
    { id: 'paper', name: 'Papier', style: 'bg-[#fdfbf7] text-slate-800 shadow-xl' },
];

const FORMATS = [
    { id: 'square', name: 'Carré (1:1)', width: 1080, height: 1080 }, // HD Resolution
    { id: 'portrait', name: 'Story (9:16)', width: 1080, height: 1920 },
    { id: 'landscape', name: 'LinkedIn (1.91:1)', width: 1200, height: 628 }
];

export const SocialPage = () => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [selectedReview, setSelectedReview] = useState<Review | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [caption, setCaption] = useState('');
    const [generatingCaption, setGeneratingCaption] = useState(false);
    const [org, setOrg] = useState<Organization | null>(null);
    const [activeTab, setActiveTab] = useState<'create' | 'calendar' | 'accounts'>('create');
    const [posts, setPosts] = useState<SocialPost[]>([]);
    
    // Editor State
    const [template, setTemplate] = useState('minimal');
    const [format, setFormat] = useState('square');
    const [showBrand, setShowBrand] = useState(true);
    const [customColor, setCustomColor] = useState('#4f46e5');
    
    // Schedule Modal
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTime, setScheduleTime] = useState('10:00');
    
    // Responsive State
    const [scale, setScale] = useState(0.8);
    
    const toast = useToast();
    const canvasRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadData();
    }, []);

    // Responsive Scale Effect
    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current && activeTab === 'create') {
                const currentFormat = FORMATS.find(f => f.id === format) || FORMATS[0];
                
                const containerWidth = containerRef.current.clientWidth;
                const containerHeight = containerRef.current.clientHeight;
                
                // Add padding to calculation to prevent edge touching
                const padding = 40;
                const availableWidth = containerWidth - padding;
                const availableHeight = containerHeight - padding;
                
                const scaleX = availableWidth / currentFormat.width;
                const scaleY = availableHeight / currentFormat.height;
                
                // Choose smallest scale to fit, capped at 0.6 for desktop readability
                let newScale = Math.min(scaleX, scaleY);
                if (newScale > 0.6) newScale = 0.6;
                
                // Minimum scale to prevent it from disappearing
                if (newScale < 0.15) newScale = 0.15;
                
                setScale(newScale);
            }
        };

        window.addEventListener('resize', handleResize);
        // Delay initial calc to allow layout paint
        const timer = setTimeout(handleResize, 100);

        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(timer);
        };
    }, [format, activeTab, template]);

    const loadData = async () => {
        setLoading(true);
        const [reviewsData, organization, scheduledPosts] = await Promise.all([
            api.reviews.list({ rating: 5 }),
            api.organization.get(),
            api.social.getPosts()
        ]);
        setReviews(reviewsData);
        setOrg(organization);
        setPosts(scheduledPosts);
        if (reviewsData.length > 0) setSelectedReview(reviewsData[0]);
        setLoading(false);
    };

    const handleGenerateCaption = async () => {
        if (!selectedReview) return;
        setGeneratingCaption(true);
        try {
            const text = await api.ai.generateSocialPost(selectedReview, 'instagram');
            setCaption(text);
        } catch (e) {
            toast.error("Erreur IA");
        } finally {
            setGeneratingCaption(false);
        }
    };

    const handleDownload = async () => {
        if (!canvasRef.current || !selectedReview) return;
        setGenerating(true);
        const currentFormat = FORMATS.find(f => f.id === format) || FORMATS[0];

        try {
            const dataUrl = await toPng(canvasRef.current, { 
                cacheBust: true, 
                pixelRatio: 1, 
                width: currentFormat.width,
                height: currentFormat.height,
                style: {
                    transform: 'none', 
                    transformOrigin: 'top left'
                }
            });
            const link = document.createElement('a');
            link.download = `social-post-${selectedReview.author_name.replace(/\s+/g, '-')}.png`;
            link.href = dataUrl;
            link.click();
            toast.success("Image HD téléchargée !");
        } catch (e) {
            console.error(e);
            toast.error("Erreur de génération d'image");
        } finally {
            setGenerating(false);
        }
    };

    const handleSchedule = async () => {
        if (!scheduleDate || !scheduleTime || !selectedReview) return;
        
        const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
        
        await api.social.schedulePost({
            platform: 'instagram', // Default for now
            content: caption,
            scheduled_date: scheduledDateTime,
            review_id: selectedReview.id
        });
        
        toast.success("Post planifié avec succès !");
        setShowScheduleModal(false);
        loadData();
        setActiveTab('calendar');
    };

    const handleDeletePost = async (id: string) => {
        if(confirm("Supprimer ce post ?")) {
            await api.social.deletePost(id);
            loadData();
        }
    };

    const handleConnect = async (platform: 'facebook' | 'instagram' | 'linkedin') => {
        toast.info(`Connexion à ${platform}...`);
        // Simulate OAuth flow
        setTimeout(async () => {
            await api.social.connectAccount(platform, true);
            await loadData();
            toast.success(`${platform} connecté !`);
        }, 1500);
    };

    // Helper to get template classes
    const getTemplateClass = (id: string) => TEMPLATES.find(t => t.id === id)?.style || '';
    const currentFormat = FORMATS.find(f => f.id === format) || FORMATS[0];
    const reviewTextSize = (length: number) => {
        if (length < 50) return 'text-7xl';
        if (length < 100) return 'text-6xl';
        if (length < 200) return 'text-5xl';
        return 'text-4xl';
    };

    // PAYWALL: Block Free AND Starter plans. Only allow Pro/Enterprise.
    if (org && (org.subscription_plan === 'free' || org.subscription_plan === 'starter')) {
        return (
            <div className="max-w-7xl mx-auto mt-8 animate-in fade-in duration-500 px-4 sm:px-6">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Social Studio</h1>
                    <p className="text-slate-500">Transformez vos meilleurs avis en posts viraux.</p>
                </div>
                
                <ProLock
                    title="Débloquez le Social Studio"
                    description="Créez des visuels HD, planifiez vos posts et publiez sur Instagram et LinkedIn automatiquement."
                >
                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 opacity-20 filter blur-[1px]">
                        <div className="bg-white border border-slate-200 h-96 rounded-xl shadow-lg"></div>
                        <div className="bg-slate-100 border border-slate-200 h-96 rounded-xl"></div>
                    </div>
                </ProLock>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 px-4 sm:px-6 pb-20 lg:pb-8">
            {/* Header & Tabs */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Share2 className="h-8 w-8 text-indigo-600" />
                        Social Studio
                        <Badge variant="pro">GROWTH</Badge>
                    </h1>
                    <p className="text-slate-500">Transformez vos meilleurs avis en posts viraux.</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto max-w-full no-scrollbar">
                    <button onClick={() => setActiveTab('create')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === 'create' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Créer</button>
                    <button onClick={() => setActiveTab('calendar')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === 'calendar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Planning</button>
                    <button onClick={() => setActiveTab('accounts')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === 'accounts' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Comptes</button>
                </div>
            </div>

            {/* --- TAB: CREATION STUDIO --- */}
            {activeTab === 'create' && (
                <div className="flex flex-col lg:flex-row gap-6 h-auto lg:h-[calc(100vh-14rem)]">
                    
                    {/* 1. SELECTION LIST (Mobile: Bottom order, Desktop: Left Sidebar) */}
                    <div className="order-2 lg:order-1 w-full lg:w-80 shrink-0 flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm h-80 lg:h-full">
                        <div className="p-4 border-b border-slate-100 bg-slate-50 font-bold text-slate-700 flex items-center gap-2 sticky top-0 z-10">
                            <Star className="h-4 w-4 text-amber-400 fill-current" />
                            Vos Pépites (5★)
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                            {loading && <div className="p-4 text-center text-slate-400 text-sm">Chargement...</div>}
                            {reviews.map(review => (
                                <div 
                                    key={review.id}
                                    onClick={() => setSelectedReview(review)}
                                    className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${selectedReview?.id === review.id ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'border-slate-200 bg-white hover:border-indigo-300'}`}
                                >
                                    <div className="flex justify-between mb-2">
                                        <span className="font-bold text-sm text-slate-900 truncate max-w-[120px]">{review.author_name}</span>
                                        <span className="text-[10px] text-slate-400 shrink-0">{new Date(review.received_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-xs text-slate-600 line-clamp-3 italic">"{review.body}"</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 2. MAIN AREA (Canvas & Controls) */}
                    <div className="order-1 lg:order-2 flex-1 flex flex-col gap-4 min-w-0">
                        
                        {/* CANVAS PREVIEW */}
                        <div 
                            ref={containerRef} 
                            className="bg-slate-200/50 rounded-xl border border-slate-200 flex items-center justify-center p-4 overflow-hidden relative min-h-[400px] lg:flex-1 w-full"
                        >
                            {/* THE CANVAS TO CAPTURE */}
                            <div 
                                ref={canvasRef}
                                style={{ 
                                    width: currentFormat.width, 
                                    height: currentFormat.height,
                                    transform: `scale(${scale})`, 
                                    transformOrigin: 'center center',
                                    fontSize: '2rem' // Base font size for HD canvas
                                }}
                                className={`flex flex-col items-center justify-center p-16 relative shadow-2xl transition-all duration-500 shrink-0 ${getTemplateClass(template)}`}
                            >
                                <div className="absolute top-12 right-12 flex gap-2">
                                    {[1,2,3,4,5].map(i => (
                                        <Star key={i} className={`h-12 w-12 ${template === 'dark' || template === 'gradient' ? 'text-yellow-400 fill-yellow-400' : 'text-amber-400 fill-amber-400'}`} />
                                    ))}
                                </div>

                                <div className="flex-1 flex items-center justify-center w-full">
                                    <p className={`text-center font-serif leading-relaxed italic ${reviewTextSize(selectedReview?.body?.length || 0)}`}>
                                        "{selectedReview?.body}"
                                    </p>
                                </div>

                                <div className="flex items-center gap-6 mt-12 w-full border-t border-current pt-8 opacity-90">
                                    <div className={`h-24 w-24 rounded-full flex items-center justify-center text-4xl font-bold ${template === 'dark' ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}`}>
                                        {selectedReview?.author_name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-3xl">{selectedReview?.author_name}</div>
                                        <div className="opacity-80 text-xl mt-1">Client Vérifié</div>
                                    </div>
                                    {showBrand && (
                                        <div className="ml-auto flex items-center gap-3 opacity-60">
                                            <div className="h-12 w-1.5 px-2" style={{ backgroundColor: customColor }}></div>
                                            <span className="font-bold tracking-widest uppercase text-lg">Reviewflow</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* CONTROLS CARD */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm shrink-0">
                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    {/* Style & Format Selectors */}
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                                            <Palette className="h-4 w-4" /> Style & Format
                                        </label>
                                        <div className="flex flex-col sm:flex-row gap-4">
                                            <select 
                                                value={template}
                                                onChange={(e) => setTemplate(e.target.value)}
                                                className="block w-full rounded-lg border-slate-200 text-sm py-2 px-3 focus:ring-2 focus:ring-indigo-500"
                                            >
                                                {TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                            </select>
                                            <select 
                                                value={format}
                                                onChange={(e) => setFormat(e.target.value)}
                                                className="block w-full rounded-lg border-slate-200 text-sm py-2 px-3 focus:ring-2 focus:ring-indigo-500"
                                            >
                                                {FORMATS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-wrap items-center gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                                            <input type="checkbox" checked={showBrand} onChange={(e) => setShowBrand(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
                                            Afficher la marque
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-500 font-bold uppercase">Couleur</span>
                                            <input 
                                                type="color" 
                                                value={customColor} 
                                                onChange={(e) => setCustomColor(e.target.value)}
                                                className="h-8 w-8 rounded cursor-pointer border-0 p-0 shadow-sm"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                                                <Type className="h-4 w-4" /> Légende
                                            </label>
                                            <button 
                                                onClick={handleGenerateCaption} 
                                                disabled={generatingCaption}
                                                className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded"
                                            >
                                                <Sparkles className="h-3 w-3" />
                                                {generatingCaption ? '...' : 'IA'}
                                            </button>
                                        </div>
                                        <textarea 
                                            className="w-full h-20 p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 resize-none bg-slate-50"
                                            placeholder="Légende du post..."
                                            value={caption}
                                            onChange={e => setCaption(e.target.value)}
                                        />
                                    </div>

                                    <div className="flex gap-2">
                                        <Button className="flex-1" variant="outline" onClick={handleDownload} isLoading={generating} icon={Download}>Télécharger</Button>
                                        <Button className="flex-1 shadow-lg shadow-indigo-200" onClick={() => setShowScheduleModal(true)} icon={Calendar}>Planifier</Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB: CALENDAR --- */}
            {activeTab === 'calendar' && (
                <div className="space-y-6 animate-in fade-in">
                    <Card>
                        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <CardTitle>Planning de Publication</CardTitle>
                            <Button variant="outline" size="sm" onClick={() => setActiveTab('create')} icon={Plus}>Nouveau Post</Button>
                        </CardHeader>
                        <CardContent>
                            {posts.length === 0 ? (
                                <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                                    <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                                    <p className="text-slate-500">Aucun post planifié.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {posts.sort((a,b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()).map(post => (
                                        <div key={post.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col">
                                            <div className="h-32 bg-gradient-to-r from-indigo-100 to-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                                <Sparkles className="h-8 w-8" />
                                            </div>
                                            <div className="p-4 flex-1 flex flex-col">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-1.5">
                                                        {post.platform === 'instagram' && <Instagram className="h-4 w-4 text-pink-600" />}
                                                        {post.platform === 'facebook' && <Facebook className="h-4 w-4 text-blue-600" />}
                                                        <span className="text-xs font-bold text-slate-700 capitalize">{post.platform}</span>
                                                    </div>
                                                    <Badge variant={post.status === 'scheduled' ? 'warning' : 'success'}>
                                                        {post.status === 'scheduled' ? 'Planifié' : 'Publié'}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-slate-600 line-clamp-2 mb-3 bg-slate-50 p-2 rounded flex-1">{post.content}</p>
                                                <div className="flex justify-between items-center text-xs text-slate-500 pt-2 border-t border-slate-100">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {new Date(post.scheduled_date).toLocaleString()}
                                                    </span>
                                                    <button onClick={() => handleDeletePost(post.id)} className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* --- TAB: ACCOUNTS --- */}
            {activeTab === 'accounts' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in">
                    <Card>
                        <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                            <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center border-4 border-white shadow-md">
                                <Facebook className="h-8 w-8" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">Facebook Page</h3>
                                <p className="text-xs text-slate-500">{org?.integrations.facebook_posting ? 'Compte connecté' : 'Non connecté'}</p>
                            </div>
                            <Button 
                                variant={org?.integrations.facebook_posting ? 'outline' : 'primary'} 
                                className="w-full"
                                onClick={() => handleConnect('facebook')}
                            >
                                {org?.integrations.facebook_posting ? 'Déconnecter' : 'Connecter'}
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                            <div className="h-16 w-16 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 text-white rounded-full flex items-center justify-center border-4 border-white shadow-md">
                                <Instagram className="h-8 w-8" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">Instagram Business</h3>
                                <p className="text-xs text-slate-500">{org?.integrations.instagram_posting ? 'Compte connecté' : 'Non connecté'}</p>
                            </div>
                            <Button 
                                variant={org?.integrations.instagram_posting ? 'outline' : 'primary'} 
                                className="w-full"
                                onClick={() => handleConnect('instagram')}
                            >
                                {org?.integrations.instagram_posting ? 'Déconnecter' : 'Connecter'}
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                            <div className="h-16 w-16 bg-blue-700 text-white rounded-full flex items-center justify-center border-4 border-white shadow-md">
                                <Linkedin className="h-8 w-8" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">LinkedIn Company</h3>
                                <p className="text-xs text-slate-500">{org?.integrations.linkedin_posting ? 'Compte connecté' : 'Non connecté'}</p>
                            </div>
                            <Button 
                                variant={org?.integrations.linkedin_posting ? 'outline' : 'primary'} 
                                className="w-full"
                                onClick={() => handleConnect('linkedin')}
                            >
                                {org?.integrations.linkedin_posting ? 'Déconnecter' : 'Connecter'}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* SCHEDULE MODAL */}
            {showScheduleModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <Card className="w-full max-w-sm animate-in zoom-in-95">
                        <CardHeader>
                            <CardTitle>Planifier la publication</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                                <Input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Heure</label>
                                <Input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Button variant="ghost" className="flex-1" onClick={() => setShowScheduleModal(false)}>Annuler</Button>
                                <Button className="flex-1" onClick={handleSchedule} disabled={!scheduleDate || !scheduleTime}>Confirmer</Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};
