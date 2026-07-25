


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



CREATE TYPE "public"."place_level" AS ENUM (
    'country',
    'state',
    'city',
    'village',
    'attraction'
);


ALTER TYPE "public"."place_level" OWNER TO "postgres";


CREATE TYPE "public"."relation_type" AS ENUM (
    'contains',
    'nearby',
    'route_stop'
);


ALTER TYPE "public"."relation_type" OWNER TO "postgres";


CREATE TYPE "public"."stop_type" AS ENUM (
    'breakfast',
    'lunch',
    'fuel',
    'viewpoint',
    'waterfall',
    'photo_spot',
    'hidden_gem',
    'rest_area',
    'restaurant',
    'other'
);


ALTER TYPE "public"."stop_type" OWNER TO "postgres";


CREATE TYPE "public"."tip_type" AS ENUM (
    'hidden_place',
    'best_chai',
    'photography_spot',
    'parking',
    'road_condition',
    'sunrise_point',
    'sunset_point',
    'washroom',
    'pet_friendly',
    'safety'
);


ALTER TYPE "public"."tip_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_route"("start_slug" "text", "end_slug" "text") RETURNS TABLE("route_id" "uuid", "route_slug" "text", "route_name" "text", "distance_km" numeric, "duration_min" integer)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select r.id, r.slug, r.name, r.distance_km, r.duration_min
  from routes r
  join places s on s.id = r.start_place_id and s.slug = start_slug
  join places e on e.id = r.end_place_id and e.slug = end_slug;
$$;


ALTER FUNCTION "public"."get_route"("start_slug" "text", "end_slug" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  begin
    insert into public.profiles (id, display_name)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
    )
    on conflict (id) do nothing;
    return new;
  end;
  $$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_place_rating"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  update places
  set rating = (select coalesce(round(avg(rating), 1), 0) from reviews where place_id = coalesce(new.place_id, old.place_id)),
      review_count = (select count(*) from reviews where place_id = coalesce(new.place_id, old.place_id))
  where id = coalesce(new.place_id, old.place_id);
  return null;
end;
$$;


ALTER FUNCTION "public"."refresh_place_rating"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "icon" "text"
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."place_categories" (
    "place_id" "uuid" NOT NULL,
    "category_id" "uuid" NOT NULL
);


ALTER TABLE "public"."place_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."places" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "level" "public"."place_level" NOT NULL,
    "parent_id" "uuid",
    "city" "text",
    "state" "text",
    "country" "text" DEFAULT 'India'::"text",
    "location" "public"."geography"(Point,4326),
    "address" "text",
    "description" "text",
    "cover_image" "text",
    "rating" numeric(2,1) DEFAULT 0,
    "review_count" integer DEFAULT 0,
    "facts" "jsonb" DEFAULT '[]'::"jsonb",
    "is_pet_friendly" boolean,
    "has_parking" boolean,
    "has_washroom" boolean,
    "is_published" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "search_vector" "tsvector" GENERATED ALWAYS AS ((("setweight"("to_tsvector"('"english"'::"regconfig", COALESCE("name", ''::"text")), 'A'::"char") || "setweight"("to_tsvector"('"english"'::"regconfig", ((COALESCE("city", ''::"text") || ' '::"text") || COALESCE("state", ''::"text"))), 'B'::"char")) || "setweight"("to_tsvector"('"english"'::"regconfig", COALESCE("description", ''::"text")), 'C'::"char"))) STORED,
    "google_place_id" "text"
);


ALTER TABLE "public"."places" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_place_card" WITH ("security_invoker"='true') AS
 SELECT "id",
    "slug",
    "name" AS "title",
    "level",
    COALESCE(NULLIF("city", ''::"text"), "state", "country") AS "location",
    "cover_image" AS "image",
    "rating",
    "review_count",
    ('/place/'::"text" || "slug") AS "href",
    ARRAY( SELECT "c"."slug"
           FROM ("public"."place_categories" "pc"
             JOIN "public"."categories" "c" ON (("c"."id" = "pc"."category_id")))
          WHERE ("pc"."place_id" = "p"."id")) AS "category_slugs"
   FROM "public"."places" "p"
  WHERE ("is_published" = true);


ALTER VIEW "public"."v_place_card" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_places"("q" "text", "result_limit" integer DEFAULT 20) RETURNS SETOF "public"."v_place_card"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select vpc.*
  from v_place_card vpc
  join places p on p.id = vpc.id
  where p.search_vector @@ plainto_tsquery('english', q)
     or p.name % q                              -- trigram similarity match
  order by
    ts_rank(p.search_vector, plainto_tsquery('english', q)) desc,
    similarity(p.name, q) desc
  limit result_limit;
$$;


ALTER FUNCTION "public"."search_places"("q" "text", "result_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_places_by_category_near"("category_slug" "text", "near_slug" "text", "radius_km" integer DEFAULT 50, "result_limit" integer DEFAULT 20) RETURNS SETOF "public"."v_place_card"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select vpc.*
  from v_place_card vpc
  join places p on p.id = vpc.id
  join place_categories pc on pc.place_id = p.id
  join categories c on c.id = pc.category_id and c.slug = category_slug
  join places center on center.slug = near_slug
  where ST_DWithin(p.location, center.location, radius_km * 1000)
  order by ST_Distance(p.location, center.location) asc
  limit result_limit;
$$;


ALTER FUNCTION "public"."search_places_by_category_near"("category_slug" "text", "near_slug" "text", "radius_km" integer, "result_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_places_nearby"("lat" double precision, "lng" double precision, "radius_km" integer DEFAULT 25, "result_limit" integer DEFAULT 20) RETURNS SETOF "public"."v_place_card"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select vpc.*
  from v_place_card vpc
  join places p on p.id = vpc.id
  where ST_DWithin(
    p.location,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
    radius_km * 1000
  )
  order by ST_Distance(
    p.location,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
  ) asc
  limit result_limit;
$$;


ALTER FUNCTION "public"."search_places_nearby"("lat" double precision, "lng" double precision, "radius_km" integer, "result_limit" integer) OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."collection_items" (
    "collection_id" "uuid" NOT NULL,
    "place_id" "uuid" NOT NULL,
    "sort_order" integer DEFAULT 0,
    "added_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."collection_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."collections" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "is_public" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_system" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."collections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."community_comment_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "comment_id" "uuid" NOT NULL,
    "reporter_id" "uuid" NOT NULL,
    "reason" "text" DEFAULT 'Reported by a community member'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."community_comment_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."community_tip_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tip_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "community_tip_comments_content_check" CHECK ((("char_length"(TRIM(BOTH FROM "content")) >= 1) AND ("char_length"(TRIM(BOTH FROM "content")) <= 1000)))
);


ALTER TABLE "public"."community_tip_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."community_tip_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tip_id" "uuid" NOT NULL,
    "reporter_id" "uuid" NOT NULL,
    "reason" "text" DEFAULT 'Reported by a community member'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."community_tip_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."community_tip_votes" (
    "tip_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."community_tip_votes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."community_tips" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "place_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "tip_type" "public"."tip_type" NOT NULL,
    "content" "text" NOT NULL,
    "upvotes" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."community_tips" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."place_images" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "place_id" "uuid" NOT NULL,
    "url" "text" NOT NULL,
    "alt_text" "text",
    "sort_order" integer DEFAULT 0
);


ALTER TABLE "public"."place_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."place_relations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "place_id" "uuid" NOT NULL,
    "related_place_id" "uuid" NOT NULL,
    "relation_type" "public"."relation_type" NOT NULL,
    "distance_km" numeric(6,2),
    "sort_order" integer DEFAULT 0
);


ALTER TABLE "public"."place_relations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "display_name" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "place_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "rating" numeric(2,1) NOT NULL,
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "reviews_rating_check" CHECK ((("rating" >= (0)::numeric) AND ("rating" <= (5)::numeric)))
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."route_stops" (
    "route_id" "uuid" NOT NULL,
    "place_id" "uuid" NOT NULL,
    "stop_type" "public"."stop_type" NOT NULL,
    "sort_order" integer NOT NULL,
    "notes" "text"
);


ALTER TABLE "public"."route_stops" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."routes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "start_place_id" "uuid" NOT NULL,
    "end_place_id" "uuid" NOT NULL,
    "distance_km" numeric(6,2),
    "duration_min" integer,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."routes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."saved_routes" (
    "user_id" "uuid" NOT NULL,
    "route_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."saved_routes" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_category_card" WITH ("security_invoker"='true') AS
 SELECT "c"."id",
    "c"."slug",
    "c"."name" AS "title",
    "c"."icon",
    "count"("pc"."place_id") AS "place_count"
   FROM (("public"."categories" "c"
     LEFT JOIN "public"."place_categories" "pc" ON (("pc"."category_id" = "c"."id")))
     LEFT JOIN "public"."places" "p" ON ((("p"."id" = "pc"."place_id") AND ("p"."is_published" = true))))
  GROUP BY "c"."id", "c"."slug", "c"."name", "c"."icon";


ALTER VIEW "public"."v_category_card" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_place_relations_card" WITH ("security_invoker"='true') AS
 SELECT "pr"."place_id",
    "pr"."relation_type",
    "pr"."sort_order",
    "pr"."distance_km",
    "vpc"."id",
    "vpc"."slug",
    "vpc"."title",
    "vpc"."level",
    "vpc"."location",
    "vpc"."image",
    "vpc"."rating",
    "vpc"."review_count",
    "vpc"."href",
    "vpc"."category_slugs"
   FROM ("public"."place_relations" "pr"
     JOIN "public"."v_place_card" "vpc" ON (("vpc"."id" = "pr"."related_place_id")));


ALTER VIEW "public"."v_place_relations_card" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_route_stop_card" WITH ("security_invoker"='true') AS
 SELECT "rs"."route_id",
    "rs"."stop_type",
    "rs"."sort_order",
    "rs"."notes",
    "vpc"."id",
    "vpc"."slug",
    "vpc"."title",
    "vpc"."level",
    "vpc"."location",
    "vpc"."image",
    "vpc"."rating",
    "vpc"."review_count",
    "vpc"."href",
    "vpc"."category_slugs"
   FROM ("public"."route_stops" "rs"
     JOIN "public"."v_place_card" "vpc" ON (("vpc"."id" = "rs"."place_id")));


ALTER VIEW "public"."v_route_stop_card" OWNER TO "postgres";


ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."collection_items"
    ADD CONSTRAINT "collection_items_pkey" PRIMARY KEY ("collection_id", "place_id");



ALTER TABLE ONLY "public"."collections"
    ADD CONSTRAINT "collections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_comment_reports"
    ADD CONSTRAINT "community_comment_reports_comment_id_reporter_id_key" UNIQUE ("comment_id", "reporter_id");



ALTER TABLE ONLY "public"."community_comment_reports"
    ADD CONSTRAINT "community_comment_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_tip_comments"
    ADD CONSTRAINT "community_tip_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_tip_reports"
    ADD CONSTRAINT "community_tip_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_tip_reports"
    ADD CONSTRAINT "community_tip_reports_tip_id_reporter_id_key" UNIQUE ("tip_id", "reporter_id");



ALTER TABLE ONLY "public"."community_tip_votes"
    ADD CONSTRAINT "community_tip_votes_pkey" PRIMARY KEY ("tip_id", "user_id");



ALTER TABLE ONLY "public"."community_tips"
    ADD CONSTRAINT "community_tips_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."place_categories"
    ADD CONSTRAINT "place_categories_pkey" PRIMARY KEY ("place_id", "category_id");



ALTER TABLE ONLY "public"."place_images"
    ADD CONSTRAINT "place_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."place_relations"
    ADD CONSTRAINT "place_relations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."place_relations"
    ADD CONSTRAINT "place_relations_place_id_related_place_id_relation_type_key" UNIQUE ("place_id", "related_place_id", "relation_type");



ALTER TABLE ONLY "public"."places"
    ADD CONSTRAINT "places_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."places"
    ADD CONSTRAINT "places_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_place_id_user_id_key" UNIQUE ("place_id", "user_id");



ALTER TABLE ONLY "public"."route_stops"
    ADD CONSTRAINT "route_stops_pkey" PRIMARY KEY ("route_id", "place_id", "stop_type");



ALTER TABLE ONLY "public"."routes"
    ADD CONSTRAINT "routes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."routes"
    ADD CONSTRAINT "routes_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."saved_routes"
    ADD CONSTRAINT "saved_routes_pkey" PRIMARY KEY ("user_id", "route_id");



CREATE INDEX "collection_items_place_idx" ON "public"."collection_items" USING "btree" ("place_id");



CREATE UNIQUE INDEX "collections_one_system_per_user_idx" ON "public"."collections" USING "btree" ("user_id") WHERE ("is_system" = true);



CREATE INDEX "collections_user_created_idx" ON "public"."collections" USING "btree" ("user_id", "created_at");



CREATE INDEX "community_comment_reports_reporter_idx" ON "public"."community_comment_reports" USING "btree" ("reporter_id", "created_at" DESC);



CREATE INDEX "community_tip_comments_tip_created_idx" ON "public"."community_tip_comments" USING "btree" ("tip_id", "created_at" DESC);



CREATE INDEX "community_tip_comments_user_idx" ON "public"."community_tip_comments" USING "btree" ("user_id");



CREATE INDEX "community_tip_reports_reporter_idx" ON "public"."community_tip_reports" USING "btree" ("reporter_id", "created_at" DESC);



CREATE INDEX "community_tip_votes_tip_idx" ON "public"."community_tip_votes" USING "btree" ("tip_id");



CREATE INDEX "community_tip_votes_user_idx" ON "public"."community_tip_votes" USING "btree" ("user_id");



CREATE INDEX "community_tips_user_idx" ON "public"."community_tips" USING "btree" ("user_id");



CREATE INDEX "idx_community_tips_place" ON "public"."community_tips" USING "btree" ("place_id", "tip_type");



CREATE INDEX "idx_place_categories_category" ON "public"."place_categories" USING "btree" ("category_id");



CREATE INDEX "idx_place_images_place" ON "public"."place_images" USING "btree" ("place_id", "sort_order");



CREATE INDEX "idx_place_relations_place" ON "public"."place_relations" USING "btree" ("place_id", "relation_type");



CREATE INDEX "idx_places_level" ON "public"."places" USING "btree" ("level");



CREATE INDEX "idx_places_location" ON "public"."places" USING "gist" ("location");



CREATE INDEX "idx_places_name_trgm" ON "public"."places" USING "gin" ("name" "public"."gin_trgm_ops");



CREATE INDEX "idx_places_parent" ON "public"."places" USING "btree" ("parent_id");



CREATE INDEX "idx_places_search_vector" ON "public"."places" USING "gin" ("search_vector");



CREATE INDEX "idx_places_slug" ON "public"."places" USING "btree" ("slug");



CREATE INDEX "idx_reviews_place" ON "public"."reviews" USING "btree" ("place_id");



CREATE INDEX "place_categories_category_id_idx" ON "public"."place_categories" USING "btree" ("category_id", "place_id");



CREATE INDEX "place_relations_lookup_idx" ON "public"."place_relations" USING "btree" ("place_id", "relation_type", "sort_order");



CREATE INDEX "place_relations_related_place_idx" ON "public"."place_relations" USING "btree" ("related_place_id");



CREATE UNIQUE INDEX "places_google_place_id_unique" ON "public"."places" USING "btree" ("google_place_id") WHERE ("google_place_id" IS NOT NULL);



CREATE INDEX "places_parent_published_idx" ON "public"."places" USING "btree" ("parent_id", "is_published");



CREATE INDEX "reviews_user_idx" ON "public"."reviews" USING "btree" ("user_id");



CREATE INDEX "route_stops_place_idx" ON "public"."route_stops" USING "btree" ("place_id");



CREATE INDEX "route_stops_route_sort_idx" ON "public"."route_stops" USING "btree" ("route_id", "sort_order");



CREATE INDEX "routes_end_place_idx" ON "public"."routes" USING "btree" ("end_place_id");



CREATE INDEX "routes_start_place_idx" ON "public"."routes" USING "btree" ("start_place_id");



CREATE INDEX "saved_routes_route_idx" ON "public"."saved_routes" USING "btree" ("route_id");



CREATE OR REPLACE TRIGGER "trg_refresh_place_rating" AFTER INSERT OR DELETE OR UPDATE ON "public"."reviews" FOR EACH ROW EXECUTE FUNCTION "public"."refresh_place_rating"();



ALTER TABLE ONLY "public"."collection_items"
    ADD CONSTRAINT "collection_items_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."collection_items"
    ADD CONSTRAINT "collection_items_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."collections"
    ADD CONSTRAINT "collections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_comment_reports"
    ADD CONSTRAINT "community_comment_reports_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."community_tip_comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_comment_reports"
    ADD CONSTRAINT "community_comment_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_tip_comments"
    ADD CONSTRAINT "community_tip_comments_tip_id_fkey" FOREIGN KEY ("tip_id") REFERENCES "public"."community_tips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_tip_comments"
    ADD CONSTRAINT "community_tip_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_tip_reports"
    ADD CONSTRAINT "community_tip_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_tip_reports"
    ADD CONSTRAINT "community_tip_reports_tip_id_fkey" FOREIGN KEY ("tip_id") REFERENCES "public"."community_tips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_tip_votes"
    ADD CONSTRAINT "community_tip_votes_tip_id_fkey" FOREIGN KEY ("tip_id") REFERENCES "public"."community_tips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_tip_votes"
    ADD CONSTRAINT "community_tip_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_tips"
    ADD CONSTRAINT "community_tips_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_tips"
    ADD CONSTRAINT "community_tips_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."place_categories"
    ADD CONSTRAINT "place_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."place_categories"
    ADD CONSTRAINT "place_categories_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."place_images"
    ADD CONSTRAINT "place_images_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."place_relations"
    ADD CONSTRAINT "place_relations_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."place_relations"
    ADD CONSTRAINT "place_relations_related_place_id_fkey" FOREIGN KEY ("related_place_id") REFERENCES "public"."places"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."places"
    ADD CONSTRAINT "places_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."places"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."route_stops"
    ADD CONSTRAINT "route_stops_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."route_stops"
    ADD CONSTRAINT "route_stops_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."routes"
    ADD CONSTRAINT "routes_end_place_id_fkey" FOREIGN KEY ("end_place_id") REFERENCES "public"."places"("id");



ALTER TABLE ONLY "public"."routes"
    ADD CONSTRAINT "routes_start_place_id_fkey" FOREIGN KEY ("start_place_id") REFERENCES "public"."places"("id");



ALTER TABLE ONLY "public"."saved_routes"
    ADD CONSTRAINT "saved_routes_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."saved_routes"
    ADD CONSTRAINT "saved_routes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Public or owner collection reads" ON "public"."collections" FOR SELECT TO "authenticated", "anon" USING ((("is_public" = true) OR (( SELECT "auth"."uid"() AS "uid") = "user_id")));



CREATE POLICY "Public read access to categories" ON "public"."categories" FOR SELECT USING (true);



CREATE POLICY "Public read access to community_tips" ON "public"."community_tips" FOR SELECT USING (true);



CREATE POLICY "Public read access to place_categories" ON "public"."place_categories" FOR SELECT USING (true);



CREATE POLICY "Public read access to place_images" ON "public"."place_images" FOR SELECT USING (true);



CREATE POLICY "Public read access to place_relations" ON "public"."place_relations" FOR SELECT USING (true);



CREATE POLICY "Public read access to published places" ON "public"."places" FOR SELECT USING (("is_published" = true));



CREATE POLICY "Public read access to reviews" ON "public"."reviews" FOR SELECT USING (true);



CREATE POLICY "Public read access to route_stops" ON "public"."route_stops" FOR SELECT USING (true);



CREATE POLICY "Public read access to routes" ON "public"."routes" FOR SELECT USING (true);



CREATE POLICY "Published tip comments are readable" ON "public"."community_tip_comments" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Tip votes are readable" ON "public"."community_tip_votes" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Users create their own collections" ON "public"."collections" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users create their own reviews" ON "public"."reviews" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users create their own tip comments" ON "public"."community_tip_comments" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users create their own tip votes" ON "public"."community_tip_votes" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users create their own tips" ON "public"."community_tips" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users delete their own collections" ON "public"."collections" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users delete their own reviews" ON "public"."reviews" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users delete their own tip comments" ON "public"."community_tip_comments" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users delete their own tip votes" ON "public"."community_tip_votes" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users delete their own tips" ON "public"."community_tips" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users manage items in their own collections" ON "public"."collection_items" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."collections" "collection"
  WHERE (("collection"."id" = "collection_items"."collection_id") AND ("collection"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."collections" "collection"
  WHERE (("collection"."id" = "collection_items"."collection_id") AND ("collection"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users manage their own profile" ON "public"."profiles" TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Users manage their own saved routes" ON "public"."saved_routes" TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users report comments as themselves" ON "public"."community_comment_reports" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "reporter_id"));



CREATE POLICY "Users report tips as themselves" ON "public"."community_tip_reports" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "reporter_id"));



CREATE POLICY "Users update their own collections" ON "public"."collections" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users update their own reviews" ON "public"."reviews" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users update their own tip comments" ON "public"."community_tip_comments" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users update their own tips" ON "public"."community_tips" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users view their own comment reports" ON "public"."community_comment_reports" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "reporter_id"));



CREATE POLICY "Users view their own tip reports" ON "public"."community_tip_reports" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "reporter_id"));



ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."collection_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."collections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."community_comment_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."community_tip_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."community_tip_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."community_tip_votes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."community_tips" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."place_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."place_images" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."place_relations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."places" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."route_stops" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."routes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."saved_routes" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_route"("start_slug" "text", "end_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_route"("start_slug" "text", "end_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_route"("start_slug" "text", "end_slug" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_place_rating"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_place_rating"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_place_rating"() TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."place_categories" TO "anon";
GRANT ALL ON TABLE "public"."place_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."place_categories" TO "service_role";



GRANT ALL ON TABLE "public"."places" TO "anon";
GRANT ALL ON TABLE "public"."places" TO "authenticated";
GRANT ALL ON TABLE "public"."places" TO "service_role";



GRANT ALL ON TABLE "public"."v_place_card" TO "anon";
GRANT ALL ON TABLE "public"."v_place_card" TO "authenticated";
GRANT ALL ON TABLE "public"."v_place_card" TO "service_role";



GRANT ALL ON FUNCTION "public"."search_places"("q" "text", "result_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_places"("q" "text", "result_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_places"("q" "text", "result_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."search_places_by_category_near"("category_slug" "text", "near_slug" "text", "radius_km" integer, "result_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_places_by_category_near"("category_slug" "text", "near_slug" "text", "radius_km" integer, "result_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_places_by_category_near"("category_slug" "text", "near_slug" "text", "radius_km" integer, "result_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."search_places_nearby"("lat" double precision, "lng" double precision, "radius_km" integer, "result_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_places_nearby"("lat" double precision, "lng" double precision, "radius_km" integer, "result_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_places_nearby"("lat" double precision, "lng" double precision, "radius_km" integer, "result_limit" integer) TO "service_role";



GRANT ALL ON TABLE "public"."collection_items" TO "anon";
GRANT ALL ON TABLE "public"."collection_items" TO "authenticated";
GRANT ALL ON TABLE "public"."collection_items" TO "service_role";



GRANT ALL ON TABLE "public"."collections" TO "anon";
GRANT ALL ON TABLE "public"."collections" TO "authenticated";
GRANT ALL ON TABLE "public"."collections" TO "service_role";



GRANT ALL ON TABLE "public"."community_comment_reports" TO "anon";
GRANT ALL ON TABLE "public"."community_comment_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."community_comment_reports" TO "service_role";



GRANT ALL ON TABLE "public"."community_tip_comments" TO "anon";
GRANT ALL ON TABLE "public"."community_tip_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."community_tip_comments" TO "service_role";



GRANT ALL ON TABLE "public"."community_tip_reports" TO "anon";
GRANT ALL ON TABLE "public"."community_tip_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."community_tip_reports" TO "service_role";



GRANT ALL ON TABLE "public"."community_tip_votes" TO "anon";
GRANT ALL ON TABLE "public"."community_tip_votes" TO "authenticated";
GRANT ALL ON TABLE "public"."community_tip_votes" TO "service_role";



GRANT ALL ON TABLE "public"."community_tips" TO "anon";
GRANT ALL ON TABLE "public"."community_tips" TO "authenticated";
GRANT ALL ON TABLE "public"."community_tips" TO "service_role";



GRANT ALL ON TABLE "public"."place_images" TO "anon";
GRANT ALL ON TABLE "public"."place_images" TO "authenticated";
GRANT ALL ON TABLE "public"."place_images" TO "service_role";



GRANT ALL ON TABLE "public"."place_relations" TO "anon";
GRANT ALL ON TABLE "public"."place_relations" TO "authenticated";
GRANT ALL ON TABLE "public"."place_relations" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."reviews" TO "anon";
GRANT ALL ON TABLE "public"."reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews" TO "service_role";



GRANT ALL ON TABLE "public"."route_stops" TO "anon";
GRANT ALL ON TABLE "public"."route_stops" TO "authenticated";
GRANT ALL ON TABLE "public"."route_stops" TO "service_role";



GRANT ALL ON TABLE "public"."routes" TO "anon";
GRANT ALL ON TABLE "public"."routes" TO "authenticated";
GRANT ALL ON TABLE "public"."routes" TO "service_role";



GRANT ALL ON TABLE "public"."saved_routes" TO "anon";
GRANT ALL ON TABLE "public"."saved_routes" TO "authenticated";
GRANT ALL ON TABLE "public"."saved_routes" TO "service_role";



GRANT ALL ON TABLE "public"."v_category_card" TO "anon";
GRANT ALL ON TABLE "public"."v_category_card" TO "authenticated";
GRANT ALL ON TABLE "public"."v_category_card" TO "service_role";



GRANT ALL ON TABLE "public"."v_place_relations_card" TO "anon";
GRANT ALL ON TABLE "public"."v_place_relations_card" TO "authenticated";
GRANT ALL ON TABLE "public"."v_place_relations_card" TO "service_role";



GRANT ALL ON TABLE "public"."v_route_stop_card" TO "anon";
GRANT ALL ON TABLE "public"."v_route_stop_card" TO "authenticated";
GRANT ALL ON TABLE "public"."v_route_stop_card" TO "service_role";



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







