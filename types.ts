

export type SocialPlatform = 'instagram' | 'facebook' | 'linkedin' | 'tiktok';

export interface SocialPost {
    id: string;
    location_id: string;
    platform: SocialPlatform;
    content: string;
    image_url?: string; // Legacy or generated
    media_files?: File[]; // For upload handling
    media_urls?: string[]; // For storage
    scheduled_date: string; // ISO String
    status: 'scheduled' | 'published' | 'failed';
    review_id?: string; // Original review
    tags?: string[]; // Marketing tags (e.g. Promotion, Event)
    published_url?: string; // Link to the live post
}

export interface SocialTemplate {
    id: string;
    location_id?: string; // Optional (global vs local)
    name: string;
    style: {
        bg: string;
        text: string;
        font: string;
    };
    tags: string[];
}

export interface SocialLog {
    id: string;
    post_id: string;
    platform: SocialPlatform;
    status: 'success' | 'failure';
    message: string;
    created_at: string;
}

export interface AppNotification {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    read: boolean;
    created_at: string;
    link?: string;
}

export type UserRole = 'super_admin' | 'admin' | 'editor' | 'viewer';

export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    avatar?: string;
    organization_id?: string;
    organizations?: string[]; // For super admin or multi-org
}

export type IndustryType = 'restaurant' | 'hotel' | 'retail' | 'services' | 'health' | 'other';

export interface BrandSettings {
    tone: string;
    description: string;
    knowledge_base: string;
    use_emojis: boolean;
    language_style: 'formal' | 'casual';
    signature: string;
}

export interface NotificationSettings {
    email_alerts: boolean;
    alert_threshold: number;
    weekly_digest: boolean;
    digest_day: string;
    marketing_emails: boolean;
}

export interface ApiKey {
    id: string;
    name: string;
    key: string;
    created_at: string;
    last_used?: string;
}

export interface WebhookConfig {
    id: string;
    url: string;
    events: string[];
    active: boolean;
    secret: string;
    created_at: string;
}

export interface SavedReply {
    id: string;
    title: string;
    content: string;
    category: string;
}

export interface StaffMember {
    id: string;
    name: string;
    email?: string;
    role: string;
    reviews_count: number;
    average_rating: number;
    avatar?: string;
    organization_id?: string;
}

export interface Offer {
    id: string;
    title: string;
    description: string;
    code_prefix: string;
    trigger_rating: number;
    active: boolean;
    expiry_days: number;
    style?: {
        color: string;
        icon: string;
    };
    stats: {
        distributed: number;
        redeemed: number;
        revenue_generated?: number;
    };
}

export type TriggerType = 'review_created' | 'review_updated';
export type ActionType = 'generate_ai_reply' | 'auto_reply' | 'email_alert' | 'add_tag';

export interface Condition {
    id: string;
    field: string;
    operator: 'equals' | 'gte' | 'lte' | 'contains' | 'not_contains';
    value: any;
}

export interface Action {
    id: string;
    type: ActionType;
    config: any;
}

export interface WorkflowRule {
    id: string;
    name: string;
    enabled: boolean;
    trigger: TriggerType;
    conditions: Condition[];
    actions: Action[];
}

export interface Location {
    id: string;
    name: string;
    address: string;
    city: string;
    country: string;
    phone?: string;
    website?: string;
    connection_status: 'connected' | 'disconnected';
    platform_rating?: number;
    google_review_url?: string;
    facebook_review_url?: string;
    tripadvisor_review_url?: string;
    description?: string;
    public_profile_enabled?: boolean;
    booking_url?: string;
    cover_image?: string;
    external_reference?: string;
    organization_id?: string;
}

export interface Organization {
    id: string;
    name: string;
    legal_name?: string;
    siret?: string;
    address?: string;
    industry?: IndustryType;
    subscription_plan: 'free' | 'starter' | 'pro' | 'enterprise';
    created_at: string;
    locations: Location[];
    integrations: {
        google: boolean;
        facebook: boolean;
        instagram_posting: boolean;
        facebook_posting: boolean;
        linkedin_posting: boolean;
        tiktok_posting: boolean;
    };
    brand?: BrandSettings;
    notification_settings?: NotificationSettings;
    api_keys?: ApiKey[];
    webhooks?: WebhookConfig[];
    saved_replies?: SavedReply[];
    staff_members?: StaffMember[];
    offers?: Offer[];
    ai_usage_count?: number;
    stripe_customer_id?: string;
    workflows?: WorkflowRule[];
}

export type ReviewStatus = 'pending' | 'draft' | 'sent' | 'manual';

export interface InternalNote {
    id: string;
    text: string;
    author_name: string;
    created_at: string;
}

export interface ReviewAnalysis {
    sentiment: 'positive' | 'negative' | 'neutral';
    themes: string[];
    keywords: string[];
    emotion?: string;
    summary?: string;
    flags?: {
        hygiene?: boolean;
        discrimination?: boolean;
        security?: boolean;
        staff_conflict?: boolean;
        pricing_issue?: boolean;
    };
}

export interface AiReply {
    text: string;
    tone?: string;
    model_used?: string;
    created_at: string;
    needs_manual_validation?: boolean;
    reasons_for_validation?: string[];
}

export interface Review {
    id: string;
    source: string;
    location_id: string;
    rating: number;
    language: string;
    author_name: string;
    body: string; // mapped from text in UI
    text?: string; // DB field usually
    received_at: string;
    status: ReviewStatus;
    analysis?: ReviewAnalysis;
    ai_reply?: AiReply;
    posted_reply?: string;
    replied_at?: string;
    internal_notes?: InternalNote[];
    tags?: string[];
    external_id?: string;
    staff_attributed_to?: string;
    assigned_to?: string;
    archived?: boolean;
}

export interface ReviewTimelineEvent {
    id: string;
    type: 'review_created' | 'ai_analysis' | 'draft_generated' | 'note' | 'reply_published';
    actor_name: string;
    date: string;
    content?: string;
}

export interface AnalyticsSummary {
    period: string;
    total_reviews: number;
    average_rating: number;
    response_rate: number;
    nps_score: number;
    global_rating: number;
    sentiment_distribution: {
        positive: number;
        neutral: number;
        negative: number;
    };
    volume_by_date: { date: string; count: number }[];
    top_themes_positive: { name: string; weight: number }[];
    top_themes_negative: { name: string; weight: number }[];
    top_keywords: { keyword: string; count: number }[];
    strengths_summary: string;
    problems_summary: string;
}

export interface ReportConfig {
    id: string;
    name: string;
    format: 'pdf' | 'csv';
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    enabled: boolean;
    last_sent?: string;
}

export interface Competitor {
    id: string;
    name: string;
    rating: number;
    review_count: number;
    address: string;
    strengths: string[];
    weaknesses: string[];
    organization_id?: string;
    threat_level?: number;
    sentiment_trend?: string;
    last_month_growth?: string;
    top_complaint?: string;
    url?: string;
    distance?: string;
}

export interface MarketReport {
    id: string;
    created_at: string;
    sector: string;
    location: string;
    trends: string[];
    swot: {
        strengths: string[];
        weaknesses: string[];
        opportunities: string[];
        threats: string[];
    };
    competitors_detailed: any[];
    data?: any;
}

export interface SetupStatus {
    completionPercentage: number;
    googleConnected: boolean;
    brandVoiceConfigured: boolean;
    firstReviewReplied: boolean;
}

export interface Coupon {
    id: string;
    code: string;
    offer_id: string;
    customer_email: string;
    status: 'active' | 'redeemed' | 'expired';
    expires_at: string;
    offer_title?: string;
    discount_detail?: string;
    redeemed_at?: string;
}

export type PipelineStage = 'new' | 'risk' | 'loyal' | 'churned';

export interface Customer {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    source: string;
    stage: PipelineStage;
    average_rating: number;
    total_reviews: number;
    ltv_estimate?: number;
    last_interaction: string;
    status: 'promoter' | 'detractor' | 'passive';
    tags?: string[];
    ai_insight?: {
        profile: string;
        suggestion: string;
    };
    history?: {
        type: string;
        date: string;
        details: string;
        sentiment?: string;
    }[];
}

export interface SocialAccount {
    id: string;
    location_id?: string; // Linked to specific location
    platform: SocialPlatform;
    name: string;
    avatar_url?: string;
    connected_at?: string;
}