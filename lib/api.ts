
import { supabase } from './supabase';
import { 
    INITIAL_USERS, INITIAL_ORG, INITIAL_REVIEWS, INITIAL_ANALYTICS, 
    INITIAL_COMPETITORS, INITIAL_WORKFLOWS, INITIAL_REPORTS, INITIAL_SOCIAL_POSTS 
} from './db';
import { 
    User, Organization, Review, AnalyticsSummary, Competitor, 
    SocialPost, WorkflowRule, ReportConfig, Customer, Offer, 
    StaffMember, CampaignLog, AppNotification, SocialTemplate, BillingInvoice
} from '../types';

const isDemoMode = () => !supabase || localStorage.getItem('is_demo_mode') === 'true';

export const api = {
    auth: {
        getUser: async (): Promise<User | null> => {
            if (isDemoMode()) {
                const stored = localStorage.getItem('demo_user');
                return stored ? JSON.parse(stored) : null;
            }
            const { data: { user } } = await supabase!.auth.getUser();
            if (!user) return null;
            
            const { data: profile } = await supabase!.from('users').select('*').eq('id', user.id).single();
            return profile as User;
        },
        login: async (email: string, pass: string) => {
            // Bypass pour le développement ou la démo
            if (
                (email === 'demo@reviewflow.com' && pass === 'demo') || 
                (email === 'admin@admin.com' && pass === 'password') ||
                (email === 'melvynbenichou@gmail.com' && pass === 'password')
            ) {
                localStorage.setItem('is_demo_mode', 'true');
                // On utilise l'utilisateur mocké défini dans db.ts
                localStorage.setItem('demo_user', JSON.stringify(INITIAL_USERS[0]));
                return INITIAL_USERS[0];
            }

            if (!supabase) throw new Error("Supabase non configuré");
            const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
            if (error) throw error;
        },
        logout: async () => {
            if (isDemoMode()) {
                localStorage.removeItem('demo_user');
                localStorage.removeItem('is_demo_mode');
                return;
            }
            await supabase!.auth.signOut();
        },
        register: async (name: string, email: string, pass: string) => {
             if (!supabase) throw new Error("Supabase non configuré");
             const { data, error } = await supabase.auth.signUp({ 
                 email, 
                 password: pass,
                 options: { data: { name } }
             });
             if (error) throw error;
        },
        resetPassword: async (email: string) => {
            if (isDemoMode()) return;
            await supabase!.auth.resetPasswordForEmail(email);
        },
        updateProfile: async (updates: Partial<User> & { password?: string }) => {
            if (isDemoMode()) {
                const current = JSON.parse(localStorage.getItem('demo_user') || '{}');
                localStorage.setItem('demo_user', JSON.stringify({ ...current, ...updates }));
                return;
            }
            const { data: { user } } = await supabase!.auth.getUser();
            if (user) {
                if (updates.password) {
                    await supabase!.auth.updateUser({ password: updates.password });
                    delete updates.password;
                }
                await supabase!.from('users').update(updates).eq('id', user.id);
            }
        },
        deleteAccount: async () => {
            if (isDemoMode()) return;
            await supabase!.functions.invoke('delete_account');
        },
        loginWithGoogle: async () => {
            if (!supabase) throw new Error("Supabase non configuré");
            await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + '/dashboard',
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                }
            });
        },
        connectGoogleBusiness: async () => {
             if (!supabase) return;
             await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    scopes: 'https://www.googleapis.com/auth/business.manage',
                    redirectTo: window.location.origin + '/settings?tab=integrations',
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                }
            });
        }
    },
    google: {
        fetchAllGoogleLocations: async () => {
            if (isDemoMode()) return [
                { name: 'locations/12345', title: 'Brasserie des Arts (Imported)', storeCode: 'BDA-01', address: '15 Avenue Montaigne, Paris' }
            ];
            const org = await api.organization.get();
            if (!org?.google_access_token) throw new Error("Google non connecté");
            
            const { data, error } = await supabase!.functions.invoke('fetch_google_locations', {
                body: { accessToken: org.google_access_token }
            });
            if (error) throw error;
            return data;
        },
        syncReviewsForLocation: async (locationId: string, resourceName: string) => {
            if (isDemoMode()) return 5;
            const org = await api.organization.get();
            const { data, error } = await supabase!.functions.invoke('fetch_google_reviews', {
                body: {
                    locationId,
                    googleLocationName: resourceName,
                    organizationId: org?.id
                }
            });
            if (error) throw error;
            return data.count;
        }
    },
    organization: {
        get: async (): Promise<Organization | null> => {
            if (isDemoMode()) return INITIAL_ORG;
            const { data: { user } } = await supabase!.auth.getUser();
            if (!user) return null;
            const { data: profile } = await supabase!.from('users').select('organization_id').eq('id', user.id).single();
            if (!profile?.organization_id) return null;
            
            const { data } = await supabase!.from('organizations')
                .select('*, locations(*), staff_members(*), workflows(*), offers(*)')
                .eq('id', profile.organization_id)
                .single();
            return data;
        },
        create: async (name: string, industry: string) => {
            if (isDemoMode()) return INITIAL_ORG;
            const { data: { user } } = await supabase!.auth.getUser();
            if (!user) throw new Error("Not authenticated");
            
            const { data: org, error } = await supabase!.from('organizations').insert({
                name, 
                industry,
                subscription_plan: 'free',
                owner_id: user.id
            }).select().single();
            
            if (error) throw error;
            
            await supabase!.from('users').update({ organization_id: org.id, role: 'admin' }).eq('id', user.id);
            return org;
        },
        update: async (updates: Partial<Organization>) => {
            if (isDemoMode()) return;
            const org = await api.organization.get();
            if (org) {
                await supabase!.from('organizations').update(updates).eq('id', org.id);
            }
        },
        generateApiKey: async (name: string) => {
            if (isDemoMode()) return "sk_demo_123";
            await supabase!.functions.invoke('manage_org_settings', { body: { action: 'generate_api_key', data: { name } } });
        },
        revokeApiKey: async (id: string) => {
            if (isDemoMode()) return;
            await supabase!.functions.invoke('manage_org_settings', { body: { action: 'revoke_api_key', data: { id } } });
        },
        saveWebhook: async (url: string, events: string[]) => {
            if (isDemoMode()) return;
            await supabase!.functions.invoke('manage_org_settings', { body: { action: 'save_webhook', data: { url, events } } });
        },
        testWebhook: async (id: string) => {
            return true;
        },
        deleteWebhook: async (id: string) => {
            if (isDemoMode()) return;
            await supabase!.functions.invoke('manage_org_settings', { body: { action: 'delete_webhook', data: { id } } });
        },
        simulatePlanChange: async (plan: string) => {
            if (isDemoMode()) return;
            const org = await api.organization.get();
            if (org) await supabase!.from('organizations').update({ subscription_plan: plan }).eq('id', org.id);
        },
        addStaffMember: async (name: string, role: string, email: string) => {
            if (isDemoMode()) return;
            const org = await api.organization.get();
            await supabase!.from('staff_members').insert({
                name, role, email, organization_id: org?.id, reviews_count: 0, average_rating: 0
            });
        },
        removeStaffMember: async (id: string) => {
            if (isDemoMode()) return;
            await supabase!.from('staff_members').delete().eq('id', id);
        },
        saveGoogleTokens: async () => {
            if (isDemoMode()) return false;
            const { data: { session } } = await supabase!.auth.getSession();
            if (session?.provider_token) {
                const user = await api.auth.getUser();
                if (user?.organization_id) {
                    await supabase!.from('organizations').update({
                        google_access_token: session.provider_token,
                        google_refresh_token: session.provider_refresh_token
                    }).eq('id', user.organization_id);
                    return true;
                }
            }
            return false;
        }
    },
    locations: {
        create: async (data: any) => {
            if (isDemoMode()) return;
            const org = await api.organization.get();
            await supabase!.from('locations').insert({ ...data, organization_id: org?.id });
        },
        update: async (id: string, data: any) => {
            if (isDemoMode()) return;
            await supabase!.from('locations').update(data).eq('id', id);
        },
        delete: async (id: string) => {
            if (isDemoMode()) return;
            await supabase!.from('locations').delete().eq('id', id);
        },
        importFromGoogle: async () => {
            if (isDemoMode()) return 0;
            const org = await api.organization.get();
            if (!org?.google_access_token) throw new Error("Google non connecté");
            
            const { data, error } = await supabase!.functions.invoke('fetch_google_locations', {
                body: { accessToken: org.google_access_token }
            });
            
            if (error) throw error;
            
            let count = 0;
            for (const loc of data) {
                const { error: insertError } = await supabase!.from('locations').upsert({
                    organization_id: org.id,
                    name: loc.title,
                    address: loc.address,
                    city: 'Importé',
                    country: 'France',
                    external_reference: loc.name
                }, { onConflict: 'external_reference' });
                if (!insertError) count++;
            }
            return count;
        }
    },
    reports: {
        trigger: async (reportId: string) => {
            if (isDemoMode()) return;
            await supabase!.functions.invoke('send_scheduled_reports', {
                body: { forceReportId: reportId }
            });
        }
    },
    reviews: {
        list: async (filters: any): Promise<Review[]> => {
            if (isDemoMode()) return INITIAL_REVIEWS;
            
            let query = supabase!.from('reviews').select('*');
            
            if (filters.status && filters.status !== 'all') {
                if (filters.status === 'todo') query = query.in('status', ['pending', 'draft']);
                else if (filters.status === 'done') query = query.eq('status', 'sent');
                else query = query.eq('status', filters.status);
            }
            
            if (filters.rating && filters.rating !== 'Tout') {
                const r = parseInt(filters.rating);
                if (!isNaN(r)) query = query.eq('rating', r);
            }
            
            if (filters.source && filters.source !== 'Tout') {
                query = query.eq('source', filters.source.toLowerCase());
            }

            if (filters.limit) query = query.limit(filters.limit);
            if (filters.page) query = query.range(filters.page * (filters.limit || 20), (filters.page + 1) * (filters.limit || 20) - 1);
            
            if (filters.startDate) query = query.gte('received_at', filters.startDate);
            if (filters.endDate) query = query.lte('received_at', filters.endDate);

            const { data, error } = await query.order('received_at', { ascending: false });
            if (error) throw error;
            return data as Review[];
        },
        reply: async (reviewId: string, text: string) => {
            if (isDemoMode()) return;
            await supabase!.functions.invoke('post_google_reply', {
                body: { reviewId, replyText: text }
            });
        },
        saveDraft: async (reviewId: string, text: string) => {
            if (isDemoMode()) return;
            await supabase!.from('reviews').update({ 
                status: 'draft', 
                ai_reply: { text, needs_manual_validation: false }
            }).eq('id', reviewId);
        },
        addNote: async (reviewId: string, text: string) => {
            if (isDemoMode()) return { id: 'n1', text, author_name: 'Moi', created_at: new Date().toISOString() };
            const { data: review } = await supabase!.from('reviews').select('internal_notes').eq('id', reviewId).single();
            const notes = review?.internal_notes || [];
            const newNote = { id: crypto.randomUUID(), text, author_name: 'Moi', created_at: new Date().toISOString() };
            await supabase!.from('reviews').update({ internal_notes: [...notes, newNote] }).eq('id', reviewId);
            return newNote;
        },
        addTag: async (reviewId: string, tag: string) => {
            if (isDemoMode()) return;
            const { data: review } = await supabase!.from('reviews').select('tags').eq('id', reviewId).single();
            const tags = review?.tags || [];
            if (!tags.includes(tag)) {
                await supabase!.from('reviews').update({ tags: [...tags, tag] }).eq('id', reviewId);
            }
        },
        removeTag: async (reviewId: string, tag: string) => {
            if (isDemoMode()) return;
            const { data: review } = await supabase!.from('reviews').select('tags').eq('id', reviewId).single();
            const tags = review?.tags || [];
            await supabase!.from('reviews').update({ tags: tags.filter((t: string) => t !== tag) }).eq('id', reviewId);
        },
        archive: async (reviewId: string) => {
            if (isDemoMode()) return;
            await supabase!.from('reviews').update({ archived: true }).eq('id', reviewId);
        },
        unarchive: async (reviewId: string) => {
            if (isDemoMode()) return;
            await supabase!.from('reviews').update({ archived: false }).eq('id', reviewId);
        },
        getTimeline: (review: Review) => {
            const events = [];
            events.push({ id: '1', type: 'review_created', actor_name: review.author_name, date: review.received_at, content: 'Avis reçu' });
            if (review.ai_reply) events.push({ id: '2', type: 'ai_analysis', actor_name: 'Reviewflow AI', date: review.ai_reply.created_at, content: 'Analyse & Brouillon' });
            if (review.internal_notes) {
                review.internal_notes.forEach(n => events.push({ id: n.id, type: 'note', actor_name: n.author_name, date: n.created_at, content: n.text }));
            }
            if (review.replied_at) events.push({ id: '3', type: 'reply_published', actor_name: 'Vous', date: review.replied_at, content: 'Réponse publiée' });
            return events.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        },
        getCounts: async () => {
            if (isDemoMode()) return { todo: 5, done: 120 };
            const { count: todo } = await supabase!.from('reviews').select('*', { count: 'exact', head: true }).in('status', ['pending', 'draft']);
            const { count: done } = await supabase!.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'sent');
            return { todo: todo || 0, done: done || 0 };
        },
        subscribe: (callback: (payload: any) => void) => {
            if (isDemoMode()) return { unsubscribe: () => {} };
            return supabase!.channel('reviews-changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, callback)
                .subscribe();
        },
        uploadCsv: async (file: File, locationId: string) => {
            return 50;
        }
    },
    ai: {
        generateReply: async (review: Review, config: any) => {
            if (isDemoMode()) return "Merci pour votre avis ! Nous sommes ravis que vous ayez apprécié l'expérience. À très bientôt !";
            const { data, error } = await supabase!.functions.invoke('ai_generate', {
                body: { task: 'generate_reply', context: { review, ...config } }
            });
            if (error) throw error;
            return data.text;
        },
        previewBrandVoice: async (settings: any, review: any) => {
            if (isDemoMode()) return "Merci ! On est super contents que ça vous plaise. 😎";
            const { data, error } = await supabase!.functions.invoke('ai_generate', {
                body: { task: 'generate_reply', context: { review, ...settings, length: 'medium' } }
            });
            if (error) throw error;
            return data.text;
        },
        generateSocialPost: async (review: Review, platform: string) => {
            if (isDemoMode()) return `🌟 Avis Client du Jour !\n\n"${review.body}"\n\nMerci ${review.author_name} pour ce retour incroyable ! 🙌\n\n#Reviewflow #CustomerLove`;
            const { data, error } = await supabase!.functions.invoke('ai_generate', {
                body: { task: 'social_post', context: { review, platform } }
            });
            if (error) throw error;
            return data.text;
        },
        generateSms: async (context: any) => {
            if (isDemoMode()) return "🎁 -20% ce weekend avec le code VIP20 ! Profitez-en vite.";
            const { data, error } = await supabase!.functions.invoke('ai_generate', {
                body: { task: 'generate_sms', context }
            });
            if (error) throw error;
            return data.text;
        },
        generateEmailCampaign: async (context: any) => {
            if (isDemoMode()) return { subject: "Cadeau pour vous", body: "<p>Bonjour,</p><p>Voici une offre...</p>" };
            const { data, error } = await supabase!.functions.invoke('ai_generate', {
                body: { task: 'generate_email_campaign', context }
            });
            if (error) throw error;
            return JSON.parse(data.text);
        },
        generateManagerAdvice: async (member: StaffMember, rank: number, type: 'volume' | 'quality') => {
            if (isDemoMode()) {
                if (type === 'volume') return `Pour booster ${member.name}, proposez-lui un mini-challenge : 5 avis collectés cette semaine = une récompense immédiate !`;
                return `${member.name} a une bonne note (${member.average_rating}/5). Encouragez-le à demander aux clients satisfaits de mentionner son prénom dans l'avis.`;
            }
            const { data, error } = await supabase!.functions.invoke('ai_generate', {
                body: { 
                    task: 'generate_manager_advice', 
                    context: { 
                        name: member.name, 
                        role: member.role, 
                        reviewCount: member.reviews_count, 
                        avgRating: member.average_rating, 
                        rank, 
                        type 
                    } 
                }
            });
            if (error) throw error;
            return data.text;
        },
        runCustomTask: async (payload: any) => {
            if (isDemoMode()) return { result: "Mock Analysis Result" };
            const { data, error } = await supabase!.functions.invoke('ai_generate', { body: payload });
            if (error) throw error;
            return data;
        }
    },
    analytics: {
        getOverview: async (period?: string): Promise<AnalyticsSummary> => {
            if (isDemoMode()) return INITIAL_ANALYTICS;
            return INITIAL_ANALYTICS;
        }
    },
    competitors: {
        list: async (): Promise<Competitor[]> => {
            if (isDemoMode()) return INITIAL_COMPETITORS;
            const { data } = await supabase!.from('competitors').select('*');
            return data as Competitor[];
        },
        getReports: async () => {
            if (isDemoMode()) return [];
            const { data } = await supabase!.from('market_reports').select('*').order('created_at', { ascending: false });
            return data;
        },
        autoDiscover: async (radius: number, industry: string, lat: number, lng: number) => {
            if (isDemoMode()) return INITIAL_COMPETITORS;
            const { data, error } = await supabase!.functions.invoke('fetch_places', {
                body: { radius, keyword: industry, latitude: lat, longitude: lng }
            });
            if (error) throw error;
            return data.results;
        },
        create: async (data: any) => {
            if (isDemoMode()) return;
            const org = await api.organization.get();
            await supabase!.from('competitors').insert({ ...data, organization_id: org?.id });
        },
        delete: async (id: string) => {
            if (isDemoMode()) return;
            await supabase!.from('competitors').delete().eq('id', id);
        },
        getDeepAnalysis: async (sector: string, location: string, competitors: Competitor[]) => {
            if (isDemoMode()) return {
                market_analysis: "Marché dynamique avec une forte concurrence sur la qualité de service.",
                trends: ["Digitalisation", "Produits locaux"],
                swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
                strategic_recommendations: ["Améliorer le SEO", "Fidéliser via SMS"],
                competitors_detailed: []
            };
            const { data, error } = await supabase!.functions.invoke('analyze_market', {
                body: { sector, location, competitors }
            });
            if (error) throw error;
            return data;
        },
        saveReport: async (report: any) => {
            if (isDemoMode()) return;
            await supabase!.from('market_reports').insert(report);
        }
    },
    global: {
        search: async (term: string) => {
            if (isDemoMode()) return [
                { type: 'review', title: 'Avis de Sophie', subtitle: '5/5 - "Super..."', link: '/inbox' },
                { type: 'client', title: 'Sophie Martin', subtitle: 'Client fidèle', link: '/customers' }
            ];
            // Implement real search if needed
            return [];
        }
    },
    notifications: {
        list: async (): Promise<AppNotification[]> => {
            if (isDemoMode()) return [
                { id: '1', type: 'info', title: 'Bienvenue', message: 'Découvrez votre nouveau dashboard.', read: false, created_at: new Date().toISOString() }
            ];
            // Mock for now
            return [];
        },
        markAllRead: async () => {
            // Mock
        },
        sendTestEmail: async () => {
            if (isDemoMode()) return;
            await supabase!.functions.invoke('send_alert', { body: { to: 'test@example.com', subject: 'Test', html: '<p>Test</p>' } });
        }
    },
    automation: {
        getWorkflows: async (): Promise<WorkflowRule[]> => {
            if (isDemoMode()) return INITIAL_WORKFLOWS;
            const org = await api.organization.get();
            return org?.workflows || [];
        },
        deleteWorkflow: async (id: string) => {
            if (isDemoMode()) return;
            const org = await api.organization.get();
            if (org) {
                const workflows = org.workflows?.filter(w => w.id !== id) || [];
                await supabase!.from('organizations').update({ workflows }).eq('id', org.id);
            }
        },
        saveWorkflow: async (workflow: WorkflowRule) => {
            if (isDemoMode()) return;
            const org = await api.organization.get();
            if (org) {
                const workflows = org.workflows?.filter(w => w.id !== workflow.id) || [];
                await supabase!.from('organizations').update({ workflows: [...workflows, workflow] }).eq('id', org.id);
            }
        },
        run: async () => {
            if (isDemoMode()) return { processed: 5, actions: 3 };
            const { data } = await supabase!.functions.invoke('process_reviews');
            return data;
        }
    },
    team: {
        list: async (): Promise<User[]> => {
            if (isDemoMode()) return INITIAL_USERS;
            const { data: { user } } = await supabase!.auth.getUser();
            if (!user) return [];
            const { data: profile } = await supabase!.from('users').select('organization_id').eq('id', user.id).single();
            if (!profile?.organization_id) return [];
            const { data } = await supabase!.from('users').select('*').eq('organization_id', profile.organization_id);
            return data as User[];
        },
        invite: async (email: string, role: string) => {
            if (isDemoMode()) return;
            await supabase!.functions.invoke('invite_user', { body: { email, role } });
        }
    },
    system: {
        checkHealth: async () => {
            if (isDemoMode()) return { db: true, latency: 12 };
            const start = Date.now();
            const { error } = await supabase!.from('organizations').select('count').limit(1).single();
            return { db: !error, latency: Date.now() - start };
        }
    },
    company: {
        search: async (query: string) => {
            if (isDemoMode()) return [
                { legal_name: 'Ma Société SAS', siret: '123456789', address: '1 Rue de la Paix, Paris' }
            ];
            return [];
        }
    },
    activity: {
        getRecent: async () => {
            if (isDemoMode()) return [
                { id: '1', type: 'review', text: 'Nouvel avis 5 étoiles reçu', time: 'Il y a 2h', location: 'Paris' },
                { id: '2', type: 'alert', text: 'Avis négatif détecté', time: 'Il y a 5h', location: 'Lyon' }
            ];
            return [];
        }
    },
    onboarding: {
        checkStatus: async () => {
            if (isDemoMode()) return { completionPercentage: 80, googleConnected: true, brandVoiceConfigured: true, firstReviewReplied: false };
            const org = await api.organization.get();
            const googleConnected = !!org?.google_access_token; 
            const brandVoiceConfigured = !!org?.brand?.tone;
            return {
                completionPercentage: (googleConnected ? 33 : 0) + (brandVoiceConfigured ? 33 : 0) + 34,
                googleConnected,
                brandVoiceConfigured,
                firstReviewReplied: true 
            };
        }
    },
    seedCloudDatabase: async () => {
        if (isDemoMode()) return;
        console.log("Seeding database...");
    },
    billing: {
        getInvoices: async (): Promise<BillingInvoice[]> => {
            if (isDemoMode()) return [];
            const { data } = await supabase!.functions.invoke('get_invoices');
            return data?.invoices || [];
        },
        createCheckoutSession: async (plan: string) => {
            if (isDemoMode()) return '#';
            const { data } = await supabase!.functions.invoke('create_checkout', { body: { plan } });
            return data?.url;
        },
        createPortalSession: async () => {
            if (isDemoMode()) return '#';
            const { data } = await supabase!.functions.invoke('create_portal', { body: { returnUrl: window.location.origin + '/#/billing' } });
            return data?.url;
        },
        getUsage: async () => {
            if (isDemoMode()) return 34;
            const org = await api.organization.get();
            if (!org) return 0;
            
            // Get first day of current month
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0,0,0,0);

            // Count AI Usage records for this org since start of month
            const { count } = await supabase!
                .from('ai_usage')
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', org.id)
                .gte('created_at', startOfMonth.toISOString());
            
            return count || 0;
        }
    },
    widgets: {
        requestIntegration: async (data: any) => {
            if (isDemoMode()) return;
            await supabase!.functions.invoke('send_alert', { body: { to: 'support@reviewflow.com', subject: 'Demande Intégration Widget', html: JSON.stringify(data) } });
        }
    },
    campaigns: {
        send: async (type: 'sms' | 'email', recipient: string, subject: string, content: string, segment?: string, link?: string) => {
            if (isDemoMode()) return;
            if (type === 'sms') {
                await supabase!.functions.invoke('send_sms_campaign', { body: { to: recipient, body: content } });
            } else {
                await supabase!.functions.invoke('send_campaign_emails', { body: { recipients: [{email: recipient}], subject, html: content } });
            }
        },
        getHistory: async (): Promise<CampaignLog[]> => {
            if (isDemoMode()) return [];
            return [];
        }
    },
    public: {
        getLocationInfo: async (id: string) => {
            if (isDemoMode()) return INITIAL_ORG.locations.find(l => l.id === id) || INITIAL_ORG.locations[0];
            const { data } = await supabase!.from('locations').select('*').eq('id', id).single();
            return data;
        },
        submitFeedback: async (locationId: string, rating: number, feedback: string, contact: any, tags: string[], staffName?: string) => {
            if (isDemoMode()) return;
            await supabase!.functions.invoke('submit_review', { body: { locationId, rating, feedback, contact, tags, staffName } });
        },
        getWidgetReviews: async (id: string) => {
            if (isDemoMode()) return INITIAL_REVIEWS.filter(r => r.rating >= 4);
            const { data } = await supabase!.from('reviews').select('*').eq('location_id', id).gte('rating', 4).order('received_at', { ascending: false }).limit(20);
            return data;
        }
    },
    customers: {
        list: async (): Promise<Customer[]> => {
            if (isDemoMode()) return [];
            const { data } = await supabase!.from('customers').select('*');
            return data as Customer[];
        },
        import: async (customers: any[]) => {
            if (isDemoMode()) return;
            const { error } = await supabase!.from('customers').upsert(customers, { onConflict: 'email' });
            if (error) throw error;
        },
        update: async (id: string, updates: Partial<Customer>) => {
            if (isDemoMode()) return;
            await supabase!.from('customers').update(updates).eq('id', id);
        },
        enrichProfile: async (id: string) => {
            if (isDemoMode()) return { profile: 'Client exigeant mais fidèle.', suggestion: 'Proposer une offre VIP.' };
            const { data, error } = await supabase!.functions.invoke('ai_generate', { body: { task: 'enrich_customer', context: { customerId: id } } });
            if (error) throw error;
            return JSON.parse(data.text);
        }
    },
    admin: {
        getStats: async () => {
            if (isDemoMode()) return { mrr: '12,400€', active_tenants: 142, total_reviews_processed: 45000, tenants: [] };
            return {};
        }
    },
    offers: {
        create: async (offer: any) => {
            if (isDemoMode()) return;
            const org = await api.organization.get();
            if (org) {
                await supabase!.from('offers').insert({ ...offer, organization_id: org.id, stats: { distributed: 0, redeemed: 0 } });
            }
        },
        validate: async (code: string) => {
            if (isDemoMode()) return { valid: true, discount: '-20%', coupon: { customer_email: 'test@client.com', expires_at: new Date(Date.now() + 86400000).toISOString() } };
            const { data, error } = await supabase!.functions.invoke('manage_coupons', { body: { action: 'validate', code } });
            if (error) throw error;
            return data;
        },
        redeem: async (code: string) => {
            if (isDemoMode()) return;
            await supabase!.functions.invoke('manage_coupons', { body: { action: 'redeem', code } });
        }
    },
    social: {
        getPosts: async (locationId?: string): Promise<SocialPost[]> => {
            if (isDemoMode()) return INITIAL_SOCIAL_POSTS;
            let query = supabase!.from('social_posts').select('*');
            if (locationId) query = query.eq('location_id', locationId);
            const { data } = await query;
            return data as SocialPost[];
        },
        uploadMedia: async (file: File): Promise<string> => {
            if (isDemoMode()) return URL.createObjectURL(file);
            const fileName = `${Date.now()}-${file.name}`;
            const { data, error } = await supabase!.storage.from('media').upload(fileName, file);
            if (error) throw error;
            const { data: { publicUrl } } = supabase!.storage.from('media').getPublicUrl(fileName);
            return publicUrl;
        },
        schedulePost: async (post: any) => {
            if (isDemoMode()) return;
            await supabase!.from('social_posts').insert({ ...post, status: 'scheduled' });
        },
        connectAccount: async (platform: string) => {
            if (isDemoMode()) return;
            console.log(`Connecting to ${platform}`);
        },
        saveTemplate: async (template: Partial<SocialTemplate>) => {
            if (isDemoMode()) return;
            const org = await api.organization.get();
            if (org) {
                // Assuming jsonb in org for templates or separate table
            }
        }
    }
};
