
import React, { useEffect } from 'react';
import { Card, Button } from '../components/ui';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useNavigate } from '../components/ui';

declare global {
  interface Window {
    Calendly: any;
  }
}

export const BookDemoPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize Calendly widget if script is loaded
    if (window.Calendly) {
      window.Calendly.initInlineWidget({
        url: 'https://calendly.com/reviewflow-demo/30min', // Replace with real Calendly URL
        parentElement: document.getElementById('calendly-embed'),
        prefill: {},
        utm: {}
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-8">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-4 text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4 mr-2" /> Retour à l'accueil
        </Button>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Value Prop */}
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-indigo-900 text-white p-8 rounded-2xl shadow-xl">
                    <h1 className="text-3xl font-bold mb-4">Parlons Business.</h1>
                    <p className="text-indigo-200 mb-8 text-lg">
                        Découvrez comment Reviewflow peut automatiser 90% de votre gestion d'avis et augmenter votre CA local.
                    </p>
                    
                    <h4 className="font-bold text-white mb-4 uppercase tracking-wider text-xs opacity-70">Ce que nous verrons ensemble :</h4>
                    <ul className="space-y-4">
                        <li className="flex gap-3">
                            <CheckCircle2 className="h-6 w-6 text-green-400 shrink-0" />
                            <span className="text-indigo-100 text-sm">Audit en direct de votre e-réputation actuelle.</span>
                        </li>
                        <li className="flex gap-3">
                            <CheckCircle2 className="h-6 w-6 text-green-400 shrink-0" />
                            <span className="text-indigo-100 text-sm">Démonstration de l'IA générative sur vos propres avis.</span>
                        </li>
                        <li className="flex gap-3">
                            <CheckCircle2 className="h-6 w-6 text-green-400 shrink-0" />
                            <span className="text-indigo-100 text-sm">Stratégie de collecte pour dépasser vos concurrents.</span>
                        </li>
                    </ul>
                </div>
                
                <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                        <img src="https://ui-avatars.com/api/?name=Marc+D&background=random" className="h-12 w-12 rounded-full" />
                        <div>
                            <p className="font-bold text-slate-900">Marc Dubois</p>
                            <p className="text-xs text-slate-500">Expert E-réputation</p>
                        </div>
                    </div>
                    <p className="text-slate-600 text-sm italic">
                        "En 20 minutes, je vous montrerai exactement où vous perdez de l'argent à cause de votre note Google."
                    </p>
                </div>
            </div>

            {/* Right Column: Calendly Embed */}
            <div className="lg:col-span-2">
                <Card className="h-full min-h-[700px] border-none shadow-2xl overflow-hidden">
                    <div 
                        id="calendly-embed" 
                        style={{ minWidth: '320px', height: '700px' }} 
                        data-auto-load="false"
                    ></div>
                </Card>
            </div>
        </div>
      </div>
    </div>
  );
};
