
import React, { useState } from 'react';
import { useNavigate } from '../components/ui';
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
  Play,
  Award,
  Users,
  MessageSquare
} from 'lucide-react';
import { useTranslation } from '../lib/i18n';

// --- COMPONENTS ---

const PricingCard = ({ title, price, features, recommended = false, buttonLabel, onAction, subtitle }: any) => (
    <div className={`relative p-8 rounded-3xl border flex flex-col h-full transition-all duration-300 ${recommended ? 'border-indigo-600 ring-4 ring-indigo-50 shadow-2xl bg-white scale-105 z-10' : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm hover:shadow-lg'}`}>
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
            className={`w-full py-6 rounded-xl ${recommended ? 'shadow-xl shadow-indigo-200' : ''}`}
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
        <Card className="bg-slate-900 text-white border-slate-800 shadow-2xl overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-600/30 transition-all duration-1000"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 group-hover:bg-violet-600/20 transition-all duration-1000"></div>
            
            <CardHeader className="border-b border-slate-800 pb-6 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg text-white shadow-lg shadow-indigo-500/20">
                        <Calculator className="h-6 w-6" />
                    </div>
                    <div>
                        <CardTitle className="text-xl text-white">Simulateur de Gain</CardTitle>
                        <p className="text-slate-400 text-sm">Estimez l'impact financier d'une meilleure réputation.</p>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-8 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div className="space-y-8">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-3">Votre Secteur</label>
                            <div className="grid grid-cols-2 gap-3">
                                {[['restaurant', 'Resto/Bar'], ['services', 'Services'], ['retail', 'Commerce'], ['hotel', 'Hôtellerie']].map(([key, label]) => (
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

                    <div className="flex flex-col justify-center items-center bg-gradient-to-b from-slate-800/50 to-slate-900/50 rounded-2xl p-8 border border-slate-700 backdrop-blur-sm shadow-inner">
                        <TrendingUp className="h-12 w-12 text-emerald-400 mb-4 opacity-80" />
                        <div className="text-sm text-slate-400 uppercase tracking-widest font-semibold mb-2">Potentiel de Gain Annuel</div>
                        <div className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 mb-4 tracking-tight">
                            +{potentialAnnualGain.toLocaleString()} €
                        </div>
                        <p className="text-sm text-slate-500 text-center max-w-xs leading-relaxed">
                            Basé sur une étude Harvard Business School : augmenter sa note d'une étoile peut accroître le CA de 5 à 9%.
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
    <div className="min-h-screen bg-white font-sans text-slate-900 overflow-x-hidden selection:bg-indigo-100 selection:text-indigo-900">
      {/* Navbar */}
      <nav className="fixed w-full bg-white/80 backdrop-blur-lg z-50 border-b border-slate-100 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="h-9 w-9 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-200/50 group-hover:scale-105 transition-transform">
              <span className="text-white font-bold text-lg">R</span>
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">Reviewflow</span>
          </div>
          
          <div className="hidden md:flex gap-8 text-sm font-medium text-slate-600 items-center">
              <a href="#features" className="hover:text-indigo-600 transition-colors">Plateforme</a>
              <a href="#roi" className="hover:text-indigo-600 transition-colors">Calculateur ROI</a>
              <a href="#pricing" className="hover:text-indigo-600 transition-colors">Tarifs</a>
          </div>

          <div className="flex items-center gap-4">
            <select 
                value={lang} 
                onChange={(e) => setLang(e.target.value)} 
                className="bg-transparent text-sm font-medium text-slate-500 border-none focus:ring-0 cursor-pointer hidden sm:block outline-none hover:text-indigo-600 transition-colors"
            >
                <option value="en">🇺🇸 EN</option>
                <option value="fr">🇫🇷 FR</option>
                <option value="es">🇪🇸 ES</option>
            </select>
            <button onClick={() => navigate('/login')} className="text-sm font-bold text-slate-900 hover:text-indigo-600 px-4 transition-colors">
              {t('nav.login')}
            </button>
            <Button onClick={handleBookDemo} className="shadow-lg shadow-indigo-600/20 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6 transition-all hover:scale-105 hover:shadow-indigo-600/30">
              {t('nav.demo')}
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/40 via-white to-white -z-10"></div>
        
        {/* Animated Background Elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-20 right-10 w-72 h-72 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-md border border-indigo-100 rounded-full px-4 py-1.5 text-indigo-700 text-xs font-bold uppercase tracking-wide mb-8 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
                <Sparkles className="h-3 w-3 text-amber-500 fill-amber-500" />
                Nouveau : Social Studio IA
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-8 leading-[1.1] max-w-5xl mx-auto whitespace-pre-line animate-in fade-in slide-in-from-bottom-6 duration-700">
                {t('hero.title')}
            </h1>
            <p className="text-xl text-slate-600 mb-10 leading-relaxed max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
                {t('hero.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700">
                <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-xl shadow-indigo-600/30 bg-indigo-600 hover:bg-indigo-700 text-white transition-all hover:scale-105" onClick={handleBookDemo}>
                    {t('cta.book')}
                    <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button size="lg" variant="secondary" className="h-14 px-8 text-lg rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all hover:border-slate-300" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth'})}>
                    <Play className="mr-2 h-4 w-4" /> Voir la démo
                </Button>
            </div>
            
            {/* Social Proof */}
            <div className="mt-24 pt-10 border-t border-slate-100/60">
                <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-8">La référence pour les réseaux & franchises</p>
                <div className="flex flex-wrap items-center justify-center gap-12 md:gap-24 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                    <div className="flex items-center gap-2 font-bold text-xl text-slate-600"><Building2 className="h-6 w-6" /> HYATT</div>
                    <div className="flex items-center gap-2 font-bold text-xl text-slate-600"><Globe className="h-6 w-6" /> REMAX</div>
                    <div className="flex items-center gap-2 font-bold text-xl text-slate-600"><ShieldCheck className="h-6 w-6" /> AXA</div>
                    <div className="flex items-center gap-2 font-bold text-xl text-slate-600"><Award className="h-6 w-6" /> MICHELIN</div>
                </div>
            </div>
        </div>
      </section>

      {/* ROI Audit Section */}
      <section id="roi" className="py-24 bg-slate-950 border-y border-slate-800 scroll-mt-20 relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <RoiCalculator />
          </div>
      </section>

      {/* Features Detail */}
      <section id="features" className="py-24 bg-white relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-20">
                  <h2 className="text-4xl font-extrabold text-slate-900 mb-6">Une Suite Complète</h2>
                  <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
                      Conçue pour les exigences des réseaux et franchises qui veulent aller vite.
                  </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  <div className="group p-8 rounded-3xl bg-white border border-slate-100 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                      <div className="h-14 w-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-inner">
                          <Globe className="h-7 w-7" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-3">Centralisation Multi-Lieux</h3>
                      <p className="text-slate-600 leading-relaxed">Gérez 1 ou 1000 établissements depuis un dashboard unique. Vue groupe, tags, et permissions granulaires par manager.</p>
                  </div>
                  <div className="group p-8 rounded-3xl bg-white border border-slate-100 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                      <div className="h-14 w-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-inner">
                          <Zap className="h-7 w-7" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-3">IA Générative Brandée</h3>
                      <p className="text-slate-600 leading-relaxed">L'IA apprend votre ton de marque (Brand Voice) et répond 24/7. Validation humaine optionnelle pour le contrôle qualité.</p>
                  </div>
                  <div className="group p-8 rounded-3xl bg-white border border-slate-100 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                      <div className="h-14 w-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-inner">
                          <BarChart3 className="h-7 w-7" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-3">Analytique Prédictive</h3>
                      <p className="text-slate-600 leading-relaxed">Détectez les tendances avant qu'elles ne deviennent des problèmes. Rapports PDF automatisés envoyés à la direction.</p>
                  </div>
                  <div className="group p-8 rounded-3xl bg-white border border-slate-100 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                      <div className="h-14 w-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-inner">
                          <Star className="h-7 w-7" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-3">Collecte Automatisée</h3>
                      <p className="text-slate-600 leading-relaxed">QR Codes intelligents, campagnes SMS/Email et page de satisfaction dédiée pour transformer vos clients en ambassadeurs.</p>
                  </div>
                  <div className="group p-8 rounded-3xl bg-white border border-slate-100 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                      <div className="h-14 w-14 bg-pink-50 text-pink-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-inner">
                          <Users className="h-7 w-7" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-3">Gamification d'Équipe</h3>
                      <p className="text-slate-600 leading-relaxed">Motivez vos employés avec des classements et des objectifs. L'IA attribue automatiquement les avis nominatifs.</p>
                  </div>
                  <div className="group p-8 rounded-3xl bg-white border border-slate-100 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                      <div className="h-14 w-14 bg-cyan-50 text-cyan-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-inner">
                          <MessageSquare className="h-7 w-7" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-3">Support 24/7</h3>
                      <p className="text-slate-600 leading-relaxed">Une équipe dédiée basée en France pour vous accompagner dans votre stratégie d'e-réputation.</p>
                  </div>
              </div>
          </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                  <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Tarifs B2B Transparents</h2>
                  <p className="text-xl text-slate-500">Choisissez la puissance dont votre enseigne a besoin.</p>
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
      <footer className="bg-slate-900 text-slate-400 py-16 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div>
                <div className="flex items-center gap-2 mb-6 text-white">
                    <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-lg">R</div>
                    <span className="font-bold text-xl tracking-tight">Reviewflow</span>
                </div>
                <p className="text-sm leading-relaxed max-w-xs text-slate-400">
                    La plateforme d'e-réputation préférée des enseignes locales pour transformer les avis en levier de croissance.
                </p>
            </div>
            <div>
                <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-wider">Produit</h4>
                <ul className="space-y-3 text-sm">
                    <li><a href="#features" className="hover:text-indigo-400 transition-colors">Fonctionnalités</a></li>
                    <li><a href="#roi" className="hover:text-indigo-400 transition-colors">Calculateur ROI</a></li>
                    <li><a href="#pricing" className="hover:text-indigo-400 transition-colors">Tarifs</a></li>
                    <li><a href="/login" className="hover:text-indigo-400 transition-colors">Connexion</a></li>
                </ul>
            </div>
            <div>
                <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-wider">Légal</h4>
                <ul className="space-y-3 text-sm">
                    <li><button onClick={() => navigate('/legal')} className="hover:text-indigo-400 text-left transition-colors">Mentions Légales</button></li>
                    <li><button onClick={() => navigate('/privacy')} className="hover:text-indigo-400 text-left transition-colors">Confidentialité</button></li>
                    <li><button onClick={() => navigate('/contact')} className="hover:text-indigo-400 text-left transition-colors">Contact</button></li>
                </ul>
            </div>
            <div>
                <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-wider">Contact</h4>
                <p className="text-sm mb-2">Paris, France 🇫🇷</p>
                <a href="mailto:hello@reviewflow.com" className="text-sm text-indigo-400 hover:text-indigo-300">hello@reviewflow.com</a>
            </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500 border-t border-slate-800 pt-8">
            &copy; {new Date().getFullYear()} Reviewflow SAS. Tous droits réservés.
        </div>
      </footer>
    </div>
  );
};
