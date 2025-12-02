import { Resend } from 'resend';

export default async function handler(req: any, res: any) {
  // Sécurité : On vérifie la clé API Resend
  const resendApiKey = process.env.RESEND_API_KEY;
  
  if (!resendApiKey) {
    return res.status(500).json({ error: 'RESEND_API_KEY manquante dans Vercel' });
  }

  const resend = new Resend(resendApiKey);
  const { to, subject, html } = req.body || {};

  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'Paramètres manquants (to, subject, html)' });
  }

  try {
    const data = await resend.emails.send({
      from: 'Reviewflow <onboarding@resend.dev>', 
      to: [to],
      subject: subject,
      html: html,
    });

    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error('Erreur Resend:', error);
    return res.status(500).json({ error: error.message });
  }
}