
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { Review, Organization, SocialPost, SocialAccount, SocialLog, Location } from '../types';
import { Card, CardContent, CardHeader, CardTitle, Button, useToast, Input, Badge, ProLock, Select, Toggle } from '../components/ui';
import { RestrictedFeature } from '../components/AccessControl';
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
    Pencil,
    History,
    AlertCircle,
    Play,
    Store,
    Image as ImageIcon,
    UploadCloud,
    Film,
    ChevronRight,
    ChevronLeft,
    Rocket,
    Settings
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { useLocation, useNavigate } from '../components/ui';

// ... (Rest of the SocialPage component code same as before, but wrapped)

// --- HELPERS ---
const FORMATS = [
    { id: 'square', name: 'Carré (1:1)', width: 1080, height: 1080 },
    { id: 'portrait', name: 'Story (9:16)', width: 1080, height: 1920 },
    { id: 'landscape', name: 'LinkedIn (1.91:1)', width: 1200, height: 628 }
];

const TEMPLATES = [
    { id: 'minimal', name: 'Minimal', style: 'bg-white text-slate-900 border-2 border-slate-900' },
    { id: 'dark', name: 'Dark Mode', style: 'bg-slate-900 text-white border-2 border-slate-700' },
    { id: 'gradient', name: 'Vibrant', style: 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white' },
    { id: 'paper', name: 'Papier', style: 'bg-[#fdfbf7] text-slate-800 shadow-xl' },
];

// ... ImageUploader Component ...
const ImageUploader = ({ onUpload, currentImage }: { onUpload: (url: string) => void, currentImage?: string }) => {
    // ... implementation same as before
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) await processFile(file);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) await processFile(file);
    };

    const processFile = async (file: File) => {
        if (!file.type.startsWith('image/')) return alert("Seules les images sont acceptées");
        setUploading(true);
        try {
            const compressedFile = await compressImage(file);
            const url = await api.social.uploadMedia(compressedFile);
            onUpload(url);
        } catch (e) {
            console.error(e);
            alert("Erreur upload");
        } finally {
            setUploading(false);
        }
    };

    const compressImage = (file: File): Promise<File> => {
        return new Promise((resolve) => {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const MAX_WIDTH = 1920;
                let width = img.width;
                let height = img.height;

                if (width > MAX_WIDTH) {
                    height = Math.round((height * MAX_WIDTH) / width);
                    width = MAX_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;
                ctx?.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    if (blob) {
                        const newFile = new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() });
                        resolve(newFile);
                    } else {
                        resolve(file); 
                    }
                }, 'image/jpeg', 0.8);
            };
        });
    };

    return (
        <div 
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer relative overflow-hidden ${dragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
        >
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
            {uploading ? (
                <div className="flex flex-col items-center">
                    <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full mb-2"></div>
                    <p className="text-sm text-indigo-600 font-medium">Optimisation & Envoi...</p>
                </div>
            ) : currentImage ? (
                <div className="relative group">
                    <img src={currentImage} className="max-h-64 mx-auto rounded-lg shadow-sm" />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                        <p className="text-white font-bold">Changer l'image</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-2">
                    <div className="mx-auto w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                        <UploadCloud className="h-6 w-6" />
                    </div>
                    <h3 className="font-bold text-slate-700">Glissez une image ici</h3>
                    <p className="text-xs text-slate-500">JPG, PNG jusqu'à 5MB</p>
                </div>
            )}
        </div>
    );
};

// --- WIZARD COMPONENTS ---
const WizardStep = ({ number, title, active, completed }: any) => (
    <div className={`flex items-center gap-2 ${active ? 'text-indigo-600' : completed ? 'text-green-600' : 'text-slate-400'}`}>
        <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm border-2 ${active ? 'border-indigo-600 bg-indigo-50' : completed ? 'border-green-600 bg-green-50' : 'border-slate-300'}`}>
            {completed ? <CheckCircle2 className="h-5 w-5" /> : number}
        </div>
        <span className={`text-sm font-medium hidden sm:inline ${active ? 'font-bold' : ''}`}>{title}</span>
        <div className={`h-0.5 w-8 bg-slate-200 mx-2 hidden md:block`}></div>
    </div>
);

// --- MAIN PAGE ---
export const SocialPage = () => {
    const [org, setOrg] = useState<Organization | null>(null);
    const [locations, setLocations] = useState<Location[]>([]);
    const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
    const [activeTab, setActiveTab] = useState<'create' | 'calendar'>('create');
    const [showInfoBanner, setShowInfoBanner] = useState(true);
    
    const [posts, setPosts] = useState<SocialPost[]>([]);
    const [reviews, setReviews] = useState<Review[]>([]);
    
    const [currentStep, setCurrentStep] = useState(1);
    const [wizardData, setWizardData] = useState({
        content: '',
        image_url: '',
        platforms: { instagram: true, facebook: false, linkedin: false },
        date: '',
        time: '10:00'
    });
    
    const [selectedReview, setSelectedReview] = useState<Review | null>(null);
    const [template, setTemplate] = useState('minimal');
    const [format, setFormat] = useState('square');
    const canvasRef = useRef<HTMLDivElement>(null);
    const [generatingCanvas, setGeneratingCanvas] = useState(false);

    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const toast = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        loadData();
    }, [selectedLocationId]);

    const loadData = async () => {
        const organization = await api.organization.get();
        setOrg((prev) => {
            if (!organization) return prev;
            if (!prev || prev.id !== organization.id) return organization;
            return prev;
        });
        setLocations(organization?.locations || []);
        
        const locFilter = selectedLocationId === 'all' ? undefined : selectedLocationId;
        
        const [postsData, reviewsData] = await Promise.all([
            api.social.getPosts(locFilter),
            api.reviews.list({ rating: 5 })
        ]);
        
        setPosts(postsData);
        setReviews(locFilter ? reviewsData.filter(r => r.location_id === locFilter) : reviewsData);
    };

    const handleWizardChange = (field: string, value: any) => {
        setWizardData(prev => ({ ...prev, [field]: value }));
    };

    const handleGenerateContent = async () => {
        setIsGeneratingAI(true);
        try {
            const context = { 
                rating: 5, 
                author_name: "Client", 
                body: "Super expérience" 
            }; 
            const text = await api.ai.generateSocialPost(context as any, 'instagram');
            handleWizardChange('content', text);
        } catch(e) {
            toast.error("Erreur IA");
        } finally {
            setIsGeneratingAI(false);
        }
    };

    const handleCanvasToImage = async () => {
        if (!canvasRef.current) return;
        setGeneratingCanvas(true);
        try {
            const dataUrl = await toPng(canvasRef.current, { cacheBust: true, pixelRatio: 2 });
            const res = await fetch(dataUrl);
            const blob = await res.blob();
            const file = new File([blob], "review-card.png", { type: "image/png" });
            const url = await api.social.uploadMedia(file);
            
            handleWizardChange('image_url', url);
            toast.success("Image générée et ajoutée !");
        } catch(e) {
            console.error(e);
            toast.error("Erreur génération image");
        } finally {
            setGeneratingCanvas(false);
        }
    };

    const handleSchedule = async () => {
        if (!wizardData.date || !wizardData.time) return toast.error("Date requise");
        
        const scheduledDate = new Date(`${wizardData.date}T${wizardData.time}`).toISOString();
        
        const activePlatforms = Object.entries(wizardData.platforms).filter(([_, active]) => active).map(([p]) => p);
        
        for (const platform of activePlatforms) {
            await api.social.schedulePost({
                location_id: selectedLocationId === 'all' ? locations[0]?.id : selectedLocationId, 
                platform: platform as any,
                content: wizardData.content,
                image_url: wizardData.image_url,
                scheduled_date: scheduledDate
            });
        }
        
        toast.success(`${activePlatforms.length} posts planifiés !`);
        setWizardData({ content: '', image_url: '', platforms: { instagram: true, facebook: false, linkedin: false }, date: '', time: '10:00' });
        setCurrentStep(1);
        setActiveTab('calendar');
        loadData();
    };

    const CanvasRenderer = () => (
        <div 
            ref={canvasRef}
            className={`w-[1080px] h-[1080px] flex flex-col items-center justify-center p-16 relative ${TEMPLATES.find(t => t.id === template)?.style}`}
            style={{ transform: 'scale(0.3)', transformOrigin: 'top left', marginBottom: '-700px' }} 
        >
            <div className="text-6xl font-serif text-center italic">
                "{selectedReview?.body}"
            </div>
            <div className="mt-12 text-4xl font-bold">
                - {selectedReview?.author_name}
            </div>
            <div className="flex gap-2 mt-8">
                {[1,2,3,4,5].map(i => <Star key={i} className="h-12 w-12 fill-current text-yellow-400" />)}
            </div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 px-4 sm:px-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Share2 className="h-8 w-8 text-indigo-600" />
                        Social Studio
                        <Badge variant="pro">GROWTH</Badge>
                    </h1>
                    <p className="text-slate-500">Gestion centralisée multi-canaux.</p>
                </div>
                
                {/* Location Selector */}
                {locations.length > 0 && (
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                        <Store className="h-4 w-4 text-slate-400 ml-2" />
                        <select 
                            className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer py-1 pr-8"
                            value={selectedLocationId}
                            onChange={(e) => setSelectedLocationId(e.target.value)}
                        >
                            <option value="all">Tous les établissements</option>
                            {locations.map(loc => (
                                <option key={loc.id} value={loc.id}>{loc.name}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* RESTRICTED CONTENT AREA */}
            <RestrictedFeature feature="social_studio" org={org}>
                {/* Consolidation Banner */}
                {showInfoBanner && (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex justify-between items-start animate-in fade-in slide-in-from-top-2">
                        <div className="flex gap-4">
                            <div className="p-2 bg-white rounded-lg border border-indigo-100 shadow-sm text-indigo-600">
                                <Rocket className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-indigo-900 text-sm">Le Social Booster fusionne avec Social Studio !</h4>
                                <p className="text-sm text-indigo-700 mt-1 max-w-2xl leading-relaxed">
                                    Pour plus de simplicité, nous avons regroupé la publication manuelle et l'automatisation. 
                                    Retrouvez vos <strong>Autoposts IA</strong> directement dans l'onglet <span className="font-semibold underline cursor-pointer hover:text-indigo-900" onClick={() => navigate('/automation')}>Automatisation</span>.
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setShowInfoBanner(false)} className="text-indigo-400 hover:text-indigo-600 transition-colors">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex border-b border-slate-200 items-center">
                    <button 
                        onClick={() => setActiveTab('create')} 
                        className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'create' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Créer un Post
                    </button>
                    <button 
                        onClick={() => setActiveTab('calendar')} 
                        className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'calendar' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Planning
                    </button>
                    <div className="ml-auto pr-4">
                        <Button variant="ghost" size="sm" onClick={() => navigate('/settings?tab=integrations')} className="text-slate-500 hover:text-indigo-600">
                            <Settings className="h-4 w-4 mr-2" /> Gérer les comptes
                        </Button>
                    </div>
                </div>

                {/* --- WIZARD: CREATE --- */}
                {activeTab === 'create' && (
                    <div className="space-y-8 mt-6">
                        {/* Progress */}
                        <div className="flex justify-between max-w-3xl mx-auto mb-8">
                            <WizardStep number={1} title="Contenu" active={currentStep === 1} completed={currentStep > 1} />
                            <WizardStep number={2} title="Média" active={currentStep === 2} completed={currentStep > 2} />
                            <WizardStep number={3} title="Réseaux" active={currentStep === 3} completed={currentStep > 3} />
                            <WizardStep number={4} title="Planification" active={currentStep === 4} completed={currentStep > 4} />
                        </div>

                        <div className="max-w-3xl mx-auto">
                            <Card className="min-h-[400px] flex flex-col">
                                <CardContent className="p-8 flex-1">
                                    
                                    {/* STEP 1: CONTENT */}
                                    {currentStep === 1 && (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                            <div className="flex justify-between items-center">
                                                <h3 className="text-lg font-bold text-slate-900">Quoi de neuf ?</h3>
                                                <Button size="xs" variant="secondary" onClick={handleGenerateContent} isLoading={isGeneratingAI} icon={Sparkles}>
                                                    Assistant IA
                                                </Button>
                                            </div>
                                            <textarea 
                                                className="w-full h-40 p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 resize-none bg-slate-50"
                                                placeholder="Écrivez votre légende ici..."
                                                value={wizardData.content}
                                                onChange={(e) => handleWizardChange('content', e.target.value)}
                                            />
                                            <div className="flex gap-2">
                                                <Badge variant="neutral" className="cursor-pointer hover:bg-slate-200" onClick={() => handleWizardChange('content', wizardData.content + ' #Promotion')}>#Promotion</Badge>
                                                <Badge variant="neutral" className="cursor-pointer hover:bg-slate-200" onClick={() => handleWizardChange('content', wizardData.content + ' #Event')}>#Event</Badge>
                                                <Badge variant="neutral" className="cursor-pointer hover:bg-slate-200" onClick={() => handleWizardChange('content', wizardData.content + ' #New')}>#New</Badge>
                                            </div>
                                        </div>
                                    )}

                                    {/* STEP 2: MEDIA */}
                                    {currentStep === 2 && (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                            <h3 className="text-lg font-bold text-slate-900">Ajouter un visuel</h3>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {/* Option A: Upload */}
                                                <div>
                                                    <h4 className="text-sm font-bold text-slate-500 mb-2 uppercase">Importer</h4>
                                                    <ImageUploader 
                                                        currentImage={wizardData.image_url} 
                                                        onUpload={(url) => handleWizardChange('image_url', url)} 
                                                    />
                                                </div>

                                                {/* Option B: From Review */}
                                                <div className="border-l border-slate-100 pl-6">
                                                    <h4 className="text-sm font-bold text-slate-500 mb-2 uppercase">Ou créer depuis un avis</h4>
                                                    <div className="space-y-4">
                                                        <Select 
                                                            value={selectedReview?.id || ''} 
                                                            onChange={(e) => setSelectedReview(reviews.find(r => r.id === e.target.value) || null)}
                                                        >
                                                            <option value="">Choisir un avis 5★...</option>
                                                            {reviews.map(r => <option key={r.id} value={r.id}>{r.author_name} - {r.rating}★</option>)}
                                                        </Select>
                                                        
                                                        {selectedReview && (
                                                            <div className="bg-slate-50 p-2 rounded border border-slate-200 overflow-hidden h-40 relative">
                                                                {/* Hidden Canvas for generation */}
                                                                <div className="absolute opacity-0 pointer-events-none">
                                                                    <CanvasRenderer />
                                                                </div>
                                                                <div className="text-center pt-8 text-xs text-slate-400">Aperçu généré en arrière-plan</div>
                                                                <Button size="sm" className="absolute bottom-2 left-2 right-2" onClick={handleCanvasToImage} isLoading={generatingCanvas}>
                                                                    Utiliser cet avis
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* STEP 3: NETWORKS */}
                                    {currentStep === 3 && (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                            <h3 className="text-lg font-bold text-slate-900">Choisir les plateformes</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {[
                                                    { id: 'instagram', icon: Instagram, label: 'Instagram', color: 'text-pink-600' },
                                                    { id: 'facebook', icon: Facebook, label: 'Facebook', color: 'text-blue-600' },
                                                    { id: 'linkedin', icon: Linkedin, label: 'LinkedIn', color: 'text-blue-700' },
                                                ].map(net => (
                                                    <div 
                                                        key={net.id}
                                                        onClick={() => handleWizardChange('platforms', { ...wizardData.platforms, [net.id]: !wizardData.platforms[net.id as keyof typeof wizardData.platforms] })}
                                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${wizardData.platforms[net.id as keyof typeof wizardData.platforms] ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}
                                                    >
                                                        <net.icon className={`h-6 w-6 ${net.color}`} />
                                                        <span className="font-bold text-slate-700">{net.label}</span>
                                                        {wizardData.platforms[net.id as keyof typeof wizardData.platforms] && <CheckCircle2 className="ml-auto h-5 w-5 text-indigo-600" />}
                                                    </div>
                                                ))}
                                            </div>
                                            
                                            {!wizardData.image_url && wizardData.platforms.instagram && (
                                                <div className="bg-amber-50 text-amber-800 p-3 rounded-lg text-sm flex items-center gap-2">
                                                    <AlertCircle className="h-4 w-4" />
                                                    Instagram nécessite une image. Retournez à l'étape 2.
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* STEP 4: SCHEDULE */}
                                    {currentStep === 4 && (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                            <h3 className="text-lg font-bold text-slate-900">Quand publier ?</h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                                                    <Input type="date" value={wizardData.date} onChange={e => handleWizardChange('date', e.target.value)} />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Heure</label>
                                                    <Input type="time" value={wizardData.time} onChange={e => handleWizardChange('time', e.target.value)} />
                                                </div>
                                            </div>
                                            
                                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-4">
                                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Récapitulatif</h4>
                                                <div className="flex gap-4 items-start">
                                                    {wizardData.image_url && <img src={wizardData.image_url} className="h-16 w-16 object-cover rounded-lg bg-slate-200" />}
                                                    <div>
                                                        <p className="text-sm text-slate-800 line-clamp-2 italic">"{wizardData.content}"</p>
                                                        <div className="flex gap-2 mt-2">
                                                            {Object.entries(wizardData.platforms).filter(([_, v]) => v).map(([k]) => (
                                                                <Badge key={k} variant="neutral" className="capitalize">{k}</Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                </CardContent>
                                
                                {/* FOOTER NAV */}
                                <div className="p-6 border-t border-slate-100 flex justify-between bg-slate-50 rounded-b-xl">
                                    <Button variant="ghost" onClick={() => setCurrentStep(Math.max(1, currentStep - 1))} disabled={currentStep === 1}>
                                        <ChevronLeft className="h-4 w-4 mr-2" /> Retour
                                    </Button>
                                    {currentStep < 4 ? (
                                        <Button onClick={() => setCurrentStep(currentStep + 1)} disabled={currentStep === 1 && !wizardData.content}>
                                            Suivant <ChevronRight className="h-4 w-4 ml-2" />
                                        </Button>
                                    ) : (
                                        <Button onClick={handleSchedule} className="bg-green-600 hover:bg-green-700 border-none">
                                            Confirmer la planification
                                        </Button>
                                    )}
                                </div>
                            </Card>
                        </div>
                    </div>
                )}

                {/* --- TAB: CALENDAR --- */}
                {activeTab === 'calendar' && (
                    <div className="space-y-6 mt-6">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-indigo-600" /> Planning
                            </h3>
                            {posts.length === 0 ? (
                                <div className="text-center text-slate-500 py-8">Aucun post planifié pour cet établissement.</div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {posts.map(post => (
                                        <div key={post.id} className="border border-slate-200 rounded-lg p-4 bg-white flex flex-col hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    {post.platform === 'instagram' && <Instagram className="h-4 w-4 text-pink-600" />}
                                                    {post.platform === 'facebook' && <Facebook className="h-4 w-4 text-blue-600" />}
                                                    <span className="text-xs font-bold capitalize">{post.platform}</span>
                                                </div>
                                                <Badge variant={post.status === 'published' ? 'success' : 'warning'}>{post.status}</Badge>
                                            </div>
                                            {post.image_url && <img src={post.image_url} className="w-full h-32 object-cover rounded-md mb-2 bg-slate-100" />}
                                            <p className="text-xs text-slate-600 line-clamp-2 mb-3 flex-1">{post.content}</p>
                                            <div className="text-xs text-slate-400 flex items-center gap-1">
                                                <Clock className="h-3 w-3" /> {new Date(post.scheduled_date).toLocaleString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </RestrictedFeature>
        </div>
    );
};
