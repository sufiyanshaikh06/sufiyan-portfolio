BEGIN;
SELECT plan(48);

-- 1. Setup Test Data (Clean slate for test data only)
INSERT INTO auth.users (id, email) VALUES 
('00000000-0000-0000-0000-000000000099', 'admin@example.com'),
('00000000-0000-0000-0000-000000000098', 'user@example.com');

INSERT INTO public.admin_users (id, email) VALUES ('00000000-0000-0000-0000-000000000099', 'admin@example.com');

INSERT INTO public.profiles (id, full_name, professional_name, headline, bio, github_url, is_published)
VALUES 
('00000000-0000-0000-0000-000000000100', 'Live Profile', 'Live', 'H', 'B', 'http', true),
('00000000-0000-0000-0000-000000000101', 'Draft Profile', 'Draft', 'H', 'B', 'http', false)
ON CONFLICT DO NOTHING;

INSERT INTO public.drafts (entity_type, entity_id, draft_data)
VALUES 
('profiles', '00000000-0000-0000-0000-000000000100', '{"name": "Draft Update"}')
ON CONFLICT DO NOTHING;

INSERT INTO public.skill_categories (id, name, is_published, is_archived) VALUES
('00000000-0000-0000-0000-000000000200', 'Live Cat', true, false),
('00000000-0000-0000-0000-000000000201', 'Draft Cat', false, false)
ON CONFLICT DO NOTHING;

INSERT INTO public.projects (id, slug, title, category, tier, description, technologies, state, is_archived) VALUES
('00000000-0000-0000-0000-000000000300', 'live-proj', 'Live', 'Cat', 'mini', 'Desc', ARRAY['A'], 'live', false),
('00000000-0000-0000-0000-000000000301', 'draft-proj', 'Draft', 'Cat', 'mini', 'Desc', ARRAY['A'], 'draft', false),
('00000000-0000-0000-0000-000000000302', 'archived-proj', 'Archived', 'Cat', 'mini', 'Desc', ARRAY['A'], 'live', true)
ON CONFLICT DO NOTHING;

INSERT INTO public.seo_entries (id, route_path, title, description, is_published, is_archived) VALUES
('00000000-0000-0000-0000-000000000400', '/live', 'Live SEO', 'Desc', true, false),
('00000000-0000-0000-0000-000000000401', '/draft', 'Draft SEO', 'Desc', false, false)
ON CONFLICT DO NOTHING;

INSERT INTO public.admin_activity (id, action, ip_address) VALUES ('00000000-0000-0000-0000-000000000500', 'login', '127.0.0.1') ON CONFLICT DO NOTHING;
INSERT INTO public.contact_messages (id, sender_name, sender_email, subject, message) VALUES ('00000000-0000-0000-0000-000000000600', 'S', 's@s.com', 'S', 'M') ON CONFLICT DO NOTHING;
INSERT INTO public.media_assets (id, file_name, file_type, file_size, storage_path) VALUES ('00000000-0000-0000-0000-000000000700', 'test.jpg', 'img', 100, 'path') ON CONFLICT DO NOTHING;


-------------------------------------------------------------------------------
-- 2. Test Anonymous (anon role)
-------------------------------------------------------------------------------
SET ROLE anon;
SELECT set_config('request.jwt.claims', '', true);

-- Reads
SELECT is((SELECT count(*) FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000100'), 1::bigint, 'Anon sees live profile');
SELECT is((SELECT count(*) FROM public.projects WHERE id = '00000000-0000-0000-0000-000000000300'), 1::bigint, 'Anon sees live project');
SELECT is((SELECT count(*) FROM public.skill_categories WHERE id = '00000000-0000-0000-0000-000000000200'), 1::bigint, 'Anon sees live skill category');
SELECT is((SELECT count(*) FROM public.seo_entries WHERE id = '00000000-0000-0000-0000-000000000400'), 1::bigint, 'Anon sees live SEO');
SELECT is((SELECT count(*) FROM public.drafts WHERE entity_id = '00000000-0000-0000-0000-000000000100'), 0::bigint, 'Anon cannot see drafts at all');
SELECT is((SELECT count(*) FROM public.admin_activity WHERE id = '00000000-0000-0000-0000-000000000500'), 0::bigint, 'Anon cannot see admin activity');
SELECT is((SELECT count(*) FROM public.contact_messages WHERE id = '00000000-0000-0000-0000-000000000600'), 0::bigint, 'Anon cannot see contact messages');

-- Mutations
SELECT throws_ok($$ INSERT INTO public.contact_messages (sender_name, sender_email, subject, message) VALUES ('a','a','a','a') $$, 'new row violates row-level security policy for table "contact_messages"', 'Anon cannot insert contact messages');
UPDATE public.profiles SET full_name = 'Hacked';
SELECT is((SELECT full_name FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000100'), 'Live Profile', 'Anon cannot update profiles');
DELETE FROM public.profiles;
SELECT is((SELECT count(*) FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000100'), 1::bigint, 'Anon cannot delete profiles');

-- Storage read
SELECT is((SELECT count(*) FROM storage.objects WHERE bucket_id = 'private_assets'), 0::bigint, 'Anon cannot read private storage');


-------------------------------------------------------------------------------
-- 3. Test Authenticated Non-Owner
-------------------------------------------------------------------------------
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000098"}', true);

-- Reads
SELECT is((SELECT count(*) FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000100'), 1::bigint, 'Auth non-owner sees live profile');
SELECT is((SELECT count(*) FROM public.projects WHERE id = '00000000-0000-0000-0000-000000000300'), 1::bigint, 'Auth non-owner sees live project');
SELECT is((SELECT count(*) FROM public.drafts WHERE entity_id = '00000000-0000-0000-0000-000000000100'), 0::bigint, 'Auth non-owner cannot see drafts');
SELECT is((SELECT count(*) FROM public.admin_activity WHERE id = '00000000-0000-0000-0000-000000000500'), 0::bigint, 'Auth non-owner cannot see admin activity');

-- Mutations
SELECT throws_ok($$ INSERT INTO public.projects (slug, title, category, tier, description, technologies) VALUES ('a','a','a','mini','a',ARRAY['a']) $$, 'new row violates row-level security policy for table "projects"', 'Auth non-owner cannot insert projects');
UPDATE public.projects SET title = 'Hacked';
SELECT is((SELECT title FROM public.projects WHERE id = '00000000-0000-0000-0000-000000000300'), 'Live', 'Auth non-owner cannot update projects');


-------------------------------------------------------------------------------
-- 4. Test Owner with aal1
-------------------------------------------------------------------------------
SELECT set_config('request.jwt.claims', '{"aal": "aal1", "sub": "00000000-0000-0000-0000-000000000099"}', true);

-- Reads
SELECT is((SELECT count(*) FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000100'), 1::bigint, 'Owner aal1 sees live profile');
SELECT is((SELECT count(*) FROM public.drafts WHERE entity_id = '00000000-0000-0000-0000-000000000100'), 0::bigint, 'Owner aal1 cannot see drafts');

-- Mutations
SELECT throws_ok($$ INSERT INTO public.projects (slug, title, category, tier, description, technologies) VALUES ('b','b','b','mini','b',ARRAY['b']) $$, 'new row violates row-level security policy for table "projects"', 'Owner aal1 cannot insert projects');
UPDATE public.projects SET title = 'Hacked';
SELECT is((SELECT title FROM public.projects WHERE id = '00000000-0000-0000-0000-000000000300'), 'Live', 'Owner aal1 cannot update projects');


-------------------------------------------------------------------------------
-- 5. Test Owner with aal2
-------------------------------------------------------------------------------
SELECT set_config('request.jwt.claims', '{"aal": "aal2", "sub": "00000000-0000-0000-0000-000000000099"}', true);

-- Reads
SELECT is((SELECT count(*) FROM public.profiles WHERE id IN ('00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000101')), 2::bigint, 'Owner aal2 can see all profiles');
SELECT is((SELECT count(*) FROM public.projects WHERE id IN ('00000000-0000-0000-0000-000000000300', '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000302')), 3::bigint, 'Owner aal2 can see all projects (live, draft, archived)');
SELECT is((SELECT count(*) FROM public.skill_categories WHERE id IN ('00000000-0000-0000-0000-000000000200', '00000000-0000-0000-0000-000000000201')), 2::bigint, 'Owner aal2 can see all skill categories');
SELECT is((SELECT count(*) FROM public.seo_entries WHERE id IN ('00000000-0000-0000-0000-000000000400', '00000000-0000-0000-0000-000000000401')), 2::bigint, 'Owner aal2 can see all SEO entries');
SELECT is((SELECT count(*) FROM public.drafts WHERE entity_id = '00000000-0000-0000-0000-000000000100'), 1::bigint, 'Owner aal2 can see drafts');
SELECT is((SELECT count(*) FROM public.admin_activity WHERE id = '00000000-0000-0000-0000-000000000500'), 1::bigint, 'Owner aal2 can see admin activity');
SELECT is((SELECT count(*) FROM public.contact_messages WHERE id = '00000000-0000-0000-0000-000000000600'), 1::bigint, 'Owner aal2 can see contact messages');
SELECT is((SELECT count(*) FROM public.admin_users WHERE id = '00000000-0000-0000-0000-000000000099'), 1::bigint, 'Owner aal2 can see admin users');

-- Mutations (Success)
SELECT lives_ok($$ UPDATE public.profiles SET full_name = 'Updated' WHERE id = '00000000-0000-0000-0000-000000000100' $$, 'Owner aal2 CAN update profiles');
SELECT is((SELECT full_name FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000100'), 'Updated', 'Update succeeded');

SELECT lives_ok($$ INSERT INTO public.drafts (entity_type, entity_id, draft_data) VALUES ('test', '00000000-0000-0000-0000-000000000999', '{}') $$, 'Owner aal2 CAN insert drafts');
SELECT lives_ok($$ DELETE FROM public.drafts WHERE entity_id = '00000000-0000-0000-0000-000000000999' $$, 'Owner aal2 CAN delete drafts');

SELECT lives_ok($$ INSERT INTO public.admin_activity (action, ip_address) VALUES ('logout', '1.1.1.1') $$, 'Owner aal2 CAN insert admin_activity (append-only)');
SELECT lives_ok($$ UPDATE public.contact_messages SET state = 'read' WHERE id = '00000000-0000-0000-0000-000000000600' $$, 'Owner aal2 CAN update contact message state');

-- Mutations (Denied - Append Only / Archive Only / Server Only)
SELECT throws_ok($$ INSERT INTO public.contact_messages (sender_name, sender_email, subject, message) VALUES ('a','a','a','a') $$, 'new row violates row-level security policy for table "contact_messages"', 'Owner aal2 CANNOT insert contact messages');
UPDATE public.admin_activity SET action = 'hacked' WHERE id = '00000000-0000-0000-0000-000000000500';
SELECT is((SELECT action FROM public.admin_activity WHERE id = '00000000-0000-0000-0000-000000000500'), 'login', 'Owner aal2 CANNOT update admin_activity (append-only)');
DELETE FROM public.admin_activity;
SELECT is((SELECT count(*) FROM public.admin_activity WHERE id = '00000000-0000-0000-0000-000000000500'), 1::bigint, 'Owner aal2 CANNOT delete admin_activity');

DELETE FROM public.profiles;
SELECT is((SELECT count(*) FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000100'), 1::bigint, 'Owner aal2 CANNOT hard delete profiles');
DELETE FROM public.projects;
SELECT is((SELECT count(*) FROM public.projects WHERE id = '00000000-0000-0000-0000-000000000300'), 1::bigint, 'Owner aal2 CANNOT hard delete projects');
DELETE FROM public.media_assets;
SELECT is((SELECT count(*) FROM public.media_assets WHERE id = '00000000-0000-0000-0000-000000000700'), 1::bigint, 'Owner aal2 CANNOT hard delete media assets');

-- Storage object policies
-- Owner aal2 cannot delete storage.objects directly via client RLS
SELECT throws_matching($$ DELETE FROM storage.objects WHERE id = '00000000-0000-0000-0000-000000000000' $$, 'Direct deletion from storage tables is not allowed', 'Owner aal2 CANNOT delete storage.objects directly (server-only)');


-------------------------------------------------------------------------------
-- 6. Test Service Role (Bypasses RLS)
-------------------------------------------------------------------------------
SET ROLE service_role;
SELECT set_config('request.jwt.claims', '', true);

-- Verify bypass
SELECT lives_ok($$ INSERT INTO public.contact_messages (id, sender_name, sender_email, subject, message) VALUES ('00000000-0000-0000-0000-000000000999', 'API', 'api@api.com', 'Subj', 'Message') $$, 'Service role CAN insert contact messages');
SELECT lives_ok($$ DELETE FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000101' $$, 'Service role CAN hard delete profiles');
SELECT lives_ok($$ DELETE FROM public.contact_messages WHERE id = '00000000-0000-0000-0000-000000000600' $$, 'Service role CAN hard delete contact messages');

-- Test foreign key RESTRICT on media_references
INSERT INTO public.media_references (asset_id, entity_type, entity_id) VALUES ('00000000-0000-0000-0000-000000000700', 'project', '00000000-0000-0000-0000-000000000300');
SELECT throws_ok($$ DELETE FROM public.media_assets WHERE id = '00000000-0000-0000-0000-000000000700' $$, 'update or delete on table "media_assets" violates foreign key constraint "media_references_asset_id_fkey" on table "media_references"', 'Service role CANNOT delete media_asset if referenced (ON DELETE RESTRICT works)');

SELECT lives_ok($$ DELETE FROM public.media_references WHERE asset_id = '00000000-0000-0000-0000-000000000700' $$, 'Service role CAN delete media_references');
SELECT lives_ok($$ DELETE FROM public.media_assets WHERE id = '00000000-0000-0000-0000-000000000700' $$, 'Service role CAN delete media_assets once unreferenced');


SELECT * FROM finish();
ROLLBACK;
