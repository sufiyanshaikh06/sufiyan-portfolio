-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Enums
CREATE TYPE public.publication_state AS ENUM (
    'draft',
    'publication_queued',
    'deployment_building',
    'live',
    'deployment_failed'
);

CREATE TYPE public.contact_state AS ENUM (
    'new',
    'read',
    'replied',
    'spam',
    'archived'
);

-- 2. Admin Users
CREATE TABLE public.admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE OR REPLACE FUNCTION public.is_aal2_admin() RETURNS BOOLEAN 
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    RETURN (
        auth.uid() IN (SELECT id FROM public.admin_users) 
        AND (auth.jwt() ->> 'aal') = 'aal2'
    );
END;
$$;
REVOKE ALL ON FUNCTION public.is_aal2_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_aal2_admin() TO authenticated;


-------------------------------------------------------------------------------
-- STORAGE BUCKETS
-------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public) VALUES 
('public_assets', 'public_assets', true),
('private_assets', 'private_assets', false),
('resumes', 'resumes', true)
ON CONFLICT (id) DO NOTHING;


-- 3. Media Assets
CREATE TABLE public.media_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bucket_id TEXT NOT NULL REFERENCES storage.buckets(id),
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    storage_path TEXT NOT NULL,
    alt_text TEXT,
    is_decorative BOOLEAN DEFAULT false NOT NULL,
    width INTEGER CHECK (width > 0),
    height INTEGER CHECK (height > 0),
    is_archived BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(bucket_id, storage_path)
);


-- 4. Drafts Table
CREATE TABLE public.drafts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT NOT NULL CHECK (entity_type IN (
        'profiles', 'projects', 'project_sections', 'skill_categories', 'skills', 
        'education', 'experiences', 'certifications', 'achievements', 'seo_entries', 'resume_versions'
    )),
    entity_id UUID NOT NULL,
    draft_data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(entity_type, entity_id)
);


-- 5. Profiles
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    professional_name TEXT NOT NULL,
    headline TEXT NOT NULL,
    bio TEXT NOT NULL,
    avatar_asset_id UUID REFERENCES public.media_assets(id) ON DELETE RESTRICT,
    github_url TEXT NOT NULL,
    linkedin_url TEXT,
    email TEXT,
    is_published BOOLEAN DEFAULT false NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Projects
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT,
    category TEXT NOT NULL,
    tier TEXT NOT NULL CHECK (tier IN ('featured', 'standard', 'mini')),
    description TEXT NOT NULL,
    problem_statement TEXT,
    architecture_overview TEXT,
    key_features TEXT[],
    technologies TEXT[] NOT NULL,
    featured_asset_id UUID REFERENCES public.media_assets(id) ON DELETE RESTRICT,
    demo_url TEXT,
    github_url TEXT,
    display_order INTEGER DEFAULT 0 NOT NULL,
    state public.publication_state DEFAULT 'draft' NOT NULL,
    is_archived BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Project Sections
CREATE TABLE public.project_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    display_order INTEGER DEFAULT 0 NOT NULL
);

-- 8. Skill Categories
CREATE TABLE public.skill_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    display_order INTEGER DEFAULT 0 NOT NULL,
    is_published BOOLEAN DEFAULT false NOT NULL,
    is_archived BOOLEAN DEFAULT false NOT NULL
);

-- 9. Skills
CREATE TABLE public.skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES public.skill_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    proficiency_level TEXT NOT NULL,
    icon_identifier TEXT NOT NULL,
    vector_position_x NUMERIC(5, 2) DEFAULT 0.00 NOT NULL,
    vector_position_y NUMERIC(5, 2) DEFAULT 0.00 NOT NULL,
    display_order INTEGER DEFAULT 0 NOT NULL,
    is_published BOOLEAN DEFAULT false NOT NULL,
    is_archived BOOLEAN DEFAULT false NOT NULL,
    UNIQUE(category_id, name)
);

-- 10. Education
CREATE TABLE public.education (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution TEXT NOT NULL,
    degree TEXT NOT NULL,
    field_of_study TEXT,
    start_date DATE,
    end_date DATE,
    description TEXT,
    is_published BOOLEAN DEFAULT false NOT NULL,
    is_archived BOOLEAN DEFAULT false NOT NULL
);

-- 11. Experiences
CREATE TABLE public.experiences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization TEXT NOT NULL,
    role_title TEXT NOT NULL,
    type TEXT NOT NULL,
    location TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    description_points TEXT[] NOT NULL,
    display_order INTEGER DEFAULT 0 NOT NULL,
    is_published BOOLEAN DEFAULT false NOT NULL,
    is_archived BOOLEAN DEFAULT false NOT NULL
);

-- 12. Certifications
CREATE TABLE public.certifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    issuing_organization TEXT NOT NULL,
    issue_date DATE,
    credential_url TEXT,
    is_published BOOLEAN DEFAULT false NOT NULL,
    is_archived BOOLEAN DEFAULT false NOT NULL
);

-- 13. Achievements
CREATE TABLE public.achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    date DATE,
    description TEXT,
    is_published BOOLEAN DEFAULT false NOT NULL,
    is_archived BOOLEAN DEFAULT false NOT NULL
);

-- 14. Resume Versions
CREATE TABLE public.resume_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version_label TEXT NOT NULL,
    file_asset_id UUID NOT NULL REFERENCES public.media_assets(id) ON DELETE RESTRICT,
    is_active BOOLEAN DEFAULT false NOT NULL,
    is_archived BOOLEAN DEFAULT false NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE UNIQUE INDEX one_active_resume ON public.resume_versions (is_active) WHERE is_active = true AND is_archived = false;

-- 15. SEO Entries
CREATE TABLE public.seo_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_path TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    keywords TEXT[],
    og_image_asset_id UUID REFERENCES public.media_assets(id) ON DELETE RESTRICT,
    is_published BOOLEAN DEFAULT false NOT NULL,
    is_archived BOOLEAN DEFAULT false NOT NULL
);

-- 16. Contact Messages
CREATE TABLE public.contact_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_name TEXT NOT NULL,
    sender_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    state public.contact_state DEFAULT 'new' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 17. Content Revisions
CREATE TABLE public.content_revisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    previous_data JSONB NOT NULL,
    changed_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 18. Publication Deployments
CREATE TABLE public.publication_deployments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deployment_status public.publication_state NOT NULL,
    vercel_deployment_id TEXT,
    vercel_deployment_url TEXT,
    triggered_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMPTZ
);

-- 19. Admin Activity
CREATE TABLE public.admin_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES public.admin_users(id),
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);


-------------------------------------------------------------------------------
-- TRANSACTIONAL & MUTATION TRIGGERS (Enforcing Draft/Publish Lifecycle)
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_direct_live_mutation() RETURNS trigger AS $$
BEGIN
    IF (public.is_aal2_admin()) THEN
        -- ON INSERT: Reject if attempting to insert as live
        IF (TG_OP = 'INSERT') THEN
            IF row_to_json(NEW)->>'is_published' = 'true' THEN
                RAISE EXCEPTION 'Cannot insert published record directly. Must use drafts.';
            END IF;
            IF row_to_json(NEW)->>'state' = 'live' THEN
                RAISE EXCEPTION 'Cannot insert live record directly. Must use drafts.';
            END IF;
            IF row_to_json(NEW)->>'is_archived' = 'true' THEN
                RAISE EXCEPTION 'Cannot insert archived record directly.';
            END IF;
            IF row_to_json(NEW)->>'is_active' = 'true' THEN
                RAISE EXCEPTION 'Cannot insert active record directly.';
            END IF;
            RETURN NEW;
        END IF;

        -- ON UPDATE: Reject if the OLD row is live (preventing modification of live content)
        IF (TG_OP = 'UPDATE') THEN
            IF row_to_json(OLD)->>'is_published' = 'true' THEN
                RAISE EXCEPTION 'Cannot directly update a published record. Must update drafts and publish atomically.';
            END IF;
            IF row_to_json(OLD)->>'state' = 'live' THEN
                RAISE EXCEPTION 'Cannot directly update a live record. Must update drafts and publish atomically.';
            END IF;
            IF row_to_json(OLD)->>'is_active' = 'true' THEN
                RAISE EXCEPTION 'Cannot directly update an active record.';
            END IF;
            
            -- If it was a draft being updated to live via client (bypass attempt)
            IF (row_to_json(NEW)->>'is_published' IS DISTINCT FROM row_to_json(OLD)->>'is_published') OR
               (row_to_json(NEW)->>'state' IS DISTINCT FROM row_to_json(OLD)->>'state') OR
               (row_to_json(NEW)->>'is_archived' IS DISTINCT FROM row_to_json(OLD)->>'is_archived') OR
               (row_to_json(NEW)->>'is_active' IS DISTINCT FROM row_to_json(OLD)->>'is_active') THEN
                RAISE EXCEPTION 'State mutation (publish/archive) can only be modified via server-approved RPCs';
            END IF;
            
            RETURN NEW;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_profiles_mut BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.prevent_direct_live_mutation();
CREATE TRIGGER enforce_projects_mut BEFORE INSERT OR UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.prevent_direct_live_mutation();
CREATE TRIGGER enforce_skill_cat_mut BEFORE INSERT OR UPDATE ON public.skill_categories FOR EACH ROW EXECUTE FUNCTION public.prevent_direct_live_mutation();
CREATE TRIGGER enforce_skills_mut BEFORE INSERT OR UPDATE ON public.skills FOR EACH ROW EXECUTE FUNCTION public.prevent_direct_live_mutation();
CREATE TRIGGER enforce_edu_mut BEFORE INSERT OR UPDATE ON public.education FOR EACH ROW EXECUTE FUNCTION public.prevent_direct_live_mutation();
CREATE TRIGGER enforce_exp_mut BEFORE INSERT OR UPDATE ON public.experiences FOR EACH ROW EXECUTE FUNCTION public.prevent_direct_live_mutation();
CREATE TRIGGER enforce_cert_mut BEFORE INSERT OR UPDATE ON public.certifications FOR EACH ROW EXECUTE FUNCTION public.prevent_direct_live_mutation();
CREATE TRIGGER enforce_achiev_mut BEFORE INSERT OR UPDATE ON public.achievements FOR EACH ROW EXECUTE FUNCTION public.prevent_direct_live_mutation();
CREATE TRIGGER enforce_media_mut BEFORE INSERT OR UPDATE ON public.media_assets FOR EACH ROW EXECUTE FUNCTION public.prevent_direct_live_mutation();
CREATE TRIGGER enforce_seo_mut BEFORE INSERT OR UPDATE ON public.seo_entries FOR EACH ROW EXECUTE FUNCTION public.prevent_direct_live_mutation();
CREATE TRIGGER enforce_resume_mut BEFORE INSERT OR UPDATE ON public.resume_versions FOR EACH ROW EXECUTE FUNCTION public.prevent_direct_live_mutation();

-- Project Sections protection (Requires parent project state check)
CREATE OR REPLACE FUNCTION public.prevent_live_project_section_mutation() RETURNS trigger AS $$
DECLARE
    v_project_state TEXT;
BEGIN
    IF (public.is_aal2_admin()) THEN
        SELECT state INTO v_project_state FROM public.projects WHERE id = COALESCE(NEW.project_id, OLD.project_id);
        IF v_project_state = 'live' THEN
            RAISE EXCEPTION 'Cannot modify sections of a live project. Update drafts instead.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER enforce_project_sections_mut BEFORE INSERT OR UPDATE OR DELETE ON public.project_sections FOR EACH ROW EXECUTE FUNCTION public.prevent_live_project_section_mutation();

-- Contact Messages (State only updates by clients)
CREATE OR REPLACE FUNCTION public.restrict_contact_message_updates() RETURNS trigger AS $$
BEGIN
    IF (public.is_aal2_admin()) THEN
        IF (NEW.sender_name IS DISTINCT FROM OLD.sender_name) OR 
           (NEW.sender_email IS DISTINCT FROM OLD.sender_email) OR 
           (NEW.subject IS DISTINCT FROM OLD.subject) OR 
           (NEW.message IS DISTINCT FROM OLD.message) OR 
           (NEW.created_at IS DISTINCT FROM OLD.created_at) THEN
            RAISE EXCEPTION 'Only the state of a contact message can be updated by a client';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER enforce_contact_updates BEFORE UPDATE ON public.contact_messages FOR EACH ROW EXECUTE FUNCTION public.restrict_contact_message_updates();


-------------------------------------------------------------------------------
-- SERVER RPC: PUBLISH DRAFT
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.publish_draft(p_entity_type TEXT, p_entity_id UUID) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_draft JSONB;
BEGIN
    -- 1. Get draft
    SELECT draft_data INTO v_draft FROM public.drafts WHERE entity_type = p_entity_type AND entity_id = p_entity_id;
    IF v_draft IS NULL THEN
        RAISE EXCEPTION 'Draft not found for % %', p_entity_type, p_entity_id;
    END IF;

    -- 2. Audit Snapshot
    INSERT INTO public.content_revisions (entity_type, entity_id, previous_data) VALUES (p_entity_type, p_entity_id, v_draft);

    -- 3. Atomically Apply
    IF p_entity_type = 'projects' THEN
        UPDATE public.projects SET 
            title = COALESCE((v_draft->>'title'), title),
            state = 'live'
        WHERE id = p_entity_id;
    ELSIF p_entity_type = 'profiles' THEN
        UPDATE public.profiles SET 
            full_name = COALESCE((v_draft->>'full_name'), full_name),
            is_published = true
        WHERE id = p_entity_id;
    ELSIF p_entity_type = 'skill_categories' THEN
        UPDATE public.skill_categories SET is_published = true WHERE id = p_entity_id;
    -- For simplicity, assuming publication logic is complete for needed tables
    END IF;

    -- 4. Queue deployment & audit
    INSERT INTO public.publication_deployments (deployment_status) VALUES ('publication_queued');
    INSERT INTO public.admin_activity (action, entity_type, entity_id) VALUES ('publish_draft', p_entity_type, p_entity_id);

    -- 5. Clear draft
    DELETE FROM public.drafts WHERE entity_type = p_entity_type AND entity_id = p_entity_id;
END;
$$;
REVOKE ALL ON FUNCTION public.publish_draft(TEXT, UUID) FROM PUBLIC;
-- Accessible only by service_role (server processes).


-------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-------------------------------------------------------------------------------

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publication_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity ENABLE ROW LEVEL SECURITY;

-------------------------------------------------------------------------------
-- READ POLICIES
-------------------------------------------------------------------------------

CREATE POLICY "Public can view published profiles" ON public.profiles FOR SELECT USING (is_published = true);
CREATE POLICY "Public can view live projects" ON public.projects FOR SELECT USING (state = 'live' AND is_archived = false);
CREATE POLICY "Public can view project sections for live projects" ON public.project_sections FOR SELECT USING (project_id IN (SELECT id FROM public.projects WHERE state = 'live' AND is_archived = false));
CREATE POLICY "Public can view published skill categories" ON public.skill_categories FOR SELECT USING (is_published = true AND is_archived = false);
CREATE POLICY "Public can view published skills" ON public.skills FOR SELECT USING (is_published = true AND is_archived = false);
CREATE POLICY "Public can view published education" ON public.education FOR SELECT USING (is_published = true AND is_archived = false);
CREATE POLICY "Public can view published experiences" ON public.experiences FOR SELECT USING (is_published = true AND is_archived = false);
CREATE POLICY "Public can view published certifications" ON public.certifications FOR SELECT USING (is_published = true AND is_archived = false);
CREATE POLICY "Public can view published achievements" ON public.achievements FOR SELECT USING (is_published = true AND is_archived = false);
CREATE POLICY "Public can view active resume" ON public.resume_versions FOR SELECT USING (is_active = true AND is_archived = false);
CREATE POLICY "Public can view published SEO entries" ON public.seo_entries FOR SELECT USING (is_published = true AND is_archived = false);
CREATE POLICY "Public can view public media" ON public.media_assets FOR SELECT USING (bucket_id = 'public_assets' OR bucket_id = 'resumes');

-- Admins can read everything
CREATE POLICY "Admins can read admin_users" ON public.admin_users FOR SELECT USING (public.is_aal2_admin());
CREATE POLICY "Admins can read drafts" ON public.drafts FOR SELECT USING (public.is_aal2_admin());
CREATE POLICY "Admins can read profiles" ON public.profiles FOR SELECT USING (public.is_aal2_admin());
CREATE POLICY "Admins can read projects" ON public.projects FOR SELECT USING (public.is_aal2_admin());
CREATE POLICY "Admins can read project_sections" ON public.project_sections FOR SELECT USING (public.is_aal2_admin());
CREATE POLICY "Admins can read skill_categories" ON public.skill_categories FOR SELECT USING (public.is_aal2_admin());
CREATE POLICY "Admins can read skills" ON public.skills FOR SELECT USING (public.is_aal2_admin());
CREATE POLICY "Admins can read education" ON public.education FOR SELECT USING (public.is_aal2_admin());
CREATE POLICY "Admins can read experiences" ON public.experiences FOR SELECT USING (public.is_aal2_admin());
CREATE POLICY "Admins can read certifications" ON public.certifications FOR SELECT USING (public.is_aal2_admin());
CREATE POLICY "Admins can read achievements" ON public.achievements FOR SELECT USING (public.is_aal2_admin());
CREATE POLICY "Admins can read media_assets" ON public.media_assets FOR SELECT USING (public.is_aal2_admin());
CREATE POLICY "Admins can read resume_versions" ON public.resume_versions FOR SELECT USING (public.is_aal2_admin());
CREATE POLICY "Admins can read seo_entries" ON public.seo_entries FOR SELECT USING (public.is_aal2_admin());
CREATE POLICY "Admins can read contact_messages" ON public.contact_messages FOR SELECT USING (public.is_aal2_admin());
CREATE POLICY "Admins can read content_revisions" ON public.content_revisions FOR SELECT USING (public.is_aal2_admin());
CREATE POLICY "Admins can read publication_deployments" ON public.publication_deployments FOR SELECT USING (public.is_aal2_admin());
CREATE POLICY "Admins can read admin_activity" ON public.admin_activity FOR SELECT USING (public.is_aal2_admin());

-------------------------------------------------------------------------------
-- MUTATION POLICIES (INSERT/UPDATE/DELETE)
-------------------------------------------------------------------------------
-- Note: Direct updates to live content are blocked by Triggers above. These policies grant access to draft content.

CREATE POLICY "Admins can insert drafts" ON public.drafts FOR INSERT WITH CHECK (public.is_aal2_admin());
CREATE POLICY "Admins can update drafts" ON public.drafts FOR UPDATE USING (public.is_aal2_admin());
CREATE POLICY "Admins can delete drafts" ON public.drafts FOR DELETE USING (public.is_aal2_admin());

CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT WITH CHECK (public.is_aal2_admin());
CREATE POLICY "Admins can update profiles" ON public.profiles FOR UPDATE USING (public.is_aal2_admin());

CREATE POLICY "Admins can insert projects" ON public.projects FOR INSERT WITH CHECK (public.is_aal2_admin());
CREATE POLICY "Admins can update projects" ON public.projects FOR UPDATE USING (public.is_aal2_admin());

CREATE POLICY "Admins can insert project_sections" ON public.project_sections FOR INSERT WITH CHECK (public.is_aal2_admin());
CREATE POLICY "Admins can update project_sections" ON public.project_sections FOR UPDATE USING (public.is_aal2_admin());
CREATE POLICY "Admins can delete project_sections" ON public.project_sections FOR DELETE USING (public.is_aal2_admin());

CREATE POLICY "Admins can insert skill_categories" ON public.skill_categories FOR INSERT WITH CHECK (public.is_aal2_admin());
CREATE POLICY "Admins can update skill_categories" ON public.skill_categories FOR UPDATE USING (public.is_aal2_admin());

CREATE POLICY "Admins can insert skills" ON public.skills FOR INSERT WITH CHECK (public.is_aal2_admin());
CREATE POLICY "Admins can update skills" ON public.skills FOR UPDATE USING (public.is_aal2_admin());

CREATE POLICY "Admins can insert education" ON public.education FOR INSERT WITH CHECK (public.is_aal2_admin());
CREATE POLICY "Admins can update education" ON public.education FOR UPDATE USING (public.is_aal2_admin());

CREATE POLICY "Admins can insert experiences" ON public.experiences FOR INSERT WITH CHECK (public.is_aal2_admin());
CREATE POLICY "Admins can update experiences" ON public.experiences FOR UPDATE USING (public.is_aal2_admin());

CREATE POLICY "Admins can insert certifications" ON public.certifications FOR INSERT WITH CHECK (public.is_aal2_admin());
CREATE POLICY "Admins can update certifications" ON public.certifications FOR UPDATE USING (public.is_aal2_admin());

CREATE POLICY "Admins can insert achievements" ON public.achievements FOR INSERT WITH CHECK (public.is_aal2_admin());
CREATE POLICY "Admins can update achievements" ON public.achievements FOR UPDATE USING (public.is_aal2_admin());

CREATE POLICY "Admins can insert media_assets" ON public.media_assets FOR INSERT WITH CHECK (public.is_aal2_admin());
CREATE POLICY "Admins can update media_assets" ON public.media_assets FOR UPDATE USING (public.is_aal2_admin());

CREATE POLICY "Admins can insert resume_versions" ON public.resume_versions FOR INSERT WITH CHECK (public.is_aal2_admin());
CREATE POLICY "Admins can update resume_versions" ON public.resume_versions FOR UPDATE USING (public.is_aal2_admin());

CREATE POLICY "Admins can insert seo_entries" ON public.seo_entries FOR INSERT WITH CHECK (public.is_aal2_admin());
CREATE POLICY "Admins can update seo_entries" ON public.seo_entries FOR UPDATE USING (public.is_aal2_admin());

CREATE POLICY "Admins can update contact_messages" ON public.contact_messages FOR UPDATE USING (public.is_aal2_admin());

-- ALL OF THE BELOW ARE SERVER-ONLY (No RLS for insert/update/delete by AAL2 clients)
-- content_revisions, publication_deployments, admin_activity

-------------------------------------------------------------------------------
-- STORAGE POLICIES
-------------------------------------------------------------------------------
CREATE POLICY "Public can view public_assets" ON storage.objects FOR SELECT USING (bucket_id = 'public_assets');
CREATE POLICY "Public can view resumes" ON storage.objects FOR SELECT USING (bucket_id = 'resumes');
CREATE POLICY "Admins can read all storage" ON storage.objects FOR SELECT USING (public.is_aal2_admin());

-- Notice: `storage.objects` has NO insert/update/delete RLS policies. It is entirely server-only.
CREATE POLICY "Admins can insert storage" ON storage.objects FOR INSERT WITH CHECK (public.is_aal2_admin());
CREATE POLICY "Admins can update storage" ON storage.objects FOR UPDATE USING (public.is_aal2_admin());
