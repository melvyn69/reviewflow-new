
    validate: async (code: string) => {
        if (useSupabase()) {
            const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage_coupons`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'validate', code })
            });
            return await res.json();
        }
        // Mock
        await delay(500);
        return { valid: code.startsWith('MERCI'), discount: 'Café Offert', reason: code.startsWith('MERCI') ? undefined : 'Code inconnu' };
    },
    redeem: async (code: string) => {
        if (useSupabase()) {
            const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage_coupons`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'redeem', code })
            });
            if (!res.ok) throw new Error("Erreur lors de l'utilisation du coupon");
            return await res.json();
        }
        await delay(500);
        return { success: true };
    },
    generateCoupon: async (offerId: string, email: string) => {
        if (useSupabase()) {
            const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage_coupons`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'create', offerId, email })
            });
            if (!res.ok) throw new Error("Erreur de création");
            return await res.json();
        }
        // Mock
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
