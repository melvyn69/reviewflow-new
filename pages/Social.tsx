
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { Review, Organization, SocialPost, SocialAccount } from '../types';
import { Card, CardContent, CardHeader, CardTitle, Button, useToast, Input, Badge, ProLock, Select, Toggle } from '../components/ui';
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
    Plus,
    Hash,
    CheckCircle2,
    MessageSquare,
    ArrowRight,
    Tag,
    X,
    Filter,
    Search,
    Eye,
    ThumbsUp,
    MoreHorizontal,
    ExternalLink,
    Pencil
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { useLocation, useNavigate } from '../components/ui';

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

// --- SOCIAL PREVIEW COMPONENTS ---
const SocialFeedPreview = ({ platform, children, caption, author, avatar }: { platform: string, children: React.ReactNode, caption: string, author: string, avatar: string }) => {
    
    if (platform === 'instagram') {
        return (
            <div className="w-full max-w-sm mx-auto bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                {/* Header */}
                <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-yellow-400 to-purple-600 p-[2px]">
                            <div className="h-full w-full rounded-full bg-white p-[2px]">
                                <img src={avatar} className="h-full w-full rounded-full object-cover bg-slate-200" />
                            </div>
                        </div>
                        <span className="text-xs font-semibold text-slate-900">{author.toLowerCase().replace(/\s/g, '_')}</span>
                    </div>
                    <MoreHorizontal className="h-4 w-4 text-slate-600" />
                </div>
                {/* Content */}
                <div className="w-full bg-slate-100 aspect-square overflow-hidden flex items-center justify-center">
                    <div className="transform scale-[0.35] origin-center">{children}</div>
                </div>
                {/* Actions */}
                <div className="p-3">
                    <div className="flex justify-between mb-2">
                        <div className="flex gap-4">
                            <ThumbsUp className="h-6 w-6 text-slate-800" />
                            <MessageSquare className="h-6 w-6 text-slate-800" />
                            <Send className="h-6 w-6 text-slate-800 rotate-[-45deg] mb-1" />
                        </div>
                        <div className="text-slate-800">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                        </div>
                    </div>
                    <div className="text-xs font-semibold mb-1">1 240 J'aime</div>
                    <div className="text-xs text-slate-900">
                        <span className="font-semibold mr-1">{author.toLowerCase().replace(/\s/g, '_')}</span>
                        {caption}
                    </div>
                </div>
            </div>
        );
    }

    if (platform === 'facebook' || platform === 'linkedin') {
        return (
            <div className="w-full max-w-md mx-auto bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                {/* Header */}
                <div className="p-3 flex items-start gap-3">
                    <img src={avatar} className="h-10 w-10 rounded-full bg-slate-200" />
                    <div>
                        <div className="text-sm font-bold text-slate-900">{author}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                            2h • <Globe className="h-3 w-3" />
                        </div>
                    </div>
                    <MoreHorizontal className="h-5 w-5 text-slate-500 ml-auto" />
                </div>
                {/* Caption */}
                <div className="px-3 pb-3 text-sm text-slate-800 whitespace-pre-wrap">
                    {caption}
                </div>
                {/* Content */}
                <div className="w-full bg-slate-100 aspect-video overflow-hidden flex items-center justify-center">
                     <div className="transform scale-[0.40] origin-center">{children}</div>
                </div>
                {/* Footer */}
                <div className="p-3 border-t border-slate-100 flex justify-around text-slate-500">
                    <div className="flex items-center gap-2 text-sm font-medium"><ThumbsUp className="h-4 w-4" /> J'aime</div>
                    <div className="flex items-center gap-2 text-sm font-medium"><MessageSquare className="h-4 w-4" /> Commenter</div>
                    <div className="flex items-center gap-2 text-sm font-medium"><Share2 className="h-4 w-4" /> Partager</div>
                </div>
            </div>
        );
    }

    return <div>{children}</div>;
}

// Icon for Send
const Send = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
);
// Icon for Globe
const Globe = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
);

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
    const [connectedAccounts, setConnectedAccounts] = useState<SocialAccount[]>([]);
    
    // Editor State
    const [template, setTemplate] = useState('minimal');
    const [format, setFormat] = useState('square');
    const [showBrand, setShowBrand] = useState(true);
    const [customColor, setCustomColor] = useState('#4f46e5');
    const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
    const [previewPlatform, setPreviewPlatform] = useState('instagram');
    
    // AI Settings
    const [socialTone, setSocialTone] = useState('enthusiastic');
    const [useHashtags, setUseHashtags] = useState(true);
    
    // Schedule Modal
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTime, setScheduleTime] = useState('10:00');
    const [scheduling, setScheduling] = useState(false);
    const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
    
    // Tags for new post
    const [postTags, setPostTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');

    // Filtering State (Calendar)
    const [filterTag, setFilterTag] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Responsive State
    const [scale, setScale] = useState(0.8);
    
    const toast = useToast();
    const canvasRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        loadData();
    }, []);

    // ... (Keep existing useEffects for OAuth and Resize) ...
    // OAuth Callback Handling
    useEffect(() => {
        const query = new URLSearchParams(location.search);
        const code = query.get('code');
        const stateStr = query.get('state');

        if (code && stateStr) {
            const handleAuth = async () => {
                try {
                    const state = JSON.parse(atob(stateStr));
                    const platform = state.platform;
                    
                    toast.info(`Connexion ${platform} en cours...`);
                    
                    await api.social.handleCallback(platform, code);
                    
                    toast.success("Compte connecté avec succès !");
                    // Clean URL
                    window.history.replaceState({}, '', window.location.pathname);
                    setActiveTab('accounts');
                    loadData();
                } catch (e: any) {
                    toast.error("Erreur connexion: " + e.message);
                }
            };
            handleAuth();
        }
    }, [location.search]);

    // Responsive Scale Effect
    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current && activeTab === 'create' && viewMode === 'edit') {
                const currentFormat = FORMATS.find(f => f.id === format) || FORMATS[0];
                
                const containerWidth = containerRef.current.clientWidth;
                const containerHeight = containerRef.current.clientHeight;
                
                // Add padding to calculation to prevent edge touching
                const padding = 40;
                const availableWidth = containerWidth - padding;
                const availableHeight = containerHeight - padding;
                
                const scaleX = availableWidth / currentFormat.width;
                const scaleY = availableHeight / currentFormat.height;
                
                let newScale = Math.min(scaleX, scaleY);
                if (newScale > 0.6) newScale = 0.6;
                if (newScale < 0.15) newScale = 0.15;
                
                setScale(newScale);
            }
        };

        window.addEventListener('resize', handleResize);
        const timer = setTimeout(handleResize, 100);

        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(timer);
        };
    }, [format, activeTab, template, viewMode]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [reviewsData, organization, scheduledPosts, accounts] = await Promise.all([
                api.reviews.list({ rating: 5 }),
                api.organization.get(),
                api.social.getPosts(),
                api.social.getAccounts()
            ]);
            setReviews(reviewsData);
            setOrg(organization);
            setPosts(scheduledPosts);
            setConnectedAccounts(accounts);
            if (reviewsData.length > 0) setSelectedReview(reviewsData[0]);
        } catch(e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateCaption = async () => {
        if (!selectedReview) return;
        setGeneratingCaption(true);
        try {
            const text = await api.ai.generateSocialPost(selectedReview, 'instagram', { tone: socialTone, hashtags: useHashtags });
            setCaption(text);
        } catch (e) {
            toast.error("Erreur IA");
        } finally {
            setGeneratingCaption(false);
        }
    };

    const handleDownload = async () => {
        // Must be in edit mode to capture canvas
        if (viewMode !== 'edit') setViewMode('edit');
        // Small delay to let render
        await new Promise(r => setTimeout(r, 100));

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

    const handleAddPostTag = () => {
        if (tagInput.trim() && !postTags.includes(tagInput.trim())) {
            setPostTags([...postTags, tagInput.trim()]);
            setTagInput('');
        }
    };

    const handleRemovePostTag = (tag: string) => {
        setPostTags(postTags.filter(t => t !== tag));
    };

    const handleEditPost = (post: SocialPost) => {
        setEditingPost(post);
        setCaption(post.content);
        const d = new Date(post.scheduled_date);
        setScheduleDate(d.toISOString().split('T')[0]);
        setScheduleTime(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        setPostTags(post.tags || []);
        setShowScheduleModal(true);
    };

    const handleSchedule = async () => {
        if (!scheduleDate || !scheduleTime) return;
        setScheduling(true);
        
        try {
            const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
            const payload = {
                platform: editingPost ? editingPost.platform : 'instagram' as any,
                content: caption,
                scheduled_date: scheduledDateTime,
                review_id: selectedReview?.id,
                tags: postTags
            };

            if (editingPost) {
                const updated = await api.social.updatePost(editingPost.id, payload);
                setPosts(prev => prev.map(p => p.id === updated.id ? updated : p));
                toast.success("Post mis à jour !");
            } else {
                if (!selectedReview) throw new Error("No review selected");
                const newPost = await api.social.schedulePost(payload);
                setPosts(prev => [...prev, newPost]);
                toast.success("Post planifié !");
            }
            
            setShowScheduleModal(false);
            setEditingPost(null);
            if (!editingPost) setPostTags([]); 
            setActiveTab('calendar');
        } catch (e: any) {
            toast.error("Erreur: " + e.message);
        } finally {
            setScheduling(false);
        }
    };

    const handleDeletePost = async (id: string) => {
        if(confirm("Supprimer ce post ?")) {
            await api.social.deletePost(id);
            setPosts(prev => prev.filter(p => p.id !== id));
            toast.success("Post supprimé");
        }
    };

    const handleConnect = async (platform: 'facebook' | 'instagram' | 'linkedin') => {
        try {
            await api.social.connectAccount(platform);
        } catch (e: any) {
            toast.error("Erreur de redirection: " + e.message);
        }
    };

    const handleNewPost = () => {
        setEditingPost(null);
        setCaption('');
        setPostTags([]);
        setActiveTab('create');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Filter Logic
    const scheduledPosts = posts.filter(p => p.status === 'scheduled' || p.status === 'failed');
    const publishedPosts = posts.filter(p => p.status === 'published');

    const filterPosts = (list: SocialPost[]) => {
        return list.filter(post => {
            const matchesTag = filterTag === 'All' || (post.tags && post.tags.includes(filterTag));
            const matchesSearch = !searchQuery || post.content.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesTag && matchesSearch;
        });
    };

    const allTags = Array.from(new Set(posts.flatMap(p => p.tags || [])));

    // Helper to get template classes
    const getTemplateClass = (id: string) => TEMPLATES.find(t => t.id === id)?.style || '';
    const currentFormat = FORMATS.find(f => f.id === format) || FORMATS[0];
    const reviewTextSize = (length: number) => {
        if (length < 50) return 'text-7xl';
        if (length < 100) return 'text-6xl';
        if (length < 200) return 'text-5xl';
        return 'text-4xl';
    };

    const isConnected = (platform: string) => connectedAccounts.some(a => a.platform === platform);

    // Canvas Component
    const CanvasContent = () => (
        <div 
            ref={canvasRef}
            style={{ 
                width: currentFormat.width, 
                height: currentFormat.height,
                transform: viewMode === 'edit' ? `scale(${scale})` : 'none', 
                transformOrigin: 'center center',
                fontSize: '2rem'
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
    );

    // PAYWALL
    if (org && (org.subscription_plan === 'free' || org.subscription_plan === 'starter')) {
        return (
            <div className="max-w-7xl mx-auto mt-8 animate-in fade-in duration-500 px-4 sm:px-6">
                {/* ... Paywall content same as before ... */}
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
                    </div>
                </ProLock>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 px-4 sm:px-6 pb-20 lg:pb-8">
            {/* Header & Tabs */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Share2 className="h-8 w-8 text-indigo-600" />
                        Social Studio
                        <Badge variant="pro">GROWTH</Badge>
                    </h1>
                    <p className="text-slate-500">Transformez vos meilleurs avis en posts viraux.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto max-w-full no-scrollbar flex-1 md:flex-none justify-center">
                        <button 
                            onClick={() => setActiveTab('create')} 
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === 'create' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Studio
                        </button>
                        <button 
                            onClick={() => setActiveTab('calendar')} 
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === 'calendar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Planning & Historique
                        </button>
                        <button 
                            onClick={() => setActiveTab('accounts')} 
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === 'accounts' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Comptes
                        </button>
                    </div>
                    
                    <Button onClick={handleNewPost} icon={Plus} className="shadow-lg shadow-indigo-200 whitespace-nowrap flex-1 md:flex-none">
                        Nouveau Post
                    </Button>
                </div>
            </div>

            {/* --- TAB: CREATION STUDIO --- */}
            {activeTab === 'create' && (
                <div className="flex flex-col lg:flex-row gap-6 h-auto lg:h-[calc(100vh-14rem)]">
                    
                    {/* 1. SELECTION LIST */}
                    <div className="order-2 lg:order-1 w-full lg:w-80 shrink-0 flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm h-80 lg:h-full">
                        <div className="p-4 border-b border-slate-100 bg-slate-50 font-bold text-slate-700 flex items-center gap-2 sticky top-0 z-10">
                            <Star className="h-4 w-4 text-amber-400 fill-current" />
                            Vos Pépites (5★)
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                            {loading && <div className="p-4 text-center text-slate-400 text-sm">Chargement...</div>}
                            
                            {!loading && reviews.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                                    <div className="bg-slate-100 p-3 rounded-full mb-3">
                                        <Star className="h-6 w-6 text-slate-300" />
                                    </div>
                                    <p className="text-sm font-medium text-slate-900 mb-1">Aucun avis 5★</p>
                                    <p className="text-xs text-slate-500 mb-4">Collectez plus d'avis pour les transformer en posts.</p>
                                    <Button variant="outline" size="xs" onClick={() => navigate('/collect')}>
                                        Lancer une collecte
                                    </Button>
                                </div>
                            )}

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

                    {/* 2. MAIN AREA */}
                    <div className="order-1 lg:order-2 flex-1 flex flex-col gap-4 min-w-0">
                        
                        {/* CANVAS / PREVIEW TOGGLE */}
                        <div className="bg-slate-200/50 rounded-xl border border-slate-200 flex flex-col items-center justify-center p-4 overflow-hidden relative min-h-[450px] lg:flex-1 w-full">
                            <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur rounded-lg p-1 flex shadow-sm">
                                <button onClick={() => setViewMode('edit')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'edit' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                                    Éditeur
                                </button>
                                <button onClick={() => setViewMode('preview')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'preview' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                                    Aperçu Réel
                                </button>
                            </div>

                            {viewMode === 'preview' && (
                                <div className="absolute top-4 right-4 z-10 flex gap-2">
                                    <button onClick={() => setPreviewPlatform('instagram')} className={`p-1.5 rounded bg-white shadow-sm ${previewPlatform === 'instagram' ? 'text-pink-600 ring-1 ring-pink-600' : 'text-slate-400'}`}><Instagram className="h-4 w-4" /></button>
                                    <button onClick={() => setPreviewPlatform('facebook')} className={`p-1.5 rounded bg-white shadow-sm ${previewPlatform === 'facebook' ? 'text-blue-600 ring-1 ring-blue-600' : 'text-slate-400'}`}><Facebook className="h-4 w-4" /></button>
                                    <button onClick={() => setPreviewPlatform('linkedin')} className={`p-1.5 rounded bg-white shadow-sm ${previewPlatform === 'linkedin' ? 'text-blue-700 ring-1 ring-blue-700' : 'text-slate-400'}`}><Linkedin className="h-4 w-4" /></button>
                                </div>
                            )}

                            {!selectedReview ? (
                                <div className="text-center text-slate-400 flex flex-col items-center">
                                    <MessageSquare className="h-8 w-8 mb-2" />
                                    <p>Sélectionnez un avis</p>
                                </div>
                            ) : (
                                viewMode === 'edit' ? (
                                    <div ref={containerRef} className="w-full h-full flex items-center justify-center">
                                        <CanvasContent />
                                    </div>
                                ) : (
                                    <SocialFeedPreview 
                                        platform={previewPlatform} 
                                        caption={caption || "Votre légende s'affichera ici..."} 
                                        author={org?.name || "Votre Entreprise"}
                                        avatar="https://ui-avatars.com/api/?name=R+F&background=4f46e5&color=fff"
                                    >
                                        <CanvasContent />
                                    </SocialFeedPreview>
                                )
                            )}
                        </div>

                        {/* CONTROLS CARD */}
                        <div className={`bg-white rounded-xl border border-slate-200 shadow-sm shrink-0 transition-opacity duration-300 ${!selectedReview ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    {/* Style & Format Selectors */}
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                                                <Palette className="h-4 w-4" /> Style & Format
                                            </label>
                                            <Button 
                                                variant="ghost" 
                                                size="xs" 
                                                className="text-indigo-600 hover:text-indigo-700 h-auto py-0 px-2 font-bold bg-indigo-50"
                                                onClick={() => navigate('/social/models/create')}
                                            >
                                                + Créer
                                            </Button>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-4">
                                            <select value={template} onChange={(e) => setTemplate(e.target.value)} className="block w-full rounded-lg border-slate-200 text-sm py-2 px-3 focus:ring-2 focus:ring-indigo-500">
                                                {TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                            </select>
                                            <select value={format} onChange={(e) => setFormat(e.target.value)} className="block w-full rounded-lg border-slate-200 text-sm py-2 px-3 focus:ring-2 focus:ring-indigo-500">
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
                                            <input type="color" value={customColor} onChange={(e) => setCustomColor(e.target.value)} className="h-8 w-8 rounded cursor-pointer border-0 p-0 shadow-sm" />
                                        </div>
                                    </div>

                                    {/* TAGS INPUT */}
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2 mb-2">
                                            <Tag className="h-4 w-4" /> Tags (Organisation)
                                        </label>
                                        <div className="flex gap-2 mb-2">
                                            <Input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddPostTag()} placeholder="Ex: Promotion, Été..." className="text-xs h-8" />
                                            <Button size="xs" variant="secondary" onClick={handleAddPostTag}>Ajouter</Button>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {postTags.map(tag => (
                                                <Badge key={tag} variant="neutral" className="pr-1 text-[10px]">
                                                    {tag}
                                                    <button onClick={() => handleRemovePostTag(tag)} className="ml-1 hover:text-red-500"><X className="h-3 w-3" /></button>
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 flex flex-col justify-between">
                                    <div>
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                                                <Type className="h-4 w-4" /> Légende IA
                                            </label>
                                            
                                            <div className="flex items-center gap-2">
                                                <Select value={socialTone} onChange={e => setSocialTone(e.target.value)} className="h-7 text-xs w-32">
                                                    <option value="enthusiastic">Enthousiaste</option>
                                                    <option value="professionnel">Professionnel</option>
                                                    <option value="humoristique">Humour</option>
                                                    <option value="corporate">Corporate</option>
                                                </Select>
                                                <button onClick={() => setUseHashtags(!useHashtags)} className={`p-1.5 rounded text-xs border ${useHashtags ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-400'}`} title="Hashtags">
                                                    <Hash className="h-3 w-3" />
                                                </button>
                                                <button onClick={handleGenerateCaption} disabled={generatingCaption} className="text-xs text-white font-bold flex items-center gap-1 bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-1.5 rounded-full shadow-sm hover:shadow-md transition-all active:scale-95">
                                                    <Sparkles className="h-3 w-3" /> {generatingCaption ? '...' : 'Générer'}
                                                </button>
                                            </div>
                                        </div>
                                        <textarea className="w-full h-24 p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 resize-none bg-slate-50 leading-relaxed" placeholder="Générez une légende virale..." value={caption} onChange={e => setCaption(e.target.value)} />
                                    </div>

                                    <div className="flex gap-2">
                                        <Button className="flex-1" variant="outline" onClick={handleDownload} isLoading={generating} icon={Download}>Télécharger</Button>
                                        <Button className="flex-1 shadow-lg shadow-indigo-200" onClick={() => { setEditingPost(null); setShowScheduleModal(true); }} icon={Calendar}>Planifier</Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB: CALENDAR & HISTORY --- */}
            {activeTab === 'calendar' && (
                <div className="space-y-8 animate-in fade-in">
                    
                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-4 items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input placeholder="Rechercher..." className="pl-9 h-9 text-sm" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Filter className="h-4 w-4 text-slate-400" />
                            <Select value={filterTag} onChange={e => setFilterTag(e.target.value)} className="h-9 text-sm w-full sm:w-40">
                                <option value="All">Tous les tags</option>
                                {allTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                            </Select>
                        </div>
                    </div>

                    {/* UPCOMING */}
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-indigo-600" /> À venir
                        </h3>
                        {filterPosts(scheduledPosts).length === 0 ? (
                            <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl">
                                <p className="text-slate-500 text-sm">Aucun post planifié.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filterPosts(scheduledPosts).sort((a,b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()).map(post => (
                                    <div key={post.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col">
                                        <div className="h-24 bg-gradient-to-r from-indigo-50 to-slate-50 flex items-center justify-center text-slate-400 shrink-0 relative">
                                            <Sparkles className="h-6 w-6" />
                                            <div className="absolute top-2 right-2">
                                                <Badge variant="warning">Planifié</Badge>
                                            </div>
                                        </div>
                                        <div className="p-4 flex-1 flex flex-col">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-1.5">
                                                    {post.platform === 'instagram' && <Instagram className="h-4 w-4 text-pink-600" />}
                                                    {post.platform === 'facebook' && <Facebook className="h-4 w-4 text-blue-600" />}
                                                    {post.platform === 'linkedin' && <Linkedin className="h-4 w-4 text-blue-700" />}
                                                    <span className="text-xs font-bold text-slate-700 capitalize">{post.platform}</span>
                                                </div>
                                            </div>
                                            <p className="text-xs text-slate-600 line-clamp-2 mb-3 bg-slate-50 p-2 rounded flex-1">{post.content}</p>
                                            <div className="flex justify-between items-center text-xs text-slate-500 pt-2 border-t border-slate-100">
                                                <span className="flex items-center gap-1 font-semibold">
                                                    <Clock className="h-3 w-3" />
                                                    {new Date(post.scheduled_date).toLocaleString()}
                                                </span>
                                                <div className="flex gap-1">
                                                    <button onClick={() => handleEditPost(post)} className="text-slate-400 hover:text-indigo-600 p-1 hover:bg-slate-100 rounded" title="Modifier">
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                    <button onClick={() => handleDeletePost(post.id)} className="text-slate-400 hover:text-red-600 p-1 hover:bg-red-50 rounded" title="Supprimer">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* HISTORY */}
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2 mt-8">
                            <CheckCircle2 className="h-5 w-5 text-green-600" /> Historique (Publiés)
                        </h3>
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            <table className="min-w-full divide-y divide-slate-100">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Réseau</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contenu</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Statut</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Lien</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-50">
                                    {filterPosts(publishedPosts).length === 0 ? (
                                        <tr><td colSpan={5} className="p-6 text-center text-sm text-slate-500">Aucun post publié pour le moment.</td></tr>
                                    ) : (
                                        filterPosts(publishedPosts).sort((a,b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime()).map(post => (
                                            <tr key={post.id} className="hover:bg-slate-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                                    {new Date(post.scheduled_date).toLocaleDateString()} <span className="text-xs text-slate-400">{new Date(post.scheduled_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        {post.platform === 'instagram' && <Instagram className="h-4 w-4 text-pink-600" />}
                                                        {post.platform === 'facebook' && <Facebook className="h-4 w-4 text-blue-600" />}
                                                        {post.platform === 'linkedin' && <Linkedin className="h-4 w-4 text-blue-700" />}
                                                        <span className="text-sm font-medium capitalize">{post.platform}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-xs text-slate-600 line-clamp-1 max-w-xs">{post.content}</p>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <Badge variant="success">Publié</Badge>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    {post.published_url ? (
                                                        <a href={post.published_url} target="_blank" className="text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 text-xs font-medium">
                                                            Voir <ExternalLink className="h-3 w-3" />
                                                        </a>
                                                    ) : (
                                                        <span className="text-slate-400 text-xs">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ... (Keep Accounts Tab and Schedule Modal but update modal title) ... */}
            {activeTab === 'accounts' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in">
                    {/* ... (Keep existing Account Cards) ... */}
                    <Card>
                        <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                            <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center border-4 border-white shadow-md relative">
                                <Facebook className="h-8 w-8" />
                                {isConnected('facebook') && <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full border-2 border-white p-1"><CheckCircle2 className="h-3 w-3 text-white"/></div>}
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">Facebook Page</h3>
                                <p className="text-xs text-slate-500">{isConnected('facebook') ? 'Connecté' : 'Non connecté'}</p>
                            </div>
                            <Button variant={isConnected('facebook') ? 'outline' : 'primary'} className="w-full" onClick={() => handleConnect('facebook')}>
                                {isConnected('facebook') ? 'Reconnecter' : 'Connecter'}
                            </Button>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                            <div className="h-16 w-16 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 text-white rounded-full flex items-center justify-center border-4 border-white shadow-md relative">
                                <Instagram className="h-8 w-8" />
                                {isConnected('instagram') && <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full border-2 border-white p-1"><CheckCircle2 className="h-3 w-3 text-white"/></div>}
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">Instagram Business</h3>
                                <p className="text-xs text-slate-500">{isConnected('instagram') ? 'Connecté' : 'Non connecté'}</p>
                            </div>
                            <Button variant={isConnected('instagram') ? 'outline' : 'primary'} className="w-full" onClick={() => handleConnect('instagram')}>
                                {isConnected('instagram') ? 'Reconnecter' : 'Connecter'}
                            </Button>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                            <div className="h-16 w-16 bg-blue-700 text-white rounded-full flex items-center justify-center border-4 border-white shadow-md relative">
                                <Linkedin className="h-8 w-8" />
                                {isConnected('linkedin') && <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full border-2 border-white p-1"><CheckCircle2 className="h-3 w-3 text-white"/></div>}
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">LinkedIn Company</h3>
                                <p className="text-xs text-slate-500">{isConnected('linkedin') ? 'Connecté' : 'Non connecté'}</p>
                            </div>
                            <Button variant={isConnected('linkedin') ? 'outline' : 'primary'} className="w-full" onClick={() => handleConnect('linkedin')}>
                                {isConnected('linkedin') ? 'Reconnecter' : 'Connecter'}
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
                            <CardTitle>{editingPost ? 'Modifier le post' : 'Planifier la publication'}</CardTitle>
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
                            {editingPost && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Texte</label>
                                    <textarea className="w-full p-2 border rounded text-xs h-20" value={caption} onChange={e => setCaption(e.target.value)} />
                                </div>
                            )}
                            <div className="flex gap-2 pt-2">
                                <Button variant="ghost" className="flex-1" onClick={() => { setShowScheduleModal(false); setEditingPost(null); }}>Annuler</Button>
                                <Button className="flex-1" onClick={handleSchedule} disabled={!scheduleDate || !scheduleTime || scheduling} isLoading={scheduling}>
                                    {editingPost ? 'Mettre à jour' : 'Confirmer'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};
