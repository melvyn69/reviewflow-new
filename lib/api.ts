
import { 
    INITIAL_ORG, INITIAL_REVIEWS, INITIAL_ANALYTICS, 
    INITIAL_WORKFLOWS, INITIAL_REPORTS, INITIAL_COMPETITORS, 
    INITIAL_SOCIAL_POSTS, INITIAL_USERS, INITIAL_BADGES, INITIAL_MILESTONES
} from './db';
import { 
    User, Organization, Review, AnalyticsSummary, WorkflowRule, 
    ReportConfig, Competitor, SocialPost, Customer, SocialTemplate,
    CampaignLog, SetupStatus, StaffMember, ReviewTimelineEvent, BrandSettings, Tutorial,
    ClientProgress, Badge, Milestone, AiCoachMessage, BlogPost, SeoAudit, MultiChannelCampaign,
    ChatMessage
} from '../types';
import { supabase } from './supabase';
import { hasAccess } from './features'; 

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
    auth: {
        getUser: async (): Promise<User | null> => {
            if (supabase) {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    // Fetch full profile from DB
                    const { data: profile } = await supabase
                        .from('users')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();
                    
                    if (profile) {
                        return {
                            id: session.user.id,
                            email: session.user.email!,
                            name: profile.name || session.user.email!,
                            role: profile.role || 'viewer',
                            organization_id: profile.organization_id,
                            organizations: [profile.organization_id],
                            avatar: profile.avatar || session.user.user_metadata?.avatar_url,
                            is_super_admin: profile.is_super_admin
                        };
                    }
                }
            }
            return null;
        },
        login: async (email: string, pass: string) => {
            if (supabase) {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
                if (error) throw new Error(error.message);
                
                // Return temp user object, actual state will be loaded by getUser via App.tsx
                return {
                    id: data.user.id,
                    email: data.user.email || '',
                    name: 'Utilisateur',
                    role: 'admin', // Placeholder
                    organization_id: 'loading'
                } as User;
            }
            throw new Error("Supabase non configuré.");
        },
        logout: async () => {
            localStorage.clear();
            if (supabase) await supabase.auth.signOut();
        },
        register: async (name: string, email: string, password?: string) => {
            if (supabase) {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password: password || 'temp-pass',
                    options: {
                        data: { full_name: name }
                    }
                });
                if (error) throw new Error(error.message);
                return data.user as any;
            }
            throw new Error("Supabase non configuré.");
        },
        connectGoogleBusiness: async () => { 
            if (supabase) {
                const { data, error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        queryParams: {
                            access_type: 'offline',
                            prompt: 'consent',
                        },
                        scopes: 'https://www.googleapis.com/auth/business.manage'
                    }
                });
                if (error) throw new Error(error.message);
            }
        },
        updateProfile: async (data: any) => {
            if (supabase) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase.from('users').update(data).eq('id', user.id);
                }
            }
        },
        changePassword: async () => { await delay(1000); },
        deleteAccount: async () => { 
            if (supabase) {
                await supabase.functions.invoke('delete_account');
                await supabase.auth.signOut();
            }
        },
        resetPassword: async (email: string) => { 
            if (supabase) await supabase.auth.resetPasswordForEmail(email);
        },
        loginWithGoogle: async () => {
            if (supabase) {
                await supabase.auth.signInWithOAuth({ provider: 'google' });
            }
            return null;
        }
    },
    organization: {
        get: async (): Promise<Organization | null> => {
            if (supabase) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user.id).single();
                    if (profile?.organization_id) {
                        const { data: org } = await supabase.from('organizations').select('*, locations(*)').eq('id', profile.organization_id).single();
                        
                        // Check Google Connection status
                        const googleConnected = !!org.google_refresh_token;
                        
                        return {
                            ...org,
                            integrations: {
                                ...org.integrations,
                                google: googleConnected
                            }
                        };
                    }
                }
            }
            return null;
        },
        update: async (data: any) => { 
            if (supabase) {
                const user = await api.auth.getUser();
                if (user?.organization_id) {
                    await supabase.from('organizations').update(data).eq('id', user.organization_id);
                }
            }
            return data;
        },
        create: async (name: string, industry: string) => { 
            // Created via Trigger usually, but explicit call here if needed
            return null;
        },
        saveGoogleTokens: async () => {
            if (supabase) {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.provider_token && session?.provider_refresh_token) {
                    const { data: profile } = await supabase.from('users').select('organization_id').eq('id', session.user.id).single();
                    if (profile?.organization_id) {
                        await supabase.from('organizations').update({
                            google_access_token: session.provider_token,
                            google_refresh_token: session.provider_refresh_token
                        }).eq('id', profile.organization_id);
                    }
                }
            }
            return true; 
        },
        addStaffMember: async (name: string, role: string, email: string) => {
            if (supabase) {
                const user = await api.auth.getUser();
                if (user?.organization_id) {
                    await supabase.from('staff_members').insert({
                        name, role, email, organization_id: user.organization_id
                    });
                }
            }
        },
        removeStaffMember: async (id: string) => { 
            if (supabase) await supabase.from('staff_members').delete().eq('id', id);
        },
        generateApiKey: async (name: string) => { 
            if (supabase) await supabase.functions.invoke('manage_org_settings', { body: { action: 'generate_api_key', data: { name } } });
        },
        revokeApiKey: async (id: string) => {
            if (supabase) await supabase.functions.invoke('manage_org_settings', { body: { action: 'revoke_api_key', data: { id } } });
        },
        saveWebhook: async (config: any) => { /* Not impl */ },
        testWebhook: async (id: string) => { return true; },
        deleteWebhook: async (id: string) => { /* Not impl */ },
        simulatePlanChange: async (plan: string) => { /* Not impl */ }
    },
    reviews: {
        list: async (filters: any = {}): Promise<Review[]> => {
            if (supabase) {
                const user = await api.auth.getUser();
                if (!user?.organization_id) return [];

                // Get Location IDs for Org
                const { data: locations } = await supabase.from('locations').select('id').eq('organization_id', user.organization_id);
                const locIds = locations?.map((l: any) => l.id) || [];

                if (locIds.length === 0) return [];

                let query = supabase.from('reviews').select('*').in('location_id', locIds).order('received_at', { ascending: false });
                
                if (filters.rating && filters.rating !== 'Tout') query = query.eq('rating', Number(filters.rating.replace(' ★', '')));
                if (filters.source && filters.source !== 'Tout') query = query.eq('source', filters.source.toLowerCase());
                if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);
                
                const { data } = await query;
                return data || [];
            }
            return [];
        },
        getTimeline: (review: Review): ReviewTimelineEvent[] => {
            // Simplified timeline logic
            const events: ReviewTimelineEvent[] = [
                { id: '1', type: 'review_created', actor_name: review.author_name, date: review.received_at, content: 'Avis reçu' }
            ];
            if (review.replied_at) {
                events.push({ id: '3', type: 'reply_published', actor_name: 'Vous', date: review.replied_at, content: 'Réponse publiée' });
            }
            return events;
        },
        reply: async (id: string, text: string) => {
            if (supabase) {
                await supabase.functions.invoke('post_google_reply', { body: { reviewId: id, replyText: text } });
            }
        },
        saveDraft: async (id: string, text: string) => {
            if (supabase) {
                await supabase.from('reviews').update({ 
                    status: 'draft',
                    ai_reply: { text, needs_manual_validation: true } // Simplified
                }).eq('id', id);
            }
        },
        addNote: async (id: string, text: string) => {
            // Logic to append note to JSONB array would go here or separate table
            return { id: 'note-' + Date.now(), text, author_name: 'Moi', created_at: new Date().toISOString() };
        },
        addTag: async (id: string, tag: string) => { /* Not impl */ },
        removeTag: async (id: string, tag: string) => { /* Not impl */ },
        archive: async (id: string) => {
            if (supabase) await supabase.from('reviews').update({ archived: true }).eq('id', id);
        },
        unarchive: async (id: string) => {
            if (supabase) await supabase.from('reviews').update({ archived: false }).eq('id', id);
        },
        getCounts: async () => {
            if (supabase) {
                const user = await api.auth.getUser();
                if (!user?.organization_id) return { todo: 0, done: 0 };
                // Need locations
                const { data: locations } = await supabase.from('locations').select('id').eq('organization_id', user.organization_id);
                const locIds = locations?.map((l: any) => l.id) || [];
                
                if (locIds.length === 0) return { todo: 0, done: 0 };

                const { count: todo } = await supabase.from('reviews').select('*', { count: 'exact', head: true }).in('location_id', locIds).eq('status', 'pending');
                const { count: done } = await supabase.from('reviews').select('*', { count: 'exact', head: true }).in('location_id', locIds).neq('status', 'pending');
                
                return { todo: todo || 0, done: done || 0 };
            }
            return { todo: 0, done: 0 };
        },
        subscribe: (callback: (payload: any) => void) => {
            if (supabase) {
                const sub = supabase.channel('reviews-updates')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, callback)
                    .subscribe();
                return { unsubscribe: () => supabase.removeChannel(sub) };
            }
            return { unsubscribe: () => {} };
        },
        uploadCsv: async (file: File) => { return 0; }
    },
    notifications: {
        list: async () => [],
        markAllRead: async () => {},
        sendTestEmail: async (email: string) => { /* Not impl */ }
    },
    global: {
        search: async (query: string) => []
    },
    ai: {
        generateReply: async (review: Review, config: any) => {
            if (supabase) {
                const { data, error } = await supabase.functions.invoke('ai_generate', {
                    body: { task: 'generate_reply', context: { review, ...config } }
                });
                if (error) throw new Error(error.message);
                return data.text;
            }
            return "Mode hors ligne.";
        },
        previewBrandVoice: async (type: string, input: string, settings: BrandSettings) => {
            if (supabase) {
                const { data, error } = await supabase.functions.invoke('ai_generate', {
                    body: { task: 'test_brand_voice', context: { simulationType: type, inputText: input, simulationSettings: settings } }
                });
                if (error) throw new Error(error.message);
                return data.text;
            }
            return "Simulation impossible.";
        },
        generateSocialPost: async (review: Review, platform: string) => {
            if (supabase) {
                const { data, error } = await supabase.functions.invoke('ai_generate', {
                    body: { task: 'social_post', context: { review, platform } }
                });
                if (error) throw new Error(error.message);
                return data.text;
            }
            return "";
        },
        generateManagerAdvice: async (member: StaffMember, rank: number, type: string) => { 
            if (supabase) {
                const { data, error } = await supabase.functions.invoke('ai_generate', {
                    body: { task: 'generate_manager_advice', context: { ...member, rank, type } }
                });
                if (!error) return data.text;
            }
            return "Conseil non disponible."; 
        },
        runCustomTask: async (task: any) => { return { result: "Not available" }; },
        chatWithSupport: async (msg: string, history?: ChatMessage[]) => { return "Support IA bientôt disponible."; },
        getCoachAdvice: async (progress: ClientProgress): Promise<AiCoachMessage> => {
            if (supabase) {
                const { data, error } = await supabase.functions.invoke('ai_coach', {
                    body: { progress }
                });
                if (!error) return JSON.parse(data); // Expecting JSON string from function
            }
            return { title: "Bienvenue", message: "Complétez votre profil pour avancer.", focus_area: "setup" };
        }
    },
    analytics: {
        getOverview: async (period?: string) => { 
            // In a real app, this would be a Postgres function or Edge Function that aggregates data
            // For now, returning basic computed data from fetched reviews could be heavy.
            // We'll return mock structure but potentially real counts if we implemented a `get_analytics` RPC.
            return INITIAL_ANALYTICS; 
        }
    },
    marketing: {
        getBlogPosts: async () => [],
        saveBlogPost: async (p: BlogPost) => p,
        generateSeoMeta: async (content: string) => ({ meta_title: 'SEO', meta_description: 'Desc', slug: 'slug' }),
        analyzeCompetitorSeo: async (url: string): Promise<SeoAudit> => ({
            url, scanned_at: new Date().toISOString(), metrics: { title: 'Site', description: '', h1: '', load_time_ms: 200, mobile_friendly: true },
            keywords: [], ai_analysis: { strengths: [], weaknesses: [], opportunities: [] }
        }),
        generateRichSnippet: async (data: any) => "{}",
        generateCampaignContent: async (prompt: string, budget: number) => ({ sms: "", email_subject: "", email_body: "", social_caption: "" })
    },
    automation: {
        getWorkflows: async () => [],
        saveWorkflow: async (workflow: any) => {},
        deleteWorkflow: async (id: string) => {},
        run: async () => { return { processed: 0, actions: 0 }; }
    },
    competitors: {
        list: async (opts?: any) => {
            if (supabase) {
                const { data } = await supabase.from('competitors').select('*');
                return data || [];
            }
            return [];
        },
        getReports: async () => [],
        saveReport: async (data?: any) => {},
        autoDiscover: async (radius: number, keyword: string, lat: number, lng: number) => {
            if (supabase) {
                const { data, error } = await supabase.functions.invoke('fetch_places', {
                    body: { radius, keyword, latitude: lat, longitude: lng }
                });
                if (error) throw new Error(error.message);
                return data.results;
            }
            return [];
        },
        getDeepAnalysis: async (sector: string, location: string, competitors: any[]) => {
            if (supabase) {
                const { data, error } = await supabase.functions.invoke('analyze_market', {
                    body: { sector, location, competitors }
                });
                if (error) throw new Error(error.message);
                return data;
            }
            return null; 
        },
        create: async (data: any) => {
            if (supabase) {
                const user = await api.auth.getUser();
                if (user?.organization_id) {
                    await supabase.from('competitors').insert({ ...data, organization_id: user.organization_id });
                }
            }
        },
        delete: async (id: string) => {
            if (supabase) await supabase.from('competitors').delete().eq('id', id);
        }
    },
    team: {
        list: async () => {
            if (supabase) {
                const user = await api.auth.getUser();
                if (user?.organization_id) {
                    const { data } = await supabase.from('users').select('*').eq('organization_id', user.organization_id);
                    return data as User[] || [];
                }
            }
            return [];
        },
        invite: async (email: string, role: string, firstName: string, lastName: string) => {
            if (supabase) {
                const { error } = await supabase.functions.invoke('invite_user', {
                    body: { email, role, firstName, lastName }
                });
                if (error) throw new Error(error.message);
                return { success: true };
            }
            return { success: false };
        }
    },
    reports: {
        trigger: async (reportId: string) => { /* Not impl */ }
    },
    billing: {
        getInvoices: async () => {
            if (supabase) {
                const { data, error } = await supabase.functions.invoke('get_invoices');
                if (!error) return data.invoices;
            }
            return [];
        },
        getUsage: async () => 0,
        createCheckoutSession: async (planId: string) => {
            if (supabase) {
                const { data, error } = await supabase.functions.invoke('create_checkout', {
                    body: { 
                        plan: planId,
                        successUrl: window.location.origin + '/#/billing?success=true',
                        cancelUrl: window.location.origin + '/#/billing?canceled=true'
                    }
                });
                if (error) throw new Error(error.message);
                return data.url;
            }
            return "";
        },
        createPortalSession: async () => {
            if (supabase) {
                const { data, error } = await supabase.functions.invoke('create_portal', {
                    body: { returnUrl: window.location.origin + '/#/billing' }
                });
                if (error) throw new Error(error.message);
                return data.url;
            }
            return "";
        }
    },
    locations: {
        update: async (id: string, data: any) => {
            if (supabase) await supabase.from('locations').update(data).eq('id', id);
        },
        create: async (data: any) => {
            if (supabase) {
                const user = await api.auth.getUser();
                if (user?.organization_id) {
                    await supabase.from('locations').insert({ ...data, organization_id: user.organization_id });
                }
            }
        },
        delete: async (id: string) => {
            if (supabase) await supabase.from('locations').delete().eq('id', id);
        },
        importFromGoogle: async () => {
            // This triggers the fetch_google_locations Edge Function
            if (supabase) {
                // Get Token first
                const { data: { session } } = await supabase.auth.getSession();
                const accessToken = session?.provider_token;
                
                // If no token in session (e.g. email login but org connected previously), 
                // the function will try to use the stored Refresh Token.
                
                const { data, error } = await supabase.functions.invoke('fetch_google_locations', {
                    body: { accessToken } 
                });

                if (error) throw new Error(error.message);
                
                // Process and insert locations
                const user = await api.auth.getUser();
                if (user?.organization_id && Array.isArray(data)) {
                    let count = 0;
                    for (const loc of data) {
                        const { error: insertError } = await supabase.from('locations').upsert({
                            organization_id: user.organization_id,
                            name: loc.title, // Google "title" is the business name
                            external_reference: loc.name, // Google "name" is the ID resource
                            address: loc.address,
                            connection_status: 'connected',
                            city: loc.address.split(',')[1]?.trim() || 'Inconnu'
                        }, { onConflict: 'external_reference' });
                        
                        if (!insertError) count++;
                    }
                    return count;
                }
            }
            return 0;
        }
    },
    activity: {
        getRecent: async () => []
    },
    onboarding: {
        checkStatus: async (): Promise<SetupStatus> => ({
            completionPercentage: 0,
            googleConnected: false,
            brandVoiceConfigured: false,
            firstReviewReplied: false
        })
    },
    seedCloudDatabase: async () => {},
    social: {
        getPosts: async (locationId?: string) => {
            if (supabase) {
                let q = supabase.from('social_posts').select('*');
                if (locationId) q = q.eq('location_id', locationId);
                const { data } = await q;
                return data as SocialPost[] || [];
            }
            return [];
        },
        schedulePost: async (post: any) => {
            if (supabase) {
                const user = await api.auth.getUser();
                if (user?.organization_id) {
                    await supabase.from('social_posts').insert({
                        ...post,
                        organization_id: user.organization_id,
                        status: 'scheduled'
                    });
                }
            }
        },
        uploadMedia: async (file: File) => {
            if (supabase) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const { data, error } = await supabase.storage.from('media').upload(fileName, file);
                if (error) throw error;
                const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);
                return publicUrl;
            }
            return "";
        },
        connectAccount: async (platform: string) => { /* Trigger OAuth Flow */ },
        saveTemplate: async (template: any) => { /* Not impl */ }
    },
    public: {
        getLocationInfo: async (id: string) => {
            if (supabase) {
                const { data } = await supabase.from('locations').select('*').eq('id', id).single();
                return data;
            }
            return null;
        },
        getWidgetReviews: async (id: string) => {
            if (supabase) {
                const { data } = await supabase.from('reviews').select('*').eq('location_id', id).gte('rating', 4).order('received_at', { ascending: false }).limit(20);
                return data || [];
            }
            return [];
        },
        submitFeedback: async (locationId: string, rating: number, feedback: string, contact: any, tags: string[], staffName?: string) => {
            if (supabase) {
                const { error } = await supabase.functions.invoke('submit_review', {
                    body: { locationId, rating, feedback, contact, tags, staffName }
                });
                if (error) throw new Error(error.message);
            }
        }
    },
    widgets: {
        requestIntegration: async (data: any) => {}
    },
    campaigns: {
        send: async (channel: string, to: string, subject: string, content: string, segment: string, link?: string) => {
            if (supabase) {
                if (channel === 'sms') {
                    const { error } = await supabase.functions.invoke('send_sms_campaign', { body: { to, body: content } });
                    if (error) throw new Error(error.message);
                } else {
                    const { error } = await supabase.functions.invoke('send_campaign_emails', { body: { recipients: [{ email: to }], subject, html: content } });
                    if (error) throw new Error(error.message);
                }
            }
        },
        getHistory: async () => []
    },
    offers: {
        validate: async (code: string) => {
            if (supabase) {
                const { data, error } = await supabase.functions.invoke('manage_coupons', {
                    body: { action: 'validate', code }
                });
                if (error) throw new Error(error.message);
                return data;
            }
            return { valid: false };
        },
        redeem: async (code: string) => {
            if (supabase) {
                const { error } = await supabase.functions.invoke('manage_coupons', {
                    body: { action: 'redeem', code }
                });
                if (error) throw new Error(error.message);
            }
        },
        create: async (offer: any) => {
            if (supabase) {
                const user = await api.auth.getUser();
                if (user?.organization_id) {
                    await supabase.from('offers').insert({ ...offer, organization_id: user.organization_id });
                }
            }
        }
    },
    customers: {
        list: async (filters: any = {}): Promise<Customer[]> => {
            if (supabase) {
                const { data } = await supabase.from('customers').select('*');
                return data as Customer[] || [];
            }
            return [];
        },
        update: async (id: string, data: any) => {
            if (supabase) await supabase.from('customers').update(data).eq('id', id);
        },
        import: async (data: any[]) => {
            if (supabase) {
                const user = await api.auth.getUser();
                if (user?.organization_id) {
                    const customers = data.map(c => ({ ...c, organization_id: user.organization_id }));
                    await supabase.from('customers').upsert(customers, { onConflict: 'email' });
                }
            }
        },
        enrichProfile: async (id: string) => {
            if (supabase) {
                const { data, error } = await supabase.functions.invoke('ai_generate', {
                    body: { task: 'enrich_customer', context: { customerId: id } }
                });
                if (!error) return JSON.parse(data.text);
            }
            return { profile: "Profil IA", suggestion: "Suggestion IA" };
        }
    },
    system: {
        checkHealth: async () => ({ db: true, latency: 45 })
    },
    admin: {
        getStats: async () => ({ mrr: "0 €", active_tenants: 0, total_reviews_processed: 0, tenants: [] })
    },
    google: {
        fetchAllGoogleLocations: async () => [],
        syncReviewsForLocation: async (locationId: string) => { return 0; }
    },
    company: {
        search: async (query: string) => []
    },
    support: {
        sendTicket: async (ticket: any) => {
            if (supabase) {
                const user = await api.auth.getUser();
                await supabase.functions.invoke('send_support_ticket', {
                    body: { ...ticket, email: user?.email, name: user?.name }
                });
            }
        },
        getTutorials: async () => []
    },
    progression: {
        get: async (): Promise<ClientProgress> => ({
            score: 20,
            level: 'Beginner',
            steps: { google_connected: false, establishment_configured: false, funnel_active: false, first_review_replied: false, widget_installed: false, automation_active: false, social_active: false },
            next_actions: []
        }),
        getBadges: async () => [],
        getMilestones: async () => []
    }
};
