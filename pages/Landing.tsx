import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { Button, Card, CardContent } from '../components/ui';
import { CheckCircle2, Star, Zap, MessageSquare, ShieldCheck, ArrowRight, BarChart3, Globe, Sparkles, HelpCircle, ChevronDown, QrCode, Workflow, Users, FileText, Smartphone, Mail, Layout, Video } from 'lucide-react';

const FeatureCard = ({ icon: Icon, title, description, color = "indigo" }: any) => {
  const colors: Record<string, string> = {
      indigo: "bg-indigo-50 text-indigo-600",
      green: "bg-green-50 text-green-600",
      amber: "bg-amber-50 text-amber-600",
      blue: "bg-blue-50 text-blue-600",
      rose: "bg-rose-50 text-rose-600",
      violet: "bg-violet-50 text-violet-600",
      cyan: "bg-cyan-50 text-cyan-600",
  };

  return (
    <Card className="border-none shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-indigo-100 transition-all duration-300 h-full">
        <CardContent className="p-8 flex flex-col h-full">
        <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-6 ${colors[color] || colors.indigo}`}>
            <Icon className="h-6 w-6" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
        <p className="text-slate-600 leading-relaxed flex-1">
            {description}
        </p>
        </CardContent>
    </Card>
  );
};

const PricingCard = ({ title, price, features, cta, highlighted = false, variant = 'light', onClick }: any) => (
    <div className={`p-8 rounded-2xl border flex flex-col ${highlighted ? 'border-indigo-500 ring-4 ring-indigo-500/20 bg-slate-800' : 'border-slate-700 bg-slate-800/50'}`}>
        <h3 className="text-lg font-medium text-slate-300 mb-2">{title}</h3>
        <div className="flex items-baseline gap-1 mb-6">
            <span className="text-4xl font-bold text-white">{price}</span>
            <span className="text-slate-400">/mois</span>
        </div>
        <ul className="space-y-4 mb-8 flex-1">
            {features.map((feat: string, i: number) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="h-5 w-5 text-indigo-400 shrink-0" />
                    <span>{feat}</span>
                </li>
            ))}
        </ul>
        <Button 
            variant={highlighted ? 'primary' : 'outline'} 
            className={`w-full ${!highlighted ? 'text-white border-slate-600 hover:bg-slate-700' : ''}`}
            onClick={onClick}
        >
            {cta}
        </Button>
    </div>
);

const FaqItem = ({ question, answer }: { question: string, answer: string }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    return (
        <div className="border-b border-slate-200 last:border-0">
            <button 
                className="w-full py-6 flex items-center justify-between text-left focus:outline-none hover:bg-slate-50 transition-colors px-4 rounded-lg"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="text-lg font-medium text-slate-900">{question}</span>
                <ChevronDown className={`h-5 w-5 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="pb-6 px-4 text-slate-600 leading-relaxed animate-in fade-in">
                    {answer}
                </div>
            )}
        </div>
    )
}

const Step = ({ number, title, description }: any) => (
    <div className="flex flex-col items-center text-center relative z-10">
        <div className="h-16 w-16 bg-white border-4 border-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-2xl font-bold mb-6 shadow-sm">
            {number}
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-slate-500 leading-relaxed max-w-xs">{description}</p>
    </div>
)

export const LandingPage = () => {
  const history = useHistory();

  useEffect(() => {
      // Load Calendly script dynamically
      const head = document.querySelector('head');
      const script = document.createElement('script');
      script.setAttribute('src', 'https://assets.calendly.com/assets/external/widget.js');
      script.setAttribute('async', 'true');
      head?.appendChild(script);
  }, []);

  const scrollToSection = (id: string) => {
      const element = document.getElementById(id);
      if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
      }
  };

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Navbar */}
      <nav className="border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <span className="font-bold text-xl text-slate-900">Reviewflow</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <button onClick={() => scrollToSection('features')} className="hover:text-indigo-600 transition-colors">Fonctionnalités</button>
            <button onClick={() => scrollToSection('pricing')} className="hover:text-indigo-600 transition-colors">Tarifs</button>
            <button onClick={() => scrollToSection('demo')} className="hover:text-indigo-600 transition-colors flex items-center gap-1 font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full">
                <Video className="h-4 w-4"/> Démo
            </button>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => history.push('/login')} className="text-sm font-medium text-slate-600 hover:text-indigo-600">
              Connexion
            </button>
            <Button onClick={() => history.push('/register')} className="shadow-lg shadow-indigo-200">
              Essai Gratuit
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden pt-16 pb-20 lg:pt-32 lg:pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 text-indigo-700 text-xs font-bold uppercase tracking-wide mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Sparkles className="h-3 w-3" /> Nouveau : Module "Acquisition d'avis" inclus
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight mb-6 leading-tight max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700">
            Gérez votre réputation <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">sans y passer vos soirées</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700">
            La plateforme tout-en-un pour centraliser, analyser et répondre à vos avis clients grâce à l'IA. 
            Idéal pour les restaurants, artisans et commerces locaux.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in fade-in slide-in-from-bottom-10 duration-700">
            <Button size="lg" className="h-14 px-8 text-lg shadow-xl shadow-indigo-200" onClick={() => history.push('/register')}>
              Commencer l'essai gratuit
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="secondary" className="h-14 px-8 text-lg bg-white border-slate-200 hover:bg-slate-50 text-slate-700" onClick={() => scrollToSection('demo')} icon={Video}>
              Réserver une Démo
            </Button>
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-6 text-sm text-slate-500 animate-in fade-in slide-in-from-bottom-12 duration-700">
            <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Sans carte bancaire</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Compatible Google & Facebook</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Installation en 2 min</span>
          </div>
        </div>
        
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full z-0 pointer-events-none">
            <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
            <div className="absolute top-20 right-10 w-72 h-72 bg-violet-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-32 left-1/2 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-slate-50 py-24 border-y border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                  <h2 className="text-3xl font-bold text-slate-900 mb-4">Comment ça marche ?</h2>
                  <p className="text-slate-500 max-w-2xl mx-auto">Trois étapes simples pour reprendre le contrôle de votre image.</p>
              </div>
              <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12">
                  <div className="hidden md:block absolute top-8 left-[16%] right-[16%] h-0.5 bg-indigo-100 -z-0"></div>
                  <Step 
                    number="1" 
                    title="Connectez" 
                    description="Liez vos pages Google Business et Facebook en un clic. Importez votre historique d'avis."
                  />
                  <Step 
                    number="2" 
                    title="Répondez" 
                    description="Notre IA analyse le sentiment et rédige une réponse parfaite. Vous validez ou modifiez."
                  />
                  <Step 
                    number="3" 
                    title="Décollez" 
                    description="Utilisez nos outils de collecte pour obtenir plus d'avis positifs et monter dans les classements."
                  />
              </div>
          </div>
      </div>

      {/* Features Grid */}
      <div id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wider text-indigo-600 uppercase bg-indigo-50 rounded-full">
                Fonctionnalités
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Une suite complète pour votre succès</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">Nous avons rassemblé les meilleurs outils du marché dans une interface simple.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={Zap}
              color="indigo"
              title="Réponses IA Intelligentes"
              description="Fini le syndrome de la page blanche. Notre IA rédige des réponses personnalisées, empathiques et sans fautes d'orthographe en 3 secondes."
            />
            <FeatureCard 
              icon={Globe}
              color="blue"
              title="Centralisation 360°"
              description="Google, Facebook, TripAdvisor... Tous vos avis arrivent dans une seule boîte de réception. Ne ratez plus jamais un commentaire client."
            />
            <FeatureCard 
              icon={QrCode}
              color="green"
              title="Collecte d'Avis (Nouveau)"
              description="Transformez vos clients en ambassadeurs. Générez des QR Codes, des affiches PDF et envoyez des campagnes SMS pour récolter des 5 étoiles."
            />
            <FeatureCard 
              icon={Workflow}
              color="amber"
              title="Automatisation 24/7"
              description="Créez des règles : 'Si l'avis est 5 étoiles et sans texte, répondre automatiquement merci'. L'IA travaille pendant que vous dormez."
            />
            <FeatureCard 
              icon={BarChart3}
              color="violet"
              title="Analyses Sémantiques"
              description="Détectez les problèmes avant qu'ils n'explosent. Notre tableau de bord analyse les mots-clés : 'Prix', 'Accueil', 'Propreté'..."
            />
            <FeatureCard 
              icon={FileText}
              color="rose"
              title="Rapports & Équipe"
              description="Générez des rapports PDF mensuels pour vos associés. Invitez vos managers et ajoutez des notes internes sur les avis sensibles."
            />
            <FeatureCard 
              icon={Layout}
              color="cyan"
              title="Widgets Site Web"
              description="Affichez vos meilleurs avis directement sur votre site internet (Wordpress, Wix, etc.) avec nos widgets personnalisables."
            />
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div id="testimonials" className="py-24 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                  <h2 className="text-3xl font-bold mb-6">Conçu pour les pros, par des pros.</h2>
                  <div className="flex gap-1 text-yellow-400 mb-4">
                      {[1,2,3,4,5].map(i => <Star key={i} className="h-5 w-5 fill-current" />)}
                  </div>
                  <blockquote className="text-xl text-slate-300 italic leading-relaxed mb-6">
                      "Je gère 3 salons de coiffure. Reviewflow m'a permis de déléguer la gestion des avis à mes managers tout en gardant un œil sur la qualité des réponses. L'IA comprend le vocabulaire technique de la coiffure, c'est bluffant."
                  </blockquote>
                  <div>
                      <div className="font-bold text-white">Sophie M.</div>
                      <div className="text-indigo-400">Gérante de Salons de Coiffure</div>
                  </div>
              </div>
              <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-2xl transform rotate-3 blur opacity-30"></div>
                  <div className="relative bg-slate-800 rounded-2xl p-8 border border-slate-700">
                      <div className="flex items-center gap-4 mb-6">
                          <div className="h-12 w-12 bg-slate-700 rounded-full flex items-center justify-center">
                              <StoreIcon className="h-6 w-6 text-slate-400" />
                          </div>
                          <div>
                              <div className="font-bold">Garage Auto Express</div>
                              <div className="text-xs text-slate-400">Client depuis 2024</div>
                          </div>
                      </div>
                      <div className="space-y-4">
                          <div className="flex justify-between text-sm border-b border-slate-700 pb-2">
                              <span className="text-slate-400">Avis traités</span>
                              <span className="font-bold text-white">1,240</span>
                          </div>
                          <div className="flex justify-between text-sm border-b border-slate-700 pb-2">
                              <span className="text-slate-400">Note moyenne</span>
                              <span className="font-bold text-green-400">4.8/5 (+0.3)</span>
                          </div>
                          <div className="flex justify-between text-sm">
                              <span className="text-slate-400">Temps gagné</span>
                              <span className="font-bold text-indigo-400">12h / mois</span>
                          </div>
                      </div>
                  </div>
              </div>
           </div>
        </div>
      </div>

      {/* DEMO SECTION (Calendly Inline) */}
      <div id="demo" className="py-24 bg-indigo-50 border-y border-indigo-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold text-slate-900 mb-4">Réservez votre démo personnalisée</h2>
                  <p className="text-slate-500 max-w-2xl mx-auto">Nos experts vous montreront comment Reviewflow peut transformer votre activité en 15 minutes.</p>
              </div>
              
              {/* Calendly Inline Widget */}
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
                  <div 
                    className="calendly-inline-widget" 
                    data-url="https://calendly.com/d/cw6r-k86-yz3?hide_gdpr_banner=1&background_color=ffffff&text_color=1e293b&primary_color=4f46e5" 
                    style={{ minWidth: '320px', height: '700px' }} 
                  />
              </div>
          </div>
      </div>

      {/* Pricing Section */}
      <div id="pricing" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Tarifs simples et transparents</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">Pas de frais cachés. Changez d'offre à tout moment.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <PricingCard 
                title="Gratuit"
                price="0€"
                features={['1 Établissement', 'Connexion Google & Facebook', 'Réponses manuelles illimitées', 'Tableau de bord basique']}
                cta="Commencer Gratuitement"
                variant="light"
                onClick={() => history.push('/register')}
            />
            <PricingCard 
                title="Starter"
                price="49€"
                features={['1 Établissement', '100 Réponses IA / mois', 'Module Collecte (QR Codes)', 'Personnalité de Marque', 'Support Email']}
                cta="Choisir Starter"
                highlighted
                variant="light"
                onClick={() => history.push('/register')}
            />
            <PricingCard 
                title="Pro"
                price="79€"
                features={['Établissements Illimités', '300 Réponses IA / mois', 'Automatisation (Workflows)', 'Rapports PDF & Excel', 'Notes Internes & Équipe']}
                cta="Choisir Pro"
                variant="light"
                onClick={() => history.push('/register')}
            />
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div id="faq" className="py-24 bg-slate-50">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
              <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold text-slate-900">Questions Fréquentes</h2>
              </div>
              <div className="space-y-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <FaqItem 
                    question="Est-ce compatible avec mon activité ?" 
                    answer="Oui ! Reviewflow s'adapte à tous les secteurs : restaurants, artisans, coiffeurs, garages, boutiques, etc. Vous pouvez configurer l'IA pour qu'elle utilise votre vocabulaire métier spécifique." 
                  />
                  <FaqItem 
                    question="Puis-je annuler à tout moment ?" 
                    answer="Absolument. Il n'y a aucun engagement de durée. Vous pouvez annuler votre abonnement d'un simple clic depuis votre espace client." 
                  />
                  <FaqItem 
                    question="Comment fonctionne la connexion Google ?" 
                    answer="Nous utilisons l'API officielle Google Business Profile (certifiée). Vous connectez votre compte en toute sécurité, et nous synchronisons vos avis automatiquement sans jamais avoir accès à vos mots de passe." 
                  />
                  <FaqItem 
                    question="L'IA répond-elle toute seule ?" 
                    answer="Par défaut, l'IA génère des brouillons que vous devez valider. C'est vous qui gardez le contrôle. Vous pouvez activer l'automatisation complète (autopilot) uniquement si vous le décidez, par exemple pour les avis 5 étoiles simples." 
                  />
              </div>
          </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 bg-slate-900 rounded flex items-center justify-center">
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                </div>
                <span className="font-bold text-slate-900">Reviewflow</span>
              </div>
              <div className="text-sm text-slate-500">
                  © 2025 Reviewflow SAS. Tous droits réservés.
              </div>
              <div className="flex gap-6 text-sm text-slate-500">
                  <button onClick={() => history.push('/legal')} className="hover:text-slate-900">Mentions Légales</button>
                  <button onClick={() => history.push('/privacy')} className="hover:text-slate-900">Confidentialité</button>
                  <button onClick={() => history.push('/contact')} className="hover:text-slate-900">Contact</button>
              </div>
          </div>
      </footer>
    </div>
  );
};

// Simple icon for testimonial section
const StoreIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m8-2a2 2 0 01-2.828 0 2 2 0 010-2.828 2 2 0 012.828 0 2 2 0 010 2.828z" />
    </svg>
);