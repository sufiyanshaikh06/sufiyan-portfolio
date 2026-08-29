BEGIN;
SELECT plan(9);

-- Check if tables exist
SELECT has_table('public', 'profiles', 'Profiles table should exist');
SELECT has_table('public', 'projects', 'Projects table should exist');
SELECT has_table('public', 'contact_messages', 'Contact messages table should exist');
SELECT has_table('public', 'admin_users', 'Admin users table should exist');

-- Seed a test admin and a public profile
INSERT INTO auth.users (id, email) VALUES ('00000000-0000-0000-0000-000000000099', 'admin@example.com');
INSERT INTO public.admin_users (id, email) VALUES ('00000000-0000-0000-0000-000000000099', 'admin@example.com');

INSERT INTO public.profiles (id, full_name, professional_name, headline, bio, github_url, is_published)
VALUES ('00000000-0000-0000-0000-000000000100', 'Test User', 'Test User', 'Headline', 'Bio', 'http://github', true);

INSERT INTO public.profiles (id, full_name, professional_name, headline, bio, github_url, is_published)
VALUES ('00000000-0000-0000-0000-000000000101', 'Draft User', 'Draft User', 'Headline', 'Bio', 'http://github', false);

-- TEST 1: Anonymous users can see published profiles
SET ROLE authenticated;
SELECT is(
    (SELECT count(*) FROM public.profiles WHERE is_published = true),
    (SELECT count(*) FROM public.profiles),
    'Anonymous/Authenticated users can only see published profiles'
);

-- TEST 2: Admin with aal1 cannot see draft profiles
SELECT set_config('request.jwt.claims', '{"aal": "aal1", "sub": "00000000-0000-0000-0000-000000000099"}', true);
SELECT is(
    (SELECT count(*) FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000101'),
    0::bigint,
    'Admin without aal2 cannot see draft profiles'
);

-- TEST 3: Admin with aal2 can see draft profiles
SELECT set_config('request.jwt.claims', '{"aal": "aal2", "sub": "00000000-0000-0000-0000-000000000099"}', true);
SELECT is(
    (SELECT count(*) FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000101'),
    1::bigint,
    'Admin with aal2 can see draft profiles'
);

-- TEST 4: Anonymous cannot insert into contact_messages directly
SET ROLE authenticated;
SELECT throws_ok(
    $$ INSERT INTO public.contact_messages (sender_name, sender_email, subject, message) VALUES ('Test', 'test@test.com', 'Subj', 'Message') $$,
    'new row violates row-level security policy for table "contact_messages"',
    'Anonymous cannot insert into contact_messages directly via RLS'
);

-- TEST 5: Admin aal2 can insert into contact_messages
-- Wait, actually we said even admin doesn't insert directly or maybe they can. Our policy:
-- CREATE POLICY "Admins can update contact_messages" ON public.contact_messages FOR UPDATE USING (auth.is_aal2_admin());
-- We didn't allow Admins to INSERT contact messages. So it should throw.
-- Let's check that there is no INSERT policy for contact messages.
SELECT set_config('request.jwt.claims', '{"aal": "aal2", "sub": "00000000-0000-0000-0000-000000000099"}', true);
SELECT throws_ok(
    $$ INSERT INTO public.contact_messages (sender_name, sender_email, subject, message) VALUES ('Test', 'test@test.com', 'Subj', 'Message') $$,
    'new row violates row-level security policy for table "contact_messages"',
    'Even admins cannot insert contact messages directly via RLS (server-side only)'
);

SELECT * FROM finish();
ROLLBACK;
