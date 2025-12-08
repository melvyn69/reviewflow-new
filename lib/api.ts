
import { supabase } from './supabase';
import { 
    INITIAL_USERS, INITIAL_ORG, INITIAL_REVIEWS, INITIAL_ANALYTICS, 
    INITIAL_COMPETITORS, INITIAL_WORKFLOWS, INITIAL_REPORTS, INITIAL_SOCIAL_POSTS 
} from './db';
import { 
    User, Organization, Review, AnalyticsSummary, Competitor, 
    SocialPost, WorkflowRule, ReportConfig, Customer, Offer, 
    StaffMember, CampaignLog 
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
        getDeepAnalysis: async (sector: string, location: string, competitors: any[]) => {
            if (isDemoMode()) return { market_analysis: "Marché dynamique...", trends: ["Bio", "Local"], swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] } };
            const { data, error } = await supabase!.functions.invoke('analyze_market', {
                body: { sector, location, competitors }
            });
            if (error) throw error;
            return data;
        },
        saveReport: async (report: any) => {
            if (isDemoMode()) return;
            const org = await api.organization.get();
            await supabase!.from('market_reports').insert({ ...report, organization_id: org?.id });
        }
    },
    social: {
        getPosts: async (locationId?: string): Promise<SocialPost[]> => {
            if (isDemoMode()) return INITIAL_SOCIAL_POSTS;
            let q = supabase!.from('social_posts').select('*');
            if (locationId) q = q.eq('location_id', locationId);
            const { data } = await q.order('scheduled_date', { ascending: false });
            return data as SocialPost[];
        },
        uploadMedia: async (file: File) => {
            if (isDemoMode()) return URL.createObjectURL(file);
            const fileName = `${Date.now()}-${file.name}`;
            const { data, error } = await supabase!.storage.from('media').upload(fileName, file);
            if (error) throw error;
            const { data: { publicUrl } } = supabase!.storage.from('media').getPublicUrl(fileName);
            return publicUrl;
        },
        schedulePost: async (post: any) => {
            if (isDemoMode()) return;
            const org = await api.organization.get();
            await supabase!.from('social_posts').insert({ ...post, organization_id: org?.id, status: 'scheduled' });
        },
        connectAccount: async (platform: string) => {
            if (!supabase) return;
            window.location.href = `https://api.reviewflow.com/auth/${platform}/connect`; 
        },
        saveTemplate: async (template: any) => {
            if (isDemoMode()) return;
            const org = await api.organization.get();
            await supabase!.from('social_templates').insert({ ...template, organization_id: org?.id });
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
                const updated = org.workflows?.filter(w => w.id !== id) || [];
                await supabase!.from('organizations').update({ workflows: updated }).eq('id', org.id);
            }
        },
        saveWorkflow: async (workflow: WorkflowRule) => {
            if (isDemoMode()) return;
            const org = await api.organization.get();
            if (org) {
                const current = org.workflows || [];
                const index = current.findIndex(w => w.id === workflow.id);
                let updated;
                if (index >= 0) {
                    updated = [...current];
                    updated[index] = workflow;
                } else {
                    updated = [...current, workflow];
                }
                await supabase!.from('organizations').update({ workflows: updated }).eq('id', org.id);
            }
        },
        run: async () => {
            if (isDemoMode()) return { processed: 5, actions: 3 };
            const { data } = await supabase!.functions.invoke('process_reviews');
            return data;
        }
    },
    notifications: {
        list: async () => {
            if (isDemoMode()) return [{ id: '1', title: 'Bienvenue', message: 'Démarrez maintenant.', type: 'info', read: false, created_at: new Date().toISOString() }];
            const { data } = await supabase!.from('notifications').select('*').order('created_at', { ascending: false });
            return data || [];
        },
        markAllRead: async () => {
            if (isDemoMode()) return;
            await supabase!.from('notifications').update({ read: true }).eq('read', false);
        },
        sendTestEmail: async () => {
            if (isDemoMode()) return;
            const user = await api.auth.getUser();
            await supabase!.functions.invoke('send_alert', {
                body: { to: user?.email, subject: "Test Reviewflow", html: "Ceci est un test." }
            });
        }
    },
    team: {
        list: async (): Promise<User[]> => {
            if (isDemoMode()) return INITIAL_USERS;
            const org = await api.organization.get();
            if (!org) return [];
            const { data } = await supabase!.from('users').select('*').eq('organization_id', org.id);
            return data as User[];
        },
        invite: async (email: string, role: string) => {
            if (isDemoMode()) return;
            await supabase!.functions.invoke('invite_user', { body: { email, role } });
        }
    },
    customers: {
        list: async (): Promise<Customer[]> => {
            if (isDemoMode()) return [];
            const org = await api.organization.get();
            if (!org) return [];
            const { data } = await supabase!.from('customers').select('*').eq('organization_id', org.id);
            return data as Customer[];
        },
        update: async (id: string, updates: any) => {
            if (isDemoMode()) return;
            await supabase!.from('customers').update(updates).eq('id', id);
        },
        enrichProfile: async (id: string) => {
            if (isDemoMode()) return { profile: "Client fidèle", suggestion: "Offrir un dessert" };
            const { data, error } = await supabase!.functions.invoke('ai_generate', {
                body: { task: 'enrich_customer', context: { customerId: id } }
            });
            if (error) throw error;
            return JSON.parse(data.text);
        }
    },
    offers: {
        create: async (offer: any) => {
            if (isDemoMode()) return;
            const org = await api.organization.get();
            await supabase!.from('offers').insert({ ...offer, organization_id: org?.id, stats: { distributed: 0, redeemed: 0 } });
        },
        validate: async (code: string) => {
            if (isDemoMode()) return { valid: true, discount: "Mock Discount" };
            const { data, error } = await supabase!.functions.invoke('manage_coupons', {
                body: { action: 'validate', code }
            });
            if (error) throw error;
            return data;
        },
        redeem: async (code: string) => {
            if (isDemoMode()) return;
            await supabase!.functions.invoke('manage_coupons', {
                body: { action: 'redeem', code }
            });
        }
    },
    campaigns: {
        send: async (type: string, recipient: any, subject: string, content: string, segment?: string, link?: string): Promise<CampaignLog> => {
            if (isDemoMode()) return {
                id: 'demo-log-1',
                type: type as 'sms' | 'email',
                status: 'completed',
                subject,
                content,
                segment_name: segment || 'Direct',
                recipient_count: Array.isArray(recipient) ? recipient.length : 1,
                success_count: Array.isArray(recipient) ? recipient.length : 1,
                funnel_link: link,
                created_at: new Date().toISOString()
            } as CampaignLog;
            
            const recipients = Array.isArray(recipient) ? recipient : [{ email: recipient, name: 'Client' }];
            let successCount = 0;

            if (type === 'email') {
                const { data, error } = await supabase!.functions.invoke('send_campaign_emails', {
                    body: { recipients, subject, html: content }
                });
                if (error) throw error;
                successCount = data.count || recipients.length;
            } else if (type === 'sms') {
                 // Mock SMS sending via function if needed, or just assume success if function handles it
                 successCount = recipients.length;
            }
            
            const org = await api.organization.get();
            const { data: log, error } = await supabase!.from('campaign_logs').insert({
                organization_id: org?.id,
                type,
                status: 'completed',
                subject,
                content,
                segment_name: segment || 'Direct',
                recipient_count: recipients.length,
                success_count: successCount,
                funnel_link: link
            }).select().single();

            if (error) throw error;
            
            return log as CampaignLog;
        },
        getHistory: async (): Promise<CampaignLog[]> => {
            if (isDemoMode()) return [];
            const org = await api.organization.get();
            if (!org) return [];
            const { data } = await supabase!.from('campaign_logs').select('*').eq('organization_id', org.id).order('created_at', { ascending: false });
            return data as CampaignLog[];
        },
        requestQuote: async (data: any) => {
            return api.notifications.sendTestEmail();
        }
    },
    links: {
        createShortLink: async (target: string) => {
            if (isDemoMode()) return { short_url: 'review.flow/xyz' };
            return { short_url: 'review.flow/' + Math.random().toString(36).substr(2, 5) };
        }
    },
    global: {
        search: async (query: string) => {
            if (isDemoMode()) return [];
            const { data: reviews } = await supabase!.from('reviews').select('id, author_name, body').ilike('author_name', `%${query}%`).limit(3);
            const { data: customers } = await supabase!.from('customers').select('id, name').ilike('name', `%${query}%`).limit(3);
            
            return [
                ...(reviews || []).map((r: any) => ({ type: 'Avis', title: r.author_name, subtitle: r.body, link: `/inbox?reviewId=${r.id}` })),
                ...(customers || []).map((c: any) => ({ type: 'Client', title: c.name, subtitle: 'CRM', link: '/customers' }))
            ];
        }
    },
    activity: {
        getRecent: async () => {
            if (isDemoMode()) return [
                { id: 1, type: 'review', text: "Nouvel avis 5 étoiles de Sophie", time: "Il y a 2 min", location: "Paris" },
                { id: 2, type: 'alert', text: "Avis négatif détecté (2/5)", time: "Il y a 1h", location: "Lyon" }
            ];
            const { data: reviews } = await supabase!.from('reviews').select('*').order('received_at', { ascending: false }).limit(5);
            return reviews?.map((r: any) => ({
                id: r.id,
                type: 'review',
                text: `Avis ${r.rating}★ de ${r.author_name}`,
                time: new Date(r.received_at).toLocaleTimeString(),
                location: 'Google'
            }));
        }
    },
    onboarding: {
        checkStatus: async () => {
            if (isDemoMode()) return { completionPercentage: 40, googleConnected: true, brandVoiceConfigured: false, firstReviewReplied: false };
            const org = await api.organization.get();
            if (!org) return null;
            
            const googleConnected = !!org.integrations?.google;
            const brandVoiceConfigured = !!org.brand?.tone;
            const { count } = await supabase!.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'sent');
            const firstReviewReplied = (count || 0) > 0;
            
            let percentage = 10;
            if (googleConnected) percentage += 30;
            if (brandVoiceConfigured) percentage += 30;
            if (firstReviewReplied) percentage += 30;
            
            return { completionPercentage: percentage, googleConnected, brandVoiceConfigured, firstReviewReplied };
        }
    },
    billing: {
        createCheckoutSession: async (plan: string) => {
            if (isDemoMode()) return "#";
            const { data, error } = await supabase!.functions.invoke('create_checkout', { body: { plan, successUrl: window.location.origin + '/billing?success=true', cancelUrl: window.location.origin + '/billing' } });
            if (error) throw error;
            return data.url;
        },
        createPortalSession: async () => {
            if (isDemoMode()) return "#";
            const { data, error } = await supabase!.functions.invoke('create_portal', { body: { returnUrl: window.location.href } });
            if (error) throw error;
            return data.url;
        },
        getInvoices: async () => {
            if (isDemoMode()) return [];
            const { data, error } = await supabase!.functions.invoke('get_invoices');
            if (error) throw error;
            return data.invoices;
        }
    },
    admin: {
        getStats: async () => {
            if (isDemoMode()) return { mrr: "12,400€", active_tenants: 142, total_reviews_processed: 45000, tenants: [] };
            return { mrr: "0€", active_tenants: 1, total_reviews_processed: 0, tenants: [] }; 
        }
    },
    system: {
        checkHealth: async () => {
            if (isDemoMode()) return { db: true, latency: 12 };
            const start = Date.now();
            const { error } = await supabase!.from('users').select('count').limit(1).single();
            return { db: !error, latency: Date.now() - start };
        }
    },
    public: {
        getLocationInfo: async (id: string) => {
            if (isDemoMode()) return INITIAL_ORG.locations[0];
            const { data } = await supabase!.from('locations').select('*').eq('id', id).single();
            return data;
        },
        submitFeedback: async (locationId: string, rating: number, feedback: string, contact: any, tags: string[], staffName?: string) => {
            if (isDemoMode()) return;
            await supabase!.functions.invoke('submit_review', {
                body: { locationId, rating, feedback, contact, tags, staffName }
            });
        },
        getWidgetReviews: async (locationId: string) => {
            if (isDemoMode()) {
                // Filter demo reviews by location ID to respect widget selection
                const filtered = INITIAL_REVIEWS.filter(r => r.location_id === locationId);
                return filtered.map((r: any) => ({ ...r, body: r.text || r.body })).sort((a,b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime());
            }
            const { data } = await supabase!.from('reviews')
                .select('rating, text, author_name, received_at, body')
                .eq('location_id', locationId)
                .order('received_at', { ascending: false })
                .limit(10);
            
            return data?.map((r: any) => ({ ...r, body: r.text || r.body })) || [];
        }
    },
    company: {
        search: async (query: string) => {
            return [{ legal_name: query + " SAS", siret: "123456789", address: "10 Rue de Paris" }];
        }
    },
    seedCloudDatabase: async () => {
        if (!supabase) return;
    },
    widgets: {
        requestIntegration: async (data: any) => {
            if (isDemoMode()) return;
            const org = await api.organization.get();
            await supabase!.from('widget_integration_requests').insert({
                organization_id: org?.id,
                website: data.website,
                cms: data.cms,
                contact_email: data.email,
                notes: data.notes,
                created_at: new Date().toISOString()
            });
        }
    }
};
