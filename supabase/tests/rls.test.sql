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
SELECT plan(84);

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
('20000000-0000-0000-0000-000000000004', 'resumes', 'm_res.pdf', 'application/pdf', 100, 'test/m_res.pdf', 'Resume Media', NULL, false, false)
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
INSERT INTO public.certifications (id, name, issuing_organization, issue_date, is_published, is_archived) VALUES
('20000000-0000-0000-0000-000000000060', 'Live Cert', 'Issuer', '2024-01-01', true, false),
('20000000-0000-0000-0000-000000000061', 'Arch Cert', 'Issuer', '2024-01-01', true, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.achievements (id, title, description, is_published, is_archived) VALUES
('20000000-0000-0000-0000-000000000065', 'Live Ach', 'Desc', true, false),
('20000000-0000-0000-0000-000000000066', 'Arch Ach', 'Desc', true, true)
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

-- Blocked reads
SELECT is((SELECT count(*) FROM public.drafts), 0::bigint, 'Anon: cannot see drafts');
SELECT is((SELECT count(*) FROM public.contact_messages), 0::bigint, 'Anon: cannot see contact messages');
SELECT is((SELECT count(*) FROM public.admin_users), 0::bigint, 'Anon: cannot see admin users');
SELECT is((SELECT count(*) FROM public.content_revisions), 0::bigint, 'Anon: cannot see content revisions');

-- Storage reads (private resume bucket is completely hidden from anon)
SELECT is((SELECT count(*) FROM storage.objects WHERE id = '30000000-0000-0000-0000-000000000001'), 1::bigint, 'Anon: sees public asset object');
SELECT is((SELECT count(*) FROM storage.objects WHERE id = '30000000-0000-0000-0000-000000000002'), 0::bigint, 'Anon: cannot see private asset object');
SELECT is((SELECT count(*) FROM storage.objects WHERE id = '30000000-0000-0000-0000-000000000003'), 0::bigint, 'Anon: cannot see private resume storage object');

-- Blocked mutations (verify no row modified)
UPDATE public.projects SET title = 'Hacked' WHERE id = '20000000-0000-0000-0000-000000000020';
SELECT is((SELECT title FROM public.projects WHERE id = '20000000-0000-0000-0000-000000000020'), 'Live Project', 'Anon: update on live project did not persist');

DELETE FROM public.projects WHERE id = '20000000-0000-0000-0000-000000000020';
SELECT is((SELECT count(*) FROM public.projects WHERE id = '20000000-0000-0000-0000-000000000020'), 1::bigint, 'Anon: delete on live project did not persist');

UPDATE public.profiles SET full_name = 'Hacked' WHERE id = '20000000-0000-0000-0000-000000000010';
SELECT is((SELECT full_name FROM public.profiles WHERE id = '20000000-0000-0000-0000-000000000010'), 'Live Profile', 'Anon: update on profile did not persist');

SELECT throws_ok($$ INSERT INTO public.contact_messages (sender_name, sender_email, subject, message) VALUES ('a','a','a','a') $$, 'new row violates row-level security policy for table "contact_messages"', 'Anon: cannot directly insert contact messages');

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

-- Foreign Key ON DELETE RESTRICT and client deletion protection on media_assets
DELETE FROM public.media_assets WHERE id = '20000000-0000-0000-0000-000000000001';
SELECT is((SELECT count(*) FROM public.media_assets WHERE id = '20000000-0000-0000-0000-000000000001'), 1::bigint, 'AAL2: delete on media_assets does not delete any row');

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

-- Server-only tables are blocked from client insertion
SELECT throws_ok(
    $$ INSERT INTO public.content_revisions (entity_type, entity_id, previous_data) VALUES ('projects', '20000000-0000-0000-0000-000000000020', '{}') $$,
    'new row violates row-level security policy for table "content_revisions"',
    'AAL2: blocked from inserting content revisions'
);

SELECT throws_ok(
    $$ INSERT INTO public.publication_deployments (deployment_status) VALUES ('publication_queued') $$,
    'new row violates row-level security policy for table "publication_deployments"',
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

-- Verify incomplete publishing RPC is absent in Phase 2
SELECT throws_ok(
    $$ SELECT public.publish_draft('projects', '20000000-0000-0000-0000-000000000020') $$,
    '42883',
    'function public.publish_draft(unknown, unknown) does not exist',
    'Publishing RPC is removed from Phase 2 and deferred to Phase 6'
);

SELECT * FROM finish();
ROLLBACK;
