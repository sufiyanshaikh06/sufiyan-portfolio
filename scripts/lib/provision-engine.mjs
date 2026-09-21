// scripts/lib/provision-engine.mjs
import crypto from 'crypto';

export const MANAGED_COLUMNS = {
  mediaAssets: [
    'id',
    'bucket_id',
    'file_name',
    'file_type',
    'file_size',
    'storage_path',
    'alt_text',
    'width',
    'height',
    'is_archived',
  ],
  profile: [
    'id',
    'full_name',
    'professional_name',
    'headline',
    'bio',
    'github_url',
    'linkedin_url',
    'email',
    'is_published',
    'avatar_asset_id',
  ],
  projects: [
    'id',
    'slug',
    'title',
    'subtitle',
    'category',
    'tier',
    'description',
    'technologies',
    'featured_asset_id',
    'demo_url',
    'github_url',
    'display_order',
    'state',
    'is_archived',
  ],
  projectSections: ['id', 'project_id', 'title', 'content', 'display_order'],
  projectSectionMedia: ['id', 'section_id', 'media_asset_id', 'display_order'],
  skillCategories: ['id', 'name', 'display_order', 'is_published', 'is_archived'],
  skills: [
    'id',
    'category_id',
    'name',
    'proficiency_level',
    'icon_identifier',
    'vector_position_x',
    'vector_position_y',
    'display_order',
    'is_published',
    'is_archived',
  ],
  education: [
    'id',
    'institution',
    'degree',
    'field_of_study',
    'start_date',
    'end_date',
    'description',
    'is_published',
    'is_archived',
  ],
  seoEntries: [
    'id',
    'route_path',
    'title',
    'description',
    'keywords',
    'og_image_asset_id',
    'is_published',
    'is_archived',
  ],
};

/**
 * Validates endpoint and credential format, ensuring modern sb_* keys and preventing localhost targeting.
 * @param {Object} params
 * @param {string} params.supabaseUrl
 * @param {string} params.secretKey
 * @param {string} [params.publishableKey]
 * @param {string} [params.allowRemoteProvision]
 * @param {boolean} [params.dryRun]
 */
export function validateTargetAndCredentials({
  supabaseUrl,
  secretKey,
  publishableKey = undefined,
  allowRemoteProvision = undefined,
  dryRun = false,
}) {
  if (!supabaseUrl) {
    throw new Error('Safety Guard: Supabase URL is required.');
  }

  let url;
  try {
    url = new URL(supabaseUrl);
  } catch {
    throw new Error('Safety Guard: Invalid Supabase URL format.');
  }

  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    throw new Error(
      `Safety Guard: Refusing to run remote provisioning against local target: ${url.hostname}`
    );
  }

  if (!secretKey) {
    throw new Error('Safety Guard: Secret key is required.');
  }

  if (secretKey.includes('.') || secretKey.startsWith('eyJ')) {
    throw new Error(
      'Safety Guard: Legacy JWT keys are not supported. Secret key must use modern "sb_secret_" format.'
    );
  }

  if (!secretKey.startsWith('sb_secret_')) {
    throw new Error('Safety Guard: Secret key must start with "sb_secret_".');
  }

  if (publishableKey) {
    if (publishableKey.includes('.') || publishableKey.startsWith('eyJ')) {
      throw new Error(
        'Safety Guard: Legacy JWT keys are not supported. Publishable key must use modern "sb_publishable_" format.'
      );
    }
    if (!publishableKey.startsWith('sb_publishable_')) {
      throw new Error('Safety Guard: Publishable key must start with "sb_publishable_".');
    }
  } else if (!dryRun) {
    throw new Error(
      'Safety Guard: Publishable key ("sb_publishable_...") is required for live post-provisioning verification.'
    );
  }

  if (!dryRun && allowRemoteProvision !== '1') {
    throw new Error(
      'Safety Guard: ALLOW_REMOTE_PROVISION=1 must be explicitly set to run live remote provisioning.'
    );
  }

  return {
    supabaseUrl,
    secretKey,
    publishableKey,
    dryRun: Boolean(dryRun),
  };
}

/**
 * Canonicalizes values for comparison (normalizes null vs undefined, trims strings, sorts arrays).
 */
export function canonicalizeFieldValue(val) {
  if (val === null || val === undefined) {
    return null;
  }
  if (Array.isArray(val)) {
    return [...val].map((v) => (typeof v === 'string' ? v.trim() : v)).sort();
  }
  if (typeof val === 'string') {
    return val.trim();
  }
  if (typeof val === 'number') {
    return Number(val.toFixed(2));
  }
  return val;
}

/**
 * Compares only managed columns between manifest item and remote item.
 */
export function compareRecords(manifestRow, remoteRow, managedColumns) {
  if (!manifestRow || !remoteRow) return false;

  for (const col of managedColumns) {
    // If manifest row doesn't specify an optional field, skip comparing
    if (!(col in manifestRow)) continue;

    const mVal = canonicalizeFieldValue(manifestRow[col]);
    const rVal = canonicalizeFieldValue(remoteRow[col]);

    if (Array.isArray(mVal) && Array.isArray(rVal)) {
      if (mVal.length !== rVal.length) return false;
      for (let i = 0; i < mVal.length; i++) {
        if (mVal[i] !== rVal[i]) return false;
      }
    } else if (mVal !== rVal) {
      return false;
    }
  }

  return true;
}

/**
 * Picks only allowlisted managed columns that exist in the item and are not undefined.
 */
export function pickManagedColumns(item, managedCols) {
  const result = {};
  for (const col of managedCols) {
    if (col in item && item[col] !== undefined) {
      result[col] = item[col];
    }
  }
  return result;
}

/**
 * Returns only changed allowlisted managed columns between manifest item and remote item.
 */
export function getChangedManagedColumns(manifestItem, remoteItem, managedCols) {
  const changes = {};
  for (const col of managedCols) {
    if (!(col in manifestItem)) continue;

    const mVal = canonicalizeFieldValue(manifestItem[col]);
    const rVal = canonicalizeFieldValue(remoteItem[col]);

    let isDifferent = false;
    if (Array.isArray(mVal) && Array.isArray(rVal)) {
      if (mVal.length !== rVal.length) {
        isDifferent = true;
      } else {
        for (let i = 0; i < mVal.length; i++) {
          if (mVal[i] !== rVal[i]) {
            isDifferent = true;
            break;
          }
        }
      }
    } else if (mVal !== rVal) {
      isDifferent = true;
    }

    if (isDifferent) {
      changes[col] = manifestItem[col];
    }
  }
  return changes;
}

/**
 * Computes differential actions (INSERT, UPDATE, UNCHANGED) for all entities.
 */
export function computeDifferential(manifest, remoteData) {
  const actions = [];

  function evaluateCollection(entityName, manifestItems, remoteItems, primaryKey, managedCols) {
    const remoteMap = new Map();
    for (const r of remoteItems || []) {
      const key = r[primaryKey];
      if (key) remoteMap.set(key, r);
    }

    for (const m of manifestItems) {
      const key = m[primaryKey];
      const remote = remoteMap.get(key);

      if (!remote) {
        const insertPayload = pickManagedColumns(m, managedCols);
        actions.push({
          entity: entityName,
          key,
          action: 'INSERT',
          details: `New ${entityName} record to insert`,
          insertPayload,
          updatePayload: null,
        });
      } else {
        const isIdentical = compareRecords(m, remote, managedCols);
        const updatePayload = isIdentical ? null : getChangedManagedColumns(m, remote, managedCols);
        actions.push({
          entity: entityName,
          key,
          action: isIdentical ? 'UNCHANGED' : 'UPDATE',
          details: isIdentical
            ? 'Exact match'
            : `Attributes differ on managed columns: ${Object.keys(updatePayload).join(', ')}`,
          insertPayload: null,
          updatePayload,
        });
      }
    }
  }

  // 1. Media Assets
  evaluateCollection(
    'media_assets',
    manifest.mediaAssets,
    remoteData.mediaAssets,
    'id',
    MANAGED_COLUMNS.mediaAssets
  );

  // 2. Profile
  evaluateCollection(
    'profiles',
    [manifest.profile],
    remoteData.profiles,
    'id',
    MANAGED_COLUMNS.profile
  );

  // 3. Projects
  evaluateCollection(
    'projects',
    manifest.projects,
    remoteData.projects,
    'id',
    MANAGED_COLUMNS.projects
  );

  // 4. Project Sections
  evaluateCollection(
    'project_sections',
    manifest.projectSections,
    remoteData.projectSections,
    'id',
    MANAGED_COLUMNS.projectSections
  );

  // 5. Project Section Media
  evaluateCollection(
    'project_section_media',
    manifest.projectSectionMedia,
    remoteData.projectSectionMedia,
    'id',
    MANAGED_COLUMNS.projectSectionMedia
  );

  // 6. Skill Categories
  evaluateCollection(
    'skill_categories',
    manifest.skillCategories,
    remoteData.skillCategories,
    'id',
    MANAGED_COLUMNS.skillCategories
  );

  // 7. Skills
  evaluateCollection(
    'skills',
    manifest.skills,
    remoteData.skills,
    'id',
    MANAGED_COLUMNS.skills
  );

  // 8. Education
  evaluateCollection(
    'education',
    manifest.education,
    remoteData.education,
    'id',
    MANAGED_COLUMNS.education
  );

  // 9. SEO Entries
  evaluateCollection(
    'seo_entries',
    manifest.seoEntries,
    remoteData.seoEntries,
    'id',
    MANAGED_COLUMNS.seoEntries
  );

  return actions;
}

/**
 * Checks if an error strictly matches PostgREST code PGRST303 or exact message 'JWT issued at future'.
 * Strictly does NOT match every 401 or generic error.
 */
export function isClockSkewError(err) {
  if (!err) return false;
  const code = err.code || '';
  const msg = typeof err === 'string' ? err : err.message || '';
  return code === 'PGRST303' || msg.includes('JWT issued at future');
}

/**
 * Executes an async Supabase read operation with bounded retries strictly for transient PostgREST
 * clock-skew errors (PGRST303 / exact 'JWT issued at future').
 * Strictly restricted to read-only operations. Must never wrap mutations.
 */
export async function executeWithClockSkewRetry(operation, maxRetries = 3, delayMs = 1500) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await operation();
      if (res?.error && isClockSkewError(res.error)) {
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }
      }
      return res;
    } catch (err) {
      if (isClockSkewError(err)) {
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }
      }
      throw err;
    }
  }
}

/**
 * Runs the provisioning engine in either read-only dry-run or live mode.
 */
export async function runProvisioningEngine({ adminClient, manifest, dryRun = true, silent = false }) {
  // Fetch current remote data strictly through read queries with clock skew retry protection
  const [
    resMedia,
    resProfiles,
    resProjects,
    resSections,
    resSectionMedia,
    resCategories,
    resSkills,
    resEducation,
    resSeo,
  ] = await Promise.all([
    executeWithClockSkewRetry(() => adminClient.from('media_assets').select('*')),
    executeWithClockSkewRetry(() => adminClient.from('profiles').select('*')),
    executeWithClockSkewRetry(() => adminClient.from('projects').select('*')),
    executeWithClockSkewRetry(() => adminClient.from('project_sections').select('*')),
    executeWithClockSkewRetry(() => adminClient.from('project_section_media').select('*')),
    executeWithClockSkewRetry(() => adminClient.from('skill_categories').select('*')),
    executeWithClockSkewRetry(() => adminClient.from('skills').select('*')),
    executeWithClockSkewRetry(() => adminClient.from('education').select('*')),
    executeWithClockSkewRetry(() => adminClient.from('seo_entries').select('*')),
  ]);

  // Strict validation: fail loudly if any table read fails
  const queryMap = {
    media_assets: resMedia,
    profiles: resProfiles,
    projects: resProjects,
    project_sections: resSections,
    project_section_media: resSectionMedia,
    skill_categories: resCategories,
    skills: resSkills,
    education: resEducation,
    seo_entries: resSeo,
  };

  for (const [table, res] of Object.entries(queryMap)) {
    if (res.error) {
      throw new Error(`Failed to query remote table "${table}": ${res.error.message}`);
    }
  }

  // Storage verification: verify existing assets via download and SHA-256 comparison
  const storageActions = [];
  for (const asset of manifest.svgAssetsToUpload) {
    const parts = asset.storagePath.split('/');
    const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
    const filename = parts[parts.length - 1];
    const { data: fileList, error: listErr } = await executeWithClockSkewRetry(() =>
      adminClient.storage.from('public_assets').list(folder)
    );
    if (listErr) throw new Error(`Failed to list storage path "${folder}": ${listErr.message}`);

    const existingFile = (fileList || []).find((f) => f.name === filename);
    if (!existingFile) {
      storageActions.push({
        storagePath: asset.storagePath,
        action: 'UPLOAD',
        details: 'File not present in storage',
      });
      continue;
    }

    // Download existing file and compare byte length and SHA-256 hash
    const { data: downloadedBlob, error: dlErr } = await executeWithClockSkewRetry(() =>
      adminClient.storage.from('public_assets').download(asset.storagePath)
    );

    if (dlErr) {
      storageActions.push({
        storagePath: asset.storagePath,
        action: 'UPLOAD',
        details: `Download failed (${dlErr.message}), will re-upload`,
      });
      continue;
    }

    let downloadedBuffer;
    if (downloadedBlob && typeof downloadedBlob.arrayBuffer === 'function') {
      downloadedBuffer = Buffer.from(await downloadedBlob.arrayBuffer());
    } else if (Buffer.isBuffer(downloadedBlob)) {
      downloadedBuffer = downloadedBlob;
    } else {
      downloadedBuffer = Buffer.from(String(downloadedBlob), 'utf8');
    }

    const expectedBuffer = Buffer.from(asset.content, 'utf8');
    const downloadedHash = crypto.createHash('sha256').update(downloadedBuffer).digest('hex');
    const expectedHash = crypto.createHash('sha256').update(expectedBuffer).digest('hex');

    if (downloadedHash === expectedHash && downloadedBuffer.length === expectedBuffer.length) {
      storageActions.push({
        storagePath: asset.storagePath,
        action: 'UNCHANGED',
        details: `Verified exact match (SHA-256: ${downloadedHash.slice(0, 12)}..., size: ${downloadedBuffer.length} B)`,
      });
    } else {
      storageActions.push({
        storagePath: asset.storagePath,
        action: 'UPLOAD',
        details: `Hash/size mismatch (remote: ${downloadedHash.slice(0, 12)}..., expected: ${expectedHash.slice(0, 12)}...), will re-upload`,
      });
    }
  }

  // Preserve existing dependencies check
  for (const dep of manifest.existingMediaDependencies) {
    const parts = dep.split('/');
    const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
    const filename = parts[parts.length - 1];
    const { data: fileList, error: listErr } = await adminClient.storage.from('public_assets').list(folder);
    if (listErr) throw new Error(`Failed to list storage path "${folder}": ${listErr.message}`);

    const exists = (fileList || []).some((f) => f.name === filename);
    storageActions.push({
      storagePath: dep,
      action: exists ? 'PRESERVED' : 'MISSING_DEPENDENCY',
      details: exists ? 'Existing dependency verified in storage' : 'Required dependency missing from storage',
    });
  }

  const remoteData = {
    mediaAssets: resMedia.data || [],
    profiles: resProfiles.data || [],
    projects: resProjects.data || [],
    projectSections: resSections.data || [],
    projectSectionMedia: resSectionMedia.data || [],
    skillCategories: resCategories.data || [],
    skills: resSkills.data || [],
    education: resEducation.data || [],
    seoEntries: resSeo.data || [],
  };

  const actions = computeDifferential(manifest, remoteData);

  const summary = {
    totalEntities: actions.length,
    inserts: actions.filter((a) => a.action === 'INSERT').length,
    updates: actions.filter((a) => a.action === 'UPDATE').length,
    unchanged: actions.filter((a) => a.action === 'UNCHANGED').length,
    archivalCandidates: 0,
    storageUploads: storageActions.filter((s) => s.action === 'UPLOAD').length,
    storagePreserved: storageActions.filter((s) => s.action === 'PRESERVED' || s.action === 'UNCHANGED').length,
  };

  if (!silent) {
    console.log('\n=============================================================');
    console.log(`--- Remote Provisioning: ${dryRun ? 'DRY-RUN (READ-ONLY)' : 'LIVE EXECUTION'} ---`);
    console.log('=============================================================');
    console.log(`Summary:`);
    console.log(`  Proposed INSERTS:   ${summary.inserts}`);
    console.log(`  Proposed UPDATES:   ${summary.updates}`);
    console.log(`  UNCHANGED Records:  ${summary.unchanged}`);
    console.log(`  Archival Actions:   ${summary.archivalCandidates} (Zero deletion policy enforced)`);
    console.log(`  Storage Uploads:    ${summary.storageUploads}`);
    console.log(`  Storage Preserved:  ${summary.storagePreserved}`);
    console.log('-------------------------------------------------------------');

    console.log('\nRecord-Level Delta Breakdown:');
    for (const act of actions) {
      const tag = act.action === 'INSERT' ? '[+ INSERT]' : act.action === 'UPDATE' ? '[~ UPDATE]' : '[= EQUAL ]';
      console.log(`  ${tag} ${act.entity.padEnd(22)} id: ${act.key} -> ${act.details}`);
    }

    console.log('\nStorage Media Objects:');
    for (const sa of storageActions) {
      console.log(`  [${sa.action}] public_assets/${sa.storagePath} (${sa.details})`);
    }
  }

  if (dryRun) {
    return {
      dryRun: true,
      summary,
      actions,
      storageActions,
    };
  }

  // Live Execution (Mutating)
  // Step 0: Read-only authenticated preflight with bounded retries for exactly PGRST303
  if (!silent) {
    console.log('\n--- Live Mode Authenticated Preflight ---');
  }
  const preflightRes = await executeWithClockSkewRetry(
    () => adminClient.from('media_assets').select('id').limit(1),
    3,
    1500
  );
  if (preflightRes?.error) {
    throw new Error(
      `Preflight authentication check failed: ${preflightRes.error.message} (code: ${preflightRes.error.code || 'UNKNOWN'}). Aborting live execution without mutations.`
    );
  }
  if (!silent) {
    console.log('✔ Authenticated preflight check passed. Proceeding with live mutations.');
  }

  // Step 1: Upload only storage assets that require UPLOAD (Strictly zero automatic retry)
  for (const sa of storageActions) {
    if (sa.action === 'UPLOAD') {
      const asset = manifest.svgAssetsToUpload.find((a) => a.storagePath === sa.storagePath);
      if (!asset) continue;
      const { error: upErr } = await adminClient.storage
        .from('public_assets')
        .upload(asset.storagePath, Buffer.from(asset.content, 'utf8'), {
          contentType: asset.contentType,
          upsert: true,
        });
      if (upErr) throw new Error(`Storage upload failed for ${asset.storagePath}: ${upErr.message}`);
    }
  }

  // Step 2: Dependency-ordered action-specific database operations (Strictly zero automatic retry)
  const entityOrder = [
    'media_assets',
    'profiles',
    'projects',
    'project_sections',
    'project_section_media',
    'skill_categories',
    'skills',
    'education',
    'seo_entries',
  ];

  for (const entityName of entityOrder) {
    const entityActions = actions.filter((a) => a.entity === entityName);
    for (const act of entityActions) {
      if (act.action === 'INSERT') {
        const { error } = await adminClient.from(entityName).insert(act.insertPayload);
        if (error) throw new Error(`Insert failed on ${entityName} (id: ${act.key}): ${error.message}`);
      } else if (act.action === 'UPDATE') {
        const { error } = await adminClient.from(entityName).update(act.updatePayload).eq('id', act.key);
        if (error) throw new Error(`Update failed on ${entityName} (id: ${act.key}): ${error.message}`);
      }
      // If act.action === 'UNCHANGED', DO NOTHING (0 queries executed!)
    }
  }

  return {
    dryRun: false,
    success: true,
    summary,
    actions,
    storageActions,
  };
}
