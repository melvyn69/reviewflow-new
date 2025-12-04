
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
  MessageSquare,
  ChevronDown,
  LayoutGrid,
  Smartphone
} from 'lucide-react';
import { useTranslation } from '../lib/i18n';

// --- COMPONENTS ---

const PricingCard = ({ title, price, features, recommended = false, buttonLabel, onAction, subtitle }: any) => (
    <div className={`relative p-8 rounded-3xl border flex flex-col h-full transition-all duration-300 ${recommended ? 'border-indigo-600 ring-4 ring-indigo-50 shadow-2xl bg-white scale-105 z-10' : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm hover:shadow-lg'}`}>
        {recommended && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Recommandé
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
                    <div className={`mt-0.5 p-0.5 rounded-full ${recommended ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                        <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <span>{feat}</span>
                </li>
            ))}
        </ul>
        <Button 
            variant={recommended ? 'primary' : 'outline'} 
            className={`w-full py-6 rounded-xl font-bold tracking-wide ${recommended ? 'shadow-xl shadow-indigo-200 hover:shadow-indigo-300' : ''}`}
            onClick={onAction}
        >
            {buttonLabel}
        </Button>
    </div>
);

const FaqItem = ({ question, answer }: { question: string, answer: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-slate-200 last:border-0">
            <button 
                className="w-full py-6 flex justify-between items-center text-left focus:outline-none group"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={`text-lg font-medium transition-colors ${isOpen ? 'text-indigo-600' : 'text-slate-900 group-hover:text-indigo-600'}`}>
                    {question}
                </span>
                <div className={`p-2 rounded-full transition-all duration-300 ${isOpen ? 'bg-indigo-100 text-indigo-600 rotate-180' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'}`}>
                    <ChevronDown className="h-5 w-5" />
                </div>
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100 mb-6' : 'max-h-0 opacity-0'}`}>
                <p className="text-slate-600 leading-relaxed">
                    {answer}
                </p>
            </div>
        </div>
    );
};

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
            {/* Ambient Background */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-600/30 transition-all duration-1000"></div>
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 group-hover:bg-violet-600/20 transition-all duration-1000"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
            
            <CardHeader className="border-b border-slate-800/50 pb-8 relative z-10 p-8">
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                    <div className="h-14 w-14 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 shrink-0">
                        <Calculator className="h-7 w-7" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl md:text-3xl text-white font-bold mb-2">Simulateur de Croissance</CardTitle>
                        <p className="text-slate-400 text-sm md:text-base max-w-lg">
                            Selon une étude Harvard Business School, augmenter sa note d'une étoile peut accroître le CA de 5 à 9%.
                        </p>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-8 md:p-10 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
                    <div className="space-y-10">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Votre Secteur d'activité</label>
                            <div className="grid grid-cols-2 gap-3">
                                {[['restaurant', 'Resto/Bar'], ['services', 'Services'], ['retail', 'Commerce'], ['hotel', 'Hôtellerie']].map(([key, label]) => (
                                    <button
                                        key={key}
                                        onClick={() => setIndustry(key)}
                                        className={`px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                                            industry === key 
                                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-md ring-2 ring-indigo-500/30' 
                                                : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between text-sm mb-4">
                                <span className="text-slate-400 font-medium">CA Mensuel Moyen</span>
                                <span className="font-bold text-white text-lg bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">{monthlyRevenue.toLocaleString()} €</span>
                            </div>
                            <input 
                                type="range" min="5000" max="200000" step="5000" 
                                value={monthlyRevenue} 
                                onChange={(e) => setMonthlyRevenue(parseInt(e.target.value))}
                                className="w-full h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between text-sm mb-4">
                                <span className="text-slate-400 font-medium">Note Google Actuelle</span>
                                <span className={`font-bold text-lg px-3 py-1 rounded-lg border bg-slate-800 ${currentRating < 4 ? 'text-amber-400 border-amber-900/30' : 'text-green-400 border-green-900/30'}`}>{currentRating} ★</span>
                            </div>
                            <input 
                                type="range" min="1" max="5" step="0.1" 
                                value={currentRating} 
                                onChange={(e) => setCurrentRating(parseFloat(e.target.value))}
                                className="w-full h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500 hover:accent-amber-400"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col justify-center items-center bg-gradient-to-b from-slate-800 to-slate-900/80 rounded-3xl p-8 border border-slate-700/50 shadow-2xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent"></div>
                        <div className="relative z-10 flex flex-col items-center">
                            <div className="p-4 bg-emerald-500/10 rounded-full mb-6 ring-1 ring-emerald-500/30">
                                <TrendingUp className="h-10 w-10 text-emerald-400" />
                            </div>
                            <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">Gain Annuel Estimé</div>
                            <div className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-400 mb-6 tracking-tight">
                                +{potentialAnnualGain.toLocaleString()} €
                            </div>
                            <p className="text-sm text-slate-400 text-center leading-relaxed max-w-xs">
                                En passant de <span className="text-white font-bold">{currentRating}</span> à <span className="text-white font-bold">4.8</span> ★
                            </p>
                            
                            <Button className="mt-8 bg-emerald-600 hover:bg-emerald-500 text-white border-none w-full shadow-lg shadow-emerald-900/20" onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth'})}>
                                Capturer ce potentiel
                            </Button>
                        </div>
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
      <nav className="fixed w-full bg-white/90 backdrop-blur-xl z-50 border-b border-slate-100 transition-all duration-300 supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="relative">
                <div className="absolute inset-0 bg-indigo-600 blur rounded-lg opacity-20 group-hover:opacity-40 transition-opacity"></div>
                <div className="h-10 w-10 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-xl flex items-center justify-center shadow-md relative z-10 text-white font-bold text-xl border border-white/10">
                    R
                </div>
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">Reviewflow</span>
          </div>
          
          <div className="hidden md:flex gap-8 text-sm font-medium text-slate-600 items-center">
              <a href="#features" className="hover:text-indigo-600 transition-colors">Fonctionnalités</a>
              <a href="#roi" className="hover:text-indigo-600 transition-colors">Simulateur</a>
              <a href="#pricing" className="hover:text-indigo-600 transition-colors">Tarifs</a>
              <a href="#faq" className="hover:text-indigo-600 transition-colors">FAQ</a>
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
            <button onClick={() => navigate('/login')} className="text-sm font-bold text-slate-900 hover:text-indigo-600 px-4 transition-colors hidden sm:block">
              {t('nav.login')}
            </button>
            <Button onClick={handleBookDemo} className="shadow-lg shadow-indigo-600/20 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6 transition-all hover:scale-105 hover:shadow-indigo-600/30">
              {t('nav.demo')}
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-40 overflow-hidden">
        {/* Abstract Background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[140%] h-[1000px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/50 via-white to-white -z-10 rounded-b-[50%]"></div>
        <div className="absolute top-20 left-10 w-96 h-96 bg-purple-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute top-20 right-10 w-96 h-96 bg-indigo-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <div className="inline-flex items-center gap-2 bg-white border border-indigo-100 rounded-full pl-2 pr-4 py-1.5 text-indigo-700 text-xs font-bold uppercase tracking-wide mb-8 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700 hover:border-indigo-200 hover:shadow-md transition-all cursor-default">
                <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-full text-[10px]">NEW</span>
                <span>Social Studio IA 2.0</span>
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
                    <Play className="mr-2 h-4 w-4 fill-slate-700" /> Voir la démo
                </Button>
            </div>
            
            {/* Trusted Marquee */}
            <div className="mt-24 pt-10 border-t border-slate-100/60 relative">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8 text-center">Ils nous font confiance</p>
                <div className="flex justify-center flex-wrap gap-12 md:gap-20 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                    {/* Mock Logos */}
                    <div className="flex items-center gap-2 font-black text-xl text-slate-800"><Building2 className="h-6 w-6" /> HYATT</div>
                    <div className="flex items-center gap-2 font-black text-xl text-slate-800"><Globe className="h-6 w-6" /> REMAX</div>
                    <div className="flex items-center gap-2 font-black text-xl text-slate-800"><ShieldCheck className="h-6 w-6" /> AXA</div>
                    <div className="flex items-center gap-2 font-black text-xl text-slate-800"><Award className="h-6 w-6" /> MICHELIN</div>
                    <div className="flex items-center gap-2 font-black text-xl text-slate-800"><Zap className="h-6 w-6" /> SEPHORA</div>
                </div>
            </div>
        </div>
      </section>

      {/* ROI Audit Section */}
      <section id="roi" className="py-24 bg-slate-950 border-y border-slate-800 scroll-mt-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <RoiCalculator />
          </div>
      </section>

      {/* Features - Bento Grid */}
      <section id="features" className="py-24 bg-slate-50 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-20">
                  <div className="inline-block p-2 px-4 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wide mb-4">
                      Tout-en-un
                  </div>
                  <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">Une Suite Complète</h2>
                  <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
                      Conçue pour les exigences des réseaux et franchises qui veulent aller vite.
                  </p>
              </div>

              {/* Bento Grid Layout */}
              <div className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-6">
                  
                  {/* Feature 1: Multi-Location (Large Left) */}
                  <div className="md:col-span-2 md:row-span-1 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                          <Globe className="h-40 w-40 text-blue-600" />
                      </div>
                      <div className="relative z-10">
                          <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                              <LayoutGrid className="h-6 w-6" />
                          </div>
                          <h3 className="text-2xl font-bold text-slate-900 mb-3">Centralisation Multi-Lieux</h3>
                          <p className="text-slate-600 leading-relaxed max-w-md">Gérez 1 ou 1000 établissements depuis un dashboard unique. Permissions granulaires, tags personnalisés et vue groupe pour les réseaux.</p>
                      </div>
                  </div>

                  {/* Feature 2: AI (Tall Right) */}
                  <div className="md:col-span-1 md:row-span-2 bg-gradient-to-b from-indigo-600 to-violet-700 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden flex flex-col justify-between group">
                      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                      <div className="relative z-10">
                          <div className="h-12 w-12 bg-white/20 text-white rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm">
                              <Sparkles className="h-6 w-6" />
                          </div>
                          <h3 className="text-2xl font-bold mb-3">IA Générative Brandée</h3>
                          <p className="text-indigo-100 leading-relaxed mb-8">
                              L'IA apprend votre ton de marque (Brand Voice) et répond 24/7. Elle s'adapte à chaque avis pour une réponse unique.
                          </p>
                      </div>
                      {/* Abstract Visual for AI */}
                      <div className="relative h-40 bg-white/10 rounded-xl backdrop-blur-md border border-white/10 p-4 flex flex-col gap-3 transition-transform duration-500 group-hover:-translate-y-2">
                          <div className="flex gap-2">
                              <div className="h-8 w-8 rounded-full bg-white/20"></div>
                              <div className="flex-1 h-8 rounded-lg bg-white/20"></div>
                          </div>
                          <div className="h-2 w-full rounded bg-white/10"></div>
                          <div className="h-2 w-2/3 rounded bg-white/10"></div>
                          <div className="mt-auto flex justify-end">
                              <div className="px-3 py-1 rounded-full bg-green-400/20 text-green-300 text-xs font-bold border border-green-400/30">Réponse validée</div>
                          </div>
                      </div>
                  </div>

                  {/* Feature 3: Analytics */}
                  <div className="md:col-span-1 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 group">
                      <div className="h-12 w-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-6">
                          <BarChart3 className="h-6 w-6" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-3">Analytique</h3>
                      <p className="text-slate-600 text-sm">Rapports PDF automatisés et détection de tendances par analyse sémantique.</p>
                  </div>

                  {/* Feature 4: Collect */}
                  <div className="md:col-span-1 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 group">
                      <div className="h-12 w-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-6">
                          <Smartphone className="h-6 w-6" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-3">Collecte Smart</h3>
                      <p className="text-slate-600 text-sm">QR Codes dynamiques et campagnes SMS pour transformer vos clients en ambassadeurs.</p>
                  </div>

              </div>
          </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-white">
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

      {/* FAQ Section */}
      <section id="faq" className="py-24 bg-slate-50">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold text-slate-900 mb-4">Questions Fréquentes</h2>
                  <p className="text-slate-500">Tout ce que vous devez savoir avant de commencer.</p>
              </div>
              
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                  <FaqItem 
                      question="Puis-je gérer plusieurs fiches Google ?" 
                      answer="Oui, Reviewflow est conçu pour le multi-établissements. Vous pouvez connecter autant de fiches que votre abonnement le permet et les gérer depuis une interface unique."
                  />
                  <FaqItem 
                      question="L'IA répond-elle automatiquement ?" 
                      answer="Vous avez le choix. Par défaut, l'IA génère des brouillons que vous validez en un clic. Vous pouvez activer le mode 'Pilote Automatique' pour les avis positifs (ex: 4 et 5 étoiles) afin qu'ils soient traités instantanément."
                  />
                  <FaqItem 
                      question="Est-ce compatible avec TripAdvisor et Facebook ?" 
                      answer="Oui, nous centralisons les avis provenant de Google, Facebook et TripAdvisor. D'autres plateformes (Trustpilot, Yelp) sont disponibles sur demande en plan Enterprise."
                  />
                  <FaqItem 
                      question="Y a-t-il un engagement ?" 
                      answer="Non, nos offres Essential et Growth sont sans engagement. Vous pouvez annuler à tout moment depuis votre espace client."
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
                <div className="flex gap-4 mt-6">
                    {/* Social Icons Placeholder */}
                    <div className="w-8 h-8 bg-slate-800 rounded flex items-center justify-center hover:bg-indigo-600 transition-colors cursor-pointer">In</div>
                    <div className="w-8 h-8 bg-slate-800 rounded flex items-center justify-center hover:bg-indigo-600 transition-colors cursor-pointer">X</div>
                </div>
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
                <p className="text-xs mt-4 text-slate-500">+33 1 23 45 67 89</p>
            </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500 border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <span>&copy; {new Date().getFullYear()} Reviewflow SAS. Tous droits réservés.</span>
            <span className="mt-2 md:mt-0 flex gap-4">
                <span>Made with ❤️ in Paris</span>
            </span>
        </div>
      </footer>
    </div>
  );
};
