
import { Resend } from 'resend';

export default async function handler(req: any, res: any) {
  // Sécurité : On vérifie la clé API Resend
  const resendApiKey = process.env.RESEND_API_KEY;
  
  if (!resendApiKey) {
    console.error("ERREUR CRITIQUE: RESEND_API_KEY manquante dans les variables d'environnement Vercel.");
    return res.status(500).json({ error: 'Configuration serveur incomplète (Email).' });
  }

  const resend = new Resend(resendApiKey);
  const { to, subject, html } = req.body || {};

  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'Paramètres manquants (to, subject, html)' });
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'Reviewflow <onboarding@resend.dev>', 
      to: [to],
      subject: subject,
      html: html,
    });

    if (error) {
        console.error('Erreur API Resend détaillée:', JSON.stringify(error));
        return res.status(500).json({ error: error.message || 'Erreur inconnue Resend' });
    }

    console.log('Email envoyé avec succès:', data);
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error('Exception lors de l\'envoi Resend:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
