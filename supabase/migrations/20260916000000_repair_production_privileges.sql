-- Migration: 20260916000000_repair_production_privileges.sql
-- Description: Enforce least-privilege role permissions, revoke broad grants, restrict is_aal2_admin() execution, and isolate admin policies to authenticated role.

-------------------------------------------------------------------------------
-- 1. REVOKE BLANKET PRIVILEGES ON PUBLIC SCHEMA
-------------------------------------------------------------------------------

-- Revoke all table, sequence, and routine privileges previously granted to anon, authenticated, and public
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM PUBLIC, anon, authenticated;

-- Revoke schema-level privileges including CREATE from public schema
REVOKE ALL PRIVILEGES ON SCHEMA public FROM PUBLIC, anon, authenticated;

-- Ensure schema usage strictly for necessary roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-------------------------------------------------------------------------------
-- 2. LEAST-PRIVILEGE GRANTS: ANONYMOUS ROLE (anon)
-------------------------------------------------------------------------------

-- Anon receives SELECT ONLY on the 13 public portfolio content tables
GRANT SELECT ON TABLE
    public.profiles,
    public.projects,
    public.project_sections,
    public.project_section_media,
    public.skill_categories,
    public.skills,
    public.education,
    public.experiences,
    public.certifications,
    public.achievements,
    public.resume_versions,
    public.seo_entries,
    public.media_assets
TO anon;

-- Anon has NO access (no SELECT, INSERT, UPDATE, DELETE) on:
-- admin_users, drafts, contact_messages, content_revisions, publication_deployments, admin_activity

-------------------------------------------------------------------------------
-- 3. LEAST-PRIVILEGE GRANTS: AUTHENTICATED ROLE (authenticated)
-------------------------------------------------------------------------------

-- Authenticated can SELECT tables for CMS administration (subject to AAL2 RLS)
GRANT SELECT ON TABLE
    public.admin_users,
    public.drafts,
    public.profiles,
    public.projects,
    public.project_sections,
    public.project_section_media,
    public.skill_categories,
    public.skills,
    public.education,
    public.experiences,
    public.certifications,
    public.achievements,
    public.media_assets,
    public.resume_versions,
    public.seo_entries,
    public.contact_messages,
    public.content_revisions,
    public.publication_deployments,
    public.admin_activity
TO authenticated;

-- Authenticated mutations: strictly limited to tables with approved AAL2 CMS policies
GRANT INSERT, UPDATE, DELETE ON TABLE public.drafts TO authenticated;
GRANT INSERT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT INSERT, UPDATE ON TABLE public.projects TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.project_sections TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.project_section_media TO authenticated;
GRANT INSERT, UPDATE ON TABLE public.skill_categories TO authenticated;
GRANT INSERT, UPDATE ON TABLE public.skills TO authenticated;
GRANT INSERT, UPDATE ON TABLE public.education TO authenticated;
GRANT INSERT, UPDATE ON TABLE public.experiences TO authenticated;
GRANT INSERT, UPDATE ON TABLE public.certifications TO authenticated;
GRANT INSERT, UPDATE ON TABLE public.achievements TO authenticated;
GRANT INSERT, UPDATE ON TABLE public.media_assets TO authenticated;
GRANT INSERT, UPDATE ON TABLE public.resume_versions TO authenticated;
GRANT INSERT, UPDATE ON TABLE public.seo_entries TO authenticated;
GRANT UPDATE ON TABLE public.contact_messages TO authenticated;

-- Note: All primary keys use UUID defaults (uuid_generate_v4()). No sequence privileges are granted to authenticated.

-------------------------------------------------------------------------------
-- 4. SERVICE ROLE PERMISSIONS (service_role)
-------------------------------------------------------------------------------

-- Server-side provisioning and background workers require table and sequence control
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-------------------------------------------------------------------------------
-- 5. FUNCTION PRIVILEGES: is_aal2_admin()
-------------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.is_aal2_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_aal2_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_aal2_admin() TO authenticated, service_role;

-------------------------------------------------------------------------------
-- 6. RESTRICT ADMIN POLICIES TO AUTHENTICATED ROLE
-------------------------------------------------------------------------------
-- Binding Admin RLS policies to authenticated ensures anon queries do not invoke
-- or require execution privileges on is_aal2_admin().

ALTER POLICY "Admins can read admin_users" ON public.admin_users TO authenticated;
ALTER POLICY "Admins can read drafts" ON public.drafts TO authenticated;
ALTER POLICY "Admins can read profiles" ON public.profiles TO authenticated;
ALTER POLICY "Admins can read projects" ON public.projects TO authenticated;
ALTER POLICY "Admins can read project_sections" ON public.project_sections TO authenticated;
ALTER POLICY "Admins can read project_section_media" ON public.project_section_media TO authenticated;
ALTER POLICY "Admins can read skill_categories" ON public.skill_categories TO authenticated;
ALTER POLICY "Admins can read skills" ON public.skills TO authenticated;
ALTER POLICY "Admins can read education" ON public.education TO authenticated;
ALTER POLICY "Admins can read experiences" ON public.experiences TO authenticated;
ALTER POLICY "Admins can read certifications" ON public.certifications TO authenticated;
ALTER POLICY "Admins can read achievements" ON public.achievements TO authenticated;
ALTER POLICY "Admins can read media_assets" ON public.media_assets TO authenticated;
ALTER POLICY "Admins can read resume_versions" ON public.resume_versions TO authenticated;
ALTER POLICY "Admins can read seo_entries" ON public.seo_entries TO authenticated;
ALTER POLICY "Admins can read contact_messages" ON public.contact_messages TO authenticated;
ALTER POLICY "Admins can read content_revisions" ON public.content_revisions TO authenticated;
ALTER POLICY "Admins can read publication_deployments" ON public.publication_deployments TO authenticated;
ALTER POLICY "Admins can read admin_activity" ON public.admin_activity TO authenticated;

ALTER POLICY "Admins can insert drafts" ON public.drafts TO authenticated;
ALTER POLICY "Admins can update drafts" ON public.drafts TO authenticated;
ALTER POLICY "Admins can delete drafts" ON public.drafts TO authenticated;

ALTER POLICY "Admins can insert profiles" ON public.profiles TO authenticated;
ALTER POLICY "Admins can update profiles" ON public.profiles TO authenticated;

ALTER POLICY "Admins can insert projects" ON public.projects TO authenticated;
ALTER POLICY "Admins can update projects" ON public.projects TO authenticated;

ALTER POLICY "Admins can insert project_sections" ON public.project_sections TO authenticated;
ALTER POLICY "Admins can update project_sections" ON public.project_sections TO authenticated;
ALTER POLICY "Admins can delete project_sections" ON public.project_sections TO authenticated;

ALTER POLICY "Admins can insert project_section_media" ON public.project_section_media TO authenticated;
ALTER POLICY "Admins can update project_section_media" ON public.project_section_media TO authenticated;
ALTER POLICY "Admins can delete project_section_media" ON public.project_section_media TO authenticated;

ALTER POLICY "Admins can insert skill_categories" ON public.skill_categories TO authenticated;
ALTER POLICY "Admins can update skill_categories" ON public.skill_categories TO authenticated;

ALTER POLICY "Admins can insert skills" ON public.skills TO authenticated;
ALTER POLICY "Admins can update skills" ON public.skills TO authenticated;

ALTER POLICY "Admins can insert education" ON public.education TO authenticated;
ALTER POLICY "Admins can update education" ON public.education TO authenticated;

ALTER POLICY "Admins can insert experiences" ON public.experiences TO authenticated;
ALTER POLICY "Admins can update experiences" ON public.experiences TO authenticated;

ALTER POLICY "Admins can insert certifications" ON public.certifications TO authenticated;
ALTER POLICY "Admins can update certifications" ON public.certifications TO authenticated;

ALTER POLICY "Admins can insert achievements" ON public.achievements TO authenticated;
ALTER POLICY "Admins can update achievements" ON public.achievements TO authenticated;

ALTER POLICY "Admins can insert media_assets" ON public.media_assets TO authenticated;
ALTER POLICY "Admins can update media_assets" ON public.media_assets TO authenticated;

ALTER POLICY "Admins can insert resume_versions" ON public.resume_versions TO authenticated;
ALTER POLICY "Admins can update resume_versions" ON public.resume_versions TO authenticated;

ALTER POLICY "Admins can insert seo_entries" ON public.seo_entries TO authenticated;
ALTER POLICY "Admins can update seo_entries" ON public.seo_entries TO authenticated;

ALTER POLICY "Admins can update contact_messages" ON public.contact_messages TO authenticated;

ALTER POLICY "Admins can read all storage" ON storage.objects TO authenticated;
ALTER POLICY "Admins can insert private storage" ON storage.objects TO authenticated;

-------------------------------------------------------------------------------
-- 7. DEFAULT PRIVILEGES (PREVENTING FUTURE PRIVILEGE CREEP)
-------------------------------------------------------------------------------

-- Explicitly revoke schema-specific default privileges for objects created by the postgres role
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;

-- Explicitly revoke global default execution privileges for functions created by the postgres role
ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon, authenticated;
