-- Production-like seed content

INSERT INTO auth.users (id, email) VALUES 
('10000000-0000-0000-0000-000000000001', 'sufiyanshaikh54957@gmail.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.admin_users (id, email) VALUES 
('10000000-0000-0000-0000-000000000001', 'sufiyanshaikh54957@gmail.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) VALUES 
('public_assets', 'public_assets', true),
('private_assets', 'private_assets', false),
('resumes', 'resumes', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.media_assets (id, bucket_id, file_name, file_type, file_size, storage_path, alt_text, is_decorative, width, height, is_archived) VALUES
('10000000-0000-0000-0000-000000000010', 'public_assets', 'avatar.jpg', 'image/jpeg', 10240, 'portraits/avatar.jpg', 'Sufiyan Shaikh', false, 800, 800, false),
('10000000-0000-0000-0000-000000000011', 'public_assets', 'integrum.jpg', 'image/jpeg', 20480, 'projects/integrum.jpg', 'Integrum App', false, 1920, 1080, false),
('10000000-0000-0000-0000-000000000012', 'public_assets', 'iot.jpg', 'image/jpeg', 20480, 'projects/iot.jpg', 'IoT Project', false, 1920, 1080, false),
('10000000-0000-0000-0000-000000000013', 'resumes', 'sufiyan_shaikh_resume.pdf', 'application/pdf', 51200, 'docs/sufiyan_shaikh_resume.pdf', 'Sufiyan Shaikh Resume', false, NULL, NULL, false)
ON CONFLICT (bucket_id, storage_path) DO UPDATE SET file_name = EXCLUDED.file_name;

INSERT INTO public.profiles (id, full_name, professional_name, headline, bio, github_url, linkedin_url, email, is_published, avatar_asset_id) VALUES
('10000000-0000-0000-0000-000000000020', 'Sufiyan Shaikh', 'Sufiyan Shaikh', 'Software Engineer', 'Passionate about building scalable applications.', 'https://github.com/sufiyanshaikh06', 'https://linkedin.com/in/sufiyanshaikh', 'sufiyanshaikh54957@gmail.com', true, '10000000-0000-0000-0000-000000000010')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

INSERT INTO public.skill_categories (id, name, display_order, is_published, is_archived) VALUES
('10000000-0000-0000-0000-000000000030', 'Frontend Development', 1, true, false),
('10000000-0000-0000-0000-000000000031', 'Backend Development', 2, true, false)
ON CONFLICT (name) DO UPDATE SET display_order = EXCLUDED.display_order;

INSERT INTO public.skills (id, category_id, name, proficiency_level, icon_identifier, vector_position_x, vector_position_y, display_order, is_published, is_archived) VALUES
('10000000-0000-0000-0000-000000000040', '10000000-0000-0000-0000-000000000030', 'React', 'Expert', 'react', 10.0, 20.0, 1, true, false),
('10000000-0000-0000-0000-000000000041', '10000000-0000-0000-0000-000000000031', 'Node.js', 'Advanced', 'nodejs', 30.0, 40.0, 1, true, false)
ON CONFLICT (category_id, name) DO UPDATE SET proficiency_level = EXCLUDED.proficiency_level;

INSERT INTO public.projects (id, slug, title, subtitle, category, tier, description, technologies, state, is_archived, featured_asset_id) VALUES
('10000000-0000-0000-0000-000000000050', 'integrum', 'Integrum', 'A robust application', 'Web Development', 'featured', 'Integrum is a comprehensive platform for enterprise management.', ARRAY['React', 'Node.js'], 'live', false, '10000000-0000-0000-0000-000000000011'),
('10000000-0000-0000-0000-000000000051', 'iot-platform', 'IoT Project', 'Smart living', 'IoT', 'standard', 'An Internet of Things project demonstrating connectivity.', ARRAY['Python', 'C++'], 'live', false, '10000000-0000-0000-0000-000000000012')
ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title;

INSERT INTO public.project_sections (id, project_id, title, content, display_order) VALUES
('10000000-0000-0000-0000-000000000060', '10000000-0000-0000-0000-000000000050', 'Overview', 'Integrum overview content.', 1),
('10000000-0000-0000-0000-000000000061', '10000000-0000-0000-0000-000000000051', 'Architecture', 'IoT Architecture details.', 1)
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

INSERT INTO public.seo_entries (id, route_path, title, description, is_published, is_archived, og_image_asset_id) VALUES
('10000000-0000-0000-0000-000000000070', '/', 'Sufiyan Shaikh - Portfolio', 'Software Engineer Portfolio', true, false, '10000000-0000-0000-0000-000000000010')
ON CONFLICT (route_path) DO UPDATE SET title = EXCLUDED.title;

INSERT INTO public.resume_versions (id, version_label, file_asset_id, is_active, is_archived) VALUES
('10000000-0000-0000-0000-000000000080', 'Current Resume', '10000000-0000-0000-0000-000000000013', true, false)
ON CONFLICT (id) DO UPDATE SET is_active = EXCLUDED.is_active;

-- End of real seed data. No contact messages or fake users here.
