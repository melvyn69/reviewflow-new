import React, { useState, useEffect } from 'react';
import { Star, MapPin, Loader2, ArrowRight, CheckCircle2, Copy, Heart, AlertTriangle, ExternalLink } from 'lucide-react';
import { Button, Input, useToast } from '../components/ui';
import { api } from '../lib/api';
import { useParams } from 'react-router-dom';

const POSITIVE_TAGS = ['Accueil', 'Rapidité', 'Propreté', 'Qualité', 'Ambiance', 'Conseil'];
const NEGATIVE_TAGS = ['Attente', 'Service', 'Prix', 'Bruit', 'Hygiène', 'Qualité'];

const Confetti = () => (
    <div className="confetti-container">
        {[...Array(20)].map((_, i) => (
            <div key={i} className="confetti"></div>
        ))}
    </div>
);

export const ReviewFunnel = () => {
    const { locationId } = useParams();
    const toast = useToast();
    
    const [step, setStep] = useState<'rating' | 'details' | 'redirecting' | 'success'>('rating');
    const [rating, setRating] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [contact, setContact] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    
    const [locationInfo, setLocationInfo] = useState<{name: string, city: string, googleUrl?: string} | null>(null);

    useEffect(() => {
        if (locationId) {
            api.public.getLocationInfo(locationId)
                .then((info) => {
                    if (info) {
                        setLocationInfo(info as any);
                    } else {
                        // Fallback si l'ID est introuvable (évite l'écran blanc)
                        setLocationInfo({ name: "Établissement", city: "", googleUrl: "" });
                    }
                })
                .catch(() => setLocationInfo({ name: "Établissement", city: "", googleUrl: "" }));
        }
    }, [locationId]);

    const handleRatingSelect = (score: number) => {
        setRating(score);
        
        if (score >= 4) {
            // FLUX POSITIF
            setStep('redirecting');
            
            // Enregistrement silencieux pour les stats
            if (locationId) {
                api.public.submitFeedback(locationId, score, "Avis positif rapide (Stars only)", "", [])
                    .catch(err => console.error("Erreur save stats:", err));
            }
            
            // Tentative de redirection
            setTimeout(() => {
                if (locationInfo?.googleUrl && locationInfo.googleUrl.startsWith('http')) {
                    window.location.href = locationInfo.googleUrl;
                } else {
                    // Si pas de lien, on reste sur l'écran de succès sans erreur
                    console.log("Lien Google non configuré, redirection annulée.");
                }
            }, 2000);

        } else {
            // FLUX NÉGATIF : Formulaire interne
            setTimeout(() => {
                setStep('details');
            }, 300);
        }
    };

    const toggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter(t => t !== tag));
        } else {
            setSelectedTags([...selectedTags, tag]);
        }
    };

    const handleSubmitFeedback = async () => {
        if (!locationId) return;
        setLoading(true);
        try {
            await api.public.submitFeedback(locationId, rating, feedback, contact, selectedTags);
            setStep('success');
        } catch (error: any) {
            console.error("Feedback submission error", error);
            toast.error("Erreur lors de l'envoi. Réessayez.");
        } finally {
            setLoading(false);
        }
    };

    if (!locationInfo) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-10 w-10 animate-spin text-indigo-600"/></div>;

    // Vérification pour l'affichage conditionnel du message de redirection
    const hasGoogleLink = locationInfo.googleUrl && locationInfo.googleUrl.length > 5;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {step === 'redirecting' && <Confetti />}
            
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden relative z-10 min-h-[500px] flex flex-col">
                {/* Header Image / Brand */}
                <div className="bg-indigo-600 h-32 relative flex items-center justify-center shrink-0">
                     <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                     <div className="absolute -bottom-8 bg-white p-1 rounded-full shadow-lg">
                        <div className="h-16 w-16 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-bold text-2xl border-4 border-white">
                            {locationInfo.name ? locationInfo.name.charAt(0) : 'E'}
                        </div>
                     </div>
                </div>

                <div className="pt-12 pb-8 px-8 text-center flex-1 flex flex-col justify-center">
                    <h1 className="text-xl font-bold text-slate-900 mb-1">{locationInfo.name}</h1>
                    {locationInfo.city && (
                        <p className="text-sm text-slate-500 flex items-center justify-center gap-1 mb-8">
                            <MapPin className="h-3 w-3" /> {locationInfo.city}
                        </p>
                    )}
                    {!locationInfo.city && <div className="mb-8"></div>}

                    {/* STEP 1: RATING */}
                    {step === 'rating' && (
                        <div className="animate-in fade-in zoom-in-95 duration-500">
                            <h2 className="text-lg font-medium text-slate-800 mb-6">Comment s'est passée votre visite ?</h2>
                            <div className="flex justify-center gap-2 mb-8">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        onClick={() => handleRatingSelect(star)}
                                        className="transition-all hover:scale-110 focus:outline-none group active:scale-90"
                                    >
                                        <Star 
                                            className={`h-10 w-10 transition-colors duration-300 ${star <= rating ? 'fill-amber-400 text-amber-400 drop-shadow-sm' : 'text-slate-200 group-hover:text-amber-200'}`} 
                                        />
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-slate-400">Touchez une étoile pour noter</p>
                        </div>
                    )}

                    {/* STEP 2: REDIRECTING (Positive) */}
                    {step === 'redirecting' && (
                        <div className="animate-in zoom-in-95 duration-500 py-8">
                             <div className="inline-block p-4 rounded-full bg-green-100 text-green-600 mb-6 animate-bounce">
                                <Heart className="h-12 w-12 fill-current" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">Merci, c'est génial !</h2>
                            
                            {hasGoogleLink ? (
                                <>
                                    <p className="text-slate-600 mb-8 text-lg">
                                        Nous vous redirigeons vers Google pour partager votre expérience...
                                    </p>
                                    <div className="flex justify-center">
                                        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                                    </div>
                                    <p className="text-xs text-slate-400 mt-8">
                                        Si la redirection ne fonctionne pas, <a href={locationInfo.googleUrl} target="_blank" rel="noreferrer" className="underline text-indigo-600">cliquez ici</a>.
                                    </p>
                                </>
                            ) : (
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <p className="text-slate-600 mb-2">
                                        Nous sommes ravis que vous ayez apprécié !
                                    </p>
                                    <p className="text-xs text-slate-400 italic">
                                        (La redirection Google n'est pas encore configurée par l'établissement)
                                    </p>
                                    <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Retour</Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 3: DETAILS (Negative Only) */}
                    {step === 'details' && (
                        <div className="animate-in slide-in-from-right-8 duration-300 text-left">
                            <div className="text-center mb-6">
                                <div className="inline-flex items-center justify-center gap-1 bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-sm font-bold mb-4">
                                    <Star className="h-3 w-3 fill-current" /> {rating}/5
                                    <button onClick={() => setStep('rating')} className="ml-2 text-xs underline text-amber-400 font-normal">Modifier</button>
                                </div>
                                <h2 className="text-lg font-bold text-slate-800">
                                    Que pouvons-nous améliorer ?
                                </h2>
                            </div>

                            {/* Tags Selection */}
                            <div className="flex flex-wrap gap-2 justify-center mb-6">
                                {NEGATIVE_TAGS.map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => toggleTag(tag)}
                                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${
                                            selectedTags.includes(tag)
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-105'
                                                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
                                        }`}
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Message (Optionnel)</label>
                                    <textarea 
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-h-[80px] transition-all"
                                        placeholder="Dites-nous en plus..."
                                        value={feedback}
                                        onChange={e => setFeedback(e.target.value)}
                                    />
                                </div>
                                
                                <div className="animate-in fade-in">
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Email (pour vous répondre)</label>
                                    <Input 
                                        placeholder="votre@email.com"
                                        value={contact}
                                        onChange={e => setContact(e.target.value)}
                                        className="rounded-xl"
                                    />
                                </div>

                                <Button 
                                    onClick={handleSubmitFeedback} 
                                    className="w-full h-12 text-base rounded-xl shadow-lg shadow-indigo-100 mt-2" 
                                    isLoading={loading}
                                    icon={ArrowRight}
                                >
                                    Envoyer
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: SUCCESS (End of Negative Flow) */}
                    {step === 'success' && (
                        <div className="animate-in zoom-in-95 duration-300">
                             <div className="h-20 w-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
                                <CheckCircle2 className="h-10 w-10" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 mb-2">Merci pour votre retour</h2>
                            <p className="text-slate-600 mb-8">
                                Votre message a bien été transmis à la direction. Nous prenons vos remarques très au sérieux pour nous améliorer.
                            </p>
                            <Button variant="outline" onClick={() => window.location.reload()}>Fermer</Button>
                        </div>
                    )}
                </div>
                
                {/* Footer Branding */}
                <div className="bg-slate-50 p-4 text-center border-t border-slate-100 flex items-center justify-center gap-2 mt-auto">
                    <span className="text-xs text-slate-400 font-medium">Powered by</span>
                    <span className="text-xs font-bold text-indigo-600">Reviewflow</span>
                </div>
            </div>
        </div>
    );
};