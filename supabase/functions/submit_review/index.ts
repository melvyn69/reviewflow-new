
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'npm:resend@2.0.0'

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Configuration serveur incomplète (Clés Supabase manquantes).')
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const { locationId, rating, feedback, contact, tags, staffName } = await req.json()

    if (!locationId || !rating) {
      return new Response(
        JSON.stringify({ error: 'Données manquantes (locationId, rating)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validation du feedback obligatoire
    if (!feedback || feedback.trim() === '') {
        return new Response(
            JSON.stringify({ error: 'Le message est obligatoire.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // --- STAFF ATTRIBUTION LOGIC ---
    let staffAttributed = null
    let internalNoteText = ''

    if (staffName) {
        // 1. Get Org ID from Location
        const { data: loc } = await supabase.from('locations').select('organization_id').eq('id', locationId).single()
        
        if (loc?.organization_id) {
            // 2. Find Staff Member by Name in this Org (Fuzzy match)
            const { data: staff } = await supabase
                .from('staff_members')
                .select('id, name, reviews_count')
                .eq('organization_id', loc.organization_id)
                .ilike('name', `%${staffName}%`) // Case insensitive partial match
                .limit(1)
                .single()

            if (staff) {
                staffAttributed = staff.name
                internalNoteText = `Attribué automatiquement à ${staff.name} via QR Code.`
                
                // Increment counter
                await supabase.from('staff_members').update({ reviews_count: (staff.reviews_count || 0) + 1 }).eq('id', staff.id)
            }
        }
    }

    const finalBody = feedback || ''

    const newReview = {
        location_id: locationId,
        rating: rating,
        text: finalBody, 
        author_name: contact || 'Client Anonyme (QR Code)',
        source: 'direct', // Source interne
        status: 'pending',
        received_at: new Date().toISOString(),
        language: 'fr',
        staff_attributed_to: staffAttributed,
        internal_notes: internalNoteText ? [{ id: Date.now().toString(), text: internalNoteText, author_name: 'Système', created_at: new Date().toISOString() }] : [],
        analysis: { 
            sentiment: rating >= 4 ? 'positive' : 'negative', 
            themes: tags || [], 
            keywords: tags || [], 
            flags: { hygiene: false, security: false } 
        },
    }

    const { data: insertedReview, error: insertError } = await supabase.from('reviews').insert(newReview).select().single()

    if (insertError) {
        console.error("Supabase Insert Error:", insertError)
        throw new Error(`Erreur Base de données: ${insertError.message}`)
    }

    // --- ALERTE EMAIL (Si note critique <= 3) ---
    if (rating <= 3) {
        if (!resendApiKey) {
            console.warn("RESEND_API_KEY manquante. Impossible d'envoyer l'alerte email.");
        } else {
            try {
                // 1. Trouver les infos de l'admin et de l'organisation
                const { data: location } = await supabase.from('locations').select('organization_id, name').eq('id', locationId).single()
                
                if (location?.organization_id) {
                    // Récupérer les paramètres de notification de l'organisation
                    const { data: org } = await supabase
                        .from('organizations')
                        .select('notification_settings, users(email)')
                        .eq('id', location.organization_id)
                        .single();

                    // Déterminer l'email destinataire
                    let recipientEmail = null;
                    if (org?.notification_settings?.alert_email) {
                        recipientEmail = org.notification_settings.alert_email;
                    } else if (org?.users && org.users.length > 0) {
                        // Fallback au premier user (Owner)
                        recipientEmail = org.users[0].email;
                    }

                    if (recipientEmail) {
                        const resend = new Resend(resendApiKey)
                        const { error: emailError } = await resend.emails.send({
                            from: 'Reviewflow Alerts <onboarding@resend.dev>',
                            to: recipientEmail,
                            subject: `🚨 Alerte Avis Négatif (${rating}/5) - ${location.name}`,
                            html: `
                                <div style="font-family: sans-serif; padding: 20px; background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px;">
                                    <h2 style="color: #991b1b; margin-top: 0;">Nouvel avis critique reçu</h2>
                                    <p><strong>Note :</strong> ${rating}/5 ⭐</p>
                                    <p><strong>Message :</strong> ${finalBody || "Aucun message"}</p>
                                    <p><strong>Contact client :</strong> ${contact || "Non renseigné"}</p>
                                    <p><strong>Problèmes signalés :</strong> ${(tags || []).join(', ')}</p>
                                    ${staffAttributed ? `<p><strong>Staff concerné :</strong> ${staffAttributed}</p>` : ''}
                                    <br/>
                                    <a href="https://reviewflow.vercel.app" style="background-color: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Répondre maintenant</a>
                                </div>
                            `
                        })
                        
                        if (emailError) {
                            console.error("Erreur API Resend (Alert):", JSON.stringify(emailError));
                        } else {
                            console.log(`Email d'alerte envoyé avec succès à ${recipientEmail}`);
                        }
                    } else {
                        console.warn("Aucun email destinataire trouvé pour l'alerte.");
                    }
                }
            } catch (emailErr: any) {
                console.error("Exception lors de l'envoi de l'alerte:", emailErr.message);
                // On ne bloque pas la réponse si l'email échoue
            }
        }
    }

    return new Response(
      JSON.stringify({ success: true, review: insertedReview }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
