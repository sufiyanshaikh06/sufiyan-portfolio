-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Publication State Enum
CREATE TYPE publication_state AS ENUM (
    'draft',
    'publication_queued',
    'deployment_building',
    'live',
    'deployment_failed',
    'archived'
);

-- 2. Admin Users (Private Owner Authorization)
CREATE TABLE public.admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Profiles
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    professional_name TEXT NOT NULL,
    headline TEXT NOT NULL,
    bio TEXT NOT NULL,
    avatar_url TEXT,
    github_url TEXT NOT NULL,
    linkedin_url TEXT,
    email TEXT,
    is_published BOOLEAN DEFAULT false NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Projects
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
    featured_image_url TEXT,
    demo_url TEXT,
    github_url TEXT,
    display_order INTEGER DEFAULT 0 NOT NULL,
    state publication_state DEFAULT 'draft' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Project Sections
CREATE TABLE public.project_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    display_order INTEGER DEFAULT 0 NOT NULL
);

-- 6. Skill Categories
CREATE TABLE public.skill_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    display_order INTEGER DEFAULT 0 NOT NULL
);

-- 7. Skills
CREATE TABLE public.skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES public.skill_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    proficiency_level TEXT NOT NULL,
    icon_identifier TEXT NOT NULL,
    vector_position_x NUMERIC(5, 2) DEFAULT 0.00 NOT NULL,
    vector_position_y NUMERIC(5, 2) DEFAULT 0.00 NOT NULL,
    display_order INTEGER DEFAULT 0 NOT NULL,
    is_published BOOLEAN DEFAULT false NOT NULL
);

-- 8. Education
CREATE TABLE public.education (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution TEXT NOT NULL,
    degree TEXT NOT NULL,
    field_of_study TEXT,
    start_date DATE,
    end_date DATE,
    description TEXT,
    is_published BOOLEAN DEFAULT false NOT NULL
);

-- 9. Experiences
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
    is_published BOOLEAN DEFAULT false NOT NULL
);

-- 10. Certifications
CREATE TABLE public.certifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    issuing_organization TEXT NOT NULL,
    issue_date DATE,
    credential_url TEXT,
    is_published BOOLEAN DEFAULT false NOT NULL
);

-- 11. Achievements
CREATE TABLE public.achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    date DATE,
    description TEXT,
    is_published BOOLEAN DEFAULT false NOT NULL
);

-- 12. Media Assets
CREATE TABLE public.media_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. Media References
CREATE TABLE public.media_references (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID REFERENCES public.media_assets(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL, -- e.g., 'project', 'profile'
    entity_id UUID NOT NULL
);

-- 14. Resume Versions
CREATE TABLE public.resume_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version_label TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    is_active BOOLEAN DEFAULT false NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 15. SEO Entries
CREATE TABLE public.seo_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_path TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    keywords TEXT[],
    og_image_url TEXT
);

-- 16. Contact Messages
CREATE TABLE public.contact_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_name TEXT NOT NULL,
    sender_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false NOT NULL,
    is_archived BOOLEAN DEFAULT false NOT NULL,
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
    deployment_status publication_state NOT NULL,
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
-- ROW LEVEL SECURITY (RLS) POLICIES
-------------------------------------------------------------------------------
-- Enforce strict `aal2` (MFA) owner RLS for mutations.

-- Helper function to check if the current user is an aal2 admin
CREATE OR REPLACE FUNCTION public.is_aal2_admin() RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        auth.uid() IN (SELECT id FROM public.admin_users) 
        AND (current_setting('request.jwt.claims', true)::jsonb ->> 'aal') = 'aal2'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE public.media_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publication_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity ENABLE ROW LEVEL SECURITY;

-------------------------------------------------------------------------------
-- READ POLICIES
-------------------------------------------------------------------------------

-- Public can read live/published content ONLY
CREATE POLICY "Public can view published profiles" ON public.profiles FOR SELECT USING (is_published = true);
CREATE POLICY "Public can view live projects" ON public.projects FOR SELECT USING (state = 'live');
CREATE POLICY "Public can view project sections for live projects" ON public.project_sections FOR SELECT USING (project_id IN (SELECT id FROM public.projects WHERE state = 'live'));
CREATE POLICY "Public can view skill categories" ON public.skill_categories FOR SELECT USING (true);
CREATE POLICY "Public can view published skills" ON public.skills FOR SELECT USING (is_published = true);
CREATE POLICY "Public can view published education" ON public.education FOR SELECT USING (is_published = true);
CREATE POLICY "Public can view published experiences" ON public.experiences FOR SELECT USING (is_published = true);
CREATE POLICY "Public can view published certifications" ON public.certifications FOR SELECT USING (is_published = true);
CREATE POLICY "Public can view published achievements" ON public.achievements FOR SELECT USING (is_published = true);
CREATE POLICY "Public can view active resume" ON public.resume_versions FOR SELECT USING (is_active = true);
CREATE POLICY "Public can view SEO entries" ON public.seo_entries FOR SELECT USING (true);

-- Admins can read everything
CREATE POLICY "Admins can read everything in profiles" ON public.profiles FOR SELECT USING (public.is_aal2_admin());
CREATE POLICY "Admins can read everything in projects" ON public.projects FOR SELECT USING (public.is_aal2_admin());
CREATE POLICY "Admins can read everything in project_sections" ON public.project_sections FOR SELECT USING (public.is_aal2_admin());
CREATE POLICY "Admins can read everything in skill_categories" ON public.skill_categories FOR SELECT USING (public.is_aal2_admin());
CREATE POLICY "Admins can read everything in skills" ON public.skills FOR SELECT USING (public.is_aal2_admin());
CREATE POLICY "Admins can read everything in education" ON public.education FOR SELECT USING (public.is_aal2_admin());
CREATE POLICY "Admins can read everything in experiences" ON public.experiences FOR SELECT USING (public.is_aal2_admin());
CREATE POLICY "Admins can read everything in certifications" ON public.certifications FOR SELECT USING (public.is_aal2_admin());
CREATE POLICY "Admins can read everything in achievements" ON public.achievements FOR SELECT USING (public.is_aal2_admin());
CREATE POLICY "Admins can read everything in media_assets" ON public.media_assets FOR SELECT USING (public.is_aal2_admin());
CREATE POLICY "Admins can read everything in media_references" ON public.media_references FOR SELECT USING (public.is_aal2_admin());
CREATE POLICY "Admins can read everything in resume_versions" ON public.resume_versions FOR SELECT USING (public.is_aal2_admin());
CREATE POLICY "Admins can read everything in seo_entries" ON public.seo_entries FOR SELECT USING (public.is_aal2_admin());
CREATE POLICY "Admins can read contact messages" ON public.contact_messages FOR SELECT USING (public.is_aal2_admin());
CREATE POLICY "Admins can read content revisions" ON public.content_revisions FOR SELECT USING (public.is_aal2_admin());
CREATE POLICY "Admins can read publication deployments" ON public.publication_deployments FOR SELECT USING (public.is_aal2_admin());
CREATE POLICY "Admins can read admin activity" ON public.admin_activity FOR SELECT USING (public.is_aal2_admin());

-------------------------------------------------------------------------------
-- MUTATION POLICIES (INSERT/UPDATE/DELETE)
-------------------------------------------------------------------------------
-- STRICT AAL2 ADMIN ACCESS ONLY FOR ALL TABLES
-- Note: NO public insert for contact_messages. It must be done server-side using service_role key bypassing RLS.

CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT WITH CHECK (public.is_aal2_admin());
CREATE POLICY "Admins can update profiles" ON public.profiles FOR UPDATE USING (public.is_aal2_admin());
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE USING (public.is_aal2_admin());

CREATE POLICY "Admins can insert projects" ON public.projects FOR INSERT WITH CHECK (public.is_aal2_admin());
CREATE POLICY "Admins can update projects" ON public.projects FOR UPDATE USING (public.is_aal2_admin());
CREATE POLICY "Admins can delete projects" ON public.projects FOR DELETE USING (public.is_aal2_admin());

CREATE POLICY "Admins can insert project_sections" ON public.project_sections FOR INSERT WITH CHECK (public.is_aal2_admin());
CREATE POLICY "Admins can update project_sections" ON public.project_sections FOR UPDATE USING (public.is_aal2_admin());
CREATE POLICY "Admins can delete project_sections" ON public.project_sections FOR DELETE USING (public.is_aal2_admin());

CREATE POLICY "Admins can insert skill_categories" ON public.skill_categories FOR INSERT WITH CHECK (public.is_aal2_admin());
CREATE POLICY "Admins can update skill_categories" ON public.skill_categories FOR UPDATE USING (public.is_aal2_admin());
CREATE POLICY "Admins can delete skill_categories" ON public.skill_categories FOR DELETE USING (public.is_aal2_admin());

CREATE POLICY "Admins can insert skills" ON public.skills FOR INSERT WITH CHECK (public.is_aal2_admin());
CREATE POLICY "Admins can update skills" ON public.skills FOR UPDATE USING (public.is_aal2_admin());
CREATE POLICY "Admins can delete skills" ON public.skills FOR DELETE USING (public.is_aal2_admin());

CREATE POLICY "Admins can insert education" ON public.education FOR INSERT WITH CHECK (public.is_aal2_admin());
CREATE POLICY "Admins can update education" ON public.education FOR UPDATE USING (public.is_aal2_admin());
CREATE POLICY "Admins can delete education" ON public.education FOR DELETE USING (public.is_aal2_admin());

CREATE POLICY "Admins can insert experiences" ON public.experiences FOR INSERT WITH CHECK (public.is_aal2_admin());
CREATE POLICY "Admins can update experiences" ON public.experiences FOR UPDATE USING (public.is_aal2_admin());
CREATE POLICY "Admins can delete experiences" ON public.experiences FOR DELETE USING (public.is_aal2_admin());

CREATE POLICY "Admins can insert certifications" ON public.certifications FOR INSERT WITH CHECK (public.is_aal2_admin());
CREATE POLICY "Admins can update certifications" ON public.certifications FOR UPDATE USING (public.is_aal2_admin());
CREATE POLICY "Admins can delete certifications" ON public.certifications FOR DELETE USING (public.is_aal2_admin());

CREATE POLICY "Admins can insert achievements" ON public.achievements FOR INSERT WITH CHECK (public.is_aal2_admin());
CREATE POLICY "Admins can update achievements" ON public.achievements FOR UPDATE USING (public.is_aal2_admin());
CREATE POLICY "Admins can delete achievements" ON public.achievements FOR DELETE USING (public.is_aal2_admin());

CREATE POLICY "Admins can insert media_assets" ON public.media_assets FOR INSERT WITH CHECK (public.is_aal2_admin());
CREATE POLICY "Admins can update media_assets" ON public.media_assets FOR UPDATE USING (public.is_aal2_admin());
CREATE POLICY "Admins can delete media_assets" ON public.media_assets FOR DELETE USING (public.is_aal2_admin());

CREATE POLICY "Admins can insert media_references" ON public.media_references FOR INSERT WITH CHECK (public.is_aal2_admin());
CREATE POLICY "Admins can update media_references" ON public.media_references FOR UPDATE USING (public.is_aal2_admin());
CREATE POLICY "Admins can delete media_references" ON public.media_references FOR DELETE USING (public.is_aal2_admin());

CREATE POLICY "Admins can insert resume_versions" ON public.resume_versions FOR INSERT WITH CHECK (public.is_aal2_admin());
CREATE POLICY "Admins can update resume_versions" ON public.resume_versions FOR UPDATE USING (public.is_aal2_admin());
CREATE POLICY "Admins can delete resume_versions" ON public.resume_versions FOR DELETE USING (public.is_aal2_admin());

CREATE POLICY "Admins can insert seo_entries" ON public.seo_entries FOR INSERT WITH CHECK (public.is_aal2_admin());
CREATE POLICY "Admins can update seo_entries" ON public.seo_entries FOR UPDATE USING (public.is_aal2_admin());
CREATE POLICY "Admins can delete seo_entries" ON public.seo_entries FOR DELETE USING (public.is_aal2_admin());

CREATE POLICY "Admins can update contact_messages" ON public.contact_messages FOR UPDATE USING (public.is_aal2_admin());
CREATE POLICY "Admins can delete contact_messages" ON public.contact_messages FOR DELETE USING (public.is_aal2_admin());

CREATE POLICY "Admins can insert content_revisions" ON public.content_revisions FOR INSERT WITH CHECK (public.is_aal2_admin());
CREATE POLICY "Admins can update content_revisions" ON public.content_revisions FOR UPDATE USING (public.is_aal2_admin());
CREATE POLICY "Admins can delete content_revisions" ON public.content_revisions FOR DELETE USING (public.is_aal2_admin());

CREATE POLICY "Admins can insert publication_deployments" ON public.publication_deployments FOR INSERT WITH CHECK (public.is_aal2_admin());
CREATE POLICY "Admins can update publication_deployments" ON public.publication_deployments FOR UPDATE USING (public.is_aal2_admin());
CREATE POLICY "Admins can delete publication_deployments" ON public.publication_deployments FOR DELETE USING (public.is_aal2_admin());

CREATE POLICY "Admins can insert admin_activity" ON public.admin_activity FOR INSERT WITH CHECK (public.is_aal2_admin());
CREATE POLICY "Admins can update admin_activity" ON public.admin_activity FOR UPDATE USING (public.is_aal2_admin());
CREATE POLICY "Admins can delete admin_activity" ON public.admin_activity FOR DELETE USING (public.is_aal2_admin());
