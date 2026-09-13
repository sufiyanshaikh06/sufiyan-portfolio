-- Seed data for completely idempotent testing
-- Uses UUIDs 00000000-0000-0000-0000-... for predictability

INSERT INTO auth.users (id, email) VALUES 
('00000000-0000-0000-0000-000000000099', 'admin@example.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.admin_users (id, email) VALUES 
('00000000-0000-0000-0000-000000000099', 'admin@example.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) VALUES 
('public_assets', 'public_assets', true),
('private_assets', 'private_assets', false),
('resumes', 'resumes', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.media_assets (id, bucket_id, file_name, file_type, file_size, storage_path, alt_text, is_decorative, width, height, is_archived) VALUES
('00000000-0000-0000-0000-000000000001', 'public_assets', 'avatar.jpg', 'image/jpeg', 1024, 'portraits/avatar.jpg', 'Avatar', false, 800, 800, false),
('00000000-0000-0000-0000-000000000002', 'public_assets', 'project_cover.jpg', 'image/jpeg', 2048, 'projects/cover.jpg', 'Cover', false, 1920, 1080, false),
('00000000-0000-0000-0000-000000000003', 'resumes', 'resume.pdf', 'application/pdf', 5120, 'docs/resume.pdf', 'Resume PDF', false, NULL, NULL, false)
ON CONFLICT (bucket_id, storage_path) DO UPDATE SET file_name = EXCLUDED.file_name;

INSERT INTO public.profiles (id, full_name, professional_name, headline, bio, github_url, linkedin_url, email, is_published, avatar_asset_id) VALUES
('00000000-0000-0000-0000-000000000011', 'Seed User', 'Seed User', 'Software Engineer', 'A test bio', 'https://github.com', 'https://linkedin.com', 'test@test.com', true, '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

INSERT INTO public.skill_categories (id, name, display_order, is_published, is_archived) VALUES
('00000000-0000-0000-0000-000000000021', 'Frontend', 1, true, false)
ON CONFLICT (name) DO UPDATE SET display_order = EXCLUDED.display_order;

INSERT INTO public.skills (id, category_id, name, proficiency_level, icon_identifier, vector_position_x, vector_position_y, display_order, is_published, is_archived) VALUES
('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000021', 'React', 'Expert', 'react', 10.0, 20.0, 1, true, false)
ON CONFLICT (category_id, name) DO UPDATE SET proficiency_level = EXCLUDED.proficiency_level;

INSERT INTO public.projects (id, slug, title, subtitle, category, tier, description, technologies, state, is_archived, featured_asset_id) VALUES
('00000000-0000-0000-0000-000000000041', 'seed-project', 'Seed Project', 'A test project', 'Web', 'standard', 'A great seed project.', ARRAY['React'], 'live', false, '00000000-0000-0000-0000-000000000002')
ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title;

INSERT INTO public.project_sections (id, project_id, title, content, display_order) VALUES
('00000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000041', 'Overview', 'Seed project overview', 1)
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

INSERT INTO public.seo_entries (id, route_path, title, description, is_published, is_archived, og_image_asset_id) VALUES
('00000000-0000-0000-0000-000000000061', '/', 'Home', 'Home Page', true, false, '00000000-0000-0000-0000-000000000001')
ON CONFLICT (route_path) DO UPDATE SET title = EXCLUDED.title;

INSERT INTO public.resume_versions (id, version_label, file_asset_id, is_active, is_archived) VALUES
('00000000-0000-0000-0000-000000000071', 'V1', '00000000-0000-0000-0000-000000000003', true, false)
ON CONFLICT (id) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.contact_messages (id, sender_name, sender_email, subject, message, state) VALUES
('00000000-0000-0000-0000-000000000081', 'Seed Contact', 'seed@contact.com', 'Hello', 'Seed message content', 'new')
ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state;
