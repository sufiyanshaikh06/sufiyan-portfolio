-- Disable foreign key checks for seeding
SET session_replication_role = 'replica';

-- 1. Profiles
INSERT INTO public.profiles (id, full_name, professional_name, headline, bio, github_url, is_published)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Sufiyan Shaikh',
    'Sufiyan Shaikh',
    'Computer Science Student | Aspiring AI/ML Engineer | Building Intelligent Software and Connected Systems',
    'I am a Computer Science student focused on artificial intelligence, machine learning and software engineering. I build practical projects across AI, web development, IoT and computer networks while developing the technical foundations required for an AI/ML engineering career.',
    'https://github.com/sufiyanshaikh06',
    true
) ON CONFLICT (id) DO NOTHING;

-- 2. Projects
INSERT INTO public.projects (id, slug, title, subtitle, category, tier, description, technologies, state)
VALUES 
(
    '00000000-0000-0000-0001-000000000001',
    'integrum',
    'Integrum',
    'Smart Student Success Platform',
    'Full-Stack',
    'featured',
    'A comprehensive student success platform designed to track academic progress and provide smart insights.',
    ARRAY['TypeScript', 'Next.js', 'PostgreSQL'],
    'live'
),
(
    '00000000-0000-0000-0001-000000000002',
    'iot-temp-monitor',
    'IoT Body Temperature Monitoring System',
    'Hardware & Software Integration',
    'IoT/Embedded',
    'featured',
    'A body temperature monitoring system utilizing ESP32 to track and report health metrics in real-time.',
    ARRAY['C++', 'ESP32', 'IoT'],
    'live'
),
(
    '00000000-0000-0000-0001-000000000003',
    'chess',
    'Chess',
    'Classic Board Game Implementation',
    'Experiments',
    'mini',
    'A fully functional chess game implementation with move validation and checkmate detection.',
    ARRAY['JavaScript', 'React'],
    'live'
),
(
    '00000000-0000-0000-0001-000000000004',
    'tic-tac-toe',
    'Tic-Tac-Toe',
    'Interactive Web Game',
    'Experiments',
    'mini',
    'A classic Tic-Tac-Toe game exploring state management in modern web frameworks.',
    ARRAY['JavaScript', 'React'],
    'live'
) ON CONFLICT (id) DO NOTHING;

-- 3. Skill Categories
INSERT INTO public.skill_categories (id, name, display_order)
VALUES 
    ('00000000-0000-0000-0002-000000000001', 'Languages', 1)
ON CONFLICT (id) DO NOTHING;

-- 4. Skills
INSERT INTO public.skills (category_id, name, proficiency_level, icon_identifier, is_published)
VALUES 
    ('00000000-0000-0000-0002-000000000001', 'TypeScript', 'Working Knowledge', 'typescript', true),
    ('00000000-0000-0000-0002-000000000001', 'JavaScript', 'Core Stack', 'javascript', true),
    ('00000000-0000-0000-0002-000000000001', 'Java', 'Working Knowledge', 'java', true),
    ('00000000-0000-0000-0002-000000000001', 'C++', 'Working Knowledge', 'cpp', true),
    ('00000000-0000-0000-0002-000000000001', 'Python', 'Core Stack', 'python', true),
    ('00000000-0000-0000-0002-000000000001', 'Kotlin', 'Working Knowledge', 'kotlin', true),
    ('00000000-0000-0000-0002-000000000001', 'SQL', 'Core Stack', 'sql', true),
    ('00000000-0000-0000-0002-000000000001', 'R', 'Exploring', 'r', true)
ON CONFLICT DO NOTHING;

-- Re-enable foreign key checks
SET session_replication_role = 'origin';
