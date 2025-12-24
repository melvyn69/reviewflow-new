


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."ensure_user_org"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  org_id uuid;
begin
  select organization_id into org_id
  from public.users
  where id = auth.uid();

  if org_id is not null then
    return org_id;
  end if;

  insert into public.organizations (id, name)
  values (gen_random_uuid(), 'My Organization')
  returning id into org_id;

  update public.users
  set organization_id = org_id
  where id = auth.uid();

  return org_id;
end;
$$;


ALTER FUNCTION "public"."ensure_user_org"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_auth_org_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT organization_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;


ALTER FUNCTION "public"."get_auth_org_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_dashboard_stats"("org_id" "uuid") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  total_reviews int;
  avg_rating numeric;
  response_rate numeric;
  nps_score int;
BEGIN
  SELECT count(*) INTO total_reviews FROM reviews r JOIN locations l ON r.location_id = l.id WHERE l.organization_id = org_id;
  SELECT coalesce(avg(rating), 0) INTO avg_rating FROM reviews r JOIN locations l ON r.location_id = l.id WHERE l.organization_id = org_id;
  SELECT CASE WHEN count(*) = 0 THEN 0 ELSE (count(CASE WHEN status = 'sent' THEN 1 END)::numeric / count(*)::numeric) * 100 END INTO response_rate FROM reviews r JOIN locations l ON r.location_id = l.id WHERE l.organization_id = org_id;
  SELECT CASE WHEN count(*) = 0 THEN 0 ELSE ((count(CASE WHEN rating = 5 THEN 1 END)::numeric - count(CASE WHEN rating <= 3 THEN 1 END)::numeric) / count(*)::numeric) * 100 END INTO nps_score FROM reviews r JOIN locations l ON r.location_id = l.id WHERE l.organization_id = org_id;
  
  RETURN json_build_object(
    'total_reviews', total_reviews, 
    'average_rating', round(avg_rating, 1), 
    'response_rate', round(response_rate, 0), 
    'nps_score', round(nps_score, 0)
  );
END;
$$;


ALTER FUNCTION "public"."get_dashboard_stats"("org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_org_id"() RETURNS "uuid"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT organization_id FROM public.users WHERE id = auth.uid();
$$;


ALTER FUNCTION "public"."get_user_org_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.users (id, email, name, role, created_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    'member',
    now()
  )
  on conflict (id) do update
    set email = excluded.email;

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_offer_stat"("row_id" "uuid", "field" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE public.offers
  SET stats = jsonb_set(stats, ARRAY[field], (COALESCE((stats->>field)::int, 0) + 1)::text::jsonb)
  WHERE id = row_id;
END;
$$;


ALTER FUNCTION "public"."increment_offer_stat"("row_id" "uuid", "field" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."ai_usage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "model" "text",
    "tokens_estimated" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ai_usage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."automation_logs" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "review_id" "uuid",
    "organization_id" "uuid",
    "status" "text" NOT NULL,
    "model_used" "text",
    "error_message" "text",
    "payload" "jsonb"
);


ALTER TABLE "public"."automation_logs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."automation_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."automation_logs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."automation_logs_id_seq" OWNED BY "public"."automation_logs"."id";



CREATE TABLE IF NOT EXISTS "public"."billing_invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "stripe_invoice_id" "text",
    "amount" integer,
    "currency" "text",
    "status" "text",
    "date" timestamp with time zone,
    "pdf_url" "text",
    "number" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."billing_invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."competitors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "name" "text" NOT NULL,
    "rating" numeric(2,1),
    "review_count" integer,
    "address" "text",
    "strengths" "text"[],
    "weaknesses" "text"[],
    "url" "text",
    "distance" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."competitors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coupons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "offer_id" "uuid",
    "code" "text" NOT NULL,
    "customer_email" "text",
    "status" "text" DEFAULT 'active'::"text",
    "expires_at" timestamp with time zone,
    "redeemed_at" timestamp with time zone,
    "offer_title" "text",
    "discount_detail" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."coupons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "source" "text",
    "stage" "text" DEFAULT 'new'::"text",
    "status" "text" DEFAULT 'passive'::"text",
    "average_rating" numeric(2,1),
    "total_reviews" integer DEFAULT 0,
    "ltv_estimate" numeric(10,2),
    "last_interaction" timestamp with time zone,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "ai_insight" "jsonb",
    "history" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "name" "text" NOT NULL,
    "address" "text",
    "city" "text",
    "country" "text" DEFAULT 'France'::"text",
    "phone" "text",
    "website" "text",
    "connection_status" "text" DEFAULT 'disconnected'::"text",
    "platform_rating" numeric(2,1),
    "google_review_url" "text",
    "facebook_review_url" "text",
    "tripadvisor_review_url" "text",
    "booking_url" "text",
    "cover_image" "text",
    "external_reference" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."market_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "organization_id" "uuid",
    "sector" "text",
    "location" "text",
    "trends" "text"[],
    "swot" "jsonb",
    "competitors_detailed" "jsonb",
    "data" "jsonb"
);


ALTER TABLE "public"."market_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."offers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "code_prefix" "text",
    "trigger_rating" integer,
    "active" boolean DEFAULT true,
    "expiry_days" integer DEFAULT 30,
    "validity_start" timestamp with time zone,
    "validity_end" timestamp with time zone,
    "style" "jsonb",
    "stats" "jsonb" DEFAULT '{"redeemed": 0, "distributed": 0}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."offers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "legal_name" "text",
    "siret" "text",
    "address" "text",
    "industry" "text" DEFAULT 'restaurant'::"text",
    "subscription_plan" "text" DEFAULT 'free'::"text",
    "subscription_status" "text" DEFAULT 'active'::"text",
    "current_period_end" timestamp with time zone,
    "stripe_customer_id" "text",
    "google_refresh_token" "text",
    "google_access_token" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "integrations" "jsonb" DEFAULT '{}'::"jsonb",
    "brand" "jsonb" DEFAULT '{}'::"jsonb",
    "notification_settings" "jsonb" DEFAULT '{}'::"jsonb",
    "twilio_settings" "jsonb" DEFAULT '{}'::"jsonb",
    "api_keys" "jsonb" DEFAULT '[]'::"jsonb",
    "webhooks" "jsonb" DEFAULT '[]'::"jsonb",
    "saved_replies" "jsonb" DEFAULT '[]'::"jsonb",
    "workflows" "jsonb" DEFAULT '[]'::"jsonb",
    "reports_config" "jsonb" DEFAULT '[]'::"jsonb"
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "location_id" "uuid",
    "external_id" "text",
    "source" "text" NOT NULL,
    "rating" integer NOT NULL,
    "text" "text",
    "author_name" "text",
    "language" "text" DEFAULT 'fr'::"text",
    "received_at" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "analysis" "jsonb" DEFAULT '{}'::"jsonb",
    "ai_reply" "jsonb" DEFAULT '{}'::"jsonb",
    "posted_reply" "text",
    "replied_at" timestamp with time zone,
    "internal_notes" "jsonb" DEFAULT '[]'::"jsonb",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "staff_attributed_to" "text",
    "archived" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."social_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "platform" "text" NOT NULL,
    "access_token" "text",
    "refresh_token" "text",
    "token_expires_at" timestamp with time zone,
    "external_id" "text",
    "name" "text",
    "avatar_url" "text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."social_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."social_posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "location_id" "uuid",
    "platform" "text" NOT NULL,
    "content" "text",
    "image_url" "text",
    "scheduled_date" timestamp with time zone,
    "status" "text" DEFAULT 'scheduled'::"text",
    "review_id" "uuid",
    "published_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."social_posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "name" "text" NOT NULL,
    "email" "text",
    "role" "text",
    "reviews_count" integer DEFAULT 0,
    "average_rating" numeric(2,1) DEFAULT 0,
    "avatar" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."staff_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "name" "text",
    "role" "text" DEFAULT 'viewer'::"text",
    "avatar_url" "text",
    "organization_id" "uuid",
    "is_super_admin" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."automation_logs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."automation_logs_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."ai_usage"
    ADD CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."automation_logs"
    ADD CONSTRAINT "automation_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_invoices"
    ADD CONSTRAINT "billing_invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_invoices"
    ADD CONSTRAINT "billing_invoices_stripe_invoice_id_key" UNIQUE ("stripe_invoice_id");



ALTER TABLE ONLY "public"."competitors"
    ADD CONSTRAINT "competitors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coupons"
    ADD CONSTRAINT "coupons_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."coupons"
    ADD CONSTRAINT "coupons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."market_reports"
    ADD CONSTRAINT "market_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."offers"
    ADD CONSTRAINT "offers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_external_id_key" UNIQUE ("external_id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."social_accounts"
    ADD CONSTRAINT "social_accounts_organization_id_platform_external_id_key" UNIQUE ("organization_id", "platform", "external_id");



ALTER TABLE ONLY "public"."social_accounts"
    ADD CONSTRAINT "social_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."social_posts"
    ADD CONSTRAINT "social_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_members"
    ADD CONSTRAINT "staff_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "reviews_source_external_unique" ON "public"."reviews" USING "btree" ("source", "external_id");



CREATE UNIQUE INDEX "social_accounts_org_platform_unique" ON "public"."social_accounts" USING "btree" ("organization_id", "platform");



ALTER TABLE ONLY "public"."ai_usage"
    ADD CONSTRAINT "ai_usage_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."billing_invoices"
    ADD CONSTRAINT "billing_invoices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."competitors"
    ADD CONSTRAINT "competitors_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coupons"
    ADD CONSTRAINT "coupons_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."offers"
    ADD CONSTRAINT "offers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."social_accounts"
    ADD CONSTRAINT "social_accounts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."social_posts"
    ADD CONSTRAINT "social_posts_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."social_posts"
    ADD CONSTRAINT "social_posts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."social_posts"
    ADD CONSTRAINT "social_posts_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_members"
    ADD CONSTRAINT "staff_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



CREATE POLICY "Competitors access" ON "public"."competitors" USING (("organization_id" = "public"."get_user_org_id"()));



CREATE POLICY "Coupons access" ON "public"."coupons" FOR SELECT USING (("offer_id" IN ( SELECT "offers"."id"
   FROM "public"."offers"
  WHERE ("offers"."organization_id" = "public"."get_user_org_id"()))));



CREATE POLICY "Customers access" ON "public"."customers" USING (("organization_id" = "public"."get_user_org_id"()));



CREATE POLICY "Invoices access" ON "public"."billing_invoices" FOR SELECT USING (("organization_id" = "public"."get_user_org_id"()));



CREATE POLICY "Offers access" ON "public"."offers" USING (("organization_id" = "public"."get_user_org_id"()));



CREATE POLICY "Social posts access" ON "public"."social_posts" USING (("organization_id" = "public"."get_user_org_id"()));



CREATE POLICY "Staff access" ON "public"."staff_members" USING (("organization_id" = "public"."get_user_org_id"()));



CREATE POLICY "Users can insert own profile" ON "public"."users" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own org" ON "public"."organizations" FOR UPDATE USING (("id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



CREATE POLICY "Users can update own organization" ON "public"."organizations" FOR UPDATE USING (("id" = "public"."get_user_org_id"()));



CREATE POLICY "Users can update own profile" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own org" ON "public"."organizations" FOR SELECT USING (("id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view own organization data" ON "public"."organizations" FOR SELECT USING (("id" = "public"."get_user_org_id"()));



CREATE POLICY "Users view profiles in same org" ON "public"."users" FOR SELECT USING ((("organization_id" = "public"."get_user_org_id"()) OR ("id" = "auth"."uid"())));



CREATE POLICY "View org reports" ON "public"."market_reports" USING (("organization_id" = "public"."get_auth_org_id"()));



ALTER TABLE "public"."automation_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."billing_invoices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."competitors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coupons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."locations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."market_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."offers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "org can insert locations" ON "public"."locations" FOR INSERT WITH CHECK (("organization_id" = "public"."get_user_org_id"()));



CREATE POLICY "org can insert reviews" ON "public"."reviews" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."locations" "l"
  WHERE (("l"."id" = "reviews"."location_id") AND ("l"."organization_id" = "public"."get_user_org_id"())))));



CREATE POLICY "org can insert social_accounts" ON "public"."social_accounts" FOR INSERT WITH CHECK (("organization_id" = "public"."get_user_org_id"()));



CREATE POLICY "org can read locations" ON "public"."locations" FOR SELECT USING (("organization_id" = "public"."get_user_org_id"()));



CREATE POLICY "org can read reviews" ON "public"."reviews" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."locations" "l"
  WHERE (("l"."id" = "reviews"."location_id") AND ("l"."organization_id" = "public"."get_user_org_id"())))));



CREATE POLICY "org can read social_accounts" ON "public"."social_accounts" FOR SELECT USING (("organization_id" = "public"."get_user_org_id"()));



CREATE POLICY "org can update locations" ON "public"."locations" FOR UPDATE USING (("organization_id" = "public"."get_user_org_id"()));



CREATE POLICY "org can update reviews" ON "public"."reviews" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."locations" "l"
  WHERE (("l"."id" = "reviews"."location_id") AND ("l"."organization_id" = "public"."get_user_org_id"())))));



CREATE POLICY "org can update social_accounts" ON "public"."social_accounts" FOR UPDATE USING (("organization_id" = "public"."get_user_org_id"()));



ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."social_accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."social_posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staff_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_user_org"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_user_org"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_user_org"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_auth_org_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_auth_org_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_auth_org_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_dashboard_stats"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_dashboard_stats"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_dashboard_stats"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_org_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_org_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_org_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_offer_stat"("row_id" "uuid", "field" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_offer_stat"("row_id" "uuid", "field" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_offer_stat"("row_id" "uuid", "field" "text") TO "service_role";



GRANT ALL ON TABLE "public"."ai_usage" TO "anon";
GRANT ALL ON TABLE "public"."ai_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_usage" TO "service_role";



GRANT ALL ON TABLE "public"."automation_logs" TO "anon";
GRANT ALL ON TABLE "public"."automation_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."automation_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."automation_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."automation_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."automation_logs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."billing_invoices" TO "anon";
GRANT ALL ON TABLE "public"."billing_invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_invoices" TO "service_role";



GRANT ALL ON TABLE "public"."competitors" TO "anon";
GRANT ALL ON TABLE "public"."competitors" TO "authenticated";
GRANT ALL ON TABLE "public"."competitors" TO "service_role";



GRANT ALL ON TABLE "public"."coupons" TO "anon";
GRANT ALL ON TABLE "public"."coupons" TO "authenticated";
GRANT ALL ON TABLE "public"."coupons" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."locations" TO "anon";
GRANT ALL ON TABLE "public"."locations" TO "authenticated";
GRANT ALL ON TABLE "public"."locations" TO "service_role";



GRANT ALL ON TABLE "public"."market_reports" TO "anon";
GRANT ALL ON TABLE "public"."market_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."market_reports" TO "service_role";



GRANT ALL ON TABLE "public"."offers" TO "anon";
GRANT ALL ON TABLE "public"."offers" TO "authenticated";
GRANT ALL ON TABLE "public"."offers" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."reviews" TO "anon";
GRANT ALL ON TABLE "public"."reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews" TO "service_role";



GRANT ALL ON TABLE "public"."social_accounts" TO "anon";
GRANT ALL ON TABLE "public"."social_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."social_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."social_posts" TO "anon";
GRANT ALL ON TABLE "public"."social_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."social_posts" TO "service_role";



GRANT ALL ON TABLE "public"."staff_members" TO "anon";
GRANT ALL ON TABLE "public"."staff_members" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_members" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







