import { createClient } from '@supabase/supabase-js';

// Fixed trusted geometric SVG artwork for production placeholder (no scripts, no external refs)
const TRUSTED_AVATAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">
  <defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#0F111A"/>
      <stop offset="100%" stop-color="#05050A"/>
    </radialGradient>
    <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00F0FF"/>
      <stop offset="100%" stop-color="#7000FF"/>
    </linearGradient>
  </defs>
  <rect width="800" height="800" fill="url(#bg)"/>
  <circle cx="400" cy="400" r="320" stroke="url(#cyanGrad)" stroke-width="4" fill="none" stroke-dasharray="16 8"/>
  <circle cx="400" cy="400" r="280" stroke="#00F0FF" stroke-width="2" fill="none" opacity="0.6"/>
  <circle cx="400" cy="400" r="200" stroke="#7000FF" stroke-width="3" fill="none" opacity="0.4"/>
  <text x="400" y="390" font-family="system-ui, sans-serif" font-size="72" font-weight="bold" fill="#00F0FF" text-anchor="middle">SUFIYAN SHAIKH</text>
  <text x="400" y="440" font-family="monospace" font-size="24" fill="#9CA3AF" text-anchor="middle">VERIFIED PROFILE // PORTRAIT PLACEHOLDER</text>
</svg>`;

const TRUSTED_INTEGRUM_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <defs>
    <radialGradient id="bgInt" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="#0F111A"/>
      <stop offset="100%" stop-color="#05050A"/>
    </radialGradient>
    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00F0FF"/>
      <stop offset="100%" stop-color="#7000FF"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#bgInt)"/>
  <rect x="100" y="100" width="1720" height="880" rx="20" stroke="url(#borderGrad)" stroke-width="4" fill="none" opacity="0.8"/>
  <line x1="100" y1="220" x2="1820" y2="220" stroke="#00F0FF" stroke-width="2" opacity="0.4"/>
  <text x="180" y="180" font-family="system-ui, sans-serif" font-size="48" font-weight="bold" fill="#00F0FF">INTEGRUM // STUDENT SUCCESS PLATFORM</text>
  <text x="180" y="340" font-family="system-ui, sans-serif" font-size="32" fill="#E5E7EB">Academic, Productivity, and Career Management Platform</text>
  <text x="180" y="420" font-family="monospace" font-size="22" fill="#9CA3AF">Full-Stack Implementation: React | TypeScript | Tailwind CSS | Node.js | PostgreSQL</text>
  <circle cx="1500" cy="540" r="220" stroke="#7000FF" stroke-width="3" fill="none" stroke-dasharray="12 12"/>
  <circle cx="1500" cy="540" r="160" stroke="#00F0FF" stroke-width="2" fill="none" opacity="0.6"/>
  <polygon points="1500,340 1520,380 1480,380" fill="#00F0FF"/>
  <text x="1500" y="550" font-family="monospace" font-size="24" fill="#00F0FF" text-anchor="middle">ARCHITECTURE</text>
</svg>`;

async function main() {
  console.log('--- Starting Idempotent Production Remote Provisioning ---');

  // Security Safeguards
  if (process.env.ALLOW_REMOTE_PROVISION !== '1') {
    throw new Error('Safety Guard: ALLOW_REMOTE_PROVISION=1 must be explicitly set to run remote provisioning.');
  }

  const supabaseUrl = process.env.PROD_SUPABASE_URL || process.env.SUPABASE_URL;
  const secretKey = process.env.PROD_SUPABASE_SECRET_KEY || process.env.PROD_SUPABASE_SERVICE_ROLE_KEY;
  const publishableKey = process.env.PROD_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !secretKey) {
    throw new Error('Safety Guard: PROD_SUPABASE_URL and PROD_SUPABASE_SECRET_KEY are required.');
  }

  const url = new URL(supabaseUrl);
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    throw new Error(`Safety Guard: Refusing to run remote provisioning against local target: ${url.hostname}`);
  }

  console.log(`Connecting securely to remote Supabase: ${url.origin}...`);

  const adminClient = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false },
  });

  // 1. Upload Storage Objects to public_assets
  console.log('Step 1: Uploading approved public media objects...');
  const avatarBuffer = Buffer.from(TRUSTED_AVATAR_SVG, 'utf8');
  const integrumBuffer = Buffer.from(TRUSTED_INTEGRUM_SVG, 'utf8');

  const { error: upAvatarErr } = await adminClient.storage
    .from('public_assets')
    .upload('portraits/avatar.svg', avatarBuffer, {
      contentType: 'image/svg+xml',
      upsert: true,
    });
  if (upAvatarErr) throw new Error(`Failed to upload avatar: ${upAvatarErr.message}`);

  const { error: upIntErr } = await adminClient.storage
    .from('public_assets')
    .upload('projects/integrum.svg', integrumBuffer, {
      contentType: 'image/svg+xml',
      upsert: true,
    });
  if (upIntErr) throw new Error(`Failed to upload integrum image: ${upIntErr.message}`);

  // 2. Upsert media_assets metadata
  console.log('Step 2: Upserting media_assets records...');
  const AVATAR_ASSET_ID = '10000000-0000-0000-0000-000000000010';
  const INTEGRUM_ASSET_ID = '10000000-0000-0000-0000-000000000011';

  const mediaAssets = [
    {
      id: AVATAR_ASSET_ID,
      bucket_id: 'public_assets',
      file_name: 'avatar.svg',
      file_type: 'image/svg+xml',
      file_size: avatarBuffer.length,
      storage_path: 'portraits/avatar.svg',
      alt_text: 'Sufiyan Shaikh verified profile visualization',
      width: 800,
      height: 800,
      is_archived: false,
    },
    {
      id: INTEGRUM_ASSET_ID,
      bucket_id: 'public_assets',
      file_name: 'integrum.svg',
      file_type: 'image/svg+xml',
      file_size: integrumBuffer.length,
      storage_path: 'projects/integrum.svg',
      alt_text: 'Integrum Student Success Platform interface visualization',
      width: 1920,
      height: 1080,
      is_archived: false,
    },
  ];

  for (const asset of mediaAssets) {
    const { error: maErr } = await adminClient
      .from('media_assets')
      .upsert(asset, { onConflict: 'bucket_id,storage_path' });
    if (maErr) throw new Error(`Failed to upsert media asset ${asset.file_name}: ${maErr.message}`);
  }

  // 3. Upsert Profile
  console.log('Step 3: Upserting verified profile for Sufiyan Shaikh...');
  const PROFILE_ID = '10000000-0000-0000-0000-000000000020';
  const { error: profErr } = await adminClient.from('profiles').upsert(
    {
      id: PROFILE_ID,
      full_name: 'Sufiyan Shaikh',
      professional_name: 'Sufiyan Shaikh',
      headline: 'Computer Science Student | Building Intelligent Software',
      bio: 'I am a Computer Science student focused on artificial intelligence, machine learning and software engineering.',
      github_url: 'https://github.com/sufiyanshaikh06',
      linkedin_url: null,
      email: null,
      is_published: true,
      avatar_asset_id: AVATAR_ASSET_ID,
    },
    { onConflict: 'id' }
  );
  if (profErr) throw new Error(`Failed to upsert profile: ${profErr.message}`);

  // 4. Upsert Integrum Project
  console.log('Step 4: Upserting verified Integrum project...');
  const PROJECT_ID = '10000000-0000-0000-0000-000000000050';
  const { error: projErr } = await adminClient.from('projects').upsert(
    {
      id: PROJECT_ID,
      slug: 'integrum',
      title: 'Integrum',
      subtitle: 'Student Success Platform',
      category: 'Full-Stack',
      tier: 'featured',
      description:
        'A full-stack student-success platform integrating academic, productivity and career-management workflows, with AI-assisted capabilities planned as part of the approved architecture.',
      technologies: ['React', 'TypeScript', 'Tailwind CSS', 'Node.js', 'Express.js', 'PostgreSQL', 'Prisma'],
      featured_asset_id: INTEGRUM_ASSET_ID,
      demo_url: null,
      github_url: null,
      display_order: 1,
      state: 'live',
      is_archived: false,
    },
    { onConflict: 'slug' }
  );
  if (projErr) throw new Error(`Failed to upsert project: ${projErr.message}`);

  // 5. Upsert Project Sections
  console.log('Step 5: Upserting verified project sections...');
  const SECTION_ID = '10000000-0000-0000-0000-000000000060';
  const { error: secErr } = await adminClient.from('project_sections').upsert(
    {
      id: SECTION_ID,
      project_id: PROJECT_ID,
      title: 'Overview',
      content:
        'Integrum brings together course tracking, task scheduling, and career-planning milestones into a unified full-stack web application.',
      display_order: 1,
    },
    { onConflict: 'id' }
  );
  if (secErr) throw new Error(`Failed to upsert section: ${secErr.message}`);

  // 6. Upsert Section Media
  console.log('Step 6: Upserting section media mapping...');
  const { error: psmErr } = await adminClient.from('project_section_media').upsert(
    {
      id: '10000000-0000-0000-0000-000000000065',
      section_id: SECTION_ID,
      media_asset_id: INTEGRUM_ASSET_ID,
      display_order: 1,
    },
    { onConflict: 'section_id,media_asset_id' }
  );
  if (psmErr) throw new Error(`Failed to upsert section media: ${psmErr.message}`);

  // 7. Test Public RLS Visibility with Publishable Key
  if (publishableKey) {
    console.log('Step 7: Testing anonymous public RLS visibility...');
    const anonClient = createClient(supabaseUrl, publishableKey, {
      auth: { persistSession: false },
    });

    const { data: pubProf, error: pubProfErr } = await anonClient
      .from('profiles')
      .select('*')
      .eq('is_published', true);
    if (pubProfErr || !pubProf || pubProf.length === 0) {
      throw new Error(`Anonymous RLS check failed on profiles: ${pubProfErr ? pubProfErr.message : 'No data'}`);
    }

    const { data: pubProj, error: pubProjErr } = await anonClient
      .from('projects')
      .select('*')
      .eq('slug', 'integrum')
      .eq('state', 'live');
    if (pubProjErr || !pubProj || pubProj.length === 0) {
      throw new Error(`Anonymous RLS check failed on projects: ${pubProjErr ? pubProjErr.message : 'No data'}`);
    }

    console.log('Anonymous RLS visibility verified successfully.');
  }

  console.log('✔ Remote production provisioning complete and verified.');
}

main().catch((err) => {
  console.error('Remote Provisioning Failed:', err);
  process.exit(1);
});
