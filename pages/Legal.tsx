import React from 'react';
import { useHistory } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui';

const PageLayout = ({ title, children }: { title: string, children?: React.ReactNode }) => {
    const history = useHistory();
    
    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white shadow-sm rounded-2xl p-8 md:p-12">
                <Button variant="ghost" className="mb-6 pl-0 hover:bg-transparent text-slate-500" onClick={() => history.push('/')}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Retour à l'accueil
                </Button>
                <h1 className="text-3xl font-bold text-slate-900 mb-8 pb-4 border-b border-slate-100">{title}</h1>
                <div className="prose prose-slate max-w-none text-slate-600">
                    {children}
                </div>
            </div>
        </div>
    );
};

export const LegalPage = () => (
    <PageLayout title="Mentions Légales">
        <h3>1. Éditeur du site</h3>
        <p>
            Le site Reviewflow est édité par la société Reviewflow SAS, au capital de 10 000 euros, immatriculée au Registre du Commerce et des Sociétés de Paris.<br/>
            Siège social : 12 Avenue de la République, 75011 Paris, France.<br/>
            Email : contact@reviewflow.com
        </p>

        <h3>2. Hébergement</h3>
        <p>
            Ce site est hébergé par Vercel Inc., 340 S Lemon Ave #4133 Walnut, CA 91789, USA.
        </p>

        <h3>3. Propriété intellectuelle</h3>
        <p>
            L'ensemble de ce site relève de la législation française et internationale sur le droit d'auteur et la propriété intellectuelle. Tous les droits de reproduction sont réservés.
        </p>
    </PageLayout>
);

export const PrivacyPage = () => (
    <PageLayout title="Politique de Confidentialité">
        <h3>1. Collecte des données</h3>
        <p>
            Nous collectons les informations que vous nous fournissez lors de votre inscription (nom, email) ainsi que les données relatives à votre entreprise et vos avis clients pour le bon fonctionnement du service.
        </p>

        <h3>2. Utilisation des données</h3>
        <p>
            Vos données sont utilisées pour :
            <ul>
                <li>Vous fournir l'accès à notre service.</li>
                <li>Générer des réponses et analyses via nos algorithmes d'IA.</li>
                <li>Vous envoyer des informations administratives et commerciales.</li>
            </ul>
        </p>

        <h3>3. Sécurité</h3>
        <p>
            Nous mettons en œuvre toutes les mesures techniques nécessaires pour garantir la sécurité de vos données. Les paiements sont sécurisés par Stripe.
        </p>

        <h3>4. Vos droits (RGPD)</h3>
        <p>
            Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression de vos données. Contactez-nous pour exercer ce droit.
        </p>
    </PageLayout>
);

export const ContactPage = () => (
    <PageLayout title="Contactez-nous">
        <p className="text-lg mb-6">
            Une question ? Une suggestion ? Notre équipe est basée à Paris et répond généralement sous 24h ouvrées.
        </p>
        
        <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 mb-8">
            <h4 className="font-bold text-indigo-900 mb-2">Support Client</h4>
            <p className="text-indigo-700">Pour toute demande technique ou commerciale :</p>
            <a href="mailto:support@reviewflow.com" className="text-xl font-bold text-indigo-600 hover:underline mt-2 block">support@reviewflow.com</a>
        </div>

        <p>
            Vous pouvez également nous joindre par courrier à notre siège social :<br/>
            <strong>Reviewflow SAS</strong><br/>
            12 Avenue de la République<br/>
            75011 Paris<br/>
            France
        </p>
    </PageLayout>
);