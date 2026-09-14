-- pgTAP test file for exhaustive RLS coverage

BEGIN;
SELECT plan(30);

-- 1. Setup Test Data (Temporary fixtures)
INSERT INTO auth.users (id, email) VALUES 
('00000000-0000-0000-0000-000000000099', 'admin@example.com'),
('00000000-0000-0000-0000-000000000098', 'user@example.com') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_users (id, email) VALUES ('00000000-0000-0000-0000-000000000099', 'admin@example.com') ON CONFLICT DO NOTHING;

INSERT INTO public.profiles (id, full_name, professional_name, headline, bio, github_url, is_published) VALUES 
('00000000-0000-0000-0000-000000000100', 'Live Profile', 'Live Prof', 'Head', 'Bio', 'GH', true),
('00000000-0000-0000-0000-000000000101', 'Draft Profile', 'Draft Prof', 'Head', 'Bio', 'GH', false) ON CONFLICT DO NOTHING;

INSERT INTO public.projects (id, slug, title, category, tier, description, technologies, state, is_archived) VALUES 
('00000000-0000-0000-0000-000000000300', 'live-p', 'Live', 'Cat', 'mini', 'Desc', ARRAY['A'], 'live', false),
('00000000-0000-0000-0000-000000000301', 'draft-p', 'Draft', 'Cat', 'mini', 'Desc', ARRAY['A'], 'draft', false),
('00000000-0000-0000-0000-000000000302', 'archived-p', 'Arch', 'Cat', 'mini', 'Desc', ARRAY['A'], 'live', true) ON CONFLICT DO NOTHING;

INSERT INTO public.contact_messages (id, sender_name, sender_email, subject, message, state) VALUES 
('00000000-0000-0000-0000-000000000020', 'S', 'e', 'S', 'M', 'new') ON CONFLICT DO NOTHING;

INSERT INTO public.drafts (entity_type, entity_id, draft_data) VALUES 
('projects', '00000000-0000-0000-0000-000000000301', '{"title": "Updated Draft", "slug": "live-p"}') ON CONFLICT DO NOTHING;

-------------------------------------------------------------------------------
-- 2. Anonymous Role
-------------------------------------------------------------------------------
SET ROLE anon;
SELECT set_config('request.jwt.claims', '', true);

SELECT is((SELECT count(*) FROM public.projects WHERE id = '00000000-0000-0000-0000-000000000300'), 1::bigint, 'Anon: sees live project');
SELECT is((SELECT count(*) FROM public.projects WHERE id = '00000000-0000-0000-0000-000000000301'), 0::bigint, 'Anon: cannot see draft project');
SELECT is((SELECT count(*) FROM public.drafts), 0::bigint, 'Anon: cannot see drafts');

SELECT throws_ok($$ INSERT INTO public.contact_messages (sender_name, sender_email, subject, message) VALUES ('a','a','a','a') $$, 'new row violates row-level security policy for table "contact_messages"', 'Anon cannot insert contact messages');
SELECT throws_ok($$ INSERT INTO public.projects (slug, title, category, tier, description, technologies) VALUES ('p', 'T', 'C', 'mini', 'D', ARRAY['A']) $$, 'new row violates row-level security policy for table "projects"', 'Anon cannot insert projects');

UPDATE public.projects SET title = 'Hacked' WHERE id = '00000000-0000-0000-0000-000000000300';
SELECT is((SELECT title FROM public.projects WHERE id = '00000000-0000-0000-0000-000000000300'), 'Live', 'Anon update failed to persist');

DELETE FROM public.projects WHERE id = '00000000-0000-0000-0000-000000000300';
SELECT is((SELECT count(*) FROM public.projects WHERE id = '00000000-0000-0000-0000-000000000300'), 1::bigint, 'Anon delete failed to persist');

SELECT throws_ok($$ SELECT public.publish_draft('projects', '00000000-0000-0000-0000-000000000301') $$, 'permission denied for function publish_draft', 'Anon cannot call RPC');

-------------------------------------------------------------------------------
-- 3. Authenticated Non-Owner
-------------------------------------------------------------------------------
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000098"}', true);

SELECT is((SELECT count(*) FROM public.projects WHERE id = '00000000-0000-0000-0000-000000000301'), 0::bigint, 'Auth Non-owner: cannot see draft project');

UPDATE public.projects SET title = 'Hacked' WHERE id = '00000000-0000-0000-0000-000000000300';
SELECT is((SELECT title FROM public.projects WHERE id = '00000000-0000-0000-0000-000000000300'), 'Live', 'Non-owner update failed to persist');

SELECT throws_ok($$ SELECT public.publish_draft('projects', '00000000-0000-0000-0000-000000000301') $$, 'permission denied for function publish_draft', 'Non-owner cannot call RPC');

-------------------------------------------------------------------------------
-- 4. Owner with AAL1
-------------------------------------------------------------------------------
SELECT set_config('request.jwt.claims', '{"aal": "aal1", "sub": "00000000-0000-0000-0000-000000000099"}', true);

SELECT is((SELECT count(*) FROM public.drafts), 0::bigint, 'AAL1: cannot see drafts');

UPDATE public.projects SET title = 'Hacked' WHERE id = '00000000-0000-0000-0000-000000000300';
SELECT is((SELECT title FROM public.projects WHERE id = '00000000-0000-0000-0000-000000000300'), 'Live', 'AAL1 update failed to persist');

SELECT throws_ok($$ SELECT public.publish_draft('projects', '00000000-0000-0000-0000-000000000301') $$, 'permission denied for function publish_draft', 'AAL1 cannot call RPC');

-------------------------------------------------------------------------------
-- 5. Owner with AAL2 (Admin)
-------------------------------------------------------------------------------
SELECT set_config('request.jwt.claims', '{"aal": "aal2", "sub": "00000000-0000-0000-0000-000000000099"}', true);

SELECT is((SELECT count(*) FROM public.drafts), 1::bigint, 'AAL2: can see drafts');

SELECT throws_ok($$ UPDATE public.projects SET title = 'Hacked' WHERE id = '00000000-0000-0000-0000-000000000300' $$, 'Cannot directly update a live record. Must update drafts and publish atomically.', 'AAL2: cannot update live projects directly');
SELECT throws_ok($$ SELECT public.publish_draft('projects', '00000000-0000-0000-0000-000000000301') $$, 'permission denied for function publish_draft', 'AAL2 cannot call RPC');

SELECT throws_ok($$ UPDATE public.projects SET is_archived = true WHERE id = '00000000-0000-0000-0000-000000000300' $$, 'Cannot directly update a live record. Must update drafts and publish atomically.', 'AAL2 cannot change archive state directly');
SELECT is((SELECT is_archived FROM public.projects WHERE id = '00000000-0000-0000-0000-000000000300'), false, 'AAL2 archive attempt failed to persist');

-------------------------------------------------------------------------------
-- 6. Service Role
-------------------------------------------------------------------------------
SET ROLE service_role;
SELECT set_config('request.jwt.claims', '', true);

SELECT is((SELECT count(*) FROM public.contact_messages), 1::bigint, 'Service Role can see contacts');
SELECT lives_ok($$ INSERT INTO public.contact_messages (sender_name, sender_email, subject, message) VALUES ('a','a','a','a') $$, 'Service Role CAN insert contacts');

-- Rollback RPC Test: The draft has slug "live-p" which is a duplicate of the existing project.
SELECT throws_ok($$ SELECT public.publish_draft('projects', '00000000-0000-0000-0000-000000000301') $$, 'Validation failed: slug must be unique', 'RPC rolls back correctly if validation fails');
SELECT is((SELECT count(*) FROM public.drafts WHERE entity_id = '00000000-0000-0000-0000-000000000301'), 1::bigint, 'Rollback: Draft remained intact');
SELECT is((SELECT count(*) FROM public.publication_deployments), 0::bigint, 'Rollback: No deployment queued');

-- Success RPC Test
UPDATE public.drafts SET draft_data = '{"slug": "valid-slug", "title": "Valid Title"}' WHERE entity_id = '00000000-0000-0000-0000-000000000301';
SELECT lives_ok($$ SELECT public.publish_draft('projects', '00000000-0000-0000-0000-000000000301') $$, 'RPC executes successfully');
SELECT is((SELECT count(*) FROM public.drafts WHERE entity_id = '00000000-0000-0000-0000-000000000301'), 0::bigint, 'Success: Draft deleted');
SELECT is((SELECT state FROM public.projects WHERE id = '00000000-0000-0000-0000-000000000301'), 'live', 'Success: Project published');
SELECT is((SELECT count(*) FROM public.publication_deployments), 1::bigint, 'Success: Deployment queued');
SELECT is((SELECT count(*) FROM public.admin_activity WHERE action = 'publish_draft'), 1::bigint, 'Success: Activity logged');
SELECT is((SELECT count(*) FROM public.content_revisions WHERE entity_id = '00000000-0000-0000-0000-000000000301'), 1::bigint, 'Success: Revision created');

SELECT * FROM finish();
ROLLBACK;
