-- 1. Skill Categories
INSERT INTO public.skill_categories (id, name, display_order, is_published, is_archived)
VALUES 
    ('00000000-0000-0000-0002-000000000001', 'Languages', 1, true, false)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    display_order = EXCLUDED.display_order,
    is_published = EXCLUDED.is_published,
    is_archived = EXCLUDED.is_archived;

-- 2. Skills
INSERT INTO public.skills (category_id, name, proficiency_level, icon_identifier, is_published, is_archived)
VALUES 
    ('00000000-0000-0000-0002-000000000001', 'TypeScript', 'Working Knowledge', 'typescript', true, false),
    ('00000000-0000-0000-0002-000000000001', 'JavaScript', 'Working Knowledge', 'javascript', true, false),
    ('00000000-0000-0000-0002-000000000001', 'Python', 'Working Knowledge', 'python', true, false),
    ('00000000-0000-0000-0002-000000000001', 'SQL', 'Working Knowledge', 'sql', true, false)
ON CONFLICT (category_id, name) DO UPDATE SET
    proficiency_level = EXCLUDED.proficiency_level,
    icon_identifier = EXCLUDED.icon_identifier,
    is_published = EXCLUDED.is_published,
    is_archived = EXCLUDED.is_archived;

-- 3. Profiles
INSERT INTO public.profiles (id, full_name, professional_name, headline, bio, github_url, is_published)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Sufiyan Shaikh',
    'Sufiyan Shaikh',
    'Computer Science Student | Building Intelligent Software',
    'I am a Computer Science student focused on artificial intelligence, machine learning and software engineering.',
    'https://github.com/sufiyanshaikh06',
    true
) ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    professional_name = EXCLUDED.professional_name,
    headline = EXCLUDED.headline,
    bio = EXCLUDED.bio,
    github_url = EXCLUDED.github_url,
    is_published = EXCLUDED.is_published;

-- 4. Projects
INSERT INTO public.projects (id, slug, title, category, tier, description, technologies, state)
VALUES 
(
    '00000000-0000-0000-0001-000000000001',
    'integrum',
    'Integrum',
    'Full-Stack',
    'featured',
    'A student success platform.',
    ARRAY['TypeScript', 'Next.js'],
    'live'
),
(
    '00000000-0000-0000-0001-000000000002',
    'iot-temp-monitor',
    'IoT Body Temperature Monitoring System',
    'IoT/Embedded',
    'featured',
    'A body temperature monitoring system utilizing ESP32.',
    ARRAY['C++', 'ESP32'],
    'live'
) ON CONFLICT (id) DO UPDATE SET
    slug = EXCLUDED.slug,
    title = EXCLUDED.title,
    category = EXCLUDED.category,
    tier = EXCLUDED.tier,
    description = EXCLUDED.description,
    technologies = EXCLUDED.technologies,
    state = EXCLUDED.state;
