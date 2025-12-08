
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { postId } = await req.json()

    if (!postId) throw new Error("Missing postId")

    // 1. Fetch Post Details
    const { data: post, error: postError } = await supabase
        .from('social_posts')
        .select('*')
        .eq('id', postId)
        .single()

    if (postError || !post) throw new Error("Post not found")

    // 2. Fetch Social Account Token
    const { data: account, error: accountError } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('organization_id', post.organization_id)
        .eq('platform', post.platform)
        .single()

    if (accountError || !account) throw new Error(`No connected account for ${post.platform}`)

    let publishResult = { success: false, id: '', error: '' }

    // 3. Publish based on platform
    if (post.platform === 'facebook') {
        publishResult = await publishToFacebook(account.access_token, account.external_id, post.content, post.image_url)
    } else if (post.platform === 'instagram') {
        publishResult = await publishToInstagram(account.access_token, account.external_id, post.content, post.image_url)
    } else if (post.platform === 'linkedin') {
        publishResult = await publishToLinkedin(account.access_token, account.external_id, post.content, post.image_url)
    }

    // 4. Update Post Status & Log
    const status = publishResult.success ? 'published' : 'failed'
    const updatePayload: any = { status }
    if (publishResult.success && publishResult.id) {
        // Construct public URL if possible (simplified)
        if (post.platform === 'facebook') updatePayload.published_url = `https://facebook.com/${publishResult.id}`
        else if (post.platform === 'instagram') updatePayload.published_url = `https://instagram.com/p/${publishResult.id}` // ID mapping varies
    }

    await supabase.from('social_posts').update(updatePayload).eq('id', postId)

    // Insert Log (assuming social_logs table exists)
    // Note: If table doesn't exist, this might fail silently or error depending on setup. 
    // Ensuring table exists via migration is separate.
    await supabase.from('social_logs').insert({
        post_id: postId,
        platform: post.platform,
        status: publishResult.success ? 'success' : 'failure',
        message: publishResult.success ? `Published ID: ${publishResult.id}` : publishResult.error,
        created_at: new Date().toISOString()
    }).catch(err => console.error("Log Insert Error", err))

    return new Response(
      JSON.stringify(publishResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error("Publish Error:", error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// --- HELPERS ---

async function publishToFacebook(token: string, pageId: string, message: string, imageUrl?: string) {
    try {
        let url = `https://graph.facebook.com/v18.0/${pageId}/feed`
        let body: any = { message, access_token: token }

        if (imageUrl) {
            url = `https://graph.facebook.com/v18.0/${pageId}/photos`
            body.url = imageUrl
            body.caption = message // Photo endpoint uses caption
        }

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })
        const data = await res.json()
        
        if (data.error) throw new Error(data.error.message)
        
        return { success: true, id: data.id || data.post_id, error: '' }
    } catch (e: any) {
        return { success: false, error: e.message, id: '' }
    }
}

async function publishToInstagram(token: string, igUserId: string, caption: string, imageUrl?: string) {
    try {
        if (!imageUrl) throw new Error("Instagram requires an image")

        // Step 1: Create Container
        const containerRes = await fetch(`https://graph.facebook.com/v18.0/${igUserId}/media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image_url: imageUrl,
                caption: caption,
                access_token: token
            })
        })
        const containerData = await containerRes.json()
        if (containerData.error) throw new Error(containerData.error.message)

        const creationId = containerData.id

        // Step 2: Publish Container
        const publishRes = await fetch(`https://graph.facebook.com/v18.0/${igUserId}/media_publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                creation_id: creationId,
                access_token: token
            })
        })
        const publishData = await publishRes.json()
        if (publishData.error) throw new Error(publishData.error.message)

        return { success: true, id: publishData.id, error: '' }
    } catch (e: any) {
        return { success: false, error: e.message, id: '' }
    }
}

async function publishToLinkedin(token: string, personUrn: string, text: string, imageUrl?: string) {
    try {
        // Simple text share. Image upload requires 3-step process (Register -> Upload -> Create).
        // For simplicity in this demo, we handle text share. Image handling adds significant complexity.
        // If image provided, we warn or skip.
        
        const body = {
            author: `urn:li:person:${personUrn}`, // or organization
            lifecycleState: "PUBLISHED",
            specificContent: {
                "com.linkedin.ugc.ShareContent": {
                    shareCommentary: {
                        text: text
                    },
                    shareMediaCategory: "NONE"
                }
            },
            visibility: {
                "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
            }
        }

        const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'X-Restli-Protocol-Version': '2.0.0'
            },
            body: JSON.stringify(body)
        })

        const data = await res.json()
        if (data.serviceErrorCode) throw new Error(data.message)

        return { success: true, id: data.id, error: '' }
    } catch (e: any) {
        return { success: false, error: e.message, id: '' }
    }
}
