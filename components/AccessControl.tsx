
import React, { useState, useEffect } from 'react';
import { useNavigate } from './ui';
import { Lock, Sparkles, ChevronRight } from 'lucide-react';
import { Button, Card } from './ui';
import { FeatureId, FEATURES_INFO, hasAccess } from '../lib/features';
import { Organization, User } from '../types';
import { api } from '../lib/api';

interface RestrictedFeatureProps {
    feature: FeatureId;
    org: Organization | null;
    children: React.ReactNode;
    fallback?: React.ReactNode; // Optional: completely different UI instead of blur
}

export const RestrictedFeature: React.FC<RestrictedFeatureProps> = ({ feature, org, children, fallback }) => {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Fetch user to check God Mode
    useEffect(() => {
        const checkUser = async () => {
            const currentUser = await api.auth.getUser();
            setUser(currentUser);
            setLoading(false);
        };
        checkUser();
    }, []);

    // While checking, assume locked to avoid flicker, or render fallback/loader
    if (loading) return null; 

    const isAllowed = hasAccess(org, feature, user);
    const info = FEATURES_INFO[feature];

    if (isAllowed) {
        return <>{children}</>;
    }

    if (fallback) {
        return <>{fallback}</>;
    }

    return (
        <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50/30">
            {/* Blurred Content */}
            <div className="filter blur-[6px] select-none opacity-50 pointer-events-none p-4 h-full" aria-hidden="true">
                {children}
            </div>

            {/* Lock Overlay */}
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center bg-white/40 backdrop-blur-[2px]">
                <div className="bg-white p-4 rounded-full shadow-xl mb-4 ring-4 ring-indigo-50 transform group-hover:scale-110 transition-transform duration-300">
                    <Lock className="h-8 w-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 mb-2">{info.title}</h3>
                <p className="text-slate-600 max-w-sm mb-6 text-sm leading-relaxed">
                    {info.description} <br/>
                    <span className="font-medium">Cette fonctionnalité est réservée aux membres Pro & Elite.</span>
                </p>
                <div className="flex flex-col gap-3 w-full max-w-xs">
                    <Button 
                        size="lg" 
                        className="shadow-xl shadow-indigo-200 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 border-none w-full justify-center" 
                        onClick={() => navigate('/billing')}
                    >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Passer au plan supérieur
                        <ChevronRight className="h-4 w-4 ml-1 opacity-70" />
                    </Button>
                    <button 
                        onClick={() => window.open('https://reviewflow.com/pricing', '_blank')}
                        className="text-xs text-indigo-600 hover:underline font-medium"
                    >
                        Comparer les plans
                    </button>
                </div>
            </div>
        </div>
    );
};
