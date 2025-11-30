import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Review } from '../types';
import { Button, useToast } from './ui';
import { Star, Share2, X, Instagram, Facebook, Linkedin, Copy, Image as ImageIcon, Send, Sparkles } from 'lucide-react';

export const SocialShareModal = ({ review, onClose }: { review: Review; onClose: () => void }) => {
    const [platform, setPlatform] = useState<'instagram' | 'facebook' | 'linkedin'>('instagram');
    const [caption, setCaption] = useState('');
    const [loading, setLoading] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const toast = useToast();

    const generateCaption = async () => {
        setLoading(true);
        try {
            const text = await api.ai.generateSocialPost(review, platform as any);
            setCaption(text);
        } catch (e: any) {
            toast.error("Erreur de génération : " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePublish = async () => {
        setPublishing(true);
        try {
            await api.social.publish(platform, caption);
            toast.success(`Post publié sur ${platform} avec succès !`);
            onClose();
        } catch (e) {
            toast.error("Erreur de publication");
        } finally {
            setPublishing(false);
        }
    };

    useEffect(() => {
        generateCaption();
    }, [platform]);

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95">
                <div className="w-full md:w-1/2 bg-slate-900 p-8 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-violet-700 opacity-20"></div>
                    <div className="relative bg-white p-6 rounded-xl shadow-xl max-w-xs text-center transform hover:scale-105 transition-transform duration-500">
                        <div className="flex justify-center text-amber-400 mb-4">
                            {[1,2,3,4,5].map(i => <Star key={i} className="h-6 w-6 fill-current" />)}
                        </div>
                        <p className="text-slate-800 font-serif text-lg leading-relaxed italic mb-6">
                            "{review.body.length > 100 ? review.body.substring(0, 100) + '...' : review.body}"
                        </p>
                        <div className="flex items-center justify-center gap-3">
                            <div className="h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-xs">
                                {review.author_name.charAt(0)}
                            </div>
                            <span className="font-bold text-sm text-slate-900">{review.author_name}</span>
                        </div>
                        <div className="mt-6 pt-4 border-t border-slate-100 text-[10px] text-slate-400 uppercase tracking-widest">
                            Client Heureux
                        </div>
                    </div>
                </div>

                <div className="w-full md:w-1/2 p-6 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                            <Share2 className="h-5 w-5 text-indigo-600" />
                            Créer un Post
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
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Légende suggérée</label>
                        {loading ? (
                            <div className="h-32 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100">
                                <div className="flex items-center gap-2 text-slate-400 text-sm">
                                    <Sparkles className="h-4 w-4 animate-spin" /> Génération IA...
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
                            onClick={() => {navigator.clipboard.writeText(caption); toast.success("Texte copié !")}}
                            className="absolute bottom-2 right-2 p-1.5 bg-white shadow-sm border border-slate-200 rounded hover:bg-slate-50 text-slate-500"
                            title="Copier"
                        >
                            <Copy className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="mt-auto flex gap-3">
                        <Button 
                            variant="secondary" 
                            className="flex-1" 
                            icon={ImageIcon} 
                            onClick={() => toast.success("Image téléchargée (simulation)")}
                        >
                            Télécharger
                        </Button>
                        <Button 
                            variant="primary" 
                            className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 border-none shadow-lg shadow-indigo-200" 
                            icon={Send} 
                            onClick={handlePublish}
                            isLoading={publishing}
                        >
                            Publier
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};