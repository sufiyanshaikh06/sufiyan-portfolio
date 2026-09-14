-- ==============================================================================
-- DEVELOPMENT SEED DATA
-- Portfolio content: Verified facts for Sufiyan Shaikh
-- Auth fixtures: Local development test accounts (.example domain)
-- ==============================================================================

-- 1. Local Development Auth Fixture (Non-production, .example domain)
INSERT INTO auth.users (id, email) VALUES 
('00000000-0000-0000-0000-000000000001', 'dev-admin@example.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.admin_users (id, email) VALUES 
('00000000-0000-0000-0000-000000000001', 'dev-admin@example.com')
ON CONFLICT (id) DO NOTHING;

-- 2. Storage Buckets (resumes is private for controlled publication)
INSERT INTO storage.buckets (id, name, public) VALUES 
('public_assets', 'public_assets', true),
('private_assets', 'private_assets', false),
('resumes', 'resumes', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- 3. Media Assets
INSERT INTO public.media_assets (id, bucket_id, file_name, file_type, file_size, storage_path, alt_text, caption, is_decorative, width, height, is_archived) VALUES
('10000000-0000-0000-0000-000000000010', 'public_assets', 'avatar.jpg', 'image/jpeg', 4019, 'portraits/avatar.jpg', 'Sufiyan Shaikh portrait', NULL, false, 800, 800, false),
('10000000-0000-0000-0000-000000000011', 'public_assets', 'integrum.jpg', 'image/jpeg', 12508, 'projects/integrum.jpg', 'Integrum Student Success Platform interface', NULL, false, 1920, 1080, false),
('10000000-0000-0000-0000-000000000012', 'public_assets', 'iot-temp-monitor.jpg', 'image/jpeg', 12509, 'projects/iot-temp-monitor.jpg', 'IoT Body Temperature Monitoring System prototype', NULL, false, 1920, 1080, false),
('10000000-0000-0000-0000-000000000013', 'resumes', 'sufiyan_shaikh_resume.pdf', 'application/pdf', 1175, 'docs/sufiyan_shaikh_resume.pdf', 'Development fixture resume PDF', NULL, false, NULL, NULL, false)
ON CONFLICT (bucket_id, storage_path) DO UPDATE SET 
    file_name = EXCLUDED.file_name,
    file_size = EXCLUDED.file_size,
    width = EXCLUDED.width,
    height = EXCLUDED.height,
    alt_text = EXCLUDED.alt_text;

-- 4. Profile
INSERT INTO public.profiles (id, full_name, professional_name, headline, bio, github_url, linkedin_url, email, is_published, avatar_asset_id) VALUES
('10000000-0000-0000-0000-000000000020', 'Sufiyan Shaikh', 'Sufiyan Shaikh', 'Computer Science Student | Building Intelligent Software', 'I am a Computer Science student focused on artificial intelligence, machine learning and software engineering.', 'https://github.com/sufiyanshaikh06', NULL, NULL, true, '10000000-0000-0000-0000-000000000010')
ON CONFLICT (id) DO UPDATE SET 
    full_name = EXCLUDED.full_name,
    professional_name = EXCLUDED.professional_name,
    headline = EXCLUDED.headline,
    bio = EXCLUDED.bio,
    github_url = EXCLUDED.github_url,
    linkedin_url = EXCLUDED.linkedin_url,
    email = EXCLUDED.email;

-- 5. Skill Categories
INSERT INTO public.skill_categories (id, name, display_order, is_published, is_archived) VALUES
('10000000-0000-0000-0000-000000000030', 'Languages & Fundamentals', 1, true, false),
('10000000-0000-0000-0000-000000000031', 'Frameworks & Systems', 2, true, false)
ON CONFLICT (name) DO UPDATE SET display_order = EXCLUDED.display_order;

-- 6. Skills (Neutral classifications)
INSERT INTO public.skills (id, category_id, name, proficiency_level, icon_identifier, vector_position_x, vector_position_y, display_order, is_published, is_archived) VALUES
('10000000-0000-0000-0000-000000000040', '10000000-0000-0000-0000-000000000030', 'TypeScript', 'Working Knowledge', 'typescript', 10.0, 20.0, 1, true, false),
('10000000-0000-0000-0000-000000000041', '10000000-0000-0000-0000-000000000030', 'Python', 'Working Knowledge', 'python', 20.0, 20.0, 2, true, false),
('10000000-0000-0000-0000-000000000042', '10000000-0000-0000-0000-000000000030', 'C++', 'Working Knowledge', 'cpp', 30.0, 20.0, 3, true, false),
('10000000-0000-0000-0000-000000000043', '10000000-0000-0000-0000-000000000031', 'React', 'Working Knowledge', 'react', 10.0, 40.0, 1, true, false),
('10000000-0000-0000-0000-000000000044', '10000000-0000-0000-0000-000000000031', 'Node.js', 'Working Knowledge', 'nodejs', 20.0, 40.0, 2, true, false)
ON CONFLICT (category_id, name) DO UPDATE SET proficiency_level = EXCLUDED.proficiency_level;

-- 7. Projects (Verified descriptions & categories)
INSERT INTO public.projects (id, slug, title, subtitle, category, tier, description, technologies, state, is_archived, featured_asset_id) VALUES
('10000000-0000-0000-0000-000000000050', 'integrum', 'Integrum', 'Student Success Platform', 'Full-Stack', 'featured', 'A full-stack student-success platform integrating academic, productivity and career-management workflows, with AI-assisted capabilities planned as part of the approved architecture.', ARRAY['React', 'TypeScript', 'Tailwind CSS', 'Node.js', 'Express.js', 'PostgreSQL', 'Prisma'], 'live', false, '10000000-0000-0000-0000-000000000011'),
('10000000-0000-0000-0000-000000000051', 'iot-temp-monitor', 'IoT Body Temperature Monitoring System', 'Embedded Health Monitoring Device', 'IoT/Embedded', 'featured', 'An ESP32-based body-temperature monitoring prototype using a waterproof DS18B20 digital sensor, an I2C LCD, status LEDs, buttons, a buzzer and ThingSpeak logging.', ARRAY['C++', 'ESP32', 'Arduino Framework', 'ThingSpeak'], 'live', false, '10000000-0000-0000-0000-000000000012')
ON CONFLICT (slug) DO UPDATE SET 
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    category = EXCLUDED.category,
    tier = EXCLUDED.tier,
    description = EXCLUDED.description,
    technologies = EXCLUDED.technologies;

-- 8. Project Sections
INSERT INTO public.project_sections (id, project_id, title, content, display_order) VALUES
('10000000-0000-0000-0000-000000000060', '10000000-0000-0000-0000-000000000050', 'Overview', 'Integrum brings together course tracking, task scheduling, and career-planning milestones into a unified full-stack web application.', 1),
('10000000-0000-0000-0000-000000000061', '10000000-0000-0000-0000-000000000051', 'Hardware Architecture', 'The system utilizes an ESP32 microcontroller paired with a waterproof DS18B20 digital temperature sensor, I2C LCD, status LEDs, buzzer alerts, and ThingSpeak cloud telemetry for real-time logging.', 1)
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content;

-- 9. Project Section Media
INSERT INTO public.project_section_media (id, section_id, media_asset_id, display_order) VALUES
('10000000-0000-0000-0000-000000000065', '10000000-0000-0000-0000-000000000060', '10000000-0000-0000-0000-000000000011', 1),
('10000000-0000-0000-0000-000000000066', '10000000-0000-0000-0000-000000000061', '10000000-0000-0000-0000-000000000012', 1)
ON CONFLICT (section_id, media_asset_id) DO UPDATE SET display_order = EXCLUDED.display_order;

-- 10. SEO Entries
INSERT INTO public.seo_entries (id, route_path, title, description, is_published, is_archived, og_image_asset_id) VALUES
('10000000-0000-0000-0000-000000000070', '/', 'Sufiyan Shaikh | Portfolio', 'Computer Science Student focused on artificial intelligence, machine learning and software engineering.', true, false, '10000000-0000-0000-0000-000000000010')
ON CONFLICT (route_path) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;

-- 11. Resume Versions
INSERT INTO public.resume_versions (id, version_label, file_asset_id, is_active, is_archived) VALUES
('10000000-0000-0000-0000-000000000080', 'Development Fixture Resume', '10000000-0000-0000-0000-000000000013', true, false)
ON CONFLICT (id) DO UPDATE SET 
    version_label = EXCLUDED.version_label,
    is_active = EXCLUDED.is_active;
