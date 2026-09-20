import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

import {
  DbProfileSchema,
  DbProjectSchema,
  DbSectionSchema,
  DbSectionMediaSchema,
  DbSkillCategorySchema,
  DbSkillSchema,
  DbEducationSchema,
  DbExperienceSchema,
  DbCertificationSchema,
  DbAchievementSchema,
  DbSeoEntrySchema,
  DbResumeVersionSchema,
  DbMediaAssetSchema,
  PublicSnapshotSchema,
} from '../lib/schemas/snapshot.ts';

import { normalizeRoutePath } from '../lib/schemas/helpers.ts';
import {
  validateMediaBuffer,
  generateSafeHashedFilename,
} from './lib/media-validator.mjs';
import {
  scanPayloadForLeaks,
  promoteSnapshotAtomically,
} from './lib/snapshot-pipeline.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const DEFAULT_LOCAL_URL = 'http://127.0.0.1:54321';
const DEFAULT_LOCAL_PUBLISHABLE_KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
const DEFAULT_LOCAL_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

async function run() {
  console.log('--- Starting Phase 4A Public Snapshot Expansion ---');

  const isVercel = Boolean(process.env.VERCEL);
  const isCi = Boolean(process.env.CI || process.env.GITHUB_ACTIONS);
  const isProduction = process.env.NODE_ENV === 'production';

  // In Vercel or non-CI production cloud environments, we MUST NOT fall back to local Supabase
  if (isVercel || (isProduction && !isCi)) {
    const prodUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const prodKey =
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY;

    if (!prodUrl || !prodKey) {
      throw new Error(
        'Vercel / Production Deployment Error: Missing Supabase credentials.\n' +
        'SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) must be configured in your Vercel Project Settings.\n' +
        'Vercel builds prerender static pages by snapshotting published content from your remote Supabase instance.'
      );
    }
  }

  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.TEST_SUPABASE_URL ||
    DEFAULT_LOCAL_URL;

  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.TEST_SUPABASE_ANON_KEY ||
    DEFAULT_LOCAL_PUBLISHABLE_KEY ||
    DEFAULT_LOCAL_ANON_KEY;

  const url = new URL(supabaseUrl);
  const isLocal = url.hostname === '127.0.0.1' || url.hostname === 'localhost';

  if (isVercel && isLocal) {
    throw new Error(
      `Invalid Supabase URL on Vercel: "${supabaseUrl}". Vercel cannot connect to localhost. Please specify your remote Supabase project URL in Vercel Environment Variables.`
    );
  }

  console.log(`Targeting Supabase at: ${url.origin} (isLocal: ${isLocal})`);

  // 1. Create unique isolated staging directories
  const stagingMediaDir = fs.mkdtempSync(path.join(os.tmpdir(), 'snapshot-staging-media-'));
  const stagingManifestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'snapshot-staging-manifest-'));
  const stagingManifestFile = path.join(stagingManifestDir, 'public-snapshot.json');

  try {
    // 2. Connect via Public RLS client using publishable/anon key
    const client = createClient(supabaseUrl, publishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    // 3. Explicit column queries for all public entities
    console.log('Querying published profile...');
    const { data: profileRows, error: profileErr } = await client
      .from('profiles')
      .select(
        'id, full_name, professional_name, headline, bio, github_url, linkedin_url, email, is_published, avatar_asset_id'
      )
      .eq('is_published', true);

    if (profileErr) throw new Error(`Failed to query profiles: ${profileErr.message}`);
    if (!profileRows || profileRows.length !== 1) {
      throw new Error(`Expected exactly 1 published profile, but found ${profileRows ? profileRows.length : 0}`);
    }
    const rawProfile = DbProfileSchema.parse(profileRows[0]);

    console.log('Querying live projects...');
    const { data: projectRows, error: projectErr } = await client
      .from('projects')
      .select(
        'id, slug, title, subtitle, category, tier, description, problem_statement, architecture_overview, key_features, technologies, featured_asset_id, demo_url, github_url, display_order, state, is_archived'
      )
      .eq('state', 'live')
      .eq('is_archived', false)
      .order('display_order', { ascending: true })
      .order('slug', { ascending: true });

    if (projectErr) throw new Error(`Failed to query projects: ${projectErr.message}`);
    if (!projectRows || projectRows.length === 0) {
      throw new Error('Expected at least 1 live, unarchived project.');
    }
    const rawProjects = projectRows.map((p) => DbProjectSchema.parse(p));
    const projectIds = rawProjects.map((p) => p.id);

    console.log(`Querying sections for ${projectIds.length} projects...`);
    let rawSections = [];
    if (projectIds.length > 0) {
      const { data: sectionRows, error: sectionErr } = await client
        .from('project_sections')
        .select('id, project_id, title, content, display_order')
        .in('project_id', projectIds)
        .order('display_order', { ascending: true })
        .order('title', { ascending: true });

      if (sectionErr) throw new Error(`Failed to query sections: ${sectionErr.message}`);
      rawSections = (sectionRows || []).map((s) => DbSectionSchema.parse(s));
    }
    const sectionIds = rawSections.map((s) => s.id);

    console.log(`Querying section media for ${sectionIds.length} sections...`);
    let rawSectionMedia = [];
    if (sectionIds.length > 0) {
      const { data: smRows, error: smErr } = await client
        .from('project_section_media')
        .select('id, section_id, media_asset_id, display_order')
        .in('section_id', sectionIds)
        .order('display_order', { ascending: true });

      if (smErr) throw new Error(`Failed to query section media: ${smErr.message}`);
      rawSectionMedia = (smRows || []).map((sm) => DbSectionMediaSchema.parse(sm));
    }

    console.log('Querying skill categories and published skills...');
    const { data: catRows, error: catErr } = await client
      .from('skill_categories')
      .select('id, name, display_order, is_published, is_archived')
      .eq('is_published', true)
      .eq('is_archived', false)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (catErr) throw new Error(`Failed to query skill categories: ${catErr.message}`);
    const rawCategories = (catRows || []).map((c) => DbSkillCategorySchema.parse(c));
    const categoryIds = rawCategories.map((c) => c.id);

    let rawSkills = [];
    if (categoryIds.length > 0) {
      const { data: skillRows, error: skillErr } = await client
        .from('skills')
        .select(
          'id, category_id, name, proficiency_level, icon_identifier, vector_position_x, vector_position_y, display_order, is_published, is_archived'
        )
        .eq('is_published', true)
        .eq('is_archived', false)
        .in('category_id', categoryIds)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

      if (skillErr) throw new Error(`Failed to query skills: ${skillErr.message}`);
      rawSkills = (skillRows || []).map((sk) => DbSkillSchema.parse(sk));
    }

    console.log('Querying education...');
    const { data: eduRows, error: eduErr } = await client
      .from('education')
      .select('id, institution, degree, field_of_study, start_date, end_date, description, is_published, is_archived')
      .eq('is_published', true)
      .eq('is_archived', false)
      .order('start_date', { ascending: false, nullsFirst: false })
      .order('institution', { ascending: true })
      .order('degree', { ascending: true });

    if (eduErr) throw new Error(`Failed to query education: ${eduErr.message}`);
    const rawEducation = (eduRows || []).map((e) => DbEducationSchema.parse(e));

    console.log('Querying experiences...');
    const { data: expRows, error: expErr } = await client
      .from('experiences')
      .select('id, organization, role_title, type, location, start_date, end_date, description_points, display_order, is_published, is_archived')
      .eq('is_published', true)
      .eq('is_archived', false)
      .order('display_order', { ascending: true })
      .order('start_date', { ascending: false });

    if (expErr) throw new Error(`Failed to query experiences: ${expErr.message}`);
    const rawExperiences = (expRows || []).map((exp) => DbExperienceSchema.parse(exp));

    console.log('Querying certifications...');
    const { data: certRows, error: certErr } = await client
      .from('certifications')
      .select('id, name, issuing_organization, issue_date, credential_url, certificate_asset_id, is_published, is_archived')
      .eq('is_published', true)
      .eq('is_archived', false)
      .order('issue_date', { ascending: false, nullsFirst: false })
      .order('name', { ascending: true });

    if (certErr) throw new Error(`Failed to query certifications: ${certErr.message}`);
    const rawCertifications = (certRows || []).map((c) => DbCertificationSchema.parse(c));

    console.log('Querying achievements...');
    const { data: achRows, error: achErr } = await client
      .from('achievements')
      .select('id, title, date, description, achievement_asset_id, is_published, is_archived')
      .eq('is_published', true)
      .eq('is_archived', false)
      .order('date', { ascending: false, nullsFirst: false })
      .order('title', { ascending: true });

    if (achErr) throw new Error(`Failed to query achievements: ${achErr.message}`);
    const rawAchievements = (achRows || []).map((a) => DbAchievementSchema.parse(a));

    console.log('Querying SEO entries...');
    const { data: seoRows, error: seoErr } = await client
      .from('seo_entries')
      .select('id, route_path, title, description, keywords, og_image_asset_id, is_published, is_archived')
      .eq('is_published', true)
      .eq('is_archived', false)
      .order('route_path', { ascending: true });

    if (seoErr) throw new Error(`Failed to query SEO entries: ${seoErr.message}`);
    const rawSeoEntries = (seoRows || []).map((s) => DbSeoEntrySchema.parse(s));

    console.log('Querying active resume metadata...');
    const { data: resumeRows, error: resumeErr } = await client
      .from('resume_versions')
      .select('id, version_label, file_asset_id, is_active, is_archived, uploaded_at')
      .eq('is_active', true)
      .eq('is_archived', false)
      .order('uploaded_at', { ascending: false });

    if (resumeErr) throw new Error(`Failed to query resume versions: ${resumeErr.message}`);
    if (resumeRows && resumeRows.length > 1) {
      throw new Error(`Integrity Violation: Expected at most 1 active resume, found ${resumeRows.length}`);
    }
    const rawActiveResume =
      resumeRows && resumeRows.length === 1 ? DbResumeVersionSchema.parse(resumeRows[0]) : null;

    // 4. Pre-Assembly Relational Integrity Validation
    console.log('Verifying relational integrity before stripping IDs...');
    const projectIdSet = new Set(projectIds);
    for (const section of rawSections) {
      if (!projectIdSet.has(section.project_id)) {
        throw new Error(`Orphaned section ${section.id}: project_id ${section.project_id} not in live projects.`);
      }
    }

    const sectionIdSet = new Set(sectionIds);
    for (const sm of rawSectionMedia) {
      if (!sectionIdSet.has(sm.section_id)) {
        throw new Error(`Orphaned section media ${sm.id}: section_id ${sm.section_id} not in queried sections.`);
      }
    }

    const categoryIdSet = new Set(categoryIds);
    for (const skill of rawSkills) {
      if (!categoryIdSet.has(skill.category_id)) {
        throw new Error(`Orphaned skill ${skill.name}: category_id ${skill.category_id} not in published categories.`);
      }
    }

    // 5. Gather referenced media IDs and verify against public_assets
    const referencedMediaIds = new Set();
    if (rawProfile.avatar_asset_id) referencedMediaIds.add(rawProfile.avatar_asset_id);
    for (const p of rawProjects) {
      if (p.featured_asset_id) referencedMediaIds.add(p.featured_asset_id);
    }
    for (const sm of rawSectionMedia) {
      referencedMediaIds.add(sm.media_asset_id);
    }
    for (const c of rawCertifications) {
      if (c.certificate_asset_id) referencedMediaIds.add(c.certificate_asset_id);
    }
    for (const a of rawAchievements) {
      if (a.achievement_asset_id) referencedMediaIds.add(a.achievement_asset_id);
    }
    for (const s of rawSeoEntries) {
      if (s.og_image_asset_id) referencedMediaIds.add(s.og_image_asset_id);
    }

    console.log(`Querying ${referencedMediaIds.size} referenced media assets...`);
    const assetMap = new Map();
    if (referencedMediaIds.size > 0) {
      const { data: assetRows, error: assetErr } = await client
        .from('media_assets')
        .select(
          'id, bucket_id, file_name, file_type, file_size, storage_path, alt_text, caption, width, height, is_archived'
        )
        .in('id', Array.from(referencedMediaIds))
        .eq('bucket_id', 'public_assets')
        .eq('is_archived', false);

      if (assetErr) throw new Error(`Failed to query media assets: ${assetErr.message}`);

      for (const a of assetRows || []) {
        const parsed = DbMediaAssetSchema.parse(a);
        assetMap.set(parsed.id, parsed);
      }
    }

    // Ensure every referenced media ID exists and is unarchived in public_assets
    for (const assetId of referencedMediaIds) {
      if (!assetMap.has(assetId)) {
        throw new Error(
          `Integrity Violation: Referenced media asset ${assetId} not found as an unarchived public asset.`
        );
      }
    }

    // 6. Hardened Media Download, Validation, and Hashing
    const mediaCache = new Map();

    async function processMediaAsset(assetId) {
      if (!assetId) return null;
      if (mediaCache.has(assetId)) {
        return mediaCache.get(assetId);
      }

      const asset = assetMap.get(assetId);
      if (!asset) return null;

      let buffer;
      const { data: blob, error: dlErr } = await client.storage
        .from(asset.bucket_id)
        .download(asset.storage_path);

      if (dlErr || !blob) {
        if (!isLocal) {
          throw new Error(
            `Fatal: Failed to download production media asset (${asset.storage_path}): ${
              dlErr ? dlErr.message : 'Unknown error'
            }`
          );
        }
        // Local fallback for test fixtures
        const fallbackFixture = path.join(rootDir, 'fixtures', 'storage', asset.file_name);
        if (fs.existsSync(fallbackFixture)) {
          buffer = fs.readFileSync(fallbackFixture);
        } else {
          throw new Error(`Local media fixture missing: ${fallbackFixture}`);
        }
      } else {
        buffer = Buffer.from(await blob.arrayBuffer());
      }

      // Validate byte count, magic bytes, and SVG security
      const { ext } = validateMediaBuffer(buffer, asset.file_type, asset.file_size);

      // Compute 16-hex SHA-256 hash
      const hash16 = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 16);
      const safeFilename = generateSafeHashedFilename(asset.file_name, hash16, ext);
      const targetStagedPath = path.join(stagingMediaDir, safeFilename);

      fs.writeFileSync(targetStagedPath, buffer);

      const localAsset = {
        fileName: safeFilename,
        localPath: `/generated/snapshot/${safeFilename}`,
        altText: asset.alt_text,
        caption: asset.caption || null,
        width: asset.width || null,
        height: asset.height || null,
      };

      mediaCache.set(assetId, localAsset);
      return localAsset;
    }

    // Process all media in parallel
    for (const assetId of referencedMediaIds) {
      await processMediaAsset(assetId);
    }

    // 7. Pure Page DTO Assembly (stripping all internal UUIDs)
    const avatarDto = await processMediaAsset(rawProfile.avatar_asset_id);

    // Group section media by section_id
    const sectionMediaMap = new Map();
    for (const sm of rawSectionMedia) {
      if (!sectionMediaMap.has(sm.section_id)) {
        sectionMediaMap.set(sm.section_id, []);
      }
      const mediaDto = await processMediaAsset(sm.media_asset_id);
      if (mediaDto) {
        sectionMediaMap.get(sm.section_id).push({
          localPath: mediaDto.localPath,
          altText: mediaDto.altText,
          caption: mediaDto.caption,
          width: mediaDto.width,
          height: mediaDto.height,
          displayOrder: sm.display_order,
        });
      }
    }

    // Group sections by project_id
    const projectSectionsMap = new Map();
    for (const s of rawSections) {
      if (!projectSectionsMap.has(s.project_id)) {
        projectSectionsMap.set(s.project_id, []);
      }
      const mediaList = sectionMediaMap.get(s.id) || [];
      mediaList.sort((a, b) => a.displayOrder - b.displayOrder);

      projectSectionsMap.get(s.project_id).push({
        title: s.title,
        content: s.content,
        displayOrder: s.display_order,
        media: mediaList,
      });
    }

    // Assemble projects
    const projectsDto = [];
    for (const p of rawProjects) {
      const sections = projectSectionsMap.get(p.id) || [];
      sections.sort((a, b) => a.displayOrder - b.displayOrder);

      const featuredAsset = await processMediaAsset(p.featured_asset_id);

      projectsDto.push({
        slug: p.slug,
        title: p.title,
        subtitle: p.subtitle || null,
        category: p.category,
        tier: p.tier,
        description: p.description,
        problemStatement: p.problem_statement || null,
        architectureOverview: p.architecture_overview || null,
        keyFeatures: p.key_features
          ? Array.from(new Set(p.key_features.map((k) => k.trim()).filter(Boolean)))
          : null,
        technologies: Array.from(new Set(p.technologies.map((t) => t.trim()).filter(Boolean))),
        featuredAsset,
        demoUrl: p.demo_url || null,
        githubUrl: p.github_url || null,
        displayOrder: p.display_order,
        sections,
      });
    }
    projectsDto.sort((a, b) => a.displayOrder - b.displayOrder || a.slug.localeCompare(b.slug));

    // Assemble skill categories & skills
    const skillsByCategory = new Map();
    for (const sk of rawSkills) {
      if (!skillsByCategory.has(sk.category_id)) {
        skillsByCategory.set(sk.category_id, []);
      }
      skillsByCategory.get(sk.category_id).push({
        name: sk.name.trim(),
        proficiencyLevel: sk.proficiency_level.trim(),
        iconIdentifier: sk.icon_identifier || null,
        displayOrder: sk.display_order,
      });
    }

    const skillCategoriesDto = [];
    for (const cat of rawCategories) {
      const skills = skillsByCategory.get(cat.id) || [];
      skills.sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
      skillCategoriesDto.push({
        name: cat.name.trim(),
        displayOrder: cat.display_order,
        skills,
      });
    }
    skillCategoriesDto.sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));

    // Assemble education
    const educationDto = rawEducation.map((e) => ({
      institution: e.institution.trim(),
      degree: e.degree.trim(),
      fieldOfStudy: e.field_of_study ? e.field_of_study.trim() : null,
      startDate: e.start_date || null,
      endDate: e.end_date || null,
      description: e.description ? e.description.trim() : null,
    }));

    // Assemble experiences
    const experiencesDto = rawExperiences.map((exp) => ({
      organization: exp.organization.trim(),
      roleTitle: exp.role_title.trim(),
      type: exp.type.trim(),
      location: exp.location ? exp.location.trim() : null,
      startDate: exp.start_date,
      endDate: exp.end_date || null,
      descriptionPoints: exp.description_points.map((dp) => dp.trim()).filter(Boolean),
      displayOrder: exp.display_order,
    }));

    // Assemble certifications
    const certificationsDto = [];
    for (const c of rawCertifications) {
      const certAsset = await processMediaAsset(c.certificate_asset_id);
      certificationsDto.push({
        name: c.name.trim(),
        issuingOrganization: c.issuing_organization.trim(),
        issueDate: c.issue_date || null,
        credentialUrl: c.credential_url || null,
        certificateAsset: certAsset,
      });
    }

    // Assemble achievements
    const achievementsDto = [];
    for (const a of rawAchievements) {
      const achAsset = await processMediaAsset(a.achievement_asset_id);
      achievementsDto.push({
        title: a.title.trim(),
        date: a.date || null,
        description: a.description ? a.description.trim() : null,
        achievementAsset: achAsset,
      });
    }

    // Assemble SEO entries
    const seoEntriesDto = [];
    for (const s of rawSeoEntries) {
      const ogAsset = await processMediaAsset(s.og_image_asset_id);
      seoEntriesDto.push({
        routePath: normalizeRoutePath(s.route_path),
        title: s.title.trim(),
        description: s.description.trim(),
        keywords: s.keywords ? s.keywords.map((k) => k.trim()).filter(Boolean) : null,
        ogImageAsset: ogAsset,
      });
    }
    seoEntriesDto.sort((a, b) => a.routePath.localeCompare(b.routePath));

    // Assemble active resume
    const activeResumeDto = rawActiveResume
      ? {
          versionLabel: rawActiveResume.version_label.trim(),
          uploadedAt: rawActiveResume.uploaded_at,
        }
      : null;

    // Assemble full snapshot
    const snapshotPayload = {
      profile: {
        fullName: rawProfile.full_name,
        professionalName: rawProfile.professional_name.trim(),
        headline: rawProfile.headline.trim(),
        bio: rawProfile.bio.trim(),
        githubUrl: rawProfile.github_url.trim(),
        linkedinUrl: rawProfile.linkedin_url ? rawProfile.linkedin_url.trim() : null,
        email: rawProfile.email ? rawProfile.email.trim() : null,
        avatar: avatarDto,
      },
      projects: projectsDto,
      skillCategories: skillCategoriesDto,
      education: educationDto,
      experiences: experiencesDto,
      certifications: certificationsDto,
      achievements: achievementsDto,
      seoEntries: seoEntriesDto,
      activeResume: activeResumeDto,
      generatedAt: new Date().toISOString(),
    };

    // 8. Validate complete snapshot schema
    console.log('Validating final snapshot with PublicSnapshotSchema...');
    const validatedSnapshot = PublicSnapshotSchema.parse(snapshotPayload);
    const jsonOutput = JSON.stringify(validatedSnapshot, null, 2);

    // 9. Comprehensive Leak Scan
    console.log('Running comprehensive leak scanner...');
    const sensitiveValues = [
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      process.env.TEST_SUPABASE_SERVICE_ROLE_KEY,
      process.env.SUPABASE_PUBLISHABLE_KEY,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      process.env.SUPABASE_ANON_KEY,
      process.env.SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    ].filter((value) => Boolean(value && value.trim().length > 0));

    scanPayloadForLeaks(validatedSnapshot, jsonOutput, sensitiveValues);

    // Write staged manifest
    fs.writeFileSync(stagingManifestFile, jsonOutput, 'utf8');

    // 10. Atomic Promotion
    console.log('Promoting snapshot atomically...');
    const finalMediaDir = path.join(rootDir, 'public', 'generated', 'snapshot');
    const finalManifestFile = path.join(rootDir, 'lib', 'generated', 'public-snapshot.json');

    const referencedLocalPaths = Array.from(mediaCache.values()).map((m) => m.localPath);

    promoteSnapshotAtomically({
      stagingMediaDir,
      stagingManifestFile,
      finalMediaDir,
      finalManifestFile,
      referencedLocalPaths,
    });

    console.log(`Successfully committed public snapshot: ${finalManifestFile}`);
    console.log('--- Phase 4A Public Snapshot Expansion Complete ---');
  } finally {
    // Always clean up staging directories
    try {
      fs.rmSync(stagingMediaDir, { recursive: true, force: true });
      fs.rmSync(stagingManifestDir, { recursive: true, force: true });
    } catch {
      // Ignored
    }
  }
}

run().catch((err) => {
  console.error('Fatal: Snapshot Generation Failed:', err);
  process.exit(1);
});
