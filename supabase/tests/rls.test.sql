BEGIN;
SELECT plan(19);

-- 1. Setup Test Data
INSERT INTO auth.users (id, email) VALUES 
('00000000-0000-0000-0000-000000000099', 'admin@example.com'),
('00000000-0000-0000-0000-000000000098', 'user@example.com');

INSERT INTO public.admin_users (id, email) VALUES ('00000000-0000-0000-0000-000000000099', 'admin@example.com');

INSERT INTO public.profiles (id, full_name, professional_name, headline, bio, github_url, is_published, draft_data)
VALUES 
('00000000-0000-0000-0000-000000000100', 'Live Profile', 'Live Profile', 'Headline', 'Bio', 'http://github', true, '{"draft": true}'),
('00000000-0000-0000-0000-000000000101', 'Draft Profile', 'Draft Profile', 'Headline', 'Bio', 'http://github', false, '{"draft": true}');

INSERT INTO public.contact_messages (id, sender_name, sender_email, subject, message)
VALUES ('00000000-0000-0000-0000-000000000102', 'Spammer', 'spam@spam.com', 'Subj', 'Message');


-- 2. Test Anonymous (anon role)
SET ROLE anon;
SELECT set_config('request.jwt.claims', '', true);

SELECT is(
    (SELECT count(*) FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000100'),
    1::bigint,
    'Anonymous can see published profiles'
);
SELECT is(
    (SELECT count(*) FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000101'),
    0::bigint,
    'Anonymous cannot see draft profiles'
);
SELECT throws_ok(
    $$ INSERT INTO public.contact_messages (sender_name, sender_email, subject, message) VALUES ('Test', 'test@test.com', 'Subj', 'Message') $$,
    'new row violates row-level security policy for table "contact_messages"',
    'Anonymous cannot insert contact messages directly'
);
UPDATE public.profiles SET full_name = 'Hacked' WHERE id = '00000000-0000-0000-0000-000000000100';
SELECT is(
    (SELECT full_name FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000100'),
    'Live Profile',
    'Anonymous cannot update profiles (row remains unchanged)'
);


-- 3. Test Authenticated Non-Owner
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000098"}', true);

SELECT is(
    (SELECT count(*) FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000101'),
    0::bigint,
    'Authenticated non-owner cannot see draft profiles'
);
UPDATE public.profiles SET full_name = 'Hacked' WHERE id = '00000000-0000-0000-0000-000000000100';
SELECT is(
    (SELECT full_name FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000100'),
    'Live Profile',
    'Authenticated non-owner cannot update profiles'
);


-- 4. Test Owner with aal1
SELECT set_config('request.jwt.claims', '{"aal": "aal1", "sub": "00000000-0000-0000-0000-000000000099"}', true);

SELECT is(
    (SELECT count(*) FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000101'),
    0::bigint,
    'Owner with aal1 cannot see draft profiles'
);
UPDATE public.profiles SET full_name = 'Hacked' WHERE id = '00000000-0000-0000-0000-000000000100';
SELECT is(
    (SELECT full_name FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000100'),
    'Live Profile',
    'Owner with aal1 cannot update profiles'
);


-- 5. Test Owner with aal2
SELECT set_config('request.jwt.claims', '{"aal": "aal2", "sub": "00000000-0000-0000-0000-000000000099"}', true);

SELECT is(
    (SELECT count(*) FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000101'),
    1::bigint,
    'Owner with aal2 CAN see draft profiles'
);
UPDATE public.profiles SET full_name = 'Updated' WHERE id = '00000000-0000-0000-0000-000000000101';
SELECT is(
    (SELECT full_name FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000101'),
    'Updated',
    'Owner with aal2 CAN update profiles'
);
DELETE FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000101';
SELECT is(
    (SELECT count(*) FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000101'),
    1::bigint,
    'Owner with aal2 CANNOT hard delete profiles (Archive-first enforced)'
);
SELECT is(
    (SELECT count(*) FROM public.contact_messages WHERE id = '00000000-0000-0000-0000-000000000102'),
    1::bigint,
    'Owner with aal2 CAN read contact messages'
);
SELECT throws_ok(
    $$ INSERT INTO public.contact_messages (sender_name, sender_email, subject, message) VALUES ('Test', 'test@test.com', 'Subj', 'Message') $$,
    'new row violates row-level security policy for table "contact_messages"',
    'Owner with aal2 CANNOT insert contact messages directly'
);
UPDATE public.contact_messages SET state = 'read' WHERE id = '00000000-0000-0000-0000-000000000102';
SELECT is(
    (SELECT state::text FROM public.contact_messages WHERE id = '00000000-0000-0000-0000-000000000102'),
    'read',
    'Owner with aal2 CAN update contact message state'
);
DELETE FROM public.contact_messages WHERE id = '00000000-0000-0000-0000-000000000102';
SELECT is(
    (SELECT count(*) FROM public.contact_messages WHERE id = '00000000-0000-0000-0000-000000000102'),
    1::bigint,
    'Owner with aal2 CANNOT delete contact messages'
);


-- 6. Test Service Role (Bypasses RLS)
SET ROLE service_role;
SELECT set_config('request.jwt.claims', '', true);

SELECT lives_ok(
    $$ INSERT INTO public.contact_messages (sender_name, sender_email, subject, message) VALUES ('API', 'api@api.com', 'Subj', 'Message') $$,
    'Service role CAN insert contact messages bypassing RLS'
);
SELECT is(
    (SELECT count(*) FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000101'),
    1::bigint,
    'Service role CAN read all profiles'
);
SELECT lives_ok(
    $$ DELETE FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000101' $$,
    'Service role CAN hard delete profiles if absolutely necessary'
);
SELECT lives_ok(
    $$ DELETE FROM public.contact_messages WHERE id = '00000000-0000-0000-0000-000000000102' $$,
    'Service role CAN hard delete contact messages if absolutely necessary'
);

SELECT * FROM finish();
ROLLBACK;
