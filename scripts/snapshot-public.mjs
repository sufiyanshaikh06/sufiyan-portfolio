import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import {
  DbProfileSchema,
  DbProjectSchema,
  DbSectionSchema,
  DbMediaAssetSchema,
  PublicSnapshotSchema,
} from '../lib/schemas/snapshot.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const DEFAULT_LOCAL_URL = 'http://127.0.0.1:54321';
const DEFAULT_LOCAL_PUBLISHABLE_KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
const DEFAULT_LOCAL_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

async function run() {
  console.log('--- Starting Phase 3 Public Snapshot ---');

  const supabaseUrl = process.env.SUPABASE_URL || process.env.TEST_SUPABASE_URL || DEFAULT_LOCAL_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.TEST_SUPABASE_ANON_KEY || DEFAULT_LOCAL_PUBLISHABLE_KEY || DEFAULT_LOCAL_ANON_KEY;

  const url = new URL(supabaseUrl);
  const isLocal = url.hostname === '127.0.0.1' || url.hostname === 'localhost';

  if (!isLocal && process.env.NODE_ENV === 'production') {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
      throw new Error('Fatal: SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set in production environment.');
    }
  }

  console.log(`Targeting Supabase at: ${url.origin} (isLocal: ${isLocal})`);

  // 1. Prepare clean output directories
  const mediaOutputDir = path.join(rootDir, 'public', 'generated', 'snapshot');
  const manifestOutputDir = path.join(rootDir, 'lib', 'generated');

  fs.rmSync(mediaOutputDir, { recursive: true, force: true });
  fs.rmSync(manifestOutputDir, { recursive: true, force: true });

  fs.mkdirSync(mediaOutputDir, { recursive: true });
  fs.mkdirSync(manifestOutputDir, { recursive: true });

  // 2. Connect via Public RLS client using publishable/anon key
  const client = createClient(supabaseUrl, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  // 3. Query & validate profiles
  console.log('Querying published profiles...');
  const { data: profileRows, error: profileErr } = await client
    .from('profiles')
    .select('*')
    .eq('is_published', true);

  if (profileErr) {
    throw new Error(`Failed to query profiles: ${profileErr.message}`);
  }
  if (!profileRows || profileRows.length !== 1) {
    throw new Error(`Expected exactly 1 published profile, but found ${profileRows ? profileRows.length : 0}`);
  }

  const rawProfile = DbProfileSchema.parse(profileRows[0]);
  console.log(`Validated profile: ${rawProfile.full_name}`);

  // 4. Query & validate Integrum project
  console.log('Querying Integrum project...');
  const { data: projectRows, error: projectErr } = await client
    .from('projects')
    .select('*')
    .eq('slug', 'integrum')
    .eq('state', 'live')
    .eq('is_archived', false);

  if (projectErr) {
    throw new Error(`Failed to query Integrum project: ${projectErr.message}`);
  }
  if (!projectRows || projectRows.length !== 1) {
    throw new Error(`Expected exactly 1 live unarchived Integrum project, but found ${projectRows ? projectRows.length : 0}`);
  }

  const rawProject = DbProjectSchema.parse(projectRows[0]);
  console.log(`Validated project: ${rawProject.title} (${rawProject.slug})`);

  // 5. Query & validate project sections
  console.log('Querying project sections...');
  const { data: sectionRows, error: sectionErr } = await client
    .from('project_sections')
    .select('*')
    .eq('project_id', rawProject.id)
    .order('display_order', { ascending: true });

  if (sectionErr) {
    throw new Error(`Failed to query project sections: ${sectionErr.message}`);
  }
  if (!sectionRows || sectionRows.length === 0) {
    throw new Error('Integrum project must contain at least 1 section.');
  }

  const rawSections = sectionRows.map((s) => DbSectionSchema.parse(s));
  console.log(`Validated ${rawSections.length} sections for Integrum.`);

  // 6. Gather all referenced media asset IDs
  const assetIdsToFetch = new Set();
  if (rawProfile.avatar_asset_id) assetIdsToFetch.add(rawProfile.avatar_asset_id);
  if (rawProject.featured_asset_id) assetIdsToFetch.add(rawProject.featured_asset_id);

  const { data: sectionMediaRows, error: smErr } = await client
    .from('project_section_media')
    .select('*')
    .in('section_id', rawSections.map((s) => s.id))
    .order('display_order', { ascending: true });

  if (smErr) {
    throw new Error(`Failed to query section media mappings: ${smErr.message}`);
  }

  const sectionMediaMap = new Map();
  if (sectionMediaRows) {
    for (const sm of sectionMediaRows) {
      assetIdsToFetch.add(sm.media_asset_id);
      if (!sectionMediaMap.has(sm.section_id)) {
        sectionMediaMap.set(sm.section_id, []);
      }
      sectionMediaMap.get(sm.section_id).push(sm.media_asset_id);
    }
  }

  // 7. Query & validate media assets
  console.log(`Querying ${assetIdsToFetch.size} referenced media assets...`);
  const assetMap = new Map();
  if (assetIdsToFetch.size > 0) {
    const { data: assetRows, error: assetErr } = await client
      .from('media_assets')
      .select('*')
      .in('id', Array.from(assetIdsToFetch))
      .eq('is_archived', false);

    if (assetErr) {
      throw new Error(`Failed to query media assets: ${assetErr.message}`);
    }

    for (const a of assetRows || []) {
      const parsedAsset = DbMediaAssetSchema.parse(a);
      assetMap.set(parsedAsset.id, parsedAsset);
    }
  }

  // 8. Helper to download, hash, and store media
  async function processMediaAsset(assetId) {
    if (!assetId) return null;
    const asset = assetMap.get(assetId);
    if (!asset) {
      if (!isLocal) {
        throw new Error(`Fatal: Referenced media asset ID ${assetId} not found in public database.`);
      }
      return null;
    }

    // Download from Supabase Storage
    let buffer;
    const { data: blob, error: dlErr } = await client
      .storage
      .from(asset.bucket_id)
      .download(asset.storage_path);

    if (dlErr || !blob) {
      if (!isLocal) {
        throw new Error(`Fatal: Failed to download production media asset (${asset.storage_path}): ${dlErr ? dlErr.message : 'Unknown error'}`);
      }
      // Local fallback for test suite if storage unseeded
      const fallbackFixture = path.join(rootDir, 'fixtures', 'storage', asset.file_name);
      if (fs.existsSync(fallbackFixture)) {
        buffer = fs.readFileSync(fallbackFixture);
      } else {
        throw new Error(`Local media fixture missing: ${fallbackFixture}`);
      }
    } else {
      buffer = Buffer.from(await blob.arrayBuffer());
    }

    if (buffer.length !== asset.file_size && !isLocal) {
      throw new Error(`Fatal: Downloaded file size (${buffer.length}) does not match recorded size (${asset.file_size}) for ${asset.file_name}`);
    }

    // Determine extension from MIME
    let ext = 'jpg';
    if (asset.file_type === 'image/jpeg') ext = 'jpg';
    else if (asset.file_type === 'image/png') ext = 'png';
    else if (asset.file_type === 'image/webp') ext = 'webp';
    else if (asset.file_type === 'image/svg+xml') ext = 'svg';

    // 16-character SHA-256 hash
    const hash16 = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 16);
    const cleanBase = asset.file_name.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const finalFileName = `${cleanBase}-${hash16}.${ext}`;
    const targetFilePath = path.join(mediaOutputDir, finalFileName);

    fs.writeFileSync(targetFilePath, buffer);
    console.log(`Saved hashed media: ${finalFileName} (${buffer.length} bytes)`);

    return {
      fileName: asset.file_name,
      localPath: `/generated/snapshot/${finalFileName}`,
      altText: asset.alt_text,
      width: asset.width,
      height: asset.height,
    };
  }

  // 9. Process assets
  const avatarLocal = await processMediaAsset(rawProfile.avatar_asset_id);
  const featuredLocal = await processMediaAsset(rawProject.featured_asset_id);

  const sectionsWithMedia = [];
  for (const s of rawSections) {
    const mediaIds = sectionMediaMap.get(s.id) || [];
    const mediaList = [];
    for (const mId of mediaIds) {
      const mAsset = await processMediaAsset(mId);
      if (mAsset) mediaList.push(mAsset);
    }
    sectionsWithMedia.push({
      id: s.id,
      title: s.title,
      content: s.content,
      displayOrder: s.display_order,
      media: mediaList,
    });
  }

  // 10. Assemble and validate final snapshot
  const snapshotPayload = {
    profile: {
      fullName: rawProfile.full_name,
      professionalName: rawProfile.professional_name,
      headline: rawProfile.headline,
      bio: rawProfile.bio,
      githubUrl: rawProfile.github_url,
      avatar: avatarLocal,
    },
    integrum: {
      id: rawProject.id,
      slug: rawProject.slug,
      title: rawProject.title,
      subtitle: rawProject.subtitle || null,
      category: rawProject.category,
      tier: rawProject.tier,
      description: rawProject.description,
      technologies: rawProject.technologies,
      featuredAsset: featuredLocal,
      demoUrl: rawProject.demo_url || null,
      githubUrl: rawProject.github_url || null,
      sections: sectionsWithMedia,
    },
    generatedAt: new Date().toISOString(),
  };

  const validatedSnapshot = PublicSnapshotSchema.parse(snapshotPayload);
  const jsonOutput = JSON.stringify(validatedSnapshot, null, 2);

  // Security assertion: no storage paths or bucket ids in public snapshot
  if (jsonOutput.includes('bucket_id') || jsonOutput.includes('bucketId') || jsonOutput.includes('storage_path') || jsonOutput.includes('storagePath')) {
    throw new Error('Fatal Security Violation: Public snapshot contains storage bucket or path identifiers.');
  }

  const manifestPath = path.join(manifestOutputDir, 'public-snapshot.json');
  fs.writeFileSync(manifestPath, jsonOutput, 'utf-8');
  console.log(`Successfully wrote validated public snapshot: ${manifestPath}`);
  console.log('--- Phase 3 Public Snapshot Complete ---');
}

run().catch((err) => {
  console.error('Snapshot Generation Failed:', err);
  process.exit(1);
});
