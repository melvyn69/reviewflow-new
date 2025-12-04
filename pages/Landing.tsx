
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from '../components/ui';
import { 
  CheckCircle2, 
  Star, 
  Zap, 
  ArrowRight, 
  BarChart3, 
  Globe, 
  Calculator, 
  TrendingUp,
  ShieldCheck,
  Clock,
  Sparkles,
  Building2,
  Phone,
  Play
} from 'lucide-react';
import { useTranslation } from '../lib/i18n';

// --- COMPONENTS ---

const PricingCard = ({ title, price, features, recommended = false, buttonLabel, onAction, subtitle }: any) => (
    <div className={`relative p-8 rounded-2xl border flex flex-col h-full transition-all duration-300 ${recommended ? 'border-indigo-600 ring-4 ring-indigo-50 shadow-2xl bg-white scale-105 z-10' : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm'}`}>
        {recommended && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">
                Recommandé
            </div>
        )}
        <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-slate-900">{price}</span>
                {price !== 'Sur Devis' && <span className="text-slate-500 text-sm font-medium">HT / mois</span>}
            </div>
            <p className="text-xs text-slate-500 mt-2">{subtitle}</p>
        </div>
        <ul className="space-y-4 mb-8 flex-1">
            {features.map((feat: string, i: number) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                    <CheckCircle2 className={`h-5 w-5 shrink-0 ${recommended ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span>{feat}</span>
                </li>
            ))}
        </ul>
        <Button 
            variant={recommended ? 'primary' : 'outline'} 
            className={`w-full py-6 ${recommended ? 'shadow-xl shadow-indigo-200' : ''}`}
            onClick={onAction}
        >
            {buttonLabel}
        </Button>
    </div>
);

// ADVANCED ROI CALCULATOR
const RoiCalculator = () => {
    const [industry, setIndustry] = useState('restaurant');
    const [monthlyRevenue, setMonthlyRevenue] = useState(25000);
    const [currentRating, setCurrentRating] = useState(3.8);

    const sensitivityMap: Record<string, number> = {
        restaurant: 0.09,
        hotel: 0.11,
        retail: 0.05,
        services: 0.08, 
    };

    const targetRating = 4.8;
    const ratingGap = Math.max(0, targetRating - currentRating);
    const impactFactor = sensitivityMap[industry] || 0.07;
    const potentialAnnualGain = Math.round((monthlyRevenue * 12) * (ratingGap * impactFactor));

    return (
        <Card className="bg-slate-900 text-white border-slate-800 shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            
            <CardHeader className="border-b border-slate-800 pb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-500 rounded-lg text-white shadow-lg shadow-indigo-500/20">
                        <Calculator className="h-6 w-6" />
                    </div>
                    <div>
                        <CardTitle className="text-xl text-white">Calculateur de Perte de Revenus</CardTitle>
                        <p className="text-slate-400 text-sm">Ne laissez pas vos concurrents prendre vos clients.</p>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-8 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div className="space-y-8">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-3">Votre Secteur</label>
                            <div className="grid grid-cols-2 gap-3">
                                {[['restaurant', 'Resto/Bar'], ['services', 'Services'], ['retail', 'Retail'], ['hotel', 'Hôtellerie']].map(([key, label]) => (
                                    <button
                                        key={key}
                                        onClick={() => setIndustry(key)}
                                        className={`px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                                            industry === key 
                                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-md' 
                                                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between text-sm mb-3">
                                <span className="text-slate-400">CA Mensuel Moyen</span>
                                <span className="font-bold text-white">{monthlyRevenue.toLocaleString()} €</span>
                            </div>
                            <input 
                                type="range" min="5000" max="200000" step="5000" 
                                value={monthlyRevenue} 
                                onChange={(e) => setMonthlyRevenue(parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between text-sm mb-3">
                                <span className="text-slate-400">Note Google Actuelle</span>
                                <span className={`font-bold ${currentRating < 4 ? 'text-amber-400' : 'text-green-400'}`}>{currentRating} ★</span>
                            </div>
                            <input 
                                type="range" min="1" max="5" step="0.1" 
                                value={currentRating} 
                                onChange={(e) => setCurrentRating(parseFloat(e.target.value))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col justify-center items-center bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl p-8 border border-slate-700 shadow-inner">
                        <TrendingUp className="h-12 w-12 text-green-400 mb-4 opacity-80" />
                        <div className="text-sm text-slate-400 uppercase tracking-widest font-semibold mb-2">Manque à Gagner Annuel</div>
                        <div className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 mb-4">
                            {potentialAnnualGain.toLocaleString()} €
                        </div>
                        <p className="text-sm text-slate-500 text-center max-w-xs leading-relaxed">
                            C'est le montant estimé que vous laissez à vos concurrents chaque année à cause d'une réputation non optimisée.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export const LandingPage = () => {
  const navigate = useNavigate();
  const { t, setLang, lang } = useTranslation();

  const handleBookDemo = () => navigate('/book-demo');

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      {/* Navbar */}
      <nav className="fixed w-full bg-white/90 backdrop-blur-md z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="h-9 w-9 bg-indigo-900 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">R</span>
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">Reviewflow</span>
          </div>
          
          <div className="hidden md:flex gap-8 text-sm font-medium text-slate-600 items-center">
              <a href="#roi" className="hover:text-indigo-900 transition-colors">ROI</a>
              <a href="#features" className="hover:text-indigo-900 transition-colors">Plateforme</a>
              <a href="#pricing" className="hover:text-indigo-900 transition-colors">Tarifs</a>
          </div>

          <div className="flex items-center gap-4">
            <select 
                value={lang} 
                onChange={(e) => setLang(e.target.value)} 
                className="bg-transparent text-sm font-medium text-slate-500 border-none focus:ring-0 cursor-pointer hidden sm:block"
            >
                <option value="en">🇺🇸 EN</option>
                <option value="fr">🇫🇷 FR</option>
                <option value="es">🇪🇸 ES</option>
            </select>
            <button onClick={() => navigate('/login')} className="text-sm font-bold text-slate-900 hover:text-indigo-600 px-4">
              {t('nav.login')}
            </button>
            <Button onClick={handleBookDemo} className="shadow-lg shadow-indigo-200 bg-indigo-900 hover:bg-indigo-800 text-white rounded-full px-6">
              {t('nav.demo')}
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/50 via-white to-white -z-10"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <div className="inline-flex items-center gap-2 bg-slate-900 rounded-full px-4 py-1.5 text-white text-xs font-bold uppercase tracking-wide mb-8 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-700">
                <Sparkles className="h-3 w-3 text-yellow-400" />
                Solution B2B Enterprise-Grade
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-8 leading-tight max-w-5xl mx-auto whitespace-pre-line animate-in fade-in slide-in-from-bottom-6 duration-700">
                {t('hero.title')}
            </h1>
            <p className="text-xl text-slate-600 mb-10 leading-relaxed max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
                {t('hero.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700">
                <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-2xl bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleBookDemo}>
                    {t('cta.book')}
                    <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button size="lg" variant="secondary" className="h-14 px-8 text-lg rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth'})}>
                    <Play className="mr-2 h-4 w-4" /> Tour de la plateforme
                </Button>
            </div>
            
            {/* Social Proof */}
            <div className="mt-20 pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-center gap-12 text-slate-400 grayscale opacity-60">
                <div className="flex items-center gap-2 font-bold text-xl"><Building2 className="h-6 w-6" /> HYATT</div>
                <div className="flex items-center gap-2 font-bold text-xl"><Globe className="h-6 w-6" /> REMAX</div>
                <div className="flex items-center gap-2 font-bold text-xl"><ShieldCheck className="h-6 w-6" /> AXA</div>
                <div className="flex items-center gap-2 font-bold text-xl"><Zap className="h-6 w-6" /> TESLA</div>
            </div>
        </div>
      </section>

      {/* ROI Audit Section */}
      <section id="roi" className="py-24 bg-slate-950 border-y border-slate-800 scroll-mt-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <RoiCalculator />
          </div>
      </section>

      {/* Features Detail */}
      <section id="features" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                  <h2 className="text-3xl font-bold text-slate-900 mb-4">Une Suite Complète</h2>
                  <p className="text-slate-500 max-w-2xl mx-auto">Conçue pour les exigences des réseaux et franchises.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-200 transition-all">
                      <div className="h-12 w-12 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center mb-6">
                          <Globe className="h-6 w-6" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-3">Centralisation Multi-Lieux</h3>
                      <p className="text-slate-600">Gérez 1 ou 1000 établissements depuis un dashboard unique. Vue groupe et permissions granulaires.</p>
                  </div>
                  <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-200 transition-all">
                      <div className="h-12 w-12 bg-indigo-100 text-indigo-700 rounded-lg flex items-center justify-center mb-6">
                          <Zap className="h-6 w-6" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-3">IA Générative Brandée</h3>
                      <p className="text-slate-600">L'IA apprend votre ton de marque (Brand Voice) et répond 24/7. Validation humaine optionnelle.</p>
                  </div>
                  <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-200 transition-all">
                      <div className="h-12 w-12 bg-green-100 text-green-700 rounded-lg flex items-center justify-center mb-6">
                          <BarChart3 className="h-6 w-6" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-3">Analytique Prédictive</h3>
                      <p className="text-slate-600">Détectez les tendances avant qu'elles ne deviennent des problèmes. Rapports PDF automatisés.</p>
                  </div>
              </div>
          </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                  <h2 className="text-3xl font-bold text-slate-900 mb-4">Tarifs B2B</h2>
                  <p className="text-slate-500">Choisissez la puissance dont votre enseigne a besoin.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
                  <PricingCard 
                    title="Essential" 
                    price="49€"
                    subtitle="Pour les indépendants" 
                    buttonLabel={t('cta.book')}
                    onAction={handleBookDemo}
                    features={[
                        "1 Établissement",
                        "Réponses IA Illimitées",
                        "Collecte QR Code",
                        "Support Email 24/7"
                    ]} 
                  />
                  <PricingCard 
                    title="Growth" 
                    price="89€"
                    subtitle="Pour les gérants exigeants" 
                    recommended
                    buttonLabel={t('cta.book')}
                    onAction={handleBookDemo}
                    features={[
                        "Jusqu'à 3 Établissements",
                        "Tout du plan Essential",
                        "Automatisation (Workflows)",
                        "Veille Concurrentielle",
                        "Social Studio (Image Gen)"
                    ]} 
                  />
                  <PricingCard 
                    title="Enterprise" 
                    price="Sur Devis"
                    subtitle="Réseaux & Franchises" 
                    buttonLabel={t('pricing.contact')}
                    onAction={() => window.location.href = "mailto:sales@reviewflow.com"}
                    features={[
                        "Établissements Illimités",
                        "Dashboard Master Groupe",
                        "API & Webhooks",
                        "Account Manager Dédié",
                        "SSO / SAML"
                    ]} 
                  />
              </div>
          </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
                <div className="flex items-center gap-2 mb-4 text-white">
                    <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold">R</div>
                    <span className="font-bold text-lg">Reviewflow</span>
                </div>
                <p className="text-sm leading-relaxed">
                    La plateforme d'e-réputation préférée des enseignes locales.
                </p>
            </div>
            <div>
                <h4 className="text-white font-bold mb-4">Produit</h4>
                <ul className="space-y-2 text-sm">
                    <li><a href="#features" className="hover:text-indigo-400">Fonctionnalités</a></li>
                    <li><a href="#roi" className="hover:text-indigo-400">Calculateur ROI</a></li>
                    <li><a href="#pricing" className="hover:text-indigo-400">Tarifs</a></li>
                </ul>
            </div>
            <div>
                <h4 className="text-white font-bold mb-4">Légal</h4>
                <ul className="space-y-2 text-sm">
                    <li><button onClick={() => navigate('/legal')} className="hover:text-indigo-400 text-left">Mentions Légales</button></li>
                    <li><button onClick={() => navigate('/privacy')} className="hover:text-indigo-400 text-left">Confidentialité</button></li>
                    <li><button onClick={() => navigate('/contact')} className="hover:text-indigo-400 text-left">Contact</button></li>
                </ul>
            </div>
            <div>
                <h4 className="text-white font-bold mb-4">Nous suivre</h4>
                <p className="text-xs">Paris, France 🇫🇷</p>
            </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs border-t border-slate-800 pt-8">
            &copy; {new Date().getFullYear()} Reviewflow SAS. Tous droits réservés.
        </div>
      </footer>
    </div>
  );
};
