
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

// --- GOD MODE CONFIGURATION ---
// These emails will ALWAYS be Super Admin with Elite Plan, no matter what.
const GOD_EMAILS = ['melvynbenichou@gmail.com', 'demo@reviewflow.com', 'god@reviewflow.com'];

const isDemoMode = () => localStorage.getItem('is_demo_mode') === 'true';
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
    auth: {
        getUser: async (): Promise<User | null> => {
            // 1. GOD MODE / DEMO CHECK (Priority 1: LocalStorage)
            // We check local storage first to allow the backdoor to work without Supabase or network
            const userStr = localStorage.getItem('user');
            if (userStr) {
                try {
                    const localUser = JSON.parse(userStr);
                    const email = (localUser.email || '').toLowerCase();

                    // If it is a God Email, we trust LocalStorage and ensure Super Admin role
                    if (GOD_EMAILS.includes(email)) {
                        if (localUser.role !== 'super_admin') {
                            localUser.role = 'super_admin';
                            localStorage.setItem('user', JSON.stringify(localUser));
                        }
                        // Ensure we are in demo mode context for these users to bypass RLS if needed locally
                        localStorage.setItem('is_demo_mode', 'true');
                        return localUser;
                    }

                    // If we are strictly in demo mode (e.g. no supabase config), return local user
                    if (isDemoMode() && !supabase) {
                        return localUser;
                    }
                } catch (e) {
                    console.warn("Corrupt local user data", e);
                    localStorage.removeItem('user');
                }
            }

            // 2. SUPABASE AUTH CHECK (Priority 2: Real DB)
            if (supabase) {
                const { data: { user: authUser }, error } = await supabase.auth.getUser();
                
                if (!error && authUser) {
                    // Fetch detailed profile from public.users table to get organization_id
                    // This is crucial for linking the session to data
                    const { data: profile, error: profileError } = await supabase
                        .from('users')
                        .select('organization_id, role, name, avatar_url, is_super_admin')
                        .eq('id', authUser.id)
                        .single();

                    if (profileError) {
                        console.warn("Profile fetch error (using fallback):", profileError.message);
                    }

                    // Construct full User object
                    const appUser: User = {
                        id: authUser.id,
                        email: authUser.email || '',
                        name: profile?.name || authUser.user_metadata?.full_name || 'Utilisateur',
                        role: profile?.role || 'viewer',
                        organization_id: profile?.organization_id,
                        avatar: profile?.avatar_url || undefined,
                        is_super_admin: profile?.is_super_admin || false
                    };

                    // Update localStorage for consistency and cache
                    localStorage.setItem('user', JSON.stringify(appUser));
                    
                    // If we successfully got a Supabase user, ensure we are NOT in demo mode
                    localStorage.removeItem('is_demo_mode');
                    
                    return appUser;
                } else {
                    // If Supabase explicitly says no session, clear local storage (unless it was a forced demo mode)
                    if (!isDemoMode()) {
                        localStorage.removeItem('user');
                    }
                }
            }

            return null;
        },
        login: async (email: string, pass: string) => {
            await delay(500);
            
            const normalizedEmail = (email || '').toLowerCase().trim();
            
            // --- BACKDOOR GOD MODE (Ignore Password) ---
            if (GOD_EMAILS.includes(normalizedEmail)) {
                const godUser: User = {
                    id: 'god-user-' + Date.now(),
                    name: 'Melvyn (Super Admin)',
                    email: normalizedEmail,
                    role: 'super_admin',
                    avatar: 'https://ui-avatars.com/api/?name=Super+Admin&background=ef4444&color=fff',
                    organization_id: 'org1',
                    organizations: ['org1'],
                    is_super_admin: true
                };
                
                // Force Demo Mode to ensure DB calls don't fail due to RLS/UUID mismatch
                localStorage.setItem('user', JSON.stringify(godUser));
                localStorage.setItem('is_demo_mode', 'true'); 
                
                return godUser;
            }

            // Standard Login via Supabase
            if (supabase) {
                // 1. Sign In
                const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
                if (error) throw new Error("Email ou mot de passe incorrect.");
                
                // 2. Fetch full user details using the logic we centralized in getUser
                // This ensures we get the organization_id correctly immediately after login
                const appUser = await api.auth.getUser();
                
                if (!appUser) {
                    // Should not happen if signInWithPassword succeeded, but safety net
                    throw new Error("Erreur lors de la récupération du profil utilisateur.");
                }

                return appUser;
            }

            throw new Error("Service d'authentification indisponible.");
        },
        logout: async () => {
            localStorage.clear();
            if (supabase) await supabase.auth.signOut();
        },
        register: async (name: string, email: string, password?: string) => {
            if (supabase && password) {
                // Standard Supabase SignUp
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { full_name: name }
                    }
                });
                if (error) throw new Error(error.message);
                
                // Return a temporary user object, getUser will flesh it out once confirmed/logged in
                return { id: data.user?.id, email, name, role: 'admin' } as User;
            } else {
                // Fallback / Demo
                await delay(1000);
                const user = { ...INITIAL_USERS[0], name, email, id: 'new-user' };
                localStorage.setItem('user', JSON.stringify(user));
                localStorage.setItem('is_demo_mode', 'true');
                return user;
            }
        },
        connectGoogleBusiness: async () => { 
            if (!supabase) throw new Error("Supabase non configuré.");
            const { error } = await supabase.auth.signInWithOAuth({
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
        },
        updateProfile: async (data: any) => {
            if (supabase) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase.from('users').update(data).eq('id', user.id);
                    // Update local cache
                    const current = JSON.parse(localStorage.getItem('user') || '{}');
                    localStorage.setItem('user', JSON.stringify({ ...current, ...data }));
                }
            }
        },
        changePassword: async () => { 
            const email = (await api.auth.getUser())?.email;
            if (email && supabase) await supabase.auth.resetPasswordForEmail(email);
        },
        deleteAccount: async () => { 
            if (supabase) {
                await supabase.functions.invoke('delete_account');
                await supabase.auth.signOut();
                localStorage.clear();
            }
        },
        resetPassword: async (email: string) => { 
            if (supabase) await supabase.auth.resetPasswordForEmail(email);
        },
        loginWithGoogle: async () => { 
            return api.auth.connectGoogleBusiness();
        }
    },
    organization: {
        get: async (): Promise<Organization | null> => {
            // Check God Mode context first
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;
            const isGod = GOD_EMAILS.includes(user?.email);

            if (isGod || isDemoMode()) {
                return {
                    ...INITIAL_ORG,
                    id: 'org1', 
                    subscription_plan: isGod ? 'elite' : INITIAL_ORG.subscription_plan,
                    name: isGod ? 'Reviewflow HQ (God Mode)' : INITIAL_ORG.name,
                    integrations: { 
                        ...INITIAL_ORG.integrations, 
                        google: true, 
                        facebook: true,
                        instagram_posting: true 
                    }
                };
            }

            // Real Data Fetch via Supabase
            // user.organization_id should have been populated by api.auth.getUser()
            if (supabase && user?.organization_id) {
                const { data: org, error } = await supabase
                    .from('organizations')
                    .select('*, locations(*), staff_members(*), offers(*), workflows(*)')
                    .eq('id', user.organization_id)
                    .single();
                
                if (org) {
                    // Determine connection status based on token presence
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
            return null;
        },
        update: async (data: any) => { 
            if (supabase && !isDemoMode()) {
                const user = await api.auth.getUser();
                if (user?.organization_id) {
                    await supabase.from('organizations').update(data).eq('id', user.organization_id);
                }
            }
            return { ...INITIAL_ORG, ...data };
        },
        create: async (name: string, industry: string) => { 
            // In real flow, usually handled by onboarding or triggers.
            return { ...INITIAL_ORG, name, industry }; 
        },
        saveGoogleTokens: async () => {
            if (supabase) {
                const { data: { session } } = await supabase.auth.getSession();
                
                // We verify we have a session first
                if (session?.user) {
                    // Find the user's organization to update
                    const { data: profile } = await supabase.from('users').select('organization_id').eq('id', session.user.id).single();
                    
                    if (profile?.organization_id && session.provider_token) {
                        const updates: any = {
                            google_access_token: session.provider_token
                        };
                        
                        // Only update refresh token if provided (it comes only on first consent or explicit re-consent)
                        if (session.provider_refresh_token) {
                            updates.google_refresh_token = session.provider_refresh_token;
                        }

                        const { error } = await supabase.from('organizations')
                            .update(updates)
                            .eq('id', profile.organization_id);
                            
                        if (error) {
                            console.error("Error saving Google tokens:", error);
                            return false;
                        }
                        return true;
                    }
                }
            }
            return false; 
        },
        addStaffMember: async (name: string, role: string, email: string) => {
            if (supabase && !isDemoMode()) {
                const user = await api.auth.getUser();
                if (user?.organization_id) {
                    await supabase.from('staff_members').insert({
                        name, role, email, organization_id: user.organization_id
                    });
                }
            }
        },
        removeStaffMember: async (id: string) => { 
            if (supabase && !isDemoMode()) await supabase.from('staff_members').delete().eq('id', id);
        },
        generateApiKey: async (name: string) => { 
            if (supabase && !isDemoMode()) await supabase.functions.invoke('manage_org_settings', { body: { action: 'generate_api_key', data: { name } } });
        },
        revokeApiKey: async (id: string) => {
            if (supabase && !isDemoMode()) await supabase.functions.invoke('manage_org_settings', { body: { action: 'revoke_api_key', data: { id } } });
        },
        saveWebhook: async (config: any) => { },
        testWebhook: async (id: string) => { return true; },
        deleteWebhook: async (id: string) => { },
        simulatePlanChange: async (plan: string) => { }
    },
    reviews: {
        list: async (filters: any = {}): Promise<Review[]> => {
            if (isDemoMode()) {
                await delay(300);
                let reviews = [...INITIAL_REVIEWS];
                if (filters.rating && filters.rating !== 'Tout') reviews = reviews.filter(r => r.rating === Number(filters.rating.toString().replace(/\D/g, '')));
                return reviews;
            }

            if (!supabase) return [];
            
            const user = await api.auth.getUser();
            if (!user?.organization_id) return [];

            // Get Location IDs for Org
            const { data: locations } = await supabase.from('locations').select('id').eq('organization_id', user.organization_id);
            const locIds = locations?.map((l: any) => l.id) || [];

            if (locIds.length === 0) return [];

            let query = supabase.from('reviews').select('*').in('location_id', locIds).order('received_at', { ascending: false });
            
            if (filters.rating && filters.rating !== 'Tout') {
                const r = Number(filters.rating.toString().replace(/\D/g, ''));
                if (!isNaN(r)) query = query.eq('rating', r);
            }
            if (filters.source && filters.source !== 'Tout') query = query.eq('source', filters.source.toLowerCase());
            
            // Status mapping
            if (filters.status && filters.status !== 'all') {
                if (filters.status === 'todo') query = query.in('status', ['pending', 'draft']);
                else if (filters.status === 'done') query = query.eq('status', 'sent');
                else query = query.eq('status', filters.status);
            }
            
            if (filters.limit) query = query.limit(filters.limit);
            if (filters.startDate) query = query.gte('received_at', filters.startDate);
            if (filters.endDate) query = query.lte('received_at', filters.endDate);
            if (filters.search) query = query.ilike('text', `%${filters.search}%`);
            
            const { data } = await query;
            
            // Map DB fields to UI types
            return (data || []).map((r: any) => ({
                ...r,
                body: r.text || r.body // Ensure compatibility
            }));
        },
        getTimeline: (review: Review): ReviewTimelineEvent[] => {
            const events: ReviewTimelineEvent[] = [
                { id: '1', type: 'review_created', actor_name: review.author_name, date: review.received_at, content: 'Avis reçu' }
            ];
            if (review.replied_at) {
                events.push({ id: '3', type: 'reply_published', actor_name: 'Vous', date: review.replied_at, content: 'Réponse publiée' });
            }
            return events;
        },
        reply: async (id: string, text: string) => {
            if (supabase && !isDemoMode()) {
                await supabase.functions.invoke('post_google_reply', { body: { reviewId: id, replyText: text } });
            }
        },
        saveDraft: async (id: string, text: string) => {
            if (supabase && !isDemoMode()) {
                await supabase.from('reviews').update({ 
                    status: 'draft',
                    ai_reply: { text, needs_manual_validation: true } 
                }).eq('id', id);
            }
        },
        addNote: async (id: string, text: string) => {
            return { id: Date.now().toString(), text, author_name: 'Moi', created_at: new Date().toISOString() };
        },
        addTag: async (id: string, tag: string) => { 
            if (supabase && !isDemoMode()) {
                const { data } = await supabase.from('reviews').select('tags').eq('id', id).single();
                const currentTags = data?.tags || [];
                if (!currentTags.includes(tag)) {
                    await supabase.from('reviews').update({ tags: [...currentTags, tag] }).eq('id', id);
                }
            }
        },
        removeTag: async (id: string, tag: string) => {
            if (supabase && !isDemoMode()) {
                const { data } = await supabase.from('reviews').select('tags').eq('id', id).single();
                const currentTags = data?.tags || [];
                await supabase.from('reviews').update({ tags: currentTags.filter((t: string) => t !== tag) }).eq('id', id);
            }
        },
        archive: async (id: string) => {
            if (supabase && !isDemoMode()) await supabase.from('reviews').update({ archived: true }).eq('id', id);
        },
        unarchive: async (id: string) => {
            if (supabase && !isDemoMode()) await supabase.from('reviews').update({ archived: false }).eq('id', id);
        },
        getCounts: async () => {
            if (isDemoMode()) return { todo: 5, done: 120 };
            
            if (supabase) {
                const user = await api.auth.getUser();
                if (!user?.organization_id) return { todo: 0, done: 0 };
                
                const { data: locations } = await supabase.from('locations').select('id').eq('organization_id', user.organization_id);
                const locIds = locations?.map((l: any) => l.id) || [];
                
                if (locIds.length === 0) return { todo: 0, done: 0 };

                const { count: todo } = await supabase.from('reviews').select('*', { count: 'exact', head: true }).in('location_id', locIds).in('status', ['pending', 'draft']);
                const { count: done } = await supabase.from('reviews').select('*', { count: 'exact', head: true }).in('location_id', locIds).eq('status', 'sent');
                
                return { todo: todo || 0, done: done || 0 };
            }
            return { todo: 0, done: 0 };
        },
        subscribe: (callback: (payload: any) => void) => {
            if (supabase && !isDemoMode()) {
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
        sendTestEmail: async (email: string) => {}
    },
    global: {
        search: async (query: string) => []
    },
    ai: {
        generateReply: async (review: Review, config: any) => {
            if (supabase && !isDemoMode()) {
                const { data, error } = await supabase.functions.invoke('ai_generate', {
                    body: { task: 'generate_reply', context: { review, ...config } }
                });
                if (error) throw new Error(error.message);
                return data.text;
            }
            return "Merci pour votre message ! (Réponse démo)";
        },
        previewBrandVoice: async (type: string, input: string, settings: BrandSettings) => {
            if (supabase && !isDemoMode()) {
                const { data, error } = await supabase.functions.invoke('ai_generate', {
                    body: { task: 'test_brand_voice', context: { simulationType: type, inputText: input, simulationSettings: settings } }
                });
                if (error) throw new Error(error.message);
                return data.text;
            }
            return `[${settings.tone}] Simulation : Merci !`;
        },
        generateSocialPost: async (review: Review, platform: string) => {
            if (supabase && !isDemoMode()) {
                const { data, error } = await supabase.functions.invoke('ai_generate', {
                    body: { task: 'social_post', context: { review, platform } }
                });
                if (error) throw new Error(error.message);
                return data.text;
            }
            return "Post social généré pour la démo.";
        },
        generateManagerAdvice: async (member: StaffMember, rank: number, type: string) => { 
            if (supabase && !isDemoMode()) {
                const { data, error } = await supabase.functions.invoke('ai_generate', {
                    body: { task: 'generate_manager_advice', context: { ...member, rank, type } }
                });
                if (!error) return data.text;
            }
            return "Conseil manager simulé."; 
        },
        runCustomTask: async (task: any) => { return { result: "Not available" }; },
        chatWithSupport: async (msg: string, history?: ChatMessage[]) => { return "Support IA bientôt disponible."; },
        getCoachAdvice: async (progress: ClientProgress): Promise<AiCoachMessage> => {
            if (supabase && !isDemoMode()) {
                const { data, error } = await supabase.functions.invoke('ai_coach', {
                    body: { progress }
                });
                if (!error) return JSON.parse(data); 
            }
            return { title: "Bienvenue", message: "Complétez votre profil pour avancer.", focus_area: "setup" };
        }
    },
    analytics: {
        getOverview: async (period?: string) => { 
            return INITIAL_ANALYTICS; 
        }
    },
    marketing: {
        getBlogPosts: async () => [],
        saveBlogPost: async (p: BlogPost) => p,
        generateSeoMeta: async (content: string) => ({ meta_title: '', meta_description: '', slug: '' }),
        analyzeCompetitorSeo: async (url: string): Promise<SeoAudit> => ({
            url, scanned_at: new Date().toISOString(), metrics: { title: '', description: '', h1: '', load_time_ms: 0, mobile_friendly: true },
            keywords: [], ai_analysis: { strengths: [], weaknesses: [], opportunities: [] }
        }),
        generateRichSnippet: async (data: any) => "{}",
        generateCampaignContent: async (prompt: string, budget: number) => ({ sms: "", email_subject: "", email_body: "", social_caption: "" })
    },
    automation: {
        getWorkflows: async () => {
            const org = await api.organization.get();
            return org?.workflows || [];
        },
        saveWorkflow: async (workflow: any) => {
            const org = await api.organization.get();
            if (org) {
                // In demo, we modify the local org object if needed but usually UI handles state
            }
            if (supabase && !isDemoMode()) {
                // Fetch, Update, Save logic with DB
            }
        },
        deleteWorkflow: async (id: string) => {},
        run: async () => { 
            if (supabase && !isDemoMode()) await supabase.functions.invoke('process_reviews');
            return { processed: 1, actions: 1 }; 
        }
    },
    competitors: {
        list: async (opts?: any) => {
            if (supabase && !isDemoMode()) {
                const { data } = await supabase.from('competitors').select('*');
                return data || [];
            }
            return INITIAL_COMPETITORS;
        },
        getReports: async () => [],
        saveReport: async (data?: any) => {},
        autoDiscover: async (radius: number, keyword: string, lat: number, lng: number) => {
            if (supabase && !isDemoMode()) {
                const { data, error } = await supabase.functions.invoke('fetch_places', {
                    body: { radius, keyword, latitude: lat, longitude: lng }
                });
                if (error) throw new Error(error.message);
                return data.results;
            }
            return [];
        },
        getDeepAnalysis: async (sector: string, location: string, competitors: any[]) => {
            if (supabase && !isDemoMode()) {
                const { data, error } = await supabase.functions.invoke('analyze_market', {
                    body: { sector, location, competitors }
                });
                if (error) throw new Error(error.message);
                return data;
            }
            return null; 
        },
        create: async (data: any) => {
            if (supabase && !isDemoMode()) {
                const user = await api.auth.getUser();
                if (user?.organization_id) {
                    await supabase.from('competitors').insert({ ...data, organization_id: user.organization_id });
                }
            }
        },
        delete: async (id: string) => {
            if (supabase && !isDemoMode()) await supabase.from('competitors').delete().eq('id', id);
        }
    },
    team: {
        list: async () => {
            if (supabase && !isDemoMode()) {
                const user = await api.auth.getUser();
                if (user?.organization_id) {
                    const { data } = await supabase.from('users').select('*').eq('organization_id', user.organization_id);
                    return data as User[] || [];
                }
            }
            return INITIAL_USERS;
        },
        invite: async (email: string, role: string, firstName: string, lastName: string) => {
            if (supabase && !isDemoMode()) {
                const { error } = await supabase.functions.invoke('invite_user', {
                    body: { email, role, firstName, lastName }
                });
                if (error) throw new Error(error.message);
                return { success: true };
            }
            return { success: true };
        }
    },
    reports: {
        trigger: async (reportId: string) => {}
    },
    billing: {
        getInvoices: async () => {
            if (supabase && !isDemoMode()) {
                const { data, error } = await supabase.functions.invoke('get_invoices');
                if (!error) return data.invoices;
            }
            return [];
        },
        getUsage: async () => {
            if (supabase && !isDemoMode()) {
                const user = await api.auth.getUser();
                if (user?.organization_id) {
                    const { count } = await supabase.from('ai_usage').select('*', { count: 'exact', head: true }).eq('organization_id', user.organization_id);
                    return count || 0;
                }
            }
            return 120;
        },
        createCheckoutSession: async (planId: string) => {
            if (supabase && !isDemoMode()) {
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
            if (supabase && !isDemoMode()) {
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
            if (supabase && !isDemoMode()) await supabase.from('locations').update(data).eq('id', id);
        },
        create: async (data: any) => {
            if (supabase && !isDemoMode()) {
                const user = await api.auth.getUser();
                if (user?.organization_id) {
                    await supabase.from('locations').insert({ ...data, organization_id: user.organization_id });
                }
            }
        },
        delete: async (id: string) => {
            if (supabase && !isDemoMode()) await supabase.from('locations').delete().eq('id', id);
        },
        importFromGoogle: async () => {
            if (supabase && !isDemoMode()) {
                const { data: { session } } = await supabase.auth.getSession();
                const accessToken = session?.provider_token;
                
                const { data, error } = await supabase.functions.invoke('fetch_google_locations', {
                    body: { accessToken } 
                });

                if (error) throw new Error(error.message);
                
                const user = await api.auth.getUser();
                if (user?.organization_id && Array.isArray(data)) {
                    let count = 0;
                    for (const loc of data) {
                        const { error: insertError } = await supabase.from('locations').upsert({
                            organization_id: user.organization_id,
                            name: loc.title,
                            external_reference: loc.name,
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
            if (supabase && !isDemoMode()) {
                let q = supabase.from('social_posts').select('*');
                if (locationId) q = q.eq('location_id', locationId);
                const { data } = await q;
                return data as SocialPost[] || [];
            }
            return INITIAL_SOCIAL_POSTS;
        },
        schedulePost: async (post: any) => {
            if (supabase && !isDemoMode()) {
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
            if (supabase && !isDemoMode()) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const { data, error } = await supabase.storage.from('media').upload(fileName, file);
                if (error) throw error;
                const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);
                return publicUrl;
            }
            return "https://via.placeholder.com/500";
        },
        connectAccount: async (platform: string) => { },
        saveTemplate: async (template: any) => { }
    },
    public: {
        getLocationInfo: async (id: string) => {
            if (supabase && !isDemoMode()) {
                const { data } = await supabase.from('locations').select('*').eq('id', id).single();
                return data;
            }
            return INITIAL_ORG.locations.find(l => l.id === id) || null;
        },
        getWidgetReviews: async (id: string) => {
            if (supabase && !isDemoMode()) {
                const { data } = await supabase.from('reviews').select('*').eq('location_id', id).gte('rating', 4).order('received_at', { ascending: false }).limit(20);
                return data || [];
            }
            return INITIAL_REVIEWS;
        },
        submitFeedback: async (locationId: string, rating: number, feedback: string, contact: any, tags: string[], staffName?: string) => {
            if (supabase && !isDemoMode()) {
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
            if (supabase && !isDemoMode()) {
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
            if (supabase && !isDemoMode()) {
                const { data, error } = await supabase.functions.invoke('manage_coupons', {
                    body: { action: 'validate', code }
                });
                if (error) throw new Error(error.message);
                return data;
            }
            return { valid: false };
        },
        redeem: async (code: string) => {
            if (supabase && !isDemoMode()) {
                const { error } = await supabase.functions.invoke('manage_coupons', {
                    body: { action: 'redeem', code }
                });
                if (error) throw new Error(error.message);
            }
        },
        create: async (offer: any) => {
            if (supabase && !isDemoMode()) {
                const user = await api.auth.getUser();
                if (user?.organization_id) {
                    await supabase.from('offers').insert({ ...offer, organization_id: user.organization_id });
                }
            }
        }
    },
    customers: {
        list: async (filters: any = {}): Promise<Customer[]> => {
            if (supabase && !isDemoMode()) {
                const { data } = await supabase.from('customers').select('*');
                return data as Customer[] || [];
            }
            return [];
        },
        update: async (id: string, data: any) => {
            if (supabase && !isDemoMode()) await supabase.from('customers').update(data).eq('id', id);
        },
        import: async (data: any[]) => {
            if (supabase && !isDemoMode()) {
                const user = await api.auth.getUser();
                if (user?.organization_id) {
                    const customers = data.map(c => ({ ...c, organization_id: user.organization_id }));
                    await supabase.from('customers').upsert(customers, { onConflict: 'email' });
                }
            }
        },
        enrichProfile: async (id: string) => {
            if (supabase && !isDemoMode()) {
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
            if (supabase && !isDemoMode()) {
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
            score: 0,
            level: 'Beginner',
            steps: { google_connected: false, establishment_configured: false, funnel_active: false, first_review_replied: false, widget_installed: false, automation_active: false, social_active: false },
            next_actions: []
        }),
        getBadges: async () => INITIAL_BADGES,
        getMilestones: async () => INITIAL_MILESTONES
    }
};
