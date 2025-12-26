import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { Review } from '../types';
import { Button, useToast } from './ui';
import { Star, Share2, X, Instagram, Facebook, Linkedin, Copy, Sparkles, Download, ExternalLink } from 'lucide-react';
import { toPng } from 'html-to-image';
import { safeInitial } from '../lib/utils';

export const SocialShareModal = ({ review, onClose }: { review: Review; onClose: () => void }) => {
    const [platform, setPlatform] = useState<'instagram' | 'facebook' | 'linkedin'>('instagram');
    const [caption, setCaption] = useState('');
    const [loading, setLoading] = useState(false);
    const [generatingImage, setGeneratingImage] = useState(false);
    
    const toast = useToast();
    const cardRef = useRef<HTMLDivElement>(null);

    const generateCaption = async () => {
        setLoading(true);
        try {
            const text = await api.ai.generateSocialPost(review, platform);
            setCaption(text);
        } catch (e: any) {
            toast.error("Erreur de génération : " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCopyCaption = () => {
        navigator.clipboard.writeText(caption);
        toast.success("Texte copié dans le presse-papier !");
    };

    const handleOpenPlatform = () => {
        const urls = {
            instagram: 'https://instagram.com',
            facebook: 'https://facebook.com',
            linkedin: 'https://linkedin.com'
        };
        window.open(urls[platform], '_blank');
        onClose();
    };

    const handleDownloadImage = async () => {
        if (!cardRef.current) return;
        setGeneratingImage(true);
        try {
            const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2 });
            const link = document.createElement('a');
            link.download = `avis-${review.author_name.replace(/\s+/g, '-').toLowerCase()}.png`;
            link.href = dataUrl;
            link.click();
            toast.success("Image téléchargée !");
        } catch (err) {
            console.error(err);
            toast.error("Impossible de générer l'image.");
        } finally {
            setGeneratingImage(false);
        }
    };

    useEffect(() => {
        generateCaption();
    }, [platform]);

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 max-h-[90vh]">
                
                {/* Visual Preview Section (The part to be captured) */}
                <div className="w-full md:w-1/2 bg-slate-900 p-8 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-violet-700 opacity-20"></div>
                    
                    {/* Capture Target */}
                    <div 
                        ref={cardRef}
                        className="relative bg-white p-8 rounded-xl shadow-2xl max-w-xs text-center transform transition-transform duration-500 aspect-square flex flex-col justify-center items-center"
                        style={{ background: 'linear-gradient(145deg, #ffffff, #f8fafc)' }}
                    >
                        <div className="flex justify-center gap-1 text-amber-400 mb-6">
                            {[1,2,3,4,5].map(i => <Star key={i} className={`h-6 w-6 ${i <= review.rating ? 'fill-current' : 'text-slate-200 fill-slate-200'}`} />)}
                        </div>
                        <p className="text-slate-800 font-serif text-lg leading-relaxed italic mb-8 line-clamp-4">
                            "{review.body}"
                        </p>
                        <div className="flex items-center justify-center gap-3">
                            <div className="h-10 w-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
                                {safeInitial(review.author_name)}
                            </div>
                            <div className="text-left">
                                <div className="font-bold text-sm text-slate-900">{review.author_name}</div>
                                <div className="text-[10px] text-slate-500 uppercase tracking-wide">Client Vérifié</div>
                            </div>
                        </div>
                        
                        {/* Branding Watermark */}
                        <div className="absolute bottom-4 opacity-30">
                           <div className="flex items-center gap-1">
                             <div className="h-3 w-3 bg-slate-900 rounded-sm"></div>
                             <span className="text-[10px] font-bold text-slate-900 tracking-widest">REVIEWFLOW</span>
                           </div>
                        </div>
                    </div>
                </div>

                {/* Controls Section */}
                <div className="w-full md:w-1/2 p-6 flex flex-col h-full overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                            <Share2 className="h-5 w-5 text-indigo-600" />
                            Studio Marketing
                        </h3>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5"/></button>
                    </div>

                    <div className="flex gap-2 mb-6">
                        <button 
                            onClick={() => setPlatform('instagram')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border transition-all ${platform === 'instagram' ? 'bg-pink-50 border-pink-200 text-pink-700' : 'border-slate-200 hover:bg-slate-50'}`}
                        >
                            <Instagram className="h-4 w-4" />
                        </button>
                        <button 
                            onClick={() => setPlatform('facebook')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border transition-all ${platform === 'facebook' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-slate-200 hover:bg-slate-50'}`}
                        >
                            <Facebook className="h-4 w-4" />
                        </button>
                        <button 
                            onClick={() => setPlatform('linkedin')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border transition-all ${platform === 'linkedin' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-slate-200 hover:bg-slate-50'}`}
                        >
                            <Linkedin className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="flex-1 mb-4 relative">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Légende IA (Optimisée SEO)</label>
                        {loading ? (
                            <div className="h-32 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100">
                                <div className="flex items-center gap-2 text-slate-400 text-sm">
                                    <Sparkles className="h-4 w-4 animate-spin" /> Génération du texte...
                                </div>
                            </div>
                        ) : (
                            <textarea 
                                className="w-full h-32 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                                value={caption}
                                onChange={e => setCaption(e.target.value)}
                            />
                        )}
                        <button 
                            onClick={handleCopyCaption}
                            className="absolute bottom-2 right-2 p-1.5 bg-white shadow-sm border border-slate-200 rounded hover:bg-slate-50 text-slate-500"
                            title="Copier"
                        >
                            <Copy className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="mt-auto space-y-3">
                        <div className="flex gap-3">
                            <Button 
                                variant="secondary" 
                                className="flex-1" 
                                icon={Download} 
                                onClick={handleDownloadImage}
                                isLoading={generatingImage}
                            >
                                1. Télécharger
                            </Button>
                            <Button 
                                variant="primary" 
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 border-none shadow-lg shadow-indigo-100" 
                                icon={Copy} 
                                onClick={handleCopyCaption}
                            >
                                2. Copier Texte
                            </Button>
                        </div>
                        
                        <Button 
                            variant="ghost" 
                            className="w-full text-slate-500 hover:text-indigo-600 text-xs" 
                            icon={ExternalLink} 
                            onClick={handleOpenPlatform}
                        >
                            3. Ouvrir {platform} pour poster
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
