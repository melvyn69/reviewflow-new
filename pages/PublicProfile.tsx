
import React, { useEffect, useState } from 'react';
import { useParams } from '../components/ui';
import { api } from '../lib/api';
import { Review, Location } from '../types';
import { safeInitial } from '../lib/utils';
import { Button, Card, CardContent, Skeleton } from '../components/ui';
import { Star, MapPin, Globe, Phone, CheckCircle2, ShieldCheck, MessageCircle, ExternalLink, Calendar } from 'lucide-react';

const SourceBadge = ({ source }: { source: string }) => {
    const colors: Record<string, string> = {
        google: 'text-blue-600 bg-blue-50',
        facebook: 'text-blue-700 bg-blue-50',
        tripadvisor: 'text-green-600 bg-green-50'
    };
    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${colors[source] || 'text-slate-600 bg-slate-100'}`}>
            {source}
        </span>
    );
};

export const PublicProfilePage = () => {
    const { locationId } = useParams();
    const [location, setLocation] = useState<Location | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ avg: 0, count: 0 });

    useEffect(() => {
        if (locationId) loadData(locationId);
    }, [locationId]);

    const loadData = async (id: string) => {
        try {
            const info = await api.public.getLocationInfo(id);
            if (info) {
                setLocation(info as Location);
                // Mock consolidated reviews for public profile
                const publicReviews = await api.public.getWidgetReviews(id);
                setReviews(publicReviews);
                
                const avg = publicReviews.reduce((acc: number, r: any) => acc + r.rating, 0) / publicReviews.length || 0;
                setStats({ avg, count: publicReviews.length });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
        </div>
    );

    if (!location) return <div className="p-8 text-center">Profil introuvable.</div>;

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            
            {/* JSON-LD for SEO */}
            <script type="application/ld+json">
                {JSON.stringify({
                    "@context": "https://schema.org",
                    "@type": "LocalBusiness",
                    "name": location.name,
                    "address": location.address,
                    "telephone": location.phone,
                    "aggregateRating": {
                        "@type": "AggregateRating",
                        "ratingValue": stats.avg.toFixed(1),
                        "reviewCount": stats.count
                    }
                })}
            </script>

            {/* Header / Cover */}
            <div className="bg-white border-b border-slate-200">
                <div className="h-48 md:h-64 bg-slate-900 relative overflow-hidden">
                    {location.cover_image ? (
                        <img src={location.cover_image} className="w-full h-full object-cover opacity-80" alt="Cover" />
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900 to-slate-900"></div>
                    )}
                    <div className="absolute inset-0 bg-black/20"></div>
                </div>
                
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative -mt-16 pb-6">
                    <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start md:items-center">
                        <div className="h-24 w-24 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-sm shrink-0">
                            {safeInitial(location.name)}
                        </div>
                        <div className="flex-1">
                            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                                {location.name}
                                <span title="Établissement Vérifié">
                                    <CheckCircle2 className="h-6 w-6 text-blue-500 fill-white" />
                                </span>
                            </h1>
                            <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                                <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {location.city}, {location.country}</span>
                                {location.phone && <span className="flex items-center gap-1"><Phone className="h-4 w-4" /> {location.phone}</span>}
                                {location.website && <a href={location.website} target="_blank" className="flex items-center gap-1 text-indigo-600 hover:underline"><Globe className="h-4 w-4" /> Site Web</a>}
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                            <div className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg">
                                <span className="text-2xl font-bold text-yellow-400">{stats.avg.toFixed(1)}</span>
                                <div className="flex flex-col text-xs leading-tight">
                                    <div className="flex text-yellow-400">
                                        {[1,2,3,4,5].map(i => <Star key={i} className={`h-3 w-3 ${i <= Math.round(stats.avg) ? 'fill-current' : 'text-slate-600'}`} />)}
                                    </div>
                                    <span className="opacity-80">{stats.count} avis certifiés</span>
                                </div>
                            </div>
                            {location.booking_url && (
                                <Button className="w-full shadow-lg shadow-indigo-200" onClick={() => window.open(location.booking_url, '_blank')}>
                                    Réserver / Commander
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Left: Info */}
                    <div className="space-y-6">
                        <Card>
                            <CardContent className="p-6">
                                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <ShieldCheck className="h-5 w-5 text-green-600" />
                                    Indice de Confiance
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 text-sm text-slate-700">
                                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-600"><CheckCircle2 className="h-4 w-4"/></div>
                                        Identité vérifiée
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-slate-700">
                                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-600"><CheckCircle2 className="h-4 w-4"/></div>
                                        Avis collectés via Reviewflow
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-slate-700">
                                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-600"><CheckCircle2 className="h-4 w-4"/></div>
                                        Réponses actives (100%)
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="bg-indigo-900 rounded-xl p-6 text-white text-center">
                            <MessageCircle className="h-10 w-10 mx-auto mb-3 text-indigo-300" />
                            <h4 className="font-bold mb-2">Vous connaissez ce lieu ?</h4>
                            <p className="text-sm text-indigo-200 mb-4">Partagez votre expérience pour aider la communauté.</p>
                            <Button variant="secondary" className="w-full" onClick={() => window.location.href = `/feedback/${location.id}`}>
                                Donner mon avis
                            </Button>
                        </div>
                    </div>

                    {/* Right: Feed */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-900">Derniers Avis</h2>
                            <div className="text-sm text-slate-500">Triés par date</div>
                        </div>

                        {reviews.length === 0 ? (
                            <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
                                Aucun avis disponible pour le moment.
                            </div>
                        ) : (
                            reviews.map(review => (
                                <div key={review.id} className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-500 text-sm">
                                                {safeInitial(review.author_name)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 text-sm">{review.author_name}</div>
                                                <div className="text-xs text-slate-400 flex items-center gap-2">
                                                    <Calendar className="h-3 w-3" /> {new Date(review.received_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <div className="flex text-amber-400">
                                                {[...Array(5)].map((_, i) => <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'fill-current' : 'text-slate-200 fill-slate-200'}`} />)}
                                            </div>
                                            <SourceBadge source={review.source} />
                                        </div>
                                    </div>
                                    <p className="text-slate-700 text-sm leading-relaxed italic">
                                        "{review.body}"
                                    </p>
                                    
                                    {review.posted_reply && (
                                        <div className="mt-4 pl-4 border-l-2 border-indigo-100 bg-slate-50 p-3 rounded-r-lg">
                                            <div className="text-xs font-bold text-indigo-900 mb-1 flex items-center gap-1">
                                                <ExternalLink className="h-3 w-3" /> Réponse de l'établissement
                                            </div>
                                            <p className="text-xs text-slate-600">{review.posted_reply}</p>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                        
                        <div className="text-center pt-4">
                            <span className="text-xs text-slate-400">Powered by Reviewflow Certificate™</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
