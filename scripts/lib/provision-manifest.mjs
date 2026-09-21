// scripts/lib/provision-manifest.mjs

export const TRUSTED_IOT_TEMP_MONITOR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <defs>
    <radialGradient id="bgIot" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="#0F111A"/>
      <stop offset="100%" stop-color="#05050A"/>
    </radialGradient>
    <linearGradient id="cyanViolet" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00F0FF"/>
      <stop offset="100%" stop-color="#7000FF"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#bgIot)"/>
  <rect x="100" y="100" width="1720" height="880" rx="20" stroke="url(#cyanViolet)" stroke-width="4" fill="none" opacity="0.8"/>
  <line x1="100" y1="220" x2="1820" y2="220" stroke="#00F0FF" stroke-width="2" opacity="0.4"/>
  <text x="180" y="180" font-family="system-ui, sans-serif" font-size="44" font-weight="bold" fill="#00F0FF">IOT BODY TEMPERATURE MONITORING SYSTEM // HARDWARE PROTOTYPE</text>
  <text x="180" y="340" font-family="system-ui, sans-serif" font-size="30" fill="#E5E7EB">Embedded Health Telemetry Device with Real-Time Cloud Logging</text>
  <text x="180" y="420" font-family="monospace" font-size="22" fill="#9CA3AF">Hardware Stack: ESP32 | DS18B20 Digital Sensor | I2C LCD | ThingSpeak API | C++</text>
  <circle cx="1500" cy="540" r="220" stroke="#7000FF" stroke-width="3" fill="none" stroke-dasharray="12 12"/>
  <circle cx="1500" cy="540" r="160" stroke="#00F0FF" stroke-width="2" fill="none" opacity="0.6"/>
  <circle cx="1500" cy="540" r="80" stroke="#00F0FF" stroke-width="1.5" fill="none" stroke-dasharray="4 4"/>
  <polygon points="1500,340 1520,380 1480,380" fill="#00F0FF"/>
  <text x="1500" y="545" font-family="monospace" font-size="20" fill="#00F0FF" text-anchor="middle">TELEMETRY</text>
  <text x="1500" y="575" font-family="monospace" font-size="16" fill="#9CA3AF" text-anchor="middle">ESP32 // DS18B20</text>
</svg>`;

export const FIXED_IDS = {
  AVATAR_ASSET: '10000000-0000-0000-0000-000000000010',
  INTEGRUM_ASSET: '10000000-0000-0000-0000-000000000011',
  IOT_ASSET: '10000000-0000-0000-0000-000000000012',
  PROFILE: '10000000-0000-0000-0000-000000000020',
  SKILL_CAT_LANG: '10000000-0000-0000-0000-000000000030',
  SKILL_CAT_FRAME: '10000000-0000-0000-0000-000000000031',
  SKILL_TS: '10000000-0000-0000-0000-000000000040',
  SKILL_PY: '10000000-0000-0000-0000-000000000041',
  SKILL_CPP: '10000000-0000-0000-0000-000000000042',
  SKILL_REACT: '10000000-0000-0000-0000-000000000043',
  SKILL_NODE: '10000000-0000-0000-0000-000000000044',
  PROJECT_INTEGRUM: '10000000-0000-0000-0000-000000000050',
  PROJECT_IOT: '10000000-0000-0000-0000-000000000051',
  SECTION_INTEGRUM: '10000000-0000-0000-0000-000000000060',
  SECTION_IOT: '10000000-0000-0000-0000-000000000061',
  SEC_MEDIA_INTEGRUM: '10000000-0000-0000-0000-000000000065',
  SEC_MEDIA_IOT: '10000000-0000-0000-0000-000000000066',
  SEO_HOME: '10000000-0000-0000-0000-000000000070',
  SEO_ABOUT: '10000000-0000-0000-0000-000000000071',
  SEO_PROJECTS: '10000000-0000-0000-0000-000000000072',
  SEO_INT: '10000000-0000-0000-0000-000000000073',
  SEO_IOT: '10000000-0000-0000-0000-000000000074',
  SEO_SKILLS: '10000000-0000-0000-0000-000000000075',
  SEO_EXP: '10000000-0000-0000-0000-000000000076',
  EDUCATION_RKT: '10000000-0000-0000-0000-000000000090',
};

/**
 * Builds the complete, deterministic manifest for Phase 4C verified production provisioning.
 * 
 * Rules enforced:
 * 1. svgAssets contains ONLY the new IoT SVG; avatar.svg and integrum.svg are preserved existing dependencies.
 * 2. Education start_date and end_date are null (no invented calendar dates), no display_order column.
 * 3. Exact 7 SEO entries mapped to respective assets.
 * 4. Exact 2 skill categories and 5 skills from seed.
 * 5. Deterministic primary key UUIDs across all entities.
 */
export function buildProvisioningManifest() {
  const iotSvgBuffer = Buffer.from(TRUSTED_IOT_TEMP_MONITOR_SVG, 'utf8');

  return {
    // Only new media assets to upload. Avatar and Integrum SVG are existing dependencies.
    svgAssetsToUpload: [
      {
        storagePath: 'projects/iot-temp-monitor.svg',
        content: TRUSTED_IOT_TEMP_MONITOR_SVG,
        contentType: 'image/svg+xml',
        size: iotSvgBuffer.length,
      },
    ],

    // Existing media objects required by the manifest (for inspection/preservation verification)
    existingMediaDependencies: [
      'portraits/avatar.svg',
      'projects/integrum.svg',
    ],

    mediaAssets: [
      {
        id: FIXED_IDS.AVATAR_ASSET,
        alt_text: 'Sufiyan Shaikh existing geometric profile visualization',
      },
      {
        id: FIXED_IDS.INTEGRUM_ASSET,
        alt_text: 'Integrum Student Success Platform interface visualization',
      },
      {
        id: FIXED_IDS.IOT_ASSET,
        bucket_id: 'public_assets',
        file_name: 'iot-temp-monitor.svg',
        file_type: 'image/svg+xml',
        file_size: iotSvgBuffer.length,
        storage_path: 'projects/iot-temp-monitor.svg',
        alt_text: 'IoT Body Temperature Monitoring System hardware visualization',
        width: 1920,
        height: 1080,
        is_archived: false,
      },
    ],

    profile: {
      id: FIXED_IDS.PROFILE,
      full_name: 'Sufiyan Shaikh',
      professional_name: 'Sufiyan Shaikh',
      headline: 'Computer Science Student | Building Intelligent Software',
      bio: 'I am a Computer Science student focused on artificial intelligence, machine learning and software engineering.',
      github_url: 'https://github.com/sufiyanshaikh06',
      linkedin_url: null,
      email: null,
      is_published: true,
      avatar_asset_id: FIXED_IDS.AVATAR_ASSET,
    },

    projects: [
      {
        id: FIXED_IDS.PROJECT_INTEGRUM,
        slug: 'integrum',
        title: 'Integrum',
        subtitle: 'Student Success Platform',
        category: 'Full-Stack',
        tier: 'featured',
        description:
          'A full-stack student-success platform integrating academic, productivity and career-management workflows, with AI-assisted capabilities planned as part of the approved architecture.',
        technologies: ['React', 'TypeScript', 'Tailwind CSS', 'Node.js', 'Express.js', 'PostgreSQL', 'Prisma'],
        featured_asset_id: FIXED_IDS.INTEGRUM_ASSET,
        demo_url: null,
        github_url: null,
        display_order: 1,
        state: 'live',
        is_archived: false,
      },
      {
        id: FIXED_IDS.PROJECT_IOT,
        slug: 'iot-temp-monitor',
        title: 'IoT Body Temperature Monitoring System',
        subtitle: 'Embedded Health Monitoring Device',
        category: 'IoT/Embedded',
        tier: 'featured',
        description:
          'An ESP32-based body-temperature monitoring prototype using a waterproof DS18B20 digital sensor, an I2C LCD, status LEDs, buttons, a buzzer and ThingSpeak logging.',
        technologies: ['C++', 'ESP32', 'Arduino Framework', 'ThingSpeak'],
        featured_asset_id: FIXED_IDS.IOT_ASSET,
        demo_url: null,
        github_url: null,
        display_order: 2,
        state: 'live',
        is_archived: false,
      },
    ],

    projectSections: [
      {
        id: FIXED_IDS.SECTION_INTEGRUM,
        project_id: FIXED_IDS.PROJECT_INTEGRUM,
        title: 'Overview',
        content:
          'Integrum brings together course tracking, task scheduling, and career-planning milestones into a unified full-stack web application.',
        display_order: 1,
      },
      {
        id: FIXED_IDS.SECTION_IOT,
        project_id: FIXED_IDS.PROJECT_IOT,
        title: 'Hardware Architecture',
        content:
          'The system utilizes an ESP32 microcontroller paired with a waterproof DS18B20 digital temperature sensor, I2C LCD, status LEDs, buzzer alerts, and ThingSpeak cloud telemetry for real-time logging.',
        display_order: 1,
      },
    ],

    projectSectionMedia: [
      {
        id: FIXED_IDS.SEC_MEDIA_INTEGRUM,
        section_id: FIXED_IDS.SECTION_INTEGRUM,
        media_asset_id: FIXED_IDS.INTEGRUM_ASSET,
        display_order: 1,
      },
      {
        id: FIXED_IDS.SEC_MEDIA_IOT,
        section_id: FIXED_IDS.SECTION_IOT,
        media_asset_id: FIXED_IDS.IOT_ASSET,
        display_order: 1,
      },
    ],

    skillCategories: [
      {
        id: FIXED_IDS.SKILL_CAT_LANG,
        name: 'Languages & Fundamentals',
        display_order: 1,
        is_published: true,
        is_archived: false,
      },
      {
        id: FIXED_IDS.SKILL_CAT_FRAME,
        name: 'Frameworks & Systems',
        display_order: 2,
        is_published: true,
        is_archived: false,
      },
    ],

    skills: [
      {
        id: FIXED_IDS.SKILL_TS,
        category_id: FIXED_IDS.SKILL_CAT_LANG,
        name: 'TypeScript',
        proficiency_level: 'Working Knowledge',
        icon_identifier: 'typescript',
        vector_position_x: 10.0,
        vector_position_y: 20.0,
        display_order: 1,
        is_published: true,
        is_archived: false,
      },
      {
        id: FIXED_IDS.SKILL_PY,
        category_id: FIXED_IDS.SKILL_CAT_LANG,
        name: 'Python',
        proficiency_level: 'Working Knowledge',
        icon_identifier: 'python',
        vector_position_x: 20.0,
        vector_position_y: 20.0,
        display_order: 2,
        is_published: true,
        is_archived: false,
      },
      {
        id: FIXED_IDS.SKILL_CPP,
        category_id: FIXED_IDS.SKILL_CAT_LANG,
        name: 'C++',
        proficiency_level: 'Working Knowledge',
        icon_identifier: 'cpp',
        vector_position_x: 30.0,
        vector_position_y: 20.0,
        display_order: 3,
        is_published: true,
        is_archived: false,
      },
      {
        id: FIXED_IDS.SKILL_REACT,
        category_id: FIXED_IDS.SKILL_CAT_FRAME,
        name: 'React',
        proficiency_level: 'Working Knowledge',
        icon_identifier: 'react',
        vector_position_x: 10.0,
        vector_position_y: 40.0,
        display_order: 1,
        is_published: true,
        is_archived: false,
      },
      {
        id: FIXED_IDS.SKILL_NODE,
        category_id: FIXED_IDS.SKILL_CAT_FRAME,
        name: 'Node.js',
        proficiency_level: 'Working Knowledge',
        icon_identifier: 'nodejs',
        vector_position_x: 20.0,
        vector_position_y: 40.0,
        display_order: 2,
        is_published: true,
        is_archived: false,
      },
    ],

    education: [
      {
        id: FIXED_IDS.EDUCATION_RKT,
        institution: 'R.K. Talreja College of Arts, Science and Commerce',
        degree: 'Bachelor of Science',
        field_of_study: 'Computer Science',
        start_date: null,
        end_date: null,
        description: 'Affiliated with the University of Mumbai. Expected graduation in 2027.',
        is_published: true,
        is_archived: false,
      },
    ],

    seoEntries: [
      {
        id: FIXED_IDS.SEO_HOME,
        route_path: '/',
        title: 'Sufiyan Shaikh | Computer Science Student & Developer',
        description:
          'Personal portfolio of Sufiyan Shaikh, Computer Science student focused on artificial intelligence, machine learning, and intelligent software engineering.',
        keywords: ['Sufiyan Shaikh', 'Computer Science', 'Portfolio', 'Full-Stack Developer'],
        og_image_asset_id: FIXED_IDS.AVATAR_ASSET,
        is_published: true,
        is_archived: false,
      },
      {
        id: FIXED_IDS.SEO_ABOUT,
        route_path: '/about',
        title: 'About | Sufiyan Shaikh',
        description:
          'Academic background, technical focus, and journey of Sufiyan Shaikh in Computer Science and software systems engineering.',
        keywords: ['About Sufiyan Shaikh', 'Education', 'Computer Science Student', 'University of Mumbai'],
        og_image_asset_id: FIXED_IDS.AVATAR_ASSET,
        is_published: true,
        is_archived: false,
      },
      {
        id: FIXED_IDS.SEO_PROJECTS,
        route_path: '/projects',
        title: 'Projects | Sufiyan Shaikh',
        description:
          'Technical case studies and systems built by Sufiyan Shaikh, spanning full-stack web platforms and embedded IoT prototypes.',
        keywords: ['Projects', 'Software Projects', 'Full-Stack', 'IoT', 'Integrum'],
        og_image_asset_id: FIXED_IDS.AVATAR_ASSET,
        is_published: true,
        is_archived: false,
      },
      {
        id: FIXED_IDS.SEO_INT,
        route_path: '/projects/integrum',
        title: 'Integrum — Student Success Platform | Case Study',
        description:
          'Full-stack student-success platform integrating academic, productivity, and career-management workflows with Next.js, Node.js, and PostgreSQL.',
        keywords: ['Integrum', 'Student Success Platform', 'React', 'TypeScript', 'Tailwind CSS', 'PostgreSQL'],
        og_image_asset_id: FIXED_IDS.INTEGRUM_ASSET,
        is_published: true,
        is_archived: false,
      },
      {
        id: FIXED_IDS.SEO_IOT,
        route_path: '/projects/iot-temp-monitor',
        title: 'IoT Body Temperature Monitoring System | Case Study',
        description:
          'ESP32-based health telemetry device integrating DS18B20 digital temperature sensing, I2C LCD, local alerts, and ThingSpeak cloud telemetry.',
        keywords: ['IoT', 'ESP32', 'DS18B20', 'Temperature Monitoring', 'Arduino', 'ThingSpeak'],
        og_image_asset_id: FIXED_IDS.IOT_ASSET,
        is_published: true,
        is_archived: false,
      },
      {
        id: FIXED_IDS.SEO_SKILLS,
        route_path: '/skills',
        title: 'Skills & Technical Stack | Sufiyan Shaikh',
        description:
          'Technical competencies, languages, frameworks, and tools across modern full-stack development and systems programming.',
        keywords: ['Skills', 'TypeScript', 'Python', 'React', 'Node.js', 'C++'],
        og_image_asset_id: FIXED_IDS.AVATAR_ASSET,
        is_published: true,
        is_archived: false,
      },
      {
        id: FIXED_IDS.SEO_EXP,
        route_path: '/experience',
        title: 'Experience & Academic Journey | Sufiyan Shaikh',
        description:
          'Academic milestones, verified education, and technical trajectory of Sufiyan Shaikh.',
        keywords: ['Experience', 'Academic Journey', 'Computer Science'],
        og_image_asset_id: FIXED_IDS.AVATAR_ASSET,
        is_published: true,
        is_archived: false,
      },
    ],
  };
}
