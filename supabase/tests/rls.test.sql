BEGIN;
SELECT plan(60);

-- 1. Setup Data
INSERT INTO auth.users (id, email) VALUES 
('00000000-0000-0000-0000-000000000099', 'admin@example.com'),
('00000000-0000-0000-0000-000000000098', 'user@example.com');
INSERT INTO public.admin_users (id, email) VALUES ('00000000-0000-0000-0000-000000000099', 'admin@example.com');

INSERT INTO storage.buckets (id, name, public) VALUES ('public_assets', 'pub', true), ('private_assets', 'priv', false), ('resumes', 'res', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.objects (id, bucket_id, name, owner) VALUES 
('00000000-0000-0000-0000-000000000001', 'public_assets', 'pub.jpg', '00000000-0000-0000-0000-000000000099'),
('00000000-0000-0000-0000-000000000002', 'private_assets', 'priv.jpg', '00000000-0000-0000-0000-000000000099'),
('00000000-0000-0000-0000-000000000003', 'resumes', 'res.pdf', '00000000-0000-0000-0000-000000000099') ON CONFLICT DO NOTHING;

INSERT INTO public.profiles (id, full_name, professional_name, headline, bio, github_url, is_published) VALUES 
('00000000-0000-0000-0000-000000000100', 'Live', 'L', 'H', 'B', 'http', true),
('00000000-0000-0000-0000-000000000101', 'Draft', 'D', 'H', 'B', 'http', false) ON CONFLICT DO NOTHING;
INSERT INTO public.projects (id, slug, title, category, tier, description, technologies, state, is_archived) VALUES 
('00000000-0000-0000-0000-000000000300', 'live', 'Live', 'Cat', 'mini', 'Desc', ARRAY['A'], 'live', false),
('00000000-0000-0000-0000-000000000301', 'draft', 'Draft', 'Cat', 'mini', 'Desc', ARRAY['A'], 'draft', false),
('00000000-0000-0000-0000-000000000302', 'archived', 'Arch', 'Cat', 'mini', 'Desc', ARRAY['A'], 'live', true) ON CONFLICT DO NOTHING;
INSERT INTO public.project_sections (id, project_id, title, content) VALUES
('00000000-0000-0000-0000-000000000310', '00000000-0000-0000-0000-000000000300', 'Live Sec', 'L'),
('00000000-0000-0000-0000-000000000311', '00000000-0000-0000-0000-000000000301', 'Draft Sec', 'D') ON CONFLICT DO NOTHING;
INSERT INTO public.skill_categories (id, name, is_published, is_archived) VALUES
('00000000-0000-0000-0000-000000000200', 'Live Cat', true, false),
('00000000-0000-0000-0000-000000000201', 'Draft Cat', false, false) ON CONFLICT DO NOTHING;
INSERT INTO public.skills (id, category_id, name, proficiency_level, icon_identifier, is_published, is_archived) VALUES
('00000000-0000-0000-0000-000000000210', '00000000-0000-0000-0000-000000000200', 'Live Skill', 'PL', 'I', true, false),
('00000000-0000-0000-0000-000000000211', '00000000-0000-0000-0000-000000000201', 'Draft Skill', 'PL', 'I', false, false) ON CONFLICT DO NOTHING;
INSERT INTO public.education (id, institution, degree, is_published, is_archived) VALUES
('00000000-0000-0000-0000-000000000400', 'Live Edu', 'D', true, false),
('00000000-0000-0000-0000-000000000401', 'Draft Edu', 'D', false, false) ON CONFLICT DO NOTHING;
INSERT INTO public.experiences (id, organization, role_title, type, start_date, description_points, is_published, is_archived) VALUES
('00000000-0000-0000-0000-000000000500', 'Live Exp', 'R', 'T', '2020-01-01', ARRAY['D'], true, false),
('00000000-0000-0000-0000-000000000501', 'Draft Exp', 'R', 'T', '2020-01-01', ARRAY['D'], false, false) ON CONFLICT DO NOTHING;
INSERT INTO public.certifications (id, name, issuing_organization, is_published, is_archived) VALUES
('00000000-0000-0000-0000-000000000600', 'Live Cert', 'IO', true, false),
('00000000-0000-0000-0000-000000000601', 'Draft Cert', 'IO', false, false) ON CONFLICT DO NOTHING;
INSERT INTO public.achievements (id, title, is_published, is_archived) VALUES
('00000000-0000-0000-0000-000000000700', 'Live Ach', true, false),
('00000000-0000-0000-0000-000000000701', 'Draft Ach', false, false) ON CONFLICT DO NOTHING;
INSERT INTO public.seo_entries (id, route_path, title, description, is_published, is_archived) VALUES
('00000000-0000-0000-0000-000000000800', '/live', 'Live SEO', 'D', true, false),
('00000000-0000-0000-0000-000000000801', '/draft', 'Draft SEO', 'D', false, false) ON CONFLICT DO NOTHING;
INSERT INTO public.resume_versions (id, version_label, storage_path, is_active, is_archived) VALUES
('00000000-0000-0000-0000-000000000900', 'Live Res', 'p', true, false),
('00000000-0000-0000-0000-000000000901', 'Draft Res', 'p', false, false) ON CONFLICT DO NOTHING;
INSERT INTO public.media_assets (id, bucket_id, file_name, file_type, file_size, storage_path, alt_text, width, height) VALUES 
('00000000-0000-0000-0000-000000000010', 'public_assets', 'f.jpg', 'img', 10, 'p', 'A', 1, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.media_references (id, asset_id, entity_type, entity_id) VALUES 
('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000010', 'projects', '00000000-0000-0000-0000-000000000300') ON CONFLICT DO NOTHING;
INSERT INTO public.contact_messages (id, sender_name, sender_email, subject, message) VALUES ('00000000-0000-0000-0000-000000000020', 'S', 'e', 'S', 'M') ON CONFLICT DO NOTHING;
INSERT INTO public.publication_deployments (id, deployment_status) VALUES ('00000000-0000-0000-0000-000000000030', 'live') ON CONFLICT DO NOTHING;
INSERT INTO public.content_revisions (id, entity_type, entity_id, previous_data) VALUES ('00000000-0000-0000-0000-000000000040', 'prof', '00000000-0000-0000-0000-000000000100', '{}') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_activity (id, action) VALUES ('00000000-0000-0000-0000-000000000050', 'login') ON CONFLICT DO NOTHING;
INSERT INTO public.drafts (entity_type, entity_id, draft_data) VALUES ('profiles', '00000000-0000-0000-0000-000000000100', '{}') ON CONFLICT DO NOTHING;

-------------------------------------------------------------------------------
-- 2. Constraints Check
-------------------------------------------------------------------------------
-- Media Constraints
SELECT throws_ok($$ INSERT INTO public.media_assets (bucket_id, file_name, file_type, file_size, storage_path, alt_text, width) VALUES ('public_assets', 'f', 'f', 1, 'p', '', 1) $$, 'new row for relation "media_assets" violates check constraint "published_media_must_have_alt"', 'Media assets in public bucket must have alt text');
SELECT throws_ok($$ INSERT INTO public.media_assets (bucket_id, file_name, file_type, file_size, storage_path, alt_text, width) VALUES ('public_assets', 'f', 'f', 1, 'p', 'A', -1) $$, 'new row for relation "media_assets" violates check constraint "media_assets_width_check"', 'Media assets width must be > 0');

-- Drafts Constraints
SELECT throws_ok($$ INSERT INTO public.drafts (entity_type, entity_id, draft_data) VALUES ('invalid', '00000000-0000-0000-0000-000000000000', '{}') $$, 'new row for relation "drafts" violates check constraint "drafts_entity_type_check"', 'Drafts must be for valid entity types');

-- Resume Constraints
SELECT throws_ok($$ INSERT INTO public.resume_versions (version_label, storage_path, is_active) VALUES ('Res', 'p', true) $$, 'duplicate key value violates unique constraint "one_active_resume"', 'Only one resume can be active');


-------------------------------------------------------------------------------
-- 3. Anonymous Role
-------------------------------------------------------------------------------
SET ROLE anon;
SELECT set_config('request.jwt.claims', '', true);

-- Views Only Published Content
SELECT is((SELECT count(*) FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000100'), 1::bigint, 'Anon: sees live profile');
SELECT is((SELECT count(*) FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000101'), 0::bigint, 'Anon: cannot see draft profile');
SELECT is((SELECT count(*) FROM public.projects WHERE id = '00000000-0000-0000-0000-000000000300'), 1::bigint, 'Anon: sees live project');
SELECT is((SELECT count(*) FROM public.projects WHERE id IN ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000302')), 0::bigint, 'Anon: cannot see draft/archived project');
SELECT is((SELECT count(*) FROM public.project_sections WHERE id = '00000000-0000-0000-0000-000000000310'), 1::bigint, 'Anon: sees live project section');
SELECT is((SELECT count(*) FROM public.project_sections WHERE id = '00000000-0000-0000-0000-000000000311'), 0::bigint, 'Anon: cannot see draft project section');
SELECT is((SELECT count(*) FROM public.skill_categories WHERE id = '00000000-0000-0000-0000-000000000200'), 1::bigint, 'Anon: sees live skill cat');
SELECT is((SELECT count(*) FROM public.skill_categories WHERE id = '00000000-0000-0000-0000-000000000201'), 0::bigint, 'Anon: cannot see draft skill cat');
SELECT is((SELECT count(*) FROM public.skills WHERE id = '00000000-0000-0000-0000-000000000210'), 1::bigint, 'Anon: sees live skill');
SELECT is((SELECT count(*) FROM public.skills WHERE id = '00000000-0000-0000-0000-000000000211'), 0::bigint, 'Anon: cannot see draft skill');
SELECT is((SELECT count(*) FROM public.education WHERE id = '00000000-0000-0000-0000-000000000400'), 1::bigint, 'Anon: sees live edu');
SELECT is((SELECT count(*) FROM public.education WHERE id = '00000000-0000-0000-0000-000000000401'), 0::bigint, 'Anon: cannot see draft edu');
SELECT is((SELECT count(*) FROM public.experiences WHERE id = '00000000-0000-0000-0000-000000000500'), 1::bigint, 'Anon: sees live exp');
SELECT is((SELECT count(*) FROM public.experiences WHERE id = '00000000-0000-0000-0000-000000000501'), 0::bigint, 'Anon: cannot see draft exp');
SELECT is((SELECT count(*) FROM public.certifications WHERE id = '00000000-0000-0000-0000-000000000600'), 1::bigint, 'Anon: sees live cert');
SELECT is((SELECT count(*) FROM public.certifications WHERE id = '00000000-0000-0000-0000-000000000601'), 0::bigint, 'Anon: cannot see draft cert');
SELECT is((SELECT count(*) FROM public.achievements WHERE id = '00000000-0000-0000-0000-000000000700'), 1::bigint, 'Anon: sees live achiev');
SELECT is((SELECT count(*) FROM public.achievements WHERE id = '00000000-0000-0000-0000-000000000701'), 0::bigint, 'Anon: cannot see draft achiev');
SELECT is((SELECT count(*) FROM public.seo_entries WHERE id = '00000000-0000-0000-0000-000000000800'), 1::bigint, 'Anon: sees live seo');
SELECT is((SELECT count(*) FROM public.seo_entries WHERE id = '00000000-0000-0000-0000-000000000801'), 0::bigint, 'Anon: cannot see draft seo');
SELECT is((SELECT count(*) FROM public.resume_versions WHERE id = '00000000-0000-0000-0000-000000000900'), 1::bigint, 'Anon: sees live res');
SELECT is((SELECT count(*) FROM public.resume_versions WHERE id = '00000000-0000-0000-0000-000000000901'), 0::bigint, 'Anon: cannot see draft res');
SELECT is((SELECT count(*) FROM public.drafts), 0::bigint, 'Anon: cannot see drafts table at all');
SELECT is((SELECT count(*) FROM public.contact_messages), 0::bigint, 'Anon: cannot see contact_messages');
SELECT is((SELECT count(*) FROM public.content_revisions), 0::bigint, 'Anon: cannot see content_revisions');
SELECT is((SELECT count(*) FROM public.admin_activity), 0::bigint, 'Anon: cannot see admin_activity');
SELECT is((SELECT count(*) FROM public.publication_deployments), 0::bigint, 'Anon: cannot see publication_deployments');

-- Storage Reads
SELECT is((SELECT count(*) FROM storage.objects WHERE bucket_id = 'public_assets'), 1::bigint, 'Anon: sees public objects');
SELECT is((SELECT count(*) FROM storage.objects WHERE bucket_id = 'private_assets'), 0::bigint, 'Anon: cannot see private objects');


-------------------------------------------------------------------------------
-- 4. Authenticated Non-Owner (Same as Anon essentially)
-------------------------------------------------------------------------------
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000098"}', true);

SELECT is((SELECT count(*) FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000101'), 0::bigint, 'Auth: cannot see draft profile');
SELECT is((SELECT count(*) FROM public.drafts), 0::bigint, 'Auth: cannot see drafts table');
SELECT is((SELECT count(*) FROM storage.objects WHERE bucket_id = 'private_assets'), 0::bigint, 'Auth: cannot see private objects');


-------------------------------------------------------------------------------
-- 5. Owner with AAL1
-------------------------------------------------------------------------------
SELECT set_config('request.jwt.claims', '{"aal": "aal1", "sub": "00000000-0000-0000-0000-000000000099"}', true);

SELECT is((SELECT count(*) FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000101'), 0::bigint, 'AAL1: cannot see draft profile');
SELECT is((SELECT count(*) FROM storage.objects WHERE bucket_id = 'private_assets'), 0::bigint, 'AAL1: cannot see private objects');


-------------------------------------------------------------------------------
-- 6. Owner with AAL2 (Admin capabilities)
-------------------------------------------------------------------------------
SELECT set_config('request.jwt.claims', '{"aal": "aal2", "sub": "00000000-0000-0000-0000-000000000099"}', true);

-- Can read everything
SELECT is((SELECT count(*) FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000101'), 1::bigint, 'AAL2: can see draft profile');
SELECT is((SELECT count(*) FROM public.drafts), 1::bigint, 'AAL2: can see drafts');
SELECT is((SELECT count(*) FROM public.admin_activity), 1::bigint, 'AAL2: can see admin_activity');
SELECT is((SELECT count(*) FROM public.contact_messages), 1::bigint, 'AAL2: can see contact_messages');
SELECT is((SELECT count(*) FROM public.content_revisions), 1::bigint, 'AAL2: can see content_revisions');
SELECT is((SELECT count(*) FROM public.publication_deployments), 1::bigint, 'AAL2: can see publication_deployments');
SELECT is((SELECT count(*) FROM storage.objects WHERE bucket_id = 'private_assets'), 1::bigint, 'AAL2: can see private objects');

-- Transactional Triggers Protection
SELECT throws_ok($$ UPDATE public.projects SET state = 'live' WHERE id = '00000000-0000-0000-0000-000000000301' $$, 'Publication state (state) can only be modified via server-approved RPCs', 'AAL2: cannot change project publication state directly');
SELECT throws_ok($$ UPDATE public.profiles SET is_published = true WHERE id = '00000000-0000-0000-0000-000000000101' $$, 'Publication state (is_published) can only be modified via server-approved RPCs', 'AAL2: cannot change profile publication state directly');
SELECT throws_ok($$ UPDATE public.skill_categories SET is_archived = true WHERE id = '00000000-0000-0000-0000-000000000200' $$, 'Archive state (is_archived) can only be modified via server-approved RPCs', 'AAL2: cannot change archive state directly');
SELECT lives_ok($$ UPDATE public.projects SET title = 'Valid Title' WHERE id = '00000000-0000-0000-0000-000000000301' $$, 'AAL2: CAN update standard fields on projects');

SELECT throws_ok($$ UPDATE public.contact_messages SET message = 'altered' WHERE id = '00000000-0000-0000-0000-000000000020' $$, 'Only the state of a contact message can be updated by a client', 'AAL2: cannot alter contact message content');
SELECT lives_ok($$ UPDATE public.contact_messages SET state = 'read' WHERE id = '00000000-0000-0000-0000-000000000020' $$, 'AAL2: CAN update contact message state');

-- Server-only Tables (Insertions/Deletions blocked via RLS omission)
SELECT throws_ok($$ INSERT INTO public.publication_deployments (deployment_status) VALUES ('live') $$, 'new row violates row-level security policy for table "publication_deployments"', 'AAL2: cannot insert publication_deployments (server-only)');
SELECT throws_ok($$ INSERT INTO public.content_revisions (entity_type, entity_id, previous_data) VALUES ('t', '00000000-0000-0000-0000-000000000000', '{}') $$, 'new row violates row-level security policy for table "content_revisions"', 'AAL2: cannot insert content_revisions (server-only)');
SELECT throws_ok($$ INSERT INTO public.admin_activity (action) VALUES ('fake') $$, 'new row violates row-level security policy for table "admin_activity"', 'AAL2: cannot insert admin_activity (server-only)');
UPDATE public.admin_activity SET action = 'altered' WHERE id = '00000000-0000-0000-0000-000000000050';
SELECT is((SELECT action FROM public.admin_activity WHERE id = '00000000-0000-0000-0000-000000000050'), 'login', 'AAL2: cannot update admin_activity');

-- Storage Deletion
SELECT throws_matching($$ DELETE FROM storage.objects WHERE id = '00000000-0000-0000-0000-000000000001' $$, 'Direct deletion from storage tables is not allowed', 'AAL2: CANNOT delete storage.objects directly (server-only)');


-------------------------------------------------------------------------------
-- 7. Service Role (Server-Only Actions)
-------------------------------------------------------------------------------
SET ROLE service_role;
SELECT set_config('request.jwt.claims', '', true);

SELECT lives_ok($$ INSERT INTO public.publication_deployments (deployment_status) VALUES ('live') $$, 'Service role: CAN insert publication_deployments');
SELECT lives_ok($$ INSERT INTO public.content_revisions (entity_type, entity_id, previous_data) VALUES ('t', '00000000-0000-0000-0000-000000000000', '{}') $$, 'Service role: CAN insert content_revisions');
SELECT lives_ok($$ INSERT INTO public.admin_activity (action) VALUES ('real') $$, 'Service role: CAN insert admin_activity');
SELECT lives_ok($$ UPDATE public.projects SET state = 'live' WHERE id = '00000000-0000-0000-0000-000000000301' $$, 'Service role: CAN promote publication state (bypass triggers due to role)');

SELECT * FROM finish();
ROLLBACK;
