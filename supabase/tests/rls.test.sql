-- ==============================================================================
-- COMPREHENSIVE RLS IDENTITY MATRIX TEST SUITE
-- Testing all five security identities across every policy family:
--   1. Anonymous (anon)
--   2. Authenticated Non-Owner (authenticated, aal1)
--   3. Authenticated Owner with AAL1 (authenticated, aal1)
--   4. Authenticated Owner with AAL2 (authenticated, aal2)
--   5. Service Role (service_role)
-- ==============================================================================

BEGIN;
SELECT plan(184);

-------------------------------------------------------------------------------
-- 0. TEST FIXTURES SETUP
-------------------------------------------------------------------------------
-- Dedicated test auth users
INSERT INTO auth.users (id, email) VALUES 
('00000000-0000-0000-0000-000000000001', 'dev-admin@example.com'),
('00000000-0000-0000-0000-000000000098', 'non-owner@example.com') 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.admin_users (id, email) VALUES 
('00000000-0000-0000-0000-000000000001', 'dev-admin@example.com')
ON CONFLICT (id) DO NOTHING;

-- Storage Buckets (resumes is private)
INSERT INTO storage.buckets (id, name, public) VALUES 
('public_assets', 'public_assets', true),
('private_assets', 'private_assets', false),
('resumes', 'resumes', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Media Assets fixtures
INSERT INTO public.media_assets (id, bucket_id, file_name, file_type, file_size, storage_path, alt_text, caption, is_decorative, is_archived) VALUES
('20000000-0000-0000-0000-000000000001', 'public_assets', 'm_pub.jpg', 'image/jpeg', 100, 'test/m_pub.jpg', 'Public Media', NULL, false, false),
('20000000-0000-0000-0000-000000000002', 'public_assets', 'm_arch.jpg', 'image/jpeg', 100, 'test/m_arch.jpg', 'Archived Media', NULL, false, true),
('20000000-0000-0000-0000-000000000003', 'private_assets', 'm_priv.jpg', 'image/jpeg', 100, 'test/m_priv.jpg', 'Private Media', NULL, false, false),
('20000000-0000-0000-0000-000000000004', 'resumes', 'm_res.pdf', 'application/pdf', 100, 'test/m_res.pdf', 'Resume Media', NULL, false, false),
('20000000-0000-0000-0000-000000000005', 'public_assets', 'm_cert.jpg', 'image/jpeg', 100, 'test/m_cert.jpg', 'Cert Media', NULL, false, false),
('20000000-0000-0000-0000-000000000006', 'public_assets', 'm_ach.jpg', 'image/jpeg', 100, 'test/m_ach.jpg', 'Ach Media', NULL, false, false)
ON CONFLICT (id) DO NOTHING;

-- Storage Objects fixtures
INSERT INTO storage.objects (id, bucket_id, name, owner) VALUES
('30000000-0000-0000-0000-000000000001', 'public_assets', 'test/m_pub.jpg', '00000000-0000-0000-0000-000000000001'),
('30000000-0000-0000-0000-000000000002', 'private_assets', 'test/m_priv.jpg', '00000000-0000-0000-0000-000000000001'),
('30000000-0000-0000-0000-000000000003', 'resumes', 'test/m_res.pdf', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Profiles
INSERT INTO public.profiles (id, full_name, professional_name, headline, bio, github_url, is_published, avatar_asset_id) VALUES
('20000000-0000-0000-0000-000000000010', 'Live Profile', 'Live Prof', 'Head', 'Bio', 'https://github.com/live', true, '20000000-0000-0000-0000-000000000001'),
('20000000-0000-0000-0000-000000000011', 'Draft Profile', 'Draft Prof', 'Head', 'Bio', 'https://github.com/draft', false, NULL)
ON CONFLICT (id) DO NOTHING;

-- Projects
INSERT INTO public.projects (id, slug, title, category, tier, description, technologies, state, is_archived, featured_asset_id) VALUES
('20000000-0000-0000-0000-000000000020', 'proj-live', 'Live Project', 'Web', 'standard', 'Desc', ARRAY['TS'], 'live', false, '20000000-0000-0000-0000-000000000001'),
('20000000-0000-0000-0000-000000000021', 'proj-draft', 'Draft Project', 'Web', 'standard', 'Desc', ARRAY['TS'], 'draft', false, NULL),
('20000000-0000-0000-0000-000000000022', 'proj-arch', 'Archived Project', 'Web', 'standard', 'Desc', ARRAY['TS'], 'live', true, NULL)
ON CONFLICT (id) DO NOTHING;

-- Project Sections
INSERT INTO public.project_sections (id, project_id, title, content, display_order) VALUES
('20000000-0000-0000-0000-000000000030', '20000000-0000-0000-0000-000000000020', 'Live Section', 'Content', 1),
('20000000-0000-0000-0000-000000000031', '20000000-0000-0000-0000-000000000021', 'Draft Section', 'Content', 1)
ON CONFLICT (id) DO NOTHING;

-- Project Section Media
INSERT INTO public.project_section_media (id, section_id, media_asset_id, display_order) VALUES
('20000000-0000-0000-0000-000000000035', '20000000-0000-0000-0000-000000000030', '20000000-0000-0000-0000-000000000001', 1),
('20000000-0000-0000-0000-000000000036', '20000000-0000-0000-0000-000000000030', '20000000-0000-0000-0000-000000000002', 2), -- references archived media
('20000000-0000-0000-0000-000000000037', '20000000-0000-0000-0000-000000000031', '20000000-0000-0000-0000-000000000001', 1)  -- on draft project section
ON CONFLICT (id) DO NOTHING;

-- Skill Categories & Skills
INSERT INTO public.skill_categories (id, name, display_order, is_published, is_archived) VALUES
('20000000-0000-0000-0000-000000000040', 'Live Cat', 1, true, false),
('20000000-0000-0000-0000-000000000041', 'Arch Cat', 2, true, true),
('20000000-0000-0000-0000-000000000042', 'Unpub Cat', 3, false, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.skills (id, category_id, name, proficiency_level, icon_identifier, is_published, is_archived) VALUES
('20000000-0000-0000-0000-000000000045', '20000000-0000-0000-0000-000000000040', 'Live Skill', 'Working Knowledge', 'ts', true, false),
('20000000-0000-0000-0000-000000000046', '20000000-0000-0000-0000-000000000040', 'Arch Skill', 'Working Knowledge', 'js', true, true),
('20000000-0000-0000-0000-000000000047', '20000000-0000-0000-0000-000000000042', 'Skill in Unpub Cat', 'Working Knowledge', 'py', true, false),
('20000000-0000-0000-0000-000000000048', '20000000-0000-0000-0000-000000000041', 'Skill in Arch Cat', 'Working Knowledge', 'c', true, false)
ON CONFLICT (id) DO NOTHING;

-- Education & Experience
INSERT INTO public.education (id, institution, degree, field_of_study, start_date, is_published, is_archived) VALUES
('20000000-0000-0000-0000-000000000050', 'Live Uni', 'BS', 'CS', '2024-01-01', true, false),
('20000000-0000-0000-0000-000000000051', 'Arch Uni', 'BS', 'CS', '2024-01-01', true, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.experiences (id, organization, role_title, type, start_date, description_points, is_published, is_archived) VALUES
('20000000-0000-0000-0000-000000000055', 'Live Corp', 'Dev', 'Full-time', '2024-01-01', ARRAY['Point 1'], true, false),
('20000000-0000-0000-0000-000000000056', 'Arch Corp', 'Dev', 'Full-time', '2024-01-01', ARRAY['Point 1'], true, true)
ON CONFLICT (id) DO NOTHING;

-- Certifications & Achievements
INSERT INTO public.certifications (id, name, issuing_organization, issue_date, credential_url, certificate_asset_id, is_published, is_archived) VALUES
('20000000-0000-0000-0000-000000000060', 'Live Cert', 'Issuer', '2024-01-01', 'https://example.com/cert', '20000000-0000-0000-0000-000000000005', true, false),
('20000000-0000-0000-0000-000000000061', 'Arch Cert', 'Issuer', '2024-01-01', NULL, NULL, true, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.achievements (id, title, date, description, achievement_asset_id, is_published, is_archived) VALUES
('20000000-0000-0000-0000-000000000065', 'Live Ach', '2024-01-01', 'Desc', '20000000-0000-0000-0000-000000000006', true, false),
('20000000-0000-0000-0000-000000000066', 'Arch Ach', '2024-01-01', 'Desc', NULL, true, true)
ON CONFLICT (id) DO NOTHING;

-- SEO Entries
INSERT INTO public.seo_entries (id, route_path, title, description, is_published, is_archived) VALUES
('20000000-0000-0000-0000-000000000070', '/live-route', 'Live SEO', 'Desc', true, false),
('20000000-0000-0000-0000-000000000071', '/arch-route', 'Arch SEO', 'Desc', true, true)
ON CONFLICT (id) DO NOTHING;

-- Resume Versions (Active resume is already seeded at 10000000-0000-0000-0000-000000000080)
INSERT INTO public.resume_versions (id, version_label, file_asset_id, is_active, is_archived) VALUES
('20000000-0000-0000-0000-000000000081', 'Arch Resume', '20000000-0000-0000-0000-000000000004', false, true),
('20000000-0000-0000-0000-000000000082', 'Inact Resume', '20000000-0000-0000-0000-000000000004', false, false)
ON CONFLICT (id) DO NOTHING;

-- Drafts & Contacts
INSERT INTO public.drafts (entity_type, entity_id, draft_data) VALUES 
('projects', '20000000-0000-0000-0000-000000000021', '{"title": "Draft Proj Candidate"}')
ON CONFLICT DO NOTHING;

INSERT INTO public.contact_messages (id, sender_name, sender_email, subject, message, state) VALUES 
('20000000-0000-0000-0000-000000000090', 'Sender', 's@example.com', 'Subj', 'Msg', 'new')
ON CONFLICT (id) DO NOTHING;

-------------------------------------------------------------------------------
-- 1. ANONYMOUS ROLE (anon)
-------------------------------------------------------------------------------
SET ROLE anon;
SELECT set_config('request.jwt.claims', '', true);

-- Reads: Public visibility
SELECT is((SELECT count(*) FROM public.profiles WHERE id = '20000000-0000-0000-0000-000000000010'), 1::bigint, 'Anon: sees live profile');
SELECT is((SELECT count(*) FROM public.profiles WHERE id = '20000000-0000-0000-0000-000000000011'), 0::bigint, 'Anon: cannot see draft profile');

SELECT is((SELECT count(*) FROM public.projects WHERE id = '20000000-0000-0000-0000-000000000020'), 1::bigint, 'Anon: sees live project');
SELECT is((SELECT count(*) FROM public.projects WHERE id = '20000000-0000-0000-0000-000000000021'), 0::bigint, 'Anon: cannot see draft project');
SELECT is((SELECT count(*) FROM public.projects WHERE id = '20000000-0000-0000-0000-000000000022'), 0::bigint, 'Anon: cannot see archived project');

SELECT is((SELECT count(*) FROM public.project_sections WHERE id = '20000000-0000-0000-0000-000000000030'), 1::bigint, 'Anon: sees live project section');
SELECT is((SELECT count(*) FROM public.project_sections WHERE id = '20000000-0000-0000-0000-000000000031'), 0::bigint, 'Anon: cannot see draft project section');

-- project_section_media leakage test
SELECT is((SELECT count(*) FROM public.project_section_media WHERE id = '20000000-0000-0000-0000-000000000035'), 1::bigint, 'Anon: sees valid live section media');
SELECT is((SELECT count(*) FROM public.project_section_media WHERE id = '20000000-0000-0000-0000-000000000036'), 0::bigint, 'Anon: cannot see section media with archived asset');
SELECT is((SELECT count(*) FROM public.project_section_media WHERE id = '20000000-0000-0000-0000-000000000037'), 0::bigint, 'Anon: cannot see section media of draft project');

-- media_assets (resumes is private bucket, only public_assets is visible)
SELECT is((SELECT count(*) FROM public.media_assets WHERE id = '20000000-0000-0000-0000-000000000001'), 1::bigint, 'Anon: sees public active media');
SELECT is((SELECT count(*) FROM public.media_assets WHERE id = '20000000-0000-0000-0000-000000000002'), 0::bigint, 'Anon: cannot see archived media');
SELECT is((SELECT count(*) FROM public.media_assets WHERE id = '20000000-0000-0000-0000-000000000003'), 0::bigint, 'Anon: cannot see private media');
SELECT is((SELECT count(*) FROM public.media_assets WHERE id = '20000000-0000-0000-0000-000000000004'), 0::bigint, 'Anon: cannot see resume media asset (bucket is private)');

-- categories, skills (including hidden categories verification)
SELECT is((SELECT count(*) FROM public.skill_categories WHERE id = '20000000-0000-0000-0000-000000000040'), 1::bigint, 'Anon: sees live skill category');
SELECT is((SELECT count(*) FROM public.skill_categories WHERE id = '20000000-0000-0000-0000-000000000041'), 0::bigint, 'Anon: cannot see archived skill category');
SELECT is((SELECT count(*) FROM public.skill_categories WHERE id = '20000000-0000-0000-0000-000000000042'), 0::bigint, 'Anon: cannot see unpublished skill category');

SELECT is((SELECT count(*) FROM public.skills WHERE id = '20000000-0000-0000-0000-000000000045'), 1::bigint, 'Anon: sees live skill under published category');
SELECT is((SELECT count(*) FROM public.skills WHERE id = '20000000-0000-0000-0000-000000000046'), 0::bigint, 'Anon: cannot see archived skill');
SELECT is((SELECT count(*) FROM public.skills WHERE id = '20000000-0000-0000-0000-000000000047'), 0::bigint, 'Anon: cannot see published skill under unpublished category');
SELECT is((SELECT count(*) FROM public.skills WHERE id = '20000000-0000-0000-0000-000000000048'), 0::bigint, 'Anon: cannot see published skill under archived category');

SELECT is((SELECT count(*) FROM public.education WHERE id = '20000000-0000-0000-0000-000000000050'), 1::bigint, 'Anon: sees live education');
SELECT is((SELECT count(*) FROM public.education WHERE id = '20000000-0000-0000-0000-000000000051'), 0::bigint, 'Anon: cannot see archived education');

SELECT is((SELECT count(*) FROM public.experiences WHERE id = '20000000-0000-0000-0000-000000000055'), 1::bigint, 'Anon: sees live experience');
SELECT is((SELECT count(*) FROM public.experiences WHERE id = '20000000-0000-0000-0000-000000000056'), 0::bigint, 'Anon: cannot see archived experience');

SELECT is((SELECT count(*) FROM public.certifications WHERE id = '20000000-0000-0000-0000-000000000060'), 1::bigint, 'Anon: sees live certification');
SELECT is((SELECT count(*) FROM public.certifications WHERE id = '20000000-0000-0000-0000-000000000061'), 0::bigint, 'Anon: cannot see archived certification');

SELECT is((SELECT count(*) FROM public.achievements WHERE id = '20000000-0000-0000-0000-000000000065'), 1::bigint, 'Anon: sees live achievement');
SELECT is((SELECT count(*) FROM public.achievements WHERE id = '20000000-0000-0000-0000-000000000066'), 0::bigint, 'Anon: cannot see archived achievement');

SELECT is((SELECT count(*) FROM public.seo_entries WHERE id = '20000000-0000-0000-0000-000000000070'), 1::bigint, 'Anon: sees live SEO entry');
SELECT is((SELECT count(*) FROM public.seo_entries WHERE id = '20000000-0000-0000-0000-000000000071'), 0::bigint, 'Anon: cannot see archived SEO entry');

SELECT is((SELECT count(*) FROM public.resume_versions WHERE id = '10000000-0000-0000-0000-000000000080'), 1::bigint, 'Anon: sees active resume');
SELECT is((SELECT count(*) FROM public.resume_versions WHERE id = '20000000-0000-0000-0000-000000000081'), 0::bigint, 'Anon: cannot see archived resume');
SELECT is((SELECT count(*) FROM public.resume_versions WHERE id = '20000000-0000-0000-0000-000000000082'), 0::bigint, 'Anon: cannot see inactive resume');

-- Blocked reads (table-level denial for unprivileged private tables)
SELECT throws_ok($$ SELECT count(*) FROM public.drafts $$, '42501', 'permission denied for table drafts', 'Anon: cannot select from drafts');
SELECT throws_ok($$ SELECT count(*) FROM public.contact_messages $$, '42501', 'permission denied for table contact_messages', 'Anon: cannot select from contact messages');
SELECT throws_ok($$ SELECT count(*) FROM public.admin_users $$, '42501', 'permission denied for table admin_users', 'Anon: cannot select from admin users');
SELECT throws_ok($$ SELECT count(*) FROM public.content_revisions $$, '42501', 'permission denied for table content_revisions', 'Anon: cannot select from content revisions');

-- Storage reads (private resume bucket is completely hidden from anon)
SELECT is((SELECT count(*) FROM storage.objects WHERE id = '30000000-0000-0000-0000-000000000001'), 1::bigint, 'Anon: sees public asset object');
SELECT is((SELECT count(*) FROM storage.objects WHERE id = '30000000-0000-0000-0000-000000000002'), 0::bigint, 'Anon: cannot see private asset object');
SELECT is((SELECT count(*) FROM storage.objects WHERE id = '30000000-0000-0000-0000-000000000003'), 0::bigint, 'Anon: cannot see private resume storage object');

-- Blocked mutations (table-level denial for unprivileged operations)
SELECT throws_ok($$ UPDATE public.projects SET title = 'Hacked' WHERE id = '20000000-0000-0000-0000-000000000020' $$, '42501', 'permission denied for table projects', 'Anon: update on live project denied at table level');
SELECT throws_ok($$ DELETE FROM public.projects WHERE id = '20000000-0000-0000-0000-000000000020' $$, '42501', 'permission denied for table projects', 'Anon: delete on live project denied at table level');
SELECT throws_ok($$ UPDATE public.profiles SET full_name = 'Hacked' WHERE id = '20000000-0000-0000-0000-000000000010' $$, '42501', 'permission denied for table profiles', 'Anon: update on profile denied at table level');

SELECT throws_ok($$ INSERT INTO public.contact_messages (sender_name, sender_email, subject, message) VALUES ('a','a','a','a') $$, '42501', 'permission denied for table contact_messages', 'Anon: cannot directly insert contact messages');
SELECT throws_ok($$ SELECT public.is_aal2_admin() $$, '42501', 'permission denied for function is_aal2_admin', 'Anon: direct invocation of is_aal2_admin() denied at function level');

-------------------------------------------------------------------------------
-- 2. AUTHENTICATED NON-OWNER (authenticated, aal1)
-------------------------------------------------------------------------------
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000098", "aal": "aal1"}', true);

SELECT is((SELECT count(*) FROM public.drafts), 0::bigint, 'Non-owner: cannot see drafts');
SELECT is((SELECT count(*) FROM public.projects WHERE id = '20000000-0000-0000-0000-000000000021'), 0::bigint, 'Non-owner: cannot see draft projects');

UPDATE public.projects SET title = 'Hacked' WHERE id = '20000000-0000-0000-0000-000000000020';
SELECT is((SELECT title FROM public.projects WHERE id = '20000000-0000-0000-0000-000000000020'), 'Live Project', 'Non-owner: update did not persist');

SELECT throws_ok($$ INSERT INTO public.drafts (entity_type, entity_id, draft_data) VALUES ('projects', '20000000-0000-0000-0000-000000000021', '{"title": "Hacked"}') $$, 'new row violates row-level security policy for table "drafts"', 'Non-owner: cannot insert drafts');

-------------------------------------------------------------------------------
-- 3. AUTHENTICATED OWNER WITH AAL1 (authenticated, aal1)
-------------------------------------------------------------------------------
SELECT set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000001", "aal": "aal1"}', true);

SELECT is((SELECT count(*) FROM public.drafts), 0::bigint, 'AAL1: cannot see drafts');
SELECT is((SELECT count(*) FROM public.contact_messages), 0::bigint, 'AAL1: cannot see contact messages');

UPDATE public.projects SET title = 'Hacked' WHERE id = '20000000-0000-0000-0000-000000000020';
SELECT is((SELECT title FROM public.projects WHERE id = '20000000-0000-0000-0000-000000000020'), 'Live Project', 'AAL1: update did not persist');

SELECT throws_ok($$ INSERT INTO public.drafts (entity_type, entity_id, draft_data) VALUES ('projects', '20000000-0000-0000-0000-000000000021', '{"title": "Hacked"}') $$, 'new row violates row-level security policy for table "drafts"', 'AAL1: cannot insert drafts');

-------------------------------------------------------------------------------
-- 4. AUTHENTICATED OWNER WITH AAL2 (authenticated, aal2)
-------------------------------------------------------------------------------
SELECT set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000001", "aal": "aal2"}', true);

-- Full read access
SELECT is((SELECT count(*) FROM public.drafts), 1::bigint, 'AAL2: can see drafts');
SELECT is((SELECT count(*) FROM public.contact_messages), 1::bigint, 'AAL2: can see contact messages');
SELECT is((SELECT count(*) FROM storage.objects WHERE id = '30000000-0000-0000-0000-000000000002'), 1::bigint, 'AAL2: can read private storage objects');
SELECT is((SELECT count(*) FROM storage.objects WHERE id = '30000000-0000-0000-0000-000000000003'), 1::bigint, 'AAL2: can read resume storage objects');

-- Boundary tests: Direct insertion of live/published/active records blocked
SELECT throws_ok(
    $$ INSERT INTO public.projects (slug, title, category, tier, description, technologies, state) VALUES ('p-live-insert', 'T', 'Web', 'standard', 'D', ARRAY['A'], 'live') $$,
    'Cannot insert live record directly. Must use drafts.',
    'AAL2: cannot insert an already-live project'
);

-- Parameterized validation of project creation workflow states
SELECT throws_ok(
    $$ INSERT INTO public.projects (slug, title, category, tier, description, technologies, state) VALUES ('p-state-pubq', 'T', 'Web', 'standard', 'D', ARRAY['A'], 'publication_queued') $$,
    'Cannot insert record with non-draft state directly. Provided state: publication_queued',
    'AAL2: cannot insert project with publication_queued state'
);

SELECT throws_ok(
    $$ INSERT INTO public.projects (slug, title, category, tier, description, technologies, state) VALUES ('p-state-build', 'T', 'Web', 'standard', 'D', ARRAY['A'], 'deployment_building') $$,
    'Cannot insert record with non-draft state directly. Provided state: deployment_building',
    'AAL2: cannot insert project with deployment_building state'
);

SELECT throws_ok(
    $$ INSERT INTO public.projects (slug, title, category, tier, description, technologies, state) VALUES ('p-state-fail', 'T', 'Web', 'standard', 'D', ARRAY['A'], 'deployment_failed') $$,
    'Cannot insert record with non-draft state directly. Provided state: deployment_failed',
    'AAL2: cannot insert project with deployment_failed state'
);

SELECT lives_ok(
    $$ INSERT INTO public.projects (slug, title, category, tier, description, technologies, state) VALUES ('p-state-draft', 'T', 'Web', 'standard', 'D', ARRAY['A'], 'draft') $$,
    'AAL2: can insert project with draft state'
);

SELECT throws_ok(
    $$ INSERT INTO public.profiles (full_name, professional_name, headline, bio, github_url, is_published) VALUES ('P', 'P', 'H', 'B', 'https://github.com/p', true) $$,
    'Cannot insert published record directly. Must use drafts.',
    'AAL2: cannot insert an already-published profile'
);

SELECT throws_ok(
    $$ INSERT INTO public.resume_versions (version_label, file_asset_id, is_active) VALUES ('V2', '20000000-0000-0000-0000-000000000004', true) $$,
    'Cannot insert active record directly.',
    'AAL2: cannot directly insert an active resume'
);

-- Trigger protections: Direct mutation of live records blocked
SELECT throws_ok(
    $$ UPDATE public.profiles SET full_name = 'Hacked' WHERE id = '20000000-0000-0000-0000-000000000010' $$,
    'Cannot directly update a published record. Must update drafts and publish atomically.',
    'AAL2: blocked from directly modifying live profile'
);
SELECT is((SELECT full_name FROM public.profiles WHERE id = '20000000-0000-0000-0000-000000000010'), 'Live Profile', 'AAL2: profile update was blocked');

SELECT throws_ok(
    $$ UPDATE public.projects SET title = 'Hacked' WHERE id = '20000000-0000-0000-0000-000000000020' $$,
    'Cannot directly update a live record. Must update drafts and publish atomically.',
    'AAL2: blocked from directly modifying live project'
);

SELECT throws_ok(
    $$ UPDATE public.project_sections SET title = 'Hacked' WHERE id = '20000000-0000-0000-0000-000000000030' $$,
    'Cannot modify sections of a live project. Update drafts instead.',
    'AAL2: blocked from modifying section of live project'
);

-- Old-parent transition bypass protections
SELECT throws_ok(
    $$ UPDATE public.project_sections SET project_id = '20000000-0000-0000-0000-000000000021' WHERE id = '20000000-0000-0000-0000-000000000030' $$,
    'Cannot modify sections of a live project. Update drafts instead.',
    'AAL2: blocked from moving section from live project to draft project'
);

SELECT throws_ok(
    $$ UPDATE public.project_section_media SET section_id = '20000000-0000-0000-0000-000000000031' WHERE id = '20000000-0000-0000-0000-000000000035' $$,
    'Cannot mutate section media of a live project directly. Must update drafts and publish atomically.',
    'AAL2: blocked from moving section media from live section to draft section'
);

SELECT throws_ok(
    $$ INSERT INTO public.project_section_media (section_id, media_asset_id) VALUES ('20000000-0000-0000-0000-000000000030', '20000000-0000-0000-0000-000000000001') $$,
    'Cannot mutate section media of a live project directly. Must update drafts and publish atomically.',
    'AAL2: blocked from inserting section media on live project'
);

SELECT throws_ok(
    $$ DELETE FROM public.project_section_media WHERE id = '20000000-0000-0000-0000-000000000035' $$,
    'Cannot mutate section media of a live project directly. Must update drafts and publish atomically.',
    'AAL2: blocked from deleting section media on live project'
);

SELECT throws_ok(
    $$ UPDATE public.skills SET name = 'Hacked' WHERE id = '20000000-0000-0000-0000-000000000045' $$,
    'Cannot directly update a published record. Must update drafts and publish atomically.',
    'AAL2: blocked from modifying live skill'
);

SELECT throws_ok(
    $$ UPDATE public.resume_versions SET is_active = false WHERE id = '10000000-0000-0000-0000-000000000080' $$,
    'Cannot directly update an active record.',
    'AAL2: blocked from modifying active resume'
);

-- Client deletion protection on media_assets (denied at table level for archive-first table)
SELECT throws_ok(
    $$ DELETE FROM public.media_assets WHERE id = '20000000-0000-0000-0000-000000000001' $$,
    '42501',
    'permission denied for table media_assets',
    'AAL2: delete on media_assets denied at table level'
);

-- Media Assets mutation protection
SELECT throws_ok(
    $$ INSERT INTO public.media_assets (bucket_id, file_name, file_type, file_size, storage_path) VALUES ('public_assets', 'hack.jpg', 'image/jpeg', 100, 'test/hack.jpg') $$,
    'Cannot insert public media asset directly. Upload to staging buckets first.',
    'AAL2: cannot directly insert into media_assets pointing to public_assets'
);

SELECT lives_ok(
    $$ INSERT INTO public.media_assets (id, bucket_id, file_name, file_type, file_size, storage_path) VALUES ('20000000-0000-0000-0000-000000000007', 'private_assets', 'new_priv.jpg', 'image/jpeg', 100, 'test/new_priv.jpg') $$,
    'AAL2: can insert private staging media asset'
);

SELECT throws_ok(
    $$ UPDATE public.media_assets SET storage_path = 'hacked/path.jpg' WHERE id = '20000000-0000-0000-0000-000000000007' $$,
    'Cannot modify storage location of media assets',
    'AAL2: blocked from altering storage_path on media asset'
);

SELECT throws_ok(
    $$ UPDATE public.media_assets SET bucket_id = 'public_assets' WHERE id = '20000000-0000-0000-0000-000000000007' $$,
    'Cannot modify storage location of media assets',
    'AAL2: blocked from altering bucket_id on media asset'
);

SELECT throws_ok(
    $$ UPDATE public.media_assets SET alt_text = 'Hacked' WHERE id = '20000000-0000-0000-0000-000000000001' $$,
    'Cannot directly update published media asset.',
    'AAL2: blocked from updating published media asset'
);

SELECT throws_ok(
    $$ UPDATE public.media_assets SET alt_text = 'Hacked' WHERE id = '20000000-0000-0000-0000-000000000005' $$,
    'Cannot directly update published media asset.',
    'AAL2: blocked from updating media asset referenced by certification'
);

SELECT lives_ok(
    $$ UPDATE public.media_assets SET alt_text = 'Draft alt text' WHERE id = '20000000-0000-0000-0000-000000000007' $$,
    'AAL2: can update alt_text on unreferenced private media asset'
);

-- Storage Objects policies
SELECT throws_ok(
    $$ INSERT INTO storage.objects (id, bucket_id, name, owner) VALUES ('30000000-0000-0000-0000-000000000010', 'public_assets', 'test/direct_pub.jpg', '00000000-0000-0000-0000-000000000001') $$,
    'new row violates row-level security policy for table "objects"',
    'AAL2: blocked from inserting directly into public_assets bucket'
);

SELECT lives_ok(
    $$ INSERT INTO storage.objects (id, bucket_id, name, owner) VALUES ('30000000-0000-0000-0000-000000000011', 'private_assets', 'test/direct_priv.jpg', '00000000-0000-0000-0000-000000000001') $$,
    'AAL2: can insert into private_assets staging bucket'
);

UPDATE storage.objects SET name = 'tampered.jpg' WHERE id = '30000000-0000-0000-0000-000000000011';
SELECT is((SELECT name FROM storage.objects WHERE id = '30000000-0000-0000-0000-000000000011'), 'test/direct_priv.jpg', 'AAL2: update on private storage object did not persist (no update policy)');

UPDATE storage.objects SET name = 'tampered.jpg' WHERE id = '30000000-0000-0000-0000-000000000001';
SELECT is((SELECT name FROM storage.objects WHERE id = '30000000-0000-0000-0000-000000000001'), 'test/m_pub.jpg', 'AAL2: update on public storage object did not persist (no update policy)');

-- Contact Message client field protection
SELECT throws_ok(
    $$ UPDATE public.contact_messages SET sender_name = 'Hacked' WHERE id = '20000000-0000-0000-0000-000000000090' $$,
    'Only the state of a contact message can be updated by a client',
    'AAL2: cannot mutate message content of contact messages'
);

SELECT lives_ok(
    $$ UPDATE public.contact_messages SET state = 'archived' WHERE id = '20000000-0000-0000-0000-000000000090' $$,
    'AAL2: can update state of contact messages'
);

-- Draft mutation is permitted for AAL2
SELECT lives_ok(
    $$ INSERT INTO public.drafts (entity_type, entity_id, draft_data) VALUES ('profiles', '20000000-0000-0000-0000-000000000010', '{"bio": "New draft bio"}') $$,
    'AAL2: can insert drafts'
);

SELECT lives_ok(
    $$ DELETE FROM public.drafts WHERE entity_type = 'profiles' AND entity_id = '20000000-0000-0000-0000-000000000010' $$,
    'AAL2: can delete drafts'
);

-- Server-only tables are blocked from client insertion (table privilege denied)
SELECT throws_ok(
    $$ INSERT INTO public.content_revisions (entity_type, entity_id, previous_data) VALUES ('projects', '20000000-0000-0000-0000-000000000020', '{}') $$,
    '42501',
    'permission denied for table content_revisions',
    'AAL2: blocked from inserting content revisions'
);

SELECT throws_ok(
    $$ INSERT INTO public.publication_deployments (deployment_status) VALUES ('publication_queued') $$,
    '42501',
    'permission denied for table publication_deployments',
    'AAL2: blocked from inserting publication deployments'
);

-------------------------------------------------------------------------------
-- 5. SERVICE ROLE (service_role)
-------------------------------------------------------------------------------
SET ROLE service_role;
SELECT set_config('request.jwt.claims', '', true);

-- Service role contact insertion (Server Action / Route Handler)
SELECT lives_ok(
    $$ INSERT INTO public.contact_messages (sender_name, sender_email, subject, message) VALUES ('Service Visitor', 'visitor@example.com', 'Inquiry', 'Hello') $$,
    'Service Role: can insert contact messages'
);

-- Service role audit / revision writes
SELECT lives_ok(
    $$ INSERT INTO public.content_revisions (entity_type, entity_id, previous_data) VALUES ('projects', '20000000-0000-0000-0000-000000000020', '{"title": "Previous Title"}') $$,
    'Service Role: can insert content revisions'
);

SELECT lives_ok(
    $$ INSERT INTO public.publication_deployments (deployment_status) VALUES ('publication_queued') $$,
    'Service Role: can insert publication deployments'
);

SELECT lives_ok(
    $$ INSERT INTO public.admin_activity (action, entity_type, entity_id) VALUES ('deploy', 'projects', '20000000-0000-0000-0000-000000000020') $$,
    'Service Role: can insert admin activity'
);

-- Foreign Key ON DELETE RESTRICT on media_assets (enforced even for service_role)
SELECT throws_ok(
    $$ DELETE FROM public.media_assets WHERE id = '20000000-0000-0000-0000-000000000001' $$,
    '23503',
    'update or delete on table "media_assets" violates foreign key constraint "profiles_avatar_asset_id_fkey" on table "profiles"',
    'Service Role: media deletion protection through foreign key constraint'
);
SELECT is((SELECT count(*) FROM public.media_assets WHERE id = '20000000-0000-0000-0000-000000000001'), 1::bigint, 'Media asset remains intact after restricted delete attempt');

SELECT throws_ok(
    $$ DELETE FROM public.media_assets WHERE id = '20000000-0000-0000-0000-000000000005' $$,
    '23503',
    'update or delete on table "media_assets" violates foreign key constraint "certifications_certificate_asset_id_fkey" on table "certifications"',
    'Service Role: certificate media deletion restricted by foreign key'
);
SELECT is((SELECT count(*) FROM public.media_assets WHERE id = '20000000-0000-0000-0000-000000000005'), 1::bigint, 'Certificate media asset remains intact');

SELECT throws_ok(
    $$ DELETE FROM public.media_assets WHERE id = '20000000-0000-0000-0000-000000000006' $$,
    '23503',
    'update or delete on table "media_assets" violates foreign key constraint "achievements_achievement_asset_id_fkey" on table "achievements"',
    'Service Role: achievement media deletion restricted by foreign key'
);
SELECT is((SELECT count(*) FROM public.media_assets WHERE id = '20000000-0000-0000-0000-000000000006'), 1::bigint, 'Achievement media asset remains intact');

-- Verify incomplete publishing RPC is absent in Phase 2
SELECT throws_ok(
    $$ SELECT public.publish_draft('projects', '20000000-0000-0000-0000-000000000020') $$,
    '42883',
    'function public.publish_draft(unknown, unknown) does not exist',
    'Publishing RPC is removed from Phase 2 and deferred to Phase 6'
);

-------------------------------------------------------------------------------
-- 6. POSTGRES TABLE & FUNCTION LEAST-PRIVILEGE MATRIX VERIFICATION
-------------------------------------------------------------------------------
-- Reset role to session user (postgres) for complete system catalog & information schema visibility
RESET ROLE;
SELECT set_config('request.jwt.claims', '', true);

-- Verify table-level permissions and function execution privileges across roles:

-- (A) Anonymous Role Privileges (13 public content tables)
SELECT ok(has_table_privilege('anon', 'public.profiles', 'SELECT'), 'Anon has SELECT on profiles');
SELECT ok(has_table_privilege('anon', 'public.projects', 'SELECT'), 'Anon has SELECT on projects');
SELECT ok(has_table_privilege('anon', 'public.project_sections', 'SELECT'), 'Anon has SELECT on project_sections');
SELECT ok(has_table_privilege('anon', 'public.project_section_media', 'SELECT'), 'Anon has SELECT on project_section_media');
SELECT ok(has_table_privilege('anon', 'public.skill_categories', 'SELECT'), 'Anon has SELECT on skill_categories');
SELECT ok(has_table_privilege('anon', 'public.skills', 'SELECT'), 'Anon has SELECT on skills');
SELECT ok(has_table_privilege('anon', 'public.education', 'SELECT'), 'Anon has SELECT on education');
SELECT ok(has_table_privilege('anon', 'public.experiences', 'SELECT'), 'Anon has SELECT on experiences');
SELECT ok(has_table_privilege('anon', 'public.certifications', 'SELECT'), 'Anon has SELECT on certifications');
SELECT ok(has_table_privilege('anon', 'public.achievements', 'SELECT'), 'Anon has SELECT on achievements');
SELECT ok(has_table_privilege('anon', 'public.resume_versions', 'SELECT'), 'Anon has SELECT on resume_versions');
SELECT ok(has_table_privilege('anon', 'public.seo_entries', 'SELECT'), 'Anon has SELECT on seo_entries');
SELECT ok(has_table_privilege('anon', 'public.media_assets', 'SELECT'), 'Anon has SELECT on media_assets');

-- (B) Anonymous Role Denials (Unprivileged tables, mutation, function execution)
SELECT ok(NOT has_table_privilege('anon', 'public.admin_users', 'SELECT'), 'Anon denied SELECT on admin_users');
SELECT ok(NOT has_table_privilege('anon', 'public.drafts', 'SELECT'), 'Anon denied SELECT on drafts');
SELECT ok(NOT has_table_privilege('anon', 'public.contact_messages', 'SELECT'), 'Anon denied SELECT on contact_messages');
SELECT ok(NOT has_table_privilege('anon', 'public.contact_messages', 'INSERT'), 'Anon denied INSERT on contact_messages');
SELECT ok(NOT has_table_privilege('anon', 'public.content_revisions', 'SELECT'), 'Anon denied SELECT on content_revisions');
SELECT ok(NOT has_table_privilege('anon', 'public.publication_deployments', 'SELECT'), 'Anon denied SELECT on publication_deployments');
SELECT ok(NOT has_table_privilege('anon', 'public.admin_activity', 'SELECT'), 'Anon denied SELECT on admin_activity');
SELECT ok(NOT has_table_privilege('anon', 'public.projects', 'INSERT'), 'Anon denied INSERT on projects');
SELECT ok(NOT has_table_privilege('anon', 'public.profiles', 'UPDATE'), 'Anon denied UPDATE on profiles');
SELECT ok(NOT has_table_privilege('anon', 'public.projects', 'DELETE'), 'Anon denied DELETE on projects');
SELECT ok(NOT has_function_privilege('anon', 'public.is_aal2_admin()', 'EXECUTE'), 'Anon denied EXECUTE on is_aal2_admin()');
SELECT ok(NOT has_function_privilege('public', 'public.is_aal2_admin()', 'EXECUTE'), 'PUBLIC denied EXECUTE on is_aal2_admin()');
SELECT is((SELECT count(*) FROM information_schema.routine_privileges WHERE routine_schema = 'public' AND grantee = 'anon' AND privilege_type = 'EXECUTE'), 0::bigint, 'Anon has zero EXECUTE privileges on routines in public schema');

-- (C) Authenticated Role Privileges & Denials (Approved CMS privileges, archive-first, server-only)
SELECT ok(has_table_privilege('authenticated', 'public.drafts', 'INSERT'), 'Authenticated has INSERT on drafts');
SELECT ok(has_table_privilege('authenticated', 'public.drafts', 'UPDATE'), 'Authenticated has UPDATE on drafts');
SELECT ok(has_table_privilege('authenticated', 'public.drafts', 'DELETE'), 'Authenticated has DELETE on drafts');
SELECT ok(has_table_privilege('authenticated', 'public.profiles', 'INSERT'), 'Authenticated has INSERT on profiles');
SELECT ok(has_table_privilege('authenticated', 'public.profiles', 'UPDATE'), 'Authenticated has UPDATE on profiles');
SELECT ok(NOT has_table_privilege('authenticated', 'public.profiles', 'DELETE'), 'Authenticated denied DELETE on profiles (archive-first)');
SELECT ok(has_table_privilege('authenticated', 'public.projects', 'INSERT'), 'Authenticated has INSERT on projects');
SELECT ok(has_table_privilege('authenticated', 'public.projects', 'UPDATE'), 'Authenticated has UPDATE on projects');
SELECT ok(NOT has_table_privilege('authenticated', 'public.projects', 'DELETE'), 'Authenticated denied DELETE on projects (archive-first)');
SELECT ok(has_table_privilege('authenticated', 'public.project_sections', 'DELETE'), 'Authenticated has DELETE on project_sections');
SELECT ok(has_table_privilege('authenticated', 'public.project_section_media', 'DELETE'), 'Authenticated has DELETE on project_section_media');
SELECT ok(NOT has_table_privilege('authenticated', 'public.media_assets', 'DELETE'), 'Authenticated denied DELETE on media_assets (archive-first)');
SELECT ok(NOT has_table_privilege('authenticated', 'public.admin_users', 'INSERT'), 'Authenticated denied INSERT on admin_users');
SELECT ok(NOT has_table_privilege('authenticated', 'public.admin_users', 'UPDATE'), 'Authenticated denied UPDATE on admin_users');
SELECT ok(NOT has_table_privilege('authenticated', 'public.admin_users', 'DELETE'), 'Authenticated denied DELETE on admin_users');
SELECT ok(NOT has_table_privilege('authenticated', 'public.content_revisions', 'INSERT'), 'Authenticated denied INSERT on content_revisions');
SELECT ok(NOT has_table_privilege('authenticated', 'public.publication_deployments', 'INSERT'), 'Authenticated denied INSERT on publication_deployments');
SELECT ok(NOT has_table_privilege('authenticated', 'public.admin_activity', 'INSERT'), 'Authenticated denied INSERT on admin_activity');
SELECT ok(NOT has_table_privilege('authenticated', 'public.contact_messages', 'INSERT'), 'Authenticated denied INSERT on contact_messages');
SELECT ok(NOT has_table_privilege('authenticated', 'public.contact_messages', 'DELETE'), 'Authenticated denied DELETE on contact_messages');
SELECT ok(has_table_privilege('authenticated', 'public.contact_messages', 'UPDATE'), 'Authenticated has UPDATE on contact_messages');
SELECT ok(has_function_privilege('authenticated', 'public.is_aal2_admin()', 'EXECUTE'), 'Authenticated has EXECUTE on is_aal2_admin()');
SELECT is((SELECT count(*) FROM information_schema.role_usage_grants WHERE grantee = 'authenticated' AND object_schema = 'public' AND object_type = 'SEQUENCE'), 0::bigint, 'Authenticated role has zero sequence USAGE privileges in public schema');

-- (D) Service Role Privileges (Required server provisioning privileges)
SELECT ok(has_table_privilege('service_role', 'public.profiles', 'INSERT'), 'Service role has INSERT on profiles');
SELECT ok(has_table_privilege('service_role', 'public.projects', 'INSERT'), 'Service role has INSERT on projects');
SELECT ok(has_table_privilege('service_role', 'public.media_assets', 'INSERT'), 'Service role has INSERT on media_assets');
SELECT ok(has_table_privilege('service_role', 'public.contact_messages', 'INSERT'), 'Service role has INSERT on contact_messages');
SELECT ok(has_table_privilege('service_role', 'public.content_revisions', 'INSERT'), 'Service role has INSERT on content_revisions');
SELECT ok(has_table_privilege('service_role', 'public.publication_deployments', 'INSERT'), 'Service role has INSERT on publication_deployments');
SELECT ok(has_table_privilege('service_role', 'public.admin_activity', 'INSERT'), 'Service role has INSERT on admin_activity');
SELECT ok(has_function_privilege('service_role', 'public.is_aal2_admin()', 'EXECUTE'), 'Service role has EXECUTE on is_aal2_admin()');

-- (E) Information Schema Role Table Grants Matrix
SELECT is((SELECT count(*) FROM information_schema.role_table_grants WHERE grantee = 'anon' AND table_schema = 'public' AND privilege_type <> 'SELECT'), 0::bigint, 'Anon has zero non-SELECT table privileges in public schema');
SELECT is((SELECT count(*) FROM information_schema.role_table_grants WHERE grantee = 'anon' AND table_schema = 'public' AND table_name NOT IN ('profiles', 'projects', 'project_sections', 'project_section_media', 'skill_categories', 'skills', 'education', 'experiences', 'certifications', 'achievements', 'resume_versions', 'seo_entries', 'media_assets')), 0::bigint, 'Anon has zero table privileges on non-public tables in public schema');
SELECT is((SELECT count(*) FROM information_schema.role_table_grants WHERE grantee = 'anon' AND table_schema = 'public' AND privilege_type = 'SELECT'), 13::bigint, 'Anon has SELECT on exactly 13 public content tables');
SELECT is((SELECT count(*) FROM information_schema.role_table_grants WHERE grantee = 'PUBLIC' AND table_schema = 'public'), 0::bigint, 'PUBLIC role has zero table privileges in public schema');

-- (F) Admin RLS Policies Role Assignment
SELECT is((SELECT count(*) FROM pg_policies WHERE policyname LIKE 'Admins%' AND roles <> '{authenticated}'), 0::bigint, 'Every admin policy is explicitly assigned strictly to authenticated role');

-- (G) Default ACL Verification (pg_default_acl for postgres role)
SELECT ok(
    NOT EXISTS (
        SELECT 1 FROM pg_default_acl d
        JOIN pg_namespace n ON n.oid = d.defaclnamespace
        JOIN pg_roles r ON r.oid = d.defaclrole,
        unnest(d.defaclacl) AS acl_entry
        WHERE n.nspname = 'public'
          AND r.rolname = 'postgres'
          AND d.defaclobjtype = 'r'
          AND split_part(acl_entry::text, '=', 1) IN ('anon', 'authenticated', '')
    ),
    'Default ACL: postgres grants no default table privileges in public to anon, authenticated, or public'
);
SELECT ok(
    NOT EXISTS (
        SELECT 1 FROM pg_default_acl d
        JOIN pg_namespace n ON n.oid = d.defaclnamespace
        JOIN pg_roles r ON r.oid = d.defaclrole,
        unnest(d.defaclacl) AS acl_entry
        WHERE n.nspname = 'public'
          AND r.rolname = 'postgres'
          AND d.defaclobjtype = 'f'
          AND split_part(acl_entry::text, '=', 1) IN ('anon', 'authenticated', '')
    ),
    'Default ACL: postgres grants no default function privileges in public to anon, authenticated, or public'
);
SELECT ok(
    NOT EXISTS (
        SELECT 1 FROM pg_default_acl d
        JOIN pg_namespace n ON n.oid = d.defaclnamespace
        JOIN pg_roles r ON r.oid = d.defaclrole,
        unnest(d.defaclacl) AS acl_entry
        WHERE n.nspname = 'public'
          AND r.rolname = 'postgres'
          AND d.defaclobjtype = 'S'
          AND split_part(acl_entry::text, '=', 1) IN ('anon', 'authenticated', '')
    ),
    'Default ACL: postgres grants no default sequence privileges in public to anon, authenticated, or public'
);

-- (H) Schema Privileges
SELECT ok(has_schema_privilege('anon', 'public', 'USAGE'), 'Schema privilege: anon has USAGE on public');
SELECT ok(NOT has_schema_privilege('anon', 'public', 'CREATE'), 'Schema privilege: anon denied CREATE on public');
SELECT ok(has_schema_privilege('authenticated', 'public', 'USAGE'), 'Schema privilege: authenticated has USAGE on public');
SELECT ok(NOT has_schema_privilege('authenticated', 'public', 'CREATE'), 'Schema privilege: authenticated denied CREATE on public');
SELECT ok(NOT has_schema_privilege('public', 'public', 'CREATE'), 'Schema privilege: PUBLIC denied CREATE on public');
SELECT ok(NOT has_schema_privilege('public', 'public', 'USAGE'), 'Schema privilege: PUBLIC denied USAGE on public');

-- (I) Future-Object Privilege Canaries (Transactional table, sequence, and function verification)
CREATE TABLE public.default_acl_table_canary (id integer);
CREATE SEQUENCE public.default_acl_sequence_canary;
CREATE FUNCTION public.default_acl_function_canary() RETURNS integer LANGUAGE sql AS $$ SELECT 1 $$;

-- Canary Table Privileges: anon and authenticated receive no automatic table privileges
SELECT ok(NOT has_table_privilege('anon', 'public.default_acl_table_canary', 'SELECT'), 'Canary table: anon has no SELECT');
SELECT ok(NOT has_table_privilege('anon', 'public.default_acl_table_canary', 'INSERT'), 'Canary table: anon has no INSERT');
SELECT ok(NOT has_table_privilege('authenticated', 'public.default_acl_table_canary', 'SELECT'), 'Canary table: authenticated has no SELECT');
SELECT ok(NOT has_table_privilege('authenticated', 'public.default_acl_table_canary', 'INSERT'), 'Canary table: authenticated has no INSERT');

-- Canary Sequence Privileges: anon and authenticated receive no automatic sequence privileges
SELECT ok(NOT has_sequence_privilege('anon', 'public.default_acl_sequence_canary', 'USAGE'), 'Canary sequence: anon has no USAGE');
SELECT ok(NOT has_sequence_privilege('authenticated', 'public.default_acl_sequence_canary', 'USAGE'), 'Canary sequence: authenticated has no USAGE');

-- Canary Function Privileges: PUBLIC, anon, and authenticated receive no automatic EXECUTE
SELECT ok(NOT has_function_privilege('public', 'public.default_acl_function_canary()', 'EXECUTE'), 'Canary function: PUBLIC has no EXECUTE');
SELECT ok(NOT has_function_privilege('anon', 'public.default_acl_function_canary()', 'EXECUTE'), 'Canary function: anon has no EXECUTE');
SELECT ok(NOT has_function_privilege('authenticated', 'public.default_acl_function_canary()', 'EXECUTE'), 'Canary function: authenticated has no EXECUTE');

-- Clean up canaries
DROP FUNCTION public.default_acl_function_canary();
DROP SEQUENCE public.default_acl_sequence_canary;
DROP TABLE public.default_acl_table_canary;

SELECT * FROM finish();
ROLLBACK;
