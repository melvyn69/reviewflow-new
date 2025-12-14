import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export default async function handler(request: any, response: any) {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY || !RESEND_KEY) {
      return response.status(500).json({ error: 'Config manquante (Supabase ou Resend)' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const resend = new Resend(RESEND_KEY);

  // 1. Quel jour sommes-nous ? (ex: "monday")
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = days[new Date().getDay()];
  const currentHour = new Date().getHours(); // Heure serveur (UTC souvent)

  // 2. Trouver les organisations qui veulent un digest AUJOURD'HUI
  // Note: On simplifie en vérifiant juste le jour pour l'instant. L'heure précise nécessiterait un cron plus fréquent.
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, name, notification_settings, users(email)')
    .not('notification_settings', 'is', null);

  let sentCount = 0;

  for (const org of orgs || []) {
      const settings = org.notification_settings;
      // Vérifier si digest activé et si c'est le bon jour
      if (settings?.weekly_digest && settings?.digest_day === today) {
          
          // 3. Calculer les stats de la semaine
          const { count } = await supabase
            .from('reviews')
            .select('*', { count: 'exact', head: true })
            .eq('location_id', org.id) // Simplification: on suppose lien direct ou via locations
            .gte('received_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

          // 4. Envoyer l'email
          const emails = org.users.map((u: any) => u.email);
          
          if (emails.length > 0) {
              await resend.emails.send({
                  from: 'Reviewflow <digest@resend.dev>',
                  to: emails,
                  subject: `📈 Bilan Hebdomadaire - ${org.name}`,
                  html: `
                    <h1>Bilan de la semaine</h1>
                    <p>Bonjour,</p>
                    <p>Voici les performances de <strong>${org.name}</strong> sur les 7 derniers jours :</p>
                    <ul>
                        <li><strong>Nouveaux avis :</strong> ${count || 0}</li>
                        <li><strong>Note moyenne :</strong> (Calculée par l'IA)</li>
                    </ul>
                    <p><a href="https://reviewflow.vercel.app">Accéder au tableau de bord</a></p>
                  `
              });
              sentCount++;
          }
      }
  }

  return response.status(200).json({ message: `Digest envoyé à ${sentCount} organisations.` });
}