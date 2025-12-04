import { supabase } from './supabase';
import { 
    INITIAL_USERS, 
    INITIAL_ORG, 
    INITIAL_REVIEWS, 
    INITIAL_COMPETITORS, 
    INITIAL_WORKFLOWS, 
    INITIAL_ANALYTICS 
} from './db';
import { 
    User, 
    Organization, 
    Review, 
    Competitor, 
    WorkflowRule, 
    AnalyticsSummary,
    StaffMember,
    Offer,
    BrandSettings
} from '../types';

// Helper to simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to check if using Supabase
const useSupabase = () => !!supabase;

// --- MOCK STORAGE (LocalStorage) ---
const getMockData = (key: string, initial: any) => {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : initial;
};

const setMockData = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
};

// --- SERVICES ---

const authService = {
    getUser: async (): Promise<User | null> => {
        if (useSupabase()) {
            const { data: { user } } = await supabase!.auth.getUser();
            if (!user) return null;
            // Get profile
            const { data: profile } = await supabase!
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single();
            return profile ? { ...profile, email: user.email } : null;
        }
        // Mock
        const user = localStorage.getItem('mock_user');
        return user ? JSON.parse(user) : null;
    },
    
    login: async (email: string, password: string): Promise<User> => {
        if (useSupabase()) {
            const { data, error } = await supabase!.auth.signInWithPassword({ email, password });
            if (error) throw error;
            return authService.getUser() as Promise<User>;
        }
        // Mock
        await delay(500);
        const user = INITIAL_USERS.find(u => u.email === email && u.password === password);
        if (user) {
            localStorage.setItem('mock_user', JSON.stringify(user));
            return user;
        }
        throw new Error("Identifiants invalides (Demo: alex@reviewflow.com / password)");
    },

    register: async (name: string, email: string, password: string): Promise<User> => {
        if (useSupabase()) {
            const { data, error } = await supabase!.auth.signUp({ 
                email, 
                password,
                options: { data: { name } }
            });
            if (error) throw error;
            return { 
                id: data.user!.id, 
                email, 
                name, 
                role: 'admin', 
                organizations: [],
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
            };
        }
        // Mock
        await delay(500);
        const newUser = { 
            id: 'u' + Date.now(), 
            name, 
            email, 
            password, 
            role: 'admin' as any, 
            organizations: [],
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
        };
        localStorage.setItem('mock_user', JSON.stringify(newUser));
        return newUser;
    },

    logout: async () => {
        if (useSupabase()) {
            await supabase!.auth.signOut();
        }
        localStorage.removeItem('mock_user');
    },

    loginWithGoogle: async () => {
        if (useSupabase()) {
            const { data, error } = await supabase!.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin
                }
            });
            if (error) throw error;
        } else {
            // Mock
            const user = INITIAL_USERS[0];
            localStorage.setItem('mock_user', JSON.stringify(user));
            window.location.href = '/';
        }
    },

    updateProfile: async (updates: Partial<User> & { password?: string }) => {
        if (useSupabase()) {
            const { data: { user } } = await supabase!.auth.getUser();
            if (!user) throw new Error("Not logged in");
            
            // Handle password update if provided
            if (updates.password) {
                const { error: pwdError } = await supabase!.auth.updateUser({ password: updates.password });
                if (pwdError) throw pwdError;
            }

            // Exclude password from profile updates for the DB table
            const { password, ...profileUpdates } = updates;
            
            if (Object.keys(profileUpdates).length > 0) {
                const { error } = await supabase!
                    .from('users')
                    .update(profileUpdates)
                    .eq('id', user.id);
                if (error) throw error;
            }
        } else {
            const user = JSON.parse(localStorage.getItem('mock_user') || '{}');
            localStorage.setItem('mock_user', JSON.stringify({ ...user, ...updates }));
        }
    },

    resetPassword: async (email: string) => {
        if (useSupabase()) {
            await supabase!.auth.resetPasswordForEmail(email);
        }
    },

    deleteAccount: async () => {
        if (useSupabase()) {
            // Call Edge Function
            const { data: { session } } = await supabase!.auth.getSession();
            await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete_account`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            await authService.logout();
        } else {
            authService.logout();
        }
    },

    connectGoogleBusiness: async () => {
        // Mock or real implementation
        // For real implementation, needs OAuth flow with Google My Business scope
        alert("En production, redirige vers Google OAuth.");
    }
};

const organizationService = {
    get: async (): Promise<Organization | null> => {
        if (useSupabase()) {
            const user = await authService.getUser();
            if (!user?.organization_id) return null;
            
            const { data } = await supabase!
                .from('organizations')
                .select('*, locations(*)')
                .eq('id', user.organization_id)
                .single();
            return data;
        }
        // Mock
        return getMockData('mock_org', INITIAL_ORG);
    },

    update: async (updates: Partial<Organization>) => {
        if (useSupabase()) {
            const org = await organizationService.get();
            if (!org) return;
            await supabase!.from('organizations').update(updates).eq('id', org.id);
        } else {
            const org = getMockData('mock_org', INITIAL_ORG);
            setMockData('mock_org', { ...org, ...updates });
        }
    },

    saveGoogleTokens: async () => {
        // Handle OAuth callback logic if needed
        return false;
    },

    addStaffMember: async (name: string, role: string) => {
        const org = await organizationService.get();
        if (!org) return;
        const newMember: StaffMember = {
            id: Math.random().toString(36).substr(2, 9),
            name,
            role,
            reviews_count: 0,
            average_rating: 0
        };
        const staff = [...(org.staff_members || []), newMember];
        await organizationService.update({ staff_members: staff });
    },

    removeStaffMember: async (id: string) => {
        const org = await organizationService.get();
        if (!org) return;
        const staff = (org.staff_members || []).filter(s => s.id !== id);
        await organizationService.update({ staff_members: staff });
    },

    sendCongratulationEmail: async (staffId: string) => {
        // Mock
        await delay(500);
    },

    generateApiKey: async (name: string) => {
        const org = await organizationService.get();
        if (!org) return;
        const newKey = { id: Math.random().toString(), name, key: 'sk_' + Math.random().toString(36), created_at: new Date().toISOString() };
        await organizationService.update({ api_keys: [...(org.api_keys || []), newKey] });
    },

    revokeApiKey: async (id: string) => {
        const org = await organizationService.get();
        if (!org) return;
        await organizationService.update({ api_keys: (org.api_keys || []).filter(k => k.id !== id) });
    },

    saveWebhook: async (url: string, events: string[]) => {
        const org = await organizationService.get();
        if (!org) return;
        const newHook = { id: Math.random().toString(), url, events, active: true, secret: 'whsec_' + Math.random() };
        await organizationService.update({ webhooks: [...(org.webhooks || []), newHook as any] });
    },

    deleteWebhook: async (id: string) => {
        const org = await organizationService.get();
        if (!org) return;
        await organizationService.update({ webhooks: (org.webhooks || []).filter(w => w.id !== id) });
    },

    testWebhook: async (id: string) => true,

    simulatePlanChange: async (plan: 'pro' | 'starter') => {
        await organizationService.update({ subscription_plan: plan });
    }
};

const reviewsService = {
    list: async (filters: any): Promise<Review[]> => {
        if (useSupabase()) {
            let query = supabase!
                .from('reviews')
                .select('*')
                .order('received_at', { ascending: false });
            
            if (filters.status && filters.status !== 'Tout') query = query.eq('status', filters.status);
            if (filters.rating && filters.rating !== 'Tout') query = query.eq('rating', parseInt(filters.rating));
            if (filters.source && filters.source !== 'Tout') query = query.eq('source', filters.source.toLowerCase());
            // location_id filtering if needed
            
            const { data } = await query;
            return data || [];
        }
        // Mock
        let reviews = getMockData('mock_reviews', INITIAL_REVIEWS);
        if (filters.status && filters.status !== 'Tout') reviews = reviews.filter((r: Review) => r.status === filters.status);
        if (filters.rating && filters.rating !== 'Tout') reviews = reviews.filter((r: Review) => r.rating === parseInt(filters.rating));
        if (filters.source && filters.source !== 'Tout') reviews = reviews.filter((r: Review) => r.source === filters.source.toLowerCase());
        return reviews;
    },

    reply: async (reviewId: string, text: string) => {
        if (useSupabase()) {
            // First update local state
            await supabase!
                .from('reviews')
                .update({ 
                    status: 'sent', 
                    posted_reply: text, 
                    replied_at: new Date().toISOString() 
                })
                .eq('id', reviewId);
                
            // Then trigger Google Write-Back via Edge Function
            // We fire and forget this for UI responsiveness, or await if critical
            fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/post_google_reply`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`, // Using Anon key, function handles permission check? No, needs service role or user token.
                    // Better to use session token if available
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reviewId, replyText: text })
            }).then(async (res) => {
                const session = await supabase!.auth.getSession();
                if (session.data.session) {
                     // Retry with auth if needed, but post_google_reply handles admin logic usually
                }
            }).catch(console.error);

        } else {
            let reviews = getMockData('mock_reviews', INITIAL_REVIEWS);
            reviews = reviews.map((r: Review) => r.id === reviewId ? { ...r, status: 'sent', posted_reply: text, replied_at: new Date().toISOString() } : r);
            setMockData('mock_reviews', reviews);
        }
    },

    saveDraft: async (reviewId: string, text: string) => {
        if (useSupabase()) {
            // Fetch existing ai_reply to preserve structure if needed, or just update text
            await supabase!
                .from('reviews')
                .update({ 
                    status: 'draft',
                    ai_reply: { text, needs_manual_validation: true } // Simplified
                })
                .eq('id', reviewId);
        } else {
            let reviews = getMockData('mock_reviews', INITIAL_REVIEWS);
            reviews = reviews.map((r: Review) => r.id === reviewId ? { ...r, status: 'draft', ai_reply: { ...r.ai_reply, text } } : r);
            setMockData('mock_reviews', reviews);
        }
    },

    addNote: async (reviewId: string, text: string) => {
        // Implementation simplified for brevity
        return { id: Date.now().toString(), text, author_name: 'Me', created_at: new Date().toISOString() };
    },

    subscribe: (callback: (payload: any) => void) => {
        if (useSupabase()) {
            return supabase!
                .channel('reviews')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, callback)
                .subscribe();
        }
        return { unsubscribe: () => {} };
    },

    uploadCsv: async (file: File, locationId: string) => {
        await delay(1000);
        return 10; // 10 reviews imported
    }
};

const analyticsService = {
    getOverview: async (period: string = '30j'): Promise<AnalyticsSummary> => {
        // Mock only for now
        await delay(500);
        return INITIAL_ANALYTICS;
    }
};

const competitorsService = {
    list: async (): Promise<Competitor[]> => {
        if (useSupabase()) {
            const { data } = await supabase!
                .from('competitors')
                .select('*');
            return data || [];
        }
        return getMockData('mock_competitors', INITIAL_COMPETITORS);
    },
    create: async (data: Partial<Competitor>) => {
        if (useSupabase()) {
            const user = await authService.getUser();
            if (!user?.organization_id) return;
            await supabase!
                .from('competitors')
                .insert({ ...data, organization_id: user.organization_id });
        } else {
            const current = await competitorsService.list();
            setMockData('mock_competitors', [...current, { ...data, id: Date.now().toString() }]);
        }
    },
    delete: async (id: string) => {
        if (useSupabase()) {
            await supabase!
                .from('competitors')
                .delete()
                .eq('id', id);
        } else {
            const current = await competitorsService.list();
            setMockData('mock_competitors', current.filter(c => c.id !== id));
        }
    },
    autoDiscover: async (radius: number, sector: string, lat: number, lng: number) => {
        if (useSupabase()) {
            const { data: { session } } = await supabase!.auth.getSession();
            const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch_places`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ radius, keyword: sector, latitude: lat, longitude: lng })
            });
            const json = await res.json();
            return json.results || [];
        }
        // Mock Fallback
        await delay(1000);
        return INITIAL_COMPETITORS;
    },
    
    getDeepAnalysis: async () => {
        const org = await organizationService.get();
        // Check plan (enforceGrowthPlan logic inline)
        if (org?.subscription_plan !== 'pro') throw new Error("Upgrade required");

        let competitors = await competitorsService.list();
        if (competitors.length === 0) {
             const saved = localStorage.getItem('last_scan_results');
             if (saved) competitors = JSON.parse(saved);
        }

        if (competitors.length === 0) {
            throw new Error("Veuillez d'abord scanner ou ajouter des concurrents pour lancer l'analyse.");
        }

        if (useSupabase()) {
            const { data: { session } } = await supabase!.auth.getSession();
            if (!session) throw new Error("Unauthorized");

            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze_market`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    competitors: competitors,
                    sector: org?.industry || 'Commerce',
                    location: org?.locations?.[0]?.city || ''
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || "Erreur d'analyse IA");
            }

            return await response.json();
        }
        
        // Mock Response
        await delay(1500);
        return {
            trends: ["Augmentation de la demande bio", "Livraison rapide valorisée"],
            swot: {
                strengths: ["Qualité perçue"],
                weaknesses: ["Prix"],
                opportunities: ["Nouveaux quartiers"],
                threats: ["Chaînes nationales"]
            },
            competitors_detailed: competitors.map(c => ({
                name: c.name,
                last_month_growth: "+5%",
                sentiment_trend: "Positif",
                top_complaint: "Attente"
            }))
        };
    }
};

const automationService = {
    getWorkflows: async (): Promise<WorkflowRule[]> => {
        return getMockData('mock_workflows', INITIAL_WORKFLOWS);
    },
    saveWorkflow: async (wf: WorkflowRule) => {
        let wfs = await automationService.getWorkflows();
        const index = wfs.findIndex(w => w.id === wf.id);
        if (index >= 0) wfs[index] = wf;
        else wfs.push(wf);
        setMockData('mock_workflows', wfs);
    },
    deleteWorkflow: async (id: string) => {
        let wfs = await automationService.getWorkflows();
        setMockData('mock_workflows', wfs.filter(w => w.id !== id));
    },
    run: async () => {
        if (useSupabase()) {
            // Trigger the Edge Function manually
            const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process_reviews`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({}) // Empty body triggering the process
            });
            const json = await res.json();
            return { processed: json.processed || 0, actions: json.actions || 0 };
        }
        // Mock run
        await delay(1000);
        return { processed: 5, actions: 3 };
    }
};

const notificationsService = {
    list: async () => [],
    markAllRead: async () => {},
    sendTestEmail: async () => { await delay(500); }
};

const teamService = {
    list: async (): Promise<User[]> => {
        return [await authService.getUser() as User]; // Simple mock
    },
    invite: async (email: string, role: string) => {
        await delay(500);
    }
};

const billingService = {
    getInvoices: async () => {
        if (useSupabase()) {
            const { data: { session } } = await supabase!.auth.getSession();
            const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get_invoices`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json'
                }
            });
            const json = await res.json();
            return json.invoices || [];
        }
        return [];
    },
    createCheckoutSession: async (plan: string) => {
        if (useSupabase()) {
            const { data: { session } } = await supabase!.auth.getSession();
            const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create_checkout`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    plan, 
                    successUrl: window.location.origin + '/#/billing?success=true',
                    cancelUrl: window.location.origin + '/#/billing?canceled=true'
                })
            });
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            return json.url;
        }
        // Fallback for demo
        return plan === 'starter' ? import.meta.env.VITE_STRIPE_LINK_STARTER : import.meta.env.VITE_STRIPE_LINK_PRO;
    },
    createPortalSession: async () => { 
        if (useSupabase()) {
            const { data: { session } } = await supabase!.auth.getSession();
            const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create_portal`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ returnUrl: window.location.origin + '/#/billing' })
            });
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            return json.url;
        }
        return 'https://billing.stripe.com/p/login/...'; 
    }
};

const campaignsService = {
    send: async (type: string, recipient: string, subject: string, content: string) => {
        if (useSupabase()) {
            const { data: { session } } = await supabase!.auth.getSession();
            const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send_campaign_emails`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    emails: [recipient],
                    subject,
                    html: content
                })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Erreur d'envoi");
            }
            return true;
        }
        // Mock
        await delay(1000);
        return true;
    }
};

const publicService = {
    getLocationInfo: async (id: string) => {
        if (useSupabase()) {
            const { data } = await supabase!
                .from('locations')
                .select('*')
                .eq('id', id)
                .single();
            return data;
        }
        const org = await organizationService.get();
        return org?.locations.find(l => l.id === id);
    },
    getActiveOffer: async (locId: string, rating: number) => {
        const offers = await offersService.list();
        return offers.find(o => o.active && o.trigger_rating <= rating) || null;
    },
    submitFeedback: async (locationId: string, rating: number, feedback: string, contact: string, tags: string[], staffName?: string) => {
        if (useSupabase()) {
            // Using Edge Function for secure submission and alerts
            const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit_review`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    locationId,
                    rating,
                    feedback,
                    contact,
                    tags,
                    staffName
                })
            });
            
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Erreur lors de la soumission");
            }
            return;
        }
        // Mock
        const newReview: Review = {
            id: Math.random().toString(),
            location_id: locationId,
            rating,
            body: feedback,
            author_name: contact || 'Client Anonyme (Funnel)',
            source: 'direct',
            status: 'pending',
            received_at: new Date().toISOString(),
            language: 'fr',
            staff_attributed_to: staffName,
            analysis: { sentiment: rating >= 4 ? 'positive' : 'negative', themes: tags, keywords: [], flags: { hygiene: false, discrimination: false, security: false, staff_conflict: false, pricing_issue: false }}
        };
        const reviews = await reviewsService.list({});
        setMockData('mock_reviews', [newReview, ...reviews]);
    },
    getWidgetReviews: async (locId: string) => {
        return reviewsService.list({});
    }
};

const offersService = {
    list: async (): Promise<Offer[]> => {
        return getMockData('mock_offers', []);
    },
    create: async (offer: Partial<Offer>) => {
        const current = await offersService.list();
        const newOffer = { ...offer, id: Date.now().toString(), stats: { distributed: 0, redeemed: 0 }, active: true } as Offer;
        setMockData('mock_offers', [...current, newOffer]);
    },
    delete: async (id: string) => {
        const current = await offersService.list();
        setMockData('mock_offers', current.filter(o => o.id !== id));
    },
    validate: async (code: string) => {
        await delay(500);
        return { valid: code.startsWith('MERCI'), discount: 'Café Offert' };
    },
    generateCoupon: async (offerId: string, email: string) => {
        return {
            id: 'coup-' + Date.now(),
            code: 'GIFT-' + Math.floor(Math.random()*1000),
            offer_title: 'Cadeau',
            discount_detail: 'Gratuit',
            expires_at: new Date(Date.now() + 86400000 * 30).toISOString(),
            status: 'active'
        } as any;
    }
};

const aiService = {
    generateReply: async (review: Review, config: any) => {
        if (useSupabase()) {
            const { data: { session } } = await supabase!.auth.getSession();
            const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai_generate`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ task: 'generate_reply', context: { review, ...config } })
            });
            const json = await res.json();
            return json.text;
        }
        await delay(1000);
        return `Merci ${review.author_name} pour votre avis ! Nous sommes ravis que vous ayez apprécié.`;
    },
    generateSocialPost: async (review: Review, platform: string) => {
        if (useSupabase()) {
            const { data: { session } } = await supabase!.auth.getSession();
            const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai_generate`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ task: 'social_post', context: { review, platform } })
            });
            const json = await res.json();
            return json.text;
        }
        await delay(1000);
        return `🌟 Avis 5 étoiles de ${review.author_name} ! "${review.body}" #Reviewflow #Feedback`;
    },
    previewBrandVoice: async (settings: BrandSettings, sampleReview: any) => {
        await delay(1000);
        return "Merci beaucoup pour ce retour ! C'est exactement le genre d'expérience que nous voulons offrir.";
    },
    runCustomTask: async (payload: any) => {
        await delay(1000);
        return { result: "Success (Mock)" };
    }
};

const adminService = {
    getStats: async () => {
        return {
            mrr: '12,450€',
            active_tenants: 142,
            total_reviews_processed: 45000,
            tenants: [
                { id: 't1', name: 'Bistro Regent', admin_email: 'contact@bistro.com', plan: 'pro', usage: 450, mrr: '89€' },
                { id: 't2', name: 'Coiffure Express', admin_email: 'salon@gmail.com', plan: 'starter', usage: 120, mrr: '49€' }
            ]
        };
    }
};

const onboardingService = {
    checkStatus: async () => {
        const org = await organizationService.get();
        return {
            googleConnected: !!org?.integrations.google,
            brandVoiceConfigured: !!org?.brand?.tone,
            firstReviewReplied: (await reviewsService.list({})).some(r => r.status === 'sent'),
            completionPercentage: 30 // Mock calc
        };
    }
};

const activityService = {
    getRecent: async () => {
        return [
            { id: 1, type: 'review', text: 'Nouvel avis 5 étoiles de Sophie', time: 'il y a 5 min', location: 'Paris' },
            { id: 2, type: 'alert', text: 'Avis négatif détecté (2/5)', time: 'il y a 1h', location: 'Lyon' }
        ];
    }
};

const companyService = {
    search: async (query: string) => {
        await delay(500);
        return [
            { legal_name: query + " SAS", siret: "12345678900010", address: "10 Rue de Paris" }
        ];
    }
};

const locationsService = {
    create: async (data: any) => {
        const org = await organizationService.get();
        if(!org) return;
        const newLoc = { ...data, id: Math.random().toString(), organization_id: org.id };
        await organizationService.update({ locations: [...org.locations, newLoc] });
    },
    update: async (id: string, data: any) => {
        const org = await organizationService.get();
        if(!org) return;
        const locs = org.locations.map(l => l.id === id ? { ...l, ...data } : l);
        await organizationService.update({ locations: locs });
    },
    delete: async (id: string) => {
        const org = await organizationService.get();
        if(!org) return;
        const locs = org.locations.filter(l => l.id !== id);
        await organizationService.update({ locations: locs });
    }
};

const customersService = {
    list: async () => {
        // Mock
        return [
            { id: '1', name: 'Jean Dupont', average_rating: 4.5, total_reviews: 2, status: 'promoter', last_interaction: new Date().toISOString(), source: 'Google' },
            { id: '2', name: 'Marie Curie', average_rating: 2.0, total_reviews: 1, status: 'detractor', last_interaction: new Date().toISOString(), source: 'Facebook' }
        ] as any[];
    }
};

const googleService = {
    fetchAllGoogleLocations: async () => {
        if (useSupabase()) {
            const { data: { session } } = await supabase!.auth.getSession();
            const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch_google_locations`, {
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            return await res.json();
        }
        return [];
    },
    syncReviewsForLocation: async (locId: string, resourceName: string) => {
        if (useSupabase()) {
            const org = await organizationService.get();
            const { data: { session } } = await supabase!.auth.getSession();
            const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch_google_reviews`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    locationId: locId, 
                    googleLocationName: resourceName, 
                    organizationId: org?.id 
                })
            });
            const json = await res.json();
            return json.count || 0;
        }
        await delay(1000);
        return 5;
    }
};

export const seedCloudDatabase = async () => {
    if (!useSupabase()) {
        console.warn("Seeding only works with active Supabase connection");
        return;
    }
    // Implement seeding logic if needed
};

export const api = {
    auth: authService,
    organization: organizationService,
    reviews: reviewsService,
    analytics: analyticsService,
    competitors: competitorsService,
    automation: automationService,
    notifications: notificationsService,
    team: teamService,
    billing: billingService,
    public: publicService,
    offers: offersService,
    ai: aiService,
    campaigns: campaignsService,
    admin: adminService,
    onboarding: onboardingService,
    activity: activityService,
    company: companyService,
    locations: locationsService,
    customers: customersService,
    google: googleService,
    seedCloudDatabase
};