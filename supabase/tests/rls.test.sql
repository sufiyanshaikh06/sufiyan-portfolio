BEGIN;
SELECT plan(44);

-- 1. Setup Test Data
INSERT INTO auth.users (id, email) VALUES 
('00000000-0000-0000-0000-000000000099', 'admin@example.com'),
('00000000-0000-0000-0000-000000000098', 'user@example.com')
ON CONFLICT DO NOTHING;
INSERT INTO public.admin_users (id, email) VALUES ('00000000-0000-0000-0000-000000000099', 'admin@example.com')
ON CONFLICT DO NOTHING;

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
INSERT INTO public.media_assets (id, bucket_id, file_name, file_type, file_size, storage_path, alt_text, width, height) VALUES 
('00000000-0000-0000-0000-000000000010', 'public_assets', 'f.jpg', 'img', 10, 'p', 'A', 1, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.resume_versions (id, version_label, file_asset_id, is_active, is_archived) VALUES
('00000000-0000-0000-0000-000000000900', 'Live Res', '00000000-0000-0000-0000-000000000010', true, false),
('00000000-0000-0000-0000-000000000901', 'Draft Res', '00000000-0000-0000-0000-000000000010', false, false) ON CONFLICT DO NOTHING;
INSERT INTO public.contact_messages (id, sender_name, sender_email, subject, message) VALUES ('00000000-0000-0000-0000-000000000020', 'S', 'e', 'S', 'M') ON CONFLICT DO NOTHING;
INSERT INTO public.publication_deployments (id, deployment_status) VALUES ('00000000-0000-0000-0000-000000000030', 'live') ON CONFLICT DO NOTHING;
INSERT INTO public.content_revisions (id, entity_type, entity_id, previous_data) VALUES ('00000000-0000-0000-0000-000000000040', 'prof', '00000000-0000-0000-0000-000000000100', '{}') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_activity (id, action) VALUES ('00000000-0000-0000-0000-000000000050', 'login') ON CONFLICT DO NOTHING;
INSERT INTO public.drafts (entity_type, entity_id, draft_data) VALUES ('profiles', '00000000-0000-0000-0000-000000000100', '{}') ON CONFLICT DO NOTHING;

-------------------------------------------------------------------------------
-- 2. Constraints Check
-------------------------------------------------------------------------------
SELECT throws_ok($$ INSERT INTO public.media_assets (bucket_id, file_name, file_type, file_size, storage_path, alt_text, width) VALUES ('public_assets', 'f', 'f', 1, 'p2', 'A', -1) $$, 'new row for relation "media_assets" violates check constraint "media_assets_width_check"', 'Media assets width must be > 0');
SELECT throws_ok($$ INSERT INTO public.drafts (entity_type, entity_id, draft_data) VALUES ('invalid', '00000000-0000-0000-0000-000000000000', '{}') $$, 'new row for relation "drafts" violates check constraint "drafts_entity_type_check"', 'Drafts must be for valid entity types');
SELECT throws_ok($$ INSERT INTO public.resume_versions (version_label, file_asset_id, is_active) VALUES ('Res', '00000000-0000-0000-0000-000000000010', true) $$, 'duplicate key value violates unique constraint "one_active_resume"', 'Only one resume can be active');


-------------------------------------------------------------------------------
-- 3. Anonymous Role
-------------------------------------------------------------------------------
SET ROLE anon;
SELECT set_config('request.jwt.claims', '', true);

-- Reads
SELECT is((SELECT count(*) FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000100'), 1::bigint, 'Anon: sees live profile');
SELECT is((SELECT count(*) FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000101'), 0::bigint, 'Anon: cannot see draft profile');
SELECT is((SELECT count(*) FROM public.drafts), 0::bigint, 'Anon: cannot see drafts table at all');
SELECT is((SELECT count(*) FROM public.contact_messages), 0::bigint, 'Anon: cannot see contact_messages');
SELECT is((SELECT count(*) FROM storage.objects WHERE bucket_id = 'public_assets'), 1::bigint, 'Anon: sees public objects');
SELECT is((SELECT count(*) FROM storage.objects WHERE bucket_id = 'private_assets'), 0::bigint, 'Anon: cannot see private objects');

-- Mutations
SELECT throws_ok($$ INSERT INTO public.contact_messages (sender_name, sender_email, subject, message) VALUES ('a','a','a','a') $$, 'new row violates row-level security policy for table "contact_messages"', 'Anon cannot insert contact messages');
SELECT throws_ok($$ INSERT INTO public.projects (slug, title, category, tier, description, technologies) VALUES ('p', 'T', 'C', 'mini', 'D', ARRAY['A']) $$, 'new row violates row-level security policy for table "projects"', 'Anon cannot insert projects');


-------------------------------------------------------------------------------
-- 4. Authenticated Non-Owner
-------------------------------------------------------------------------------
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000098"}', true);

SELECT is((SELECT count(*) FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000101'), 0::bigint, 'Auth Non-owner: cannot see draft profile');
SELECT throws_ok($$ INSERT INTO public.projects (slug, title, category, tier, description, technologies) VALUES ('p2', 'T', 'C', 'mini', 'D', ARRAY['A']) $$, 'new row violates row-level security policy for table "projects"', 'Auth Non-owner cannot insert projects');
SELECT is((SELECT title FROM public.projects WHERE id = '00000000-0000-0000-0000-000000000300'), 'Live', 'Auth Non-owner cannot update projects');


-------------------------------------------------------------------------------
-- 5. Owner with AAL1
-------------------------------------------------------------------------------
SELECT set_config('request.jwt.claims', '{"aal": "aal1", "sub": "00000000-0000-0000-0000-000000000099"}', true);

SELECT is((SELECT count(*) FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000101'), 0::bigint, 'AAL1: cannot see draft profile');
SELECT throws_ok($$ INSERT INTO public.projects (slug, title, category, tier, description, technologies) VALUES ('p3', 'T', 'C', 'mini', 'D', ARRAY['A']) $$, 'new row violates row-level security policy for table "projects"', 'AAL1 cannot insert projects');


-------------------------------------------------------------------------------
-- 6. Owner with AAL2 (Admin)
-------------------------------------------------------------------------------
SELECT set_config('request.jwt.claims', '{"aal": "aal2", "sub": "00000000-0000-0000-0000-000000000099"}', true);

SELECT is((SELECT count(*) FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000101'), 1::bigint, 'AAL2: can see draft profile');
SELECT is((SELECT count(*) FROM public.drafts), 1::bigint, 'AAL2: can see drafts');

-- Transactional Triggers Protection (INSERT)
SELECT throws_ok($$ INSERT INTO public.projects (slug, title, category, tier, description, technologies, state) VALUES ('a', 'a', 'a', 'mini', 'a', ARRAY['a'], 'live') $$, 'Cannot insert live record directly. Must use drafts.', 'AAL2: cannot insert live project directly');
SELECT throws_ok($$ INSERT INTO public.profiles (full_name, professional_name, headline, bio, github_url, is_published) VALUES ('a', 'a', 'a', 'a', 'a', true) $$, 'Cannot insert published record directly. Must use drafts.', 'AAL2: cannot insert published profile directly');
SELECT throws_ok($$ INSERT INTO public.resume_versions (version_label, file_asset_id, is_active) VALUES ('a', '00000000-0000-0000-0000-000000000010', true) $$, 'Cannot insert active record directly.', 'AAL2: cannot insert active resume directly');

-- Transactional Triggers Protection (UPDATE)
SELECT throws_ok($$ UPDATE public.projects SET state = 'live' WHERE id = '00000000-0000-0000-0000-000000000301' $$, 'State mutation (publish/archive) can only be modified via server-approved RPCs', 'AAL2: cannot change project publication state directly');
SELECT throws_ok($$ UPDATE public.projects SET title = 'Altered' WHERE id = '00000000-0000-0000-0000-000000000300' $$, 'Cannot directly update a live record. Must update drafts and publish atomically.', 'AAL2: cannot update live project directly');
SELECT throws_ok($$ UPDATE public.project_sections SET content = 'Altered' WHERE id = '00000000-0000-0000-0000-000000000310' $$, 'Cannot modify sections of a live project. Update drafts instead.', 'AAL2: cannot update section of live project directly');

SELECT throws_ok($$ UPDATE public.contact_messages SET message = 'altered' WHERE id = '00000000-0000-0000-0000-000000000020' $$, 'Only the state of a contact message can be updated by a client', 'AAL2: cannot alter contact message content');
SELECT lives_ok($$ UPDATE public.contact_messages SET state = 'read' WHERE id = '00000000-0000-0000-0000-000000000020' $$, 'AAL2: CAN update contact message state');

-- Deletions
DELETE FROM public.profiles;
SELECT is((SELECT count(*) FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000100'), 1::bigint, 'AAL2: CANNOT hard delete profiles');
DELETE FROM public.media_assets;
SELECT is((SELECT count(*) FROM public.media_assets WHERE id = '00000000-0000-0000-0000-000000000010'), 1::bigint, 'AAL2: CANNOT hard delete media assets');
SELECT throws_matching($$ DELETE FROM storage.objects WHERE id = '00000000-0000-0000-0000-000000000001' $$, 'Direct deletion from storage tables is not allowed', 'AAL2: CANNOT delete storage.objects directly via SQL');

-- Revisions / Deployments / Activity (Insert/Update denial)
SELECT throws_ok($$ INSERT INTO public.publication_deployments (deployment_status) VALUES ('live') $$, 'new row violates row-level security policy for table "publication_deployments"', 'AAL2: cannot insert publication_deployments (server-only)');
SELECT throws_ok($$ INSERT INTO public.content_revisions (entity_type, entity_id, previous_data) VALUES ('t', '00000000-0000-0000-0000-000000000000', '{}') $$, 'new row violates row-level security policy for table "content_revisions"', 'AAL2: cannot insert content_revisions (server-only)');
SELECT throws_ok($$ INSERT INTO public.admin_activity (action) VALUES ('fake') $$, 'new row violates row-level security policy for table "admin_activity"', 'AAL2: cannot insert admin_activity (server-only)');
UPDATE public.admin_activity SET action = 'altered' WHERE id = '00000000-0000-0000-0000-000000000050';
SELECT is((SELECT action FROM public.admin_activity WHERE id = '00000000-0000-0000-0000-000000000050'), 'login', 'AAL2: cannot update admin_activity (server-only)');
DELETE FROM public.publication_deployments;
SELECT is((SELECT count(*) FROM public.publication_deployments WHERE id = '00000000-0000-0000-0000-000000000030'), 1::bigint, 'AAL2: CANNOT delete publication_deployments');
DELETE FROM public.content_revisions;
SELECT is((SELECT count(*) FROM public.content_revisions WHERE id = '00000000-0000-0000-0000-000000000040'), 1::bigint, 'AAL2: CANNOT delete content_revisions');


-------------------------------------------------------------------------------
-- 7. Service Role (Server-Only Actions)
-------------------------------------------------------------------------------
SET ROLE service_role;
SELECT set_config('request.jwt.claims', '', true);

SELECT lives_ok($$ INSERT INTO public.contact_messages (sender_name, sender_email, subject, message) VALUES ('a','a','a','a') $$, 'Service role: CAN insert contact messages');
SELECT lives_ok($$ INSERT INTO public.publication_deployments (deployment_status) VALUES ('live') $$, 'Service role: CAN insert publication_deployments');
SELECT lives_ok($$ INSERT INTO public.content_revisions (entity_type, entity_id, previous_data) VALUES ('t', '00000000-0000-0000-0000-000000000000', '{}') $$, 'Service role: CAN insert content_revisions');

-- Test RPC Publish Draft (Success)
SELECT lives_ok($$ SELECT public.publish_draft('profiles', '00000000-0000-0000-0000-000000000100') $$, 'Service role: CAN call publish_draft successfully');
-- Check atomic promotion: Draft cleared, Activity created, Deployment queued.
SELECT is((SELECT count(*) FROM public.drafts WHERE entity_type = 'profiles' AND entity_id = '00000000-0000-0000-0000-000000000100'), 0::bigint, 'Publish RPC: Draft removed');
SELECT is((SELECT count(*) FROM public.admin_activity WHERE action = 'publish_draft' AND entity_id = '00000000-0000-0000-0000-000000000100'), 1::bigint, 'Publish RPC: Activity logged');
SELECT is((SELECT count(*) FROM public.publication_deployments WHERE deployment_status = 'publication_queued'), 1::bigint, 'Publish RPC: Deployment queued');

-- Test RPC Publish Draft (Rollback/Exception on failure)
SELECT throws_ok($$ SELECT public.publish_draft('projects', '00000000-0000-0000-0000-000000000000') $$, 'Draft not found for projects 00000000-0000-0000-0000-000000000000', 'Publish RPC: Throws if draft not found');

-- Verify ON DELETE RESTRICT explicitly
SELECT throws_ok($$ DELETE FROM public.media_assets WHERE id = '00000000-0000-0000-0000-000000000010' $$, 'update or delete on table "media_assets" violates foreign key constraint "resume_versions_file_asset_id_fkey" on table "resume_versions"', 'Service role CANNOT delete media_asset if referenced (ON DELETE RESTRICT works)');


SELECT * FROM finish();
ROLLBACK;
