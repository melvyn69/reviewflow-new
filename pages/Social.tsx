
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { Review, Organization } from '../types';
import { Card, CardContent, CardHeader, CardTitle, Button, useToast, Input, Select, Badge } from '../components/ui';
import { 
    Share2, 
    Instagram, 
    Facebook, 
    Linkedin, 
    Download, 
    Sparkles, 
    Copy, 
    Palette,
    Type,
    Layout,
    Star,
    Lock
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { useNavigate } from '../components/ui';

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
    
    // Editor State
    const [template, setTemplate] = useState('minimal');
    const [format, setFormat] = useState('square');
    const [showBrand, setShowBrand] = useState(true);
    const [customColor, setCustomColor] = useState('#4f46e5');
    
    // Responsive State
    const [scale, setScale] = useState(0.8);
    
    const toast = useToast();
    const canvasRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        loadData();
    }, []);

    // Responsive Scale Effect
    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current) {
                const currentFormat = FORMATS.find(f => f.id === format) || FORMATS[0];
                const isMobile = window.innerWidth < 768;
                
                // On mobile, use window width to maximize space, otherwise use container
                const containerWidth = isMobile ? window.innerWidth : containerRef.current.offsetWidth;
                // Allow container to grow if needed or use window height constraint
                const containerHeight = isMobile ? window.innerHeight * 0.5 : containerRef.current.offsetHeight;
                
                // Add padding consideration
                const padding = isMobile ? 32 : 40;
                const availableWidth = containerWidth - padding;
                const availableHeight = containerHeight - padding;
                
                const scaleX = availableWidth / currentFormat.width;
                const scaleY = availableHeight / currentFormat.height;
                
                // Fit within available space
                let newScale = Math.min(scaleX, scaleY);
                
                // Cap max scale to avoid huge elements on large screens
                if (newScale > 0.6) newScale = 0.6;
                // Enforce min scale for visibility
                if (newScale < 0.2) newScale = 0.2;
                
                setScale(newScale);
            }
        };

        window.addEventListener('resize', handleResize);
        // Initial calculation with a small delay to ensure layout
        setTimeout(handleResize, 100);

        return () => window.removeEventListener('resize', handleResize);
    }, [format]);

    const loadData = async () => {
        setLoading(true);
        const [reviewsData, organization] = await Promise.all([
            api.reviews.list({ rating: 5 }),
            api.organization.get()
        ]);
        setReviews(reviewsData);
        setOrg(organization);
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
            // Force capture at native resolution regardless of display scale
            const dataUrl = await toPng(canvasRef.current, { 
                cacheBust: true, 
                pixelRatio: 1, // 1 is enough if width/height are HD
                width: currentFormat.width,
                height: currentFormat.height,
                style: {
                    transform: 'none', // Reset scale for capture
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

    // Helper to get template classes
    const getTemplateClass = (id: string) => TEMPLATES.find(t => t.id === id)?.style || '';
    const currentFormat = FORMATS.find(f => f.id === format) || FORMATS[0];

    // PAYWALL: Block Free AND Starter plans. Only allow Pro/Enterprise.
    if (org && (org.subscription_plan === 'free' || org.subscription_plan === 'starter')) {
        return (
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <Share2 className="h-8 w-8 text-indigo-600" />
                            Social Studio
                        </h1>
                        <p className="text-slate-500">Transformez vos meilleurs avis en posts viraux.</p>
                    </div>
                </div>
                
                <Card className="relative overflow-hidden border-indigo-100 bg-white">
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-8 text-center">
                        <div className="bg-indigo-50 p-4 rounded-full shadow-lg mb-6">
                            <Sparkles className="h-10 w-10 text-indigo-600" />
                        </div>
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">Débloquez le Social Studio</h2>
                        <p className="text-slate-600 max-w-lg mb-8 text-lg">
                            Créez des visuels HD pour Instagram et LinkedIn en un clic.
                            <br/><strong>Fonctionnalité exclusive au plan Growth.</strong>
                        </p>
                        <Button size="lg" className="shadow-xl shadow-indigo-200" onClick={() => navigate('/billing')}>
                            Passer au plan Growth
                        </Button>
                    </div>
                    <CardContent className="p-8 opacity-20 filter blur-[2px]">
                        <div className="flex justify-center">
                            <div className="w-64 h-64 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                                Aperçu Bloqué
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Share2 className="h-8 w-8 text-indigo-600" />
                        Social Studio
                    </h1>
                    <p className="text-slate-500">Transformez vos meilleurs avis en posts viraux.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-auto lg:h-[calc(100vh-12rem)] lg:min-h-[600px]">
                
                {/* 1. SELECTION (Left) */}
                <div className="flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm h-96 lg:h-auto order-2 lg:order-1">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 font-bold text-slate-700 flex items-center gap-2">
                        <Star className="h-4 w-4 text-amber-400 fill-current" />
                        Vos Pépites (5★)
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {loading && <div className="p-4 text-center text-slate-400">Chargement...</div>}
                        {reviews.map(review => (
                            <div 
                                key={review.id}
                                onClick={() => setSelectedReview(review)}
                                className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${selectedReview?.id === review.id ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'border-slate-200 bg-white hover:border-indigo-300'}`}
                            >
                                <div className="flex justify-between mb-2">
                                    <span className="font-bold text-sm text-slate-900">{review.author_name}</span>
                                    <span className="text-[10px] text-slate-400">{new Date(review.received_at).toLocaleDateString()}</span>
                                </div>
                                <p className="text-xs text-slate-600 line-clamp-3 italic">"{review.body}"</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. PREVIEW & CANVAS (Center) */}
                <div className="lg:col-span-2 flex flex-col gap-6 order-1 lg:order-2">
                    <div 
                        ref={containerRef} 
                        className="bg-slate-200/50 rounded-xl border border-slate-200 flex-1 flex items-center justify-center p-4 overflow-hidden relative min-h-[400px] lg:min-h-0"
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

                    {/* CONTROLS */}
                    <Card>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block flex items-center gap-2">
                                            <Palette className="h-4 w-4" /> Style
                                        </label>
                                        <div className="flex gap-2 overflow-x-auto pb-2">
                                            {TEMPLATES.map(t => (
                                                <button
                                                    key={t.id}
                                                    onClick={() => setTemplate(t.id)}
                                                    className={`px-3 py-2 rounded text-xs font-medium border whitespace-nowrap ${template === t.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'}`}
                                                >
                                                    {t.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block flex items-center gap-2">
                                            <Layout className="h-4 w-4" /> Format
                                        </label>
                                        <div className="flex gap-2">
                                            {FORMATS.map(f => (
                                                <button
                                                    key={f.id}
                                                    onClick={() => setFormat(f.id)}
                                                    className={`px-3 py-2 rounded text-xs font-medium border ${format === f.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'}`}
                                                >
                                                    {f.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                                            <input type="checkbox" checked={showBrand} onChange={(e) => setShowBrand(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
                                            Afficher la marque
                                        </label>
                                        <input 
                                            type="color" 
                                            value={customColor} 
                                            onChange={(e) => setCustomColor(e.target.value)}
                                            className="h-8 w-8 rounded cursor-pointer border-0 p-0"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                                                <Type className="h-4 w-4" /> Légende (Caption)
                                            </label>
                                            <button 
                                                onClick={handleGenerateCaption} 
                                                disabled={generatingCaption}
                                                className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1"
                                            >
                                                <Sparkles className="h-3 w-3" />
                                                {generatingCaption ? 'Rédaction...' : 'Générer avec IA'}
                                            </button>
                                        </div>
                                        <textarea 
                                            className="w-full h-24 p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 resize-none bg-slate-50"
                                            placeholder="Générez une légende optimisée pour les réseaux sociaux..."
                                            value={caption}
                                            onChange={e => setCaption(e.target.value)}
                                        />
                                    </div>

                                    <div className="flex gap-2">
                                        <Button className="flex-1 shadow-lg shadow-indigo-200" icon={Download} onClick={handleDownload} isLoading={generating}>Télécharger HD</Button>
                                        <Button className="flex-1" variant="outline" onClick={() => { navigator.clipboard.writeText(caption); toast.success("Légende copiée !"); }}>Copier Texte</Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

// Helper for dynamic font size based on text length
const reviewTextSize = (length: number) => {
    if (length < 50) return 'text-7xl';
    if (length < 100) return 'text-6xl';
    if (length < 200) return 'text-5xl';
    return 'text-4xl';
};
