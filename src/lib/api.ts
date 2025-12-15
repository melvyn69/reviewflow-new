import { supabase } from './supabase';
import { 
    User, Organization, Review, Competitor, SocialPost, 
    ReviewTimelineEvent, BrandSettings, ClientProgress, 
    AiCoachMessage, BlogPost, SeoAudit, AppNotification, AnalyticsSummary,
    StaffMember, ChatMessage
} from '../types';
import { GoogleGenAI } from "@google/genai";
import { INITIAL_ANALYTICS, INITIAL_ORG } from './db';

const apiKey = import.meta.env.VITE_API_KEY || '';
const aiClient = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Mock data or empty structures if needed
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
    auth: {
        getUser: async (): Promise<User | null> => {
            if (!supabase) return null;
            const { data: { session }, error: sessionError } = await (supabase.auth as any).getSession();
            if (sessionError || !session?.user) return null;

            const authUser = session.user;
            const { data: profile, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', authUser.id)
                .single();

            if (error || !profile) {
                return {
                    id: authUser.id,
                    email: authUser.email || '',
                    name: authUser.user_metadata?.full_name || 'Utilisateur',
                    role: 'admin',
                    organization_id: undefined
                };
            }

            return {
                id: profile.id,
                email: profile.email,
                name: profile.name,
                role: profile.role,
                organization_id: profile.organization_id,
                avatar: profile.avatar_url,
                is_super_admin: profile.is_super_admin || false
            };
        },
        login: async (email: string, pass: string) => {
            if (!supabase) throw new Error("Supabase non configuré");
            const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
            if (error) throw error;
        },
        register: async (name: string, email: string, password: string) => {
            if (!supabase) throw new Error("Supabase non configuré");
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { full_name: name } }
            });
            if (error) throw error;
        },
        logout: async () => {
            if (supabase) await supabase.auth.signOut();
            localStorage.clear();
        },
        connectGoogleBusiness: async () => {
            console.log(window.location.origin);
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    scopes: 'https://www.googleapis.com/auth/business.manage',
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                    redirectTo: `${window.location.origin}/#/settings?tab=integrations`,
                },
            });
            if (error) throw error;
        },
        handleGoogleCallback: async (code: string) => {
            if (!supabase) throw new Error("Supabase non configuré");
            // Appel à l'Edge Function pour échanger le code contre les tokens
            const { data, error } = await supabase.functions.invoke('social_oauth', {
                body: {
                    action: 'exchange',
                    platform: 'google',
                    code,
                    redirectUri: window.location.origin + '/auth/callback'
                }
            });
            if (error) throw error;
            return data;
        },
        disconnectGoogle: async () => {
            if (!supabase) return;
            const user = await api.auth.getUser();
            if (user?.organization_id) {
                await supabase.from('social_accounts')
                    .delete()
                    .eq('organization_id', user.organization_id)
                    .eq('platform', 'google');
            }
        },
        updateProfile: async (data: Partial<User>) => {
            if (!supabase) return;
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('users').update(data).eq('id', user.id);
            }
        },
        changePassword: async () => {
             if (supabase) {
                 const { data: { user } } = await supabase.auth.getUser();
                 if(user?.email) await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: window.location.origin + '/#/settings' });
             }
        },
        deleteAccount: async () => { if(supabase) await supabase.functions.invoke('delete_account'); },
        resetPassword: async (email: string) => { if(supabase) await supabase.auth.resetPasswordForEmail(email); }
    },

    organization: {
        get: async (): Promise<Organization | null> => {
            const user = await api.auth.getUser();
            if (!supabase || !user?.organization_id) return null;

            const { data, error } = await supabase
                .from('organizations')
                .select('*, locations(*), staff_members(*), offers(*), workflows(*)')
                .eq('id', user.organization_id)
                .single();

            if (error) return null;

            // Check connection status via social_accounts table
            const { data: googleAccount } = await supabase
                .from('social_accounts')
                .select('id')
                .eq('organization_id', user.organization_id)
                .eq('platform', 'google')
                .maybeSingle();

            return {
                ...data,
                integrations: {
                    ...data.integrations,
                    google: !!googleAccount // True if row exists
                }
            };
        },
        create: async (name: string, industry: string) => {
            if(supabase) { 
                const u = await api.auth.getUser();
                if(u) {
                    const {data} = await supabase.from('organizations').insert({name, industry, subscription_plan: 'free'}).select().single();
                    if(data) await supabase.from('users').update({organization_id: data.id}).eq('id', u.id);
                    return data;
                }
            }
            return INITIAL_ORG; 
        },
        update: async (data: any) => { if(supabase) { const u = await api.auth.getUser(); if(u?.organization_id) await supabase.from('organizations').update(data).eq('id', u.organization_id); } },
        saveGoogleTokens: async () => {
            // Legacy / unused for custom flow, keeping simple return
            return true; 
        },
        addStaffMember: async (name: string, role: string, email: string) => { 
            if(supabase) { 
                const u = await api.auth.getUser(); 
                if(u?.organization_id) await supabase.from('staff_members').insert({name, role, email, organization_id: u.organization_id}); 
            } 
        },
        removeStaffMember: async (id: string) => { if(supabase) await supabase.from('staff_members').delete().eq('id', id); },
        generateApiKey: async (name: string) => { if(supabase) await supabase.functions.invoke('manage_org_settings', { body: { action: 'generate_api_key', data: { name } } }); },
        revokeApiKey: async (id: string) => { if(supabase) await supabase.functions.invoke('manage_org_settings', { body: { action: 'revoke_api_key', data: { id } } }); },
        saveWebhook: async (config: any) => { if(supabase) await supabase.functions.invoke('manage_org_settings', { body: { action: 'save_webhook', data: config } }); },
        testWebhook: async (id: string) => true,
        deleteWebhook: async (id: string) => { if(supabase) await supabase.functions.invoke('manage_org_settings', { body: { action: 'delete_webhook', data: { id } } }); },
        simulatePlanChange: async (plan: string) => {}
    },

    locations: {
        create: async (data: any) => { if(supabase) { const u = await api.auth.getUser(); if(u?.organization_id) await supabase.from('locations').insert({...data, organization_id: u.organization_id}); } },
        update: async (id: string, data: any) => { if(supabase) await supabase.from('locations').update(data).eq('id', id); },
        delete: async (id: string) => { if(supabase) await supabase.from('locations').delete().eq('id', id); },
        importFromGoogle: async () => {
            if (supabase) {
                // Trigger import function which uses social_accounts tokens
                const { data, error } = await supabase.functions.invoke('fetch_google_locations');
                if (error) throw error;
                // If it returns a count, return it, otherwise assume array length
                return typeof data === 'number' ? data : (data?.length || 0);
            }
            return 0;
        }
    },

    notifications: {
        list: async (): Promise<AppNotification[]> => {
            return [];
        },
        markAllRead: async () => {},
        sendTestEmail: async (email: string) => {}
    },

    global: {
        search: async (query: string) => {
            return [];
        }
    },

    reviews: {
        list: async (filters: any = {}): Promise<Review[]> => {
            if(!supabase) return [];
            const u = await api.auth.getUser();
            if(!u?.organization_id) return [];
            
            let query = supabase.from('reviews').select('*').order('received_at', {ascending: false});
            
            const { data: locs } = await supabase.from('locations').select('id').eq('organization_id', u.organization_id);
            if(!locs?.length) return [];
            
            query = query.in('location_id', locs.map(l=>l.id));
            
            if (filters.limit) query = query.limit(filters.limit);
            if (filters.rating) query = query.eq('rating', filters.rating);
            if (filters.startDate) query = query.gte('received_at', filters.startDate);
            if (filters.endDate) query = query.lte('received_at', filters.endDate);
            
            const { data } = await query;
            return (data || []).map((r: any) => ({...r, body: r.text || r.body}));
        },
        getCounts: async () => ({ todo: 0, done: 0 }),
        getTimeline: (review: Review) => [],
        reply: async (id: string, text: string) => { if(supabase) await supabase.functions.invoke('post_google_reply', {body: {reviewId: id, replyText: text}}); },
        saveDraft: async (id: string, text: string) => {
             if(supabase) await supabase.from('reviews').update({ 
                 ai_reply: { text, needs_manual_validation: true, created_at: new Date().toISOString() },
                 status: 'draft' 
             }).eq('id', id);
        },
        addNote: async (id: string, text: string) => {
            return { id: '1', text, author_name: 'Moi', created_at: new Date().toISOString() };
        },
        addTag: async (id: string, tag: string) => {},
        removeTag: async (id: string, tag: string) => {},
        archive: async (id: string) => {},
        unarchive: async (id: string) => {},
        subscribe: (cb: any) => { 
            const sub = supabase?.channel('reviews_changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, cb)
                .subscribe();
            return { unsubscribe: () => sub?.unsubscribe() };
        },
        uploadCsv: async (f: any) => 0
    },

    ai: {
        generateReply: async (review: Review, config: any) => {
            if(supabase) { 
                const { data } = await supabase.functions.invoke('ai_generate', {body: {task: 'generate_reply', context: {review, ...config}}}); 
                return data?.text || "Réponse IA générée."; 
            }
            return "Réponse simulée (Supabase non connecté)";
        },
        generateSocialPost: async (review: any, platform: string) => "Super avis client ! 🌟 #Review",
        previewBrandVoice: async (type: string, input: string, settings: BrandSettings) => "Ceci est un test de voix de marque.",
        generateManagerAdvice: async (member: StaffMember, rank: number, type: string) => "Continuez comme ça !",
        runCustomTask: async (task: any) => ({ result: "ok" }),
        chatWithSupport: async (msg: string, history?: ChatMessage[]) => "Je suis l'assistant support.",
        getCoachAdvice: async (progress: ClientProgress): Promise<AiCoachMessage> => {
             if (supabase) {
                 const { data } = await supabase.functions.invoke('ai_coach', { body: { progress } });
                 return data || { title: "Bienvenue", message: "Complétez votre profil.", focus_area: "setup" };
             }
             return { title: "Bienvenue", message: "Complétez votre profil.", focus_area: "setup" };
        }
    },

    analytics: { 
        getOverview: async (period?: string) => INITIAL_ANALYTICS 
    },

    competitors: {
        list: async () => [], 
        create: async (data: any) => {}, 
        delete: async (id: string) => {},
        getReports: async () => [], 
        saveReport: async (data?: any) => {}, 
        autoDiscover: async (radius: number, keyword: string, lat: number, lng: number) => {
             if(supabase) {
                 const { data, error } = await supabase.functions.invoke('fetch_places', { body: { radius, keyword, latitude: lat, longitude: lng } });
                 if(error) throw error;
                 return data?.results || [];
             }
             return [];
        }, 
        getDeepAnalysis: async (industry: string, location: string, competitors: any[]) => {
             if(supabase) {
                 const { data } = await supabase.functions.invoke('analyze_market', { body: { industry, location, competitors } });
                 return data;
             }
             return null;
        }
    },

    social: {
        getPosts: async (locationId?: string) => [], 
        schedulePost: async (post: any) => { if(supabase) await supabase.from('social_posts').insert(post); }, 
        uploadMedia: async (file: File) => {
            if (!supabase) return "https://via.placeholder.com/500";
            const fileName = `${Date.now()}-${file.name}`;
            const { data, error } = await supabase.storage.from('media').upload(fileName, file);
            if (error) throw error;
            const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);
            return publicUrl;
        }, 
        connectAccount: async (platform: string) => {}, 
        saveTemplate: async (template: any) => {}
    },

    marketing: {
        getBlogPosts: async () => [], 
        saveBlogPost: async (post: any) => {}, 
        generateSeoMeta: async (content: string) => ({}), 
        analyzeCompetitorSeo: async (url: string): Promise<SeoAudit> => ({ url, scanned_at: new Date().toISOString(), metrics: { title: 'Audit', description: '', h1: '', load_time_ms: 200, mobile_friendly: true }, keywords: [], ai_analysis: { strengths: [], weaknesses: [], opportunities: [] } }), 
        generateRichSnippet: async (data: any) => "", 
        generateCampaignContent: async (prompt: string, budget: number) => ({ sms: "", email_subject: "", email_body: "", social_caption: "" })
    },

    automation: {
        getWorkflows: async () => [], 
        saveWorkflow: async (workflow: any) => {}, 
        deleteWorkflow: async (id: string) => {}, 
        run: async () => ({ processed: 0, actions: 0 })
    },

    team: {
        list: async () => {
            const user = await api.auth.getUser();
            if (!supabase || !user?.organization_id) return [];
            const { data } = await supabase.from('users').select('*').eq('organization_id', user.organization_id);
            return data || [];
        }, 
        invite: async (email: string, role: string, firstName: string, lastName: string) => {
             if(supabase) await supabase.functions.invoke('invite_user', { body: { email, role, firstName, lastName } });
             return { success: true };
        }
    },

    reports: { 
        trigger: async (id: string) => {} 
    },

    billing: { 
        getInvoices: async () => {
             if(supabase) {
                 const { data } = await supabase.functions.invoke('get_invoices');
                 return data?.invoices || [];
             }
             return [];
        }, 
        getUsage: async () => 0, 
        createCheckoutSession: async (planId: string) => {
             if(supabase) {
                 const { data } = await supabase.functions.invoke('create_checkout', { body: { plan: planId, successUrl: window.location.href + '?success=true', cancelUrl: window.location.href } });
                 return data?.url;
             }
             return "";
        }, 
        createPortalSession: async () => {
             if(supabase) {
                 const { data } = await supabase.functions.invoke('create_portal', { body: { returnUrl: window.location.href } });
                 return data?.url;
             }
             return "";
        } 
    },

    activity: { getRecent: async () => [] },
    
    onboarding: { checkStatus: async () => ({ completionPercentage: 0 } as any) },
    
    seedCloudDatabase: async () => {},
    
    public: { 
        getLocationInfo: async (id: string) => {
            if (!supabase) return null;
            const { data } = await supabase.from('locations').select('*').eq('id', id).single();
            return data;
        }, 
        getWidgetReviews: async (id: string) => {
            if (!supabase) return [];
            const { data } = await supabase.from('reviews').select('*').eq('location_id', id).eq('rating', 5).limit(10); // Only 5 stars for widget
            return data || [];
        }, 
        submitFeedback: async (locationId: string, rating: number, feedback: string, contact: any, tags: string[], staffName?: string) => {
            if(supabase) await supabase.functions.invoke('submit_review', { body: { locationId, rating, feedback, contact, tags, staffName } });
        } 
    },
    
    widgets: { requestIntegration: async (data: any) => {} },
    
    campaigns: { 
        send: async (channel: 'sms'|'email', recipient: string, subject: string, message: string, segment: string, link?: string) => {}, 
        getHistory: async () => [] 
    },
    
    offers: { 
        validate: async (code: string) => {
             if(supabase) {
                 const { data } = await supabase.functions.invoke('manage_coupons', { body: { action: 'validate', code } });
                 return data;
             }
             return { valid: false };
        }, 
        redeem: async (code: string) => {
             if(supabase) await supabase.functions.invoke('manage_coupons', { body: { action: 'redeem', code } });
        }, 
        create: async (offer: any) => {
             if(supabase) {
                 const user = await api.auth.getUser();
                 if(user?.organization_id) await supabase.from('offers').insert({ ...offer, organization_id: user.organization_id });
             }
        } 
    },
    
    customers: { 
        list: async () => {
            if(!supabase) return [];
            const user = await api.auth.getUser();
            if(!user?.organization_id) return [];
            const { data } = await supabase.from('customers').select('*').eq('organization_id', user.organization_id);
            return data || [];
        }, 
        update: async (id: string, data: any) => {
            if(supabase) await supabase.from('customers').update(data).eq('id', id);
        }, 
        import: async (data: any[]) => {}, 
        enrichProfile: async (id: string) => ({ profile: "Profil IA", suggestion: "Suggestion IA" }) 
    },
    
    system: { checkHealth: async () => ({ db: true, latency: 0 }) },
    
    admin: { getStats: async () => ({}) as any },
    
    google: { fetchAllGoogleLocations: async () => [], syncReviewsForLocation: async () => 0 },
    
    company: { search: async (query: string) => [] },
    
    support: { 
        sendTicket: async (form: any) => {
             if(supabase) await supabase.functions.invoke('send_support_ticket', { body: form });
        }, 
        getTutorials: async () => [] 
    },
    
    progression: { 
        get: async () => ({ score: 50, level: 'Pro', steps: {}, next_actions: [] } as any), 
        getBadges: async () => [], 
        getMilestones: async () => [] 
    }
};